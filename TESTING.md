# PlastiCatch — Testing Guide

> **How to use:** Work through each flow step by step. Compare what you see to the **Expected** column and note the result. Use ✅ pass / ❌ fail / ⚠️ partial plus a short comment.

---

## Environment Setup

Before testing, confirm:

- [ ] `npm install` run and `node_modules` present
- [ ] `.env` is present with real credentials
- [ ] `VITE_WALLETCONNECT_PROJECT_ID` set in `.env` (get a free project ID at https://cloud.walletconnect.com)
- [ ] Dev server running: `npm run dev` → open **http://localhost:8080**
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] LocalStorage cleared before each onboarding flow: DevTools → Application → Local Storage → Clear All
- [ ] **HashPack wallet extension installed** (required for Station onboarding — Chrome extension)

> **Collector flow:** No wallet extension needed. PlastiCatch creates a real Hedera account via sponsored AccountCreateTransaction.
> **Station flow:** Requires HashPack wallet extension and a Hedera testnet account with ≥ 500 HBAR.

## Demo Credentials (pre-seeded — no setup needed)

Use these to sign in immediately without registering:

### Station Sign-in
| Station | Search term | Password |
|---------|-------------|----------|
| Alexandria Port Collection Hub | `Alexandria` | `plasticatch2024` |
| Manila Bay Recycling Depot | `Manila` | `plasticatch2024` |

> Go to `/station/onboarding` → click **Sign In** tab → search for the station name → enter password.

### Collector Sign-in (pre-seeded, no password — view only via leaderboard)
These accounts exist in the leaderboard but were not registered with a password.
To test the full collector flow, register a new collector in Flow 3.

---

## Flow 1 — Landing Page & Navbar

**URL:** `/`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Open `/` | Preloader runs, then landing page appears with hero, Navbar | ✅  |
| 2 | Navbar links (desktop) | Shows **Leaderboard**, **Impact Agent**, **Buy Credits** — no "How it Works" or role links |✅  |
| 3 | **"Get Started" button** (Navbar) | Navigates to `/onboarding` role-selection page |✅  |
| 4 | Navbar "Buy Credits" | Navigates to `/credits` |✅  |
| 5 | Navbar "Leaderboard" | Navigates to `/leaderboard` |✅  |
| 6 | Navbar "Impact Agent" | Navigates to `/impact-agent` |✅  |
| 7 | Smooth scroll | Lenis smooth scroll active on landing page |✅  |
| 8 | Footer CTAs | "Join as Collector" → `/collector/onboarding`, "Register a Station" → `/station/onboarding`, "Buy Impact Credits" → `/credits` |✅  |

> **Feedback:** _____________________________________________________________

---

## Flow 2 — Onboarding Role Selection

**URL:** `/onboarding`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/onboarding` | Page shows two cards: "Join as Collector" and "Register a Station" |✅  |
| 2 | Click "Join as Collector" card | Navigates to `/collector/onboarding` | ✅ |
| 3 | Click "Register a Station" card | Navigates to `/station/onboarding` |✅  |
| 4 | Open `/onboarding` when already logged in as collector | Auto-redirects to `/collector` |✅  |
| 5 | "Collector sign-in" / "Station sign-in" links at bottom | Navigate to respective onboarding pages |✅  |

> **Feedback:** the 4th step is correct but but these also should navigate to /{USER_TYPE} Navigates to `/collector/onboarding` and `/station/onboarding`

---

## Flow 3 — Collector Onboarding (new registration)

**URL:** `/collector/onboarding`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/collector/onboarding` | Page loads with branded header, 3-step stepper, "Your Info" step active |✅ |
| 2 | Leave Zone empty → click "Create Wallet & Continue" | Red error: "Please select your operating zone" appears below select | |
| 3 | Enter optional display name, select a Zone | Zone dropdown shows all geographic zones | |
| 4 | Click "Create Wallet & Continue" | Step 2 "Wallet" opens; spinner shows "Creating your wallet…"; **edge function is called** | |
| 5 | Wallet creation completes | Real Hedera Account ID displayed (e.g. `0.0.XXXXXXX`); amber warning card shows **private key** with copy button ("shown once only") | |
| 6 | Check Supabase `collectors` table | Row inserted: `hedera_account_id`, `hedera_private_key`, `zone`, `status = "active"` | |
| 7 | Check HashScan | Account `0.0.XXXXXXX` exists on testnet with 0.3 HBAR initial balance | |
| 8 | Check localStorage | Key `plasticatch-collector` contains `id`, `hederaAccountId`, `zone`, `displayName` | |
| 9 | Navbar updates | Profile pill shows `● 0.0.XXXXXXX ▾` (green dot, monospace ID, chevron) | |
| 10 | Click "Continue" | Step 3 "Done" shows zone, wallet ID, 0.3 HBAR credit | |
| 11 | Click "Start Collecting" | Navigates to `/collector` dashboard | |

> **Feedback:** _____________________________________________________________

---

## Flow 4 — Collector Sign-In (returning user)

**URL:** `/collector/onboarding`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/collector/onboarding` (localStorage cleared) | Onboarding page loads | |
| 2 | Click "Already registered? Sign in" at the bottom | Sign-in panel slides open with Account ID + password inputs | |
| 3 | Enter a valid Hedera Account ID (e.g. `0.0.XXXXXXX`) | Input accepts the ID | |
| 4 | Enter the password set during registration | Password field visible with show/hide toggle | |
| 5 | Click "Sign In" | `verify_collector_signin` RPC called; localStorage set; redirects to `/collector` | |
| 6 | Enter correct account ID but wrong password → "Sign In" | Error: "Invalid account ID or password" | |
| 7 | Enter unknown account ID → "Sign In" | Error: "Invalid account ID or password" | |

> **Feedback:** _____________________________________________________________

---

## Flow 5 — Collector Dashboard

**URL:** `/collector` (requires `plasticatch-collector` in localStorage)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/collector` without localStorage | RoleGuard redirects to `/collector/onboarding` | |
| 2 | After onboarding, navigate to `/collector` | Dashboard loads with compact header (no full Navbar) | |
| 3 | Compact header | Shows PlastiCatch logo + profile pill with Account ID; clicking pill opens dropdown | |
| 4 | Profile dropdown | Shows "Collector Dashboard" link + "Sign Out" | |
| 5 | Click "Sign Out" | localStorage cleared, redirects to `/`; Navbar shows "Get Started" again | |
| 6 | Stats cards | Show total kg recovered, HBAR earned, submission count | |
| 7 | Submissions table | Empty state for new collector; rows appear after a station submits attestation | |

> **Feedback:** _____________________________________________________________

---

## Flow 6 — Station Onboarding (new registration)

**URL:** `/station/onboarding`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/station/onboarding` | Page loads with branded header, 3-step stepper, "Facility Info" step active | |
| 2 | **Wallet connection card** at the top | Card shows "Connect your Hedera wallet" with "Connect HashPack" button | |
| 3 | Click "Connect HashPack" **without** `VITE_WALLETCONNECT_PROJECT_ID` set | Error message shown: needs WalletConnect project ID | |
| 4 | Set `VITE_WALLETCONNECT_PROJECT_ID` in `.env`, restart dev server | | |
| 5 | Click "Connect HashPack" | HashPack pairing modal opens (or QR code shown) | |
| 6 | Approve in HashPack | Wallet card changes to "✓ Wallet connected — 0.0.XXXXXXX [Disconnect]" | |
| 7 | Facility form is now visible | Fill: Facility Name, Zone, Facility Type (all required) | |
| 8 | Leave Facility Name empty → click Continue | Red error below Facility Name field | |
| 9 | Fill all fields → click Continue | Advances to Step 2 "Stake Deposit" | |
| 10 | Step 2 shows 500 HBAR stake info | Bullet points, "Register Station" button | |
| 11 | Click "Register Station" | Spinner; Supabase `weighing_stations` row inserted; localStorage `plasticatch-station` set | |
| 12 | Step 3 "Done" | Shows facility name, zone, accepted types, Hedera Account ID | |
| 13 | Click "Go to Station Dashboard" | Navigates to `/station` | |

> **Feedback:** _____________________________________________________________

---

## Flow 7 — Station Sign-In (demo credentials)

**URL:** `/station/onboarding`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Click "Already registered? Sign in" | Search box appears | |
| 2 | Type `Alexandria` → click Search | "Alexandria Port Collection Hub" result appears | |
| 3 | Click the result | Password prompt appears inline below the result | |
| 4 | Enter `plasticatch2024` → click "Verify & Sign In" | `verify_station_signin` RPC called; localStorage `plasticatch-station` set; redirects to `/station` | |
| 5 | Enter wrong password → "Verify & Sign In" | Error: "Incorrect password" shown inline | |
| 6 | Repeat with `Manila` for second demo station | Same flow works for Manila Bay Recycling Depot | |

> **Feedback:** _____________________________________________________________

---

## Flow 8 — Recovery Submission

**URL:** `/station/submit` (requires `plasticatch-station` in localStorage)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate without station localStorage | RoleGuard redirects to `/station/onboarding` | |
| 2 | Navigate to `/station/submit` as station | Submission form loads | |
| 3 | Enter a valid collector Hedera Account ID | Collector info shown (name, zone) if found | |
| 4 | Add plastic items with weights | Payout calculates per item and in total | |
| 5 | Submit attestation | Supabase `attestations` row inserted; `status = "verified"` or `"pending"` | |
| 6 | If HCS configured: check `hcs_sequence_number` in attestations row | Sequence number populated (attestation anchored on-chain) | |
| 7 | Navigate to `/station` dashboard | New submission appears | |

> **Feedback:** _____________________________________________________________

---

## Flow 9 — Station Dashboard

**URL:** `/station` (requires `plasticatch-station` in localStorage)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/station` | Dashboard loads with compact header | |
| 2 | Stats cards | Daily kg volume, collectors served, stake amount | |
| 3 | Submissions table | Today's attestations with status badges | |
| 4 | "New Submission" CTA | Navigates to `/station/submit` | |
| 5 | Profile pill → Sign Out | Clears localStorage, redirects to `/` | |

> **Feedback:** _____________________________________________________________

---

## Flow 10 — PRC Marketplace

**URL:** `/credits`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/credits` | Marketplace page loads with full Navbar | |
| 2 | No batches | "No PRCs currently available" empty state | |
| 3 | After submitting a verified recovery | Attestation appears as a PRC batch | |
| 4 | Zone / Type filters | Filter batch grid | |
| 5 | Click a batch → quantity input | Total HBAR = qty × pricePerPrc | |
| 6 | Click "Confirm Purchase" | `prc_retirements` row inserted; success toast | |

> **Feedback:** _____________________________________________________________

---

## Flow 11 — Leaderboard

**URL:** `/leaderboard`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/leaderboard` | Page loads, Navbar visible | |
| 2 | Empty state | "No collectors yet." with CTA | |
| 3 | After collector + recovery | Collector appears in ranked table | |
| 4 | Zone filter | Filters table by zone | |
| 5 | Table columns | Rank (medal top 3), Name, Zone, Tier badge, kg, HBAR | |

> **Feedback:** _____________________________________________________________

---

## Flow 12 — Impact Agent (HCS-10)

**URL:** `/impact-agent`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Navigate to `/impact-agent` | Page loads with agent identity card and query panel | |
| 2 | Agent identity card | Shows operator account ID, inbound topic, response topic (HashScan links); "Online" badge | |
| 3 | Topics not configured | Topics show "Not configured" if `VITE_IMPACT_AGENT_INBOUND_TOPIC` empty | |
| 4 | Configure topics: run `node scripts/init-hedera.js` | Output shows two new topic IDs; copy to `.env` | |
| 5 | Select "Zone Summary" query, pick a zone, click "Send to Agent" | Loading spinner; response card appears | |
| 6 | Response card | Shows HCS sequence numbers with HashScan links; zone stats (total kg, collectors, stations) | |
| 7 | Select "Plastic Breakdown" | Shows plastic type breakdown with percentage bars | |
| 8 | Select "PRC Provenance" | Enter an attestation ID; shows verification result | |
| 9 | Select "Network Stats" | Shows global network stats + data integrity score | |
| 10 | Conversation history | Previous queries listed in accordion at bottom | |

> **Feedback:** _____________________________________________________________

---

## General UI Checks

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | Navbar on public pages | "Leaderboard", "Impact Agent", "Buy Credits" links; "Get Started" CTA | |
| 2 | Navbar when logged in | Profile pill replaces "Get Started" button | |
| 3 | Dashboard header | Compact sticky header — no full Navbar; profile pill with dropdown | |
| 4 | Onboarding pages | Mouse/trackpad scroll works throughout (not locked) | |
| 5 | Dropdown/Select highlight | Focused item is teal (`#90E0EF`), not orange | |
| 6 | Primary buttons | All CTAs use `bg-[#90E0EF] text-[#0A3D55]` brand color | |
| 7 | Fonts | Headings use SUSE; body uses Host Grotesk | |
| 8 | Mobile (375px) | All pages usable; no horizontal overflow | |
| 9 | Console errors | No uncaught React errors, no failed Supabase requests, no React Router warnings | |

---

## WalletConnect Setup (required for Station onboarding)

1. Go to [https://cloud.walletconnect.com](https://cloud.walletconnect.com) and sign in (free)
2. Create a new project → copy the **Project ID**
3. Add to `.env`: `VITE_WALLETCONNECT_PROJECT_ID=<your-project-id>`
4. Restart the dev server (`npm run dev`)
5. Station onboarding wallet connect should now work

---

## Impact Agent Setup (required for Flow 12)

```bash
# Create the two HCS-10 agent topics
node scripts/init-hedera.js

# Copy the printed VITE_IMPACT_AGENT_INBOUND_TOPIC and VITE_IMPACT_AGENT_RESPONSE_TOPIC
# values into .env, then:

# Deploy the edge functions
supabase functions deploy submit-impact-query
supabase functions deploy impact-agent

# Push database migration (agent_conversations table)
supabase db push
```

---

## Priority Fixes

> 1.
> 2.
> 3.

## Nice-to-Have

> 1.
> 2.
> 3.
