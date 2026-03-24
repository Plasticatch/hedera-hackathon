/**
 * Hedera account creation is handled server-side by the `register-collector`
 * Supabase Edge Function, which calls AccountCreateTransaction via @hashgraph/sdk.
 *
 * No client-side account generation is needed — the edge function returns
 * the real account ID and private key after the on-chain transaction confirms.
 */
