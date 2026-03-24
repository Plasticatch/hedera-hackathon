-- ─── Password Authentication ─────────────────────────────────────────────────
-- Adds bcrypt password hashing (via pgcrypto) for collector and station sign-in.
-- Passwords are NEVER stored in plaintext; only bcrypt hashes are persisted.

-- Enable pgcrypto (provides crypt() + gen_salt())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add password_hash columns
ALTER TABLE public.collectors        ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.weighing_stations ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ─── Collector RPCs ───────────────────────────────────────────────────────────

-- Called by the register-collector edge function (service role) after account creation.
-- NOT granted to anon — only callable from trusted server-side code.
CREATE OR REPLACE FUNCTION public.set_collector_password(
  p_collector_id UUID,
  p_password     TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.collectors
  SET    password_hash = crypt(p_password, gen_salt('bf', 10))
  WHERE  id = p_collector_id;
END;
$$;
-- No GRANT to anon; service role can always call it.

-- Called from the browser during sign-in.
-- Returns the collector row ONLY if account_id + password match.
CREATE OR REPLACE FUNCTION public.verify_collector_signin(
  p_account_id TEXT,
  p_password   TEXT
) RETURNS TABLE (
  id                UUID,
  user_id           TEXT,
  hedera_account_id TEXT,
  zone              TEXT,
  display_name      TEXT,
  status            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.hedera_account_id,
    c.zone,
    c.display_name,
    c.status
  FROM public.collectors c
  WHERE c.hedera_account_id = p_account_id
    AND c.password_hash IS NOT NULL
    AND c.password_hash = crypt(p_password, c.password_hash);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_collector_signin TO anon, authenticated;

-- ─── Station RPCs ─────────────────────────────────────────────────────────────

-- Atomic insert + bcrypt hash in one call.
-- SECURITY DEFINER so the anon role can insert despite RLS.
CREATE OR REPLACE FUNCTION public.register_station_with_password(
  p_user_id          TEXT,
  p_facility_name    TEXT,
  p_physical_address TEXT,
  p_zone             TEXT,
  p_facility_type    TEXT,
  p_accepted_types   TEXT[],
  p_operating_hours  TEXT,
  p_hedera_account_id TEXT,
  p_password         TEXT
) RETURNS TABLE (
  id                UUID,
  user_id           TEXT,
  facility_name     TEXT,
  zone              TEXT,
  hedera_account_id TEXT,
  accepted_types    TEXT[],
  status            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.weighing_stations (
    user_id, facility_name, physical_address, zone, facility_type,
    accepted_types, operating_hours, hedera_account_id,
    stake_amount, stake_status, status, password_hash
  ) VALUES (
    p_user_id, p_facility_name, p_physical_address, p_zone, p_facility_type,
    p_accepted_types, p_operating_hours, p_hedera_account_id,
    0, 'pending', 'pending_review',
    crypt(p_password, gen_salt('bf', 10))
  )
  RETURNING
    id, user_id, facility_name, zone, hedera_account_id, accepted_types, status;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_station_with_password TO anon, authenticated;

-- Called from the browser during station sign-in (after selecting a station by name).
-- Returns the station row ONLY if id + password match.
CREATE OR REPLACE FUNCTION public.verify_station_signin(
  p_station_id UUID,
  p_password   TEXT
) RETURNS TABLE (
  id                UUID,
  user_id           TEXT,
  facility_name     TEXT,
  zone              TEXT,
  hedera_account_id TEXT,
  accepted_types    TEXT[],
  status            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.id,
    ws.user_id,
    ws.facility_name,
    ws.zone,
    ws.hedera_account_id,
    ws.accepted_types,
    ws.status
  FROM public.weighing_stations ws
  WHERE ws.id = p_station_id
    AND ws.password_hash IS NOT NULL
    AND ws.password_hash = crypt(p_password, ws.password_hash);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_station_signin TO anon, authenticated;
