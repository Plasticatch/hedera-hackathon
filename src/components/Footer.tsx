import { useEffect, type FC } from 'react';

const Footer: FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.id = 'liquid-bg-script';
    script.textContent = `
      import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.27/build/backgrounds/liquid1.min.js';
      const canvas = document.getElementById('footer-liquid-canvas');
      if (canvas && !canvas._liquid) {
        const app = LiquidBackground(canvas);
        app.liquidPlane.material.color.set('#0d4a6b');
        app.liquidPlane.material.metalness = 0.9;
        app.liquidPlane.material.roughness = 0.05;
        app.liquidPlane.uniforms.displacementScale.value = 3.5;
        app.setRain(true);
        canvas._liquid = app;
      }
    `;
    if (!document.getElementById('liquid-bg-script')) {
      document.body.appendChild(script);
    }
    return () => {
      const el = document.getElementById('liquid-bg-script');
      if (el) el.remove();
    };
  }, []);

  return (
    <footer className="relative overflow-hidden bg-[#071C25]">
      <canvas
        id="footer-liquid-canvas"
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16">
          <div className="relative overflow-hidden rounded-3xl bg-[#0A3D55] px-8 md:px-16 py-16 md:py-20">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#90E0EF]/20 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div>
                <h2
                  className="font-bold text-white leading-none mb-4"
                  style={{
                    fontFamily: "'SUSE', sans-serif",
                    fontSize: 'clamp(2rem,5vw,4rem)',
                    letterSpacing: '-2px',
                  }}
                >
                  The ocean won't
                  <br />
                  clean itself.
                  <br />
                  <span className="text-[#90E0EF]">Fix the incentive.</span>
                </h2>
                <p className="text-white/60 text-base max-w-md">
                  Every kilogram verified on-chain. Every collector paid within
                  60 seconds. Every credit provably real.
                </p>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0">
                {[
                  { label: 'Join as Collector', primary: true, href: '/collector/onboarding' },
                  { label: 'Register a Station', primary: false, href: '/station/onboarding' },
                  { label: 'Buy Impact Credits', primary: false, href: '/credits' },
                ].map((b) => (
                  <a
                    key={b.label}
                    href={b.href}
                    className={`flex items-center justify-between gap-4 font-semibold px-6 py-3 rounded-full text-sm transition-all ${
                      b.primary
                        ? 'bg-[#90E0EF] text-[#0A3D55] hover:opacity-90'
                        : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    {b.label}
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 12 12">
                      <path fill="currentColor" d="M1.75.5H11.5v9.75H9.73V3.52L1.75 11.5.5 10.25l7.98-7.98H1.75V.5Z" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center gap-4 flex-wrap">
            <div
              className="flex items-center gap-2 font-bold text-white text-base"
              style={{ fontFamily: "'SUSE', sans-serif" }}
            >
              PlastiCatch
            </div>
            <nav className="flex gap-5 mx-auto">
              {[
                { label: 'Collectors', href: '/collector/onboarding' },
                { label: 'Stations', href: '/station/onboarding' },
                { label: 'Corporates', href: '/credits' },
                { label: 'Leaderboard', href: '/leaderboard' },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm text-white/40 hover:text-[#90E0EF] transition-colors font-medium"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2 text-xs text-white/30">
              Powered by
              <span className="bg-[#90E0EF]/10 border border-[#90E0EF]/25 text-[#90E0EF] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                Hedera
              </span>
            </div>
            <p className="w-full text-center text-xs text-white/20 mt-1">
              © 2026 PlastiCatch · Hashgraph Online Bounty – Sustainability
              Track · Paying Collectors to Clean the Ocean
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
