// Supabase Edge Function: impact-agent
// Autonomous HCS-10 Impact Intelligence Agent for PlastiCatch.
//
// When called with { action: "poll" } it:
//   1. Reads its inbound HCS topic via Mirror Node for new IMPACT_QUERY messages
//   2. For each unprocessed query, executes impact queries against Supabase
//   3. Posts IMPACT_RESPONSE messages to the response HCS topic
//   4. Records everything in agent_conversations
//
// This function can be called on a cron schedule (e.g. every 30 seconds)
// or triggered explicitly. The submit-impact-query function handles real-time
// queries; this function handles replay and any missed messages.
//
// Deploy: supabase functions deploy impact-agent

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

const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";

// ── Hedera ────────────────────────────────────────────────────────────────────

function buildClient(): Client {
  const c = Client.forTestnet();
  c.setOperator(Deno.env.get("HEDERA_OPERATOR_ID")!, Deno.env.get("HEDERA_OPERATOR_KEY")!);
  return c;
}

async function submitHCS(client: Client, topicId: string, payload: unknown): Promise<bigint> {
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(JSON.stringify(payload))
    .execute(client);
  const receipt = await tx.getReceipt(client);
  return receipt.topicSequenceNumber;
}

// ── Mirror Node polling ───────────────────────────────────────────────────────

interface MirrorMessage {
  sequence_number: number;
  message: string; // base64
  consensus_timestamp: string;
}

async function pollInboundTopic(
  topicId: string,
  afterSequence: number,
): Promise<MirrorMessage[]> {
  const url = `${MIRROR_BASE}/api/v1/topics/${topicId}/messages?sequenceNumber=gt:${afterSequence}&limit=25&order=asc`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.messages ?? []) as MirrorMessage[];
}

function decodeEnvelope(base64: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function decodePayload(dataBase64: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(dataBase64));
  } catch {
    return null;
  }
}

// ── Query executors (same logic as submit-impact-query) ───────────────────────

async function execNetworkStats(sb: ReturnType<typeof createClient>) {
  const [collectors, stations, attestations, retirements] = await Promise.all([
    sb.from("collectors").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("weighing_stations").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("attestations").select("total_weight_grams, payout_hbar, hcs_sequence_number").eq("status", "verified"),
    sb.from("prc_retirements").select("prcs_retired"),
  ]);
  const attRows   = attestations.data ?? [];
  const totalKg   = attRows.reduce((s, a) => s + (a.total_weight_grams ?? 0) / 1000, 0);
  const totalHbar = attRows.reduce((s, a) => s + (a.payout_hbar ?? 0), 0);
  return {
    active_collectors:  collectors.count ?? 0,
    active_stations:    stations.count   ?? 0,
    total_attestations: attRows.length,
    hcs_anchored:       attRows.filter(a => a.hcs_sequence_number).length,
    total_kg_recovered: +totalKg.toFixed(3),
    total_hbar_paid:    +totalHbar.toFixed(4),
    total_prcs_retired: (retirements.data ?? []).reduce((s, r) => s + (r.prcs_retired ?? 0), 0),
  };
}

async function execQuery(
  sb: ReturnType<typeof createClient>,
  queryType: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  if (queryType === "network_stats") return execNetworkStats(sb);

  // Zone/date queries
  const zone    = params.zone;
  const fromTs  = params.from_date ?? new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];
  const toTs    = params.to_date   ?? new Date().toISOString().split("T")[0];

  let q = sb.from("attestations")
    .select("collector_id, total_weight_grams, payout_hbar, plastic_items, hcs_sequence_number")
    .eq("status", "verified")
    .gte("created_at", fromTs)
    .lte("created_at", toTs + "T23:59:59Z");
  if (zone) q = q.eq("zone", zone);
  const { data: rows } = await q;

  if (queryType === "zone_summary") {
    const typeKg: Record<string, number> = {};
    for (const r of rows ?? []) {
      for (const item of (r.plastic_items as { type: string; weightGrams: number }[]) ?? []) {
        typeKg[item.type] = (typeKg[item.type] ?? 0) + item.weightGrams / 1000;
      }
    }
    const topType = Object.entries(typeKg).sort((a, b) => b[1] - a[1])[0];
    const totalKg = Object.values(typeKg).reduce((s, v) => s + v, 0);
    return {
      zone: zone ?? "all", from_date: fromTs, to_date: toTs,
      total_attestations: rows?.length ?? 0,
      total_kg_recovered: +totalKg.toFixed(3),
      total_hbar_paid:    +((rows ?? []).reduce((s, r) => s + (r.payout_hbar ?? 0), 0)).toFixed(4),
      unique_collectors:  new Set((rows ?? []).map(r => r.collector_id)).size,
      top_plastic_type:   topType ? { type: topType[0], kg: +topType[1].toFixed(3) } : null,
      hcs_anchored_count: (rows ?? []).filter(r => r.hcs_sequence_number).length,
    };
  }

  // plastic_breakdown
  const breakdown: Record<string, { kg: number; count: number }> = {};
  for (const row of rows ?? []) {
    for (const item of (row.plastic_items as { type: string; weightGrams: number }[]) ?? []) {
      const t = item.type;
      if (!breakdown[t]) breakdown[t] = { kg: 0, count: 0 };
      breakdown[t].kg += item.weightGrams / 1000;
      breakdown[t].count++;
    }
  }
  const totalKg = Object.values(breakdown).reduce((s, v) => s + v.kg, 0);
  return {
    zone: zone ?? "all", from_date: fromTs, to_date: toTs,
    total_kg: +totalKg.toFixed(3),
    breakdown: Object.fromEntries(
      Object.entries(breakdown).sort((a, b) => b[1].kg - a[1].kg)
        .map(([t, v]) => [t, { kg: +v.kg.toFixed(3), count: v.count,
          pct: totalKg > 0 ? +(v.kg / totalKg * 100).toFixed(1) : 0 }])
    ),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body   = await req.json().catch(() => ({}));
    const action = body.action ?? "poll";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const inboundTopicId  = Deno.env.get("IMPACT_AGENT_INBOUND_TOPIC");
    const responseTopicId = Deno.env.get("IMPACT_AGENT_RESPONSE_TOPIC");
    const operatorId      = Deno.env.get("HEDERA_OPERATOR_ID");

    if (!inboundTopicId || !responseTopicId || !operatorId ||
        inboundTopicId.includes("XXXXX") || responseTopicId.includes("XXXXX")) {
      return new Response(
        JSON.stringify({ error: "Impact agent HCS topics not configured. Run node scripts/init-hedera.js" }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (action === "status") {
      const { count } = await supabase
        .from("agent_conversations")
        .select("id", { count: "exact", head: true });
      return new Response(
        JSON.stringify({
          agent_account:      operatorId,
          inbound_topic_id:   inboundTopicId,
          response_topic_id:  responseTopicId,
          total_conversations: count ?? 0,
          status:             "online",
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── Poll inbound topic for new HCS-10 IMPACT_QUERY messages ──────────────
    // Find the last processed sequence number
    const { data: lastConv } = await supabase
      .from("agent_conversations")
      .select("inbound_sequence_number")
      .not("inbound_sequence_number", "is", null)
      .order("inbound_sequence_number", { ascending: false })
      .limit(1)
      .single();

    const afterSeq = lastConv?.inbound_sequence_number ?? 0;

    const messages = await pollInboundTopic(inboundTopicId, afterSeq);

    const processed: string[] = [];
    const hederaClient = buildClient();

    for (const msg of messages) {
      const envelope = decodeEnvelope(msg.message);
      if (!envelope || envelope.p !== "hcs-10") continue;

      const payload = decodePayload(envelope.data as string);
      if (!payload || payload.type !== "IMPACT_QUERY") continue;

      const queryId   = payload.query_id as string;
      const queryType = payload.query   as string;
      const params    = (payload.params ?? {}) as Record<string, string>;

      // Skip if already answered
      const { data: existing } = await supabase
        .from("agent_conversations")
        .select("id, status")
        .eq("query_id", queryId)
        .maybeSingle();
      if (existing && existing.status === "answered") continue;

      const startMs = Date.now();

      try {
        const resultData = await execQuery(supabase, queryType, params);

        // Post response to HCS response topic
        const responseEnvelope = {
          p:           "hcs-10",
          op:          "message",
          operator_id: `${operatorId}@${inboundTopicId}`,
          data:        btoa(JSON.stringify({
            type:          "IMPACT_RESPONSE",
            query_id:      queryId,
            status:        "success",
            data:          resultData,
            verified_at:   new Date().toISOString(),
            agent_account: operatorId,
          })),
          m: `PlastiCatch Impact Response · ${queryType}`,
        };

        const responseSeq = await submitHCS(hederaClient, responseTopicId, responseEnvelope);

        // Upsert conversation record
        await supabase.from("agent_conversations").upsert({
          query_id:               queryId,
          inbound_topic_id:       inboundTopicId,
          response_topic_id:      responseTopicId,
          inbound_sequence_number:  msg.sequence_number,
          response_sequence_number: Number(responseSeq),
          query_type:             queryType,
          query_params:           params,
          response_data:          resultData,
          status:                 "answered",
          processing_ms:          Date.now() - startMs,
          answered_at:            new Date().toISOString(),
        }, { onConflict: "query_id" });

        processed.push(queryId);
      } catch (e) {
        await supabase.from("agent_conversations").upsert({
          query_id:              queryId,
          inbound_topic_id:      inboundTopicId,
          inbound_sequence_number: msg.sequence_number,
          query_type:            queryType,
          query_params:          params,
          status:                "error",
          error_message:         (e as Error).message,
          processing_ms:         Date.now() - startMs,
        }, { onConflict: "query_id" });
      }
    }

    hederaClient.close();

    return new Response(
      JSON.stringify({
        success:        true,
        messages_polled: messages.length,
        queries_processed: processed.length,
        processed_ids:  processed,
        after_sequence: afterSeq,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
