"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Flame, Info, Minus, Sparkles, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { formatCompact, formatDate, formatNumber, formatPercent } from "@/lib/format";
import {
  INFLUENCE_ACTIONS,
  INFLUENCE_ACTION_LABELS,
  INFLUENCE_LEVEL_LABELS,
  INFLUENCE_WEIGHTS,
  addToTotals,
  emptyTotals,
  influenceBreakdown,
  influenceLevel,
  influenceRate,
  reachRatio,
  type InfluenceLevel,
} from "@/lib/influence";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { AnalyticsSummary, MetricTotals, PlatformId, PostMetrics, TopPost } from "@/lib/types";
import { mediaUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { ChartCard, Legend, ScatterPlot, ShareList, type ChartSeries, type ScatterPoint } from "./charts";
import { PlatformBadge } from "./icons";
import { PointDelta } from "./stat-tile";
import { Button, Card, EmptyState, Segmented } from "./ui";

const SERIES: ChartSeries[] = PLATFORM_ORDER.map((p) => ({ key: p, label: PLATFORMS[p].name, color: `var(--series-${p})` }));
const pct = (n: number | null | undefined) => formatPercent(n, 1);
const times = (n: number | null) => (n === null ? "—" : `×${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 10 ? 1 : 0 })}`);

interface VideoRow {
  post: TopPost;
  views: number;
  rate: number | null;
  per: Partial<Record<PlatformId, { metrics: PostMetrics; rate: number | null; level: InfluenceLevel | null; reach: number | null }>>;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Calculs dérivés du résumé : taux par vidéo, par plateforme, global, et évolution. */
function computeInfluence(data: AnalyticsSummary) {
  const followers = Object.fromEntries(data.platforms.map((p) => [p.platform, p.followers])) as Record<PlatformId, number | null>;
  const totals = Object.fromEntries(PLATFORM_ORDER.map((p) => [p, emptyTotals()])) as Record<PlatformId, MetricTotals>;
  const overall = emptyTotals();
  const base: VideoRow[] = [];

  for (const post of data.topPosts) {
    const vt = emptyTotals();
    const per: VideoRow["per"] = {};
    for (const p of PLATFORM_ORDER) {
      const m = post.platforms[p];
      if (!m) continue;
      per[p] = { metrics: m, rate: influenceRate(m), level: null, reach: reachRatio(m.views, followers[p]) };
      // Les vidéos sans vues mesurées (ex. ancien Reel) faussent un taux « par vue » : on les écarte des moyennes.
      if (m.views > 0) {
        addToTotals(totals[p], m);
        addToTotals(vt, m);
        addToTotals(overall, m);
      }
    }
    base.push({ post, views: vt.views, rate: influenceRate(vt), per });
  }

  const platformRate = Object.fromEntries(PLATFORM_ORDER.map((p) => [p, influenceRate(totals[p])])) as Record<PlatformId, number | null>;
  for (const row of base) {
    for (const p of PLATFORM_ORDER) {
      const cell = row.per[p];
      if (cell) cell.level = influenceLevel(cell.rate, platformRate[p]);
    }
  }

  const prevAll = emptyTotals();
  const previousRate = {} as Record<PlatformId, number | null>;
  for (const p of PLATFORM_ORDER) {
    const prev = data.previousTotals?.[p];
    previousRate[p] = prev ? influenceRate(prev) : null;
    if (prev) for (const k of ["videos", "views", "likes", "comments", "shares", "saves"] as const) prevAll[k] += prev[k];
  }

  return {
    rows: base,
    totals,
    overall,
    overallRate: influenceRate(overall),
    overallPrevious: influenceRate(prevAll),
    platformRate,
    previousRate,
    reach: Object.fromEntries(
      PLATFORM_ORDER.map((p) => [p, totals[p].videos ? reachRatio(totals[p].views / totals[p].videos, followers[p]) : null]),
    ) as Record<PlatformId, number | null>,
  };
}

const LEVEL_STYLE: Record<InfluenceLevel, { icon: ReactNode; className: string; short: string }> = {
  top: { icon: <Flame className="size-3" />, className: "bg-accent-soft text-accent", short: "Exceptionnelle" },
  above: { icon: <TrendingUp className="size-3" />, className: "bg-success/10 text-success", short: "Au-dessus" },
  average: { icon: <Minus className="size-3" />, className: "bg-surface-2 text-muted", short: "Moyenne" },
  below: { icon: <TrendingDown className="size-3" />, className: "bg-surface-2 text-muted", short: "En dessous" },
};

function LevelChip({ level }: { level: InfluenceLevel | null }) {
  if (!level) return null;
  const s = LEVEL_STYLE[level];
  return (
    <span title={INFLUENCE_LEVEL_LABELS[level]} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", s.className)}>
      {s.icon}
      {s.short}
    </span>
  );
}

function FormulaCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-[0_6px_18px_-8px_var(--accent)]">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Taux d&apos;influence</p>
            <p className="text-sm text-muted">Pour 100 vues, combien d&apos;actions engagées votre vidéo déclenche.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-sm lg:ml-auto">
          <span className="text-muted">(</span>
          {INFLUENCE_ACTIONS.map((a, i) => (
            <span key={a} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-subtle">+</span>}
              <span className="rounded-lg border border-border bg-surface-2 px-2 py-1 font-medium">
                {INFLUENCE_ACTION_LABELS[a]} <span className="text-accent">×{INFLUENCE_WEIGHTS[a]}</span>
              </span>
            </span>
          ))}
          <span className="text-muted">) ÷ vues</span>
          <button onClick={() => setOpen((o) => !o)} className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
            <Info className="size-3.5" /> {open ? "Masquer" : "Pourquoi ces poids ?"}
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-border bg-surface-2/40 p-5 text-sm text-muted sm:grid-cols-3">
          <p>
            <strong className="text-fg">Partages ×3</strong> : votre vidéo sort de votre audience et touche de nouvelles personnes. C&apos;est le signal le plus fort
            pour les algorithmes.
          </p>
          <p>
            <strong className="text-fg">Commentaires et enregistrements ×2</strong> : la personne prend le temps de réagir ou veut revoir la vidéo, signe d&apos;un
            vrai intérêt.
          </p>
          <p>
            <strong className="text-fg">J&apos;aime ×1</strong> : réaction rapide. Chaque vidéo est comparée à <em>votre</em> moyenne sur la même plateforme (badges
            « Au-dessus », « Exceptionnelle »…).
          </p>
        </div>
      )}
    </Card>
  );
}

function KpiCard({
  title,
  icon,
  rate,
  previous,
  footer,
  highlight,
  className,
}: {
  className?: string;
  title: ReactNode;
  icon: ReactNode;
  rate: number | null;
  previous: number | null;
  footer: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex flex-col rounded-2xl border bg-surface p-4 shadow-card sm:p-5", highlight ? "border-accent/30 ring-4 ring-[var(--ring)]/30" : "border-border", className)}>
      <div className="flex items-center gap-2.5 text-sm text-muted">
        {icon}
        <span className="font-medium text-fg">{title}</span>
      </div>
      <p className="mt-3 text-[26px] leading-none font-semibold tracking-tight sm:text-[32px]">{pct(rate)}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <PointDelta value={rate !== null && previous !== null ? rate - previous : null} />
        <span>vs période précédente</span>
      </div>
      <div className="mt-auto pt-4 text-xs text-muted">{footer}</div>
    </div>
  );
}

type Sort = "influence" | "views" | "recent";

export function InfluenceView({ data, rangeLabel }: { data: AnalyticsSummary; rangeLabel: string }) {
  const inf = useMemo(() => computeInfluence(data), [data]);
  const withData = PLATFORM_ORDER.filter((p) => inf.totals[p].videos > 0);
  const [breakdownPlatform, setBreakdownPlatform] = useState<PlatformId | null>(null);
  const bp = breakdownPlatform && withData.includes(breakdownPlatform) ? breakdownPlatform : withData[0];
  const [sort, setSort] = useState<Sort>("influence");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const list = [...inf.rows];
    if (sort === "influence") list.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
    if (sort === "views") list.sort((a, b) => b.views - a.views);
    if (sort === "recent") list.sort((a, b) => (b.post.publishedAt ?? 0) - (a.post.publishedAt ?? 0));
    return list;
  }, [inf.rows, sort]);

  const points: ScatterPoint[] = inf.rows.flatMap((r) =>
    PLATFORM_ORDER.flatMap((p) => {
      const c = r.per[p];
      return c && c.rate !== null && c.metrics.views > 0 ? [{ key: `${r.post.postId}:${p}`, series: p, x: c.metrics.views, y: c.rate, label: r.post.title }] : [];
    }),
  );

  if (!inf.rows.length || inf.overallRate === null) {
    return (
      <Card>
        <EmptyState
          icon={<Zap className="size-6" />}
          title="Pas encore de taux d'influence"
          description={`Publiez des vidéos puis synchronisez vos statistiques : le taux d'influence est calculé pour chaque vidéo publiée sur la période (${rangeLabel}).`}
        />
      </Card>
    );
  }

  const breakdown = bp ? influenceBreakdown(inf.totals[bp]) : null;
  const breakdownTotal = breakdown ? INFLUENCE_ACTIONS.reduce((n, a) => n + breakdown[a], 0) : 0;
  const topAction = breakdown && breakdownTotal ? INFLUENCE_ACTIONS.reduce((a, b) => (breakdown[b] > breakdown[a] ? b : a)) : null;
  const best = [...inf.rows].filter((r) => r.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

  return (
    <div className="space-y-6">
      <FormulaCard />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          className="col-span-2 xl:col-span-1"
          highlight
          title="Toutes plateformes"
          icon={
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Zap className="size-4" />
            </span>
          }
          rate={inf.overallRate}
          previous={inf.overallPrevious}
          footer={
            <>
              {formatNumber(inf.rows.length)} vidéo{inf.rows.length > 1 ? "s" : ""} · {formatCompact(inf.overall.views)} vues
            </>
          }
        />
        {PLATFORM_ORDER.map((p) => (
          <KpiCard
            key={p}
            title={PLATFORMS[p].name}
            icon={<PlatformBadge platform={p} size={28} />}
            rate={inf.platformRate[p]}
            previous={inf.previousRate[p]}
            footer={
              inf.totals[p].videos ? (
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    {inf.totals[p].videos} vidéo{inf.totals[p].videos > 1 ? "s" : ""}
                  </span>
                  <span title="Vues moyennes par vidéo rapportées au nombre d'abonnés">Portée {times(inf.reach[p])}</span>
                </span>
              ) : (
                "Aucune vidéo mesurée sur la période"
              )
            }
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Portée et influence de chaque vidéo"
          subtitle="Chaque point est une vidéo sur une plateforme. En haut à droite : beaucoup vues et très engageantes."
          legend={<Legend series={SERIES.filter((s) => withData.includes(s.key as PlatformId))} />}
          chart={
            <ScatterPlot
              points={points}
              series={SERIES}
              xFormat={formatCompact}
              yFormat={(n) => formatPercent(n, n < 0.1 ? 1 : 0)}
              xLabel="Vues (échelle logarithmique)"
              yLabel="Taux d'influence"
              quadrants={{ x: median(points.map((p) => p.x)), y: median(points.map((p) => p.y)), topRight: "Vos vidéos stars" }}
            />
          }
          table={{
            columns: ["Vidéo", "Plateforme", "Vues", "Taux d'influence"],
            rows: [...points].sort((a, b) => b.y - a.y).map((p) => [p.label, PLATFORMS[p.series as PlatformId].name, formatNumber(p.x), pct(p.y)]),
          }}
        />

        <Card className="flex flex-col p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">D&apos;où vient votre influence</h3>
              <p className="mt-0.5 text-sm text-muted">Part de chaque action dans le score (pondérée).</p>
            </div>
          </div>
          {withData.length > 1 && (
            <Segmented
              size="sm"
              className="mt-4 self-start"
              value={bp!}
              onChange={(v) => setBreakdownPlatform(v as PlatformId)}
              options={withData.map((p) => ({ value: p, label: PLATFORMS[p].name, icon: <PlatformBadge platform={p} size={14} /> }))}
            />
          )}
          {bp && breakdown && (
            <>
              <div className="mt-5">
                <ShareList
                  color={`var(--series-${bp})`}
                  format={(s) => formatPercent(s, 0)}
                  items={INFLUENCE_ACTIONS.map((a) => ({
                    key: a,
                    label: (
                      <span>
                        {INFLUENCE_ACTION_LABELS[a]} <span className="text-xs text-subtle">×{INFLUENCE_WEIGHTS[a]}</span>
                      </span>
                    ),
                    share: breakdownTotal ? breakdown[a] / breakdownTotal : 0,
                  }))}
                />
              </div>
              {topAction && (
                <p className="mt-5 rounded-xl border border-border px-3.5 py-3 text-sm text-muted">
                  Sur {PLATFORMS[bp].name}, les <strong className="text-fg">{INFLUENCE_ACTION_LABELS[topAction].toLowerCase()}</strong> pèsent{" "}
                  <strong className="text-fg">{formatPercent(breakdown[topAction] / breakdownTotal, 0)}</strong> de votre influence.
                  {bp === "youtube" && inf.totals.youtube.saves === 0 && " YouTube ne communique pas les enregistrements."}
                </p>
              )}
              <dl className="mt-auto grid grid-cols-2 gap-3 pt-5 text-xs">
                {INFLUENCE_ACTIONS.map((a) => (
                  <div key={a} className="rounded-xl bg-surface-2/60 p-3">
                    <dt className="text-muted">{INFLUENCE_ACTION_LABELS[a]}</dt>
                    <dd className="mt-0.5 text-base font-semibold tabular-nums">{formatNumber(inf.totals[bp][a])}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-0">
          <div>
            <h3 className="font-semibold">Influence par vidéo</h3>
            <p className="mt-0.5 text-sm text-muted">
              Vidéos publiées sur la période · comparées à votre moyenne sur chaque plateforme
              {best && (
                <>
                  {" "}
                  · meilleure : <span className="font-medium text-fg">{best.post.title}</span>
                </>
              )}
            </p>
          </div>
          <Segmented
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: "influence", label: "Influence" },
              { value: "views", label: "Vues" },
              { value: "recent", label: "Récentes" },
            ]}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-surface-2/60 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Vidéo</th>
                {PLATFORM_ORDER.map((p) => (
                  <th key={p} className="px-3 py-2.5 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <PlatformBadge platform={p} size={14} /> {PLATFORMS[p].name}
                    </span>
                  </th>
                ))}
                <th className="px-5 py-2.5 text-right font-medium">Global</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? rows : rows.slice(0, 10)).map((r) => {
                const real = !r.post.postId.startsWith("demo-");
                const title = (
                  <span className="flex items-center gap-3">
                    <span className="h-12 w-7 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {r.post.posterId && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(r.post.posterId)} alt="" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-64 truncate font-medium">{r.post.title}</span>
                      <span className="block text-xs text-muted">
                        {r.post.publishedAt ? formatDate(r.post.publishedAt) : ""} · {formatCompact(r.views)} vues
                      </span>
                    </span>
                  </span>
                );
                return (
                  <tr key={r.post.postId} className="border-t border-border hover:bg-surface-2/40">
                    <td className="px-5 py-2.5">
                      {real ? (
                        <Link href={`/post?id=${r.post.postId}`} className="hover:text-accent">
                          {title}
                        </Link>
                      ) : (
                        title
                      )}
                    </td>
                    {PLATFORM_ORDER.map((p) => {
                      const c = r.per[p];
                      return (
                        <td key={p} className="px-3 py-2.5 align-middle">
                          {c ? (
                            <span className="flex flex-col items-start gap-1">
                              <span className="flex items-baseline gap-2">
                                <span className="font-semibold tabular-nums">{pct(c.rate)}</span>
                                {c.reach !== null && <span className="text-[11px] text-muted tabular-nums" title="Vues ÷ abonnés">portée {times(c.reach)}</span>}
                              </span>
                              <LevelChip level={c.level} />
                            </span>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-base font-semibold tabular-nums">{pct(r.rate)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 10 && (
          <div className="border-t border-border p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Afficher les 10 premières" : `Afficher les ${rows.length} vidéos`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
