"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Graphiques SVG légers, sans dépendance :
 *  - traits de 2 px, barres ≤ 24 px aux extrémités arrondies (4 px),
 *  - séparation de 2 px couleur du fond entre segments empilés,
 *  - grille fine et discrète, infobulle au survol (réticule sur les courbes),
 *  - les textes utilisent les couleurs de texte, jamais celles des séries.
 */

export interface ChartSeries {
  key: string;
  label: string;
  color: string; // valeur CSS, ex. var(--series-tiktok)
}

export type ChartDatum = { [key: string]: string | number | undefined };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function niceRange(min: number, max: number, count = 4): number[] {
  if (min === max) return [min * 0.95, max * 1.05];
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.999; v += step) ticks.push(v);
  return ticks;
}

export function Legend({ series, shape = "rect", className }: { series: ChartSeries[]; shape?: "rect" | "line"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted", className)}>
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          {shape === "rect" ? (
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
          ) : (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
          )}
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width - 190;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-36 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs shadow-pop"
      style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: Math.max(0, y) }}
    >
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value, shape = "line" }: { color: string; label: string; value: string; shape?: "line" | "rect" }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {shape === "line" ? <span className="h-0.5 w-3 rounded-full" style={{ background: color }} /> : <span className="size-2 rounded-[2px]" style={{ background: color }} />}
      <span className="font-semibold text-fg tabular-nums">{value}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Courbes                                                             */
/* ------------------------------------------------------------------ */

export function LineChart({
  data,
  series,
  height = 260,
  format = (n) => String(n),
  xFormat = (d) => d,
  tooltipDate = xFormat,
  area = false,
  zeroBased = true,
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  height?: number;
  format?: (n: number) => string;
  xFormat?: (d: string) => string;
  tooltipDate?: (d: string) => string;
  area?: boolean;
  zeroBased?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 12, right: 12, bottom: 26, left: 48 };
  const iw = Math.max(0, width - m.left - m.right);
  const ih = height - m.top - m.bottom;

  const values = data.flatMap((d) => series.map((s) => d[s.key]).filter((v): v is number => typeof v === "number"));
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values) : 0;
  const ticks = zeroBased ? niceTicks(max) : niceRange(min, max);
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const x = (i: number) => (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => ih - ((v - y0) / (y1 - y0 || 1)) * ih;

  const paths = series.map((s) => {
    let d = "";
    let started = false;
    data.forEach((p, i) => {
      const v = p[s.key];
      if (typeof v !== "number") {
        started = false;
        return;
      }
      d += `${started ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      started = true;
    });
    const firstIdx = data.findIndex((p) => typeof p[s.key] === "number");
    let lastIdx = -1;
    data.forEach((p, i) => typeof p[s.key] === "number" && (lastIdx = i));
    const areaD = d && firstIdx >= 0 ? `${d}L${x(lastIdx).toFixed(1)},${ih}L${x(firstIdx).toFixed(1)},${ih}Z` : "";
    return { s, d, areaD };
  });

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 80))));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = data.length <= 1 ? 0 : Math.round((px / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[10px] tabular-nums">
                  {format(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % labelEvery === 0 || i === data.length - 1 ? (
                i === data.length - 1 && i % labelEvery !== 0 && data.length - 1 - (i - (i % labelEvery)) < labelEvery * 0.6 ? null : (
                  <text key={i} x={x(i)} y={ih + 18} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-subtle text-[10px]">
                    {xFormat(String(d.date))}
                  </text>
                )
              ) : null,
            )}
            {area &&
              paths.map(({ s, areaD }) => areaD && <path key={`a-${s.key}`} d={areaD} fill={s.color} opacity={0.1} />)}
            {paths.map(({ s, d }) => (
              <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={ih} stroke="var(--axis)" strokeWidth={1} />
                {series.map((s) => {
                  const v = data[hover]?.[s.key];
                  return typeof v === "number" ? (
                    <circle key={s.key} cx={x(hover)} cy={y(v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                  ) : null;
                })}
              </g>
            )}
            <rect
              width={iw}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              style={{ touchAction: "pan-y" }}
            />
          </g>
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={m.left + x(hover)} y={m.top} width={width}>
          <p className="mb-1 font-medium text-muted">{tooltipDate(String(data[hover].date))}</p>
          {series.map((s) => {
            const v = data[hover][s.key];
            return typeof v === "number" ? <TooltipRow key={s.key} color={s.color} label={s.label} value={format(v)} /> : null;
          })}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colonnes empilées                                                   */
/* ------------------------------------------------------------------ */

function roundedTopRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function StackedColumns({
  data,
  series,
  height = 260,
  format = (n) => String(n),
  xFormat = (d) => d,
  tooltipLabel = xFormat,
  xKey = "date",
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  height?: number;
  format?: (n: number) => string;
  xFormat?: (d: string) => string;
  tooltipLabel?: (d: string) => string;
  xKey?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 12, right: 8, bottom: 26, left: 48 };
  const iw = Math.max(0, width - m.left - m.right);
  const ih = height - m.top - m.bottom;

  const totals = data.map((d) => series.reduce((n, s) => n + (Number(d[s.key]) || 0), 0));
  const ticks = niceTicks(Math.max(1, ...totals));
  const yMax = ticks[ticks.length - 1];
  const band = data.length ? iw / data.length : 0;
  const barW = Math.max(2, Math.min(24, band * 0.72));
  const y = (v: number) => (v / yMax) * ih;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 64))));
  const GAP = 2;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height}>
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={ih - y(t)} y2={ih - y(t)} stroke="var(--grid)" strokeWidth={1} />
                <text x={-10} y={ih - y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[10px] tabular-nums">
                  {format(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = i * band + band / 2;
              const bx = cx - barW / 2;
              let acc = 0;
              const visible = series.filter((s) => (Number(d[s.key]) || 0) > 0);
              const topKey = visible[visible.length - 1]?.key;
              return (
                <g key={i} opacity={hover === null || hover === i ? 1 : 0.45} style={{ transition: "opacity 120ms" }}>
                  {visible.map((s) => {
                    const v = Number(d[s.key]) || 0;
                    const h = y(v);
                    const top = ih - y(acc) - h;
                    acc += v;
                    // Écart de 2 px entre segments (pris sur le haut de chaque segment sauf le dernier).
                    const isTop = s.key === topKey;
                    const segH = Math.max(0, h - (isTop ? 0 : GAP));
                    const segY = top + (isTop ? 0 : GAP);
                    if (segH <= 0) return null;
                    return isTop ? (
                      <path key={s.key} d={roundedTopRect(bx, segY, barW, segH, 4)} fill={s.color} />
                    ) : (
                      <rect key={s.key} x={bx} y={segY} width={barW} height={segH} fill={s.color} />
                    );
                  })}
                  {(i % labelEvery === 0 || (i === data.length - 1 && i % labelEvery > labelEvery * 0.6)) && (
                    <text x={cx} y={ih + 18} textAnchor="middle" className="fill-subtle text-[10px]">
                      {xFormat(String(d[xKey]))}
                    </text>
                  )}
                  <rect
                    x={i * band}
                    y={0}
                    width={band}
                    height={ih}
                    fill="transparent"
                    tabIndex={0}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
            <line x1={0} x2={iw} y1={ih} y2={ih} stroke="var(--axis)" strokeWidth={1} />
          </g>
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={m.left + hover * band + band / 2} y={m.top} width={width}>
          <p className="mb-1 font-medium text-muted">{tooltipLabel(String(data[hover][xKey]))}</p>
          {[...series].reverse().map((s) => {
            const v = Number(data[hover][s.key]) || 0;
            return v > 0 ? <TooltipRow key={s.key} color={s.color} label={s.label} value={format(v)} shape="rect" /> : null;
          })}
          {series.length > 1 && (
            <div className="mt-1 border-t border-border pt-1">
              <span className="font-semibold text-fg tabular-nums">{format(totals[hover])}</span> <span className="text-muted">au total</span>
            </div>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barres horizontales (répartition)                                   */
/* ------------------------------------------------------------------ */

export function BarList({
  items,
  format = (n) => String(n),
}: {
  items: { key: string; label: ReactNode; value: number; color: string; icon?: ReactNode }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((n, i) => n + i.value, 0);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="group">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{format(item.value)}</span>
              <span className="ml-1.5 text-xs text-subtle">{total ? Math.round((item.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini-courbe                                                         */
/* ------------------------------------------------------------------ */

export function Sparkline({ values, height = 36, className, color = "var(--accent)" }: { values: number[]; height?: number; className?: string; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const path = useMemo(() => {
    if (values.length < 2 || !width) return { line: "", area: "", end: null as null | [number, number] };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = 3;
    const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
    const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const area = `${line}L${x(values.length - 1)},${height}L${x(0)},${height}Z`;
    return { line, area, end: [x(values.length - 1), y(values[values.length - 1])] as [number, number] };
  }, [values, width, height]);
  return (
    <div ref={ref} className={cn("w-full", className)} style={{ height }}>
      {width > 0 && path.line && (
        <svg width={width} height={height} className="overflow-visible">
          <path d={path.area} fill={color} opacity={0.1} />
          <path d={path.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {path.end && <circle cx={path.end[0]} cy={path.end[1]} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />}
        </svg>
      )}
    </div>
  );
}

/** Carte de graphique avec bascule « Graphique / Tableau » (accès aux valeurs sans survol). */
export function ChartCard({
  title,
  subtitle,
  legend,
  chart,
  table,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  chart: ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
  actions?: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && (
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
              {(["chart", "table"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn("rounded-md px-2 py-1 font-medium", view === v ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg")}
                >
                  {v === "chart" ? "Graphique" : "Tableau"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {legend && view === "chart" && <div className="mt-3">{legend}</div>}
      <div className="mt-4">
        {view === "chart" || !table ? (
          chart
        ) : (
          <div className="max-h-[300px] overflow-auto rounded-xl border border-border scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2 text-left text-xs text-muted">
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={c} className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {r.map((cell, j) => (
                      <td key={j} className={cn("px-3 py-1.5", j > 0 && "text-right tabular-nums")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nuage de points (vues × taux d'influence)                           */
/* ------------------------------------------------------------------ */

export interface ScatterPoint {
  key: string;
  series: string;
  x: number;
  y: number;
  label: string;
}

/** Nuage de points : abscisse logarithmique (les vues varient de plusieurs ordres de grandeur). */
export function ScatterPlot({
  points,
  series,
  height = 300,
  xFormat = (n) => String(n),
  yFormat = (n) => String(n),
  xLabel,
  yLabel,
  quadrants,
}: {
  points: ScatterPoint[];
  series: ChartSeries[];
  height?: number;
  xFormat?: (n: number) => string;
  yFormat?: (n: number) => string;
  xLabel?: string;
  yLabel?: string;
  /** Repères en pointillés (médianes) et légende du quadrant supérieur droit. */
  quadrants?: { x: number; y: number; topRight: string };
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const m = { top: 14, right: 16, bottom: 40, left: 52 };
  const iw = Math.max(0, width - m.left - m.right);
  const ih = height - m.top - m.bottom;
  const colorOf = new Map(series.map((s) => [s.key, s.color]));
  const nameOf = new Map(series.map((s) => [s.key, s.label]));

  const xs = points.map((p) => Math.max(1, p.x));
  const lo = Math.floor(Math.log10(xs.length ? Math.min(...xs) : 1));
  const hi = Math.max(lo + 1, Math.ceil(Math.log10(xs.length ? Math.max(...xs) : 10)));
  const xTicks = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i));
  const yTicks = niceTicks(points.length ? Math.max(...points.map((p) => p.y)) : 0.1);
  const y1 = yTicks[yTicks.length - 1] || 1;
  const x = (v: number) => ((Math.log10(Math.max(1, v)) - lo) / (hi - lo)) * iw;
  const y = (v: number) => ih - (v / y1) * ih;
  const active = points.find((p) => p.key === hover);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible" role="img" aria-label={`${yLabel ?? ""} selon ${xLabel ?? ""}`}>
          <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                <text x={-10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[10px] tabular-nums">
                  {yFormat(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t, i) => (
              <text key={t} x={x(t)} y={ih + 18} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} className="fill-subtle text-[10px] tabular-nums">
                {xFormat(t)}
              </text>
            ))}
            <line x1={0} x2={iw} y1={ih} y2={ih} stroke="var(--axis)" strokeWidth={1} />
            {xLabel && (
              <text x={iw} y={ih + 34} textAnchor="end" className="fill-muted text-[11px]">
                {xLabel} →
              </text>
            )}
            {yLabel && (
              <text x={0} y={-4} className="fill-muted text-[11px]">
                ↑ {yLabel}
              </text>
            )}
            {quadrants && points.length > 2 && (
              <g>
                <line x1={x(quadrants.x)} x2={x(quadrants.x)} y1={0} y2={ih} stroke="var(--axis)" strokeDasharray="3 4" strokeWidth={1} />
                <line x1={0} x2={iw} y1={y(quadrants.y)} y2={y(quadrants.y)} stroke="var(--axis)" strokeDasharray="3 4" strokeWidth={1} />
                <text x={iw - 4} y={12} textAnchor="end" className="fill-muted text-[10px] font-medium">
                  {quadrants.topRight}
                </text>
              </g>
            )}
            {points.map((p) => (
              <circle
                key={p.key}
                cx={x(p.x)}
                cy={y(p.y)}
                r={hover === p.key ? 7 : 5.5}
                fill={colorOf.get(p.series)}
                stroke="var(--surface)"
                strokeWidth={2}
                opacity={hover && hover !== p.key ? 0.45 : 1}
                className="transition-[r,opacity] duration-150"
              />
            ))}
            {/* Zones de survol plus grandes que les points */}
            {points.map((p) => (
              <circle
                key={`hit-${p.key}`}
                cx={x(p.x)}
                cy={y(p.y)}
                r={13}
                fill="transparent"
                onPointerEnter={() => setHover(p.key)}
                onPointerLeave={() => setHover((h) => (h === p.key ? null : h))}
              />
            ))}
          </g>
        </svg>
      )}
      {active && (
        <Tooltip x={m.left + x(active.x)} y={m.top + y(active.y) - 10} width={width}>
          <p className="mb-1 max-w-56 truncate font-medium text-fg">{active.label}</p>
          <TooltipRow color={colorOf.get(active.series) ?? "var(--accent)"} shape="rect" label={nameOf.get(active.series) ?? ""} value={yFormat(active.y)} />
          <p className="mt-0.5 text-muted tabular-nums">{xFormat(active.x)} vues</p>
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Répartitions (parts d'un total)                                     */
/* ------------------------------------------------------------------ */

/** Liste de parts (âges, pays…) : libellé, barre proportionnelle à la plus grande part, pourcentage. */
export function ShareList({
  items,
  color = "var(--accent)",
  format,
}: {
  items: { key: string; label: ReactNode; share: number; icon?: ReactNode; muted?: boolean }[];
  color?: string;
  format: (share: number) => string;
}) {
  const max = Math.max(0.0001, ...items.map((i) => i.share));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[minmax(0,9rem)_1fr_3.25rem] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_3.5rem]">
          <span className={cn("flex min-w-0 items-center gap-2", item.muted && "text-muted")}>
            {item.icon}
            <span className="truncate">{item.label}</span>
          </span>
          <span className="h-2 rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(item.share / max) * 100}%`, background: item.muted ? "var(--axis)" : color }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{format(item.share)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Barre unique 100 % (ex. genre) : segments séparés par 2 px, valeurs et libellés dans la légende. */
export function ShareBar({
  parts,
  format,
  height = 12,
}: {
  parts: { key: string; label: string; share: number; color: string }[];
  format: (share: number) => string;
  height?: number;
}) {
  const visible = parts.filter((p) => p.share > 0);
  const total = visible.reduce((n, p) => n + p.share, 0) || 1;
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }} role="img" aria-label={visible.map((p) => `${p.label} ${format(p.share)}`).join(", ")}>
        {visible.map((p) => (
          <span key={p.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.share / total) * 100}%`, background: p.color }} title={`${p.label} : ${format(p.share)}`} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} />
            <span className="font-semibold tabular-nums">{format(p.share)}</span>
            <span className="text-muted">{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
