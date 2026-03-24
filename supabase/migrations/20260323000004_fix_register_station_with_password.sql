-- Fix: register_station_with_password had user_id as TEXT but column is UUID

DROP FUNCTION IF EXISTS public.register_station_with_password(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT);

CREATE FUNCTION public.register_station_with_password(
  p_user_id           TEXT,
  p_facility_name     TEXT,
  p_physical_address  TEXT,
  p_zone              TEXT,
  p_facility_type     TEXT,
  p_accepted_types    TEXT[],
  p_operating_hours   TEXT,
  p_hedera_account_id TEXT,
  p_password          TEXT
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
  WITH ins AS (
    INSERT INTO public.weighing_stations (
      user_id, facility_name, physical_address, zone, facility_type,
      accepted_types, operating_hours, hedera_account_id,
      stake_amount, stake_status, status, password_hash
    ) VALUES (
      p_user_id::UUID, p_facility_name, p_physical_address, p_zone, p_facility_type,
      p_accepted_types, p_operating_hours, p_hedera_account_id,
      0, 'pending', 'pending_review',
      crypt(p_password, gen_salt('bf', 10))
    )
    RETURNING *
  )
  SELECT ins.id, ins.user_id, ins.facility_name, ins.zone,
         ins.hedera_account_id, ins.accepted_types, ins.status
  FROM ins;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_station_with_password TO anon, authenticated;
