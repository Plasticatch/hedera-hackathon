import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, BarChart3, ShieldCheck, Globe, Loader2,
  ExternalLink, CheckCircle, Clock, AlertTriangle, Zap,
  ChevronDown, ArrowRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import {
  useAgentStatus,
  useSubmitImpactQuery,
  useAgentConversations,
} from "@/hooks/usePlastiCatchData";
import {
  QUERY_CARDS,
  topicUrl,
  topicMessageUrl,
  accountUrl,
  type ImpactQueryType,
  type AgentQueryResult,
} from "@/lib/hedera/hcs10";
import { GEOGRAPHIC_ZONES } from "@/lib/constants";
import { toast } from "sonner";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  MapPin, BarChart3, ShieldCheck, Globe,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function defaultFrom() {
  return new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];
}
function defaultTo() {
  return new Date().toISOString().split("T")[0];
}

// ── Result renderer ───────────────────────────────────────────────────────────

const ResultRow = ({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-black/[0.05] last:border-0">
    <span className="text-xs text-[#999]">{label}</span>
    <span className={`text-sm font-semibold text-[#111] ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

const ResultCard = ({ result }: { result: AgentQueryResult }) => {
  const d = result.data;
  const net = import.meta.env.VITE_HEDERA_NETWORK ?? "testnet";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* On-chain proof badge */}
      <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          {result.hcs.ready ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-3 py-1">
              <CheckCircle className="w-3.5 h-3.5" /> Anchored on Hedera HCS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-full px-3 py-1">
              <AlertTriangle className="w-3.5 h-3.5" /> HCS topics not configured
            </span>
          )}
          <span className="text-[11px] text-[#999] ml-auto">{result.processing_ms} ms</span>
        </div>

        {result.hcs.ready && (
          <div className="grid grid-cols-2 gap-3">
            {result.hcs.inbound_sequence !== null && (
              <a
                href={topicMessageUrl(result.hcs.inbound_topic_id!, result.hcs.inbound_sequence)}
                target="_blank" rel="noopener noreferrer"
                className="rounded-xl bg-[#f5f7f9] p-3 hover:bg-[#eef0f3] transition-colors group"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-0.5">Query — Sequence</p>
                <p className="font-mono text-sm font-bold text-[#111]">#{result.hcs.inbound_sequence}</p>
                <p className="text-[10px] text-[#0A3D55] group-hover:underline mt-0.5 flex items-center gap-0.5">
                  View on HashScan <ExternalLink className="w-2.5 h-2.5" />
                </p>
              </a>
            )}
            {result.hcs.response_sequence !== null && (
              <a
                href={topicMessageUrl(result.hcs.response_topic_id!, result.hcs.response_sequence)}
                target="_blank" rel="noopener noreferrer"
                className="rounded-xl bg-[#f5f7f9] p-3 hover:bg-[#eef0f3] transition-colors group"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-0.5">Response — Sequence</p>
                <p className="font-mono text-sm font-bold text-[#111]">#{result.hcs.response_sequence}</p>
                <p className="text-[10px] text-[#0A3D55] group-hover:underline mt-0.5 flex items-center gap-0.5">
                  View on HashScan <ExternalLink className="w-2.5 h-2.5" />
                </p>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Data card */}
      <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
        <h3 className="font-bold text-sm text-[#111] mb-4" style={{ fontFamily: "'SUSE', sans-serif" }}>
          Query Results
        </h3>

        {result.queryType === "zone_summary" && (() => {
          const r = d as any;
          return (
            <div className="space-y-1">
              <ResultRow label="Zone"                value={r.zone === "all" ? "All Zones" : r.zone} />
              <ResultRow label="Period"              value={`${r.from_date} → ${r.to_date}`} />
              <ResultRow label="Verified Attestations" value={r.total_attestations} />
              <ResultRow label="Total Kg Recovered"   value={`${r.total_kg_recovered} kg`} />
              <ResultRow label="Total HBAR Paid"       value={`${r.total_hbar_paid} HBAR`} />
              <ResultRow label="Unique Collectors"     value={r.unique_collectors} />
              <ResultRow label="Avg kg / Collection"   value={`${r.avg_kg_per_collection} kg`} />
              <ResultRow label="HCS-Anchored Records"  value={`${r.hcs_anchored_count} / ${r.total_attestations}`} />
              {r.top_plastic_type && (
                <ResultRow label="Top Plastic Type" value={`${r.top_plastic_type.type.replace(/_/g, " ")} (${r.top_plastic_type.kg} kg)`} />
              )}
            </div>
          );
        })()}

        {result.queryType === "plastic_breakdown" && (() => {
          const r = d as any;
          return (
            <div className="space-y-1">
              <ResultRow label="Zone"      value={r.zone === "all" ? "All Zones" : r.zone} />
              <ResultRow label="Total kg"  value={`${r.total_kg} kg`} />
              <div className="mt-3 space-y-2">
                {Object.entries(r.breakdown ?? {}).map(([type, v]: [string, any]) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs font-medium text-[#333]">{type.replace(/_/g, " ")}</span>
                        <span className="text-xs text-[#999]">{v.kg} kg · {v.pct_of_total}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#90E0EF]"
                          style={{ width: `${v.pct_of_total}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {result.queryType === "prc_provenance" && (() => {
          const r = d as any;
          const fullyBacked = r.backing_attestations?.anchored_to_hcs > 0;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                {fullyBacked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Provenance Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-full px-2.5 py-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Partial Provenance
                  </span>
                )}
              </div>
              <ResultRow label="Company"         value={r.company_name} />
              <ResultRow label="PRCs Retired"    value={r.prcs_retired} />
              <ResultRow label="Report Ref"      value={r.report_ref ?? "—"} mono />
              <ResultRow label="HCS Seq (Retirement)" value={r.hcs_retirement_seq ? `#${r.hcs_retirement_seq}` : "—"} />
              <ResultRow label="Backing Attestations" value={r.backing_attestations?.total ?? 0} />
              <ResultRow label="HCS-Anchored"    value={r.backing_attestations?.anchored_to_hcs ?? 0} />
              <ResultRow label="Total kg Backing" value={`${r.backing_attestations?.total_kg_backing ?? 0} kg`} />
              {(r.backing_attestations?.sample_hcs_sequences ?? []).length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">Sample HCS Sequences</p>
                  <div className="flex flex-wrap gap-1">
                    {r.backing_attestations.sample_hcs_sequences.map((seq: number) => (
                      <span key={seq} className="font-mono text-[10px] bg-[#f5f7f9] rounded px-1.5 py-0.5">#{seq}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {result.queryType === "network_stats" && (() => {
          const r = d as any;
          return (
            <div className="space-y-1">
              <ResultRow label="Active Collectors"    value={r.active_collectors} />
              <ResultRow label="Active Stations"      value={r.active_stations} />
              <ResultRow label="Verified Attestations" value={r.total_attestations} />
              <ResultRow label="HCS-Anchored"         value={r.hcs_anchored} />
              <ResultRow label="Total kg Recovered"   value={`${r.total_kg_recovered} kg`} />
              <ResultRow label="Total HBAR Paid"      value={`${r.total_hbar_paid} HBAR`} />
              <ResultRow label="PRCs Retired"         value={r.total_prcs_retired} />
              <div className="mt-3 pt-3 border-t border-black/[0.05]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">Data Integrity Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[#f0f0f0] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0A3D55]"
                      style={{ width: `${r.data_integrity ?? 0}%` }}
                    />
                  </div>
                  <span className="font-bold text-sm text-[#111]">{r.data_integrity ?? 0}%</span>
                </div>
                <p className="text-[10px] text-[#999] mt-1">Percentage of attestations anchored to HCS</p>
              </div>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ImpactAgent = () => {
  const [activeCard, setActiveCard]     = useState<ImpactQueryType>("network_stats");
  const [params, setParams]             = useState<Record<string, string>>({});
  const [lastResult, setLastResult]     = useState<AgentQueryResult | null>(null);
  const [historyOpen, setHistoryOpen]   = useState(false);

  const { data: agentStatus }   = useAgentStatus();
  const { data: conversations } = useAgentConversations(10);
  const submitQuery             = useSubmitImpactQuery();

  const selectedCard = QUERY_CARDS.find(c => c.type === activeCard)!;
  const Icon = ICONS[selectedCard.icon] ?? Globe;

  const handleQuery = async () => {
    try {
      const result = await submitQuery.mutateAsync({
        queryType: activeCard,
        params,
      });
      setLastResult(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Query failed");
    }
  };

  const setParam = (key: string, value: string) =>
    setParams(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-[#f8f9fb]" style={{ fontFamily: "'Host Grotesk', sans-serif" }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/25 rounded-full px-4 py-1.5 text-[#0A3D55] text-xs font-semibold mb-4">
            <Zap className="w-3 h-3" /> HCS-10 Impact Intelligence Agent
          </div>
          <h1 className="font-bold text-[#111] leading-tight mb-2" style={{ fontFamily: "'SUSE', sans-serif", fontSize: "clamp(1.8rem,4vw,2.5rem)", letterSpacing: "-1px" }}>
            Query on-chain impact data.
          </h1>
          <p className="text-[#555] text-base max-w-xl">
            Every query and response is anchored to Hedera Consensus Service. Corporate buyers can verify plastic recovery provenance without trusting PlastiCatch.
          </p>
        </div>

        {/* Agent identity card */}
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#0A3D55] flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-[#90E0EF]" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#111] text-sm" style={{ fontFamily: "'SUSE', sans-serif" }}>
                  PlastiCatch Impact Agent
                </p>
                <p className="text-xs text-[#999]">Hedera Consensus Service · HCS-10 Standard</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {agentStatus ? (
                <>
                  <a
                    href={accountUrl(agentStatus.agent_account)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-[#f5f7f9] rounded-full px-3 py-1.5 font-mono font-bold text-[#111] hover:bg-[#eef0f3] transition-colors"
                  >
                    {agentStatus.agent_account} <ExternalLink className="w-3 h-3 text-[#999]" />
                  </a>
                  <a
                    href={topicUrl(agentStatus.inbound_topic_id)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-[#f5f7f9] rounded-full px-3 py-1.5 font-mono font-bold text-[#111] hover:bg-[#eef0f3] transition-colors"
                  >
                    Inbound: {agentStatus.inbound_topic_id} <ExternalLink className="w-3 h-3 text-[#999]" />
                  </a>
                  <a
                    href={topicUrl(agentStatus.response_topic_id)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-[#f5f7f9] rounded-full px-3 py-1.5 font-mono font-bold text-[#111] hover:bg-[#eef0f3] transition-colors"
                  >
                    Response: {agentStatus.response_topic_id} <ExternalLink className="w-3 h-3 text-[#999]" />
                  </a>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold rounded-full px-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#999] text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting to agent…
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: query builder */}
          <div className="lg:col-span-2 space-y-4">

            {/* Query type selector */}
            <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
              <h2 className="font-bold text-sm text-[#111] mb-3" style={{ fontFamily: "'SUSE', sans-serif" }}>
                Select Query Type
              </h2>
              <div className="space-y-2">
                {QUERY_CARDS.map(card => {
                  const CardIcon = ICONS[card.icon] ?? Globe;
                  return (
                    <button
                      key={card.type}
                      onClick={() => { setActiveCard(card.type); setLastResult(null); setParams({}); }}
                      className={`w-full flex items-start gap-3 rounded-xl p-3 text-left transition-all ${
                        activeCard === card.type
                          ? "bg-[#0A3D55] text-white"
                          : "bg-[#f5f7f9] hover:bg-[#eef0f3] text-[#111]"
                      }`}
                    >
                      <CardIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${activeCard === card.type ? "text-[#90E0EF]" : "text-[#999]"}`} />
                      <div>
                        <p className={`text-sm font-semibold leading-tight ${activeCard === card.type ? "text-white" : "text-[#111]"}`}>
                          {card.label}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${activeCard === card.type ? "text-white/60" : "text-[#999]"}`}>
                          {card.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parameter fields */}
            {selectedCard.paramFields.length > 0 && (
              <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
                <h2 className="font-bold text-sm text-[#111] mb-3" style={{ fontFamily: "'SUSE', sans-serif" }}>
                  Parameters
                </h2>
                <div className="space-y-3">
                  {selectedCard.paramFields.map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#999] block mb-1">
                        {field.label} {field.required && <span className="text-[#e55]">*</span>}
                      </label>
                      {field.type === "zone" ? (
                        <Select value={params[field.key] ?? ""} onValueChange={v => setParam(field.key, v)}>
                          <SelectTrigger className="h-10 rounded-xl border-[#e0e0e0] text-sm">
                            <SelectValue placeholder="All zones" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All zones</SelectItem>
                            {GEOGRAPHIC_ZONES.map(z => (
                              <SelectItem key={z} value={z}>{z}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === "date" ? (
                        <input
                          type="date"
                          defaultValue={field.key === "from_date" ? defaultFrom() : defaultTo()}
                          onChange={e => setParam(field.key, e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-[#e0e0e0] text-sm text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={`Enter ${field.label.toLowerCase()}…`}
                          value={params[field.key] ?? ""}
                          onChange={e => setParam(field.key, e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-[#e0e0e0] text-sm text-[#111] focus:outline-none focus:border-[#111] transition-colors"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleQuery}
              disabled={submitQuery.isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitQuery.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Querying agent…</>
              ) : (
                <><Icon className="w-4 h-4" /> Send to Agent <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-[11px] text-center text-[#bbb]">
              Query and response are both posted to Hedera HCS topics in real time.
            </p>
          </div>

          {/* Right: results + history */}
          <div className="lg:col-span-3 space-y-5">

            <AnimatePresence mode="wait">
              {submitQuery.isPending && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border border-black/[0.07] bg-white p-10 text-center"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-[#90E0EF] mx-auto mb-3" />
                  <p className="font-semibold text-[#111] text-sm" style={{ fontFamily: "'SUSE', sans-serif" }}>
                    Querying agent…
                  </p>
                  <p className="text-xs text-[#999] mt-1">
                    Submitting to HCS inbound topic · executing query · anchoring response
                  </p>
                </motion.div>
              )}

              {!submitQuery.isPending && lastResult && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ResultCard result={lastResult} />
                </motion.div>
              )}

              {!submitQuery.isPending && !lastResult && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border-2 border-dashed border-black/[0.07] bg-white p-12 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-[#f5f7f9] flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-[#ccc]" />
                  </div>
                  <p className="font-semibold text-sm text-[#111]">Select a query type and send</p>
                  <p className="text-xs text-[#999] mt-1 max-w-xs mx-auto">
                    Results are verified on-chain with HashScan links for every query and response.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation history */}
            {(conversations ?? []).length > 0 && (
              <div className="rounded-2xl border border-black/[0.07] bg-white overflow-hidden">
                <button
                  onClick={() => setHistoryOpen(o => !o)}
                  className="w-full px-6 py-4 flex items-center justify-between border-b border-black/[0.06] hover:bg-[#fafafa] transition-colors"
                >
                  <span className="font-bold text-sm text-[#111]" style={{ fontFamily: "'SUSE', sans-serif" }}>
                    Conversation History ({conversations?.length ?? 0})
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#999] transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                </button>

                {historyOpen && (
                  <div className="divide-y divide-black/[0.04]">
                    {(conversations ?? []).map(conv => (
                      <div key={conv.id} className="px-6 py-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#f5f7f9] flex items-center justify-center flex-shrink-0">
                          {conv.status === "answered"
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            : conv.status === "error"
                            ? <AlertTriangle className="w-3.5 h-3.5 text-[#e55]" />
                            : <Clock className="w-3.5 h-3.5 text-[#999]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#111] truncate">
                            {conv.query_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-[11px] text-[#999]">{formatDate(conv.created_at)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {conv.response_sequence_number && conv.response_topic_id ? (
                            <a
                              href={topicMessageUrl(conv.response_topic_id, conv.response_sequence_number)}
                              target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-mono text-[#0A3D55] hover:underline flex items-center gap-0.5"
                            >
                              #{conv.response_sequence_number} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#bbb]">—</span>
                          )}
                          {conv.processing_ms && (
                            <p className="text-[10px] text-[#bbb] mt-0.5">{conv.processing_ms} ms</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImpactAgent;
