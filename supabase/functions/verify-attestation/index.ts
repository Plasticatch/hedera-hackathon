import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  TransferTransaction,
  Hbar,
  AccountId,
} from "npm:@hashgraph/sdk@2.50.0";

// ── Hedera client (lazy — only initialised if topic IDs are configured) ────────
function buildHederaClient(): Client | null {
  const operatorId  = Deno.env.get("HEDERA_OPERATOR_ID");
  const operatorKey = Deno.env.get("HEDERA_OPERATOR_KEY");
  if (!operatorId || !operatorKey) return null;
  const network = Deno.env.get("VITE_HEDERA_NETWORK") ?? "testnet";
  const client  = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  return client;
}

async function payoutToCollector(
  client: Client,
  collectorAccountId: string,
  amountHbar: number,
): Promise<string | null> {
  try {
    const tx = await new TransferTransaction()
      .addHbarTransfer(client.operatorAccountId!, Hbar.from(-amountHbar))
      .addHbarTransfer(AccountId.fromString(collectorAccountId), Hbar.from(amountHbar))
      .execute(client);
    const receipt = await tx.getReceipt(client);
    if (receipt.status.toString() !== "SUCCESS") return null;
    return tx.transactionId.toString();
  } catch (e) {
    console.warn("[verify-attestation] HBAR payout failed:", (e as Error).message);
    return null;
  }
}

async function anchorToHCS(
  client: Client,
  topicId: string,
  payload: Record<string, unknown>,
): Promise<bigint | null> {
  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(JSON.stringify(payload))
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return receipt.topicSequenceNumber;
  } catch (e) {
    console.warn("[verify-attestation] HCS anchor failed:", (e as Error).message);
    return null;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plastic payout rates in HBAR per kg
const PAYOUT_RATES: Record<string, number> = {
  PET_BOTTLES: 0.40,
  HDPE_RIGID: 0.35,
  FISHING_GEAR: 0.55,
  FILM_PLASTIC: 0.20,
  FOAM_EPS: 0.15,
  MIXED_HARD: 0.25,
  MIXED_SOFT: 0.15,
  MICROPLASTIC_BAG: 0.60,
};

const REPUTATION_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.1,
  2: 1.2,
  3: 1.35,
  4: 1.5,
};

const MAX_DAILY_SUBMISSIONS = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { attestationId } = await req.json();

    if (!attestationId) {
      return new Response(JSON.stringify({ error: "attestationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch attestation
    const { data: attestation, error: attError } = await supabase
      .from("attestations")
      .select("*, collectors(*), weighing_stations(*)")
      .eq("id", attestationId)
      .single();

    if (attError || !attestation) {
      return new Response(JSON.stringify({ error: "Attestation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checks: { name: string; passed: boolean; reason?: string }[] = [];

    // CHECK 1: Station registered (active or pending_review for new stations)
    const station = attestation.weighing_stations;
    const stationActive = station !== null && ["active", "pending_review"].includes(station?.status ?? "");
    checks.push({ name: "STATION_ACTIVE", passed: stationActive, reason: stationActive ? undefined : "Station not registered or suspended" });

    // CHECK 2: Calibration cert not expired (null = not yet set, passes for new stations)
    const calibrationValid = !station?.calibration_expiry || new Date(station.calibration_expiry) > new Date();
    checks.push({ name: "CALIBRATION_VALID", passed: calibrationValid, reason: calibrationValid ? undefined : "Calibration expired" });

    // CHECK 3: Collector registered and active
    const collector = attestation.collectors;
    const collectorValid = collector?.status === "active";
    checks.push({ name: "COLLECTOR_VALID", passed: collectorValid, reason: collectorValid ? undefined : "Collector not active" });

    // CHECK 4: Volume anomaly (>3x 30-day avg)
    const { data: avgData } = await supabase
      .from("attestations")
      .select("total_weight_grams")
      .eq("collector_id", attestation.collector_id)
      .eq("station_id", attestation.station_id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const avg30d = avgData && avgData.length > 0
      ? avgData.reduce((sum, a) => sum + (a.total_weight_grams || 0), 0) / avgData.length
      : 0;
    const volumeOk = avg30d === 0 || attestation.total_weight_grams <= avg30d * 3;
    checks.push({ name: "VOLUME_CHECK", passed: volumeOk, reason: volumeOk ? undefined : `Weight ${attestation.total_weight_grams}g exceeds 3x avg ${Math.round(avg30d)}g` });

    // CHECK 5: Frequency anomaly (max daily submissions)
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await supabase
      .from("attestations")
      .select("*", { count: "exact", head: true })
      .eq("collector_id", attestation.collector_id)
      .eq("station_id", attestation.station_id)
      .gte("created_at", today);

    const frequencyOk = (todayCount || 0) <= MAX_DAILY_SUBMISSIONS;
    checks.push({ name: "FREQUENCY_CHECK", passed: frequencyOk, reason: frequencyOk ? undefined : `${todayCount} submissions today exceeds max ${MAX_DAILY_SUBMISSIONS}` });

    // Determine result
    const allPassed = checks.every(c => c.passed);
    const hasFlagged = checks.some(c => !c.passed && (c.name === "VOLUME_CHECK" || c.name === "FREQUENCY_CHECK"));

    let newStatus: string;
    if (allPassed) {
      newStatus = "verified";
    } else if (hasFlagged) {
      newStatus = "flagged";
    } else {
      newStatus = "rejected";
    }

    // Fetch active cleanup event multiplier for this zone
    let eventMultiplier = 1.0;
    const now = new Date().toISOString();
    const { data: activeEvents } = await supabase
      .from("cleanup_events")
      .select("multiplier")
      .eq("status", "active")
      .lte("start_date", now)
      .gte("end_date", now)
      .contains("zones", [attestation.zone])
      .order("multiplier", { ascending: false })
      .limit(1);
    if (activeEvents?.[0]?.multiplier) {
      eventMultiplier = Number(activeEvents[0].multiplier);
    }

    // Fetch active demand bonus for this zone from HCS demand signals
    // Stored as active cleanup_events with type 'demand_signal', or fall back to 1.0
    let demandBonus = 1.0;
    const { data: demandData } = await supabase
      .from("cleanup_events")
      .select("multiplier")
      .eq("status", "active")
      .eq("sponsor_name", "DEMAND_SIGNAL")
      .contains("zones", [attestation.zone])
      .limit(1);
    if (demandData?.[0]?.multiplier) {
      demandBonus = Number(demandData[0].multiplier);
    }

    // Calculate payout if verified
    let payoutHbar = 0;
    if (allPassed && collector) {
      const plasticItems = attestation.plastic_items as { type: string; weightGrams: number }[];
      const reputationMultiplier = REPUTATION_MULTIPLIERS[collector.reputation_tier] || 1.0;

      payoutHbar = plasticItems.reduce((total, item) => {
        const rate = PAYOUT_RATES[item.type] || 0.15;
        return total + (item.weightGrams / 1000) * rate * reputationMultiplier * demandBonus * eventMultiplier;
      }, 0);
    }

    // ── Anchor verified/flagged result to HCS attestation topic ─────────────
    let hcsSequenceNumber: bigint | null = null;
    const attestationTopicId = Deno.env.get("VITE_ATTESTATION_TOPIC_ID");
    const isConfigured = attestationTopicId && !attestationTopicId.includes("XXXXX");
    if (isConfigured) {
      const hederaClient = buildHederaClient();
      if (hederaClient) {
        hcsSequenceNumber = await anchorToHCS(hederaClient, attestationTopicId!, {
          eventType:         "RECOVERY_ATTESTATION",
          attestationId,
          collectorId:       attestation.collector_id,
          stationId:         attestation.station_id,
          zone:              attestation.zone,
          totalWeightGrams:  attestation.total_weight_grams,
          payoutHbar:        allPassed ? payoutHbar : null,
          status:            newStatus,
          checks:            checks.map(c => ({ name: c.name, passed: c.passed })),
          timestamp:         new Date().toISOString(),
        });
        hederaClient.close();
      }
    }

    // ── HBAR payout to collector ─────────────────────────────────────────────
    let hbarPayoutTxId: string | null = null;
    if (allPassed && payoutHbar > 0 && collector?.hedera_account_id) {
      const hederaClient = buildHederaClient();
      if (hederaClient) {
        hbarPayoutTxId = await payoutToCollector(hederaClient, collector.hedera_account_id, payoutHbar);
        hederaClient.close();
      }
    }

    // Update attestation
    await supabase
      .from("attestations")
      .update({
        status:           newStatus,
        payout_hbar:      allPassed ? payoutHbar : null,
        payout_tinybar:   allPassed ? Math.round(payoutHbar * 100_000_000) : null,
        ...(hcsSequenceNumber !== null ? { hcs_sequence_number: Number(hcsSequenceNumber) } : {}),
      })
      .eq("id", attestationId);

    // Update collector stats if verified
    if (allPassed && collector) {
      await supabase
        .from("collectors")
        .update({
          total_kg_recovered: (parseFloat(String(collector.total_kg_recovered)) + attestation.total_weight_grams / 1000),
          total_hbar_earned: (parseFloat(String(collector.total_hbar_earned)) + payoutHbar),
        })
        .eq("id", collector.id);
    }

    return new Response(JSON.stringify({
      attestationId,
      status: newStatus,
      checks,
      payoutHbar:      allPassed ? payoutHbar : null,
      eventMultiplier: allPassed && eventMultiplier > 1.0 ? eventMultiplier : null,
      demandBonus:     allPassed && demandBonus > 1.0 ? demandBonus : null,
      hcsSequenceNumber: hcsSequenceNumber !== null ? Number(hcsSequenceNumber) : null,
      hcsTopicId:      isConfigured ? attestationTopicId : null,
      hbarPayoutTxId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
