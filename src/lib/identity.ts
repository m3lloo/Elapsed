import { MS } from "./time";

/** Facts derived from the birth date alone. `wall` is the birth wall-clock time (local fields) in the birth time zone. */

const ZODIAC: { name: string; symbol: string; element: string; from: [number, number] }[] = [
  { name: "Capricorn", symbol: "♑", element: "Earth", from: [12, 22] },
  { name: "Aquarius", symbol: "♒", element: "Air", from: [1, 20] },
  { name: "Pisces", symbol: "♓", element: "Water", from: [2, 19] },
  { name: "Aries", symbol: "♈", element: "Fire", from: [3, 21] },
  { name: "Taurus", symbol: "♉", element: "Earth", from: [4, 20] },
  { name: "Gemini", symbol: "♊", element: "Air", from: [5, 21] },
  { name: "Cancer", symbol: "♋", element: "Water", from: [6, 21] },
  { name: "Leo", symbol: "♌", element: "Fire", from: [7, 23] },
  { name: "Virgo", symbol: "♍", element: "Earth", from: [8, 23] },
  { name: "Libra", symbol: "♎", element: "Air", from: [9, 23] },
  { name: "Scorpio", symbol: "♏", element: "Water", from: [10, 23] },
  { name: "Sagittarius", symbol: "♐", element: "Fire", from: [11, 22] },
];

export function zodiac(wall: Date) {
  const m = wall.getMonth() + 1;
  const d = wall.getDate();
  let sign = ZODIAC[0];
  for (const z of ZODIAC) if (m > z.from[0] || (m === z.from[0] && d >= z.from[1])) sign = z;
  return sign;
}

const ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];

/** Chinese zodiac year. Uses the browser's Chinese calendar so dates before the lunar new year land in the previous year. */
export function chineseYear(wall: Date) {
  let y = wall.getFullYear();
  try {
    const part = new Intl.DateTimeFormat("en-u-ca-chinese", { year: "numeric" }).formatToParts(wall).find((p) => (p.type as string) === "relatedYear");
    if (part) y = +part.value;
  } catch {
    /* fall back to the Gregorian year */
  }
  const i = (((y - 4) % 12) + 12) % 12;
  const el = Math.floor((((y - 4) % 10) + 10) % 10 / 2);
  return { animal: ANIMALS[i], element: ELEMENTS[el], year: y };
}

export function generation(year: number) {
  if (year <= 1927) return { name: "Greatest Generation", span: "to 1927" };
  if (year <= 1945) return { name: "Silent Generation", span: "1928–1945" };
  if (year <= 1964) return { name: "Baby Boomer", span: "1946–1964" };
  if (year <= 1980) return { name: "Generation X", span: "1965–1980" };
  if (year <= 1996) return { name: "Millennial", span: "1981–1996" };
  if (year <= 2012) return { name: "Generation Z", span: "1997–2012" };
  return { name: "Generation Alpha", span: "2013 onward" };
}

const STONES = ["Garnet", "Amethyst", "Aquamarine", "Diamond", "Emerald", "Pearl", "Ruby", "Peridot", "Sapphire", "Opal", "Topaz", "Turquoise"];
export const birthstone = (wall: Date) => STONES[wall.getMonth()];

const SYNODIC = 29.530588853 * MS.d;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // a reference new moon

/** Where the Moon was in its cycle: 0 = new, 0.5 = full. */
export function moonPhase(at: Date) {
  const f = ((((at.getTime() - NEW_MOON) / SYNODIC) % 1) + 1) % 1;
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  return { fraction: f, name: names[Math.round(f * 8) % 8], lit: (1 - Math.cos(f * Math.PI * 2)) / 2 };
}

export const moonCycles = (ms: number) => ms / SYNODIC;

export function dayOfYear(wall: Date) {
  const start = new Date(wall.getFullYear(), 0, 0);
  return Math.floor((new Date(wall.getFullYear(), wall.getMonth(), wall.getDate()).getTime() - start.getTime()) / MS.d);
}
