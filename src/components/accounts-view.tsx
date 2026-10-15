"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, KeyRound, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api-client";
import { apiUrl } from "@/lib/paths";
import { formatCurrency, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { useAccounts, useSettings } from "@/lib/hooks";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { PlatformId, PublicAccount, TwitchChannelInfo } from "@/lib/types";
import { PageContainer, PageHeader } from "./app-shell";
import { PlatformBadge, TwitchLogo } from "./icons";
import { Avatar, Badge, Button, ButtonLink, Card, Dialog, Skeleton, buttonClass } from "./ui";

const REQUIREMENTS: Record<PlatformId, string[]> = {
  tiktok: [
    "Une application TikTok for Developers avec Login Kit et Content Posting API",
    "Tant que l'application n'est pas auditée, les vidéos sont publiées en privé",
    "Statistiques : autorisations user.info.stats et video.list",
  ],
  youtube: [
    "Un compte Google avec une chaîne YouTube",
    "Un projet Google Cloud avec YouTube Data API v3 et YouTube Analytics API",
    "Revenus : chaîne membre du Programme Partenaire YouTube",
  ],
  instagram: [
    "Un compte Instagram professionnel (Créateur ou Entreprise)",
    "Une application Meta avec le produit « Instagram API »",
    "Limite : 100 publications via l'API par 24 heures",
  ],
};

function AccountCard({
  platform,
  account,
  demo,
  configured,
  onDisconnect,
}: {
  platform: PlatformId;
  account?: PublicAccount;
  demo: boolean;
  configured: boolean;
  onDisconnect: () => void;
}) {
  const connectHref = apiUrl(`/api/auth/${platform}/connect`);
  const canConnect = demo || configured;
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative flex items-center gap-4 p-5">
        <PlatformBadge platform={platform} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{PLATFORMS[platform].name}</h3>
          <p className="text-sm text-muted">{PLATFORMS[platform].format}</p>
        </div>
        {account ? (
          account.needsReconnect ? (
            <Badge tone="warning">
              <AlertTriangle className="size-3.5" /> À reconnecter
            </Badge>
          ) : (
            <Badge tone="success" dot>
              Connecté
            </Badge>
          )
        ) : (
          <Badge>Non connecté</Badge>
        )}
      </div>

      <div className="flex-1 border-t border-border p-5">
        {account ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={account.avatarUrl} name={account.name} size={44} />
              <div className="min-w-0">
                <p className="truncate font-medium">{account.name}</p>
                <p className="truncate text-sm text-muted">{account.username ? `@${account.username.replace(/^@/, "")}` : "—"}</p>
              </div>
              {account.demo && (
                <Badge tone="warning" className="ml-auto">
                  <FlaskConical className="size-3" /> Démo
                </Badge>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Connecté</dt>
                <dd className="mt-0.5 font-medium">{formatRelative(account.connectedAt)}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">{platform === "instagram" ? "Jeton valable jusqu'au" : "Accès"}</dt>
                <dd className="mt-0.5 font-medium">
                  {platform === "instagram" && account.expiresAt ? formatDate(account.expiresAt) : account.needsReconnect ? "Expiré" : "Renouvelé automatiquement"}
                </dd>
              </div>
            </dl>
            {account.meta?.loginType && (
              <p className="text-xs text-muted">
                Connexion via {account.meta.loginType === "facebook" ? `Facebook${account.meta.pageName ? ` (Page « ${account.meta.pageName} »)` : ""}` : "Instagram"}
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {REQUIREMENTS[platform].map((r) => (
              <li key={r} className="flex gap-2 text-sm text-muted">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-subtle" />
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border bg-surface-2/40 p-4">
        {account ? (
          <>
            <a href={connectHref} className="contents">
              <Button size="sm" variant={account.needsReconnect ? "primary" : "secondary"}>
                <RefreshCw className="size-4" /> Reconnecter
              </Button>
            </a>
            <Button size="sm" variant="ghost" onClick={onDisconnect}>
              <LogOut className="size-4" /> Déconnecter
            </Button>
          </>
        ) : canConnect ? (
          <a href={connectHref} className="contents">
            <Button variant="primary" className="w-full">
              Connecter {PLATFORMS[platform].name}
              {demo && " (démo)"}
            </Button>
          </a>
        ) : (
          <ButtonLink href={`/settings#${platform}`} className="w-full">
            <KeyRound className="size-4" /> Configurer l&apos;API {PLATFORMS[platform].name}
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

export function AccountsView() {
  const { data: accounts, isLoading, mutate } = useAccounts();
  const { data: settings } = useSettings();
  const params = useSearchParams();
  const router = useRouter();
  const [disconnect, setDisconnect] = useState<PlatformId | null>(null);

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected === "twitch") {
      toast.success("Chaîne Twitch connectée", { description: "Abonnés, abonnements et bits sont relevés à chaque synchronisation." });
    } else if (connected && connected in PLATFORMS) {
      toast.success(`${PLATFORMS[connected as PlatformId].name} connecté`, { description: "Vous pouvez publier dès maintenant." });
    } else if (error) {
      const p = params.get("platform");
      const name = p === "twitch" ? "Twitch" : p && p in PLATFORMS ? PLATFORMS[p as PlatformId].name : null;
      toast.error(name ? `Connexion ${name} impossible` : "Connexion impossible", { description: error, duration: 10_000 });
    }
    if (connected || error) router.replace("/accounts", { scroll: false });
  }, [params, router]);

  const confirmDisconnect = async () => {
    if (!disconnect) return;
    await api(`/api/accounts/${disconnect}`, { method: "DELETE" });
    toast.success(`${PLATFORMS[disconnect].name} déconnecté`);
    setDisconnect(null);
    void mutate();
  };

  const demo = !!settings?.demoMode;

  return (
    <PageContainer>
      <PageHeader title="Comptes connectés" description="Connectez vos comptes une fois : VideoPosting publie ensuite pour vous." />

      {demo && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4 sm:flex-row sm:items-center">
          <FlaskConical className="size-5 shrink-0 text-warning" />
          <p className="flex-1 text-sm">
            <strong>Mode démo :</strong> les connexions créent des comptes fictifs pour tester l&apos;outil sans configurer les API. Désactivez-le dans les paramètres pour connecter vos vrais comptes.
          </p>
          <ButtonLink href="/settings" size="sm">
            Paramètres
          </ButtonLink>
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading || !settings
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)
          : PLATFORM_ORDER.map((p) => (
              <AccountCard
                key={p}
                platform={p}
                account={accounts?.find((a) => a.platform === p)}
                demo={demo}
                configured={settings.credentials[p].configured}
                onDisconnect={() => setDisconnect(p)}
              />
            ))}
      </div>

      {settings?.twitchAvailable && <TwitchChannelCard />}

      <Card className="mt-6 flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-medium">Vos accès restent chez vous</p>
          <p className="mt-1 text-muted">
            Les jetons d&apos;accès sont stockés uniquement sur votre serveur (dossier <code className="rounded bg-surface-2 px-1">data/</code>) et servent seulement à publier et lire vos
            statistiques. Vous pouvez révoquer l&apos;accès à tout moment ici ou depuis chaque plateforme.{" "}
            <Link href="/settings" className="inline-flex items-center gap-0.5 text-accent hover:underline">
              Configuration des API <ExternalLink className="size-3" />
            </Link>
          </p>
        </div>
      </Card>

      <Dialog
        open={!!disconnect}
        onClose={() => setDisconnect(null)}
        title={disconnect ? `Déconnecter ${PLATFORMS[disconnect].name} ?` : ""}
        description="Les publications programmées sur cette plateforme échoueront tant que le compte ne sera pas reconnecté."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisconnect(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDisconnect}>
              Déconnecter
            </Button>
          </>
        }
      />
    </PageContainer>
  );
}

/** Chaîne Twitch : abonnés, abonnements payants et bits, pour estimer les revenus Twitch. */
function TwitchChannelCard() {
  const { data, mutate, isLoading } = useSWR<TwitchChannelInfo>("/api/twitch-channel", fetcher);
  const { data: settings } = useSettings();
  const [syncing, setSyncing] = useState(false);
  const currency = settings?.currency ?? "EUR";
  const sync = async () => {
    setSyncing(true);
    try {
      await mutate(await api<TwitchChannelInfo>("/api/twitch-channel", { method: "POST" }), { revalidate: false });
      toast.success("Chaîne Twitch à jour");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };
  const disconnect = async () => {
    if (!confirm("Déconnecter la chaîne Twitch ? Les estimations de revenus Twitch ne seront plus calculées.")) return;
    await api("/api/twitch-channel", { method: "DELETE" });
    void mutate();
    toast.success("Chaîne Twitch déconnectée");
  };
  const subs = data?.subscriptions;
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#9146FF] text-white shadow-[0_8px_24px_-10px_#9146FF]">
          <TwitchLogo className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            Chaîne Twitch
            {data?.connected && <Badge tone="success" dot>Connectée</Badge>}
            {data?.demo && <Badge tone="warning">Démo</Badge>}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {data?.connected
              ? `${data.displayName} (@${data.login}) · abonnés, abonnements et bits relevés à chaque synchronisation pour estimer vos revenus Twitch.`
              : "Connectez votre chaîne pour suivre vos abonnés, abonnements payants et bits, et estimer vos revenus Twitch (chaîne Affiliée ou Partenaire)."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {data?.connected ? (
            <>
              <Button size="sm" onClick={sync} loading={syncing}>
                {!syncing && <RefreshCw className="size-4" />} Actualiser
              </Button>
              <Button size="sm" variant="ghost" onClick={disconnect}>
                <LogOut className="size-4" /> Déconnecter
              </Button>
            </>
          ) : (
            <a href={apiUrl("/api/auth/twitch-channel/connect")} className={buttonClass("twitch", "sm")}>
              <TwitchLogo className="size-4" /> Connecter ma chaîne
            </a>
          )}
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="mx-5 mb-5 h-20" />
      ) : data?.connected ? (
        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          {[
            { label: "Abonnés (followers)", value: formatNumber(data.followers ?? null) },
            { label: "Abonnements payants", value: subs ? formatNumber(subs.total) : "—", hint: subs ? `${subs.tier1} niv. 1 · ${subs.tier2} niv. 2 · ${subs.tier3} niv. 3` : "Chaîne Affiliée requise" },
            { label: "Bits ce mois-ci", value: formatNumber(data.bitsThisMonth ?? null) },
            { label: "Revenu mensuel estimé", value: data.monthlyEstimate != null ? formatCurrency(data.monthlyEstimate, currency) : "—", hint: "Abonnements + bits (réglable dans Revenus)" },
          ].map((k) => (
            <div key={k.label} className="bg-surface p-4">
              <p className="text-xs text-muted">{k.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{k.value}</p>
              {k.hint && <p className="mt-0.5 text-[11px] text-muted">{k.hint}</p>}
            </div>
          ))}
        </div>
      ) : null}
      {data?.error && (
        <p className="flex items-center gap-2 border-t border-border bg-warning/8 px-5 py-2.5 text-xs text-warning">
          <AlertTriangle className="size-3.5 shrink-0" /> {data.error}
        </p>
      )}
    </Card>
  );
}
