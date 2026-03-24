// scripts/deploy.js — PlastiCatch contract deployment
// Run: npx hardhat run scripts/deploy.js --network hederaTestnet
const { ethers } = require("hardhat");

// Hedera JSON-RPC relay requires explicit gas to avoid INSUFFICIENT_TX_FEE
const TX_OPTS = { gasLimit: 6_000_000, gasPrice: ethers.parseUnits("1200", "gwei") };

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PlastiCatch contracts with:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. CollectorRegistry
  const CollectorRegistry = await ethers.getContractFactory("CollectorRegistry");
  const collectorRegistry = await CollectorRegistry.deploy(TX_OPTS);
  await collectorRegistry.waitForDeployment();
  console.log("CollectorRegistry deployed to:", await collectorRegistry.getAddress());

  // 2. StationRegistry
  const StationRegistry = await ethers.getContractFactory("StationRegistry");
  const stationRegistry = await StationRegistry.deploy(TX_OPTS);
  await stationRegistry.waitForDeployment();
  console.log("StationRegistry deployed to:", await stationRegistry.getAddress());

  // 3. PRCToken (needs CollectorRegistry + StationRegistry + vault = deployer for now)
  const PRCToken = await ethers.getContractFactory("PRCToken");
  const prcVault = deployer.address; // In production: a dedicated vault address
  const prcToken = await PRCToken.deploy(
    await collectorRegistry.getAddress(),
    await stationRegistry.getAddress(),
    prcVault,
    TX_OPTS
  );
  await prcToken.waitForDeployment();
  console.log("PRCToken deployed to:", await prcToken.getAddress());

  // 4. CorporateVault
  const CorporateVault = await ethers.getContractFactory("CorporateVault");
  const corporateVault = await CorporateVault.deploy(await prcToken.getAddress(), TX_OPTS);
  await corporateVault.waitForDeployment();
  console.log("CorporateVault deployed to:", await corporateVault.getAddress());

  // 5. CleanupEventPool
  const CleanupEventPool = await ethers.getContractFactory("CleanupEventPool");
  const cleanupEventPool = await CleanupEventPool.deploy(TX_OPTS);
  await cleanupEventPool.waitForDeployment();
  console.log("CleanupEventPool deployed to:", await cleanupEventPool.getAddress());

  // 6. ReputationOracle
  const ReputationOracle = await ethers.getContractFactory("ReputationOracle");
  const reputationOracle = await ReputationOracle.deploy(await collectorRegistry.getAddress(), TX_OPTS);
  await reputationOracle.waitForDeployment();
  console.log("ReputationOracle deployed to:", await reputationOracle.getAddress());

  // Wire up authorization
  const recoveryAgentPlaceholder = deployer.address; // Replace with actual HOL agent address
  await collectorRegistry.setRecoveryAgent(recoveryAgentPlaceholder, TX_OPTS);
  await collectorRegistry.setReputationOracle(await reputationOracle.getAddress(), TX_OPTS);
  await stationRegistry.setRecoveryAgent(recoveryAgentPlaceholder, TX_OPTS);
  await prcToken.setRecoveryAgent(recoveryAgentPlaceholder, TX_OPTS);
  await corporateVault.setRecoveryAgent(recoveryAgentPlaceholder, TX_OPTS);
  await reputationOracle.setRecoveryAgent(recoveryAgentPlaceholder, TX_OPTS);

  console.log("\n--- Deployment Summary ---");
  console.log(`COLLECTOR_REGISTRY_ADDRESS=${await collectorRegistry.getAddress()}`);
  console.log(`STATION_REGISTRY_ADDRESS=${await stationRegistry.getAddress()}`);
  console.log(`PRC_TOKEN_ADDRESS=${await prcToken.getAddress()}`);
  console.log(`CORPORATE_VAULT_ADDRESS=${await corporateVault.getAddress()}`);
  console.log(`CLEANUP_EVENT_POOL_ADDRESS=${await cleanupEventPool.getAddress()}`);
  console.log(`REPUTATION_ORACLE_ADDRESS=${await reputationOracle.getAddress()}`);
  console.log("--- Add these to your .env file ---");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
