import { MS } from "./time";

export const nf = new Intl.NumberFormat("en-US");
export const nfCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
export const pad = (n: number) => String(n).padStart(2, "0");
export const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const fracOf = (hours: number) => String(Math.floor((hours - Math.floor(hours)) * 10000)).padStart(4, "0");

const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "in 3 months", "2 years ago": the single largest sensible unit. */
export function relative(to: Date, from: Date): string {
  const diff = to.getTime() - from.getTime();
  const abs = Math.abs(diff);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365.25 * MS.d], ["month", 30.44 * MS.d], ["week", MS.w], ["day", MS.d], ["hour", MS.h], ["minute", MS.m],
  ];
  for (const [unit, size] of steps) {
    if (abs >= size) return rtf.format(Math.trunc(diff / size), unit);
  }
  return rtf.format(Math.trunc(diff / MS.s), "second");
}

/** "YYYY-MM-DDTHH:mm" from a Date's local fields (what the date picker stores). */
export const wallStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
