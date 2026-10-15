"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Variation affichée avec flèche + texte (jamais la couleur seule). */
export function DeltaBadge({ value, suffix, invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-subtle">—</span>;
  const up = value > 0.0005;
  const down = value < -0.0005;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        good && "bg-success/10 text-success",
        bad && "bg-danger/10 text-danger",
        !good && !bad && "bg-surface-2 text-muted",
      )}
    >
      <Icon className="size-3.5" />
      {formatPercent(Math.abs(value))}
      {suffix && <span className="ml-1 font-normal opacity-80">{suffix}</span>}
    </span>
  );
}

export function StatTile({
  label,
  value,
  delta,
  hint,
  icon,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-muted [&>svg]:size-4">{icon}</span>}
      </div>
      <p className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        {delta}
        {hint}
      </div>
      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </div>
  );
}
