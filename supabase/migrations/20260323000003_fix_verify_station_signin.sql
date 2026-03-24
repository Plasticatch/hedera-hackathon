-- Fix: verify_station_signin and verify_collector_signin had user_id as TEXT but column is UUID

CREATE OR REPLACE FUNCTION public.verify_station_signin(
  p_station_id UUID,
  p_password   TEXT
) RETURNS TABLE (
  id                UUID,
  user_id           UUID,
  facility_name     TEXT,
  zone              TEXT,
  hedera_account_id TEXT,
  accepted_types    TEXT[],
  status            TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT ws.id, ws.user_id, ws.facility_name, ws.zone,
         ws.hedera_account_id, ws.accepted_types, ws.status
  FROM public.weighing_stations ws
  WHERE ws.id = p_station_id
    AND ws.password_hash IS NOT NULL
    AND ws.password_hash = crypt(p_password, ws.password_hash);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_station_signin TO anon, authenticated;

-- Fix: verify_collector_signin had same user_id TEXT vs UUID mismatch
CREATE OR REPLACE FUNCTION public.verify_collector_signin(
  p_account_id TEXT,
  p_password   TEXT
) RETURNS TABLE (
  id                UUID,
  user_id           UUID,
  hedera_account_id TEXT,
  zone              TEXT,
  display_name      TEXT,
  status            TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.user_id, c.hedera_account_id, c.zone, c.display_name, c.status
  FROM public.collectors c
  WHERE c.hedera_account_id = p_account_id
    AND c.password_hash IS NOT NULL
    AND c.password_hash = crypt(p_password, c.password_hash);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_collector_signin TO anon, authenticated;
