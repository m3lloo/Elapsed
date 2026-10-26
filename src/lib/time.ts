export const MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const;

export interface Age {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Add calendar months, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/** Calendar-accurate age: whole years and months, then exact remaining time. */
export function calendarAge(from: Date, to: Date): Age {
  let k = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (addMonths(from, k) > to) k--;
  let rest = to.getTime() - addMonths(from, k).getTime();
  const days = Math.floor(rest / MS.d);
  rest -= days * MS.d;
  const hours = Math.floor(rest / MS.h);
  rest -= hours * MS.h;
  const minutes = Math.floor(rest / MS.m);
  rest -= minutes * MS.m;
  const seconds = Math.floor(rest / MS.s);
  return { years: Math.floor(k / 12), months: k % 12, days, hours, minutes, seconds };
}

export function nextBirthday(from: Date, now: Date): Date {
  const at = (y: number) => {
    const d = new Date(from);
    d.setFullYear(y);
    return d;
  };
  const d = at(now.getFullYear());
  return d > now ? d : at(now.getFullYear() + 1);
}

/* ---------- Time zones ---------- */

export const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function tzFormat(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function tzFields(at: Date, tz: string) {
  const o: Record<string, number> = {};
  for (const p of tzFormat(tz).formatToParts(at)) if (p.type !== "literal") o[p.type] = +p.value;
  return o;
}

/** Offset of `tz` from UTC at `at`, in ms. */
function tzOffsetMs(at: Date, tz: string): number {
  const p = tzFields(at, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (at.getTime() - at.getMilliseconds());
}

/** The wall clock in `tz` at instant `at`, as a Date whose local fields hold that wall time. */
export function instantToWall(at: Date, tz: string): Date {
  const p = tzFields(at, tz);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, at.getMilliseconds());
}

/** Inverse of instantToWall: the real instant at which `tz` shows the wall time held in `wall`'s local fields. */
export function wallToInstant(wall: Date, tz: string): Date {
  const asUtc = Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes(), wall.getSeconds(), wall.getMilliseconds());
  let t = asUtc - tzOffsetMs(new Date(asUtc), tz);
  t = asUtc - tzOffsetMs(new Date(t), tz);
  return new Date(t);
}

/** Parse "YYYY-MM-DDTHH:mm" as a wall time in `tz`. Null if malformed. */
export function parseWall(value: string, tz: string): { instant: Date; wall: Date } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!r) return null;
  const wall = new Date(+r[1], +r[2] - 1, +r[3], +r[4], +r[5]);
  if (Number.isNaN(wall.getTime())) return null;
  return { wall, instant: wallToInstant(wall, tz) };
}

export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [deviceTz()];
  }
}

/* ---------- Milestones ---------- */

export interface Milestone { key: string; label: string; at: Date }

const MILESTONE_DEFS: { unit: string; ms: number; steps: number[] }[] = [
  { unit: "hours", ms: MS.h, steps: [50_000, 100_000, 150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 500_000, 600_000] },
  { unit: "days", ms: MS.d, steps: [5_000, 10_000, 15_000, 20_000, 25_000, 30_000] },
  { unit: "weeks", ms: MS.w, steps: [1_000, 2_000, 3_000, 4_000] },
  { unit: "minutes", ms: MS.m, steps: [10_000_000, 25_000_000, 50_000_000, 100_000_000, 200_000_000, 300_000_000] },
  { unit: "seconds", ms: MS.s, steps: [500_000_000, 1_000_000_000, 1_500_000_000, 2_000_000_000, 2_500_000_000, 3_000_000_000] },
];
const nfInt = new Intl.NumberFormat("en-US");

/** Every round-number milestone for someone born at `birth`, soonest first. */
export function milestones(birth: Date): Milestone[] {
  const out: Milestone[] = [];
  for (const d of MILESTONE_DEFS)
    for (const n of d.steps)
      out.push({ key: `${d.unit}-${n}`, label: `${nfInt.format(n)} ${d.unit}`, at: new Date(birth.getTime() + n * d.ms) });
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/* ---------- Fun facts (averages, not measurements) ---------- */

export function funFacts(ms: number) {
  const days = ms / MS.d;
  return {
    heartbeats: (ms / MS.m) * 80,
    breaths: (ms / MS.m) * 16,
    orbitKm: (ms / MS.s) * 29.78,
    mars: days / 686.98,
    jupiter: days / 4332.59,
    mercury: days / 87.97,
  };
}

/** Next round hour count (multiple of `step`), when it lands, and progress toward it. */
export function nextMilestone(from: Date, hours: number, step = 25_000) {
  const target = (Math.floor(hours / step) + 1) * step;
  return {
    target,
    at: new Date(from.getTime() + target * MS.h),
    progress: (hours % step) / step,
  };
}
