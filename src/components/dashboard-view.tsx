"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, Circle, Clapperboard, FlaskConical, Plus, Sparkles, Target, Users, Wallet } from "lucide-react";
import { delta, formatCompact, formatCurrency, formatDateTime, formatPercent, formatRelative, formatSigned } from "@/lib/format";
import { useAccess, useDashboard } from "@/lib/hooks";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { PageContainer } from "./app-shell";
import { Sparkline } from "./charts";
import { PlatformBadge } from "./icons";
import { PostRow, Thumb, postHref, postTitle } from "./posts/post-bits";
import { DeltaBadge, StatTile } from "./stat-tile";
import { Avatar, Badge, ButtonLink, Card, EmptyState, Skeleton } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

export function DashboardView() {
  const { data, mutate } = useDashboard();
  const { canConfigure } = useAccess();

  if (!data) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  const connected = new Set(data.accounts.map((a) => a.platform));
  const totalPosts = data.counts.published + data.counts.failed + data.counts.scheduled + data.counts.drafts;
  const onboarding = [
    ...PLATFORM_ORDER.map((p) => ({ label: `Connecter ${PLATFORMS[p].name}`, done: connected.has(p), href: "/accounts" })),
    { label: "Publier votre première vidéo", done: data.counts.published > 0, href: "/compose" },
  ];
  const onboardingDone = onboarding.every((s) => s.done);
  const goalPct = data.revenue.goal > 0 ? Math.min(100, (data.revenue.thisMonth / data.revenue.goal) * 100) : 0;
  const next = data.upcoming[0];

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted capitalize">{new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {greeting()} <span className="inline-block animate-pop">👋</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/analytics">
            <BarChart3 className="size-4" /> Statistiques
          </ButtonLink>
          <ButtonLink href="/compose" variant="primary">
            <Plus className="size-4" /> Nouvelle publication
          </ButtonLink>
        </div>
      </div>

      {data.demo && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4 sm:flex-row sm:items-center">
          <FlaskConical className="size-5 shrink-0 text-warning" />
          <p className="flex-1 text-sm">
            <strong>Mode démo actif.</strong> Statistiques, revenus et publications sont simulés pour vous laisser explorer.{" "}
            {canConfigure
              ? "Désactivez-le dans les paramètres pour connecter vos vrais comptes."
              : "Les vraies connexions seront disponibles dès que l'administrateur l'aura désactivé."}
          </p>
          {canConfigure && (
            <ButtonLink href="/settings" size="sm">
              Configurer
            </ButtonLink>
          )}
        </div>
      )}

      {/* Indicateurs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Audience totale"
          icon={<Users />}
          value={formatCompact(data.audience.total)}
          delta={data.audience.delta !== null && <span className="font-semibold text-fg">{formatSigned(data.audience.delta)}</span>}
          hint="sur 28 jours"
          footer={data.audience.series.length > 1 && <Sparkline values={data.audience.series.map((p) => p.value)} />}
        />
        <StatTile
          label="Revenus du mois"
          icon={<Wallet />}
          value={formatCurrency(data.revenue.thisMonth, data.revenue.currency)}
          delta={<DeltaBadge value={delta(data.revenue.thisMonth, data.revenue.lastMonth)} />}
          hint="vs mois dernier (complet)"
          footer={
            data.revenue.goal > 0 && (
              <Link href="/revenue" className="block">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Target className="size-3.5" /> Objectif {formatCurrency(data.revenue.goal, data.revenue.currency)}
                  </span>
                  <span className="font-medium text-fg tabular-nums">{Math.round(goalPct)} %</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft">
                  <div className="h-full rounded-full gradient-brand" style={{ width: `${goalPct}%` }} />
                </div>
              </Link>
            )
          }
        />
        <StatTile
          label="Publiées ce mois-ci"
          icon={<Clapperboard />}
          value={data.counts.thisMonth}
          hint={data.successRate !== null ? `${formatPercent(data.successRate, 0)} d'envois réussis` : "Aucun envoi pour l'instant"}
          footer={
            data.counts.failed > 0 && (
              <Link href="/posts" className="text-xs font-medium text-danger hover:underline">
                {data.counts.failed} publication(s) en échec à relancer →
              </Link>
            )
          }
        />
        <StatTile
          label="Programmées"
          icon={<CalendarClock />}
          value={data.counts.scheduled}
          hint={next?.scheduledAt ? `Prochaine ${formatRelative(next.scheduledAt)}` : "Rien de prévu"}
          footer={
            <Link href="/calendar" className="text-xs font-medium text-accent hover:underline">
              Ouvrir le calendrier →
            </Link>
          }
        />
      </div>

      {!onboardingDone && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4 md:w-72">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl gradient-brand text-white">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Bien démarrer</p>
                <p className="text-sm text-muted">
                  {onboarding.filter((s) => s.done).length} / {onboarding.length} étapes terminées
                </p>
              </div>
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {onboarding.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    s.done ? "border-success/30 bg-success/5 text-muted" : "border-border hover:border-accent hover:text-accent",
                  )}
                >
                  {s.done ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-subtle" />}
                  <span className={cn(s.done && "line-through")}>{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Activité récente</h2>
            <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
              Tout voir <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Clapperboard className="size-6" />}
                title={totalPosts ? "Aucune publication envoyée" : "Prêt pour votre première vidéo ?"}
                description="Importez une vidéo, adaptez les textes pour chaque plateforme et publiez partout en un clic."
                action={
                  <ButtonLink href="/compose" variant="primary">
                    <Plus className="size-4" /> Créer une publication
                  </ButtonLink>
                }
              />
            </Card>
          ) : (
            data.recent.map((p) => <PostRow key={p.id} post={p} onChange={() => mutate()} />)
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">À venir</h2>
              <Badge tone="info">{data.counts.scheduled}</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {data.upcoming.length === 0 && (
                <p className="text-sm text-muted">
                  Aucune publication programmée.{" "}
                  <Link href="/compose" className="font-medium text-accent hover:underline">
                    Programmer une vidéo
                  </Link>
                </p>
              )}
              {data.upcoming.map((p) => (
                <Link key={p.id} href={postHref(p)} className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-surface-2">
                  <Thumb post={p} className="h-12 w-7" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{postTitle(p)}</p>
                    <p className="text-xs text-muted">{formatDateTime(p.scheduledAt)}</p>
                  </div>
                  <div className="flex -space-x-1">
                    {p.platforms.map((pl) => (
                      <PlatformBadge key={pl} platform={pl} size={18} className="ring-2 ring-surface" />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Comptes</h2>
              <Link href="/accounts" className="text-sm text-muted hover:text-accent">
                Gérer
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {PLATFORM_ORDER.map((p) => {
                const acc = data.accounts.find((a) => a.platform === p);
                return (
                  <div key={p} className="flex items-center gap-3">
                    <PlatformBadge platform={p} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{PLATFORMS[p].name}</p>
                      <p className="truncate text-xs text-muted">{acc ? (acc.username ? `@${acc.username.replace(/^@/, "")}` : acc.name) : "Non connecté"}</p>
                    </div>
                    {acc ? (
                      acc.needsReconnect ? (
                        <Badge tone="warning">À reconnecter</Badge>
                      ) : (
                        <Avatar src={acc.avatarUrl} name={acc.name} size={26} />
                      )
                    ) : (
                      <ButtonLink href="/accounts" size="xs" variant="soft">
                        Connecter
                      </ButtonLink>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
