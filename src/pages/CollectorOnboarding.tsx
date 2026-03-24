import { useEffect, useState, type FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Wallet, CheckCircle, ArrowRight, Fingerprint, ChevronLeft, Loader2, Copy, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACTS, isDeployed, contractExplorerUrl } from "@/lib/contracts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GEOGRAPHIC_ZONES } from "@/lib/constants";

const STEPS = [
  { key: "info",     label: "Your Info" },
  { key: "wallet",   label: "Wallet" },
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

// ─── Stepper ─────────────────────────────────────────────────────────────────
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

// ─── Page ────────────────────────────────────────────────────────────────────
const CollectorOnboarding = () => {
  const [step, setStep]               = useState<StepKey>("info");
  const [displayName, setDisplayName] = useState("");
  const [zone, setZone]               = useState("");
  const [walletCreating, setWalletCreating] = useState(false);
  const [createdAccountId, setCreatedAccountId]   = useState("");
  const [createdPrivateKey, setCreatedPrivateKey] = useState("");
  const [keyCopied, setKeyCopied]                 = useState(false);
  const [pendingCollector, setPendingCollector]   = useState<Parameters<typeof setCollector>[0] | null>(null);
  const [errors, setErrors]           = useState<{ zone?: string; password?: string; confirmPassword?: string }>({});

  // Password fields (registration)
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // Sign-in state
  const [showSignIn, setShowSignIn]         = useState(false);
  const [signInId, setSignInId]             = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPw, setShowSignInPw]     = useState(false);
  const [signingIn, setSigningIn]           = useState(false);
  const [signInError, setSignInError]       = useState("");

  const navigate = useNavigate();
  const { collector, setCollector } = useAuth();

  // Redirect if already registered
  useEffect(() => {
    if (collector) navigate("/collector", { replace: true });
  }, [collector, navigate]);

  const currentIndex = STEPS.findIndex(s => s.key === step);

  const handleBack = () => {
    if (step === "wallet" && !walletCreating) setStep("info");
    else if (step === "complete") setStep("wallet");
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!zone) errs.zone = "Please select your operating zone";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password && confirmPassword !== password) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateWallet = async () => {
    if (!validate()) return;
    setStep("wallet");
    setWalletCreating(true);
    try {
      const userId = crypto.randomUUID();
      // Call the edge function — creates a real Hedera account via AccountCreateTransaction
      const { data, error } = await supabase.functions.invoke("register-collector", {
        body: { userId, displayName: displayName || undefined, zone, password },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Registration failed");

      const col = data.collector;
      setCreatedAccountId(col.hedera_account_id);
      setCreatedPrivateKey(col.hedera_private_key ?? "");
      setPendingCollector({
        id: col.id,
        user_id: col.user_id,
        hederaAccountId: col.hedera_account_id,
        zone: col.zone,
        displayName: col.display_name,
      });
      toast.success("Wallet created on Hedera Testnet");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast.error(msg.length < 120 ? msg : "Registration failed. Check console for details.");
      setStep("info");
    } finally {
      setWalletCreating(false);
    }
  };

  const copyPrivateKey = () => {
    if (!createdPrivateKey) return;
    navigator.clipboard.writeText(createdPrivateKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleSignIn = async () => {
    const id = signInId.trim();
    if (!id) { setSignInError("Please enter your Hedera Account ID"); return; }
    if (!signInPassword) { setSignInError("Please enter your password"); return; }
    setSigningIn(true);
    setSignInError("");
    try {
      const { data, error } = await supabase.rpc("verify_collector_signin", {
        p_account_id: id,
        p_password: signInPassword,
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        setSignInError("Invalid Account ID or password.");
        return;
      }
      const row = data[0];
      setCollector({
        id: row.id,
        user_id: row.user_id,
        hederaAccountId: row.hedera_account_id,
        zone: row.zone,
        displayName: row.display_name,
      });
      toast.success("Welcome back!");
      navigate("/collector", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setSignInError(msg.length < 120 ? msg : "Sign in failed. Try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const ArrowIcon = () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
      <path fill="currentColor" d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Host Grotesk', sans-serif" }}>
      <OnboardingHeader onBack={step !== "info" ? handleBack : undefined} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/25 rounded-full px-4 py-1.5 text-[#0A3D55] text-xs font-semibold mb-4">
              <MapPin className="w-3 h-3" /> Collector Onboarding
            </div>
            <h1 className="font-bold text-[#111] leading-tight" style={{ fontFamily: "'SUSE', sans-serif", fontSize: 'clamp(1.6rem,4vw,2.25rem)', letterSpacing: '-1px' }}>
              Join as a Collector
            </h1>
            <p className="text-[#999] text-sm mt-2">2 minutes · No bank account needed</p>
          </div>

          {/* Stepper */}
          <Stepper steps={STEPS as unknown as { label: string }[]} current={currentIndex} />

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >

              {/* Step 1 — Info */}
              {step === "info" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#999] block mb-1.5">
                      Display name <span className="text-[#bbb] font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <Input
                      placeholder="e.g. Kai Marino"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 rounded-xl border-[#e0e0e0] focus:border-[#111] focus:ring-0 text-[#111] placeholder:text-[#ccc]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#999] block mb-1.5">
                      Zone <span className="text-[#e55]">*</span>
                    </label>
                    <Select value={zone} onValueChange={(v) => { setZone(v); setErrors(e => ({ ...e, zone: undefined })); }}>
                      <SelectTrigger className={`h-12 rounded-xl ${errors.zone ? "border-[#e55] focus:border-[#e55]" : "border-[#e0e0e0]"}`}>
                        <SelectValue placeholder="Select your operating zone…" />
                      </SelectTrigger>
                      <SelectContent>
                        {GEOGRAPHIC_ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.zone && (
                      <p className="text-xs text-[#e55] mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 12 12"><path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9a.75.75 0 110-1.5A.75.75 0 016 9zm.75-3.75a.75.75 0 01-1.5 0V3.75a.75.75 0 011.5 0v1.5z"/></svg>
                        {errors.zone}
                      </p>
                    )}
                  </div>
                  {/* Password */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#999] block mb-1.5">
                      Password <span className="text-[#e55]">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })); }}
                        className={`h-12 rounded-xl pr-10 focus:ring-0 text-[#111] placeholder:text-[#ccc] ${errors.password ? "border-[#e55] focus:border-[#e55]" : "border-[#e0e0e0] focus:border-[#111]"}`}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-[#e55] mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 12 12"><path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9a.75.75 0 110-1.5A.75.75 0 016 9zm.75-3.75a.75.75 0 01-1.5 0V3.75a.75.75 0 011.5 0v1.5z"/></svg>
                        {errors.password}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#999] block mb-1.5">
                      Confirm Password <span className="text-[#e55]">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setErrors(er => ({ ...er, confirmPassword: undefined })); }}
                        className={`h-12 rounded-xl pr-10 focus:ring-0 text-[#111] placeholder:text-[#ccc] ${errors.confirmPassword ? "border-[#e55] focus:border-[#e55]" : "border-[#e0e0e0] focus:border-[#111]"}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-[#e55] mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 12 12"><path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9a.75.75 0 110-1.5A.75.75 0 016 9zm.75-3.75a.75.75 0 01-1.5 0V3.75a.75.75 0 011.5 0v1.5z"/></svg>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleCreateWallet}
                    className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity mt-2"
                  >
                    Create Wallet &amp; Continue <ArrowIcon />
                  </button>
                  <p className="text-center text-xs text-[#bbb]">
                    Your Hedera wallet is created automatically — no app download needed.
                  </p>

                  {/* Sign-in toggle */}
                  <div className="border-t border-black/[0.06] pt-4 mt-2">
                    {!showSignIn ? (
                      <p className="text-center text-xs text-[#999]">
                        Already registered?{" "}
                        <button
                          onClick={() => setShowSignIn(true)}
                          className="font-semibold text-[#0A3D55] hover:underline"
                        >
                          Sign in with your Account ID
                        </button>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#999]">
                          Sign in to existing account
                        </p>
                        <Input
                          placeholder="Your Hedera Account ID (e.g. 0.0.72431)"
                          value={signInId}
                          onChange={e => { setSignInId(e.target.value); setSignInError(""); }}
                          className={`h-12 rounded-xl text-[#111] placeholder:text-[#ccc] focus:ring-0 ${signInError ? "border-[#e55] focus:border-[#e55]" : "border-[#e0e0e0] focus:border-[#111]"}`}
                        />
                        <div className="relative">
                          <Input
                            type={showSignInPw ? "text" : "password"}
                            placeholder="Password"
                            value={signInPassword}
                            onChange={e => { setSignInPassword(e.target.value); setSignInError(""); }}
                            className={`h-12 rounded-xl pr-10 text-[#111] placeholder:text-[#ccc] focus:ring-0 ${signInError ? "border-[#e55] focus:border-[#e55]" : "border-[#e0e0e0] focus:border-[#111]"}`}
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
                        <div className="flex gap-2">
                          <button
                            onClick={handleSignIn}
                            disabled={signingIn || !signInId.trim() || !signInPassword}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#111] text-white font-bold py-3 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {signingIn ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                            ) : (
                              <>Sign In <ArrowIcon /></>
                            )}
                          </button>
                          <button
                            onClick={() => { setShowSignIn(false); setSignInId(""); setSignInPassword(""); setSignInError(""); }}
                            className="px-4 py-3 rounded-full border border-[#e0e0e0] text-sm font-semibold text-[#555] hover:border-[#111] hover:text-[#111] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2 — Wallet */}
              {step === "wallet" && (
                <div className="space-y-5 text-center">
                  {walletCreating ? (
                    <>
                      <div className="flex justify-center py-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-14 h-14 rounded-full border-4 border-[#f0f0f0] border-t-[#111]"
                        />
                      </div>
                      <p className="font-semibold text-[#111]" style={{ fontFamily: "'SUSE', sans-serif" }}>
                        Creating your wallet…
                      </p>
                      <p className="text-sm text-[#999]">Generating Hedera account on Testnet</p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center py-2">
                        <Wallet className="w-12 h-12 text-[#90E0EF]" />
                      </div>
                      <div>
                        <p className="font-bold text-[#111] text-lg mb-1" style={{ fontFamily: "'SUSE', sans-serif" }}>
                          Wallet created!
                        </p>
                        <p className="text-sm text-[#999]">Your Hedera account is live on Testnet</p>
                      </div>
                      <div className="rounded-2xl bg-[#f5f7f9] p-5 text-left space-y-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">Hedera Account ID</p>
                          <p className="font-mono font-bold text-[#111] text-lg">{createdAccountId}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#999] pt-2 border-t border-black/[0.06]">
                          <Fingerprint className="w-3.5 h-3.5 text-[#90E0EF]" />
                          PlastiCatch Managed Wallet · Hedera Testnet
                        </div>
                      </div>

                      {/* Private key — save warning */}
                      {createdPrivateKey && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <p className="text-sm font-bold text-amber-800">Save your private key</p>
                          </div>
                          <p className="text-xs text-amber-700">
                            This is the only time it will be shown. Store it safely — you'll need it to sign future on-chain transactions.
                          </p>
                          <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-3 py-2">
                            <p className="font-mono text-[10px] text-[#555] flex-1 break-all leading-relaxed">{createdPrivateKey}</p>
                            <button
                              onClick={copyPrivateKey}
                              className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
                              title="Copy private key"
                            >
                              <Copy className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          </div>
                          {keyCopied && <p className="text-[11px] text-amber-600 font-semibold">Copied to clipboard!</p>}
                        </div>
                      )}

                      <div className="rounded-2xl border border-[#90E0EF]/30 bg-[#90E0EF]/5 px-5 py-4 text-left">
                        <p className="text-sm font-semibold text-[#111]">0.3 HBAR onboarding credit added</p>
                        <p className="text-xs text-[#999] mt-0.5">Funded from PlastiCatch protocol operator account</p>
                      </div>
                      <button
                        onClick={() => setStep("complete")}
                        className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity"
                      >
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
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
                      You're all set!
                    </p>
                    <p className="text-sm text-[#999] mt-2 max-w-xs mx-auto">
                      Find your nearest Weighing Station and start earning HBAR for every kilogram of ocean plastic you recover.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f5f7f9] px-5 py-4 text-left space-y-2">
                    {[
                      `Zone: ${zone}`,
                      "Hedera wallet created",
                      "0.3 HBAR onboarding credit deposited",
                    ].map((line) => (
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
                  {isDeployed(CONTRACTS.collectorRegistry) && (
                    <a
                      href={contractExplorerUrl(CONTRACTS.collectorRegistry)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-[10px] font-mono text-[#999] hover:text-[#0A3D55] transition-colors"
                    >
                      CollectorRegistry · {CONTRACTS.collectorRegistry.slice(0, 8)}…{CONTRACTS.collectorRegistry.slice(-4)}
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (pendingCollector) setCollector(pendingCollector);
                      navigate("/collector");
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity"
                  >
                    Start Collecting <ArrowIcon />
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CollectorOnboarding;
