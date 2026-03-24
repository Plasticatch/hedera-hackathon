#!/usr/bin/env node
/**
 * scripts/start-agents.js
 * PlastiCatch — Recovery Agent Launcher (Stub)
 *
 * The HOL Registry Recovery Agent is a separate long-running process.
 * This script bootstraps it using the RecoveryAgentService.
 *
 * Run: node scripts/start-agents.js
 * Requires all .env values to be set (topics + contracts).
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

function checkEnv(keys) {
    const missing = keys.filter(
        (k) => !process.env[k] || process.env[k].includes("REPLACE")
    );
    return missing;
}

const required = [
    "HEDERA_OPERATOR_ID",
    "HEDERA_OPERATOR_KEY",
    "VITE_ATTESTATION_TOPIC_ID",
    "VITE_DID_TOPIC_ID",
    "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = checkEnv(required);
if (missing.length > 0) {
    console.error("❌  Missing required environment variables:");
    missing.forEach((k) => console.error(`    - ${k}`));
    console.error("\n   Run init-hedera.js and deploy:contracts first.");
    process.exit(1);
}

const zones = (process.env.RECOVERY_AGENT_ZONES || "MEDITERRANEAN_NORTH")
    .split(",")
    .map((z) => z.trim());

console.log("🤖  PlastiCatch Recovery Agent");
console.log(`    Operator:  ${process.env.HEDERA_OPERATOR_ID}`);
console.log(`    Zones:     ${zones.join(", ")}`);
console.log(`    Interval:  ${process.env.AGENT_PROCESSING_INTERVAL || 10000}ms`);
console.log(`    Supabase:  ${process.env.VITE_SUPABASE_URL}`);
console.log("");
console.log("🔄  Monitoring HCS topic for recovery attestations...");
console.log("    Press Ctrl+C to stop.\n");

// In production this would import RecoveryAgentService and run it.
// For now, simulates heartbeat so the process stays alive and is observable.
let tick = 0;
const interval = setInterval(() => {
    tick++;
    const ts = new Date().toISOString();
    if (tick % 6 === 0) {
        console.log(`[${ts}] 💓 Agent heartbeat — tick ${tick}`);
    }
    // Every 60 ticks (~10 min at 10s interval), simulate a report
    if (tick % 60 === 0) {
        console.log(`[${ts}] 📊 Weekly impact report generated (mock)`);
    }
}, parseInt(process.env.AGENT_PROCESSING_INTERVAL || "10000", 10));

process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\n👋  Recovery Agent stopped.");
    process.exit(0);
});
