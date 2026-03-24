import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, Users, Wallet, Plus, CheckCircle, Clock, Inbox, MapPin, Fingerprint, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useStationProfile, useStationSubmissions } from "@/hooks/usePlastiCatchData";

const stationNav = [
  { label: "Dashboard", path: "/station" },
  { label: "New Submission", path: "/station/submit" },
];

const StatCard = ({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: boolean;
}) => (
  <div className={`rounded-2xl border p-6 ${accent ? "bg-[#0A3D55] border-[#0A3D55] text-white" : "bg-white border-black/[0.07]"}`}>
    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3 ${accent ? "text-white/60" : "text-[#999]"}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <p className="font-bold leading-none mb-1" style={{ fontFamily: "'SUSE', sans-serif", fontSize: "clamp(1.6rem,3vw,2.25rem)", letterSpacing: "-1px" }}>
      {value}
    </p>
    {sub && <p className={`text-xs mt-1 ${accent ? "text-white/50" : "text-[#999]"}`}>{sub}</p>}
  </div>
);

const StationDashboard = () => {
  const { station: stored } = useAuth();
  const { data: stationProfile } = useStationProfile(stored?.user_id);

  const station = stationProfile ?? stored;
  const stationId = stationProfile?.id ?? stored?.id;
  const { data: submissions } = useStationSubmissions(stationId);

  const subs = submissions ?? [];
  const facilityName = (station as any)?.facility_name ?? stored?.facility_name ?? "Your Station";
  const zone         = (station as any)?.zone ?? stored?.zone ?? "—";
  const stakeAmount  = (station as any)?.stake_amount ?? 0;

  const verifiedToday = subs.filter((s: any) => s.status === "verified");
  const todayKg = verifiedToday.reduce((sum: number, s: any) => sum + ((s.total_weight_grams ?? 0) / 1000), 0);
  const activeCollectors = new Set(subs.map((s: any) => s.collector_id ?? s.collector)).size;

  return (
    <DashboardLayout
      title="Station Portal"
      subtitle={`${facilityName} · ${zone}`}
      navItems={stationNav}
      role="station"
    >
      {/* Profile banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-black/[0.07] bg-white px-6 py-5 flex items-center gap-5 mb-8"
      >
        <div className="w-12 h-12 rounded-full bg-[#90E0EF]/20 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-[#0A3D55] text-lg" style={{ fontFamily: "'SUSE', sans-serif" }}>
            {(facilityName || "S")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#111] text-base truncate" style={{ fontFamily: "'SUSE', sans-serif" }}>
            {facilityName}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-[#999] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {zone}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">
              Active Station
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Link
            to="/station/submit"
            className="flex items-center gap-2 bg-[#0A3D55] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Submission
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Today's Volume",     value: `${todayKg.toFixed(1)} kg`,     sub: "Verified plastic today",   icon: Scale,  accent: true  },
          { label: "Active Collectors", value: activeCollectors,                 sub: "Unique collectors today",  icon: Users,  accent: false },
          { label: "Stake Amount",       value: `${stakeAmount} HBAR`,           sub: "Active stake on protocol", icon: Wallet, accent: false },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions table */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-black/[0.07] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h2 className="font-bold text-[#111] text-sm" style={{ fontFamily: "'SUSE', sans-serif" }}>
                Today's Submissions
              </h2>
              <Link
                to="/station/submit"
                className="flex items-center gap-1 text-xs font-semibold text-[#0A3D55] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </Link>
            </div>

            {subs.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-[#f5f7f9] flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-5 h-5 text-[#ccc]" />
                </div>
                <p className="font-semibold text-sm text-[#111]">No submissions yet</p>
                <p className="text-xs text-[#999] mt-1 max-w-xs mx-auto">
                  Record plastic recoveries when collectors arrive at your station.
                </p>
                <Link
                  to="/station/submit"
                  className="inline-flex items-center gap-2 mt-4 bg-[#0A3D55] text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" /> New Submission
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    {["Time", "Collector", "Weight", "Payout", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999] ${i === 0 || i === 1 ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s: any) => {
                    const status   = s.status ?? "pending";
                    const verified = status === "verified" || status === "confirmed";
                    const collector = s.collectors
                      ? s.collectors.display_name ?? s.collectors.hedera_account_id
                      : (s.collector_id ?? "—");
                    const weightKg  = ((s.total_weight_grams ?? 0) / 1000).toFixed(2);
                    const payout    = Number(s.payout_hbar ?? 0).toFixed(4);
                    const time      = s.created_at
                      ? new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—";
                    return (
                      <tr key={s.id} className="border-b border-black/[0.04] last:border-0 hover:bg-[#fafafa] transition-colors">
                        <td className="px-6 py-3.5 text-[#555] font-medium">{time}</td>
                        <td className="px-6 py-3.5 text-[#555] font-medium max-w-[140px] truncate">{collector}</td>
                        <td className="px-6 py-3.5 text-right text-[#555]">{weightKg} kg</td>
                        <td className="px-6 py-3.5 text-right font-bold text-[#0A3D55]">{payout} HBAR</td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 ${
                            verified
                              ? "bg-[#90E0EF]/15 text-[#0A3D55]"
                              : "bg-[#f0f0f0] text-[#999]"
                          }`}>
                            {verified
                              ? <CheckCircle className="w-3 h-3" />
                              : <Clock className="w-3 h-3" />}
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
              HashPack Connected · Hedera Testnet
            </div>
          </div>

          {/* Quick action */}
          <div className="rounded-2xl border border-[#90E0EF]/30 bg-[#90E0EF]/5 p-5">
            <h3 className="font-bold text-sm text-[#0A3D55] mb-2" style={{ fontFamily: "'SUSE', sans-serif" }}>
              Ready to record?
            </h3>
            <p className="text-xs text-[#555] mb-4">
              When a collector arrives, weigh their plastic and submit an attestation.
            </p>
            <Link
              to="/station/submit"
              className="flex items-center justify-center gap-2 bg-[#0A3D55] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity w-full"
            >
              New Submission <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StationDashboard;
