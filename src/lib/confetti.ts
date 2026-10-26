import { reducedMotion } from "./format";

/** A short confetti burst on a throwaway full-screen canvas. Does nothing under reduced motion. */
export function confetti(count = 140) {
  if (reducedMotion()) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "90" });
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = (canvas.width = innerWidth * dpr);
  const h = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();

  const cs = getComputedStyle(document.documentElement);
  const colors = [cs.getPropertyValue("--accent").trim() || "#5fe3b5", cs.getPropertyValue("--accent-2").trim() || "#7aa7ff", "#f0587a", "#ffd166", "#ffffff"];
  // Launch from both bottom corners toward the middle.
  const bits = Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const a = 0.7 + Math.random() * 0.6;
    const sp = (10 + Math.random() * 10) * dpr;
    return {
      x: left ? 0 : w, y: h * 0.9,
      vx: Math.cos(a) * sp * (left ? 1 : -1), vy: -Math.sin(a) * sp * 1.3,
      s: (5 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)], flip: Math.random() * 6,
    };
  });

  const t0 = performance.now();
  const tick = (now: number) => {
    const age = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    for (const b of bits) {
      b.vy += 0.38 * dpr;
      b.vx *= 0.992;
      b.x += b.vx; b.y += b.vy; b.r += b.vr; b.flip += 0.18;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2.2) / 1.2);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.scale(1, Math.cos(b.flip));
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      ctx.restore();
    }
    if (age < 3.4) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
