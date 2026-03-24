// src/contexts/AuthContext.tsx
// Single source of truth for collector + station session state.
// Reads/writes localStorage and exposes signOut for both roles.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CollectorSession = {
  id: string;
  user_id: string;
  hederaAccountId: string;
  zone: string;
  displayName: string;
};

export type StationSession = {
  id: string;
  user_id: string;
  hederaAccountId: string;
  facility_name: string;
  zone: string;
  accepted_types: string[];
  status: string;
};

interface AuthCtx {
  collector: CollectorSession | null;
  station: StationSession | null;
  setCollector: (c: CollectorSession) => void;
  setStation: (s: StationSession) => void;
  signOut: (role: "collector" | "station") => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

const KEYS = {
  collector: "plasticatch-collector",
  station:   "plasticatch-station",
} as const;

function parse<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [collector, setCollectorState] = useState<CollectorSession | null>(null);
  const [station, setStationState]     = useState<StationSession | null>(null);

  useEffect(() => {
    setCollectorState(parse<CollectorSession>(KEYS.collector));
    setStationState(parse<StationSession>(KEYS.station));
  }, []);

  const setCollector = (c: CollectorSession) => {
    localStorage.setItem(KEYS.collector, JSON.stringify(c));
    setCollectorState(c);
  };

  const setStation = (s: StationSession) => {
    localStorage.setItem(KEYS.station, JSON.stringify(s));
    setStationState(s);
  };

  const signOut = (role: "collector" | "station") => {
    localStorage.removeItem(KEYS[role]);
    if (role === "collector") setCollectorState(null);
    else setStationState(null);
  };

  return (
    <AuthContext.Provider value={{ collector, station, setCollector, setStation, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
