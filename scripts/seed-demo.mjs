/**
 * PlastiCatch — Demo Seed Script
 * Populates Supabase with realistic demo data so judges see a live,
 * populated app on first visit.
 *
 * Usage:
 *   node scripts/seed-demo.mjs          # seed
 *   node scripts/seed-demo.mjs --clear  # wipe seeded data then re-seed
 *
 * Requires: .env with VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env manually (no dotenv dependency needed) ──────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && !key.startsWith("#") && rest.length) {
    process.env[key.trim()] = rest.join("=").trim();
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const CLEAR = process.argv.includes("--clear");

// ── Seed data ─────────────────────────────────────────────────────────────────

const STATIONS = [
  {
    facility_name: "Alexandria Port Collection Hub",
    physical_address: "East Harbour, Alexandria, Egypt",
    zone: "MEDITERRANEAN_NORTH",
    facility_type: "port",
    accepted_types: ["PET_BOTTLES", "FISHING_GEAR", "HDPE_RIGID", "FILM_PLASTIC"],
    operating_hours: "06:00-18:00, Mon-Sat",
    hedera_account_id: "0.0.8201001",
    stake_amount: 500,
    stake_status: "active",
    status: "active",
  },
  {
    facility_name: "Manila Bay Recycling Depot",
    physical_address: "Baywalk, Manila, Philippines",
    zone: "PACIFIC_PHILIPPINES",
    facility_type: "recycling",
    accepted_types: ["PET_BOTTLES", "MIXED_HARD", "MIXED_SOFT", "FOAM_EPS"],
    operating_hours: "07:00-17:00, Mon-Sun",
    hedera_account_id: "0.0.8201002",
    stake_amount: 500,
    stake_status: "active",
    status: "active",
  },
];

const COLLECTORS = [
  {
    display_name: "Amara Diallo",
    zone: "GULF_OF_GUINEA",
    hedera_account_id: "0.0.8201010",
    reputation_score: 2100,
    reputation_tier: 5,
    total_kg_recovered: 847.5,
    total_hbar_earned: 423.75,
    days_active: 112,
    unique_stations: 4,
  },
  {
    display_name: "Kai Santos",
    zone: "PACIFIC_PHILIPPINES",
    hedera_account_id: "0.0.8201011",
    reputation_score: 1560,
    reputation_tier: 4,
    total_kg_recovered: 623.2,
    total_hbar_earned: 311.60,
    days_active: 84,
    unique_stations: 2,
  },
  {
    display_name: "Leila Mansour",
    zone: "MEDITERRANEAN_NORTH",
    hedera_account_id: "0.0.8201012",
    reputation_score: 1120,
    reputation_tier: 3,
    total_kg_recovered: 445.8,
    total_hbar_earned: 222.90,
    days_active: 63,
    unique_stations: 3,
  },
  {
    display_name: "Marco Rivera",
    zone: "CARIBBEAN_SEA",
    hedera_account_id: "0.0.8201013",
    reputation_score: 780,
    reputation_tier: 3,
    total_kg_recovered: 312.1,
    total_hbar_earned: 156.05,
    days_active: 49,
    unique_stations: 2,
  },
  {
    display_name: "Priya Nair",
    zone: "ARABIAN_GULF",
    hedera_account_id: "0.0.8201014",
    reputation_score: 490,
    reputation_tier: 2,
    total_kg_recovered: 198.4,
    total_hbar_earned: 99.20,
    days_active: 28,
    unique_stations: 1,
  },
  {
    display_name: "Thomas Müller",
    zone: "NORTH_SEA",
    hedera_account_id: "0.0.8201015",
    reputation_score: 210,
    reputation_tier: 1,
    total_kg_recovered: 87.3,
    total_hbar_earned: 43.65,
    days_active: 14,
    unique_stations: 1,
  },
];

// Attestation templates — plastic_items per submission
const ATTEST_TEMPLATES = [
  [{ type: "PET_BOTTLES", weightGrams: 8500 }, { type: "HDPE_RIGID", weightGrams: 3200 }],
  [{ type: "FISHING_GEAR", weightGrams: 12000 }],
  [{ type: "MIXED_HARD", weightGrams: 5400 }, { type: "FOAM_EPS", weightGrams: 2100 }],
  [{ type: "PET_BOTTLES", weightGrams: 6200 }, { type: "FILM_PLASTIC", weightGrams: 1800 }],
  [{ type: "FISHING_GEAR", weightGrams: 9400 }, { type: "MIXED_SOFT", weightGrams: 3300 }],
];

function totalGrams(items) {
  return items.reduce((s, i) => s + i.weightGrams, 0);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function clearDemoData() {
  console.log("🗑   Clearing previous demo data…");

  // Remove by hedera_account_id pattern we seeded
  const demoHederaIds = [
    ...STATIONS.map((s) => s.hedera_account_id),
    ...COLLECTORS.map((c) => c.hedera_account_id),
  ];

  const { data: cols } = await supabase
    .from("collectors")
    .select("id")
    .in("hedera_account_id", COLLECTORS.map((c) => c.hedera_account_id));

  if (cols?.length) {
    const ids = cols.map((c) => c.id);
    await supabase.from("attestations").delete().in("collector_id", ids);
    await supabase.from("collectors").delete().in("id", ids);
  }

  const { data: stns } = await supabase
    .from("weighing_stations")
    .select("id")
    .in("hedera_account_id", STATIONS.map((s) => s.hedera_account_id));

  if (stns?.length) {
    const ids = stns.map((s) => s.id);
    await supabase.from("attestations").delete().in("station_id", ids);
    await supabase.from("weighing_stations").delete().in("id", ids);
  }

  console.log("✅  Cleared.");
}

async function seed() {
  if (CLEAR) await clearDemoData();

  // ── 1. Insert stations ────────────────────────────────────────────────────
  console.log("\n📍  Inserting weighing stations…");
  const { data: insertedStations, error: stErr } = await supabase
    .from("weighing_stations")
    .insert(
      STATIONS.map((s) => ({
        user_id: crypto.randomUUID(),
        ...s,
      }))
    )
    .select("id, facility_name, zone, hedera_account_id");

  if (stErr) {
    console.error("❌  Stations error:", stErr.message);
    process.exit(1);
  }
  console.log(`   ✓ ${insertedStations.length} stations inserted`);

  // Set demo password for each station so judges can sign in
  const DEMO_STATION_PASSWORD = "plasticatch2024";
  for (const station of insertedStations) {
    const { error: pwErr } = await supabase.rpc("set_station_password", {
      p_station_id: station.id,
      p_password: DEMO_STATION_PASSWORD,
    });
    if (pwErr) {
      console.error(`   ⚠️  Could not set password for ${station.facility_name}:`, pwErr.message);
    } else {
      console.log(`   🔒 Password set for ${station.facility_name}`);
    }
  }

  // ── 2. Insert collectors ──────────────────────────────────────────────────
  console.log("\n👤  Inserting collectors…");
  const { data: insertedCollectors, error: colErr } = await supabase
    .from("collectors")
    .insert(
      COLLECTORS.map((c) => ({
        user_id: crypto.randomUUID(),
        phone_hash: crypto.randomUUID(),
        did_document: {},
        status: "active",
        ...c,
      }))
    )
    .select("id, display_name, zone, hedera_account_id");

  if (colErr) {
    console.error("❌  Collectors error:", colErr.message);
    process.exit(1);
  }
  console.log(`   ✓ ${insertedCollectors.length} collectors inserted`);

  // ── 3. Insert attestations ────────────────────────────────────────────────
  console.log("\n📦  Inserting attestations…");
  const attestations = [];

  for (const [ci, col] of insertedCollectors.entries()) {
    const stationIndex = ci % insertedStations.length;
    const station = insertedStations[stationIndex];
    // 2-4 attestations per collector, spread over last 30 days
    const count = 2 + (ci % 3);
    for (let i = 0; i < count; i++) {
      const template = ATTEST_TEMPLATES[(ci + i) % ATTEST_TEMPLATES.length];
      attestations.push({
        collector_id: col.id,
        station_id: station.id,
        zone: col.zone,
        plastic_items: template,
        total_weight_grams: totalGrams(template),
        payout_hbar: parseFloat((totalGrams(template) / 1000 * 0.40).toFixed(4)),
        payout_tinybar: Math.round(totalGrams(template) / 1000 * 0.40 * 100_000_000),
        status: "verified",
        created_at: daysAgo(i * 5 + 1),
      });
    }
  }

  // Add one attestation for TODAY so the station dashboard shows live data
  const todayAttestation = {
    collector_id: insertedCollectors[0].id,
    station_id: insertedStations[0].id,
    zone: insertedCollectors[0].zone,
    plastic_items: ATTEST_TEMPLATES[0],
    total_weight_grams: totalGrams(ATTEST_TEMPLATES[0]),
    payout_hbar: parseFloat((totalGrams(ATTEST_TEMPLATES[0]) / 1000 * 0.40).toFixed(4)),
    payout_tinybar: Math.round(totalGrams(ATTEST_TEMPLATES[0]) / 1000 * 0.40 * 100_000_000),
    status: "verified",
    created_at: new Date().toISOString(),
  };
  attestations.push(todayAttestation);

  const { data: insertedAtt, error: attErr } = await supabase
    .from("attestations")
    .insert(attestations)
    .select("id");

  if (attErr) {
    console.error("❌  Attestations error:", attErr.message);
    process.exit(1);
  }
  console.log(`   ✓ ${insertedAtt.length} attestations inserted`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("✅  Demo data seeded successfully!\n");

  console.log("STATIONS (use these to sign in as a station operator):");
  for (const s of insertedStations) {
    console.log(`   ${s.facility_name}  [${s.zone}]`);
    console.log(`   → Sign-in name: "${s.facility_name}"`);
    console.log(`   → Hedera ID: ${s.hedera_account_id}`);
    console.log(`   → Password: plasticatch2024\n`);
  }

  console.log("TOP COLLECTORS (visible on /leaderboard):");
  for (const c of insertedCollectors.slice(0, 3)) {
    console.log(`   ${c.display_name}  [${c.zone}]  ${c.hedera_account_id}`);
  }

  console.log("\nNEXT STEPS:");
  console.log("   1. npm run dev");
  console.log("   2. Open http://localhost:8080");
  console.log('   3. Check /leaderboard — top collectors should be ranked');
  console.log("   4. Check /credits — PRC batches derived from attestations");
  console.log('   5. Go to /station/onboarding → "Sign in" → search "Alexandria"');
  console.log("      to load the demo station into localStorage");
  console.log("─".repeat(60));
}

seed().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
