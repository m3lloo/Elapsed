import { useState } from "react";
import { motion } from "motion/react";
import { PieChart } from "lucide-react";
import { MS } from "../lib/time";
import { nf } from "../lib/format";
import { Ic } from "./Icon";
import { rise } from "./Parts";

const YEAR = 365.25 * MS.d;

/** Rough adult averages: hours per day, and the age each habit starts or stops. Estimates, not measurements. */
const HABITS: { key: string; label: string; hours: number; from: number; to: number; weekdays?: boolean; color: string }[] = [
  { key: "sleep", label: "Sleeping", hours: 8.5, from: 0, to: 200, color: "var(--accent-2)" },
  { key: "school", label: "School and work", hours: 7, from: 6, to: 65, weekdays: true, color: "var(--accent)" },
  { key: "screens", label: "Screens, off the clock", hours: 4, from: 12, to: 200, color: "#c084fc" },
  { key: "eating", label: "Eating and drinking", hours: 1.5, from: 2, to: 200, color: "#fbbf24" },
  { key: "moving", label: "Getting around", hours: 1, from: 6, to: 200, color: "#f0587a" },
];

/** Where the years went, as one stacked bar. Hover, focus or tap a slice to isolate it. */
export function TimeSpent({ ms }: { ms: number }) {
  const [active, setActive] = useState<string | null>(null);
  const age = ms / YEAR;

  const rows = HABITS.map((h) => {
    const span = Math.max(0, Math.min(age, h.to) - h.from);
    const years = (span * h.hours * (h.weekdays ? 5 / 7 : 1)) / 24;
    return { ...h, years };
  });
  const used = rows.reduce((a, r) => a + r.years, 0);
  const all = [...rows, { key: "rest", label: "Everything else", hours: 0, from: 0, to: 0, color: "var(--line)", years: Math.max(0, age - used) }];

  return (
    <motion.section className="block" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      <h2 className="h-icon"><Ic icon={PieChart} /> Where the time went</h2>

      <div className="spent-bar" role="img" aria-label={all.map((r) => `${r.label}: ${r.years.toFixed(1)} years`).join(", ")}>
        {all.map((r, i) => (
          <motion.button
            key={r.key}
            type="button"
            className={`spent-seg${active && active !== r.key ? " dim" : ""}`}
            style={{ background: r.color, flexGrow: Math.max(r.years, 0.001) }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.1 + i * 0.07 }}
            onMouseEnter={() => setActive(r.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(r.key)}
            onBlur={() => setActive(null)}
            onClick={() => setActive((a) => (a === r.key ? null : r.key))}
            aria-label={`${r.label}, ${r.years.toFixed(1)} years`}
          />
        ))}
      </div>

      <ul className="spent-legend">
        {all.map((r) => (
          <li key={r.key} className={active && active !== r.key ? "dim" : ""} onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)}>
            <i style={{ background: r.color }} aria-hidden="true" />
            <span>{r.label}</span>
            <b>{r.years < 10 ? r.years.toFixed(1) : nf.format(Math.round(r.years))} <small>yr</small></b>
            <em>{age > 0 ? Math.round((r.years / age) * 100) : 0}%</em>
          </li>
        ))}
      </ul>
      <p className="muted small">Built from rough adult averages (for example 8.5 hours of sleep a day), not from your own habits.</p>
    </motion.section>
  );
}
