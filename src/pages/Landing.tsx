/**
 * PlastiCatch – Full Landing Page
 * React · TypeScript · Tailwind CSS · GSAP · Lenis smooth scroll
 * Preloader: IronStride-style (SVG mask + horizontal bar + char bounce)
 */

'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HederaRipple from '@/components/HederaRipple';
import { useAuth } from '@/contexts/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Hash,
  Coins,
  Bot,
  Zap,
  type LucideIcon,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ─── Injected CSS ──────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500;600;700;800&family=SUSE:wght@600&display=swap');

  :root {
    --blue: #90E0EF;
    --blue-light: #90E0EF;
    --blue-dim: rgba(0,119,182,0.10);
    --card-bg: #fff;
  }

  html { scroll-behavior: auto; }

  /* Hide scrollbar everywhere */
  ::-webkit-scrollbar { display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }

  body {
    font-family: 'Host Grotesk', sans-serif;
    background: #fff;
    overflow-x: hidden;
  }

  /* ── IronStride preloader ── */
  #preloader-progress-bar {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100svh;
    z-index: 200;
    pointer-events: none;
    overflow: hidden;
  }
  #preloader-bg {
    position: absolute;
    inset: 0;
    background: #fff;
    transform-origin: left;
    transform: scaleX(0.2);
    will-change: transform;
  }
  #preloader-logo {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #preloader-logo-text {
    font-family: 'SUSE', sans-serif;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 700;
    color: #fff;
    mix-blend-mode: difference;
    letter-spacing: -2px;
    white-space: nowrap;
  }
  /* Char wrapper for the bounce animation */
  .pl-char-wrap {
    display: inline-block;
    overflow: hidden;
    position: relative;
    vertical-align: top;
  }
  .pl-char-inner {
    display: inline-block;
  }
  .pl-char-dup {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(100%);
  }

  /* ── SVG mask overlay ── */
  #preloader-mask {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100svh;
    z-index: 201;
    pointer-events: none;
    background: #0A3D55;
    -webkit-mask:
      linear-gradient(white, white),
      url('https://ik.imagekit.io/kg2nszxjp/ironstride-preloader/preloader-mask.svg') center / 40% no-repeat;
    mask:
      linear-gradient(white, white),
      url('https://ik.imagekit.io/kg2nszxjp/ironstride-preloader/preloader-mask.svg') center / 40% no-repeat;
    -webkit-mask-composite: destination-out;
    mask-composite: subtract;
    will-change: transform;
  }

  /* ── card tabs ── */
  .card-tab-more {
    position: absolute;
    top: -6px;
    right: 0;
    background: #fff;
    padding: 10px 0 10px 10px;
    border-bottom-left-radius: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-tab-more::before {
    position: absolute;
    content: '';
    top: 6px;
    left: -19px;
    background: transparent;
    width: 20px;
    height: 20px;
    border-bottom-right-radius: 2rem;
    box-shadow: 5px 5px 0 5px #fff;
    transform: rotate(-90deg);
  }
  .card-tab-more::after {
    position: absolute;
    content: '';
    bottom: -19px;
    right: -1px;
    background: transparent;
    width: 20px;
    height: 20px;
    border-bottom-right-radius: 1rem;
    box-shadow: 5px 5px 0 5px #fff;
    transform: rotate(-90deg);
  }

  .card-tab-tag {
    position: absolute;
    bottom: -6px;
    left: 0;
    background: #fff;
    padding: 10px 10px 10px 0;
    border-top-right-radius: 1rem;
    display: flex;
    align-items: center;
  }
  .card-tab-tag::before {
    position: absolute;
    content: '';
    top: -19px;
    left: 0;
    background: transparent;
    width: 20px;
    height: 20px;
    border-bottom-right-radius: 2rem;
    box-shadow: 5px 5px 0 5px #fff;
    transform: rotate(90deg);
  }
  .card-tab-tag::after {
    position: absolute;
    content: '';
    bottom: 6px;
    right: -19px;
    background: transparent;
    width: 20px;
    height: 20px;
    border-bottom-right-radius: 1rem;
    box-shadow: 5px 5px 0 5px #fff;
    transform: rotate(90deg);
  }

  .collector-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 4px;
    border-radius: 8px;
    border: 1.5px solid rgba(0,0,0,0.08);
    background: #fff;
    font-size: 0.7rem;
    font-weight: 600;
    color: #111;
    margin-left: -8px;
    transition: transform 0.2s ease;
  }
  .collector-chip:first-child { margin-left: 0; }
  .collector-chip:hover { transform: translateY(-4px) scale(1.05); z-index: 10; }
  .collector-chip img {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    object-fit: cover;
    flex-shrink: 0;
  }

  @keyframes marquee-left  { to { transform: translateX(calc(-50%)); } }
  @keyframes marquee-right { to { transform: translateX(calc(50%)); } }
  .marquee-fwd  { animation: marquee-left  28s linear infinite; }
  .marquee-rev  { animation: marquee-right 28s linear infinite; }

  /* ── Tech section: 4-corner notches facing the center circle ──
     Each notch lives entirely OUTSIDE the card (in the white gap),
     so it needs no ::before/::after arc fills — gap and notch are both white. */
  .tech-notch-br, .tech-notch-bl, .tech-notch-tr, .tech-notch-tl {
    position: absolute;
    width: 2.5rem; height: 2.5rem;
    background: #fff;
    z-index: 2;
  }
  /* bottom-right: top-left card inner corner */
  .tech-notch-br { bottom: -2.5rem; right: -2.5rem; border-top-left-radius: 2.5rem; }
  /* bottom-left: top-right card inner corner */
  .tech-notch-bl { bottom: -2.5rem; left:  -2.5rem; border-top-right-radius: 2.5rem; }
  /* top-right: bottom-left card inner corner */
  .tech-notch-tr { top:    -2.5rem; right: -2.5rem; border-bottom-left-radius: 2.5rem; }
  /* top-left: bottom-right card inner corner */
  .tech-notch-tl { top:    -2.5rem; left:  -2.5rem; border-bottom-right-radius: 2.5rem; }
`;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CollectorChip {
  img: string;
  name: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const COLLECTORS: CollectorChip[] = [
  {
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=70',
    name: 'Kai',
  },
  {
    img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=70',
    name: 'Mia',
  },
  {
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=70',
    name: 'Luca',
  },
  {
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=70',
    name: '+2.4k',
  },
];

interface Tech {
  Icon: LucideIcon;
  title: string;
  desc: string;
  badge: string;
}

const TECH: Tech[] = [
  {
    Icon: Hash,
    title: 'Immutable Ledger',
    desc: 'Every recovery event anchored to Hedera HCS — sequenced, timestamped, and verifiable by any third-party auditor. No editing. Ever.',
    badge: 'Hedera HCS',
  },
  {
    Icon: Zap,
    title: 'Instant Settlement',
    desc: 'Scheduled Transactions auto-execute collector payouts within 60 seconds of verification. No custodian. No wire delays. No middleman.',
    badge: 'Scheduled Tx',
  },
  {
    Icon: Coins,
    title: 'Provenance Credits',
    desc: 'Each PRC token carries full chain-of-custody on HTS: collector ID, station, GPS zone, plastic type, weight, and timestamp.',
    badge: 'HTS Token',
  },
  {
    Icon: Bot,
    title: 'AI Verification',
    desc: 'An autonomous Recovery Agent validates every attestation in under 30 s — stake checks, anomaly detection, and Sybil resistance built in.',
    badge: 'Agent Layer',
  },
];

// ─── Shared primitives ─────────────────────────────────────────────────────────

// ─── Preloader (IronStride style) ──────────────────────────────────────────────

const Preloader: FC = () => (
  <>
    {/*
      Progress-bar layer:
        - #preloader-bg  → white strip that scaleX 0.2 → 1 (the "loading bar")
        - #preloader-logo → centered wordmark with mix-blend-mode: difference
          so it shows dark on white and white on dark simultaneously
    */}
    <div id="preloader-progress-bar">
      <div id="preloader-bg" />
      <div id="preloader-logo">
        {/* Chars are split at runtime by the animation useEffect */}
        <p id="preloader-logo-text">PlastiCatch</p>
      </div>
    </div>

    {/*
      Mask layer:
        A full-screen dark overlay with an SVG shape punched out of it
        (mask-composite: subtract).  When this element is scaled up, the
        punched-out hole grows until it fills the viewport, revealing the page.
    */}
    <div id="preloader-mask" />
  </>
);

// ─── Header — delegated to reusable Navbar component ──────────────────────────

// ─── Hero Section ──────────────────────────────────────────────────────────────

const HeroSection: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const { collector, station } = useAuth();
  const joinHref = collector ? '/collector' : '/collector/onboarding';

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero parallax scroll only — entrance animation is handled by Landing's introTl
      gsap.to(imgRef.current, {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col justify-end overflow-hidden rounded-b-[2.5rem] mx-3 md:mx-4"
    >
      <div ref={imgRef} className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80"
          alt="Ocean"
          className="hero-bg-img w-full h-full object-cover"
          style={{
            filter: 'brightness(0.6) saturate(1.15)',
            transform: 'scale(1.2)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-10 pb-10 md:pb-16">
        <div className="hero-badge inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 bg-[#90E0EF] rounded-full animate-pulse" />
          Built on Hedera Hashgraph
        </div>

        <h1
          className="hero-h1 text-white font-bold leading-[0.9] mb-6"
          style={{
            fontFamily: "'SUSE', sans-serif",
            fontSize: 'clamp(3.5rem,10vw,10rem)',
            letterSpacing: '-4px',
          }}
        >
          PlastiCatch
        </h1>

        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
          <p className="hero-sub text-white/70 text-lg md:text-xl font-light max-w-md leading-relaxed">
            Paying collectors to clean the ocean.
            <br />
            <strong className="text-white font-semibold">
              Blockchain-verified. Instant payout. No bank needed.
            </strong>
          </p>

          <div className="hero-ctas flex flex-wrap gap-3 md:ml-auto">
            <a href={joinHref} className="flex items-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity text-sm">
              {collector ? 'My Dashboard' : 'Join as Collector'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                <path
                  fill="currentColor"
                  d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z"
                />
              </svg>
            </a>
            <a href="/credits" className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/20 transition-colors text-sm">
              Buy Impact Credits
            </a>
          </div>
        </div>

        <div className="hero-stats flex flex-wrap gap-8 mt-10 pt-8 border-t border-white/10">
          {[
            ['14M+', 'tons of plastic enter oceans yearly'],
            ['< 60s', 'time to collector payout'],
            ['$0', 'bank account required'],
            ['1 PRC', '= 1 kg verified removed'],
          ].map(([n, l]) => (
            <div key={n}>
              <div
                className="text-white font-bold text-2xl leading-none mb-1"
                style={{ fontFamily: "'SUSE', sans-serif" }}
              >
                {n}
              </div>
              <div className="text-white/50 text-xs">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Cards Section ─────────────────────────────────────────────────────────────

const CardCornerSection: FC = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.showcase-heading', {
        filter: 'blur(20px)',
        opacity: 0,
        y: 20,
        duration: 1.0,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
      });
      gsap.from('.showcase-aside', {
        filter: 'blur(20px)',
        opacity: 0,
        y: 15,
        duration: 0.9,
        delay: 0.15,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
      });
      gsap.from('.showcase-card', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.showcase-grid', start: 'top 85%' },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="py-20 md:py-28 bg-white">
      <div className="max-w-[70rem] w-[90%] mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:gap-8 mb-10 md:mb-14">
          <h2
            className="showcase-heading font-bold leading-[1] text-[#111]"
            style={{
              fontFamily: "'SUSE', sans-serif",
              fontSize: 'clamp(2.5rem,6vw,5rem)',
              letterSpacing: '-2px',
            }}
          >
            Collector network
            <br />
            &amp; ocean cleanup
          </h2>
          <aside className="showcase-aside mt-6 sm:mt-10 flex flex-col gap-2 max-w-[16rem]">
            <p className="text-sm text-[#444] leading-relaxed">
              Our collectors turn every fishing trip into an income opportunity.
              Verified plastic recovery, instant payout, zero friction.
            </p>
          </aside>
        </div>

        <div className="showcase-grid grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 items-end">
          <div
            className="showcase-card relative"
            style={{ paddingBlock: '1rem' }}
          >
            <div
              className="relative w-full"
              style={{
                height: '24rem',
                borderRadius: '1rem',
              }}
            >
              <div
                className="absolute inset-0"
                style={{ clipPath: 'inset(0 round 1rem)' }}
              >
                <img
                  src="/1.png"
                  alt="Ocean plastic collector"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: '1rem' }}
                />
              </div>
              <div className="card-tab-more">
                <div className="flex items-center">
                  {COLLECTORS.map((c, i) => (
                    <div
                      key={i}
                      className="collector-chip"
                      style={{
                        position: 'relative',
                        zIndex: COLLECTORS.length - i,
                      }}
                    >
                      <img
                        src={c.img}
                        alt={c.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://placehold.co/40x40/dbeafe/3B82F6?text=${c.name[0]}`;
                        }}
                      />
                      <span className="text-[10px] font-bold text-[#111]">
                        {c.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-tab-tag">
                <a
                  href="#"
                  className="text-xs font-semibold text-[#111] border border-[#ccc] rounded-full px-3 py-1.5 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all"
                >
                  #Verified Collectors
                </a>
              </div>
            </div>
          </div>

          <div
            className="showcase-card relative sm:self-end"
            style={{ paddingBlock: '1rem' }}
          >
            <div
              className="relative w-full"
              style={{
                height: '20rem',
                borderRadius: '1rem',
              }}
            >
              <div
                className="absolute inset-0"
                style={{ clipPath: 'inset(0 round 1rem)' }}
              >
                <img
                  src="/2.png"
                  alt="Ocean cleanup"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: '1rem' }}
                />
              </div>
              <div className="card-tab-tag">
                <a
                  href="#"
                  className="text-xs font-semibold text-[#111] border border-[#ccc] rounded-full px-3 py-1.5 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all"
                >
                  #Real Impact
                </a>
              </div>
            </div>
          </div>

          <div
            className="showcase-card relative"
            style={{ paddingBlock: '1rem' }}
          >
            <p className="absolute right-0 -top-5 text-sm">
              <a
                href="/collector/onboarding"
                className="text-[#111] font-medium hover:font-bold transition-all"
              >
                More about recovery ↗
              </a>
            </p>
            <div
              className="relative w-full"
              style={{
                height: '24rem',
                borderRadius: '1rem',
              }}
            >
              <div
                className="absolute inset-0"
                style={{ clipPath: 'inset(0 round 1rem)' }}
              >
                <img
                  src="/3.png"
                  alt="Plastic recovery"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: '1rem' }}
                />
              </div>
              <div className="card-tab-more">
                <a
                  href="/collector/onboarding"
                  className="w-10 h-10 rounded-full border-2 border-[#ccc] flex items-center justify-center hover:bg-[#111] hover:border-[#111] group transition-all"
                >
                  <svg
                    className="w-4 h-4 text-[#111] group-hover:text-white transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
                    />
                  </svg>
                </a>
              </div>
              <div className="card-tab-tag">
                <a
                  href="/collector/onboarding"
                  className="text-xs font-semibold text-[#111] border border-[#ccc] rounded-full px-3 py-1.5 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all"
                >
                  #Join the Mission
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Marquee Strip ─────────────────────────────────────────────────────────────

const MarqueeStrip: FC<{ reverse?: boolean; items: string[] }> = ({
  reverse,
  items,
}) => {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden py-5">
      <div
        className={`flex items-center w-max ${reverse ? 'marquee-rev' : 'marquee-fwd'}`}
      >
        {doubled.map((item, i) => (
          <div key={i} className="px-1.5">
            <div className="flex items-center gap-2.5 bg-white border border-black/[0.07] rounded-full px-4 py-2 whitespace-nowrap shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#90E0EF] flex-shrink-0" />
              <span className="text-xs font-semibold text-[#444]">{item}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Steps Section ─────────────────────────────────────────────────────────────

// ─── Story Section ─────────────────────────────────────────────────────────────

const STORY_SEGMENTS: Array<{ text: string; key?: boolean }> = [
  { text: 'Every' },
  { text: 'kilogram' },
  { text: 'of' },
  { text: 'plastic' },
  { text: 'pulled' },
  { text: 'from' },
  { text: 'the' },
  { text: 'ocean', key: true },
  { text: 'starts' },
  { text: 'with' },
  { text: 'one' },
  { text: 'fisherman', key: true },
  { text: 'and' },
  { text: 'a' },
  { text: 'promise.' },
  { text: 'PlastiCatch', key: true },
  { text: 'turns' },
  { text: 'that' },
  { text: 'promise' },
  { text: 'into' },
  { text: 'a' },
  { text: 'verified,' },
  { text: 'on-chain', key: true },
  { text: 'payout—' },
  { text: 'no' },
  { text: 'bank,' },
  { text: 'no' },
  { text: 'middleman,' },
  { text: 'no' },
  { text: 'waiting.' },
  { text: 'Just' },
  { text: 'a' },
  { text: 'cleaner', key: true },
  { text: 'ocean.', key: true },
];

const StorySection: FC = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const words = section.querySelectorAll<HTMLElement>('.story-word');
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    });
    words.forEach((word, i) => {
      const target = word.classList.contains('story-key') ? '#90E0EF' : '#111';
      tl.to(word, { color: target, duration: 0.4, ease: 'none' }, i * 0.07);
    });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section ref={ref} style={{ minHeight: '250vh', background: '#fff' }}>
      <div className="sticky top-0 h-screen flex items-center">
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <p
            className="font-bold leading-snug"
            style={{
              fontFamily: "'SUSE', sans-serif",
              fontSize: 'clamp(1.75rem,4vw,3.5rem)',
              letterSpacing: '-1px',
            }}
          >
            {STORY_SEGMENTS.map((seg, i) => (
              <span
                key={i}
                className={`story-word${seg.key ? ' story-key' : ''}`}
                style={{ color: 'rgba(0,0,0,0.12)' }}
              >
                {seg.text}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
};

// ─── Tech Section ──────────────────────────────────────────────────────────────

const TechSection: FC = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const heading = section.querySelector('.tech-heading');
    const aside = section.querySelector('.tech-aside');
    const cards = section.querySelectorAll('.tech-card-item');
    const circle = section.querySelector('.tech-center-circle');
    const a1 = gsap.from(heading, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 20,
      duration: 1.0,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a2 = gsap.from(aside, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 15,
      duration: 0.9,
      delay: 0.15,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a3 = gsap.from(cards, {
      y: 50,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 75%', once: true },
    });
    const a4 = gsap.from(circle, {
      scale: 0,
      opacity: 0,
      duration: 0.6,
      delay: 0.45,
      ease: 'back.out(1.7)',
      scrollTrigger: { trigger: section, start: 'top 75%', once: true },
    });
    return () => {
      a1.kill();
      a2.kill();
      a3.kill();
      a4.kill();
    };
  }, []);

  const techCards = [
    { item: TECH[0], notch: 'tech-notch-br' }, // top-left  → notch at bottom-right
    { item: TECH[1], notch: 'tech-notch-bl' }, // top-right → notch at bottom-left
    { item: TECH[2], notch: 'tech-notch-tr' }, // bot-left  → notch at top-right
    { item: TECH[3], notch: 'tech-notch-tl' }, // bot-right → notch at top-left
  ];

  return (
    <section id="how" ref={ref} className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 items-start">
          {/* Left — sticky heading panel */}
          <div className="lg:sticky lg:top-28 self-start">
            <h2
              className="tech-heading font-bold text-[#111] leading-none mb-6"
              style={{
                fontFamily: "'SUSE', sans-serif",
                fontSize: 'clamp(2.5rem,6vw,5rem)',
                letterSpacing: '-2px',
              }}
            >
              Built on
              <br />
              verifiable
              <br />
              infrastructure.
            </h2>
            <p className="tech-aside text-[#666] text-base leading-relaxed mb-8 max-w-sm">
              Traditional databases can be edited. Carbon credit fraud is
              rampant. Hedera makes every attestation and payment independently
              verifiable — forever.
            </p>
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#90E0EF] animate-pulse" />
              <span className="text-xs font-semibold text-[#444]">
                Live on Hedera Testnet
              </span>
            </div>
          </div>

          {/* Right — 2×2 card grid with center circle */}
          <div className="relative grid grid-cols-2" style={{ gap: '5rem' }}>
            {techCards.map(({ item, notch }) => (
              <div
                key={item.title}
                className="tech-card-item relative bg-[#f5f7f9] rounded-2xl p-6 md:p-8"
              >
                {/* notch in the gap-facing corner */}
                <div className={notch} />

                <div className="w-10 h-10 rounded-xl bg-[#90E0EF]/10 flex items-center justify-center mb-4">
                  <item.Icon className="w-5 h-5 text-[#90E0EF]" />
                </div>
                <span className="text-[9px] font-bold tracking-[2px] uppercase text-[#90E0EF] block mb-1.5">
                  {item.badge}
                </span>
                <h4
                  className="text-sm font-bold text-[#111] mb-2 leading-tight"
                  style={{ fontFamily: "'SUSE', sans-serif" }}
                >
                  {item.title}
                </h4>
                <p className="text-xs text-[#666] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}

            {/* Center circle — animated ripple rings */}
            <HederaRipple />
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── FAQ Section ────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How does PlastiCatch verify plastic recovery?',
    a: 'Each collection event is photographed and GPS-tagged by the collector using our mobile app. An autonomous AI Recovery Agent validates the attestation in under 30 seconds — checking for anomalies, duplicate submissions, and Sybil attacks. All results are anchored to Hedera HCS, creating an immutable, independently verifiable record.',
  },
  {
    q: 'How and when do collectors get paid?',
    a: 'Collectors receive HBAR directly to their wallet within 60 seconds of attestation approval. Payments are executed via Hedera Scheduled Transactions — automated, trustless, and requiring no intermediary. No bank account, no waiting period, no fee taken by PlastiCatch.',
  },
  {
    q: 'Do I need a bank account to participate as a collector?',
    a: 'No. You only need a smartphone and a Hedera wallet. Payouts are in HBAR, which can be converted to local currency through supported exchanges. This makes PlastiCatch accessible to unbanked coastal communities globally.',
  },
  {
    q: 'What is a Plastic Recovery Credit (PRC)?',
    a: 'A PRC is an HTS token representing one kilogram of verified ocean plastic recovered. Each token carries full provenance: collector ID, station, GPS zone, plastic type, weight, and timestamp. Corporations purchase PRCs to back ESG claims with on-chain proof. Retiring a PRC burns it on-chain with the company name — permanently and verifiably.',
  },
  {
    q: 'How does Hedera make PlastiCatch fraud-proof?',
    a: "Hedera's Consensus Service (HCS) sequences and timestamps every attestation in under 5 seconds with finality. Unlike traditional databases, records cannot be edited or deleted. Any third-party auditor can independently verify every recovery event and payment directly on-chain.",
  },
  {
    q: 'How do I register as a station operator?',
    a: 'Register by staking 500 HBAR as collateral — this aligns incentives and deters fraudulent stations. Your dashboard shows real-time collector activity, daily volume, and payout totals. Stations can repurpose existing port or fishing infrastructure with minimal setup.',
  },
];

const FaqSection: FC = () => {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const heading = section.querySelector('.faq-heading');
    const items = section.querySelectorAll('.faq-item');
    const a1 = gsap.from(heading, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 20,
      duration: 1.0,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a2 = gsap.from(items, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 72%', once: true },
    });
    return () => {
      a1.kill();
      a2.kill();
    };
  }, []);

  return (
    <section ref={ref} className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <h2
              className="faq-heading font-bold text-[#111] leading-none"
              style={{
                fontFamily: "'SUSE', sans-serif",
                fontSize: 'clamp(2.5rem,6vw,5rem)',
                letterSpacing: '-2px',
              }}
            >
              Questions,
              <br />
              answered.
            </h2>
          </div>
          <p className="text-[#666] text-base leading-relaxed max-w-sm">
            Everything you need to know about how PlastiCatch works, who it's
            for, and why Hedera makes it trustworthy.
          </p>
        </div>

        <div className="border-t border-black/[0.07]">
          {FAQS.map((faq, i) => (
            <div key={i} className="faq-item border-b border-black/[0.07]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-8 py-6 text-left group"
              >
                <span className="text-base font-semibold text-[#111] group-hover:text-[#90E0EF] transition-colors leading-snug">
                  {faq.q}
                </span>
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full border border-black/[0.12] flex items-center justify-center transition-all duration-300"
                  style={{
                    transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path
                      d="M5.5 1v9M1 5.5h9"
                      stroke="#111"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
              <div
                style={{
                  maxHeight: open === i ? '200px' : '0px',
                  overflow: 'hidden',
                  transition: 'max-height 0.45s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <p className="text-sm text-[#666] leading-relaxed max-w-2xl pb-6">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Stats Section ─────────────────────────────────────────────────────────────

const StatsSection: FC = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.stat-block', {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 82%' },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const stats = [
    { num: '14M+', label: 'Tons of plastic entering oceans yearly' },
    { num: '$13B', label: 'Global ocean cleanup industry value' },
    { num: '60s', label: 'Collector payout confirmation time' },
    { num: '0%', label: 'Intermediary cut from collector payouts' },
  ];

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/[0.07] border border-black/[0.07] rounded-2xl overflow-hidden">
          {stats.map((s) => (
            <div key={s.num} className="stat-block px-8 py-10">
              <div
                className="text-4xl md:text-5xl font-black text-[#111] leading-none mb-2"
                style={{
                  fontFamily: "'SUSE', sans-serif",
                  letterSpacing: '-2px',
                }}
              >
                {s.num}
              </div>
              <div className="text-sm text-[#666] leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Plantation Section ────────────────────────────────────────────────────────

const PlantationSection: FC = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const heading = section.querySelector('.plantation-heading');
    const aside = section.querySelector('.plantation-aside');
    const card = section.querySelector('.plantation-card');
    const a1 = gsap.from(heading, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 20,
      duration: 1.0,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a2 = gsap.from(aside, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 15,
      duration: 0.9,
      delay: 0.15,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a3 = gsap.from(card, {
      y: 50,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 75%', once: true },
    });
    return () => {
      a1.kill();
      a2.kill();
      a3.kill();
    };
  }, []);

  return (
    <section ref={ref} className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:gap-8 mb-10 md:mb-14">
          <h2
            className="plantation-heading font-bold leading-[1] text-[#111]"
            style={{
              fontFamily: "'SUSE', sans-serif",
              fontSize: 'clamp(2.5rem,6vw,5rem)',
              letterSpacing: '-2px',
            }}
          >
            The ocean
            <br />
            can't wait.
          </h2>
          <aside className="mt-6 sm:mt-10 max-w-[16rem]">
            <p className="plantation-aside text-sm text-[#444] leading-relaxed">
              Every kilogram recovered is blockchain-verified. Every payout is
              instant. Every collector is empowered.
            </p>
          </aside>
        </div>

        <div
          className="plantation-card relative w-full"
          style={{
            borderRadius: '1rem',
            height: 'clamp(22rem, 45vw, 38rem)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ clipPath: 'inset(0 round 1rem)' }}
          >
            <img
              src="/clean-ocean.jpeg"
              alt="Ocean cleanup"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
          </div>
          <div className="card-tab-more">
            <a
              href="/collector/onboarding"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#111] border border-[#ccc] rounded-full px-3 py-1.5 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all"
            >
              Join the mission
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                <path
                  fill="currentColor"
                  d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Journey Section ───────────────────────────────────────────────────────────

const JourneySection: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const { collector, station } = useAuth();

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const heading = section.querySelector('.journey-heading');
    const aside = section.querySelector('.journey-aside');
    const cards = section.querySelectorAll('.journey-card-item');
    const a1 = gsap.from(heading, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 20,
      duration: 1.0,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a2 = gsap.from(aside, {
      filter: 'blur(20px)',
      opacity: 0,
      y: 15,
      duration: 0.9,
      delay: 0.15,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true },
    });
    const a3 = gsap.from(cards, {
      y: 40,
      opacity: 0,
      scale: 0.96,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 75%', once: true },
    });
    return () => {
      a1.kill();
      a2.kill();
      a3.kill();
    };
  }, []);

  const cards = [
    {
      title: 'For Collectors',
      desc: 'Phone onboarding in 2 min. No bank account, no formal ID. Payout in HBAR within 60 seconds of attestation — no intermediary, no delay.',
      img: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800&q=80',
      cta: collector ? 'Collector Dashboard' : 'Join as Collector',
      href: collector ? '/collector' : '/collector/onboarding',
    },
    {
      title: 'For Stations',
      desc: 'Register with 500 HBAR stake. Dashboard shows daily volume, active collectors, and payout totals. Repurpose existing port infrastructure.',
      img: '/station.png',
      cta: station ? 'Station Dashboard' : 'Register a Station',
      href: station ? '/station' : '/station/onboarding',
    },
    {
      title: 'For Corporates',
      desc: 'Purchase PRCs with full chain-of-custody: collector ID, station, GPS zone, plastic type, weight, and date. Retire on-chain — fraud-proof.',
      img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
      cta: 'Buy Impact Credits',
      href: '/credits',
    },
  ];

  return (
    <section ref={ref} className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-col items-center text-center gap-4 mb-14">
          <h2
            className="journey-heading font-bold text-[#111] leading-none"
            style={{
              fontFamily: "'SUSE', sans-serif",
              fontSize: 'clamp(2.5rem,6vw,5rem)',
              letterSpacing: '-2px',
            }}
          >
            Three journeys,
            <br />
            one ecosystem.
          </h2>
          <p className="journey-aside text-[#666] text-base leading-relaxed max-w-sm">
            PlastiCatch aligns the incentives of collectors, station operators,
            and corporations into a single self-sustaining loop.
          </p>
        </div>

        <div className="journey-grid grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((c) => (
            <div
              key={c.title}
              className="journey-card-item group relative overflow-hidden rounded-2xl"
              style={{ height: '28rem' }}
            >
              <img
                src={c.img}
                alt={c.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/600x800/1E3A8A/93C5FD?text=' +
                    c.title;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 opacity-0 md:opacity-100 md:group-hover:opacity-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <h3
                  className="text-2xl font-bold text-white leading-tight tracking-tight transition-transform duration-500 ease-out group-hover:-translate-y-1"
                  style={{ fontFamily: "'SUSE', sans-serif" }}
                >
                  {c.title}
                </h3>
                <div className="overflow-hidden max-h-40 md:max-h-0 md:group-hover:max-h-40 transition-all duration-500 ease-out">
                  <p className="text-sm text-white/70 leading-relaxed mt-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    {c.desc}
                  </p>
                  <a href={c.href} className="mt-4 inline-flex items-center gap-2 bg-[#90E0EF] text-[#0A3D55] text-xs font-bold px-4 py-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-150 hover:opacity-90">
                    {c.cta}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                      <path
                        fill="currentColor"
                        d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Manually split the text content of an element into per-char spans with
 * overflow-hidden wrappers (replicating GSAP SplitText mask:"chars").
 * Returns the array of INNER span elements (the ones GSAP will animate).
 */
function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.innerText;
  el.innerHTML = '';
  const inners: HTMLElement[] = [];

  for (const char of text) {
    const wrap = document.createElement('span');
    wrap.className = 'pl-char-wrap';

    const inner = document.createElement('span');
    inner.className = 'pl-char-inner';
    inner.innerText = char === ' ' ? '\u00A0' : char; // keep spaces

    // Duplicate that starts below (mirrors IronStride duplicate-char)
    const dup = document.createElement('span');
    dup.className = 'pl-char-dup';
    dup.innerText = inner.innerText;

    wrap.appendChild(inner);
    wrap.appendChild(dup);
    el.appendChild(wrap);
    inners.push(inner);
  }

  return inners;
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function Landing(): JSX.Element {
  // Inject global CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = GLOBAL_STYLES;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  // ── IronStride-style preloader animation ──────────────────────────────────
  useEffect(() => {
    const logoEl = document.getElementById('preloader-logo-text');
    if (!logoEl) return;

    // Lock scroll for the duration of the preloader (blocks native + Lenis)
    const blockScroll = (e: Event) => e.preventDefault();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });

    // Hide navbar above viewport before animation starts
    gsap.set('#site-header', { y: -80, opacity: 0 });

    // 1. Split chars in the logo wordmark
    const charInners = splitChars(logoEl as HTMLElement);

    // ── preloaderAnimation ──
    const preloaderTl = gsap.timeline();

    preloaderTl
      // ① Logo chars bounce in from above — repeat once
      .from(charInners, {
        yPercent: -100,
        ease: 'power2.inOut',
        stagger: { each: 0.02, from: 'random' as const },
        duration: 0.5,
        repeat: 1,
        repeatDelay: 0.75,
      })

      // ② White progress bar slides scaleX 0.2 → 1
      .to('#preloader-bg', {
        scaleX: 1,
        ease: 'power1.inOut',
        duration: 2.8,
      })

      // ③ Mask overlay scales up — hole expands to fill viewport
      .to('#preloader-mask', {
        scale: 15,
        duration: 0.9,
        ease: 'power3.in',
      })

      // ④ Fade out bar, logo, mask simultaneously
      .to(
        ['#preloader-bg', '#preloader-logo', '#preloader-progress-bar'],
        { opacity: 0, duration: 0.85, ease: 'power2.inOut' },
        '<'
      )

      // ⑤ Hero image zooms scale(1.2) → 1 during reveal
      .to('.hero-bg-img', { scale: 1, duration: 2.85, ease: 'power3.out' }, '<')

      // ⑥ Remove preloader nodes + unlock scroll
      .set(['#preloader-progress-bar', '#preloader-mask'], { display: 'none' })
      .call(() => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        window.removeEventListener('wheel', blockScroll);
        window.removeEventListener('touchmove', blockScroll);
        ScrollTrigger.refresh();
      });

    // ── introAnimation — navbar slides down + hero text appears after reveal ──
    const introTl = gsap.timeline();

    introTl
      // Navbar drops in from above
      .to('#site-header', {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power3.out',
      })
      // Hero text blurs/fades in slightly after nav
      .from(
        ['.hero-badge', '.hero-h1', '.hero-sub', '.hero-ctas', '.hero-stats'],
        {
          filter: 'blur(20px)',
          opacity: 0,
          yPercent: -15,
          duration: 1.2,
          ease: 'power4.inOut',
          stagger: 0.08,
        },
        '-=0.35'
      );

    // Master: intro starts as the reveal completes (~1.8s before preloaderTl ends)
    const master = gsap.timeline();
    master.add(preloaderTl).add(introTl, '-=1.8');
  }, []);

  const marqItems1 = [
    'Hedera HCS',
    'Immutable Attestations',
    'Instant HBAR Payouts',
    'Plastic Recovery Credits',
    'No Bank Account Needed',
    'Anti-Fraud AI Agent',
    'Phone-First Onboarding',
    'ESG Verified Impact',
  ];
  return (
    <>
      <Preloader />
      <Navbar fixed />
      <main>
        <HeroSection />
        <StatsSection />
        <CardCornerSection />
        <MarqueeStrip items={marqItems1} />
        <StorySection />
        <TechSection />
        <PlantationSection />
        <JourneySection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
