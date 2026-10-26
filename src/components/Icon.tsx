import type { LucideIcon } from "lucide-react";

/** Every icon in the app goes through here so stroke width and sizing stay uniform. */
export function Ic({ icon: I, size = 18, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <I size={size} strokeWidth={1.75} aria-hidden="true" className={className} focusable="false" />;
}
