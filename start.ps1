param (
    [switch]$Initialize
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   PlastiCatch - Local Development" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($Initialize) {
    Write-Host "`n[1/3] Installing dependencies..." -ForegroundColor Yellow
    npm install

    Write-Host "`n[2/3] Compiling Smart Contracts..." -ForegroundColor Yellow
    cd contracts
    npm install
    npx hardhat compile
    cd ..

    Write-Host "`n[3/3] Initializing test data on Hedera and Supabase..." -ForegroundColor Yellow
    node scripts/init-hedera.js
    node scripts/fund-payment-pool.js
    $env:DEPLOYER_PRIVATE_KEY="cab0365cd6d4601ae86783123bd2bea95b884e927bd5f40b81cdedacbd700dba"
    cd contracts
    npm run deploy:testnet
    cd ..
    node scripts/seed-test-data.js
}

Write-Host "`n🚀 Starting Application and Agents..." -ForegroundColor Green

# Start the frontend dev server
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'PlastiCatch Frontend'; npm run dev`""

# Start the Mock Recovery Agent
Start-Process powershell -ArgumentList "-NoExit -Command `"Title 'PlastiCatch Recovery Agent'; node scripts/start-agents.js`""

Write-Host "`n✅ All services started in separate windows!" -ForegroundColor Green
Write-Host "   - Frontend:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "   - Mock Agent:  Running in background window" -ForegroundColor Cyan
Write-Host "`nTo stop everything, simply close the opened PowerShell windows." -ForegroundColor Yellow
