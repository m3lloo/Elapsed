import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { Bell, BellOff, CalendarClock, Download, Globe, Hourglass, Trash2, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { deviceTz, instantToWall, milestones, parseWall, timeZones } from "./lib/time";
import { fmtDate, wallStr } from "./lib/format";
import { alertsSupported, enableAlerts, notify } from "./lib/alerts";
import {
  loadSeen, loadStore, loadTheme, readShared, saveSeen, saveStore, saveTheme, uid,
  type EventItem, type Person, type Theme,
} from "./lib/storage";
import { DatePicker } from "./components/DatePicker";
import { Ic } from "./components/Icon";
import { Breakdown, GhostNumber, Readout } from "./components/Parts";
import { PersonBar } from "./components/PersonBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { Milestones } from "./components/Milestones";
import { WeeksGrid } from "./components/WeeksGrid";
import { Facts } from "./components/Facts";
import { ShareBar } from "./components/ShareBar";
import { Compare } from "./components/Compare";
import { Events } from "./components/Events";

type View = "life" | "compare" | "events";
const TABS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "life", label: "Life", icon: Hourglass },
  { id: "compare", label: "Compare", icon: Users },
  { id: "events", label: "Events", icon: CalendarClock },
];

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface InstallEvent extends Event { prompt: () => Promise<void> }

export default function App() {
  const [store, setStore] = useState(loadStore);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [view, setView] = useState<View>("life");
  const [incoming, setIncoming] = useState(readShared);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [denied, setDenied] = useState(false);
  const now = useNow(100);
  const zones = useMemo(timeZones, []);
  const seen = useRef(loadSeen());
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25, mass: 0.3 });

  // Cursor spotlight: surfaces read --mx/--my to place their hover glow.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(".field, .readout, .mile-feature, .mile-list li, .bento-cell, .cmp-side, .event, .age .stat");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => saveStore(store), [store]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  useEffect(() => setConfirmDel(false), [store.activeId]);

  const person = store.people.find((p) => p.id === store.activeId) as Person;
  const tz = person.tz || deviceTz();
  const parsed = person.birth ? parseWall(person.birth, tz) : null;
  const wallNow = instantToWall(now, tz);

  let error = "";
  if (person.birth) {
    if (!parsed) error = "Enter a valid date and time.";
    else if (parsed.instant > now) error = "That moment hasn’t happened yet.";
    else if (parsed.wall.getFullYear() < 1900) error = "Pick a year from 1900 onward.";
  }
  const birth = parsed && !error ? parsed.instant : null;

  const patchPerson = (patch: Partial<Person>) =>
    setStore((s) => ({ ...s, people: s.people.map((p) => (p.id === s.activeId ? { ...p, ...patch } : p)) }));

  const addPerson = (init?: Omit<Person, "id">) => {
    const p: Person = { id: uid(), name: `Person ${store.people.length + 1}`, birth: "", ...init };
    setStore((s) => ({ ...s, people: [...s.people, p], activeId: p.id }));
    setView("life");
  };

  const removePerson = () =>
    setStore((s) => {
      const people = s.people.filter((p) => p.id !== s.activeId);
      return { ...s, people, activeId: people[0].id };
    });

  const acceptShared = () => {
    if (incoming) addPerson(incoming);
    dismissShared();
  };
  const dismissShared = () => {
    setIncoming(null);
    history.replaceState(null, "", location.pathname + location.search);
  };

  const setEvents = (events: EventItem[]) => setStore((s) => ({ ...s, events }));

  const toggleAlerts = async () => {
    if (store.alerts) return setStore((s) => ({ ...s, alerts: false }));
    const ok = await enableAlerts();
    setDenied(!ok);
    if (ok) {
      seen.current = Date.now();
      setStore((s) => ({ ...s, alerts: true }));
    }
  };

  // Fire a notification for each milestone that passed since the app was last open.
  const sec = Math.floor(now.getTime() / 1000);
  useEffect(() => {
    if (!store.alerts || !alertsSupported() || Notification.permission !== "granted") return;
    const t = Date.now();
    const last = seen.current || t;
    for (const p of store.people) {
      const b = p.birth ? parseWall(p.birth, p.tz || deviceTz()) : null;
      if (!b) continue;
      for (const m of milestones(b.instant))
        if (m.at.getTime() > last && m.at.getTime() <= t) void notify(`${p.name.trim() || "Someone"} reached ${m.label}`, fmtDate(m.at));
    }
    seen.current = t;
    if (sec % 10 === 0) saveSeen(t);
  }, [sec, store.alerts, store.people]);

  useEffect(() => {
    const flush = () => saveSeen(Date.now());
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === view);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = TABS[(next + TABS.length) % TABS.length];
    setView(t.id);
    document.getElementById(`tab-${t.id}`)?.focus();
  };

  const alertToggle = alertsSupported() && (
    <div className="alert-row">
      <button type="button" className="btn-chip" onClick={toggleAlerts} aria-pressed={store.alerts}>
        <Ic icon={store.alerts ? Bell : BellOff} size={16} />
        {store.alerts ? "Alerts on" : "Alert me at milestones"}
      </button>
      <p className="muted small">
        {denied
          ? "Notifications are blocked in your browser settings."
          : "Alerts fire while Elapsed is open in a tab or installed window, and catch up on anything reached since you last opened it."}
      </p>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="progress" style={{ scaleX: progress }} aria-hidden="true" />
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
      <div className="wrap">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
          <div className="brand">
            <span className="logo"><Ic icon={Hourglass} size={18} /></span>
            <div>
              <h1>Elapsed</h1>
              <p className="tagline">Your life, counted live</p>
            </div>
          </div>
          <div className="header-actions">
            {install && (
              <button type="button" className="btn-chip" onClick={() => void install.prompt().then(() => setInstall(null))}>
                <Ic icon={Download} size={16} /> Install
              </button>
            )}
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </motion.header>

        <div className="tabbar">
          <div className="tabs" role="tablist" aria-label="Sections" onKeyDown={onTabKey}>
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={view === id}
                aria-controls="panel"
                tabIndex={view === id ? 0 : -1}
                className="tab"
                onClick={() => setView(id)}
              >
                <Ic icon={icon} size={16} />
                {label}
                {view === id && <motion.span layoutId="tab-line" className="tab-line" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              </button>
            ))}
          </div>
          <p className="clock">{now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" })}</p>
        </div>

        <AnimatePresence>
          {incoming && (
            <motion.div
              className="banner"
              role="status"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p>
                <strong>{incoming.name || "Someone"}</strong> shared a profile with you ({fmtDate(new Date(incoming.birth))}).
              </p>
              <button type="button" className="btn-primary with-icon" onClick={acceptShared}>
                <Ic icon={UserPlus} size={16} /> Add to my list
              </button>
              <button type="button" className="icon-btn" aria-label="Dismiss shared profile" onClick={dismissShared}>
                <Ic icon={X} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <main id="panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {view === "life" && (
              <>
                <PersonBar people={store.people} activeId={store.activeId} onSelect={(id) => setStore((s) => ({ ...s, activeId: id }))} onAdd={() => addPerson()} />

                <div className="top">
                  <div className="field">
                    <div className="field-row">
                      <label htmlFor="name">Name</label>
                      <input id="name" className="text-input" value={person.name} maxLength={40} onChange={(e) => patchPerson({ name: e.target.value })} />
                    </div>
                    <div className="field-row">
                      <label htmlFor="birth">Date and time of birth</label>
                      <DatePicker
                        id="birth"
                        value={person.birth}
                        max={wallStr(wallNow)}
                        today={wallStr(wallNow)}
                        invalid={!!error}
                        describedBy="birth-help"
                        onChange={(v) => patchPerson({ birth: v })}
                      />
                      <AnimatePresence mode="wait" initial={false}>
                        {error ? (
                          <motion.p
                            key="error"
                            className="error"
                            id="birth-help"
                            role="alert"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                          >
                            {error}
                          </motion.p>
                        ) : (
                          <motion.p
                            key={person.birth ? "saved" : "intro"}
                            className="hint"
                            id="birth-help"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {person.birth ? "Saved on this device." : "Enter your birth date to start the clock. If you don’t know the time, leave it at 12:00 AM."}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <details className="tz" open={!!person.tz}>
                      <summary><Ic icon={Globe} size={16} /> Born in a different time zone?</summary>
                      <label htmlFor="tz">Birth time zone</label>
                      <select id="tz" className="text-input" value={person.tz ?? ""} onChange={(e) => patchPerson({ tz: e.target.value || undefined })}>
                        <option value="">Device time zone ({deviceTz()})</option>
                        {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
                      </select>
                    </details>

                    {store.people.length > 1 && (
                      <div className="field-foot">
                        {confirmDel ? (
                          <>
                            <span className="muted small">Remove {person.name.trim() || "this person"}?</span>
                            <button type="button" className="btn-danger" onClick={removePerson}>Remove</button>
                            <button type="button" className="btn-ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" className="btn-ghost with-icon" onClick={() => setConfirmDel(true)}>
                            <Ic icon={Trash2} size={16} /> Remove person
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {birth ? (
                    <Readout key={person.id} birth={birth} now={now} />
                  ) : (
                    <section className="readout empty" aria-label="Hours alive, waiting for a birth date">
                      <GhostNumber />
                      <p className="caption">hours alive</p>
                    </section>
                  )}
                </div>

                {birth && (
                  <div key={person.id}>
                    <ShareBar person={person} birth={birth} tz={tz} now={now} />
                    <Breakdown birth={birth} tz={tz} now={now} />
                    <Milestones birth={birth} now={now} footer={alertToggle} />
                    <WeeksGrid birth={birth} now={now} theme={theme} />
                    <Facts ms={now.getTime() - birth.getTime()} />
                  </div>
                )}
              </>
            )}

            {view === "compare" && <Compare people={store.people} now={now} onAdd={() => addPerson()} />}
            {view === "events" && <Events events={store.events} now={now} onChange={setEvents} />}
          </motion.div>
        </main>

        <footer>Calculated in your device’s time zone ({deviceTz()}) unless you pick a birth time zone. Nothing leaves your browser unless you copy a share link.</footer>
      </div>
    </MotionConfig>
  );
}
