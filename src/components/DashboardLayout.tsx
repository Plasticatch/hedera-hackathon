import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  role?: "collector" | "station";
}

const DashboardLayout = ({ children, title, subtitle, navItems, role }: DashboardLayoutProps) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { collector, station, signOut } = useAuth();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (item: NavItem) => {
    const segs = item.path.split("/").filter(Boolean);
    const cur  = location.pathname.split("/").filter(Boolean);
    if (segs.length === 1 && cur.length === 1) return location.pathname === item.path;
    return location.pathname === item.path || location.pathname.startsWith(item.path + "/");
  };

  // Profile pill data
  const isStation   = !!station;
  const isCollector = !!collector;
  const activeRole  = role ?? (isStation ? "station" : isCollector ? "collector" : null);

  const pillLabel = isStation
    ? (station!.facility_name.length > 18 ? station!.facility_name.slice(0, 16) + "…" : station!.facility_name)
    : isCollector
    ? collector!.hederaAccountId
    : null;

  const pillSub = isStation
    ? station!.zone
    : isCollector
    ? collector!.displayName || "Collector"
    : null;

  return (
    <div className="min-h-screen bg-[#f8f9fb]" style={{ fontFamily: "'Host Grotesk', sans-serif" }}>

      {/* ── Dashboard header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-black/[0.07]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-14 flex items-center gap-6">

          {/* Logo */}
          <a
            href="/"
            className="font-bold text-[#111] text-base tracking-tight flex-shrink-0 hover:opacity-70 transition-opacity"
            style={{ fontFamily: "'SUSE', sans-serif" }}
          >
            PlastiCatch
          </a>

          {/* Divider */}
          <span className="hidden sm:block h-5 w-px bg-black/[0.1] flex-shrink-0" />

          {/* Page title (desktop) */}
          <div className="hidden sm:block min-w-0 flex-1">
            <p className="text-[11px] text-[#999] font-medium leading-none mb-0.5 truncate">{subtitle}</p>
            <p className="text-sm font-bold text-[#111] leading-none truncate" style={{ fontFamily: "'SUSE', sans-serif" }}>
              {title}
            </p>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  isActive(item)
                    ? "bg-[#111] text-white"
                    : "text-[#555] hover:text-[#111] hover:bg-black/[0.04]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Profile pill */}
          {pillLabel && activeRole && (
            <div ref={dropRef} className="relative ml-auto flex-shrink-0">
              <button
                onClick={() => setDropOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full border border-black/[0.1] bg-white pl-3 pr-3.5 py-2 text-sm hover:border-[#90E0EF] hover:bg-[#90E0EF]/5 transition-all"
              >
                {/* Avatar */}
                <span className="w-6 h-6 rounded-full bg-[#90E0EF]/20 flex items-center justify-center font-bold text-[#0A3D55] text-xs flex-shrink-0" style={{ fontFamily: "'SUSE', sans-serif" }}>
                  {(pillLabel[0] || "?").toUpperCase()}
                </span>
                <span className="hidden sm:block">
                  <span className={`block text-[#111] font-medium leading-tight ${isCollector ? "font-mono text-xs" : "text-sm"}`}>
                    {pillLabel}
                  </span>
                  {pillSub && (
                    <span className="block text-[10px] text-[#999] leading-tight">{pillSub}</span>
                  )}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#999] transition-transform flex-shrink-0 ${dropOpen ? "rotate-180" : ""}`} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-black/[0.07] bg-white shadow-xl z-50 overflow-hidden py-1">
                  {/* Account info */}
                  <div className="px-4 py-3 border-b border-black/[0.06]">
                    <p className="text-xs font-semibold text-[#111] truncate">{pillLabel}</p>
                    {pillSub && <p className="text-[10px] text-[#999] mt-0.5 truncate">{pillSub}</p>}
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {activeRole === "station" ? "Station" : "Collector"}
                    </span>
                  </div>

                  {/* Nav actions */}
                  {activeRole === "station" && (
                    <>
                      <button
                        onClick={() => { setDropOpen(false); navigate("/station"); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-black/[0.03] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#90E0EF]" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => { setDropOpen(false); navigate("/station/submit"); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-black/[0.03] transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 text-[#90E0EF]" />
                        New Submission
                      </button>
                    </>
                  )}
                  {activeRole === "collector" && (
                    <button
                      onClick={() => { setDropOpen(false); navigate("/collector"); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-black/[0.03] transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#90E0EF]" />
                      Dashboard
                    </button>
                  )}

                  <div className="h-px bg-black/[0.06] mx-3 my-1" />

                  <button
                    onClick={() => { setDropOpen(false); signOut(activeRole as "collector" | "station"); navigate("/"); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#e55] hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
