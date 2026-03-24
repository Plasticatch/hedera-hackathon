// src/lib/contracts.ts
// Contract addresses deployed on Hedera EVM (testnet).
// Set these in .env — see .env.example for the full list.

const e = import.meta.env;

export const CONTRACTS = {
  collectorRegistry: e.VITE_COLLECTOR_REGISTRY_CONTRACT ?? "",
  stationRegistry:   e.VITE_STATION_REGISTRY_CONTRACT ?? "",
  prcToken:          e.VITE_PRC_TOKEN_CONTRACT ?? "",
  corporateVault:    e.VITE_CORPORATE_VAULT_CONTRACT ?? "",
  cleanupEventPool:  e.VITE_CLEANUP_EVENT_POOL_CONTRACT ?? "",
  reputationOracle:  e.VITE_REPUTATION_ORACLE_CONTRACT ?? "",
} as const;

/** Returns true if address looks like a real deployed contract (non-zero). */
export function isDeployed(address: string): boolean {
  return !!address && address !== "0x0000000000000000000000000000000000000000";
}

/** Hedera mirror node link for a contract address. */
export function contractExplorerUrl(address: string): string {
  const network = e.VITE_HEDERA_NETWORK ?? "testnet";
  return `https://hashscan.io/${network}/contract/${address}`;
}
