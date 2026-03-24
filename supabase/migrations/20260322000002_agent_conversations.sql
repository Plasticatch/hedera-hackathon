-- HCS-10 Impact Agent conversation log.
-- Every query submitted to the agent inbound topic and every response
-- posted to the response topic is recorded here with its HCS sequence number,
-- allowing full on-chain auditability.

CREATE TABLE public.agent_conversations (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id                 TEXT         NOT NULL UNIQUE,        -- client-generated UUID, echoed in HCS payloads
  buyer_account            TEXT,                                -- Hedera account of the requester (optional/anonymous)
  inbound_topic_id         TEXT         NOT NULL,               -- agent inbound HCS topic
  response_topic_id        TEXT,                                -- response HCS topic
  inbound_sequence_number  BIGINT,                              -- HCS sequence# when query was posted
  response_sequence_number BIGINT,                              -- HCS sequence# when response was posted
  query_type               TEXT         NOT NULL,               -- zone_summary | plastic_breakdown | prc_provenance | network_stats
  query_params             JSONB        NOT NULL DEFAULT '{}',
  response_data            JSONB,
  status                   TEXT         NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','answered','error')),
  error_message            TEXT,
  processing_ms            INTEGER,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  answered_at              TIMESTAMPTZ
);

CREATE INDEX agent_conversations_created_at_idx ON public.agent_conversations (created_at DESC);
CREATE INDEX agent_conversations_query_type_idx ON public.agent_conversations (query_type);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read agent conversations"  ON public.agent_conversations FOR SELECT USING (true);
CREATE POLICY "Service insert agent conversations" ON public.agent_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update agent conversations" ON public.agent_conversations FOR UPDATE USING (true);
