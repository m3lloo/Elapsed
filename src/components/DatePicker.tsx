import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Ic } from "./Icon";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MIN_YEAR = 1900;
const p2 = (n: number) => String(n).padStart(2, "0");

interface Parts { y: number; m: number; d: number; h: number; mi: number }

function parse(v: string): Parts | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  return r ? { y: +r[1], m: +r[2] - 1, d: +r[3], h: +r[4], mi: +r[5] } : null;
}
const toValue = (p: Parts) => `${p.y}-${p2(p.m + 1)}-${p2(p.d)}T${p2(p.h)}:${p2(p.mi)}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

interface Props {
  id: string;
  value: string;
  /** Latest selectable moment, same format as `value`. */
  max: string;
  /** The current moment, same format; highlighted in the grid and used as the empty starting view. */
  today: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (v: string) => void;
}

export function DatePicker({ id, value, max, today: todayValue, invalid, describedBy, onChange }: Props) {
  const parts = parse(value);
  const top = parse(max) as Parts;
  const today = parse(todayValue > max ? max : todayValue) as Parts;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: (parts ?? today).y, m: (parts ?? today).m });
  const [dir, setDir] = useState(1);
  const [focusDay, setFocusDay] = useState(parts?.d ?? 1);

  const isTopMonth = view.y === top.y && view.m === top.m;
  const dim = daysIn(view.y, view.m);
  const maxDay = isTopMonth ? top.d : dim;
  const effFocus = Math.min(focusDay, maxDay);
  const atFirst = view.y === MIN_YEAR && view.m === 0;

  const show = () => {
    const base = parts ?? today;
    setView({ y: base.y, m: base.m });
    setFocusDay(parts ? parts.d : today.d);
    wantFocus.current = true;
    setOpen(true);
  };
  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open || !wantFocus.current) return;
    wantFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${effFocus}"]`)?.focus();
  });

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("focusin", away);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("focusin", away);
    };
  }, [open]);

  const commit = (next: Parts) => {
    const v = toValue(next);
    onChange(v > max ? max : v);
  };

  const goMonth = (delta: number, keepFocus = false) => {
    const t = new Date(view.y, view.m + delta, 1);
    const y = t.getFullYear();
    const m = t.getMonth();
    if (y < MIN_YEAR || y > top.y || (y === top.y && m > top.m)) return;
    setDir(delta);
    setView({ y, m });
    if (keepFocus) {
      setFocusDay(Math.min(effFocus, daysIn(y, m)));
      wantFocus.current = true;
    }
  };

  const goDay = (delta: number) => {
    const t = new Date(view.y, view.m, effFocus + delta);
    const limit = new Date(top.y, top.m, top.d);
    if (t > limit || t.getFullYear() < MIN_YEAR) return;
    if (t.getFullYear() !== view.y || t.getMonth() !== view.m) setDir(delta);
    setView({ y: t.getFullYear(), m: t.getMonth() });
    setFocusDay(t.getDate());
    wantFocus.current = true;
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const step: Record<string, () => void> = {
      ArrowLeft: () => goDay(-1),
      ArrowRight: () => goDay(1),
      ArrowUp: () => goDay(-7),
      ArrowDown: () => goDay(7),
      PageUp: () => goMonth(-1, true),
      PageDown: () => goMonth(1, true),
    };
    const fn = step[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const pickDay = (d: number) => {
    commit({ y: view.y, m: view.m, d, h: parts?.h ?? 0, mi: parts?.mi ?? 0 });
    setFocusDay(d);
  };

  const h12 = parts ? parts.h % 12 || 12 : 12;
  const pm = parts ? parts.h >= 12 : false;
  const setTime = (nextH12: number, mi: number, nextPm: boolean) => {
    if (!parts) return;
    commit({ ...parts, h: (nextH12 % 12) + (nextPm ? 12 : 0), mi });
  };

  const label = parts
    ? new Date(parts.y, parts.m, parts.d, parts.h, parts.mi).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : "";

  const years: number[] = [];
  for (let y = top.y; y >= MIN_YEAR; y--) years.push(y);

  const lead = new Date(view.y, view.m, 1).getDay();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div className="picker" ref={root}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="picker-trigger"
        data-invalid={invalid ? "" : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : show())}
      >
        <Ic icon={CalendarDays} className="trigger-icon" />
        {label ? <span className="trigger-text">{label}</span> : <span className="trigger-text ph">Select date and time</span>}
        <Ic icon={ChevronDown} className="trigger-chev" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="picker-pop"
            role="dialog"
            aria-label="Choose date and time of birth"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 30 } }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                close(true);
              }
            }}
          >
            <div className="pop-head">
              <button type="button" className="nav-btn" aria-label="Previous month" disabled={atFirst} onClick={() => goMonth(-1)}>
                <Ic icon={ChevronLeft} />
              </button>
              <select
                aria-label="Month"
                value={view.m}
                onChange={(e) => {
                  const m = +e.target.value;
                  setDir(m > view.m ? 1 : -1);
                  setView({ y: view.y, m });
                }}
              >
                {MONTHS.map((n, i) => (
                  <option key={n} value={i} disabled={view.y === top.y && i > top.m}>{n}</option>
                ))}
              </select>
              <select
                aria-label="Year"
                value={view.y}
                onChange={(e) => {
                  const y = +e.target.value;
                  setDir(y > view.y ? 1 : -1);
                  setView({ y, m: y === top.y ? Math.min(view.m, top.m) : view.m });
                }}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" className="nav-btn" aria-label="Next month" disabled={isTopMonth} onClick={() => goMonth(1)}>
                <Ic icon={ChevronRight} />
              </button>
            </div>

            <div className="weekdays" aria-hidden="true">
              {WEEK.map((w) => <span key={w}>{w}</span>)}
            </div>

            <motion.div
              key={`${view.y}-${view.m}`}
              ref={grid}
              className="days"
              role="group"
              aria-label={`${MONTHS[view.m]} ${view.y}`}
              onKeyDown={onGridKey}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } }}
            >
              {cells.map((d, i) => {
                if (d === null) return <span key={`b${i}`} />;
                const sel = !!parts && parts.y === view.y && parts.m === view.m && parts.d === d;
                const isToday = view.y === today.y && view.m === today.m && d === today.d;
                const off = d > maxDay;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`day${isToday ? " today" : ""}${sel ? " sel" : ""}`}
                    data-day={d}
                    tabIndex={d === effFocus ? 0 : -1}
                    disabled={off}
                    aria-pressed={sel}
                    aria-label={new Date(view.y, view.m, d).toLocaleDateString("en-US", { dateStyle: "full" })}
                    onClick={() => pickDay(d)}
                  >
                    {sel && (
                      <motion.span
                        layoutId="day-sel"
                        className="day-pill"
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      />
                    )}
                    <span className="day-n">{d}</span>
                  </button>
                );
              })}
            </motion.div>

            <div className="time-row">
              <select aria-label="Hour" disabled={!parts} value={h12} onChange={(e) => setTime(+e.target.value, parts?.mi ?? 0, pm)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{p2(h)}</option>)}
              </select>
              <span aria-hidden="true">:</span>
              <select aria-label="Minute" disabled={!parts} value={parts?.mi ?? 0} onChange={(e) => setTime(h12, +e.target.value, pm)}>
                {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{p2(m)}</option>)}
              </select>
              <div className="seg" role="group" aria-label="AM or PM">
                {(["AM", "PM"] as const).map((x) => {
                  const on = (x === "PM") === pm;
                  return (
                    <button key={x} type="button" disabled={!parts} aria-pressed={on} onClick={() => setTime(h12, parts?.mi ?? 0, x === "PM")}>
                      {on && <motion.span layoutId="ampm-sel" className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                      <span className="seg-label">{x}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {!parts && <p className="pop-note">Pick a day first, then set the time.</p>}

            <div className="pop-foot">
              <button type="button" className="btn-ghost" onClick={() => { onChange(""); close(true); }}>Clear</button>
              <button type="button" className="btn-primary" onClick={() => close(true)}>Done</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
