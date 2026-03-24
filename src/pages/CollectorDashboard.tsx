import { motion } from "framer-motion";
import { Wallet, TrendingUp, Calendar, Loader2, Fingerprint, MapPin, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCollectorAttestations,
  useNearbyStations,
  useCollectorProfile,
  useCollectorProfileById,
} from "@/hooks/usePlastiCatchData";

const collectorNav = [
  { label: "Dashboard", path: "/collector" },
];

const TIER_LABELS: Record<number, string> = { 1: "Starter", 2: "Active", 3: "Skilled", 4: "Expert", 5: "Champion" };

const StatCard = ({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) => (
  <div className={`rounded-2xl border p-6 ${accent ? "bg-[#0A3D55] border-[#0A3D55] text-white" : "bg-white border-black/[0.07]"}`}>
    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3 ${accent ? "text-white/60" : "text-[#999]"}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <p className="font-bold leading-none mb-1" style={{ fontFamily: "'SUSE', sans-serif", fontSize: 'clamp(1.6rem,3vw,2.25rem)', letterSpacing: '-1px' }}>
      {value}
    </p>
    {sub && <p className={`text-xs mt-1 ${accent ? "text-white/50" : "text-[#999]"}`}>{sub}</p>}
  </div>
);

const CollectorDashboard = () => {
  const { collector: stored } = useAuth();
  const collectorId = stored?.id;

  const { data: profileByUserId } = useCollectorProfile(stored?.user_id);
  const { data: profileById }     = useCollectorProfileById(stored?.id);
  const collectorProfile = profileByUserId || profileById;
  const { data: attestations, isLoading: loadingAtts } = useCollectorAttestations(collectorId);
  const { data: nearbyStations } = useNearbyStations(stored?.zone);

  const collector = collectorProfile || {
    id: collectorId || "new-collector",
    display_name: stored?.displayName || "New Collector",
    zone: stored?.zone || "—",
    total_kg_recovered: 0,
    total_hbar_earned: 0,
    reputation_tier: 1,
  };

  const today     = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const todayEarnings = (attestations || [])
    .filter(a => a.created_at?.startsWith(today))
    .reduce((s, a) => s + (a.payout_hbar ?? 0), 0);

  const monthEarnings = (attestations || [])
    .filter(a => a.created_at?.startsWith(thisMonth))
    .reduce((s, a) => s + (a.payout_hbar ?? 0), 0);

  const displayHistory = (attestations || []).slice(0, 10).map(a => ({
    id:       a.id,
    date:     a.created_at?.split("T")[0] ?? "",
    weightKg: (a.total_weight_grams ?? 0) / 1000,
    payout:   a.payout_hbar ?? 0,
    status:   a.status,
  }));

  const tier = (collector as any).reputation_tier ?? 1;

  return (
    <DashboardLayout
      title="Collector Dashboard"
      subtitle={`${collector.display_name} · ${stored?.zone || collector.zone}`}
      navItems={collectorNav}
      role="collector"
    >
      {/* Profile banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-black/[0.07] bg-white px-6 py-5 flex items-center gap-5 mb-8"
      >
        <div className="w-12 h-12 rounded-full bg-[#90E0EF]/20 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-[#0A3D55] text-lg" style={{ fontFamily: "'SUSE', sans-serif" }}>
            {(collector.display_name || "C")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#111] text-base truncate" style={{ fontFamily: "'SUSE', sans-serif" }}>
            {collector.display_name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-[#999] flex items-center gap-1"><MapPin className="w-3 h-3" /> {stored?.zone || collector.zone}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#90E0EF]/15 text-[#0A3D55] rounded-full px-2 py-0.5">
              Tier {tier} · {TIER_LABELS[tier] || "—"}
            </span>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-0.5">Hedera ID</p>
          <p className="font-mono text-sm font-bold text-[#111]">{stored?.hederaAccountId || "—"}</p>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Today's Earnings",  value: `${todayEarnings.toFixed(2)} HBAR`,                  sub: "From today's verified recoveries", icon: Wallet,     accent: true  },
          { label: "This Month",        value: `${monthEarnings.toFixed(2)} HBAR`,                   sub: "Month-to-date payout",             icon: Calendar,  accent: false },
          { label: "Lifetime",          value: `${Number(collector.total_hbar_earned).toFixed(2)} HBAR`, sub: `${Number(collector.total_kg_recovered).toFixed(1)} kg recovered`, icon: TrendingUp, accent: false },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery History */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-black/[0.07] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h2 className="font-bold text-[#111] text-sm" style={{ fontFamily: "'SUSE', sans-serif" }}>Recovery History</h2>
              {loadingAtts && <Loader2 className="h-4 w-4 animate-spin text-[#999]" />}
            </div>
            {displayHistory.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-[#f5f7f9] flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-5 h-5 text-[#ccc]" />
                </div>
                <p className="font-semibold text-sm text-[#111]">No recoveries yet</p>
                <p className="text-xs text-[#999] mt-1 max-w-xs mx-auto">Visit a nearby weighing station to submit your first plastic recovery.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    {["Date", "Weight", "Payout", "Status"].map(h => (
                      <th key={h} className={`px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999] ${h !== "Date" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayHistory.map((h) => (
                    <tr key={h.id} className="border-b border-black/[0.04] last:border-0 hover:bg-[#fafafa] transition-colors">
                      <td className="px-6 py-3.5 text-[#555] font-medium">{h.date}</td>
                      <td className="px-6 py-3.5 text-right text-[#555]">{Number(h.weightKg).toFixed(2)} kg</td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#0A3D55]">{Number(h.payout).toFixed(4)} HBAR</td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`inline-flex items-center text-[10px] font-bold rounded-full px-2.5 py-1 ${
                          h.status === "verified" || h.status === "confirmed"
                            ? "bg-[#90E0EF]/15 text-[#0A3D55]"
                            : "bg-[#f0f0f0] text-[#999]"
                        }`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Wallet card */}
          <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
            <h3 className="font-bold text-sm text-[#111] mb-4 flex items-center gap-2" style={{ fontFamily: "'SUSE', sans-serif" }}>
              <Wallet className="w-4 h-4 text-[#90E0EF]" /> Hedera Wallet
            </h3>
            <div className="rounded-xl bg-[#f5f7f9] p-4 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">Account ID</p>
              <p className="font-mono font-bold text-[#111]">{stored?.hederaAccountId || "—"}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#999]">
              <Fingerprint className="w-3.5 h-3.5 text-[#90E0EF]" />
              PlastiCatch Managed · Hedera Testnet
            </div>
          </div>

          {/* Nearby stations */}
          {(nearbyStations ?? []).length > 0 && (
            <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
              <h3 className="font-bold text-sm text-[#111] mb-4 flex items-center gap-2" style={{ fontFamily: "'SUSE', sans-serif" }}>
                <MapPin className="w-4 h-4 text-[#90E0EF]" /> Nearby Stations
              </h3>
              <div className="space-y-3">
                {(nearbyStations ?? []).map((st) => (
                  <div key={st.id} className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#90E0EF] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#111]">{st.name}</p>
                      <p className="text-xs text-[#999]">{st.distance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CollectorDashboard;
