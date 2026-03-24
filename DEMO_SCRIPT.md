# PlastiCatch — Demo Video Script

> **Format:** Screen recording with voiceover. Target length: **4–5 minutes.**
> **Prep:** Clear localStorage before starting. Have HashPack installed. Dev server running at http://localhost:8080.
> **Tip:** Use a clean browser profile, hide bookmarks bar, zoom browser to 90%.

---

## SCENE 1 — Landing Page Hero
**URL:** `http://localhost:8080`
**Duration:** ~30s

**Action:** Open the browser. Watch the preloader animate — "PlastiCatch" slides in.

> 🎙️ **Say:**
> "This is PlastiCatch — a protocol that pays coastal collectors in real-time cryptocurrency to clean the ocean. Every gram of plastic recovered is weighed, verified, and anchored on Hedera's Consensus Service as an immutable on-chain record."

**Action:** Let the hero section settle. Point to the stats bar at the bottom of the hero (14M+ tons, 0.3 HBAR per kg, 3s finality).

> 🎙️ **Say:**
> "14 million tons of plastic enter the ocean every year. We're building the financial infrastructure to reverse that — starting with the collectors on the ground."

---

## SCENE 2 — Scroll: Story Section
**Action:** Slowly scroll down past the hero. The animated word-by-word story section will play.

> 🎙️ **Say:**
> "The protocol is simple: a collector brings plastic to a verified weighing station. The station logs the recovery. An autonomous agent verifies it. The collector gets paid in HBAR — directly to their Hedera wallet."

---

## SCENE 3 — Scroll: Tech Section ("Built on verifiable infrastructure")
**Action:** Continue scrolling until the four tech cards appear around the Hedera logo center circle.

> 🎙️ **Say:**
> "We chose Hedera for three reasons: three-second deterministic finality, sub-cent transaction fees, and native token service. Every recovery attestation goes on-chain via HCS. Payouts use HTS. And our Recovery Agent runs autonomously on Hedera's consensus layer."

**Action:** Point to each of the 4 cards: HCS, Scheduled Tx, HTS Token, Agent Layer.

---

## SCENE 4 — Scroll: "The ocean can't wait" Section
**Action:** Keep scrolling to the full-width ocean image section.

> 🎙️ **Say:**
> "The ocean can't wait for slow, bureaucratic carbon credit systems. PlastiCatch settles in under 5 seconds — from plastic weighed to collector paid."

---

## SCENE 5 — Scroll: "Three journeys, one ecosystem"
**Action:** Scroll to the three journey cards: Collector, Station, Corporate.

> 🎙️ **Say:**
> "Three actors power the protocol. Collectors recover plastic and earn HBAR. Weighing stations verify and log recoveries. And corporate buyers purchase Plastic Recovery Credits to offset their environmental footprint — all on-chain, all auditable."

---

## SCENE 6 — Onboarding Role Selection
**Action:** Click **"Get Started"** in the Navbar (top right).
**URL:** `/onboarding`

> 🎙️ **Say:**
> "Let's walk through each role, starting with a collector joining the network."

**Action:** Point to the two cards — "Join as Collector" and "Register a Station."

---

## SCENE 7 — Collector Registration
**Action:** Click **"Join as Collector"**.
**URL:** `/collector/onboarding`

> 🎙️ **Say:**
> "A collector doesn't need a crypto wallet to get started. They just pick their operating zone and set a password. PlastiCatch creates a real Hedera account for them on the spot — fully sponsored."

**Action:**
1. Type a display name: `Maria Santos`
2. Select zone: `Pacific / Philippines`
3. Type password: `demo1234!` — confirm it
4. Click **"Create Wallet & Continue"**
5. Wait for the spinner — "Creating your wallet…"

> 🎙️ **Say:**
> "Under the hood, our edge function is calling Hedera's AccountCreateTransaction — creating a real testnet account and crediting it 0.3 HBAR as an onboarding bonus."

**Action:** When the account ID appears (e.g. `0.0.XXXXXXX`), point to it and to the amber private key card.

> 🎙️ **Say:**
> "The account is created. The private key is shown once — the collector copies it and keeps it safe. From this point, all payouts go directly to this Hedera account."

**Action:** Click **"Continue"** → then **"Start Collecting"**.

---

## SCENE 8 — Collector Dashboard
**URL:** `/collector`

> 🎙️ **Say:**
> "This is the collector dashboard. Right now it's empty — no submissions yet. That changes once a station logs a recovery."

**Action:** Point to the stats cards (total kg, HBAR earned, submissions).

---

## SCENE 9 — Station Sign-In (using demo station)
**Action:** Click the profile pill → "Sign Out". Then go to **Navbar → "Get Started"** → **"Register a Station"** or go directly to `/station/onboarding`.

> 🎙️ **Say:**
> "Now let's switch to the station operator view. We have a pre-registered demo station — the Alexandria Port Collection Hub."

**Action:**
1. Click **"Already registered? Sign in"**
2. Type `Alexandria` in the search box → click Search
3. Click **"Alexandria Port Collection Hub"** in results
4. Type password: `plasticatch2024`
5. Click **"Verify & Sign In"**

> 🎙️ **Say:**
> "The station password is verified on-chain using PostgreSQL's pgcrypto — bcrypt hashing, never plaintext. The session is set and we're in."

---

## SCENE 10 — Recovery Submission
**Action:** From the station dashboard, click **"New Submission"** or navigate to `/station/submit`.
**URL:** `/station/submit`

> 🎙️ **Say:**
> "A collector arrives at the station with plastic. The operator enters their Hedera account ID and weighs each plastic type."

**Action:**
1. Enter the collector account ID created in Scene 7 (e.g. `0.0.XXXXXXX`)
2. Add a plastic item: **PET Bottles** → `5.2` kg
3. Add another: **Fishing Gear** → `3.8` kg
4. Show the payout calculation updating live

> 🎙️ **Say:**
> "The payout calculates automatically — 0.4 HBAR per kilogram. Total: 9 kilograms, 3.6 HBAR to the collector."

**Action:** Click **"Submit Recovery"**.

> 🎙️ **Say:**
> "This triggers our verify-attestation edge function. It validates the submission, writes it to Supabase, and anchors the attestation to Hedera HCS — giving it a permanent, tamper-proof sequence number."

**Action:** Point to the success toast or the HCS sequence number if shown.

---

## SCENE 11 — Leaderboard
**Action:** Click **Navbar → "Leaderboard"**.
**URL:** `/leaderboard`

> 🎙️ **Say:**
> "Every verified recovery updates the global leaderboard. Collectors compete for reputation tiers — Bronze through Diamond — which unlock higher payout rates and priority access to cleanup events."

**Action:** Point to the ranked table, the medal icons for top 3, the tier badges, kg and HBAR columns.

> 🎙️ **Say:**
> "This isn't just gamification. Reputation is an on-chain signal — stations trust high-tier collectors more, and corporates can filter their credit purchases by collector reputation."

---

## SCENE 12 — Impact Agent
**Action:** Click **Navbar → "Impact Agent"**.
**URL:** `/impact-agent`

> 🎙️ **Say:**
> "This is where PlastiCatch goes beyond a simple payment app. The Impact Agent is an autonomous AI agent that communicates entirely over Hedera's Consensus Service — using the HCS-10 standard."

**Action:** Point to the agent identity card (operator ID, inbound topic, response topic — all with HashScan links).

> 🎙️ **Say:**
> "Corporate buyers and impact investors can query real-time data directly from the protocol — without trusting any API. The query goes on-chain. The answer comes back on-chain. Everything is independently verifiable."

**Action:**
1. Select query type: **Zone Summary**
2. Select zone: **Pacific / Philippines**
3. Click **"Send to Agent"**
4. Wait for the response card to appear

> 🎙️ **Say:**
> "The agent reads the inbound HCS topic, queries Supabase for aggregated data, and posts the response back to a response topic — with sequence numbers you can verify on HashScan right now."

**Action:** Point to the HCS sequence numbers and the HashScan links.

---

## SCENE 13 — Buy Credits (PRC Marketplace)
**Action:** Click **Navbar → "Buy Credits"**.
**URL:** `/credits`

> 🎙️ **Say:**
> "Finally, the demand side. Corporates browse Plastic Recovery Credits — each one backed by a verified, on-chain attestation. They see exactly which zone the plastic came from, what type it was, and which collector recovered it."

**Action:** Point to the PRC batch cards (zone, plastic type, price per PRC, available quantity).

> 🎙️ **Say:**
> "When a corporate buys and retires credits, that transaction is anchored to HCS as well. Their ESG report links directly to an immutable on-chain record — no greenwashing possible."

---

## SCENE 14 — Closing on Landing Page
**Action:** Navigate back to `/` and slowly scroll to the footer.

> 🎙️ **Say:**
> "PlastiCatch is a complete on-chain protocol for plastic recovery economics. Collectors earn. Stations verify. Corporates offset. And every event — from gram weighed to credit retired — lives permanently on Hedera."
>
> "The ocean can't wait. Neither can we."

**Action:** Let the footer CTA buttons sit on screen for a moment before ending.

---

## Recording Checklist

- [ ] Browser zoom: 90%, clean profile, bookmarks bar hidden
- [ ] LocalStorage cleared before starting (`F12 → Application → Local Storage → Clear All`)
- [ ] HashPack installed (for station registration demo if needed)
- [ ] Dev server running: `npm run dev` → `http://localhost:8080`
- [ ] Demo data seeded: `node scripts/seed-demo.mjs` (Alexandria + Manila stations with `plasticatch2024`)
- [ ] Keep a notepad with the collector account ID created in Scene 7 — you'll need it in Scene 10
- [ ] If doing station registration instead of sign-in: have HashPack open with a testnet account loaded

---

## Key Lines to Emphasize

| Moment | Key phrase |
|--------|-----------|
| Hero | *"Every gram of plastic recovered is anchored on Hedera"* |
| Collector wallet creation | *"A real Hedera account — created in 3 seconds, no seed phrases"* |
| Attestation submit | *"Anchored to HCS — permanently, tamper-proof"* |
| Impact Agent | *"Query goes on-chain. Answer comes back on-chain."* |
| PRC marketplace | *"No greenwashing possible"* |
| Closing | *"The ocean can't wait."* |
