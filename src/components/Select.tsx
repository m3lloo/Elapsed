import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { Ic } from "./Icon";

export interface Option { value: number; label: string; disabled?: boolean }

interface Props {
  label: string;
  value: number;
  options: Option[];
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
}

/** Themed listbox that replaces a native <select>: same keyboard model, but styled to match the app on every device. */
export function Select({ label, value, options, onChange, disabled, className = "" }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const current = options.find((o) => o.value === value);
  const enabled = (i: number) => !options[i]?.disabled;

  const show = () => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i < 0 ? options.findIndex((o) => !o.disabled) : i);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const move = (from: number, step: number) => {
    let i = from;
    do i += step; while (i >= 0 && i < options.length && !enabled(i));
    return i >= 0 && i < options.length ? i : from;
  };

  const pick = (i: number) => {
    if (!enabled(i)) return;
    onChange(options[i].value);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((a) => move(a, 1)),
      ArrowUp: () => setActive((a) => move(a, -1)),
      PageDown: () => setActive((a) => move(Math.min(a + 5, options.length - 1) - 1, 1)),
      PageUp: () => setActive((a) => move(Math.max(a - 5, 0) + 1, -1)),
      Home: () => setActive(move(-1, 1)),
      End: () => setActive(move(options.length, -1)),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => close(),
      Tab: () => close(false),
    };
    const fn = keys[e.key];
    if (fn) {
      if (e.key !== "Tab") e.preventDefault();
      e.stopPropagation();
      fn();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const t = typed.current;
      const now = Date.now();
      t.text = (now - t.at > 700 ? "" : t.text) + e.key.toLowerCase();
      t.at = now;
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
      if (hit >= 0) setActive(hit);
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  return (
    <div
      className={`sel ${className}`}
      ref={root}
      onBlur={(e) => {
        if (open && !root.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="sel-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
      >
        <span className="sel-value">{current?.label ?? "–"}</span>
        <Ic icon={ChevronDown} size={16} className="sel-chev" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            className="sel-list"
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onKey}
            initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1, transition: { type: "spring", stiffness: 420, damping: 32 } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                className={`sel-opt${i === active ? " active" : ""}${o.value === value ? " chosen" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => enabled(i) && setActive(i)}
                onClick={() => pick(i)}
              >
                <span>{o.label}</span>
                {o.value === value && <Ic icon={Check} size={15} />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
