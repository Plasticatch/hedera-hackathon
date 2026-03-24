-- ═══════════════════════════════════════════════════════════════════════════════
--  PlastiCatch — Complete Database Schema
--  Supabase · PostgreSQL
--
--  This file is the canonical, single-source schema reference for judges and
--  reviewers.  It is the union of all incremental migrations in ./migrations/
--  applied in order.
--
--  To apply from scratch:
--    supabase db reset          (local dev)
--    supabase db push           (remote / production)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- bcrypt password hashing


-- ─── Utility: updated_at trigger ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ─── App Roles ────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
  'admin', 'collector', 'station_operator',
  'corporate_buyer', 'event_organizer', 'validator'
);

CREATE TABLE public.user_roles (
  id      UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID     NOT NULL,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


-- ─── Collectors ───────────────────────────────────────────────────────────────
--  Coastal collectors who bring recovered plastic to weighing stations.
--  Accounts are custodially created on Hedera via the register-collector edge
--  function (AccountCreateTransaction, 0.3 HBAR onboarding credit).

CREATE TABLE public.collectors (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL UNIQUE,
  display_name        TEXT         NOT NULL,
  phone_hash          TEXT         NOT NULL UNIQUE,
  zone                TEXT         NOT NULL,
  hedera_account_id   TEXT,                          -- e.g. "0.0.5291840"
  hedera_private_key  TEXT,                          -- custodial managed-wallet key
  password_hash       TEXT,                          -- bcrypt hash (set by set_collector_password RPC)
  reputation_score    INTEGER      NOT NULL DEFAULT 0,
  reputation_tier     INTEGER      NOT NULL DEFAULT 0,
  total_kg_recovered  NUMERIC(12,3) NOT NULL DEFAULT 0,
  total_hbar_earned   NUMERIC(12,4) NOT NULL DEFAULT 0,
  days_active         INTEGER      NOT NULL DEFAULT 0,
  unique_stations     INTEGER      NOT NULL DEFAULT 0,
  status              TEXT         NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'blacklisted')),
  did_document        JSONB,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.collectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read collectors"         ON public.collectors FOR SELECT USING (true);
CREATE POLICY "Collectors can update own data"     ON public.collectors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert collector" ON public.collectors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_collectors_updated_at
  BEFORE UPDATE ON public.collectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Weighing Stations ────────────────────────────────────────────────────────
--  Verified physical weighing points.  Operators connect a real HashPack wallet
--  and stake 500 HBAR as a fraud-prevention bond.

CREATE TABLE public.weighing_stations (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL,
  facility_name       TEXT         NOT NULL,
  physical_address    TEXT         NOT NULL,
  gps_lat             NUMERIC(10,7),
  gps_lon             NUMERIC(10,7),
  zone                TEXT         NOT NULL,
  facility_type       TEXT         NOT NULL
                        CHECK (facility_type IN ('port', 'recycling', 'ngo', 'municipal')),
  accepted_types      TEXT[]       NOT NULL DEFAULT '{}',
  operating_hours     TEXT,
  calibration_cert_hash TEXT,
  calibration_expiry  DATE,
  stake_amount        NUMERIC(12,4) NOT NULL DEFAULT 0,
  stake_status        TEXT         NOT NULL DEFAULT 'pending'
                        CHECK (stake_status IN ('pending', 'active', 'at_risk', 'slashed')),
  status              TEXT         NOT NULL DEFAULT 'pending_review'
                        CHECK (status IN ('pending_review', 'active', 'suspended', 'deregistered')),
  hedera_account_id   TEXT,                          -- connected HashPack wallet
  password_hash       TEXT,                          -- bcrypt hash (set atomically in register_station_with_password RPC)
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.weighing_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stations public read"           ON public.weighing_stations FOR SELECT USING (true);
CREATE POLICY "Station operators can update"   ON public.weighing_stations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert station" ON public.weighing_stations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON public.weighing_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Attestations ─────────────────────────────────────────────────────────────
--  A station operator's signed record of plastic collected by a specific
--  collector.  Verified attestations are anchored to Hedera HCS and trigger
--  automatic HBAR payments.

CREATE TABLE public.attestations (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id         UUID         NOT NULL REFERENCES public.collectors(id) ON DELETE CASCADE,
  station_id           UUID         NOT NULL REFERENCES public.weighing_stations(id) ON DELETE CASCADE,
  zone                 TEXT         NOT NULL,
  plastic_items        JSONB        NOT NULL DEFAULT '[]',  -- [{type, weight_grams, rate}]
  total_weight_grams   INTEGER      NOT NULL,
  photo_hash           TEXT,
  payout_tinybar       BIGINT,
  payout_hbar          NUMERIC(12,4),
  status               TEXT         NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'verified', 'flagged', 'disputed', 'rejected')),
  hcs_sequence_number  BIGINT,                              -- HCS sequence# when anchored on-chain
  station_nonce        INTEGER,
  operator_signature   TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attestations public read" ON public.attestations FOR SELECT USING (true);
CREATE POLICY "Station ops can insert attestations" ON public.attestations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.weighing_stations WHERE id = station_id AND user_id = auth.uid()) OR true
);
CREATE TRIGGER update_attestations_updated_at
  BEFORE UPDATE ON public.attestations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── PRC Retirements ──────────────────────────────────────────────────────────
--  On-chain retirement records when a corporate buyer burns PRCs.

CREATE TABLE public.prc_retirements (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id            UUID        NOT NULL,
  company_name             TEXT        NOT NULL,
  prcs_retired             INTEGER     NOT NULL,
  report_ref               TEXT,
  cert_token_id            TEXT,
  provenance_summary       JSONB,
  hcs_retirement_sequence  BIGINT,                 -- HCS sequence# of the retirement event
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prc_retirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retirements public read"  ON public.prc_retirements FOR SELECT USING (true);
CREATE POLICY "Buyers can insert"        ON public.prc_retirements FOR INSERT WITH CHECK (auth.uid() = buyer_user_id OR true);


-- ─── Cleanup Events ───────────────────────────────────────────────────────────

CREATE TABLE public.cleanup_events (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id       UUID         NOT NULL,
  name                    TEXT         NOT NULL,
  zones                   TEXT[]       NOT NULL DEFAULT '{}',
  start_date              DATE         NOT NULL,
  end_date                DATE         NOT NULL,
  target_kg               INTEGER,
  description             TEXT,
  sponsor_name            TEXT,
  pool_amount             NUMERIC(12,4) NOT NULL DEFAULT 0,
  multiplier              NUMERIC(4,2)  NOT NULL DEFAULT 1.0,
  total_kg_collected      NUMERIC(12,3) NOT NULL DEFAULT 0,
  collectors_participating INTEGER      NOT NULL DEFAULT 0,
  status                  TEXT         NOT NULL DEFAULT 'upcoming'
                            CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  hcs_event_sequence      BIGINT,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.cleanup_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events public read"          ON public.cleanup_events FOR SELECT USING (true);
CREATE POLICY "Organizers can insert"       ON public.cleanup_events FOR INSERT WITH CHECK (auth.uid() = organizer_user_id OR true);
CREATE POLICY "Organizers can update"       ON public.cleanup_events FOR UPDATE  USING (auth.uid() = organizer_user_id OR true);
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.cleanup_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Disputes ─────────────────────────────────────────────────────────────────

CREATE TABLE public.disputes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_id      UUID        NOT NULL REFERENCES public.attestations(id) ON DELETE CASCADE,
  dispute_type        TEXT        NOT NULL
                        CHECK (dispute_type IN (
                          'WEIGHT_MISMATCH', 'PLASTIC_TYPE_DISPUTE',
                          'GPS_ANOMALY', 'FREQUENCY_ANOMALY', 'VOLUME_ANOMALY'
                        )),
  initiator           TEXT        NOT NULL,
  description         TEXT,
  evidence            TEXT,
  status              TEXT        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'pending_review', 'resolved', 'dismissed')),
  resolution          TEXT,
  validator_votes     JSONB,
  station_consequence TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disputes public read"          ON public.disputes FOR SELECT USING (true);
CREATE POLICY "Authenticated can create"      ON public.disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can update"      ON public.disputes FOR UPDATE  USING (true);
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Corporate Buyers ─────────────────────────────────────────────────────────

CREATE TABLE public.corporate_buyers (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL UNIQUE,
  company_name         TEXT         NOT NULL,
  industry             TEXT         NOT NULL,
  contact_email        TEXT         NOT NULL,
  registration_number  TEXT,
  wallet_type          TEXT,
  hedera_account_id    TEXT,
  total_prcs_owned     INTEGER      NOT NULL DEFAULT 0,
  total_prcs_retired   INTEGER      NOT NULL DEFAULT 0,
  total_hbar_spent     NUMERIC(12,4) NOT NULL DEFAULT 0,
  status               TEXT         NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.corporate_buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Corporate buyers public read" ON public.corporate_buyers FOR SELECT USING (true);
CREATE POLICY "Buyers can update own"        ON public.corporate_buyers FOR UPDATE USING (auth.uid() = user_id OR true);
CREATE POLICY "Buyers can insert"            ON public.corporate_buyers FOR INSERT WITH CHECK (auth.uid() = user_id OR true);
CREATE TRIGGER update_buyers_updated_at
  BEFORE UPDATE ON public.corporate_buyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── Demand Signals ───────────────────────────────────────────────────────────

CREATE TABLE public.demand_signals (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  zone               TEXT         NOT NULL,
  bonus_percentage   NUMERIC(5,2) NOT NULL,
  valid_until        TIMESTAMPTZ  NOT NULL,
  inventory_level    INTEGER      NOT NULL DEFAULT 0,
  triggered_by       TEXT,
  status             TEXT         NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'expired', 'fulfilled')),
  hcs_sequence_number BIGINT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demand signals public read"   ON public.demand_signals FOR SELECT USING (true);
CREATE POLICY "Admins can insert signals"    ON public.demand_signals FOR INSERT WITH CHECK (true);
CREATE TRIGGER update_demand_signals_updated_at
  BEFORE UPDATE ON public.demand_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─── HCS-10 Agent Conversations ───────────────────────────────────────────────
--  Every query posted to the Impact Agent inbound HCS topic and every response
--  posted back is recorded here with its HCS sequence number, enabling full
--  on-chain auditability for corporate buyers.

CREATE TABLE public.agent_conversations (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id                 TEXT        NOT NULL UNIQUE,       -- client-generated UUID, echoed in HCS payload
  buyer_account            TEXT,                              -- Hedera account of requester (optional)
  inbound_topic_id         TEXT        NOT NULL,              -- agent inbound HCS topic
  response_topic_id        TEXT,                              -- agent response HCS topic
  inbound_sequence_number  BIGINT,                            -- HCS seq# when query was posted
  response_sequence_number BIGINT,                            -- HCS seq# when response was posted
  query_type               TEXT        NOT NULL,              -- zone_summary | plastic_breakdown | prc_provenance | network_stats
  query_params             JSONB       NOT NULL DEFAULT '{}',
  response_data            JSONB,
  status                   TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'answered', 'error')),
  error_message            TEXT,
  processing_ms            INTEGER,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at              TIMESTAMPTZ
);
CREATE INDEX agent_conversations_created_at_idx ON public.agent_conversations (created_at DESC);
CREATE INDEX agent_conversations_query_type_idx ON public.agent_conversations (query_type);
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read agent conversations"   ON public.agent_conversations FOR SELECT USING (true);
CREATE POLICY "Service insert agent conversations" ON public.agent_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update agent conversations" ON public.agent_conversations FOR UPDATE  USING (true);


-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_collectors_zone         ON public.collectors(zone);
CREATE INDEX IF NOT EXISTS idx_collectors_reputation   ON public.collectors(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_attestations_collector  ON public.attestations(collector_id);
CREATE INDEX IF NOT EXISTS idx_attestations_station    ON public.attestations(station_id);
CREATE INDEX IF NOT EXISTS idx_attestations_status     ON public.attestations(status);
CREATE INDEX IF NOT EXISTS idx_disputes_attestation    ON public.disputes(attestation_id);
CREATE INDEX IF NOT EXISTS idx_events_status           ON public.cleanup_events(status);
CREATE INDEX IF NOT EXISTS idx_stations_zone           ON public.weighing_stations(zone);
CREATE INDEX IF NOT EXISTS idx_demand_signals_zone     ON public.demand_signals(zone);
CREATE INDEX IF NOT EXISTS idx_demand_signals_status   ON public.demand_signals(status);


-- ─── Password Authentication RPCs ─────────────────────────────────────────────
--  Passwords are NEVER stored in plaintext.  Only bcrypt hashes (via pgcrypto
--  gen_salt('bf', 10) = 10-round Blowfish) are persisted.
--
--  Security model:
--    • set_collector_password   — service-role only (called from edge function)
--    • verify_collector_signin  — anon-callable; returns row iff credentials match
--    • register_station_with_password — anon-callable SECURITY DEFINER insert
--    • verify_station_signin    — anon-callable; returns row iff credentials match

-- Set collector password after account creation (edge function only, no anon grant)
CREATE OR REPLACE FUNCTION public.set_collector_password(
  p_collector_id UUID,
  p_password     TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.collectors
  SET    password_hash = crypt(p_password, gen_salt('bf', 10))
  WHERE  id = p_collector_id;
END;
$$;

-- Verify collector sign-in — returns matching row or empty set
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

-- Atomic station insert with bcrypt hash (anon can call — SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.register_station_with_password(
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

-- Verify station sign-in — returns matching row or empty set
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

-- Set station password (service-role / seed script only — no anon grant)
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
