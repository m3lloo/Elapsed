import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Flag, Trophy } from "lucide-react";
import { MS, milestones } from "../lib/time";
import { fmtDate, pad, relative } from "../lib/format";
import { Ic } from "./Icon";
import { Roll, cell, list, rise } from "./Parts";

function countdown(ms: number) {
  const d = Math.floor(ms / MS.d);
  const h = Math.floor((ms % MS.d) / MS.h);
  const m = Math.floor((ms % MS.h) / MS.m);
  const s = Math.floor((ms % MS.m) / MS.s);
  return { d, h, m, s };
}

export function Milestones({ birth, now, footer }: { birth: Date; now: Date; footer?: ReactNode }) {
  const all = useMemo(() => milestones(birth), [birth]);
  const t = now.getTime();
  const upcoming = all.filter((m) => m.at.getTime() > t);
  const reached = all.filter((m) => m.at.getTime() <= t).reverse();
  const [next, ...rest] = upcoming;
  const more = rest.slice(0, 6);
  const c = next ? countdown(next.at.getTime() - t) : null;

  return (
    <motion.section className="block" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
      <h2 className="h-icon"><Ic icon={Trophy} /> Milestones</h2>

      {next && c ? (
        <motion.div className="mile-grid" variants={list}>
          <motion.div className="mile-feature" variants={cell}>
            <Ic icon={Flag} size={22} className="mile-flag" />
            <p className="mile-label">{next.label}</p>
            <p className="mile-when">{fmtDate(next.at)}</p>
            <p className="mile-count" aria-label={`${relative(next.at, now)}`}>
              <span>{c.d}</span><small>d</small>
              <span>{pad(c.h)}</span><small>h</small>
              <span>{pad(c.m)}</span><small>m</small>
              <Roll value={pad(c.s)} /><small>s</small>
            </p>
          </motion.div>
          <ul className="mile-list">
            {more.map((m) => (
              <motion.li key={m.key} variants={cell}>
                <span className="mile-name">{m.label}</span>
                <span className="mile-date">{fmtDate(m.at)}</span>
                <span className="mile-rel">{relative(m.at, now)}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ) : (
        <p className="muted">Every tracked milestone has been reached.</p>
      )}

      {reached.length > 0 && (
        <details className="reached">
          <summary>Reached so far ({reached.length})</summary>
          <ul>
            {reached.map((m, i) => (
              <li key={m.key} style={{ "--i": Math.min(i, 30) } as React.CSSProperties}>
                <Ic icon={Check} size={15} />
                <span className="mile-name">{m.label}</span>
                <span className="mile-rel">{fmtDate(m.at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {footer}
    </motion.section>
  );
}
