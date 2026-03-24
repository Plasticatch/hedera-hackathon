import { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Navbar: FC<{ fixed?: boolean }> = ({ fixed = false }) => {
  const lastY    = useRef(0);
  const dropRef  = useRef<HTMLDivElement>(null);
  const [hidden, setHidden]     = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { collector, station, signOut } = useAuth();
  const navigate = useNavigate();

  // Hide-on-scroll (landing page only)
  useEffect(() => {
    if (!fixed) return;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY.current && y > 80) setHidden(true);
      else if (y < lastY.current) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fixed]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ArrowIcon = () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
      <path fill="currentColor" d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z" />
    </svg>
  );

  // ── Profile pill (shown when any role is active) ───────────────────────────
  const isStation   = !!station;
  const isCollector = !!collector;
  const activeRole  = isStation ? 'station' : isCollector ? 'collector' : null;

  const pillLabel = isStation
    ? (station!.facility_name.length > 18 ? station!.facility_name.slice(0, 16) + '…' : station!.facility_name)
    : isCollector
    ? collector!.hederaAccountId
    : null;

  const ProfilePill = () => {
    if (!activeRole || !pillLabel) return null;
    return (
      <div ref={dropRef} className="relative">
        <button
          onClick={() => setDropOpen(v => !v)}
          className="flex items-center gap-2 rounded-full border border-black/[0.1] bg-white px-3.5 py-2 text-sm text-[#111] hover:border-[#90E0EF] hover:bg-[#90E0EF]/5 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
          <span className={`font-medium ${isCollector ? 'font-mono text-[#0A3D55]' : ''}`}>
            {pillLabel}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#999] transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-black/[0.07] bg-white shadow-xl z-50 overflow-hidden py-1">
            {isStation && (
              <>
                <button
                  onClick={() => { setDropOpen(false); navigate('/station'); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-black/[0.03] transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#90E0EF]" />
                  Station Dashboard
                </button>
                <button
                  onClick={() => { setDropOpen(false); navigate('/station/submit'); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-black/[0.03] transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-[#90E0EF]" />
                  New Submission
                </button>
              </>
            )}
            {isCollector && !isStation && (
              <button
                onClick={() => { setDropOpen(false); navigate('/collector'); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-black/[0.03] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[#90E0EF]" />
                Collector Dashboard
              </button>
            )}
            <div className="h-px bg-black/[0.06] mx-3 my-1" />
            <button
              onClick={() => { setDropOpen(false); signOut(activeRole); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#e55] hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  };

  const navLinks = [
    { label: 'Leaderboard',  href: '/leaderboard'  },
    { label: 'Impact Agent', href: '/impact-agent' },
    { label: 'Buy Credits',  href: '/credits'      },
  ];

  const mobileLinks = [
    { label: 'Home',         href: '/'             },
    { label: 'Leaderboard',  href: '/leaderboard'  },
    { label: 'Impact Agent', href: '/impact-agent' },
    { label: 'Buy Credits',  href: '/credits'      },
  ];

  return (
    <header
      id="site-header"
      className={fixed ? "fixed top-0 inset-x-0 z-50 px-4 pt-4" : "relative z-10 px-4 pt-4 pb-0"}
      style={fixed ? {
        transform: hidden ? 'translateY(-110%)' : 'translateY(0)',
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      } : undefined}
    >
      <div className={`max-w-7xl mx-auto px-5 py-3 flex items-center gap-6 rounded-2xl border ${fixed ? "bg-white/70 backdrop-blur-xl border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.08)]" : "bg-white border-black/[0.07] shadow-sm"}`}>

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 mr-4 flex-shrink-0 hover:opacity-80 transition-opacity">
          <span className="font-bold text-[#111] text-lg tracking-tight" style={{ fontFamily: "'SUSE', sans-serif" }}>
            PlastiCatch
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href}
              className="px-4 py-2 rounded-full text-sm text-[#555] hover:text-[#111] hover:bg-black/[0.04] transition-all font-medium"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex ml-auto items-center gap-3">
          {activeRole ? (
            <ProfilePill />
          ) : (
            <a
              href="/onboarding"
              className="flex items-center gap-2 bg-[#90E0EF] text-[#0A3D55] text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowIcon />
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-2 rounded-full hover:bg-black/[0.04]"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <div className="w-5 flex flex-col gap-1">
            <span className={`h-0.5 bg-[#111] transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`h-0.5 bg-[#111] transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 bg-[#111] transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className={`md:hidden mt-2 rounded-2xl border shadow-lg overflow-hidden max-w-7xl mx-auto ${fixed ? "bg-white/70 backdrop-blur-xl border-white/40" : "bg-white border-black/[0.07]"}`}>
          {mobileLinks.map((l) => (
            <a key={l.label} href={l.href}
              className="block px-6 py-4 text-sm font-medium text-[#111] border-b border-black/[0.05] hover:bg-black/[0.02] transition-colors"
            >
              {l.label}
            </a>
          ))}
          {activeRole ? (
            <div className="p-4 space-y-2">
              {isStation && (
                <a href="/station/submit" className="block text-center w-full bg-[#90E0EF] text-[#0A3D55] py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                  New Submission
                </a>
              )}
              {isCollector && !isStation && (
                <a href="/collector" className="block text-center w-full bg-[#90E0EF] text-[#0A3D55] py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                  My Dashboard
                </a>
              )}
              <button
                onClick={() => { setMenuOpen(false); signOut(activeRole); }}
                className="block w-full text-center border border-[#e55]/30 text-[#e55] py-3 rounded-full text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-4">
              <a href="/onboarding"
                className="flex items-center justify-center gap-2 w-full bg-[#90E0EF] text-[#0A3D55] py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Get Started
                <ArrowIcon />
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
