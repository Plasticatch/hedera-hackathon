import { useEffect, useState, type FC } from "react";
import { motion } from "framer-motion";
import { Building2, Shield, CheckCircle, ArrowRight, Loader2, Search, ChevronLeft, Wallet, X, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { plasticTypes } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useRegisterStation } from "@/hooks/usePlastiCatchData";
import { initHashConnect, resetHashConnect } from "@/lib/hedera/hashconnect";
import { GEOGRAPHIC_ZONES } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STEPS = [
  { key: "info",     label: "Facility Info" },
  { key: "stake",    label: "Stake Deposit" },
  { key: "complete", label: "Done" },
] as const;
type StepKey = typeof STEPS[number]["key"];

// ─── Shared header ────────────────────────────────────────────────────────────
const OnboardingHeader: FC<{ onBack?: () => void }> = ({ onBack }) => (
  <header className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06]">
    <a href="/" className="font-bold text-[#111] text-lg tracking-tight" style={{ fontFamily: "'SUSE', sans-serif" }}>
      PlastiCatch
    </a>
    {onBack ? (
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#555] hover:text-[#111] transition-colors font-medium">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
    ) : (
      <a href="/" className="flex items-center gap-1 text-sm text-[#555] hover:text-[#111] transition-colors font-medium">
        <ChevronLeft className="h-4 w-4" /> Back to home
      </a>
    )}
  </header>
);

// ─── Stepper ──────────────────────────────────────────────────────────────────
const Stepper: FC<{ steps: { label: string }[]; current: number }> = ({ steps, current }) => (
  <div className="flex items-center justify-center gap-0 mb-10">
    {steps.map((s, i) => {
      const done   = i < current;
      const active = i === current;
      return (
        <div key={s.label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done ? "bg-[#90E0EF] text-[#0A3D55]" : active ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#bbb]"
              }`}
              style={{ fontFamily: "'SUSE', sans-serif" }}
            >
              {done ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-[11px] font-semibold whitespace-nowrap ${active ? "text-[#111]" : "text-[#bbb]"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 h-px mb-5 mx-2 ${done ? "bg-[#90E0EF]" : "bg-[#e8e8e8]"}`} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const StationOnboarding = () => {
  const [step, setStep]                 = useState<StepKey>("info");
  const [facilityName, setFacilityName] = useState("");
  const [address, setAddress]           = useState("");
  const [zone, setZone]                 = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [acceptedTypes, setAcceptedTypes] = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [stationHederaId, setStationHederaId] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState<Parameters<typeof setStation>[0] | null>(null);
  const [errors, setErrors]             = useState<{ facilityName?: string; zone?: string; facilityType?: string; wallet?: string; password?: string; confirmPassword?: string }>({});

  // Password fields (registration)
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // HashConnect wallet state
  const [walletConnected, setWalletConnected]   = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState("");
  const [connectingWallet, setConnectingWallet] = useState(false);

  // Sign-in state
  const [signingIn, setSigningIn]         = useState(false);
  const [searchName, setSearchName]       = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    id: string; user_id: string; facility_name: string; zone: string;
    hedera_account_id: string | null; accepted_types: string[]; status: string;
  }>>([]);
  const [searching, setSearching]         = useState(false);
  // After selecting a station result, ask for password before granting access
  const [pendingStation, setPendingStation] = useState<typeof searchResults[0] | null>(null);
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPw, setShowSignInPw]     = useState(false);
  const [signInError, setSignInError]       = useState("");
  const [verifying, setVerifying]           = useState(false);

  const navigate = useNavigate();
  const registerStation = useRegisterStation();
  const { station, setStation } = useAuth();

  // Redirect if already registered
  useEffect(() => {
    if (station) navigate("/station", { replace: true });
  }, [station, navigate]);

  const currentIndex = STEPS.findIndex(s => s.key === step);

  const toggleType = (id: string) =>
    setAcceptedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  // ── HashConnect ─────────────────────────────────────────────────────────────
  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    setErrors(e => ({ ...e, wallet: undefined }));
    try {
      const hc = await initHashConnect();

      // If already connected from a previous session
      const existing = (hc as any).connectedAccountIds ?? [];
      if (existing.length > 0) {
        const id = String(existing[0]);
        setConnectedAccountId(id);
        setWalletConnected(true);
        toast.success(`Wallet connected: ${id}`);
        return;
      }

      // New pairing
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timed out")), 120_000);
        (hc as any).pairingEvent?.on((data: any) => {
          clearTimeout(timeout);
          const id: string = data?.accountIds?.[0] ?? data?.accountId ?? "";
          if (id) {
            setConnectedAccountId(id);
            setWalletConnected(true);
            toast.success(`Wallet connected: ${id}`);
            resolve();
          } else {
            reject(new Error("No account ID received"));
          }
        });
        (hc as any).openPairingModal?.();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed";
      setErrors(e => ({ ...e, wallet: msg }));
      toast.error(msg);
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleDisconnectWallet = () => {
    resetHashConnect();
    setWalletConnected(false);
    setConnectedAccountId("");
  };

  // ── Station search (sign-in) ─────────────────────────────────────────────
  const handleStationSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("weighing_stations")
      .select("id, user_id, facility_name, zone, hedera_account_id, accepted_types, status")
      .ilike("facility_name", `%${searchName}%`)
      .limit(5);
    setSearchResults(data ?? []);
    setSearching(false);
  };

  const handleStationSelect = (s: typeof searchResults[0]) => {
    setPendingStation(s);
    setSignInPassword("");
    setSignInError("");
  };

  const handleVerifySignIn = async () => {
    if (!pendingStation || !signInPassword) return;
    setVerifying(true);
    setSignInError("");
    try {
      const { data, error } = await supabase.rpc("verify_station_signin", {
        p_station_id: pendingStation.id,
        p_password: signInPassword,
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        setSignInError("Incorrect password.");
        return;
      }
      const row = data[0];
      setStation({
        id: row.id,
        user_id: row.user_id,
        hederaAccountId: row.hedera_account_id ?? "",
        facility_name: row.facility_name,
        zone: row.zone,
        accepted_types: row.accepted_types,
        status: row.status,
      });
      toast.success(`Welcome back, ${row.facility_name}!`);
      navigate("/station");
    } catch (err) {
      const msg = (err as any)?.message ?? String(err) ?? "Sign in failed";
      setSignInError(msg.length < 120 ? msg : "Sign in failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs: typeof errors = {};
    if (!walletConnected) errs.wallet = "Connect your Hedera wallet to continue";
    if (!facilityName.trim()) errs.facilityName = "Facility name is required";
    if (!zone) errs.zone = "Please select a zone";
    if (!facilityType) errs.facilityType = "Please select a facility type";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password && confirmPassword !== password) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmitApplication = async () => {
    setSubmitting(true);
    try {
      const userId = crypto.randomUUID();
      await registerStation.mutateAsync({
        user_id: userId,
        facility_name: facilityName,
        physical_address: address,
        zone,
        facility_type: facilityType,
        accepted_types: acceptedTypes,
        operating_hours: "06:00-18:00, Mon-Sat",
        hedera_account_id: connectedAccountId,
        password,
      });
      setStationHederaId(connectedAccountId);
      setPendingRegistration({
        id: crypto.randomUUID(),
        user_id: userId,
        hederaAccountId: connectedAccountId,
        facility_name: facilityName,
        zone,
        accepted_types: acceptedTypes,
        status: "active",
      });
      toast.success("Station registered successfully!");
      setStep("complete");
    } catch (err) {
      const msg = (err as any)?.message ?? (err as any)?.error_description ?? String(err);
      toast.error(msg.length < 150 ? msg : "Registration failed — check console");
      console.error("[register-station]", err);
    } finally {
      setSubmitting(false);
    }
  };

  const ArrowIcon = () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
      <path fill="currentColor" d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z" />
    </svg>
  );

  const FieldLabel: FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
    <label className="text-xs font-semibold uppercase tracking-wider text-[#999] block mb-1.5">
      {children}{required && <span className="text-[#e55] ml-0.5">*</span>}
    </label>
  );

  const FieldError: FC<{ msg?: string }> = ({ msg }) =>
    msg ? (
      <p className="text-xs text-[#e55] mt-1.5 flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 12 12">
          <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9a.75.75 0 110-1.5A.75.75 0 016 9zm.75-3.75a.75.75 0 01-1.5 0V3.75a.75.75 0 011.5 0v1.5z" />
        </svg>
        {msg}
      </p>
    ) : null;

  const inputCls = "h-11 rounded-xl border-[#e0e0e0] focus:border-[#111] focus:ring-0 text-[#111] placeholder:text-[#ccc] text-sm";

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Host Grotesk', sans-serif" }}>
      <OnboardingHeader onBack={step !== "info" ? () => {
        if (step === "stake") setStep("info");
        else if (step === "complete") setStep("stake");
      } : undefined} />

      <div className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/25 rounded-full px-4 py-1.5 text-[#0A3D55] text-xs font-semibold mb-4">
              <Building2 className="w-3 h-3" /> Station Registration
            </div>
            <h1 className="font-bold text-[#111] leading-tight" style={{ fontFamily: "'SUSE', sans-serif", fontSize: 'clamp(1.6rem,4vw,2.25rem)', letterSpacing: '-1px' }}>
              Register a Station
            </h1>
            <p className="text-[#999] text-sm mt-2">Join the PlastiCatch network as a verified weighing station</p>
          </div>

          {/* Stepper */}
          <Stepper steps={STEPS as unknown as { label: string }[]} current={currentIndex} />

          {/* Step content */}
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

            {/* Step 1 — Facility Info */}
            {step === "info" && (
              <div className="space-y-5">

                {/* Sign in toggle */}
                {!signingIn ? (
                  <div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-sm text-[#666]">
                    Already registered?{" "}
                    <button className="text-[#111] font-semibold underline underline-offset-2" onClick={() => setSigningIn(true)}>
                      Sign in to existing station
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#90E0EF]/30 bg-[#90E0EF]/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#0A3D55] flex items-center gap-2">
                      <Search className="h-4 w-4" /> Find your station by name
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Station or facility name…"
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleStationSearch()}
                        className={inputCls}
                      />
                      <button
                        onClick={handleStationSearch}
                        disabled={searching || !searchName.trim()}
                        className="px-4 py-2 rounded-xl bg-[#111] text-white text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-40"
                      >
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                      </button>
                    </div>
                    {searchResults.length > 0 && !pendingStation && (
                      <div className="space-y-2">
                        {searchResults.map(s => (
                          <button key={s.id} onClick={() => handleStationSelect(s)} className="w-full text-left rounded-xl border border-[#e0e0e0] bg-white p-3 hover:border-[#111] transition-colors">
                            <p className="font-semibold text-sm text-[#111]">{s.facility_name}</p>
                            <p className="text-xs text-[#999] mt-0.5">{s.zone} · {s.status}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Password prompt after selecting a station */}
                    {pendingStation && (
                      <div className="rounded-xl border border-[#111]/20 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-[#111]">{pendingStation.facility_name}</p>
                            <p className="text-xs text-[#999]">{pendingStation.zone}</p>
                          </div>
                          <button onClick={() => { setPendingStation(null); setSignInPassword(""); setSignInError(""); }} className="text-[#999] hover:text-[#e55] transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            type={showSignInPw ? "text" : "password"}
                            placeholder="Enter your password"
                            value={signInPassword}
                            onChange={e => { setSignInPassword(e.target.value); setSignInError(""); }}
                            onKeyDown={e => e.key === "Enter" && handleVerifySignIn()}
                            className={`${inputCls} pr-10 ${signInError ? "border-[#e55]" : ""}`}
                          />
                          <button type="button" onClick={() => setShowSignInPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]">
                            {showSignInPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {signInError && (
                          <p className="text-xs text-[#e55] flex items-center gap-1">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 12 12"><path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9a.75.75 0 110-1.5A.75.75 0 016 9zm.75-3.75a.75.75 0 01-1.5 0V3.75a.75.75 0 011.5 0v1.5z"/></svg>
                            {signInError}
                          </p>
                        )}
                        <button
                          onClick={handleVerifySignIn}
                          disabled={verifying || !signInPassword}
                          className="w-full flex items-center justify-center gap-2 bg-[#111] text-white font-bold py-2.5 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-40"
                        >
                          {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                        </button>
                      </div>
                    )}
                    <button className="text-xs text-[#999] hover:text-[#111] transition-colors" onClick={() => { setSigningIn(false); setSearchResults([]); setSearchName(""); }}>
                      ← Register a new station instead
                    </button>
                  </div>
                )}

                {!signingIn && (
                  <>
                    {/* Wallet connection */}
                    {!walletConnected ? (
                      <div className={`rounded-xl border p-4 space-y-3 ${errors.wallet ? "border-[#e55]/40 bg-[#fff5f5]" : "border-[#e8e8e8] bg-[#fafafa]"}`}>
                        <div>
                          <p className="text-sm font-semibold text-[#111] flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-[#90E0EF]" />
                            Connect your Hedera wallet
                          </p>
                          <p className="text-xs text-[#999] mt-0.5">
                            Stations stake 500 HBAR — a real wallet is required to register.
                          </p>
                        </div>
                        <button
                          onClick={handleConnectWallet}
                          disabled={connectingWallet}
                          className="flex items-center gap-2 bg-[#111] text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {connectingWallet ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
                          ) : (
                            <><Wallet className="w-4 h-4" /> Connect HashPack</>
                          )}
                        </button>
                        <FieldError msg={errors.wallet} />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#22c55e]/30 bg-[#f0fdf4] p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                          <div>
                            <p className="text-xs font-semibold text-[#15803d]">Wallet connected</p>
                            <p className="font-mono text-sm text-[#111] font-bold">{connectedAccountId}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleDisconnectWallet}
                          className="text-[#999] hover:text-[#e55] transition-colors p-1"
                          title="Disconnect"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Facility fields */}
                    <div>
                      <FieldLabel required>Facility Name</FieldLabel>
                      <Input
                        placeholder="e.g. Alexandria Port Main"
                        value={facilityName}
                        onChange={(e) => { setFacilityName(e.target.value); setErrors(er => ({ ...er, facilityName: undefined })); }}
                        className={`${inputCls} ${errors.facilityName ? "border-[#e55]" : ""}`}
                      />
                      <FieldError msg={errors.facilityName} />
                    </div>
                    <div>
                      <FieldLabel>Physical Address</FieldLabel>
                      <Textarea placeholder="Full address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl border-[#e0e0e0] text-sm placeholder:text-[#ccc] text-[#111] resize-none" rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel required>Zone</FieldLabel>
                        <Select value={zone} onValueChange={(v) => { setZone(v); setErrors(er => ({ ...er, zone: undefined })); }}>
                          <SelectTrigger className={`h-11 rounded-xl text-sm ${errors.zone ? "border-[#e55]" : "border-[#e0e0e0]"}`}>
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent>{GEOGRAPHIC_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                        </Select>
                        <FieldError msg={errors.zone} />
                      </div>
                      <div>
                        <FieldLabel required>Facility Type</FieldLabel>
                        <Select value={facilityType} onValueChange={(v) => { setFacilityType(v); setErrors(er => ({ ...er, facilityType: undefined })); }}>
                          <SelectTrigger className={`h-11 rounded-xl text-sm ${errors.facilityType ? "border-[#e55]" : "border-[#e0e0e0]"}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="port">Port Authority</SelectItem>
                            <SelectItem value="recycling">Recycling Depot</SelectItem>
                            <SelectItem value="ngo">NGO Collection Point</SelectItem>
                            <SelectItem value="municipal">Municipal Facility</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError msg={errors.facilityType} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Accepted Plastic Types</FieldLabel>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {plasticTypes.map(pt => (
                          <label key={pt.id} className="flex items-center gap-2.5 cursor-pointer group">
                            <Checkbox id={pt.id} checked={acceptedTypes.includes(pt.id)} onCheckedChange={() => toggleType(pt.id)} />
                            <span className="text-sm text-[#444] group-hover:text-[#111] transition-colors">{pt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Password */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel required>Password</FieldLabel>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })); }}
                            className={`${inputCls} pr-10 ${errors.password ? "border-[#e55]" : ""}`}
                          />
                          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError msg={errors.password} />
                      </div>
                      <div>
                        <FieldLabel required>Confirm Password</FieldLabel>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Repeat password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setErrors(er => ({ ...er, confirmPassword: undefined })); }}
                            className={`${inputCls} pr-10 ${errors.confirmPassword ? "border-[#e55]" : ""}`}
                          />
                          <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError msg={errors.confirmPassword} />
                      </div>
                    </div>

                    <button
                      onClick={() => { if (validateStep1()) setStep("stake"); }}
                      className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity mt-2"
                    >
                      Continue <ArrowIcon />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step 2 — Stake */}
            {step === "stake" && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-[#f5f7f9] p-8 text-center">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-[#90E0EF]" />
                  <p className="font-black text-[#111] leading-none mb-1" style={{ fontFamily: "'SUSE', sans-serif", fontSize: '2.5rem', letterSpacing: '-2px' }}>
                    500 HBAR
                  </p>
                  <p className="text-sm text-[#999]">Fraud prevention bond</p>
                </div>
                <div className="rounded-xl border border-[#e8e8e8] p-4 space-y-2">
                  {[
                    "Stake is held until you deregister your station",
                    "Registration fee: 100 HBAR (one-time)",
                    "Stake slashed if fraudulent attestations detected",
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-2 text-sm text-[#666]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#90E0EF] flex-shrink-0 mt-1.5" />
                      {line}
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-[#90E0EF]/30 bg-[#90E0EF]/5 px-4 py-3 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="font-mono text-sm text-[#0A3D55] font-semibold">{connectedAccountId}</span>
                  <span className="text-xs text-[#999] ml-auto">Payer wallet</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("info")} className="flex-1 py-3.5 rounded-full border border-[#e0e0e0] text-sm font-semibold text-[#444] hover:bg-[#f5f5f5] transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleSubmitApplication}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
                    ) : (
                      <>Register Station <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Complete */}
            {step === "complete" && (
              <div className="space-y-5 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="flex justify-center py-2"
                >
                  <CheckCircle className="w-14 h-14 text-[#90E0EF]" />
                </motion.div>
                <div>
                  <p className="font-bold text-[#111] text-xl" style={{ fontFamily: "'SUSE', sans-serif", letterSpacing: '-0.5px' }}>
                    Station Registered!
                  </p>
                  <p className="text-sm text-[#999] mt-2 max-w-xs mx-auto">
                    Your station is ready to accept plastic recoveries and attest collector submissions.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f5f7f9] px-5 py-4 text-left space-y-2">
                  {[
                    `Facility: ${facilityName}`,
                    `Zone: ${zone}`,
                    `Plastic types accepted: ${acceptedTypes.length || "All"}`,
                    `Hedera Account: ${stationHederaId}`,
                  ].filter(Boolean).map((line) => (
                    <div key={line} className="flex items-center gap-2 text-sm text-[#444]">
                      <span className="w-4 h-4 rounded-full bg-[#90E0EF]/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-[#0A3D55]" fill="none" viewBox="0 0 10 10">
                          <path d="M2 5l2.5 2.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {line}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (pendingRegistration) setStation(pendingRegistration);
                    navigate("/station");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity"
                >
                  Go to Station Dashboard <ArrowIcon />
                </button>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StationOnboarding;
