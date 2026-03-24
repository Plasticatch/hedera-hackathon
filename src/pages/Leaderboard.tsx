import { useState, useEffect, useRef, type FC } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLeaderboard } from '@/hooks/usePlastiCatchData';
import { GEOGRAPHIC_ZONES } from '@/lib/constants';

gsap.registerPlugin(ScrollTrigger);

const TIER_LABELS = [
  'Newcomer',
  'Novice',
  'Regular',
  'Veteran',
  'Expert',
  'Champion',
];
const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const Leaderboard: FC = () => {
  const [zone, setZone] = useState<string | undefined>(undefined);
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: entries, isLoading } = useLeaderboard(zone);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        opacity: 0,
        y: 30,
        filter: 'blur(16px)',
        duration: 0.9,
        ease: 'power4.out',
      });
      if (tableRef.current) {
        gsap.from(tableRef.current, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          delay: 0.2,
          ease: 'power3.out',
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Host Grotesk', sans-serif" }}
    >
      <Navbar />

      {/* Hero strip */}
      <section className="pt-10 pb-16 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/30 rounded-full px-4 py-1.5 text-[#0A3D55] text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 bg-[#90E0EF] rounded-full animate-pulse" />
              Live Rankings · Updated every 2 minutes
            </div>
            <h1
              ref={headingRef}
              className="font-bold text-[#111] leading-none"
              style={{
                fontFamily: "'SUSE', sans-serif",
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                letterSpacing: '-3px',
              }}
            >
              Collector
              <br />
              Leaderboard.
            </h1>
          </div>
          <p className="text-[#666] text-base leading-relaxed max-w-xs">
            The collectors cleaning our oceans — ranked by verified kilograms
            recovered and HBAR earned.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-black/[0.07] mx-6 md:mx-10" />

      {/* Table section */}
      <section className="py-12 px-6 md:px-10 max-w-7xl mx-auto">
        {/* Filter bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
          <p className="text-sm text-[#999] font-medium">
            {entries ? `${entries.length} collectors ranked` : 'Loading…'}
          </p>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/[0.12] text-sm font-medium text-[#444] hover:bg-black/[0.03] transition-colors"
            >
              {zone ?? 'All Zones'}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-12 z-20 bg-white border border-black/[0.08] rounded-2xl shadow-xl overflow-hidden min-w-[180px]">
                <button
                  onClick={() => {
                    setZone(undefined);
                    setFilterOpen(false);
                  }}
                  className={`block w-full text-left px-5 py-3 text-sm font-medium hover:bg-black/[0.03] transition-colors ${!zone ? 'text-[#111]' : 'text-[#666]'}`}
                >
                  All Zones
                </button>
                {GEOGRAPHIC_ZONES.map((z) => (
                  <button
                    key={z}
                    onClick={() => {
                      setZone(z);
                      setFilterOpen(false);
                    }}
                    className={`block w-full text-left px-5 py-3 text-sm font-medium hover:bg-black/[0.03] transition-colors ${zone === z ? 'text-[#111]' : 'text-[#666]'}`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="py-24 text-center text-[#999] text-sm">
            Loading leaderboard…
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="py-24 text-center">
            <p
              className="text-4xl font-bold text-[#111] mb-3"
              style={{
                fontFamily: "'SUSE', sans-serif",
                letterSpacing: '-1px',
              }}
            >
              No collectors yet.
            </p>
            <p className="text-[#999] text-sm mb-8">
              Rankings appear once collectors submit verified recoveries.
            </p>
            <a
              href="/collector/onboarding"
              className="inline-flex items-center gap-2 bg-[#111] text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#333] transition-colors"
            >
              Be the first collector
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                <path
                  fill="currentColor"
                  d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z"
                />
              </svg>
            </a>
          </div>
        )}

        {/* Table */}
        {!isLoading && entries && entries.length > 0 && (
          <div ref={tableRef}>
            {/* Header row */}
            <div className="grid grid-cols-[3rem_1fr_auto_auto_auto] gap-4 pb-3 border-b border-black/[0.07] text-xs font-semibold text-[#999] uppercase tracking-wider px-4">
              <span>#</span>
              <span>Collector</span>
              <span className="text-right hidden sm:block">Tier</span>
              <span className="text-right">kg Recovered</span>
              <span className="text-right hidden md:block">HBAR Earned</span>
            </div>

            {entries.map((entry, idx) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
                className="grid grid-cols-[3rem_1fr_auto_auto_auto] gap-4 items-center py-5 px-4 border-b border-black/[0.05] hover:bg-black/[0.015] transition-colors rounded-xl"
              >
                {/* Rank */}
                <span
                  className="font-bold text-base"
                  style={{ fontFamily: "'SUSE', sans-serif" }}
                >
                  {RANK_MEDAL[entry.rank] ?? (
                    <span className="text-[#bbb]">{entry.rank}</span>
                  )}
                </span>

                {/* Name + meta */}
                <div>
                  <p className="font-semibold text-[#111] text-sm">
                    {entry.name}
                  </p>
                  <p className="text-xs text-[#999] mt-0.5">
                    {entry.zone} · {entry.topType.replace(/_/g, ' ')} ·{' '}
                    {entry.weeksActive}w active
                  </p>
                </div>

                {/* Tier */}
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#90E0EF]/10 text-[#0A3D55]">
                  {TIER_LABELS[entry.tier] ?? 'Newcomer'}
                </span>

                {/* kg */}
                <div className="text-right">
                  <span
                    className="font-black text-[#111] text-lg leading-none"
                    style={{
                      fontFamily: "'SUSE', sans-serif",
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {entry.totalKg.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#999] ml-1">kg</span>
                </div>

                {/* HBAR */}
                <div className="hidden md:block text-right">
                  <span className="text-sm font-semibold text-[#666]">
                    {entry.hbarEarned.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#90E0EF] ml-1">ℏ</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA banner */}
      <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-black/[0.1] px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p
              className="font-bold text-[#111] text-base"
              style={{
                fontFamily: "'SUSE', sans-serif",
                letterSpacing: '-0.5px',
              }}
            >
              Ready to climb the rankings?
            </p>
            <p className="text-[#999] text-sm mt-0.5">
              Register as a collector and start earning HBAR for every kilogram
              recovered.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a
              href="/collector/onboarding"
              className="flex items-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Join as Collector
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                <path
                  fill="currentColor"
                  d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z"
                />
              </svg>
            </a>
            <a
              href="/station/onboarding"
              className="flex items-center gap-2 border border-black/[0.12] text-[#444] font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-black/[0.03] transition-colors whitespace-nowrap"
            >
              Register a Station
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Leaderboard;
