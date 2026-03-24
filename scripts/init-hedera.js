#!/usr/bin/env node
/**
 * scripts/init-hedera.js
 * PlastiCatch — Hedera Initialization Script
 *
 * Creates:
 *   1. Five HCS topics (attestation, DID, leaderboard, dispute, event)
 *   2. Three protocol accounts (treasury, payment pool, PRC vault)
 *
 * Run: node scripts/init-hedera.js
 * Requires: HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY in .env
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
    Client,
    PrivateKey,
    AccountId,
    TopicCreateTransaction,
    AccountCreateTransaction,
    Hbar,
    TransferTransaction,
} from "@hashgraph/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePrivateKey(keyStr) {
    // Try DER/hex format first, then fallback formats
    if (!keyStr) throw new Error("HEDERA_OPERATOR_KEY is not set");
    try { return PrivateKey.fromStringECDSA(keyStr); } catch { }
    try { return PrivateKey.fromStringDer(keyStr); } catch { }
    try { return PrivateKey.fromString(keyStr); } catch { }
    throw new Error(`Cannot parse private key: ${keyStr.slice(0, 20)}...`);
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const operatorIdStr = process.env.HEDERA_OPERATOR_ID;
    const operatorKeyStr = process.env.HEDERA_OPERATOR_KEY;

    if (!operatorIdStr || !operatorKeyStr) {
        console.error("❌  HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env");
        process.exit(1);
    }

    console.log("🌊  PlastiCatch — Hedera Initialization");
    console.log(`    Operator: ${operatorIdStr}`);
    console.log(`    Network:  testnet\n`);

    const operatorId = AccountId.fromString(operatorIdStr);
    const operatorKey = parsePrivateKey(operatorKeyStr);

    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // ── 1. Create HCS Topics ────────────────────────────────────────────────

    const topics = [
        { name: "ATTESTATION",          memo: "PlastiCatch Recovery Attestations" },
        { name: "DID",                  memo: "PlastiCatch Collector DIDs" },
        { name: "LEADERBOARD",          memo: "PlastiCatch Leaderboard Updates" },
        { name: "DISPUTE",              memo: "PlastiCatch Dispute Events" },
        { name: "EVENT",                memo: "PlastiCatch Cleanup Events" },
        { name: "IMPACT_AGENT_INBOUND", memo: "PlastiCatch Impact Agent — Inbound Queries (HCS-10)" },
        { name: "IMPACT_AGENT_RESPONSE",memo: "PlastiCatch Impact Agent — Responses (HCS-10)" },
    ];

    const topicIds = {};

    console.log("📦  Creating HCS Topics...");
    for (const topic of topics) {
        try {
            const tx = new TopicCreateTransaction()
                .setTopicMemo(topic.memo)
                .setAdminKey(operatorKey.publicKey)
                .setSubmitKey(operatorKey.publicKey);

            const response = await tx.execute(client);
            const receipt = await response.getReceipt(client);
            const topicId = receipt.topicId.toString();
            topicIds[topic.name] = topicId;
            console.log(`    ✅  ${topic.name} topic: ${topicId}`);
            await sleep(500); // avoid rate limiting
        } catch (err) {
            console.error(`    ❌  Failed to create ${topic.name} topic:`, err.message);
            process.exit(1);
        }
    }

    // ── 2. Create Protocol Accounts ────────────────────────────────────────

    const protocolAccounts = [
        { name: "TREASURY", initialHbar: 10 },
        { name: "PAYMENT_POOL", initialHbar: 100 },
        { name: "PRC_VAULT", initialHbar: 5 },
    ];

    const accountIds = {};
    const accountKeys = {};

    console.log("\n🏦  Creating Protocol Accounts...");
    for (const acct of protocolAccounts) {
        try {
            const newKey = PrivateKey.generateED25519();
            const tx = new AccountCreateTransaction()
                .setKey(newKey.publicKey)
                .setInitialBalance(new Hbar(acct.initialHbar))
                .setAccountMemo(`PlastiCatch ${acct.name}`);

            const response = await tx.execute(client);
            const receipt = await response.getReceipt(client);
            const accountId = receipt.accountId.toString();

            accountIds[acct.name] = accountId;
            accountKeys[acct.name] = newKey.toStringRaw();

            console.log(`    ✅  ${acct.name}: ${accountId}  (${acct.initialHbar} HBAR seed)`);
            await sleep(500);
        } catch (err) {
            console.error(`    ❌  Failed to create ${acct.name} account:`, err.message);
            process.exit(1);
        }
    }

    client.close();

    // ── 3. Print .env-ready output ─────────────────────────────────────────

    console.log("\n");
    console.log("═".repeat(70));
    console.log("  ✅  COPY THESE VALUES INTO YOUR .env FILE");
    console.log("═".repeat(70));
    console.log(`
# ─── HCS Topic IDs ───────────────────────────────────────────────────────────
VITE_ATTESTATION_TOPIC_ID=${topicIds.ATTESTATION}
VITE_DID_TOPIC_ID=${topicIds.DID}
VITE_LEADERBOARD_TOPIC_ID=${topicIds.LEADERBOARD}
VITE_DISPUTE_TOPIC_ID=${topicIds.DISPUTE}
VITE_EVENT_TOPIC_ID=${topicIds.EVENT}

# ─── HCS-10 Impact Agent Topics ───────────────────────────────────────────────
VITE_IMPACT_AGENT_INBOUND_TOPIC=${topicIds.IMPACT_AGENT_INBOUND}
VITE_IMPACT_AGENT_RESPONSE_TOPIC=${topicIds.IMPACT_AGENT_RESPONSE}
# Server-side aliases (no VITE_ prefix — used by Supabase edge functions)
IMPACT_AGENT_INBOUND_TOPIC=${topicIds.IMPACT_AGENT_INBOUND}
IMPACT_AGENT_RESPONSE_TOPIC=${topicIds.IMPACT_AGENT_RESPONSE}

# ─── Protocol Accounts ────────────────────────────────────────────────────────
VITE_PROTOCOL_TREASURY_ACCOUNT=${accountIds.TREASURY}
VITE_PAYMENT_POOL_ACCOUNT=${accountIds.PAYMENT_POOL}
VITE_PRC_VAULT_ACCOUNT=${accountIds.PRC_VAULT}
`);
    console.log("═".repeat(70));
    console.log("\n⚠️   SAVE THESE PRIVATE KEYS SECURELY (never commit them!):");
    console.log(`  TREASURY_KEY    = ${accountKeys.TREASURY}`);
    console.log(`  PAYMENT_POOL_KEY= ${accountKeys.PAYMENT_POOL}`);
    console.log(`  PRC_VAULT_KEY   = ${accountKeys.PRC_VAULT}`);
    console.log("═".repeat(70));
    console.log("\n🎉  Hedera init complete! Next: node scripts/fund-payment-pool.js");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
