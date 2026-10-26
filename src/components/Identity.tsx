import { motion } from "motion/react";
import { Compass } from "lucide-react";
import { nf } from "../lib/format";
import { birthstone, chineseYear, dayOfYear, generation, moonCycles, moonPhase, zodiac } from "../lib/identity";
import { Ic } from "./Icon";
import { cell, list, rise } from "./Parts";

/** Phase drawn as an SVG disc: dark base, lit part traced by the limb and the terminator. */
function Moon({ fraction }: { fraction: number }) {
  const r = 22;
  const k = Math.cos(fraction * Math.PI * 2);
  const rx = Math.abs(k) * r;
  const waxing = fraction < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  const d = `M ${r} 0 A ${r} ${r} 0 0 ${outer} ${r} ${r * 2} A ${rx} ${r} 0 0 ${inner} ${r} 0 Z`;
  return (
    <svg className="moon" viewBox={`0 0 ${r * 2} ${r * 2}`} width="48" height="48" aria-hidden="true">
      <circle cx={r} cy={r} r={r - 0.5} className="moon-dark" />
      <path d={d} className="moon-lit" />
      <circle cx={r} cy={r} r={r - 0.5} className="moon-rim" />
    </svg>
  );
}

/** What the birth date says about you: signs, generation, stone, the Moon that night. */
export function Identity({ wall, birth, now }: { wall: Date; birth: Date; now: Date }) {
  const z = zodiac(wall);
  const cn = chineseYear(wall);
  const gen = generation(wall.getFullYear());
  const moon = moonPhase(birth);
  const cycles = moonCycles(now.getTime() - birth.getTime());
  const day = dayOfYear(wall);
  const leap = new Date(wall.getFullYear(), 1, 29).getDate() === 29;

  return (
    <motion.section className="block" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
      <h2 className="h-icon"><Ic icon={Compass} /> Born under</h2>
      <motion.div className="born" variants={list}>
        <motion.div className="born-item" variants={cell}>
          <span className="born-glyph" aria-hidden="true">{z.symbol}</span>
          <p className="born-main">{z.name}</p>
          <p className="born-sub">{z.element} sign</p>
        </motion.div>
        <motion.div className="born-item" variants={cell}>
          <span className="born-glyph txt" aria-hidden="true">{cn.animal.slice(0, 2)}</span>
          <p className="born-main">Year of the {cn.animal}</p>
          <p className="born-sub">{cn.element} {cn.animal}, lunar year {cn.year}</p>
        </motion.div>
        <motion.div className="born-item" variants={cell}>
          <Moon fraction={moon.fraction} />
          <p className="born-main">{moon.name}</p>
          <p className="born-sub">{Math.round(moon.lit * 100)}% lit the night you were born</p>
        </motion.div>
        <motion.div className="born-item" variants={cell}>
          <span className="born-glyph txt" aria-hidden="true">{gen.name.split(" ").pop()?.slice(0, 3)}</span>
          <p className="born-main">{gen.name}</p>
          <p className="born-sub">{gen.span}</p>
        </motion.div>
        <motion.div className="born-item" variants={cell}>
          <span className="born-glyph gem" aria-hidden="true">◆</span>
          <p className="born-main">{birthstone(wall)}</p>
          <p className="born-sub">your birthstone</p>
        </motion.div>
        <motion.div className="born-item" variants={cell}>
          <span className="born-glyph txt" aria-hidden="true">{day}</span>
          <p className="born-main">Day {day} of {leap ? 366 : 365}</p>
          <p className="born-sub">{nf.format(Math.floor(cycles))} full Moon cycles lived so far</p>
        </motion.div>
      </motion.div>
      <p className="muted small">Moon phase is computed from the average lunar cycle, so it can be off by a day. Signs follow common date ranges.</p>
    </motion.section>
  );
}
