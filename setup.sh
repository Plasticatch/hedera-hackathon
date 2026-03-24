#!/bin/bash
# ============================================================
# PlastiCatch — Automated Setup Script
# Ocean Plastic Recovery Marketplace on Hedera
# ============================================================
set -e

echo "============================================"
echo "  PlastiCatch — Automated Setup"
echo "  Ocean Plastic Recovery on Hedera"
echo "============================================"
echo ""

# ── Step 1: Install dependencies ──────────────────────────────
echo "[1/7] Installing dependencies..."
npm install
if [ -d "contracts" ] && [ -f "contracts/package.json" ]; then
  echo "  Installing contract dependencies..."
  cd contracts && npm install && cd ..
fi
echo "  All dependencies installed."
echo ""

# ── Step 2: Create .env from .env.example ─────────────────────
if [ ! -f .env ]; then
  echo "[2/7] Creating .env from .env.example..."
  cp .env.example .env
  echo "  .env created from template."
else
  echo "[2/7] .env already exists, skipping."
fi
echo ""

# ── Step 3: Configure Hedera credentials ──────────────────────
echo "[3/7] Checking Hedera configuration..."

OPERATOR_ID=$(grep "^HEDERA_OPERATOR_ID" .env | cut -d'=' -f2)
if [ "$OPERATOR_ID" = "0.0.XXXXX" ] || [ -z "$OPERATOR_ID" ]; then
  echo ""
  echo "  Hedera testnet credentials needed."
  echo "  Create a free account at: https://portal.hedera.com"
  echo ""
  read -p "  Enter Hedera Operator ID (e.g., 0.0.12345): " INPUT_OPERATOR_ID
  read -p "  Enter Hedera Operator Key (DER hex): " INPUT_OPERATOR_KEY

  if [ -n "$INPUT_OPERATOR_ID" ]; then
    sed -i "s|^HEDERA_OPERATOR_ID=.*|HEDERA_OPERATOR_ID=$INPUT_OPERATOR_ID|" .env
    sed -i "s|^VITE_HEDERA_OPERATOR_ID=.*|VITE_HEDERA_OPERATOR_ID=$INPUT_OPERATOR_ID|" .env 2>/dev/null || true
  fi
  if [ -n "$INPUT_OPERATOR_KEY" ]; then
    sed -i "s|^HEDERA_OPERATOR_KEY=.*|HEDERA_OPERATOR_KEY=$INPUT_OPERATOR_KEY|" .env
    sed -i "s|^VITE_HEDERA_OPERATOR_KEY=.*|VITE_HEDERA_OPERATOR_KEY=$INPUT_OPERATOR_KEY|" .env 2>/dev/null || true
  fi
  echo "  Credentials saved to .env"
else
  echo "  Hedera credentials already configured."
fi
echo ""

# ── Step 4: Initialize Hedera (HCS topics + protocol accounts) ─
echo "[4/7] Initializing Hedera (HCS topics + protocol accounts)..."
TOPIC_ID=$(grep "^VITE_ATTESTATION_TOPIC_ID" .env | cut -d'=' -f2)
if [ "$TOPIC_ID" = "0.0.XXXXX" ] || [ -z "$TOPIC_ID" ]; then
  if [ -f "scripts/init-hedera.js" ]; then
    node scripts/init-hedera.js 2>&1 | tee init-hedera-output.log

    # Parse output and update .env
    if grep -q "VITE_ATTESTATION_TOPIC_ID=" init-hedera-output.log; then
      echo "  Merging Hedera init output into .env..."
      grep "^VITE_" init-hedera-output.log | while IFS='=' read -r key value; do
        if [ -n "$key" ] && [ -n "$value" ]; then
          sed -i "s|^${key}=.*|${key}=${value}|" .env
        fi
      done
      echo "  HCS topics and protocol accounts configured."
    fi
  else
    echo "  WARNING: init-hedera.js not found. Skipping."
  fi
else
  echo "  HCS topics already configured, skipping."
fi
echo ""

# ── Step 5: Deploy smart contracts ────────────────────────────
echo "[5/7] Deploying smart contracts to Hedera testnet..."
if [ -d "contracts" ] && [ -f "contracts/scripts/deploy.js" ]; then
  cd contracts
  npx hardhat compile 2>&1
  npx hardhat run scripts/deploy.js --network hederaTestnet 2>&1 | tee ../deploy-output.log
  cd ..
  echo "  Contracts deployed. Check deploy-output.log for addresses."
else
  echo "  No contract deployment script found, skipping."
fi
echo ""

# ── Step 6: Fund payment pool & seed test data ────────────────
echo "[6/7] Funding payment pool and seeding test data..."
if [ -f "scripts/fund-payment-pool.js" ]; then
  node scripts/fund-payment-pool.js 2>&1 || echo "  Payment pool funding skipped (may need VITE_PAYMENT_POOL_ACCOUNT set)."
fi
if [ -f "scripts/seed-test-data.js" ]; then
  node scripts/seed-test-data.js 2>&1 || echo "  Test data seeding skipped (may need Supabase credentials)."
fi
echo ""

# ── Step 7: Done ─────────────────────────────────────────────
echo "[7/7] Setup complete!"
echo ""
echo "============================================"
echo "  PlastiCatch is ready!"
echo ""
echo "  Start development server:"
echo "    npm run dev"
echo ""
echo "  Open in browser:"
echo "    http://localhost:5173"
echo ""
echo "  Alternative — run full setup in one command:"
echo "    npm run setup:all"
echo "============================================"
