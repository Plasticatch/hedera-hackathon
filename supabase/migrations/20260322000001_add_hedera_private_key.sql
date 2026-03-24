-- Add private key storage for PlastiCatch managed wallets.
-- NOTE: This stores the key server-side (custodial). Acceptable for a hackathon demo;
--       in production you would use an HSM or key-management service.
ALTER TABLE public.collectors ADD COLUMN IF NOT EXISTS hedera_private_key TEXT;
