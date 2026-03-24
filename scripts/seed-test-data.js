#!/usr/bin/env node
/**
 * scripts/seed-test-data.js
 * PlastiCatch — Seed Supabase with Test Data
 *
 * Inserts realistic test data into all required tables so the UI flows work
 * without error from the very first run.
 *
 * Run: node scripts/seed-test-data.js
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("❌  VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
    process.exit(1);
}

// Use service role to bypass RLS for seeding
const supabase = createClient(supabaseUrl, serviceKey);

// ── IDs ───────────────────────────────────────────────────────────────────────
const COLLECTOR_1_ID = uuidv4();
const COLLECTOR_2_ID = uuidv4();
const STATION_1_ID = uuidv4();
const STATION_2_ID = uuidv4();
const CORP_BUYER_1_ID = uuidv4();
const ATTESTATION_1_ID = uuidv4();
const ATTESTATION_2_ID = uuidv4();
const EVENT_1_ID = uuidv4();
const DISPUTE_1_ID = uuidv4();

async function upsert(table, rows, conflictCol = "id") {
    const { error } = await supabase
        .from(table)
        .upsert(rows, { onConflict: conflictCol, ignoreDuplicates: true });
    if (error) {
        console.error(`  ❌  ${table}:`, error.message);
    } else {
        console.log(`  ✅  ${table}: ${rows.length} row(s) seeded`);
    }
}

// Create mock users in auth.users first to satisfy foreign keys
async function createAuthUser(id, email) {
    const { error } = await supabase.auth.admin.createUser({
        id,
        email,
        password: 'password123',
        email_confirm: true
    });
    if (error && !error.message.includes('already exists')) {
        console.error(`  ⚠️  auth.users error for ${email}:`, error.message);
        // It might fail if we already created it, so we proceed anyway
    }
}

async function main() {
    console.log("🌱  PlastiCatch — Seeding Test Data\n");

    const USER_COLLECTOR_1 = "11111111-1111-4111-a111-111111111111";
    const USER_COLLECTOR_2 = "22222222-2222-4222-a222-222222222222";
    const USER_STATION_1 = "33333333-3333-4333-a333-333333333333";
    const USER_STATION_2 = "44444444-4444-4444-a444-444444444444";
    const USER_BUYER_1 = "55555555-5555-4555-a555-555555555555";

    await createAuthUser(USER_COLLECTOR_1, 'v2_collector1@test.com');
    await createAuthUser(USER_COLLECTOR_2, 'v2_collector2@test.com');
    await createAuthUser(USER_STATION_1, 'v2_station1@test.com');
    await createAuthUser(USER_STATION_2, 'v2_station2@test.com');
    await createAuthUser(USER_BUYER_1, 'v2_buyer1@test.com');

    // ── 1. Collectors ─────────────────────────────────────────────────────────
    await upsert("collectors", [
        {
            id: COLLECTOR_1_ID,
            user_id: USER_COLLECTOR_1,
            hedera_account_id: "0.0.1000001",
            phone_hash: "v2_test_phone_hash_collector_1",
            display_name: "Ahmed Al-Rashid",
            zone: "Mediterranean North",
            reputation_score: 320,
            reputation_tier: 2,
            total_kg_recovered: 520,
            total_hbar_earned: 18.2, // NUMERIC(12,4)
            unique_stations: 3,
            days_active: 98,
            status: "active",
        },
        {
            id: COLLECTOR_2_ID,
            user_id: USER_COLLECTOR_2,
            hedera_account_id: "0.0.1000002",
            phone_hash: "v2_test_phone_hash_collector_2",
            display_name: "Maria Santos",
            zone: "Pacific Philippines",
            reputation_score: 80,
            reputation_tier: 1,
            total_kg_recovered: 112,
            total_hbar_earned: 3.92,
            unique_stations: 1,
            days_active: 35,
            status: "active",
        },
    ]);

    // ── 2. Weighing Stations ──────────────────────────────────────────────────
    await upsert("weighing_stations", [
        {
            id: STATION_1_ID,
            user_id: USER_STATION_1,
            hedera_account_id: "0.0.1000003",
            facility_name: "Alexandria Port Main",
            zone: "Mediterranean North",
            gps_lat: 31.2001,
            gps_lon: 29.9187,
            facility_type: "port",
            accepted_types: ["PET_BOTTLES", "FISHING_GEAR", "FILM_PLASTIC", "MIXED_HARD"],
            stake_amount: 500, // NUMERIC(12,4)
            stake_status: "active",
            calibration_cert_hash: "sha256:test_cert_hash_station_1",
            calibration_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active",
            physical_address: "Alexandria Port Main St",
        },
        {
            id: STATION_2_ID,
            user_id: USER_STATION_2,
            hedera_account_id: "0.0.1000004",
            facility_name: "Manila Bay Recycling Hub",
            zone: "Pacific Philippines",
            gps_lat: 14.5995,
            gps_lon: 120.9842,
            facility_type: "recycling",
            accepted_types: ["PET_BOTTLES", "HDPE_RIGID", "FILM_PLASTIC", "FOAM_EPS", "MICROPLASTIC_BAG"],
            stake_amount: 500,
            stake_status: "active",
            calibration_cert_hash: "sha256:test_cert_hash_station_2",
            calibration_expiry: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active",
            physical_address: "Manila Bay St",
        },
    ]);

    // ── 3. Corporate Buyers ───────────────────────────────────────────────────
    await upsert("corporate_buyers", [
        {
            id: CORP_BUYER_1_ID,
            user_id: USER_BUYER_1,
            hedera_account_id: "0.0.1000005",
            company_name: "Acme Beverages Ltd",
            industry: "Food & Beverage",
            contact_email: "sustainability@acme.example.com",
            registration_number: "UK-12345",
            total_prcs_owned: 1800,
            total_prcs_retired: 3200,
            total_hbar_spent: 55, // NUMERIC(12,4)
            status: "active",
        },
    ]);

    // ── 4. Attestations ───────────────────────────────────────────────────────
    await upsert("attestations", [
        {
            id: ATTESTATION_1_ID,
            collector_id: COLLECTOR_1_ID,
            station_id: STATION_1_ID,
            zone: "Mediterranean North",
            plastic_items: [
                { type: "FISHING_GEAR", weight_grams: 8200 },
                { type: "PET_BOTTLES", weight_grams: 3100 },
            ],
            total_weight_grams: 11300,
            payout_tinybar: 627990000, // ~6.28 HBAR
            payout_hbar: 6.2799,
            photo_hash: "sha256:test_photo_hash_attestation_1",
            hcs_sequence_number: 1001,
            status: "verified",
            station_nonce: 42,
        },
        {
            id: ATTESTATION_2_ID,
            collector_id: COLLECTOR_2_ID,
            station_id: STATION_2_ID,
            zone: "Pacific Philippines",
            plastic_items: [
                { type: "PET_BOTTLES", weight_grams: 5000 },
                { type: "FILM_PLASTIC", weight_grams: 2500 },
            ],
            total_weight_grams: 7500,
            photo_hash: null,
            payout_tinybar: 250000000, // ~2.5 HBAR
            payout_hbar: 2.50,
            hcs_sequence_number: 1002,
            status: "verified",
            station_nonce: 18,
        },
    ]);

    // ── 5. PRC Retirements ────────────────────────────────────────────────────
    await upsert("prc_retirements", [
        {
            id: uuidv4(),
            buyer_user_id: USER_BUYER_1, // Fix: MUST use the created auth.user id
            company_name: "Acme Beverages Ltd",
            report_ref: "Acme-ESG-2025-Q4",
            prcs_retired: 3200,
            cert_token_id: "PC-2025-CORP-0001",
            provenance_summary: {
                total_kg: 3200,
                by_type: {
                    PET_BOTTLES: 2100,
                    FISHING_GEAR: 700,
                    FILM_PLASTIC: 400,
                }
            },
            hcs_retirement_sequence: 2001,
        },
    ]);

    // ── 6. Cleanup Events ─────────────────────────────────────────────────────
    await upsert("cleanup_events", [
        {
            id: EVENT_1_ID,
            name: "Mediterranean Spring Cleanup 2026",
            organizer_user_id: USER_COLLECTOR_1, // Fix: MUST use the created auth.user id
            zones: ["Mediterranean North", "Mediterranean South"],
            start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            sponsor_name: "Acme Beverages Ltd",
            pool_amount: 200,
            multiplier: 1.25,
            target_kg: 5000,
            description: "Annual Mediterranean cleanup event",
            total_kg_collected: 0,
            collectors_participating: 0,
            status: "active",
        },
    ]);

    // ── 7. Disputes ───────────────────────────────────────────────────────────
    await upsert("disputes", [
        {
            id: DISPUTE_1_ID,
            attestation_id: ATTESTATION_1_ID,
            dispute_type: "WEIGHT_MISMATCH",
            initiator: "Ahmed Al-Rashid",
            description: "Weight recorded as 11.3kg but collector estimated 14kg at delivery",
            status: "open",
        },
    ]);

    // ── 8. Demand Signals ─────────────────────────────────────────────────────
    await upsert("demand_signals", [
        {
            id: uuidv4(),
            zone: "Mediterranean North",
            bonus_percentage: 10,
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            inventory_level: 3821,
            triggered_by: "agent",
            status: "active",
        },
    ]);

    console.log("\n🎉  Test data seeded successfully!");
    console.log("    You can now run the dev server: npm run dev");
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
