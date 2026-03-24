-- ⚠️ RUN THIS TO COMPLETELY WIPE AND DROP ALL TABLES
DROP TABLE IF EXISTS public.demand_signals CASCADE;
DROP TABLE IF EXISTS public.corporate_buyers CASCADE;
DROP TABLE IF EXISTS public.disputes CASCADE;
DROP TABLE IF EXISTS public.cleanup_events CASCADE;
DROP TABLE IF EXISTS public.prc_retirements CASCADE;
DROP TABLE IF EXISTS public.attestations CASCADE;
DROP TABLE IF EXISTS public.weighing_stations CASCADE;
DROP TABLE IF EXISTS public.collectors CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the custom type
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Clear out any auth users
DELETE FROM auth.users;

-- ℹ️ After running this, copy-paste your full migration script to rebuild the tables!
-- Then run `node scripts/seed-test-data.js`
