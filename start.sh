#!/usr/bin/env bash
# start.sh
# PlastiCatch - Local Development Starter

echo -e "\033[1;36m=========================================\033[0m"
echo -e "\033[1;36m   PlastiCatch - Local Development\033[0m"
echo -e "\033[1;36m=========================================\033[0m"

if [ "$1" == "--init" ]; then
    echo -e "\n\033[1;33m[1/3] Installing dependencies...\033[0m"
    npm install

    echo -e "\n\033[1;33m[2/3] Compiling Smart Contracts...\033[0m"
    cd contracts || exit
    npm install
    npx hardhat compile
    cd .. || exit

    echo -e "\n\033[1;33m[3/3] Initializing test data on Hedera and Supabase...\033[0m"
    node scripts/init-hedera.js
    node scripts/fund-payment-pool.js
    export DEPLOYER_PRIVATE_KEY="cab0365cd6d4601ae86783123bd2bea95b884e927bd5f40b81cdedacbd700dba"
    cd contracts || exit
    npm run deploy:testnet
    cd .. || exit
    node scripts/seed-test-data.js
fi

echo -e "\n\033[1;32m🚀 Starting Application and Agents...\033[0m"

# Start the frontend dev server in background
npm run dev &
FRONTEND_PID=$!

# Start the Mock Recovery Agent in background
node scripts/start-agents.js &
AGENT_PID=$!

echo -e "\n\033[1;32m✅ All services started!\033[0m"
echo -e "   - Frontend:    http://localhost:5173"
echo -e "   - Mock Agent:  Running in background"
echo -e "\n\033[1;33mPress Ctrl+C to stop all services.\033[0m"

# Wait for Ctrl+C to terminate both
trap "kill $FRONTEND_PID $AGENT_PID" SIGINT SIGTERM EXIT
wait
