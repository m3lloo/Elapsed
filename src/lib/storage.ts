export interface Person { id: string; name: string; birth: string; tz?: string }
export interface EventItem { id: string; label: string; at: string }
export interface Store { people: Person[]; events: EventItem[]; activeId: string; alerts: boolean }
export type Theme = "system" | "light" | "dark";

const STORE_KEY = "elapsed:v2";
const LEGACY_KEY = "elapsed:birth";
const THEME_KEY = "elapsed:theme";
const SEEN_KEY = "elapsed:seen";

export const uid = () => Math.random().toString(36).slice(2, 9);

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage unavailable: everything still works for this session */
  }
}

export function loadStore(): Store {
  const raw = read(STORE_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw) as Store;
      if (Array.isArray(s.people) && s.people.length) {
        return {
          people: s.people,
          events: Array.isArray(s.events) ? s.events : [],
          activeId: s.people.some((p) => p.id === s.activeId) ? s.activeId : s.people[0].id,
          alerts: !!s.alerts,
        };
      }
    } catch {
      /* fall through to a fresh store */
    }
  }
  const me: Person = { id: uid(), name: "Me", birth: read(LEGACY_KEY) ?? "" };
  return { people: [me], events: [], activeId: me.id, alerts: false };
}

export const saveStore = (s: Store) => write(STORE_KEY, JSON.stringify(s));

export const loadTheme = (): Theme => {
  const t = read(THEME_KEY);
  return t === "light" || t === "dark" ? t : "system";
};
export const saveTheme = (t: Theme) => write(THEME_KEY, t);

/** Last time (ms) the app was open and checked for reached milestones. */
export const loadSeen = (): number => Number(read(SEEN_KEY)) || 0;
export const saveSeen = (ms: number) => write(SEEN_KEY, String(ms));

/* ---------- Share links: the profile travels in the URL hash, never to a server ---------- */

interface Shared { n: string; b: string; z?: string }

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function shareUrl(p: Person): string {
  const payload: Shared = { n: p.name, b: p.birth, ...(p.tz ? { z: p.tz } : {}) };
  return `${location.origin}${location.pathname}#share=${toB64(JSON.stringify(payload))}`;
}

export function readShared(): Omit<Person, "id"> | null {
  const m = /^#share=([\w-]+)$/.exec(location.hash);
  if (!m) return null;
  try {
    const s = JSON.parse(fromB64(m[1])) as Shared;
    if (typeof s.n !== "string" || typeof s.b !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.b)) return null;
    return { name: s.n.slice(0, 40), birth: s.b, tz: typeof s.z === "string" ? s.z : undefined };
  } catch {
    return null;
  }
}
