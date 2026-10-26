import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Scale, UserPlus, Users } from "lucide-react";
import { MS, calendarAge, deviceTz, milestones, parseWall } from "../lib/time";
import { fmtDate, nf, relative } from "../lib/format";
import type { Person } from "../lib/storage";
import { Ic } from "./Icon";
import { cell, list, page, rise } from "./Parts";

function when(p: Person) {
  return p.birth ? parseWall(p.birth, p.tz || deviceTz())?.instant ?? null : null;
}

function span(a: Date, b: Date) {
  const g = calendarAge(a, b);
  const parts = [
    g.years && `${g.years} ${g.years === 1 ? "year" : "years"}`,
    g.months && `${g.months} ${g.months === 1 ? "month" : "months"}`,
    `${g.days} ${g.days === 1 ? "day" : "days"}`,
    `${g.hours} ${g.hours === 1 ? "hour" : "hours"}`,
  ].filter(Boolean);
  return parts.join(", ");
}

export function Compare({ people, now, onAdd }: { people: Person[]; now: Date; onAdd: () => void }) {
  const ready = people.filter((p) => when(p));
  const [aId, setA] = useState(ready[0]?.id ?? "");
  const [bId, setB] = useState(ready[1]?.id ?? "");

  const a = ready.find((p) => p.id === aId) ?? ready[0];
  const b = ready.find((p) => p.id === bId && p.id !== a?.id) ?? ready.find((p) => p.id !== a?.id);
  const aAt = a ? when(a) : null;
  const bAt = b ? when(b) : null;

  const upcoming = useMemo(
    () => (id: Date | null) => (id ? milestones(id).filter((m) => m.at > now).slice(0, 3) : []),
    [now],
  );

  if (!a || !b || !aAt || !bAt) {
    return (
      <div className="empty-state">
        <Ic icon={Users} size={28} />
        <h2>Compare two people</h2>
        <p className="muted">Add at least two people with birth dates to see the age gap and who reaches each milestone first.</p>
        <button type="button" className="btn-primary with-icon" onClick={onAdd}>
          <Ic icon={UserPlus} size={16} /> Add a person
        </button>
      </div>
    );
  }

  const [older, younger] = aAt <= bAt ? [a, b] : [b, a];
  const olderAt = when(older)!;
  const youngerAt = when(younger)!;
  const gapMs = youngerAt.getTime() - olderAt.getTime();
  const catchUp = new Date(now.getTime() + gapMs);

  const side = (p: Person, at: Date, other: Person) => (
    <motion.div className="cmp-side" variants={cell}>
      <h3>{p.name.trim() || "Unnamed"}</h3>
      <p className="cmp-hours">{nf.format(Math.floor((now.getTime() - at.getTime()) / MS.h))}</p>
      <p className="muted">hours alive</p>
      <p className="cmp-sub">{span(at, now).split(", ").slice(0, 3).join(", ")}</p>
      <h4>Next milestones</h4>
      <ul>
        {upcoming(at).map((m) => (
          <li key={m.key}>
            <span className="mile-name">{m.label}</span>
            <span className="mile-rel">{fmtDate(m.at)}, {relative(m.at, now)}</span>
          </li>
        ))}
      </ul>
      <span className="sr-only">Compared with {other.name}</span>
    </motion.div>
  );

  return (
    <motion.div variants={page} initial="hidden" animate="show">
      <motion.div className="cmp-pickers" variants={rise}>
        <div>
          <label htmlFor="cmp-a">First person</label>
          <select id="cmp-a" value={a.id} onChange={(e) => setA(e.target.value)}>
            {ready.map((p) => <option key={p.id} value={p.id} disabled={p.id === b.id}>{p.name.trim() || "Unnamed"}</option>)}
          </select>
        </div>
        <Ic icon={ArrowRight} className="cmp-arrow" />
        <div>
          <label htmlFor="cmp-b">Second person</label>
          <select id="cmp-b" value={b.id} onChange={(e) => setB(e.target.value)}>
            {ready.map((p) => <option key={p.id} value={p.id} disabled={p.id === a.id}>{p.name.trim() || "Unnamed"}</option>)}
          </select>
        </div>
      </motion.div>

      <motion.section className="readout cmp-gap" variants={rise}>
        <Ic icon={Scale} size={22} />
        <p className="cmp-headline">
          {older.name.trim() || "Unnamed"} is older by <strong>{span(olderAt, youngerAt)}</strong>
        </p>
        <p className="muted">
          That is {nf.format(Math.floor(gapMs / MS.d))} days. {younger.name.trim() || "Unnamed"} will have lived as long as{" "}
          {older.name.trim() || "Unnamed"} has today on {fmtDate(catchUp)} ({relative(catchUp, now)}).
        </p>
      </motion.section>

      <motion.div className="cmp-grid" variants={list}>
        {side(a, aAt, b)}
        {side(b, bAt, a)}
      </motion.div>
    </motion.div>
  );
}
