import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { MS, calendarAge } from "../lib/time";
import { fmtDate, nf, pad } from "../lib/format";
import { uid, type EventItem } from "../lib/storage";
import { DatePicker } from "./DatePicker";
import { Ic } from "./Icon";
import { Roll } from "./Parts";

const FAR = "2100-12-31T23:59";

function EventRow({ ev, now, onRemove }: { ev: EventItem; now: Date; onRemove: () => void }) {
  const at = new Date(ev.at);
  const diff = at.getTime() - now.getTime();
  const future = diff > 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / MS.d);
  const h = Math.floor((abs % MS.d) / MS.h);
  const m = Math.floor((abs % MS.h) / MS.m);
  const s = Math.floor((abs % MS.m) / MS.s);
  const [from, to] = future ? [now, at] : [at, now];
  const cal = calendarAge(from, to);
  const long = cal.years || cal.months ? `${cal.years ? `${cal.years}y ` : ""}${cal.months}mo ${cal.days}d` : "";

  return (
    <motion.li
      layout
      className="event"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <div className="event-main">
        <p className="event-dir">{future ? "Until" : "Since"}</p>
        <h3>{ev.label}</h3>
        <p className="muted">{fmtDate(at)}{long && `, ${long}`}</p>
      </div>
      <p className="event-count" aria-label={`${nf.format(days)} days, ${h} hours, ${m} minutes`}>
        <span className="event-days">{nf.format(days)}<small>days</small></span>
        <span className="event-clock">{pad(h)}:{pad(m)}:<Roll value={pad(s)} /></span>
      </p>
      <button type="button" className="icon-btn" aria-label={`Remove ${ev.label}`} onClick={onRemove}>
        <Ic icon={Trash2} />
      </button>
    </motion.li>
  );
}

export function Events({ events, now, onChange }: { events: EventItem[]; now: Date; onChange: (e: EventItem[]) => void }) {
  const [label, setLabel] = useState("");
  const [at, setAt] = useState("");
  const [error, setError] = useState("");

  const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * MS.m).toISOString().slice(0, 16);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return setError("Give the event a name.");
    if (!at) return setError("Pick a date and time.");
    setError("");
    onChange([...events, { id: uid(), label: label.trim().slice(0, 60), at }]);
    setLabel("");
    setAt("");
  };

  const sorted = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="events">
      <form className="field event-form" onSubmit={add} noValidate>
        <div className="field-row">
          <label htmlFor="ev-label">Event name</label>
          <input id="ev-label" className="text-input" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} aria-describedby="ev-error" />
        </div>
        <div className="field-row">
          <label htmlFor="ev-at">Date and time</label>
          <DatePicker id="ev-at" value={at} max={FAR} today={nowStr} invalid={!!error && !at} describedBy="ev-error" onChange={setAt} />
        </div>
        <p className="error" id="ev-error" role="alert" aria-live="polite">{error}</p>
        <button type="submit" className="btn-primary with-icon">
          <Ic icon={Plus} size={16} /> Add event
        </button>
      </form>

      {sorted.length ? (
        <ul className="event-list">
          <AnimatePresence initial={false}>
            {sorted.map((ev) => (
              <EventRow key={ev.id} ev={ev} now={now} onRemove={() => onChange(events.filter((x) => x.id !== ev.id))} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="empty-state">
          <Ic icon={CalendarClock} size={28} />
          <h2>No events yet</h2>
          <p className="muted">Count down to a trip or a deadline, or count up from a move, a quit date or a first day.</p>
        </div>
      )}
    </div>
  );
}
