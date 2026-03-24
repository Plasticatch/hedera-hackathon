# PlastiCatch — Judge Demo Script

> **Hackathon:** Hashgraph Online Bounty · Sustainability Track
> **Demo URL:** http://localhost:8082
> **Time:** ~8 minutes

---

## Pre-Demo Setup (2 minutes)

**Option A — Interactive wizard (recommended for first run):**
```bash
npm run setup
# Installs deps → validates .env → optionally deploys contracts → seeds data → starts server
```

**Option B — Manual:**
```bash
# 1. Install dependencies (first time only)
npm install

# 2. Seed demo data into Supabase
node scripts/seed-demo.mjs

# 3. Start dev server
npm run dev
# → opens on http://localhost:8082
```

Open 4 browser tabs:
- Tab 1: `http://localhost:8082` — Landing
- Tab 2: `http://localhost:8082/collector/onboarding` — Collector flow
- Tab 3: `http://localhost:8082/station/onboarding` — Station flow
- Tab 4: `http://localhost:8082/leaderboard` — Leaderboard
- Tab 5: `http://localhost:8082/credits` — PRC Marketplace

Clear localStorage before starting: DevTools → Application → Local Storage → Clear All

---

## Scene 1 — The Problem & Landing Page (90 sec)

**URL:** `/`

**Script:**
> "Over 11 million tonnes of plastic enter our oceans every year. The biggest reason? There's no economic incentive to clean it up. PlastiCatch fixes the incentive with blockchain-verified Plastic Recovery Credits — every kilogram collected on-chain, every collector paid in seconds."

**Show:**
- Hero section with the animated heading
- Scroll slowly through the value props — "Collectors earn HBAR", "Stations attest", "Corporates offset"
- Point out the live stats counter on the landing page (total kg, collectors, stations)
- Click "Join as Collector" in the navbar to navigate to onboarding

---

## Scene 2 — Collector Onboarding (90 sec)

**URL:** `/collector/onboarding`

**Script:**
> "Signing up as a collector takes 2 minutes and requires no bank account, no app download. Just a phone and access to a nearby weighing station."

**Show:**
1. Step 1 — Enter name "**Demo Collector**", select zone **MEDITERRANEAN_NORTH**
2. Click **"Create Wallet & Continue"**
3. Step 2 — Show the Hedera Account ID being generated, point to "0.3 HBAR onboarding credit"
   > "A Hedera testnet wallet is created automatically. No seed phrase. No extension. We abstract the blockchain entirely."
4. Click **Continue**
5. Step 3 — "You're all set!" summary screen
6. Click **"Start Collecting"** → arrives at Collector Dashboard

---

## Scene 3 — Station Submits a Recovery (2 min)

**URL:** `/station/onboarding` → then `/station/submit`

**Script:**
> "Now let's switch to the station operator side. A collector arrives at an approved weighing station with bags of ocean plastic. The station operator records the recovery and it goes straight to the blockchain."

**Show (sign in as demo station):**
1. Go to `/station/onboarding`
2. Click **"Sign in to existing station"**
3. Type **"Alexandria"** → click Search
4. Click **"Alexandria Port Collection Hub"** — loads station into localStorage
5. Navigate to `/station/submit`
6. Enter collector Hedera ID: `0.0.8201010` (Amara Diallo — top collector)
7. Add plastic items:
   - **PET Bottles** · 12 kg
   - **Fishing Gear** · 5 kg
8. Show payout calculation: ~6.55 HBAR
9. Click **Submit Recovery**
10. Navigate to `/station` — show the new submission in today's table with `verified` status

> "The attestation is saved as **verified** and the payout is calculated instantly. In production this triggers a real Hedera HCS message that any auditor can verify independently."

---

## Scene 4 — PRC Marketplace (90 sec)

**URL:** `/credits`

**Script:**
> "Every verified kilogram of plastic becomes a Plastic Recovery Credit — a tokenised, auditable proof of impact. Corporations buy these to offset their plastic footprint with provably real-world data."

**Show:**
1. Batch grid is populated (from seed data) — show zone + type labels
2. Use the **Zone filter** → select PACIFIC_PHILIPPINES → grid filters
3. Clear filter → click a batch card
4. Enter quantity **50** → show "Total: XX HBAR"
5. Click **Confirm Purchase** → success toast
   > "The retirement is anchored to Supabase with a reference hash — in production this also goes to Hedera HCS for immutable proof."
6. Scroll down to the footer CTA

---

## Scene 5 — Leaderboard (60 sec)

**URL:** `/leaderboard`

**Script:**
> "Transparency breeds trust — and competition. The public leaderboard ranks collectors by verified kilograms recovered. Top performers earn reputation tiers, bonus HBAR rates, and recognition."

**Show:**
1. Leaderboard loads with 6 ranked collectors (seeded)
2. Point to top collector: **Amara Diallo · 847 kg · Champion tier**
3. Use the Zone filter → PACIFIC_PHILIPPINES
4. Point to the banner CTA at top and bottom

---

## Scene 6 — Architecture & Close (60 sec)

**Script:**
> "Under the hood: collectors and stations are registered on Hedera Testnet with unique HTS account IDs. Every recovery is an HCS message — immutable, timestamped, publicly queryable. PRCs are HTS tokens. The entire chain of custody from beach to boardroom is on-chain."

**Show:**
- Return to Landing page
- Point to the "How it works" section
- End on the footer: **"The ocean won't clean itself. Fix the incentive."**

---

## Live Data Reset

To start fresh before a new demo recording:

```bash
# Wipe seeded data and re-seed
node scripts/seed-demo.mjs --clear

# Clear localStorage in browser
# DevTools → Application → Local Storage → Clear All
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Leaderboard empty | Run `node scripts/seed-demo.mjs` |
| PRC marketplace empty | Need verified attestations — seed script adds them |
| Station sign-in not finding "Alexandria" | Run `node scripts/seed-demo.mjs` — station must exist in DB |
| Supabase errors in console | Check `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_SERVICE_ROLE_KEY` |
| Dev server port taken | Vite auto-increments — check terminal output for actual port |

---

## Key Technical Highlights for Judges

- **Hedera HCS** — Every attestation is an immutable Consensus Service message
- **Hedera HTS** — PRCs are real tokens; collector wallets are real testnet accounts (mocked in demo for speed)
- **Supabase + React Query** — Real-time data, no page refresh needed
- **Zero wallet extension** — Collectors onboard without MetaMask/HashPack
- **Provably auditable** — Any PRC can be traced back to a specific station, collector, date, and weight
