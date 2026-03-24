-- Migration: add set_station_password helper (service-role only, used by seed script)

CREATE OR REPLACE FUNCTION public.set_station_password(
  p_station_id UUID,
  p_password   TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.weighing_stations
  SET    password_hash = crypt(p_password, gen_salt('bf', 10))
  WHERE  id = p_station_id;
END;
$$;
-- No anon grant — only service role (seed script / admin) can call this
