import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePrcMarketplace, useRetirePRCs } from "@/hooks/usePlastiCatchData";
import { CONTRACTS, isDeployed, contractExplorerUrl } from "@/lib/contracts";
import { toast } from "sonner";

type MarketplaceBatch = NonNullable<ReturnType<typeof usePrcMarketplace>["data"]>[number];

const PrcPurchase = () => {
  const { data: marketplace } = usePrcMarketplace();
  const { mutateAsync: retirePRCs, isPending: isRetiring } = useRetirePRCs();
  const [zoneFilter, setZoneFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState<MarketplaceBatch | null>(null);
  const [quantity, setQuantity] = useState("");
  const [purchased, setPurchased] = useState(false);

  const allBatches = marketplace ?? [];
  const filtered = allBatches.filter((p) => {
    if (zoneFilter !== "all" && p.zone !== zoneFilter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    return true;
  });

  const zones = [...new Set(allBatches.map((p) => p.zone))];
  const types = [...new Set(allBatches.map((p) => p.type))];

  const handlePurchase = async () => {
    if (!selectedBatch || !quantity) return;
    try {
      const result = await retirePRCs({
        user_id: localStorage.getItem("plasticatch-buyer") || undefined,
        company_name: localStorage.getItem("plasticatch-company") || "Demo Buyer",
        prcs_retired: parseInt(quantity),
        report_ref: `demo-tx-${Date.now()}`,
      });
      setPurchased(true);
      if (result.hashScanUrl) {
        toast.success(
          <span>
            PRC retirement anchored on Hedera!{" "}
            <a href={result.hashScanUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
              View on HashScan →
            </a>
          </span>
        );
      } else {
        toast.success("PRC purchase confirmed!");
      }
      setTimeout(() => { setPurchased(false); setSelectedBatch(null); setQuantity(""); }, 4000);
    } catch {
      toast.error("Purchase failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Host Grotesk', sans-serif" }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-12 pb-12 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/30 rounded-full px-4 py-1.5 text-[#0A3D55] text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 bg-[#90E0EF] rounded-full animate-pulse" />
              Verified Impact Credits · Hedera HTS
              {isDeployed(CONTRACTS.prcToken) && (
                <>
                  {" · "}
                  <a
                    href={contractExplorerUrl(CONTRACTS.prcToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 opacity-70 hover:opacity-100 font-mono text-[10px]"
                  >
                    {CONTRACTS.prcToken.slice(0, 8)}…{CONTRACTS.prcToken.slice(-4)}
                  </a>
                </>
              )}
            </div>
            <h1
              className="font-bold text-[#111] leading-none"
              style={{
                fontFamily: "'SUSE', sans-serif",
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                letterSpacing: '-3px',
              }}
            >
              PRC
              <br />
              Marketplace.
            </h1>
          </div>
          <p className="text-[#666] text-base leading-relaxed max-w-xs">
            Every credit represents one verified kilogram of ocean plastic recovered. Full chain-of-custody on Hedera.
          </p>
        </div>
      </section>

      <div className="border-t border-black/[0.07] mx-6 md:mx-10" />

      <main className="px-6 md:px-10 py-12 max-w-7xl mx-auto">
        <div className="space-y-8">
          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-[#999] font-medium">
              {filtered.length} batch{filtered.length !== 1 ? 'es' : ''} available
            </p>
            <div className="flex gap-2">
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-44 rounded-full border-black/[0.12] text-sm"><SelectValue placeholder="All Zones" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 rounded-full border-black/[0.12] text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="py-24 text-center">
              <Shield className="w-10 h-10 mx-auto mb-4 text-[#bbb]" />
              <p className="font-bold text-[#111] text-xl mb-2" style={{ fontFamily: "'SUSE', sans-serif" }}>
                No PRCs currently available
              </p>
              <p className="text-sm text-[#999] max-w-xs mx-auto">
                New batches appear as collectors submit verified recoveries.
              </p>
            </div>
          )}

          {/* Batch grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(batch => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="relative bg-[#f5f7f9] rounded-2xl p-6 cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-[#90E0EF]/30"
                  onClick={() => setSelectedBatch(batch)}
                >
                  <div className="flex items-center gap-1.5 text-[#666] text-xs mb-4">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="font-medium">{batch.zone}</span>
                  </div>
                  <span className="inline-block text-[9px] font-bold tracking-[2px] uppercase text-[#90E0EF] bg-[#90E0EF]/10 rounded-full px-3 py-1 mb-4">
                    {batch.type.replace(/_/g, " ")}
                  </span>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p
                        className="text-3xl font-black text-[#111] leading-none"
                        style={{ fontFamily: "'SUSE', sans-serif", letterSpacing: '-1px' }}
                      >
                        {batch.available.toLocaleString()}
                      </p>
                      <p className="text-xs text-[#999] mt-1">PRCs available</p>
                    </div>
                    <div>
                      <p
                        className="text-3xl font-black text-[#111] leading-none"
                        style={{ fontFamily: "'SUSE', sans-serif", letterSpacing: '-1px' }}
                      >
                        {batch.pricePerPrc}
                      </p>
                      <p className="text-xs text-[#999] mt-1">HBAR per PRC</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/[0.06]">
                    <span className="text-xs text-[#bbb]">Vintage {batch.vintage}</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0A3D55] bg-[#90E0EF]/10 rounded-full px-3 py-1.5">
                      <ShoppingCart className="h-3 w-3" /> Buy PRC
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Purchase Dialog */}
          <Dialog open={!!selectedBatch && !purchased} onOpenChange={(open) => !open && setSelectedBatch(null)}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'SUSE', sans-serif", letterSpacing: '-0.5px' }}>
                  Purchase PRCs
                </DialogTitle>
              </DialogHeader>
              {selectedBatch && (
                <div className="space-y-4 mt-2">
                  <div className="rounded-xl bg-[#f5f7f9] p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#999]">Zone</span>
                      <span className="font-semibold text-[#111]">{selectedBatch.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#999]">Plastic Type</span>
                      <span className="text-[9px] font-bold tracking-[2px] uppercase text-[#90E0EF] bg-[#90E0EF]/10 rounded-full px-3 py-1">
                        {selectedBatch.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#999]">Price</span>
                      <span className="font-bold text-[#111]">{selectedBatch.pricePerPrc} HBAR / PRC</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#444] uppercase tracking-wider">
                      Quantity (1 PRC = 1 kg)
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="1"
                      max={selectedBatch.available}
                      className="rounded-xl border-black/[0.12]"
                    />
                    <p className="text-xs text-[#999]">Max: {selectedBatch.available.toLocaleString()} PRCs available</p>
                  </div>

                  {quantity && parseFloat(quantity) > 0 && (
                    <div className="rounded-xl border border-[#90E0EF]/30 bg-[#90E0EF]/5 p-4">
                      <p className="font-bold text-[#111]" style={{ fontFamily: "'SUSE', sans-serif" }}>
                        Total: {(parseFloat(quantity) * selectedBatch.pricePerPrc).toFixed(2)} HBAR
                      </p>
                      <p className="text-xs text-[#999] mt-1">{quantity} kg verified ocean plastic from {selectedBatch.zone}</p>
                    </div>
                  )}

                  <Button
                    className="w-full rounded-full bg-[#111] hover:bg-[#333] text-white font-semibold gap-2"
                    onClick={handlePurchase}
                    disabled={!quantity || parseInt(quantity) < 1 || isRetiring}
                  >
                    {isRetiring ? 'Confirming…' : 'Confirm Purchase'}
                    {!isRetiring && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                        <path fill="currentColor" d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z" />
                      </svg>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrcPurchase;
