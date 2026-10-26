import { motion } from "motion/react";
import { UserPlus } from "lucide-react";
import type { Person } from "../lib/storage";
import { Ic } from "./Icon";

export function PersonBar({ people, activeId, onSelect, onAdd }: {
  people: Person[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="people" role="tablist" aria-label="People">
      {people.map((p) => {
        const on = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={on}
            className="person"
            onClick={() => onSelect(p.id)}
          >
            {on && (
              <motion.span layoutId="person-pill" className="person-pill" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
            )}
            <span className="person-name">{p.name.trim() || "Unnamed"}</span>
          </button>
        );
      })}
      <button type="button" className="person add" onClick={onAdd}>
        <Ic icon={UserPlus} size={16} />
        <span className="person-name">Add person</span>
      </button>
    </div>
  );
}
