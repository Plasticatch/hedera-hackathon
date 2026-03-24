import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Landing from "./pages/Landing";
import CollectorDashboard from "./pages/CollectorDashboard";
import CollectorOnboarding from "./pages/CollectorOnboarding";
import StationDashboard from "./pages/StationDashboard";
import StationOnboarding from "./pages/StationOnboarding";
import OnboardingSelect from "./pages/OnboardingSelect";
import RecoverySubmission from "./pages/RecoverySubmission";
import PrcPurchase from "./pages/PrcPurchase";
import Leaderboard from "./pages/Leaderboard";
import ImpactAgent from "./pages/ImpactAgent";
import NotFound from "./pages/NotFound";
import RoleGuard from "./components/RoleGuard";
import { AuthProvider } from "./contexts/AuthContext";

gsap.registerPlugin(ScrollTrigger);

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    return () => { lenis.destroy(); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<OnboardingSelect />} />
            <Route path="/collector/onboarding" element={<CollectorOnboarding />} />
            <Route path="/collector" element={<RoleGuard role="collector"><CollectorDashboard /></RoleGuard>} />
            <Route path="/station/onboarding" element={<StationOnboarding />} />
            <Route path="/station/submit" element={<RoleGuard role="station"><RecoverySubmission /></RoleGuard>} />
            <Route path="/station" element={<RoleGuard role="station"><StationDashboard /></RoleGuard>} />
            <Route path="/credits" element={<PrcPurchase />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/impact-agent" element={<ImpactAgent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
