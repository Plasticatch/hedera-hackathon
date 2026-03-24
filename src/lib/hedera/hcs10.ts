// src/lib/hedera/hcs10.ts
// Client-side types and helpers for the PlastiCatch HCS-10 Impact Agent.
// The actual HCS transactions are executed server-side (edge functions);
// this module provides types and HashScan URL builders for the UI.

export type ImpactQueryType =
  | "zone_summary"
  | "plastic_breakdown"
  | "prc_provenance"
  | "network_stats";

// ── Query param shapes ────────────────────────────────────────────────────────

export interface ZoneSummaryParams {
  zone?: string;
  from_date?: string; // YYYY-MM-DD
  to_date?: string;
}

export interface PlasticBreakdownParams {
  zone?: string;
  from_date?: string;
  to_date?: string;
}

export interface PrcProvenanceParams {
  retirement_id: string;
}

export type NetworkStatsParams = Record<string, never>;

// ── Response data shapes ──────────────────────────────────────────────────────

export interface ZoneSummaryData {
  zone: string;
  from_date: string;
  to_date: string;
  total_attestations: number;
  total_kg_recovered: number;
  total_hbar_paid: number;
  unique_collectors: number;
  avg_kg_per_collection: number;
  top_plastic_type: { type: string; kg: number } | null;
  hcs_anchored_count: number;
  plastic_breakdown: Record<string, number>;
}

export interface PlasticBreakdownData {
  zone: string;
  from_date: string;
  to_date: string;
  total_kg: number;
  breakdown: Record<string, { kg: number; hbar_paid: number; count: number; pct_of_total: number }>;
}

export interface PrcProvenanceData {
  retirement_id: string;
  company_name: string;
  prcs_retired: number;
  report_ref: string | null;
  hcs_retirement_seq: number | null;
  created_at: string;
  backing_attestations: {
    total: number;
    anchored_to_hcs: number;
    total_kg_backing: string;
    sample_hcs_sequences: number[];
  };
}

export interface NetworkStatsData {
  active_collectors: number;
  active_stations: number;
  total_attestations: number;
  hcs_anchored: number;
  total_kg_recovered: number;
  total_hbar_paid: number;
  total_prcs_retired: number;
  data_integrity: number; // %
}

// ── Agent conversation record ─────────────────────────────────────────────────

export interface AgentConversation {
  id: string;
  query_id: string;
  buyer_account: string | null;
  inbound_topic_id: string;
  response_topic_id: string | null;
  inbound_sequence_number: number | null;
  response_sequence_number: number | null;
  query_type: ImpactQueryType;
  query_params: Record<string, string>;
  response_data: Record<string, unknown> | null;
  status: "pending" | "processing" | "answered" | "error";
  error_message: string | null;
  processing_ms: number | null;
  created_at: string;
  answered_at: string | null;
}

// ── Agent query result (returned by edge function) ────────────────────────────

export interface AgentQueryResult {
  success: boolean;
  queryId: string;
  queryType: ImpactQueryType;
  data: Record<string, unknown>;
  hcs: {
    ready: boolean;
    inbound_topic_id: string | null;
    response_topic_id: string | null;
    inbound_sequence: number | null;
    response_sequence: number | null;
  };
  processing_ms: number;
  error?: string;
}

// ── HashScan URL helpers ──────────────────────────────────────────────────────

const network = import.meta.env.VITE_HEDERA_NETWORK ?? "testnet";

export function topicUrl(topicId: string): string {
  return `https://hashscan.io/${network}/topic/${topicId}`;
}

export function topicMessageUrl(topicId: string, sequenceNumber: number): string {
  return `https://hashscan.io/${network}/topic/${topicId}?sequenceNumber=${sequenceNumber}`;
}

export function accountUrl(accountId: string): string {
  return `https://hashscan.io/${network}/account/${accountId}`;
}

// ── Pre-built query card definitions for the UI ───────────────────────────────

export interface QueryCard {
  type: ImpactQueryType;
  label: string;
  description: string;
  icon: string;           // lucide icon name
  defaultParams: Record<string, string>;
  paramFields: {
    key: string;
    label: string;
    type: "zone" | "date" | "text";
    required: boolean;
  }[];
}

export const QUERY_CARDS: QueryCard[] = [
  {
    type:        "zone_summary",
    label:       "Zone Impact Summary",
    description: "Total kg recovered, HBAR paid, and collector activity in a zone.",
    icon:        "MapPin",
    defaultParams: {},
    paramFields: [
      { key: "zone",      label: "Zone",       type: "zone", required: false },
      { key: "from_date", label: "From",        type: "date", required: false },
      { key: "to_date",   label: "To",          type: "date", required: false },
    ],
  },
  {
    type:        "plastic_breakdown",
    label:       "Plastic Type Breakdown",
    description: "Kg recovered and payout per plastic type with percentage split.",
    icon:        "BarChart3",
    defaultParams: {},
    paramFields: [
      { key: "zone",      label: "Zone (optional)", type: "zone", required: false },
      { key: "from_date", label: "From",             type: "date", required: false },
      { key: "to_date",   label: "To",               type: "date", required: false },
    ],
  },
  {
    type:        "prc_provenance",
    label:       "PRC Provenance Check",
    description: "Verify that a PRC retirement is backed by on-chain attested plastic recovery.",
    icon:        "ShieldCheck",
    defaultParams: {},
    paramFields: [
      { key: "retirement_id", label: "Retirement ID", type: "text", required: true },
    ],
  },
  {
    type:        "network_stats",
    label:       "Network Statistics",
    description: "Global platform stats: collectors, stations, total kg, HCS integrity score.",
    icon:        "Globe",
    defaultParams: {},
    paramFields: [],
  },
];
