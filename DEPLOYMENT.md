# PlastiCatch --- Deployment Guide

Complete guide for setting up and deploying PlastiCatch from scratch on Hedera testnet.

---

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18+ | Required for Vite dev server and scripts |
| npm or Bun | npm 9+ / Bun 1+ | Package manager |
| Hedera Testnet Account | --- | Create at [portal.hedera.com](https://portal.hedera.com) |
| Supabase Project | --- | Create at [supabase.com](https://supabase.com) |
| Git | 2.30+ | For cloning the repository |
| Modern Browser | Chrome, Firefox, or Edge | For running the PWA |

---

## 2. Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd plasticatch-main

# Install frontend and script dependencies
npm install

# Install smart contract dependencies
cd contracts
npm install
cd ..
```

---

## 3. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Your `.env` file should contain:

```env
# ─── Supabase ────────────────────────────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Hedera ──────────────────────────────────────────────────────────────────
VITE_HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.XXXXX
HEDERA_OPERATOR_KEY=302e...

# ─── HCS Topic IDs (created by init:hedera) ──────────────────────────────────
VITE_ATTESTATION_TOPIC_ID=0.0.XXXXX
VITE_DID_TOPIC_ID=0.0.XXXXX

# ─── Protocol Accounts (created by init:hedera) ──────────────────────────────
VITE_PAYMENT_POOL_ACCOUNT=0.0.XXXXX

# ─── Recovery Agent ──────────────────────────────────────────────────────────
RECOVERY_AGENT_ZONES=MEDITERRANEAN_NORTH,ARABIAN_GULF,PACIFIC_PHILIPPINES
AGENT_PROCESSING_INTERVAL=10000
```

> **Important:** Never commit `.env` with real credentials. The `.env.example` file is safe to commit.

---

## 4. Hedera Testnet Setup

### 4.1 Create a Hedera Testnet Account

1. Go to [portal.hedera.com](https://portal.hedera.com) and create an account.
2. Navigate to the testnet section and create a new testnet account.
3. Note your **Account ID** (e.g., `0.0.12345`) and **Private Key** (DER-encoded hex string starting with `302e`).
4. Fund the account with testnet HBAR using the portal faucet.
5. Set `HEDERA_OPERATOR_ID` and `HEDERA_OPERATOR_KEY` in your `.env`.

### 4.2 Initialize HCS Topics, Tokens, and Accounts

The init script creates all required Hedera resources:

```bash
npm run init:hedera
```

This script will:

- Create the **Attestation Topic** (HCS) for recovery attestations, PRC minting events, retirements, and demand signals.
- Create the **DID Topic** (HCS) for collector and station DID document anchoring.
- Create protocol accounts (e.g., the payment pool account).
- Output the Topic IDs and Account IDs to the console.

After running, update your `.env` with the generated values:

```env
VITE_ATTESTATION_TOPIC_ID=0.0.<generated>
VITE_DID_TOPIC_ID=0.0.<generated>
VITE_PAYMENT_POOL_ACCOUNT=0.0.<generated>
```

---

## 5. Smart Contract Deployment

Deploy all six Solidity contracts to Hedera EVM testnet:

```bash
npm run deploy:contracts
```

This runs Hardhat's deploy script against the `hederaTestnet` network, deploying:

| Contract | Purpose |
|---|---|
| `CollectorRegistry.sol` | Registers collectors with anti-Sybil identity verification |
| `StationRegistry.sol` | Registers weighing stations with stake bond management |
| `PRCToken.sol` | Plastic Recovery Credit token (HTS fungible, 1 PRC = 1 kg) |
| `CorporateVault.sol` | Holds corporate HBAR deposits for PRC purchases and retirements |
| `CleanupEventPool.sol` | Manages corporate-sponsored cleanup event prize pools |
| `ReputationOracle.sol` | Tracks collector reputation tiers and payout multipliers |

The deployed contract addresses will be output to the console. If the deployment script writes them to a config file, they will be picked up automatically. Otherwise, note them for reference.

---

## 6. Supabase Setup

### 6.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note the **Project URL** and **Anon (public) Key** from Settings > API.
3. Note the **Service Role Key** from Settings > API (keep this secret).
4. Set these values in your `.env`.

### 6.2 Apply Database Migrations

```bash
# Option A: Using the Supabase CLI
npx supabase db push

# Option B: Via the Supabase Dashboard
# Go to SQL Editor and run each migration file from supabase/migrations/ in order
```

### 6.3 Deploy Edge Functions (if applicable)

```bash
npx supabase functions deploy
```

### 6.4 Verify Database

After migrations, your Supabase database should contain tables for collectors, stations, attestations, PRC records, and events. Check the Table Editor in the Supabase dashboard to confirm.

---

## 7. Fund the Payment Pool

The payment pool is the Hedera account that sends HBAR to collectors via Scheduled Transactions. Fund it with testnet HBAR:

```bash
npm run fund:pool
```

This transfers HBAR from your operator account to the payment pool account. Make sure your operator account has sufficient testnet HBAR.

---

## 8. Seed Test Data (Optional)

Populate the database with sample collectors, stations, and attestations for testing:

```bash
npm run seed:data
```

---

## 9. Run the Application

```bash
# Development server
npm run dev
```

The app starts at `http://localhost:5173`.

### Start Recovery Agents (Optional)

To run the autonomous Recovery Agents for attestation verification and payment processing:

```bash
npm run start:agents
```

### All-in-One Setup

Run all setup steps sequentially:

```bash
npm run setup:all
```

This runs: `init:hedera` -> `deploy:contracts` -> `fund:pool` -> `seed:data`.

---

## 10. Verify Deployment

After setup, verify that everything is working:

| Check | How |
|---|---|
| App loads | Navigate to `http://localhost:5173`. Landing page should render with hero section and Connect Wallet button. |
| Supabase connected | Open browser DevTools console. No Supabase connection errors. |
| Hedera topics active | Use [HashScan](https://hashscan.io/testnet) to verify your topic IDs exist. |
| Contracts deployed | Use [HashScan](https://hashscan.io/testnet) to verify contract addresses are live. |
| Collector onboarding | Navigate to collector onboarding. Complete the flow. Confirm the DID document is anchored to the DID topic on HashScan. |
| Station onboarding | Navigate to station onboarding. Complete the flow with a 500 HBAR stake. Confirm the station registration event on the attestation topic. |
| Recovery submission | Submit a test recovery from the station dashboard. Confirm attestation appears on HCS and payment is triggered. |
| PRC marketplace | Navigate to PRC purchase page. Confirm PRC listings load with provenance data. |

---

## 11. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anonymous (public) API key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side operations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same service role key for non-Vite scripts |
| `VITE_HEDERA_NETWORK` | Yes | Hedera network: `testnet` or `mainnet` |
| `HEDERA_OPERATOR_ID` | Yes | Hedera operator account ID (e.g., `0.0.12345`) |
| `HEDERA_OPERATOR_KEY` | Yes | Hedera operator private key (DER-encoded hex) |
| `VITE_ATTESTATION_TOPIC_ID` | Yes | HCS topic ID for attestations, minting events, retirements |
| `VITE_DID_TOPIC_ID` | Yes | HCS topic ID for DID document anchoring |
| `VITE_PAYMENT_POOL_ACCOUNT` | Yes | Hedera account ID for the collector payment pool |
| `RECOVERY_AGENT_ZONES` | No | Comma-separated zone codes for Recovery Agent |
| `AGENT_PROCESSING_INTERVAL` | No | Agent polling interval in ms (default: 10000) |
