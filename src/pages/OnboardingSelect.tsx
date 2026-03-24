import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Building2, ArrowRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const OnboardingSelect = () => {
  const navigate = useNavigate();
  const { collector, station } = useAuth();

  // Auto-redirect if only one role is active
  useEffect(() => {
    if (collector && !station) navigate("/collector", { replace: true });
    else if (station && !collector) navigate("/station", { replace: true });
  }, [collector, station, navigate]);

  const handleCollector = () => {
    navigate(collector ? "/collector" : "/collector/onboarding");
  };

  const handleStation = () => {
    navigate(station ? "/station" : "/station/onboarding");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Host Grotesk', sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06]">
        <a href="/" className="font-bold text-[#111] text-lg tracking-tight" style={{ fontFamily: "'SUSE', sans-serif" }}>
          PlastiCatch
        </a>
        <a href="/" className="flex items-center gap-1 text-sm text-[#555] hover:text-[#111] transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> Back to home
        </a>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/25 rounded-full px-4 py-1.5 text-[#0A3D55] text-xs font-semibold mb-4">
              Join PlastiCatch
            </div>
            <h1
              className="font-bold text-[#111] leading-tight mb-3"
              style={{ fontFamily: "'SUSE', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", letterSpacing: "-1px" }}
            >
              How do you want to participate?
            </h1>
            <p className="text-[#999] text-sm">Choose your role to get started or sign back in.</p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Collector card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCollector}
              className="group relative text-left rounded-2xl border-2 border-black/[0.07] bg-white p-6 hover:border-[#90E0EF] hover:shadow-[0_4px_24px_rgba(144,224,239,0.2)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#90E0EF]/15 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-[#0A3D55]" />
              </div>
              <h2 className="font-bold text-[#111] text-lg mb-1" style={{ fontFamily: "'SUSE', sans-serif" }}>
                {collector ? "My Collector Dashboard" : "Join as Collector"}
              </h2>
              <p className="text-[#777] text-sm leading-relaxed mb-4">
                {collector
                  ? `Signed in as ${collector.hederaAccountId}`
                  : "Collect ocean plastic and earn HBAR. We create your Hedera wallet — no extension needed."
                }
              </p>
              <div className="flex items-center gap-1.5 text-[#0A3D55] text-sm font-semibold">
                {collector ? "Go to dashboard" : "Start onboarding"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>

            {/* Station card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStation}
              className="group relative text-left rounded-2xl border-2 border-black/[0.07] bg-white p-6 hover:border-[#90E0EF] hover:shadow-[0_4px_24px_rgba(144,224,239,0.2)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#90E0EF]/15 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-[#0A3D55]" />
              </div>
              <h2 className="font-bold text-[#111] text-lg mb-1" style={{ fontFamily: "'SUSE', sans-serif" }}>
                {station ? "My Station Dashboard" : "Register a Station"}
              </h2>
              <p className="text-[#777] text-sm leading-relaxed mb-4">
                {station
                  ? `Signed in as ${station.facility_name}`
                  : "Operate a weighing station. Connect your HashPack wallet and stake 500 HBAR as a fraud bond."
                }
              </p>
              <div className="flex items-center gap-1.5 text-[#0A3D55] text-sm font-semibold">
                {station ? "Go to dashboard" : "Start registration"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          </div>

          {/* Sign-in note */}
          <p className="text-center text-xs text-[#aaa] mt-8">
            Already registered?{" "}
            <a href="/collector/onboarding" className="text-[#0A3D55] font-medium hover:underline">
              Collector sign-in
            </a>
            {" · "}
            <a href="/station/onboarding" className="text-[#0A3D55] font-medium hover:underline">
              Station sign-in
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingSelect;
