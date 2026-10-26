import { motion } from "motion/react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import type { Theme } from "../lib/storage";
import { Ic } from "./Icon";

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, icon }) => {
        const on = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(value)}
          >
            {on && <motion.span layoutId="theme-pill" className="theme-pill" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <Ic icon={icon} size={16} className="theme-ic" />
          </button>
        );
      })}
    </div>
  );
}
