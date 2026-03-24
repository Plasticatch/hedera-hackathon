// Supabase Edge Function: register-collector
// Creates a real Hedera Testnet account for the collector using AccountCreateTransaction,
// then inserts a collector profile into Supabase.
// Deploy: supabase functions deploy register-collector

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  AccountCreateTransaction,
  Client,
  Hbar,
  PrivateKey,
} from "npm:@hashgraph/sdk@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initial onboarding balance funded from the protocol operator account
const ONBOARDING_HBAR = 0.3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, displayName, zone, phoneHash, password } = await req.json();

    if (!userId || !zone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, zone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Hedera client (operator pays for the new account creation) ──────────
    const operatorId  = Deno.env.get("HEDERA_OPERATOR_ID");
    const operatorKey = Deno.env.get("HEDERA_OPERATOR_KEY");
    const network     = Deno.env.get("VITE_HEDERA_NETWORK") ?? "testnet";

    if (!operatorId || !operatorKey) {
      return new Response(
        JSON.stringify({ error: "Hedera operator credentials not configured. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // ── Generate a new key pair for this collector ───────────────────────────
    const collectorPrivateKey = PrivateKey.generateED25519();
    const collectorPublicKey  = collectorPrivateKey.publicKey;

    // ── Create the account on-chain ──────────────────────────────────────────
    const txResponse = await new AccountCreateTransaction()
      .setKey(collectorPublicKey)
      .setInitialBalance(new Hbar(ONBOARDING_HBAR))
      .setAccountMemo(`PlastiCatch collector · ${zone}`)
      .execute(client);

    const receipt = await txResponse.getReceipt(client);
    const newAccountId = receipt.accountId!.toString(); // e.g. "0.0.5291840"

    // ── Save to Supabase ─────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: collector, error } = await supabase
      .from("collectors")
      .insert({
        user_id: userId,
        display_name: displayName || `Collector ${newAccountId.split(".").pop()}`,
        phone_hash: phoneHash ?? crypto.randomUUID(),
        zone,
        hedera_account_id: newAccountId,
        hedera_private_key: collectorPrivateKey.toString(), // stored custodially for managed-wallet flow
        did_document: {},
        reputation_score: 0,
        reputation_tier: 1,
        total_kg_recovered: 0,
        total_hbar_earned: 0,
        days_active: 0,
        unique_stations: 0,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(`Supabase insert failed: ${error.message}`);

    // ── Hash and store the password via pgcrypto ──────────────────────────────
    const { error: pwErr } = await supabase.rpc("set_collector_password", {
      p_collector_id: collector.id,
      p_password: password,
    });
    if (pwErr) throw new Error(`Password hashing failed: ${pwErr.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        collector: {
          id: collector.id,
          user_id: collector.user_id,
          hedera_account_id: newAccountId,
          // Return private key so collector can optionally export/save it.
          // In production this would be shown once and never stored in the response.
          hedera_private_key: collectorPrivateKey.toString(),
          zone: collector.zone,
          display_name: collector.display_name,
        },
        onboardingCredit: ONBOARDING_HBAR,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[register-collector]", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
