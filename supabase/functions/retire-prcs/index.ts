// Supabase Edge Function: retire-prcs
// Inserts a prc_retirements row and anchors the retirement to HCS EVENT topic.
// Deploy: supabase functions deploy retire-prcs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
} from "npm:@hashgraph/sdk@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildHederaClient(): Client | null {
  const operatorId  = Deno.env.get("HEDERA_OPERATOR_ID");
  const operatorKey = Deno.env.get("HEDERA_OPERATOR_KEY");
  if (!operatorId || !operatorKey) return null;
  const network = Deno.env.get("VITE_HEDERA_NETWORK") ?? "testnet";
  const client  = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  return client;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, company_name, prcs_retired, report_ref } = await req.json();

    if (!company_name || !prcs_retired) {
      return new Response(
        JSON.stringify({ error: "company_name and prcs_retired are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Insert retirement record
    const { data: retirement, error } = await supabase
      .from("prc_retirements")
      .insert({
        buyer_user_id: user_id || crypto.randomUUID(),
        company_name,
        prcs_retired,
        report_ref: report_ref ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Anchor to HCS EVENT topic
    let hcsSequenceNumber: number | null = null;
    let hcsTopicId: string | null = null;
    const eventTopicId = Deno.env.get("VITE_EVENT_TOPIC_ID");

    if (eventTopicId && !eventTopicId.includes("XXXXX")) {
      const client = buildHederaClient();
      if (client) {
        try {
          const tx = await new TopicMessageSubmitTransaction()
            .setTopicId(TopicId.fromString(eventTopicId))
            .setMessage(JSON.stringify({
              eventType:   "PRC_RETIREMENT",
              retirementId: retirement.id,
              companyName: company_name,
              prcsRetired: prcs_retired,
              reportRef:   report_ref ?? null,
              timestamp:   new Date().toISOString(),
            }))
            .execute(client);
          const receipt = await tx.getReceipt(client);
          hcsSequenceNumber = Number(receipt.topicSequenceNumber);
          hcsTopicId = eventTopicId;
        } catch (e) {
          console.warn("[retire-prcs] HCS anchor failed:", (e as Error).message);
        } finally {
          client.close();
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        retirement,
        hcsSequenceNumber,
        hcsTopicId,
        hashScanUrl: hcsSequenceNumber !== null
          ? `https://hashscan.io/testnet/topic/${hcsTopicId}?sequenceNumber=${hcsSequenceNumber}`
          : null,
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
