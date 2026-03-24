import { useEffect, useRef, type FC } from 'react';

const W = 400, H = 400;
const CX = W / 2, CY = H / 2;
const TAU = Math.PI * 2;
const BG   = '#f5f7f9'; // matches surrounding tech cards
const RING = '#111111'; // black rings

const HederaRipple: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Each ring tracks its own radius and speed
    const rings = 8;
    const distanceInitial = 35;
    const distanceDelta   = 0.15;

    const state: { radius: number; inc: number }[] = [];
    let dist = distanceInitial, r = 0;
    for (let i = 0; i < rings; i++) {
      state.push({ radius: r, inc: 0.5 });
      r += dist;
      dist -= distanceDelta;
    }

    let animId: number;
    const tick = () => {
      animId = requestAnimationFrame(tick);

      // Clear and fill background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Step + draw every ring
      ctx.strokeStyle = RING;
      ctx.lineWidth   = 1.5;
      for (const s of state) {
        s.radius += s.inc;
        if (s.radius > 100)    s.inc -= 0.0005;
        if (s.radius > 282.84) { s.radius = 0; s.inc = 0.5; }

        ctx.beginPath();
        ctx.arc(CX, CY, s.radius, 0, TAU, false);
        ctx.stroke();
        ctx.closePath();
      }
    };
    tick();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className="tech-center-circle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                 w-28 h-28 rounded-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="absolute inset-0 w-full h-full"
      />
      {/* Logo on white circle, same size as the logo itself */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
          <img
            src="/hedera-logo.png"
            alt="Hedera"
            className="w-10 h-10 object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
};

export default HederaRipple;
