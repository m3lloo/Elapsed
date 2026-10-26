import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Download, Link2, Share2, TriangleAlert, type LucideIcon } from "lucide-react";
import { MS, calendarAge, instantToWall } from "../lib/time";
import { nf } from "../lib/format";
import { makeCard } from "../lib/card";
import { shareUrl, type Person } from "../lib/storage";
import { Ic } from "./Icon";

type Status = "idle" | "done" | "error";

function ActionButton({ icon, label, onRun }: { icon: LucideIcon; label: string; onRun: () => Promise<void> }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number>();
  const run = async () => {
    try {
      await onRun();
      setStatus("done");
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return; // user closed the share sheet
      setStatus("error");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 1800);
  };
  const shown = status === "done" ? Check : status === "error" ? TriangleAlert : icon;
  return (
    <motion.button type="button" className="btn-chip" onClick={run} whileTap={{ scale: 0.96 }}>
      <span className="chip-icon">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Ic icon={shown} size={16} />
          </motion.span>
        </AnimatePresence>
      </span>
      {status === "done" ? "Done" : status === "error" ? "Failed" : label}
    </motion.button>
  );
}

export function ShareBar({ person, birth, tz, now }: { person: Person; birth: Date; tz: string; now: Date }) {
  const hours = (now.getTime() - birth.getTime()) / MS.h;
  const age = calendarAge(instantToWall(birth, tz), instantToWall(now, tz));
  const ageLine = `${age.years} years, ${age.months} months, ${age.days} days`;
  const hoursLine = nf.format(Math.floor(hours));
  const name = person.name.trim() || "Me";
  const summary = `${name} has been alive for ${hoursLine} hours (${ageLine}).`;

  const makeFile = async () => new File([await makeCard({ name, hours: hoursLine, age: ageLine })], "elapsed.png", { type: "image/png" });
  const canShareFiles = typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });

  return (
    <div className="share-bar" role="group" aria-label="Share">
      <ActionButton icon={Copy} label="Copy summary" onRun={() => navigator.clipboard.writeText(summary)} />
      <ActionButton
        icon={Download}
        label="Save image"
        onRun={async () => {
          const url = URL.createObjectURL(await makeFile());
          const a = document.createElement("a");
          a.href = url;
          a.download = `elapsed-${name.toLowerCase().replace(/\W+/g, "-")}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      />
      {canShareFiles && (
        <ActionButton icon={Share2} label="Share" onRun={async () => navigator.share({ text: summary, files: [await makeFile()] })} />
      )}
      <ActionButton icon={Link2} label="Copy link" onRun={() => navigator.clipboard.writeText(shareUrl(person))} />
      <p className="share-note">The link contains the date of birth. Anyone you send it to can read it.</p>
    </div>
  );
}
