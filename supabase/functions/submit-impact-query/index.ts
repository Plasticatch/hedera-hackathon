// Supabase Edge Function: submit-impact-query
// HCS-10 relay for the PlastiCatch Impact Intelligence Agent.
//
// Flow:
//   1. Receives a structured impact query from the frontend
//   2. Packages it as an HCS-10 envelope and submits to the agent inbound topic
//   3. Executes the query against Supabase (real data)
//   4. Posts the response as an HCS-10 envelope to the response topic
//   5. Stores both sequence numbers in agent_conversations
//   6. Returns the full result to the caller synchronously
//
// Deploy: supabase functions deploy submit-impact-query

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Client,
  TopicId,
  TopicMessageSubmitTransaction,
} from "npm:@hashgraph/sdk@2.50.0";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Hedera setup ──────────────────────────────────────────────────────────────

function buildClient(): Client {
  const id  = Deno.env.get("HEDERA_OPERATOR_ID")!;
  const key = Deno.env.get("HEDERA_OPERATOR_KEY")!;
  const net = Deno.env.get("VITE_HEDERA_NETWORK") ?? "testnet";
  const c   = net === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  c.setOperator(id, key);
  return c;
}

async function submitHCS(
  client: Client,
  topicId: string,
  envelope: Record<string, unknown>,
): Promise<bigint> {
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(JSON.stringify(envelope))
    .execute(client);
  const receipt = await tx.getReceipt(client);
  return receipt.topicSequenceNumber;
}

// ── HCS-10 envelope builder ───────────────────────────────────────────────────

function makeEnvelope(
  operatorId:  string,
  inboundTopic: string,
  payload:      Record<string, unknown>,
  memo?:        string,
): Record<string, unknown> {
  return {
    p:           "hcs-10",
    op:          "message",
    operator_id: `${operatorId}@${inboundTopic}`,
    data:        btoa(JSON.stringify(payload)),
    m:           memo ?? "PlastiCatch Impact Agent",
  };
}

// ── Impact query executors ────────────────────────────────────────────────────

async function execZoneSummary(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>,
) {
  const { zone, from_date, to_date } = params;
  const fromTs = from_date ?? new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];
  const toTs   = to_date   ?? new Date().toISOString().split("T")[0];

  const { data: attestations } = await supabase
    .from("attestations")
    .select("collector_id, total_weight_grams, payout_hbar, plastic_items, hcs_sequence_number, created_at")
    .eq("status", "verified")
    .gte("created_at", fromTs)
    .lte("created_at", toTs + "T23:59:59Z")
    .filter(zone ? "zone" : "id", zone ? "eq" : "neq", zone || "__none__");

  const rows = attestations ?? [];

  // plastic type breakdown from JSONB
  const typeKg: Record<string, number> = {};
  for (const r of rows) {
    const items = (r.plastic_items as { type: string; weightGrams: number }[]) ?? [];
    for (const item of items) {
      typeKg[item.type] = (typeKg[item.type] ?? 0) + item.weightGrams / 1000;
    }
  }
  const topType = Object.entries(typeKg).sort((a, b) => b[1] - a[1])[0];

  const totalKg      = rows.reduce((s, r) => s + (r.total_weight_grams ?? 0) / 1000, 0);
  const totalHbar    = rows.reduce((s, r) => s + (r.payout_hbar ?? 0), 0);
  const uniqueCollectors = new Set(rows.map(r => r.collector_id)).size;
  const anchoredCount    = rows.filter(r => r.hcs_sequence_number).length;

  return {
    zone:              zone ?? "all",
    from_date:         fromTs,
    to_date:           toTs,
    total_attestations: rows.length,
    total_kg_recovered: +totalKg.toFixed(3),
    total_hbar_paid:    +totalHbar.toFixed(4),
    unique_collectors:  uniqueCollectors,
    avg_kg_per_collection: rows.length ? +(totalKg / rows.length).toFixed(3) : 0,
    top_plastic_type:   topType ? { type: topType[0], kg: +topType[1].toFixed(3) } : null,
    hcs_anchored_count: anchoredCount,
    plastic_breakdown:  Object.fromEntries(
      Object.entries(typeKg).map(([k, v]) => [k, +v.toFixed(3)])
    ),
  };
}

async function execPlasticBreakdown(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>,
) {
  const { zone, from_date, to_date } = params;
  const fromTs = from_date ?? new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];
  const toTs   = to_date   ?? new Date().toISOString().split("T")[0];

  let q = supabase
    .from("attestations")
    .select("plastic_items, total_weight_grams, payout_hbar")
    .eq("status", "verified")
    .gte("created_at", fromTs)
    .lte("created_at", toTs + "T23:59:59Z");
  if (zone) q = q.eq("zone", zone);
  const { data } = await q;

  const breakdown: Record<string, { kg: number; hbar: number; count: number }> = {};
  for (const row of data ?? []) {
    const items = (row.plastic_items as { type: string; weightGrams: number }[]) ?? [];
    for (const item of items) {
      const t = item.type;
      if (!breakdown[t]) breakdown[t] = { kg: 0, hbar: 0, count: 0 };
      breakdown[t].kg    += item.weightGrams / 1000;
      breakdown[t].count += 1;
    }
    // distribute payout proportionally
    const totalG = items.reduce((s, i) => s + i.weightGrams, 0);
    if (totalG > 0) {
      for (const item of items) {
        breakdown[item.type].hbar += (row.payout_hbar ?? 0) * (item.weightGrams / totalG);
      }
    }
  }

  const totalKg = Object.values(breakdown).reduce((s, v) => s + v.kg, 0);

  return {
    zone:       zone ?? "all",
    from_date:  fromTs,
    to_date:    toTs,
    total_kg:   +totalKg.toFixed(3),
    breakdown:  Object.fromEntries(
      Object.entries(breakdown)
        .sort((a, b) => b[1].kg - a[1].kg)
        .map(([type, v]) => [type, {
          kg:          +v.kg.toFixed(3),
          hbar_paid:   +v.hbar.toFixed(4),
          count:       v.count,
          pct_of_total: totalKg > 0 ? +(v.kg / totalKg * 100).toFixed(1) : 0,
        }])
    ),
  };
}

async function execPrcProvenance(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>,
) {
  const { retirement_id } = params;
  if (!retirement_id) throw new Error("retirement_id is required");

  const { data: ret } = await supabase
    .from("prc_retirements")
    .select("*")
    .eq("id", retirement_id)
    .single();

  if (!ret) throw new Error(`Retirement ${retirement_id} not found`);

  // get the underlying verified attestations (via provenance_summary or direct count)
  const { data: attestations } = await supabase
    .from("attestations")
    .select("id, total_weight_grams, payout_hbar, zone, hcs_sequence_number, created_at")
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(ret.prcs_retired);

  const anchoredAtts = (attestations ?? []).filter(a => a.hcs_sequence_number);

  return {
    retirement_id:      ret.id,
    company_name:       ret.company_name,
    prcs_retired:       ret.prcs_retired,
    report_ref:         ret.report_ref,
    hcs_retirement_seq: ret.hcs_retirement_sequence,
    created_at:         ret.created_at,
    backing_attestations: {
      total:    attestations?.length ?? 0,
      anchored_to_hcs: anchoredAtts.length,
      total_kg_backing: (attestations ?? []).reduce((s, a) => s + (a.total_weight_grams ?? 0) / 1000, 0).toFixed(3),
      sample_hcs_sequences: anchoredAtts.slice(0, 5).map(a => a.hcs_sequence_number),
    },
    provenance_summary: ret.provenance_summary,
  };
}

async function execNetworkStats(
  supabase: ReturnType<typeof createClient>,
) {
  const [collectors, stations, attestations, retirements] = await Promise.all([
    supabase.from("collectors").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("weighing_stations").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("attestations").select("total_weight_grams, payout_hbar, hcs_sequence_number").eq("status", "verified"),
    supabase.from("prc_retirements").select("prcs_retired").throwOnError(),
  ]);

  const attRows   = attestations.data ?? [];
  const totalKg   = attRows.reduce((s, a) => s + (a.total_weight_grams ?? 0) / 1000, 0);
  const totalHbar = attRows.reduce((s, a) => s + (a.payout_hbar ?? 0), 0);
  const prcsTotal = (retirements.data ?? []).reduce((s, r) => s + (r.prcs_retired ?? 0), 0);

  return {
    active_collectors:  collectors.count ?? 0,
    active_stations:    stations.count   ?? 0,
    total_attestations: attRows.length,
    hcs_anchored:       attRows.filter(a => a.hcs_sequence_number).length,
    total_kg_recovered: +totalKg.toFixed(3),
    total_hbar_paid:    +totalHbar.toFixed(4),
    total_prcs_retired: prcsTotal,
    data_integrity:     attRows.length > 0
      ? +((attRows.filter(a => a.hcs_sequence_number).length / attRows.length) * 100).toFixed(1)
      : 0,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const startMs = Date.now();

  try {
    const { queryType, params = {}, buyerAccount } = await req.json();

    if (!queryType) {
      return new Response(
        JSON.stringify({ error: "queryType is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const inboundTopicId  = Deno.env.get("IMPACT_AGENT_INBOUND_TOPIC");
    const responseTopicId = Deno.env.get("IMPACT_AGENT_RESPONSE_TOPIC");
    const operatorId      = Deno.env.get("HEDERA_OPERATOR_ID");
    const operatorKey     = Deno.env.get("HEDERA_OPERATOR_KEY");
    const hcsReady = !!(inboundTopicId && responseTopicId && operatorId && operatorKey &&
      !inboundTopicId.includes("XXXXX") && !responseTopicId.includes("XXXXX"));

    const queryId = crypto.randomUUID();

    // ── Step 1: Submit query to HCS inbound topic ─────────────────────────
    let inboundSeq: bigint | null = null;
    let hederaClient: Client | null = null;

    if (hcsReady) {
      hederaClient = buildClient();
      const queryEnvelope = makeEnvelope(
        operatorId!,
        inboundTopicId!,
        {
          type:        "IMPACT_QUERY",
          query_id:    queryId,
          from_account: buyerAccount ?? "anonymous",
          query:       queryType,
          params,
        },
        `PlastiCatch Impact Query · ${queryType}`,
      );
      inboundSeq = await submitHCS(hederaClient, inboundTopicId!, queryEnvelope);
    }

    // ── Step 2: Store conversation as processing ──────────────────────────
    await supabase.from("agent_conversations").insert({
      query_id:               queryId,
      buyer_account:          buyerAccount ?? null,
      inbound_topic_id:       inboundTopicId ?? "not-configured",
      response_topic_id:      responseTopicId ?? null,
      inbound_sequence_number: inboundSeq !== null ? Number(inboundSeq) : null,
      query_type:             queryType,
      query_params:           params,
      status:                 "processing",
    });

    // ── Step 3: Execute the impact query against real Supabase data ────────
    let resultData: Record<string, unknown>;
    switch (queryType) {
      case "zone_summary":
        resultData = await execZoneSummary(supabase, params);
        break;
      case "plastic_breakdown":
        resultData = await execPlasticBreakdown(supabase, params);
        break;
      case "prc_provenance":
        resultData = await execPrcProvenance(supabase, params);
        break;
      case "network_stats":
        resultData = await execNetworkStats(supabase);
        break;
      default:
        throw new Error(`Unknown queryType: ${queryType}`);
    }

    // ── Step 4: Post response to HCS response topic ───────────────────────
    let responseSeq: bigint | null = null;
    if (hcsReady && hederaClient) {
      const responseEnvelope = makeEnvelope(
        operatorId!,
        inboundTopicId!,
        {
          type:          "IMPACT_RESPONSE",
          query_id:      queryId,
          status:        "success",
          data:          resultData,
          verified_at:   new Date().toISOString(),
          agent_account: operatorId,
        },
        `PlastiCatch Impact Response · ${queryType}`,
      );
      responseSeq = await submitHCS(hederaClient, responseTopicId!, responseEnvelope);
      hederaClient.close();
    }

    const processingMs = Date.now() - startMs;

    // ── Step 5: Update conversation with response ─────────────────────────
    await supabase
      .from("agent_conversations")
      .update({
        response_data:            resultData,
        response_sequence_number: responseSeq !== null ? Number(responseSeq) : null,
        status:                   "answered",
        processing_ms:            processingMs,
        answered_at:              new Date().toISOString(),
      })
      .eq("query_id", queryId);

    return new Response(
      JSON.stringify({
        success:       true,
        queryId,
        queryType,
        data:          resultData,
        hcs: {
          ready:              hcsReady,
          inbound_topic_id:   inboundTopicId ?? null,
          response_topic_id:  responseTopicId ?? null,
          inbound_sequence:   inboundSeq  !== null ? Number(inboundSeq)  : null,
          response_sequence:  responseSeq !== null ? Number(responseSeq) : null,
        },
        processing_ms: processingMs,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[submit-impact-query]", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
