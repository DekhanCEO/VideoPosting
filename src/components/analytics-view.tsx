"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { AlertTriangle, BarChart3, Eye, FlaskConical, Heart, LayoutGrid, RefreshCw, UserRound, Users, Wallet, Film, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { delta, formatCompact, formatCurrency, formatDate, formatNumber, formatPercent, formatRelative, formatSigned } from "@/lib/format";
import { useAnalytics, useSettings } from "@/lib/hooks";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { AnalyticsRange, PlatformId } from "@/lib/types";
import { mediaUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader } from "./app-shell";
import { ChartCard, Legend, LineChart, Sparkline, StackedColumns, type ChartSeries } from "./charts";
import { AudienceView } from "./audience-view";
import { PlatformBadge } from "./icons";
import { InfluenceView } from "./influence-view";
import { DeltaBadge, StatTile } from "./stat-tile";
import { Badge, Button, ButtonLink, Card, EmptyState, Segmented, Skeleton } from "./ui";

export const PLATFORM_SERIES: ChartSeries[] = PLATFORM_ORDER.map((p) => ({
  key: p,
  label: PLATFORMS[p].name,
  color: `var(--series-${p})`,
}));

const RANGES: { value: string; label: string }[] = [
  { value: "7", label: "7 jours" },
  { value: "28", label: "28 jours" },
  { value: "90", label: "90 jours" },
  { value: "365", label: "12 mois" },
];

type Tab = "overview" | "influence" | "audience";
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Vue d'ensemble", icon: <LayoutGrid className="size-4" /> },
  { value: "influence", label: "Influence", icon: <Zap className="size-4" /> },
  { value: "audience", label: "Audience", icon: <UserRound className="size-4" /> },
];

const shortDate = (d: string) => formatDate(d, { day: "numeric", month: "short" });
const longDate = (d: string) => formatDate(d, { weekday: "long", day: "numeric", month: "long" });

export function AnalyticsView() {
  const [range, setRange] = useState<AnalyticsRange>(28);
  const { data, isLoading, isValidating, mutate } = useAnalytics(range);
  const { data: settings } = useSettings();
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  // Onglet mémorisé dans l'adresse (#influence, #audience) pour pouvoir partager le lien.
  useEffect(() => {
    const read = () => {
      const fromHash = window.location.hash.slice(1);
      setTab(TABS.some((t) => t.value === fromHash) ? (fromHash as Tab) : "overview");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const selectTab = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", t === "overview" ? window.location.pathname + window.location.search : `#${t}`);
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await api<{ reports: { platform: PlatformId; ok: boolean; error?: string }[] }>("/api/analytics/sync", { method: "POST" });
      const failed = res.reports.filter((r) => !r.ok);
      if (!res.reports.length) toast.info("Aucun compte connecté à synchroniser.");
      else if (failed.length) toast.warning("Synchronisation partielle", { description: failed.map((f) => `${PLATFORMS[f.platform].name} : ${f.error}`).join("\n") });
      else toast.success("Statistiques à jour");
      await mutate();
      void globalMutate("/api/dashboard");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const weekly = range === 365;
  const currency = settings?.currency ?? "EUR";
  const lastSync = data?.platforms.map((p) => p.sync.at ?? 0).reduce((a, b) => Math.max(a, b), 0);
  const hasData = !!data && (data.followersSeries.some((p) => PLATFORM_ORDER.some((k) => p[k] !== undefined)) || data.topPosts.length > 0);

  const totalSeries = data?.followersSeries.map((p) => ({
    date: p.date,
    total: PLATFORM_ORDER.some((k) => p[k] !== undefined) ? PLATFORM_ORDER.reduce((n, k) => n + (p[k] ?? 0), 0) : undefined,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Statistiques"
        description="Audience, vues et engagement de vos comptes, au même endroit."
        actions={
          <>
            {lastSync ? <span className="text-xs text-muted">Synchronisé {formatRelative(lastSync)}</span> : null}
            <Button onClick={sync} loading={syncing}>
              {!syncing && <RefreshCw className="size-4" />} Synchroniser
            </Button>
          </>
        }
      />

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Sections des statistiques">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => selectTab(t.value)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              tab === t.value ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            <span className={tab === t.value ? "text-accent" : "text-subtle"}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Filtres : une seule ligne, au-dessus de tout ce qu'ils filtrent */}
      {(tab !== "audience" || data?.demo) && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {tab !== "audience" && <Segmented value={String(range)} onChange={(v) => setRange(Number(v) as AnalyticsRange)} options={RANGES} />}
          {data?.demo && (
            <Badge tone="warning">
              <FlaskConical className="size-3" /> Données de démonstration
            </Badge>
          )}
        </div>
      )}

      {isLoading || !data ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : tab === "influence" ? (
        <div className={cn("mt-6 transition-opacity", isValidating && "opacity-60")}>
          <InfluenceView data={data} rangeLabel={RANGES.find((r) => r.value === String(range))?.label ?? ""} />
        </div>
      ) : tab === "audience" ? (
        <div className="mt-6">
          <AudienceView data={data} onChanged={() => void mutate()} />
        </div>
      ) : !hasData ? (
        <Card className="mt-6">
          <EmptyState
            icon={<BarChart3 className="size-6" />}
            title="Pas encore de statistiques"
            description="Connectez vos comptes puis lancez une synchronisation. Les abonnés sont relevés chaque jour pour construire vos courbes d'évolution."
            action={
              <div className="flex gap-2">
                <ButtonLink href="/accounts">Connecter mes comptes</ButtonLink>
                <Button variant="primary" onClick={sync} loading={syncing}>
                  Synchroniser
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className={cn("mt-6 space-y-6 transition-opacity", isValidating && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Abonnés"
              icon={<Users />}
              value={formatCompact(data.kpis.followers.value)}
              delta={
                data.kpis.followers.previous !== null && (
                  <span className="font-semibold text-fg">{formatSigned(data.kpis.followers.value - data.kpis.followers.previous)}</span>
                )
              }
              hint={data.kpis.followers.previous !== null ? `sur ${RANGES.find((r) => r.value === String(range))?.label}` : "Historique en cours de constitution"}
            />
            <StatTile
              label="Vues sur la période"
              icon={<Eye />}
              value={formatCompact(data.kpis.views.value)}
              delta={<DeltaBadge value={delta(data.kpis.views.value, data.kpis.views.previous)} />}
              hint="vs période précédente"
            />
            <StatTile
              label="Interactions"
              icon={<Heart />}
              value={formatCompact(data.kpis.engagement.value)}
              delta={<DeltaBadge value={delta(data.kpis.engagement.value, data.kpis.engagement.previous)} />}
              hint={data.engagementRate !== null ? `Taux d'engagement ${formatPercent(data.engagementRate)}` : "sur les vidéos de la période"}
            />
            <StatTile
              label="Revenus sur la période"
              icon={<Wallet />}
              value={formatCurrency(data.kpis.revenue.value, currency, { compact: true })}
              delta={<DeltaBadge value={delta(data.kpis.revenue.value, data.kpis.revenue.previous)} />}
              hint={
                <Link href="/revenue" className="font-medium text-accent hover:underline">
                  Détail →
                </Link>
              }
            />
          </div>

          <div className="space-y-4">
            <ChartCard
              title="Évolution de l'audience"
              subtitle="Total des abonnés sur TikTok, YouTube et Instagram"
              chart={
                <LineChart
                  data={totalSeries ?? []}
                  series={[{ key: "total", label: "Abonnés", color: "var(--accent)" }]}
                  format={formatCompact}
                  xFormat={shortDate}
                  tooltipDate={weekly ? (d) => `Semaine du ${shortDate(d)}` : longDate}
                  area
                  zeroBased={false}
                  height={280}
                />
              }
              table={{
                columns: ["Date", ...PLATFORM_ORDER.map((p) => PLATFORMS[p].name), "Total"],
                rows: [...data.followersSeries].reverse().map((p) => [
                  formatDate(p.date),
                  ...PLATFORM_ORDER.map((k) => formatNumber(p[k])),
                  formatNumber(PLATFORM_ORDER.reduce((n, k) => n + (p[k] ?? 0), 0)),
                ]),
              }}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {data.platforms.map((p) => {
                const values = data.followersSeries.map((s) => s[p.platform]).filter((v): v is number => v !== undefined);
                return (
                  <Card key={p.platform} className="p-4">
                    <div className="flex items-center gap-2.5">
                      <PlatformBadge platform={p.platform} size={28} />
                      <span className="text-sm font-medium">{PLATFORMS[p.platform].name}</span>
                      {p.followersDelta !== null && (
                        <span className="ml-auto text-xs font-semibold tabular-nums text-muted">{formatSigned(p.followersDelta)}</span>
                      )}
                    </div>
                    <p className="mt-2 text-xl font-semibold">{p.followers !== null ? formatCompact(p.followers) : "—"}</p>
                    <p className="text-xs text-muted">{p.platform === "youtube" ? "abonnés" : "followers"}</p>
                    {values.length > 1 && <Sparkline values={values} className="mt-2" color={`var(--series-${p.platform})`} />}
                  </Card>
                );
              })}
            </div>
          </div>

          <ChartCard
            title={weekly ? "Vues par semaine" : "Vues par jour"}
            subtitle="YouTube : vues de la chaîne (YouTube Analytics) · TikTok et Instagram : vues des vidéos publiées avec VideoPosting"
            legend={<Legend series={PLATFORM_SERIES} />}
            chart={
              <StackedColumns
                data={data.viewsSeries}
                series={PLATFORM_SERIES}
                format={formatCompact}
                xFormat={shortDate}
                tooltipLabel={weekly ? (d) => `Semaine du ${shortDate(d)}` : longDate}
              />
            }
            table={{
              columns: ["Date", ...PLATFORM_ORDER.map((p) => PLATFORMS[p].name)],
              rows: [...data.viewsSeries].reverse().map((p) => [formatDate(p.date), ...PLATFORM_ORDER.map((k) => formatNumber(p[k]))]),
            }}
          />

          <Card className="overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="font-semibold">Par plateforme</h3>
              <p className="mt-0.5 text-sm text-muted">Chiffres au dernier relevé.</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-2/60 text-left text-xs text-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Plateforme</th>
                    <th className="px-3 py-2.5 text-right font-medium">Abonnés</th>
                    <th className="px-3 py-2.5 text-right font-medium">Évolution</th>
                    <th className="px-3 py-2.5 text-right font-medium">Vues (période)</th>
                    <th className="px-3 py-2.5 text-right font-medium">J&apos;aime cumulés</th>
                    <th className="px-3 py-2.5 text-right font-medium">Vidéos</th>
                    <th className="px-5 py-2.5 text-right font-medium">Synchro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.platforms.map((p) => (
                    <tr key={p.platform} className="border-t border-border">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <PlatformBadge platform={p.platform} size={24} />
                          <span>
                            <span className="block font-medium">{PLATFORMS[p.platform].name}</span>
                            <span className="block text-xs text-muted">{p.accountName ?? (p.connected ? "" : "Non connecté")}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{formatNumber(p.followers)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatSigned(p.followersDelta)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(p.views)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(p.likes)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(p.videoCount)}</td>
                      <td className="px-5 py-3 text-right text-xs text-muted">
                        {p.sync.error ? (
                          <span className="inline-flex items-center gap-1 text-warning" title={p.sync.error}>
                            <AlertTriangle className="size-3.5" /> Partielle
                          </span>
                        ) : p.sync.at ? (
                          formatRelative(p.sync.at)
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="font-semibold">Meilleures vidéos</h3>
              <p className="mt-0.5 text-sm text-muted">Vidéos publiées sur la période, classées par vues cumulées.</p>
            </div>
            {data.topPosts.length === 0 ? (
              <EmptyState icon={<Film className="size-6" />} title="Aucune vidéo publiée sur la période" className="py-10" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-surface-2/60 text-left text-xs text-muted">
                    <tr>
                      <th className="w-10 px-5 py-2.5 font-medium">#</th>
                      <th className="px-3 py-2.5 font-medium">Vidéo</th>
                      {PLATFORM_ORDER.map((p) => (
                        <th key={p} className="px-3 py-2.5 text-right font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <PlatformBadge platform={p} size={14} /> Vues
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      <th className="px-5 py-2.5 text-right font-medium">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPosts.slice(0, 10).map((t, i) => {
                      const real = !t.postId.startsWith("demo-");
                      const title = (
                        <span className="flex items-center gap-3">
                          <span className="h-12 w-7 shrink-0 overflow-hidden rounded-md bg-surface-2">
                            {t.posterId && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaUrl(t.posterId)} alt="" className="size-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-72 truncate font-medium">{t.title}</span>
                            <span className="block text-xs text-muted">{t.publishedAt ? formatDate(t.publishedAt) : ""}</span>
                          </span>
                        </span>
                      );
                      return (
                        <tr key={t.postId} className="border-t border-border hover:bg-surface-2/40">
                          <td className="px-5 py-2.5 text-muted tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            {real ? (
                              <Link href={`/post?id=${t.postId}`} className="hover:text-accent">
                                {title}
                              </Link>
                            ) : (
                              title
                            )}
                          </td>
                          {PLATFORM_ORDER.map((p) => {
                            const m = t.platforms[p];
                            return (
                              <td key={p} className="px-3 py-2.5 text-right tabular-nums">
                                {m ? (
                                  m.url ? (
                                    <a href={m.url} target="_blank" rel="noreferrer" className="hover:text-accent">
                                      {formatCompact(m.views)}
                                    </a>
                                  ) : (
                                    formatCompact(m.views)
                                  )
                                ) : (
                                  <span className="text-subtle">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatCompact(t.totalViews)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">
                            {formatCompact(t.totalEngagement)}
                            <span className="ml-1.5 text-xs text-muted">{t.totalViews ? formatPercent(t.totalEngagement / t.totalViews) : ""}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
