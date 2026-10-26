import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Upload } from "lucide-react";
import { sanitizeStore, type Store } from "../lib/storage";
import { Ic } from "./Icon";

/** Back up or restore everything that lives in this browser: people, events and settings. */
export function DataTools({ store, onReplace }: { store: Store; onReplace: (s: Store) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Store | null>(null);
  const [msg, setMsg] = useState("");

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: "elapsed", version: 2, ...store }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `elapsed-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg("Backup downloaded.");
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = sanitizeStore(JSON.parse(await file.text()));
      if (!next) throw new Error("shape");
      setPending(next);
      setMsg("");
    } catch {
      setPending(null);
      setMsg("That file isn’t an Elapsed backup.");
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="data-tools">
      <div className="data-row">
        <button type="button" className="btn-chip" onClick={exportJson}>
          <Ic icon={Download} size={16} /> Export backup
        </button>
        <button type="button" className="btn-chip" onClick={() => input.current?.click()}>
          <Ic icon={Upload} size={16} /> Import backup
        </button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      <AnimatePresence initial={false}>
        {pending && (
          <motion.div className="data-confirm" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <span>
              Replace what’s here with {pending.people.length} {pending.people.length === 1 ? "person" : "people"} and {pending.events.length} {pending.events.length === 1 ? "event" : "events"}?
            </span>
            <button type="button" className="btn-danger" onClick={() => { onReplace(pending); setPending(null); setMsg("Backup restored."); }}>Replace</button>
            <button type="button" className="btn-ghost" onClick={() => setPending(null)}>Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>
      {msg && <p className="muted small" role="status">{msg}</p>}
    </div>
  );
}
