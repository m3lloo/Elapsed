import { useCallback, useEffect, useRef } from "react";
import { animate } from "animejs";
import { LayoutGrid } from "lucide-react";
import { MS } from "../lib/time";
import { nf, reducedMotion } from "../lib/format";
import { Ic } from "./Icon";

const COLS = 52;
const ROWS = 90;
const GUTTER = 26;
const MAX_CELL = 10;

/** One square per week, one row per year. Drawn on a canvas, revealed row by row with anime.js. */
export function WeeksGrid({ birth, now, theme }: { birth: Date; now: Date; theme: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const shown = useRef(0);

  const lived = Math.min(Math.floor((now.getTime() - birth.getTime()) / MS.w), COLS * ROWS);
  const livedRef = useRef(lived);
  livedRef.current = lived;

  const draw = useCallback(() => {
    const canvas = cv.current;
    const box = wrap.current;
    if (!canvas || !box) return;
    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue("--accent").trim();
    const line = cs.getPropertyValue("--line").trim();
    const muted = cs.getPropertyValue("--muted").trim();
    const ink = cs.getPropertyValue("--ink").trim();

    const cell = Math.min(MAX_CELL, Math.floor((box.clientWidth - GUTTER) / COLS));
    if (cell < 2) return;
    const w = GUTTER + COLS * cell;
    const h = ROWS * cell;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const gap = Math.max(1, Math.round(cell * 0.2));
    const upTo = Math.floor(livedRef.current * shown.current);
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = GUTTER + (i % COLS) * cell;
      const y = Math.floor(i / COLS) * cell;
      ctx.fillStyle = i < upTo ? accent : line;
      ctx.globalAlpha = i < upTo ? 1 : 0.55;
      ctx.fillRect(x, y, cell - gap, cell - gap);
    }
    ctx.globalAlpha = 1;

    // Current week gets an outline so "you are here" is findable.
    if (livedRef.current < COLS * ROWS && shown.current >= 1) {
      const i = livedRef.current;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(GUTTER + (i % COLS) * cell - 1, Math.floor(i / COLS) * cell - 1, cell - gap + 2, cell - gap + 2);
    }

    ctx.fillStyle = muted;
    ctx.font = `10px "Geist Mono", ui-monospace, monospace`;
    ctx.textBaseline = "top";
    for (let r = 0; r < ROWS; r += 10) ctx.fillText(String(r), 0, r * cell);
  }, []);

  // Reveal once, when the grid scrolls into view.
  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    if (reducedMotion()) {
      shown.current = 1;
      draw();
      return;
    }
    let anim: ReturnType<typeof animate> | undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const state = { p: 0 };
      anim = animate(state, {
        p: 1,
        duration: 2200,
        ease: "outCubic",
        onUpdate: () => {
          shown.current = state.p;
          draw();
        },
      });
    }, { threshold: 0.2 });
    io.observe(box);
    draw();
    return () => {
      io.disconnect();
      anim?.revert();
    };
  }, [draw]);

  useEffect(() => {
    draw();
  }, [lived, theme, draw]);

  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(box);
    return () => ro.disconnect();
  }, [draw]);

  const total = COLS * ROWS;
  const pct = Math.min(100, (lived / total) * 100);

  return (
    <section className="block weeks">
      <div className="weeks-grid" ref={wrap}>
        <canvas ref={cv} role="img" aria-label={`${nf.format(lived)} of ${nf.format(total)} weeks lived`} />
      </div>
      <div className="weeks-copy">
        <h2 className="h-icon"><Ic icon={LayoutGrid} /> Life in weeks</h2>
        <p className="muted">Each square is one week and each row is one year. Ninety rows is a long life, not a prediction.</p>
        <dl className="weeks-stats">
          <div><dd>{nf.format(lived)}</dd><dt>weeks lived</dt></div>
          <div><dd>{nf.format(Math.max(0, total - lived))}</dd><dt>weeks left in 90 years</dt></div>
          <div><dd>{pct.toFixed(1)}%</dd><dt>of the grid filled</dt></div>
        </dl>
      </div>
    </section>
  );
}
