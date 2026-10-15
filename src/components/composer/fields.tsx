"use client";

import { useState, type ReactNode } from "react";
import { Hash, Link2, Link2Off, Plus, RotateCcw, X } from "lucide-react";
import { normalizeHashtag, parseHashtags } from "@/lib/captions";
import type { HashtagGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field, Textarea, Input, Tooltip } from "../ui";

/** Saisie de « puces » : hashtags, tags YouTube, collaborateurs… */
export function ChipsInput({
  value,
  onChange,
  placeholder,
  prefix = "#",
  max,
  normalize = normalizeHashtag,
  splitter = parseHashtags,
  groups,
  invalid,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  prefix?: string;
  max?: number;
  normalize?: (raw: string) => string;
  splitter?: (raw: string) => string[];
  groups?: HashtagGroup[];
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const full = max !== undefined && value.length >= max;

  const add = (raw: string) => {
    const incoming = splitter(raw).map(normalize).filter(Boolean);
    if (!incoming.length) return;
    const next = [...value];
    for (const tag of incoming) {
      if (max !== undefined && next.length >= max) break;
      if (!next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1.5 transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-[var(--ring)] hover:border-border-strong",
          invalid && "border-danger",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex animate-scale-in items-center gap-1 rounded-lg bg-accent-soft py-1 pr-1 pl-2 text-xs font-medium text-accent">
            {prefix}
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded p-0.5 opacity-70 hover:bg-accent/15 hover:opacity-100"
              aria-label={`Retirer ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          disabled={full}
          onChange={(e) => {
            const v = e.target.value;
            if (/[\s,;]$/.test(v)) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[\s,;]/.test(text)) {
              e.preventDefault();
              add(text);
            }
          }}
          placeholder={full ? `Maximum ${max}` : value.length ? "" : placeholder}
          className="h-7 min-w-28 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle"
        />
      </div>
      {groups && groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-subtle">Groupes :</span>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => add(g.tags.join(" "))}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border-strong px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              title={g.tags.map((t) => `#${t}`).join(" ")}
            >
              <Plus className="size-3" />
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SyncBadge({ synced, onResync }: { synced: boolean; onResync: () => void }) {
  if (synced) {
    return (
      <Tooltip content="Ce champ reprend automatiquement le contenu commun. Modifiez-le pour le personnaliser.">
        <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
          <Link2 className="size-3" /> Synchronisé
        </span>
      </Tooltip>
    );
  }
  return (
    <button
      type="button"
      onClick={onResync}
      className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors hover:text-accent"
      title="Revenir au contenu commun"
    >
      <Link2Off className="size-3" /> Personnalisé · <RotateCcw className="size-3" /> Resynchroniser
    </button>
  );
}

/** Champ texte qui reprend le contenu commun tant qu'il n'est pas modifié. */
export function SyncedTextField({
  label,
  value,
  synced,
  onChange,
  onResync,
  max,
  length,
  multiline,
  rows = 5,
  placeholder,
  hint,
  error,
  footer,
}: {
  label: ReactNode;
  value: string;
  synced: boolean;
  onChange: (v: string) => void;
  onResync: () => void;
  max: number;
  length?: number;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  footer?: ReactNode;
}) {
  const count = length ?? Array.from(value).length;
  return (
    <Field
      label={label}
      counter={{ value: count, max }}
      action={<SyncBadge synced={synced} onResync={onResync} />}
      hint={hint}
      error={error}
    >
      {multiline ? (
        <Textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          invalid={!!error || count > max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(synced && "bg-surface-2/60")}
        />
      ) : (
        <Input
          value={value}
          placeholder={placeholder}
          invalid={!!error || count > max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(synced && "bg-surface-2/60")}
        />
      )}
      {footer}
    </Field>
  );
}

export function HashtagCount({ count, max }: { count: number; max?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-subtle", max !== undefined && count > max && "font-semibold text-danger")}>
      <Hash className="size-3" />
      {count}
      {max !== undefined && ` / ${max}`} hashtags
    </span>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
