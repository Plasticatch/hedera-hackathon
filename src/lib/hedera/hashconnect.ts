// src/lib/hedera/hashconnect.ts
// Singleton HashConnect initializer for Hedera wallet pairing.
// Used by station onboarding to connect a real HashPack wallet.

let _hc: unknown = null;

export async function initHashConnect() {
  const { HashConnect } = await import("hashconnect");
  const { LedgerId } = await import("@hashgraph/sdk");

  if (_hc) return _hc as InstanceType<typeof HashConnect>;

  const network = import.meta.env.VITE_HEDERA_NETWORK ?? "testnet";
  const hc = new HashConnect(
    network === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET,
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
    {
      name: "PlastiCatch",
      description: "Ocean plastic recovery — verified on Hedera",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
    false // debug
  );

  await hc.init();
  _hc = hc;
  return hc;
}

export function resetHashConnect() {
  _hc = null;
}
