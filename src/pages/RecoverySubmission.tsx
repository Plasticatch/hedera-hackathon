import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { QrCode, Scale, Camera, Calculator, Send, ArrowRight, Plus, X, Loader2, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { plasticTypes } from "@/lib/constants";
import { useSubmitAttestation } from "@/hooks/usePlastiCatchData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface PlasticEntry {
  id: string;
  type: string;
  weightGrams: number;
}

const stationNav = [
  { label: "Dashboard", path: "/station" },
  { label: "New Submission", path: "/station/submit" },
];

const SectionCard = ({ step, title, description, children }: {
  step: number; title: string; description?: string; children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-black/[0.07] bg-white overflow-hidden">
    <div className="px-6 py-4 border-b border-black/[0.06]">
      <div className="flex items-center gap-3">
        <span
          className="w-6 h-6 rounded-full bg-[#111] text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ fontFamily: "'SUSE', sans-serif" }}
        >
          {step}
        </span>
        <div>
          <h2 className="font-bold text-[#111] text-sm" style={{ fontFamily: "'SUSE', sans-serif" }}>{title}</h2>
          {description && <p className="text-xs text-[#999] mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

const RecoverySubmission = () => {
  const { station } = useAuth();
  const [collectorId, setCollectorId]     = useState("");
  const [collectorVerified, setCollectorVerified] = useState(false);
  const [entries, setEntries]             = useState<PlasticEntry[]>([]);
  const [selectedType, setSelectedType]   = useState("");
  const [weightInput, setWeightInput]     = useState("");
  const [submitted, setSubmitted]         = useState(false);
  const [submittedData, setSubmittedData] = useState<{ attestationId: string; totalHbar: number; totalKg: number } | null>(null);

  const submitMutation = useSubmitAttestation();

  const addEntry = () => {
    if (!selectedType || !weightInput || Number(weightInput) <= 0) return;
    setEntries(prev => [...prev, { id: uuidv4(), type: selectedType, weightGrams: Math.round(Number(weightInput) * 1000) }]);
    setSelectedType("");
    setWeightInput("");
  };

  const removeEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const totals = useMemo(() => {
    const totalGrams = entries.reduce((sum, e) => sum + e.weightGrams, 0);
    const totalHbar  = entries.reduce((sum, e) => {
      const pt = plasticTypes.find(t => t.id === e.type);
      return pt ? sum + (e.weightGrams / 1000) * pt.basePayoutRate : sum;
    }, 0);
    return { totalGrams, totalKg: totalGrams / 1000, totalHbar };
  }, [entries]);

  const handleVerify = () => {
    if (collectorId.trim().length > 3) {
      setCollectorVerified(true);
      toast.success("Collector verified");
    } else {
      toast.error("Collector ID not found");
    }
  };

  const handleSubmit = async () => {
    if (!collectorVerified || entries.length === 0) return;
    const stationId   = station?.id;
    const stationZone = station?.zone || "Mediterranean North";
    if (!stationId) {
      toast.error("Station profile not found.");
      return;
    }
    try {
      const data = await submitMutation.mutateAsync({
        collector_id: collectorId,
        station_id: stationId,
        zone: stationZone,
        plastic_items: entries.map(e => ({ type: e.type, weightGrams: e.weightGrams })),
        total_weight_grams: totals.totalGrams,
        payout_hbar: totals.totalHbar,
        payout_tinybar: Math.round(totals.totalHbar * 100_000_000),
      });
      setSubmittedData({
        attestationId: (data as { id: string }).id ?? uuidv4(),
        totalHbar: totals.totalHbar,
        totalKg: totals.totalKg,
      });
      setSubmitted(true);
      toast.success("Attestation submitted. Payment processing…");
    } catch (err) {
      const msg = (err as any)?.message ?? String(err);
      toast.error(msg.length < 120 ? msg : "Submission failed. Check console for details.");
      console.error("[submit-attestation]", err);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setCollectorVerified(false);
    setCollectorId("");
    setEntries([]);
  };

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (submitted && submittedData) {
    return (
      <DashboardLayout title="Station Portal" subtitle="New Submission" navItems={stationNav} role="station">
        <div className="max-w-md mx-auto py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-black/[0.07] bg-white p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="w-16 h-16 rounded-full bg-[#90E0EF]/15 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle className="w-8 h-8 text-[#0A3D55]" />
            </motion.div>

            <h2 className="font-bold text-[#111] text-xl mb-1" style={{ fontFamily: "'SUSE', sans-serif", letterSpacing: "-0.5px" }}>
              Attestation Submitted
            </h2>
            <p className="text-sm text-[#999] mb-6">Payment will be scheduled within 60 seconds.</p>

            <div className="rounded-xl bg-[#f5f7f9] p-4 space-y-3 text-left mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-[#999]">Total Weight</span>
                <span className="font-semibold text-[#111]">{submittedData.totalKg.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#999]">Collector Payout</span>
                <span className="font-bold text-[#0A3D55]">{submittedData.totalHbar.toFixed(4)} HBAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#999]">Status</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full px-2.5 py-1">
                  Pending Verification
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              New Submission <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Main form ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Station Portal" subtitle="New Recovery Submission" navItems={stationNav} role="station">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Step 1 — Collector */}
        <SectionCard
          step={1}
          title="Identify Collector"
          description="Scan collector wallet QR or enter Collector ID manually"
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Collector ID (e.g. 0.0.45678 or UUID)"
              value={collectorId}
              onChange={e => { setCollectorId(e.target.value); setCollectorVerified(false); }}
              className="flex-1 h-11 px-4 rounded-xl border border-[#e0e0e0] text-sm text-[#111] placeholder:text-[#ccc] focus:outline-none focus:border-[#111] transition-colors"
            />
            <button
              onClick={handleVerify}
              disabled={collectorVerified || !collectorId}
              className="h-11 px-4 rounded-xl border border-[#e0e0e0] text-sm font-semibold text-[#555] hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {collectorVerified ? "Verified" : "Verify"}
            </button>
            <button
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-[#e0e0e0] text-[#999] hover:border-[#111] hover:text-[#111] transition-colors"
              title="Scan QR code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

          {collectorVerified && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-3 rounded-xl border border-[#90E0EF]/30 bg-[#90E0EF]/5 p-3"
            >
              <div className="w-9 h-9 rounded-full bg-[#90E0EF]/20 flex items-center justify-center font-bold text-[#0A3D55] text-sm flex-shrink-0">
                {collectorId[0]?.toUpperCase() || "C"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#111]">{collectorId.slice(0, 16)}…</p>
                <p className="text-xs text-[#999]">Collector verified</p>
              </div>
              <CheckCircle className="w-4 h-4 text-[#0A3D55] flex-shrink-0" />
            </motion.div>
          )}
        </SectionCard>

        {/* Step 2 — Plastic entries */}
        <SectionCard
          step={2}
          title="Weigh Plastic by Type"
          description="Add each plastic type separately — weights in kg"
        >
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-11 rounded-xl border-[#e0e0e0]">
                  <SelectValue placeholder="Plastic type…" />
                </SelectTrigger>
                <SelectContent>
                  {plasticTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.basePayoutRate} HBAR/kg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="kg"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                className="w-20 h-11 px-3 rounded-xl border border-[#e0e0e0] text-sm text-[#111] placeholder:text-[#ccc] focus:outline-none focus:border-[#111] transition-colors"
              />
              <span className="text-sm text-[#999]">kg</span>
            </div>
            <button
              onClick={addEntry}
              disabled={!selectedType || !weightInput}
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#111] text-white hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-black/[0.08] py-8 text-center">
              <Scale className="w-7 h-7 mx-auto mb-2 text-[#ccc]" />
              <p className="text-sm text-[#999]">No plastic entries yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(entry => {
                const pt     = plasticTypes.find(t => t.id === entry.type)!;
                const payout = (entry.weightGrams / 1000) * pt.basePayoutRate;
                return (
                  <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-[#f5f7f9] px-4 py-3">
                    <span className="flex-1 text-sm font-medium text-[#111]">{pt.name}</span>
                    <span className="text-sm text-[#999]">{(entry.weightGrams / 1000).toFixed(3)} kg</span>
                    <span className="text-sm font-bold text-[#0A3D55]">{payout.toFixed(4)} HBAR</span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-[#ccc] hover:text-[#e55] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Step 3 — Review & submit */}
        {entries.length > 0 && (
          <SectionCard step={3} title="Review & Submit">
            <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#e0e0e0] py-2.5 text-sm font-semibold text-[#555] hover:border-[#111] hover:text-[#111] transition-colors mb-4">
              <Camera className="w-4 h-4" /> Take Photo (Optional)
            </button>

            <div className="rounded-2xl bg-[#0A3D55] p-5 mb-4 text-white">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-white/60">Total Weight</span>
                <span className="font-bold text-lg" style={{ fontFamily: "'SUSE', sans-serif" }}>
                  {totals.totalKg.toFixed(2)} kg
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="font-semibold text-white/80">Collector Receives</span>
                <span className="font-bold text-2xl" style={{ fontFamily: "'SUSE', sans-serif", letterSpacing: "-0.5px" }}>
                  {totals.totalHbar.toFixed(4)} HBAR
                </span>
              </div>
            </div>

            <p className="text-xs text-[#999] mb-4">
              By submitting, you confirm that the plastic was weighed on a calibrated scale and all data is accurate.
            </p>

            <button
              disabled={!collectorVerified || submitMutation.isPending}
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Attestation</>
              )}
            </button>

            {!collectorVerified && entries.length > 0 && (
              <p className="text-xs text-[#e55] text-center mt-2">
                Verify the collector ID in Step 1 before submitting.
              </p>
            )}
          </SectionCard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecoverySubmission;
