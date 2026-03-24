// Supabase Edge Function: manage-recovery-agent
// Processes all pending attestations in a zone by running the verify-attestation pipeline.
// Invoke via cron or direct HTTP call.
// Deploy: supabase functions deploy manage-recovery-agent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Optional: filter by zone from request body
    let zone: string | undefined;
    try {
      const body = await req.json();
      zone = body.zone;
    } catch {
      // no body — process all zones
    }

    // Fetch all pending attestations (optionally filtered by zone)
    let query = supabase
      .from("attestations")
      .select("id, zone")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50); // process up to 50 per invocation

    if (zone) query = query.eq("zone", zone);

    const { data: pendingAttestations, error } = await query;
    if (error) throw error;

    if (!pendingAttestations?.length) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending attestations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results = await Promise.allSettled(
      pendingAttestations.map(async (att) => {
        const res = await fetch(`${supabaseUrl}/functions/v1/verify-attestation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey": serviceKey,
          },
          body: JSON.stringify({ attestationId: att.id }),
        });
        const data = await res.json();
        return { id: att.id, ...data };
      })
    );

    const processed = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        processed,
        failed,
        total: pendingAttestations.length,
        results: results.map(r =>
          r.status === "fulfilled" ? r.value : { error: String((r as PromiseRejectedResult).reason) }
        ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
