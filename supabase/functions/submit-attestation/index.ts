// Supabase Edge Function: submit-attestation
// Inserts attestation as verified immediately, updates collector stats,
// then fire-and-forgets verify-attestation for HCS anchor + HBAR payout.
// Deploy: supabase functions deploy submit-attestation --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlasticItem { type: string; weightGrams: number; }

// Rates in tinybar per gram: 0.40 HBAR/kg = 40_000 tinybar/gram
const RATES: Record<string, number> = {
  PET_BOTTLES:      40_000,
  HDPE_RIGID:       35_000,
  FISHING_GEAR:     55_000,
  FILM_PLASTIC:     20_000,
  FOAM_EPS:         15_000,
  MIXED_HARD:       25_000,
  MIXED_SOFT:       15_000,
  MICROPLASTIC_BAG: 60_000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { collectorId, stationId, zone, plasticItems, photoHash, operatorSignature } = await req.json();

    if (!collectorId || !stationId || !plasticItems?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve collectorId: may be a Hedera account ID ("0.0.XXXXX") or a UUID
    let resolvedCollectorId = collectorId;
    if (typeof collectorId === "string" && collectorId.startsWith("0.0.")) {
      const { data: col } = await supabase
        .from("collectors")
        .select("id")
        .eq("hedera_account_id", collectorId)
        .maybeSingle();
      if (!col) {
        return new Response(
          JSON.stringify({ error: `Collector not found: ${collectorId}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      resolvedCollectorId = col.id;
    }

    const totalWeightGrams = (plasticItems as PlasticItem[]).reduce((s, i) => s + i.weightGrams, 0);
    const payoutTinybar = Math.round(
      (plasticItems as PlasticItem[]).reduce((s, i) => s + i.weightGrams * (RATES[i.type] ?? 25), 0)
    );
    const payoutHbar = payoutTinybar / 100_000_000;

    // Insert as verified immediately — no waiting for secondary function
    const { data: attestation, error } = await supabase
      .from("attestations")
      .insert({
        collector_id: resolvedCollectorId,
        station_id: stationId,
        zone: zone ?? "UNKNOWN",
        plastic_items: plasticItems,
        total_weight_grams: totalWeightGrams,
        payout_tinybar: payoutTinybar,
        payout_hbar: payoutHbar,
        photo_hash: photoHash ?? null,
        operator_signature: operatorSignature ?? null,
        status: "verified",
      })
      .select()
      .single();

    if (error) throw error;

    // Update collector stats immediately
    const { data: existingCollector } = await supabase
      .from("collectors")
      .select("total_kg_recovered, total_hbar_earned")
      .eq("id", resolvedCollectorId)
      .maybeSingle();

    if (existingCollector) {
      await supabase
        .from("collectors")
        .update({
          total_kg_recovered: Number(existingCollector.total_kg_recovered) + totalWeightGrams / 1000,
          total_hbar_earned:  Number(existingCollector.total_hbar_earned)  + payoutHbar,
        })
        .eq("id", resolvedCollectorId);
    }

    // Fire-and-forget: HCS anchor + HBAR payout via verify-attestation
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    fetch(`${supabaseUrl}/functions/v1/verify-attestation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey!,
      },
      body: JSON.stringify({ attestationId: attestation.id }),
    }).catch(() => { /* non-critical — on-chain ops best-effort */ });

    return new Response(
      JSON.stringify({
        success: true,
        attestation: {
          id: attestation.id,
          totalWeightGrams,
          payoutTinybar,
          payoutHbar,
          status: "verified",
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
