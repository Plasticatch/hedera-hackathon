import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RoleGuardProps {
  children: ReactNode;
  role: "collector" | "station";
}

const ONBOARDING_PATHS = {
  collector: "/collector/onboarding",
  station:   "/station/onboarding",
};

const RoleGuard = ({ children, role }: RoleGuardProps) => {
  const { collector, station } = useAuth();
  const ok = role === "collector" ? !!collector : !!station;
  if (!ok) return <Navigate to={ONBOARDING_PATHS[role]} replace />;
  return <>{children}</>;
};

export default RoleGuard;
