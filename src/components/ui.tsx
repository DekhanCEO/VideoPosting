"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Copy, ExternalLink, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "soft" | "twitch";
type Size = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 select-none",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
      primary: "gradient-brand text-accent-fg shadow-[0_4px_14px_-4px_var(--accent)] hover:brightness-110 hover:shadow-[0_6px_20px_-4px_var(--accent)]",
      secondary: "border border-border bg-surface text-fg shadow-card hover:bg-surface-2 hover:border-border-strong",
      outline: "border border-border-strong bg-transparent text-fg hover:bg-surface-2",
      ghost: "text-muted hover:bg-surface-2 hover:text-fg",
      soft: "bg-accent-soft text-accent hover:brightness-95 dark:hover:brightness-125",
      danger: "bg-danger text-white hover:brightness-110",
      twitch: "bg-[#9146FF] text-white shadow-[0_8px_24px_-10px_#9146FF] hover:bg-[#772CE8]",
    }[variant],
    {
      xs: "h-7 px-2.5 text-xs rounded-lg",
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "size-10",
      "icon-sm": "size-8 rounded-lg",
    }[size],
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ variant, size, loading, className, children, disabled, type = "button", ...props }, ref) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes                                                              */
/* ------------------------------------------------------------------ */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-5 pt-5", className)}>
      {icon && <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">{icon}</div>}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-tight">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Champs de formulaire                                                */
/* ------------------------------------------------------------------ */

const fieldBase =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg placeholder:text-subtle transition-colors outline-none hover:border-border-strong focus:border-accent focus:ring-4 focus:ring-[var(--ring)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-10", invalid && "border-danger focus:border-danger", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(fieldBase, "min-h-24 resize-y py-2.5 leading-relaxed scrollbar-thin", invalid && "border-danger focus:border-danger", className)}
        {...props}
      />
    );
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(fieldBase, "h-10 cursor-pointer appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  counter,
  children,
  className,
  htmlFor,
  action,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  counter?: { value: number; max: number };
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  action?: ReactNode;
}) {
  const over = counter && counter.value > counter.max;
  const near = counter && !over && counter.value > counter.max * 0.9;
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || counter || action) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="text-sm font-medium">
              {label}
            </label>
          )}
          <div className="flex items-center gap-2">
            {action}
            {counter && (
              <span className={cn("text-xs tabular-nums text-subtle", near && "text-warning", over && "font-semibold text-danger")}>
                {counter.value.toLocaleString("fr-FR")} / {counter.max.toLocaleString("fr-FR")}
              </span>
            )}
          </div>
        </div>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
  className,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const toggle = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-6 w-11" : "h-5 w-9",
        checked ? "bg-accent" : "bg-surface-3",
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow transition-transform",
          size === "md" ? "size-5" : "size-4",
          checked ? (size === "md" ? "translate-x-5.5" : "translate-x-4.5") : "translate-x-0.5",
        )}
      />
    </button>
  );
  if (!label) return toggle;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <label htmlFor={id} className={cn("min-w-0 cursor-pointer", disabled && "cursor-not-allowed opacity-60")}>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </label>
      {toggle}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-[var(--accent)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all",
            size === "md" ? "h-8 px-3 text-sm" : "h-7 px-2.5 text-xs",
            value === o.value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Éléments d'affichage                                                */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        {
          neutral: "bg-surface-2 text-muted",
          accent: "bg-accent-soft text-accent",
          success: "bg-success/12 text-success",
          warning: "bg-warning/12 text-warning",
          danger: "bg-danger/12 text-danger",
          info: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
        }[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Progress({ value, className, tone = "accent" }: { value: number; className?: string; tone?: "accent" | "success" | "danger" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "accent" && "gradient-brand",
          tone === "success" && "bg-success",
          tone === "danger" && "bg-danger",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Avatar({ src, name, size = 36, className }: { src?: string; name?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = (name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full gradient-brand font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-muted", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</kbd>;
}

/* ------------------------------------------------------------------ */
/* Fenêtre modale                                                      */
/* ------------------------------------------------------------------ */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select, button")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-3xl border border-border bg-surface shadow-pop sm:animate-scale-in sm:rounded-3xl",
          { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start gap-4 border-b border-border px-6 py-5">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className={buttonClass("ghost", "icon-sm")} aria-label="Fermer">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Menu déroulant                                                      */
/* ------------------------------------------------------------------ */

export function Menu({
  trigger,
  items,
  align = "end",
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean }) => ReactNode;
  items: ({ label: ReactNode; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean } | "separator")[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-40 mt-1.5 min-w-48 animate-scale-in rounded-xl border border-border bg-surface p-1 shadow-pop",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) =>
            item === "separator" ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 disabled:opacity-50",
                  item.danger && "text-danger",
                )}
              >
                {item.icon && <span className="text-muted [&>svg]:size-4">{item.icon}</span>}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-xs text-bg opacity-0 shadow-pop transition-opacity group-hover/tt:opacity-100">
        {content}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Aides : copie, étapes, liens externes                               */
/* ------------------------------------------------------------------ */

/** Valeur à copier. wrap : affichage sur plusieurs lignes (adresse longue à recopier exactement). */
export function CopyField({ value, wrap }: { value: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      {wrap ? (
        <code className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs break-all text-fg select-all">{value}</code>
      ) : (
        <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
      )}
      <Button
        type="button"
        size="icon"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label="Copier"
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

export function Steps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">{i + 1}</span>
          <span className="min-w-0 text-muted">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function ExternalA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}
