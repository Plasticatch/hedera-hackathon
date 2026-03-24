import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Waves } from "lucide-react";

// ─── Inject fonts (same as Landing) ──────────────────────────────────────────
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500;600;700;800&family=SUSE:wght@600&display=swap');
`;

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: non-existent route:", location.pathname);
  }, [location.pathname]);

  // Inject fonts
  useEffect(() => {
    if (!document.getElementById("notfound-fonts")) {
      const style = document.createElement("style");
      style.id = "notfound-fonts";
      style.textContent = FONTS;
      document.head.appendChild(style);
    }
  }, []);

  // Mount the liquid background (same setup as Footer)
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.id = "notfound-liquid-script";
    script.textContent = `
      import LiquidBackground from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.27/build/backgrounds/liquid1.min.js';
      const canvas = document.getElementById('notfound-liquid-canvas');
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
    if (!document.getElementById("notfound-liquid-script")) {
      document.body.appendChild(script);
    }
    return () => {
      const el = document.getElementById("notfound-liquid-script");
      if (el) el.remove();
    };
  }, []);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#071C25]"
      style={{ fontFamily: "'Host Grotesk', sans-serif" }}
    >
      {/* Liquid canvas — full bleed */}
      <canvas
        id="notfound-liquid-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* Vignette to darken edges slightly so content pops */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#071C25]/60 via-transparent to-[#071C25]/80 pointer-events-none" />

      {/* Giant "404" watermark — same style as landing section numbers */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10"
        aria-hidden="true"
      >
        <span
          className="font-bold leading-none"
          style={{
            fontFamily: "'SUSE', sans-serif",
            fontSize: "clamp(16rem, 38vw, 34rem)",
            letterSpacing: "-0.06em",
            color: "rgba(144,224,239,0.04)",
          }}
        >
          404
        </span>
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 text-center max-w-lg px-6"
      >
        {/* Logo — same as footer bottom bar */}
        <a
          href="/"
          className="inline-block mb-14 font-bold text-white text-xl tracking-tight opacity-70 hover:opacity-100 transition-opacity"
          style={{ fontFamily: "'SUSE', sans-serif" }}
        >
          PlastiCatch
        </a>

        {/* Eyebrow badge — same as Landing section pills */}
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-2 bg-[#90E0EF]/10 border border-[#90E0EF]/25 rounded-full px-4 py-1.5 text-[#90E0EF] text-xs font-semibold tracking-wider uppercase">
            Page not found
          </span>
        </div>

        {/* Headline — same weight/tracking as hero */}
        <h1
          className="font-bold text-white leading-none mb-5"
          style={{
            fontFamily: "'SUSE', sans-serif",
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            letterSpacing: "-2px",
          }}
        >
          Lost at Sea
        </h1>

        <p className="text-white/50 text-base leading-relaxed mb-10 max-w-sm mx-auto">
          This page drifted off course. Let&apos;s navigate back to cleaner waters.
        </p>

        {/* CTAs — same style as footer CTA strip */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-[#90E0EF] text-[#0A3D55] font-bold text-sm px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Back to Home
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/leaderboard"
            className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <Waves className="w-4 h-4 text-[#90E0EF]" />
            View Leaderboard
          </Link>
        </div>

        {/* Footer note — same as Landing footer credit line */}
        <p className="mt-14 text-xs text-white/20">
          PlastiCatch · Paying Collectors to Clean the Ocean · Powered by{" "}
          <span className="text-[#90E0EF]/60">Hedera</span>
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
