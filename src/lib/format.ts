const nf = new Intl.NumberFormat("fr-FR");
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return nf.format(Math.round(n));
}

export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return Math.abs(n) < 10000 ? nf.format(Math.round(n)) : compact.format(n);
}

export function formatSigned(n: number | null | undefined, fmt: (v: number) => string = formatCompact): string {
  if (n === null || n === undefined) return "—";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;
}

/** Variation relative entre deux valeurs (null si non calculable). */
export function delta(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function formatCurrency(n: number | null | undefined, currency = "EUR", opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    notation: opts.compact && Math.abs(n) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: opts.compact || Number.isInteger(n) ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 })} ${units[i]}`;
}

export function formatDuration(sec: number | undefined): string {
  if (sec === undefined || !Number.isFinite(sec)) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(ts);
}

export function formatDate(ts: number | string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(`${ts}T12:00:00`) : new Date(ts);
  return new Intl.DateTimeFormat("fr-FR", opts).format(d);
}

export function formatTime(ts: number): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(ts);
}

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatRelative(ts: number | null | undefined): string {
  if (!ts) return "—";
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  if (abs < 45_000) return diff > 0 ? "dans un instant" : "à l'instant";
  if (abs < 3600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86400_000) return rtf.format(Math.round(diff / 3600_000), "hour");
  if (abs < 7 * 86400_000) return rtf.format(Math.round(diff / 86400_000), "day");
  return formatDateTime(ts);
}

/** Valeur pour <input type="datetime-local"> en heure locale. */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}
