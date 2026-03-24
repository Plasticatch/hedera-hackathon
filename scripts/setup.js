#!/usr/bin/env node
/**
 * PlastiCatch — Interactive Setup Script
 *
 * Usage:
 *   node scripts/setup.js
 *
 * What it does:
 *   1. Checks / installs npm dependencies (root + contracts)
 *   2. Copies .env.example → .env if .env is missing
 *   3. Validates required .env values (Supabase, Hedera)
 *   4. Optionally deploys smart contracts to Hedera Testnet
 *   5. Seeds Supabase demo data
 *   6. Starts the dev server
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { createInterface } from "readline";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__dir, "..");
const ENV    = resolve(ROOT, ".env");
const EXAMPLE = resolve(ROOT, ".env.example");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  dim:    "\x1b[2m",
};

const log  = (msg)        => console.log(`${c.bold}${c.cyan}▸${c.reset}  ${msg}`);
const ok   = (msg)        => console.log(`${c.green}✓${c.reset}  ${msg}`);
const warn = (msg)        => console.log(`${c.yellow}⚠${c.reset}  ${msg}`);
const err  = (msg)        => console.error(`${c.red}✗${c.reset}  ${msg}`);
const dim  = (msg)        => console.log(`${c.dim}   ${msg}${c.reset}`);
const header = (title)    => console.log(`\n${c.bold}${c.cyan}── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}${c.reset}\n`);
const divider = ()        => console.log(`${c.dim}${"─".repeat(60)}${c.reset}`);

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, stdio: "inherit", cwd: ROOT, ...opts });
}

function readEnv() {
  if (!existsSync(ENV)) return {};
  const obj = {};
  for (const line of readFileSync(ENV, "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && !key.startsWith("#") && rest.length) {
      obj[key.trim()] = rest.join("=").trim();
    }
  }
  return obj;
}

function patchEnv(key, value) {
  const raw = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = new RegExp(`^${key}=.*`, "m");
  const updated = existing.test(raw)
    ? raw.replace(existing, `${key}=${value}`)
    : raw + `\n${key}=${value}`;
  writeFileSync(ENV, updated, "utf8");
}

function isBlank(val) {
  if (!val) return true;
  const v = val.trim();
  return (
    v === "" ||
    v.includes("your-project-id") ||
    v.includes("your-anon-key") ||
    v.includes("your-service-role-key") ||
    v.includes("your-private-key") ||
    v.includes("XXXXX") ||
    v === "0x0000000000000000000000000000000000000000"
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function stepDeps() {
  header("Step 1 — Dependencies");
  if (existsSync(resolve(ROOT, "node_modules"))) {
    ok("node_modules already present — skipping root install");
  } else {
    log("Installing root npm dependencies…");
    const r = run("npm install");
    if (r.status !== 0) { err("npm install failed"); process.exit(1); }
    ok("Root dependencies installed");
  }

  const contractsModules = resolve(ROOT, "contracts/node_modules");
  if (existsSync(contractsModules)) {
    ok("contracts/node_modules already present — skipping");
  } else {
    log("Installing contracts npm dependencies…");
    const r = run("npm install", { cwd: resolve(ROOT, "contracts") });
    if (r.status !== 0) { err("contracts npm install failed"); process.exit(1); }
    ok("Contracts dependencies installed");
  }
}

async function promptCredential(rl, label, hint) {
  console.log(`  ${c.dim}${hint}${c.reset}`);
  const val = await ask(rl, `  ${c.bold}${label}:${c.reset} `);
  return val.trim();
}

async function stepEnv(rl) {
  header("Step 2 — Environment (.env)");

  if (!existsSync(ENV)) {
    copyFileSync(EXAMPLE, ENV);
    ok(".env created from .env.example");
  } else {
    ok(".env already exists");
  }

  let env = readEnv();

  // ── Supabase ──────────────────────────────────────────────────────────────
  if (isBlank(env["VITE_SUPABASE_URL"])) {
    console.log(`\n  ${c.yellow}Supabase credentials are required for the app to work.${c.reset}`);
    console.log(`  ${c.dim}Get them from: https://supabase.com/dashboard → your project → Settings → API${c.reset}\n`);

    const sbUrl = await promptCredential(rl, "VITE_SUPABASE_URL", "e.g. https://xyzxyz.supabase.co");
    if (sbUrl) { patchEnv("VITE_SUPABASE_URL", sbUrl); patchEnv("VITE_SUPABASE_PROJECT_ID", sbUrl.split("//")[1]?.split(".")[0] ?? ""); }

    const sbPub = await promptCredential(rl, "VITE_SUPABASE_PUBLISHABLE_KEY", "Anon/public key (starts with sb_publishable_ or eyJ)");
    if (sbPub) patchEnv("VITE_SUPABASE_PUBLISHABLE_KEY", sbPub);

    const sbSvc = await promptCredential(rl, "VITE_SUPABASE_SERVICE_ROLE_KEY", "Service role key (starts with eyJ) — keep secret");
    if (sbSvc) { patchEnv("VITE_SUPABASE_SERVICE_ROLE_KEY", sbSvc); patchEnv("SUPABASE_SERVICE_ROLE_KEY", sbSvc); }

    env = readEnv();
  }

  ok(`Supabase: ${env["VITE_SUPABASE_URL"]}`);

  // ── Hedera ────────────────────────────────────────────────────────────────
  if (isBlank(env["VITE_HEDERA_OPERATOR_ID"]) || isBlank(env["VITE_HEDERA_OPERATOR_KEY"])) {
    console.log(`\n  ${c.yellow}Hedera credentials are needed for contract deployment.${c.reset}`);
    console.log(`  ${c.dim}Create a testnet account at: https://portal.hedera.com${c.reset}\n`);

    const hId = await promptCredential(rl, "HEDERA_OPERATOR_ID", "e.g. 0.0.12345");
    if (hId) { patchEnv("VITE_HEDERA_OPERATOR_ID", hId); patchEnv("HEDERA_OPERATOR_ID", hId); }

    const hKey = await promptCredential(rl, "HEDERA_OPERATOR_KEY", "DER-encoded private key (starts with 302e... or 3030...)");
    if (hKey) { patchEnv("VITE_HEDERA_OPERATOR_KEY", hKey); patchEnv("HEDERA_OPERATOR_KEY", hKey); }

    env = readEnv();
  }

  const hId = env["VITE_HEDERA_OPERATOR_ID"];
  if (!isBlank(hId)) ok(`Hedera operator: ${hId}`);
  else warn("Hedera credentials not set — contract deploy will be skipped");

  return env;
}

async function stepContracts(rl, env) {
  header("Step 3 — Smart Contracts");

  const allDeployed = [
    "VITE_COLLECTOR_REGISTRY_CONTRACT",
    "VITE_STATION_REGISTRY_CONTRACT",
    "VITE_PRC_TOKEN_CONTRACT",
    "VITE_CORPORATE_VAULT_CONTRACT",
  ].every((k) => !isBlank(env[k]));

  if (allDeployed) {
    ok("Contract addresses already present in .env — skipping deploy");
    dim("CollectorRegistry: " + env["VITE_COLLECTOR_REGISTRY_CONTRACT"]);
    dim("PRCToken:          " + env["VITE_PRC_TOKEN_CONTRACT"]);
    return;
  }

  const hKey = env["VITE_HEDERA_OPERATOR_KEY"] || env["HEDERA_OPERATOR_KEY"];
  if (isBlank(hKey)) {
    warn("Hedera private key not set — skipping contract deploy");
    dim("Re-run setup after adding HEDERA_OPERATOR_KEY to .env to deploy contracts.");
    return;
  }

  const ans = await ask(rl, "  Deploy smart contracts to Hedera Testnet now? [y/N] ");
  if (ans.trim().toLowerCase() !== "y") {
    warn("Skipping contract deploy");
    return;
  }

  log("Compiling + deploying contracts (this takes ~60s)…");
  patchEnv("DEPLOYER_PRIVATE_KEY", hKey);

  const result = spawnSync(
    "npx hardhat run scripts/deploy.js --network hederaTestnet",
    { shell: true, cwd: resolve(ROOT, "contracts"), encoding: "utf8" }
  );

  if (result.status !== 0) {
    err("Contract deployment failed:");
    console.error(result.stderr);
    warn("Continuing without contract addresses…");
    return;
  }

  // Parse addresses from deploy output and patch .env
  const output = result.stdout + result.stderr;
  const map = {
    "COLLECTOR_REGISTRY_ADDRESS":  "VITE_COLLECTOR_REGISTRY_CONTRACT",
    "STATION_REGISTRY_ADDRESS":    "VITE_STATION_REGISTRY_CONTRACT",
    "PRC_TOKEN_ADDRESS":           "VITE_PRC_TOKEN_CONTRACT",
    "CORPORATE_VAULT_ADDRESS":     "VITE_CORPORATE_VAULT_CONTRACT",
    "CLEANUP_EVENT_POOL_ADDRESS":  "VITE_CLEANUP_EVENT_POOL_CONTRACT",
    "REPUTATION_ORACLE_ADDRESS":   "VITE_REPUTATION_ORACLE_CONTRACT",
  };

  let found = 0;
  for (const [deployKey, envKey] of Object.entries(map)) {
    const match = output.match(new RegExp(`${deployKey}=(0x[0-9a-fA-F]{40})`));
    if (match) {
      patchEnv(envKey, match[1]);
      ok(`${envKey} = ${match[1]}`);
      found++;
    }
  }

  if (found === 0) {
    warn("Could not parse contract addresses from deploy output.");
    warn("Check contracts/deployment output and update .env manually.");
  } else {
    ok(`${found} contract addresses written to .env`);
  }
}

async function stepSeed(rl) {
  header("Step 4 — Demo Data (Supabase)");

  const ans = await ask(rl, "  Seed demo data into Supabase? [Y/n] ");
  if (ans.trim().toLowerCase() === "n") {
    warn("Skipping seed — leaderboard and marketplace will be empty");
    return;
  }

  log("Running seed script…");
  const r = run("node scripts/seed-demo.mjs");
  if (r.status !== 0) {
    warn("Seed failed. Check .env VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY.");
  } else {
    ok("Demo data seeded successfully");
  }
}

async function stepDev(rl) {
  header("Step 5 — Dev Server");

  const ans = await ask(rl, "  Start the dev server now? [Y/n] ");
  if (ans.trim().toLowerCase() === "n") {
    log("Run `npm run dev` when you're ready.");
    return;
  }

  divider();
  console.log(`\n${c.bold}${c.green}  PlastiCatch is starting…${c.reset}`);
  console.log(`  ${c.cyan}http://localhost:8080${c.reset}\n`);
  divider();

  run("npm run dev");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}  PlastiCatch — Setup${c.reset}`);
  console.log(`${c.dim}  Hackathon: Hashgraph Online Bounty · Sustainability Track${c.reset}\n`);
  divider();

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    await stepDeps();
    const env = await stepEnv(rl);
    await stepContracts(rl, env);
    await stepSeed(rl);
    await stepDev(rl);
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  err("Unexpected error: " + e.message);
  process.exit(1);
});
