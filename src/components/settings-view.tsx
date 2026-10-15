"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { mutate as globalMutate } from "swr";
import {
  BookOpen,
  Clock,
  FlaskConical,
  Globe,
  Hash,
  KeyRound,
  Lock,
  Plus,
  Save,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useSettings } from "@/lib/hooks";
import { PLATFORMS, YOUTUBE_CATEGORIES, YOUTUBE_LANGUAGES, YOUTUBE_PRIVACY_LABELS } from "@/lib/platforms";
import type { HashtagGroup, PlatformId, PublicSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader } from "./app-shell";
import { ChipsInput } from "./composer/fields";
import { DiscordCard } from "./discord-settings";
import { LegalCard } from "./legal-settings";
import { PlatformBadge } from "./icons";
import { Badge, Button, Card, CardHeader, CopyField, ExternalA, Field, Input, Segmented, Select, Skeleton, Steps, Switch, buttonClass } from "./ui";
import { APP_NAME } from "@/lib/brand";

async function savePatch(patch: Record<string, unknown>) {
  const next = await api<PublicSettings>("/api/settings", { method: "PUT", json: patch });
  await globalMutate("/api/settings", next, { revalidate: false });
  return next;
}

const A = ExternalA;

function StatusBadge({ configured, fromEnv }: { configured: boolean; fromEnv: boolean }) {
  if (fromEnv) return <Badge tone="info">Fichier .env</Badge>;
  return configured ? <Badge tone="success" dot>Configuré</Badge> : <Badge>Non configuré</Badge>;
}

function ApiCard({ platform, settings, highlight }: { platform: PlatformId; settings: PublicSettings; highlight: boolean }) {
  const cred = settings.credentials[platform];
  const initialId = platform === "youtube" ? settings.credentials.youtube.clientId : platform === "tiktok" ? settings.credentials.tiktok.clientKey : settings.credentials.instagram.appId;
  const [clientId, setClientId] = useState(initialId);
  const [secret, setSecret] = useState("");
  const [loginType, setLoginType] = useState(settings.credentials.instagram.loginType);
  const [graphVersion, setGraphVersion] = useState(settings.credentials.instagram.graphVersion);
  const [saving, setSaving] = useState(false);
  const [guide, setGuide] = useState(!cred.configured);
  const redirect = settings.redirectUris[platform];

  const save = async () => {
    setSaving(true);
    try {
      const body =
        platform === "youtube"
          ? { youtube: { clientId, clientSecret: secret } }
          : platform === "tiktok"
            ? { tiktok: { clientKey: clientId, clientSecret: secret } }
            : { instagram: { appId: clientId, appSecret: secret, loginType, graphVersion } };
      await savePatch({ credentials: body });
      setSecret("");
      toast.success(`Identifiants ${PLATFORMS[platform].name} enregistrés`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!confirm("Supprimer les identifiants enregistrés ?")) return;
    await savePatch({ clearCredentials: platform });
    setClientId("");
    toast.success("Identifiants supprimés");
  };

  const labels = {
    youtube: { id: "ID client OAuth", secret: "Code secret du client" },
    tiktok: { id: "Client key", secret: "Client secret" },
    instagram: loginType === "facebook" ? { id: "ID de l'app Meta", secret: "Clé secrète de l'app" } : { id: "ID de l'app Instagram", secret: "Clé secrète de l'app Instagram" },
  }[platform];

  const steps: Record<PlatformId, ReactNode[]> = {
    youtube: [
      <>Créez un projet sur <A href="https://console.cloud.google.com/projectcreate">Google Cloud Console</A>.</>,
      <>Activez <strong>YouTube Data API v3</strong> et <strong>YouTube Analytics API</strong> dans « API et services ».</>,
      <>Configurez l&apos;écran de consentement OAuth (type Externe) et ajoutez votre adresse e-mail comme utilisateur test.</>,
      <>Dans l&apos;écran de consentement, indiquez la page d&apos;accueil et les liens des <a href="#legal" className="text-accent underline">pages légales</a> (confidentialité, conditions d&apos;utilisation).</>,
      <>Créez un <strong>ID client OAuth</strong> de type « Application Web » avec l&apos;URI de redirection ci-dessous.</>,
      <>Copiez l&apos;ID client et le code secret dans les champs ci-dessus.</>,
    ],
    tiktok: [
      <>Créez une application sur <A href="https://developers.tiktok.com/apps">TikTok for Developers</A>.</>,
      <>Dans « App details », renseignez la <i>Terms of Service URL</i> et la <i>Privacy Policy URL</i> (section <a href="#legal" className="text-accent underline">Pages légales</a>).</>,
      <>Ajoutez les produits <strong>Login Kit</strong> et <strong>Content Posting API</strong> (activez « Direct Post »).</>,
      <>Demandez les autorisations : user.info.basic, user.info.profile, user.info.stats, video.list, video.publish, video.upload.</>,
      <>Dans Login Kit, ajoutez l&apos;URI de redirection ci-dessous (HTTPS obligatoire, utilisez un tunnel en local).</>,
      <>Copiez la Client key et le Client secret.</>,
      <>
        Publications <strong>photo</strong> : dans « URL properties », ajoutez et vérifiez l&apos;adresse de votre site (préfixe{" "}
        <code className="rounded bg-surface-2 px-1">{settings.publicUrl}/</code>) : TikTok télécharge les photos depuis cette adresse.
      </>,
    ],
    instagram:
      loginType === "facebook"
        ? [
            <>Créez une app de type Entreprise sur <A href="https://developers.facebook.com/apps">Meta for Developers</A>.</>,
            <>Ajoutez <strong>Facebook Login for Business</strong> et <strong>Instagram API (connexion Facebook)</strong>.</>,
            <>Ajoutez l&apos;URI de redirection ci-dessous dans « URI de redirection OAuth valides ».</>,
            <>Votre compte Instagram professionnel doit être lié à une Page Facebook.</>,
            <>Dans Paramètres → Général, indiquez les URL des conditions, de la confidentialité et des instructions de suppression des données (<a href="#legal" className="text-accent underline">Pages légales</a>).</>,
            <>Copiez l&apos;ID et la clé secrète de l&apos;app (Paramètres → Général).</>,
          ]
        : [
            <>Créez une app de type Entreprise sur <A href="https://developers.facebook.com/apps">Meta for Developers</A>.</>,
            <>Ajoutez le produit <strong>Instagram</strong> → « Configuration de l&apos;API avec connexion Instagram ».</>,
            <>Dans « Business login settings », ajoutez l&apos;URI de redirection ci-dessous.</>,
            <>Tant que l&apos;app est en développement, ajoutez votre compte Instagram comme testeur (Rôles).</>,
            <>Dans Paramètres → Général, indiquez les URL des conditions, de la confidentialité et des instructions de suppression des données (<a href="#legal" className="text-accent underline">Pages légales</a>).</>,
            <>Copiez l&apos;« ID de l&apos;app Instagram » et sa clé secrète.</>,
          ],
  };

  // Ce qu'exige chaque plateforme pour que les publications ne soient plus privées (et ouvertes à d'autres comptes).
  const legalLink = (
    <a href="#legal" className="text-accent underline">
      pages légales
    </a>
  );
  const publicSteps: Record<PlatformId, ReactNode[]> = {
    youtube: [
      <>
        Écran de consentement OAuth : passez l&apos;application <strong>en production</strong> et demandez la <strong>validation Google</strong> (envoi
        de vidéos et statistiques), avec une vidéo de démonstration et les liens des {legalLink}.
      </>,
      <>
        Remplissez le <A href="https://support.google.com/youtube/contact/yt_api_form">formulaire d&apos;audit de l&apos;API YouTube</A> (YouTube API
        Services – Audit and Quota Extension). Il permet aussi d&apos;augmenter le quota quotidien.
      </>,
      <>
        Une fois le projet audité, les vidéos sont publiées avec la visibilité choisie (« Public » par défaut, voir Valeurs par défaut) : rien à
        changer dans YouTube Studio.
      </>,
    ],
    tiktok: [
      <>
        Soumettez l&apos;application à la validation de TikTok (<i>Submit for review</i>) avec Login Kit et Content Posting API, les {legalLink} et une
        vidéo de démonstration du parcours de publication.
      </>,
      <>
        Demandez ensuite l&apos;<strong>audit Direct Post</strong> de la Content Posting API : TikTok vérifie le respect de ses{" "}
        <A href="https://developers.tiktok.com/doc/content-sharing-guidelines">règles de partage</A>, déjà appliquées par le composer.
      </>,
      <>
        Après l&apos;audit, il suffit de choisir « Tout le monde » dans le composer : la vidéo est publique dès sa mise en ligne. TikTok exige ce choix à
        chaque publication (aucune valeur par défaut n&apos;est autorisée).
      </>,
    ],
    instagram: [
      <>Les publications Instagram sont toujours publiques (compte professionnel) : aucun réglage de visibilité.</>,
      loginType === "facebook" ? (
        <>
          Pour d&apos;autres comptes que les testeurs : vérification d&apos;entreprise, puis App Review (accès avancé) de instagram_basic,
          instagram_content_publish, instagram_manage_insights, pages_show_list et pages_read_engagement, et passage de l&apos;app en mode « Live ».
        </>
      ) : (
        <>
          Pour d&apos;autres comptes que les testeurs : vérification d&apos;entreprise, puis App Review (accès avancé) de instagram_business_basic,
          instagram_business_content_publish et instagram_business_manage_insights, et passage de l&apos;app en mode « Live ».
        </>
      ),
    ],
  };

  const notes: Record<PlatformId, ReactNode> = {
    youtube: "Tant que Google n'a pas audité votre projet, YouTube met en privé toutes les vidéos envoyées via l'API, quelle que soit la visibilité choisie. Quota par défaut : 10 000 unités/jour (un envoi en consomme 1 600).",
    tiktok: "Avant l'audit TikTok, les publications directes ne peuvent être que privées (« Moi uniquement », compte TikTok en privé). Le mode brouillon fonctionne sans audit.",
    instagram:
      loginType === "facebook"
        ? "La vidéo est envoyée directement aux serveurs de Meta : aucune URL publique n'est nécessaire."
        : "Instagram télécharge la vidéo depuis votre serveur : l'application doit être accessible en HTTPS (PUBLIC_URL).",
  };

  return (
    <Card id={platform} className={cn("scroll-mt-6 transition-shadow", highlight && "ring-2 ring-accent")}>
      <CardHeader
        icon={<PlatformBadge platform={platform} size={36} />}
        title={`API ${PLATFORMS[platform].name}`}
        description={platform === "instagram" ? "Instagram Graph API — publication de Reels et statistiques" : platform === "youtube" ? "YouTube Data API v3 + YouTube Analytics" : "Content Posting API + Display API"}
        actions={<StatusBadge configured={cred.configured} fromEnv={cred.fromEnv} />}
      />
      <div className="space-y-4 p-5">
        {platform === "instagram" && (
          <Field label="Méthode de connexion">
            <Segmented
              value={loginType}
              onChange={setLoginType}
              options={[
                { value: "instagram", label: "Connexion Instagram" },
                { value: "facebook", label: "Via Facebook (Page)" },
              ]}
            />
          </Field>
        )}
        {cred.fromEnv && <p className="rounded-xl bg-sky-500/8 p-3 text-xs text-sky-700 dark:text-sky-300">Identifiants définis dans le fichier .env : ils sont prioritaires sur cette page.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={labels.id}>
            <Input value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={cred.fromEnv} placeholder="Collez la valeur ici" autoComplete="off" />
          </Field>
          <Field label={labels.secret}>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={cred.fromEnv}
              placeholder={cred.hasSecret ? "•••••••••• (enregistré)" : "Collez la valeur ici"}
              autoComplete="new-password"
            />
          </Field>
        </div>
        {platform === "instagram" && (
          <Field label="Version de l'API Graph" hint="Format v24.0 — gardez la valeur par défaut sauf besoin particulier." className="max-w-xs">
            <Input value={graphVersion} onChange={(e) => setGraphVersion(e.target.value)} disabled={cred.fromEnv} />
          </Field>
        )}
        <Field label="URI de redirection à déclarer" hint={!redirect.startsWith("https://") && platform === "tiktok" ? "TikTok exige une URL HTTPS : définissez PUBLIC_URL (ex. tunnel Cloudflare/ngrok)." : undefined}>
          <CopyField value={redirect} />
        </Field>

        <div className="rounded-xl border border-border">
          <button onClick={() => setGuide((g) => !g)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
            <BookOpen className="size-4 text-accent" /> Guide de configuration
            <span className="ml-auto text-xs text-muted">{guide ? "Masquer" : "Afficher"}</span>
          </button>
          {guide && (
            <div className="space-y-4 border-t border-border p-4">
              <Steps steps={steps[platform]} />
              <p className="rounded-lg bg-warning/8 p-3 text-xs text-warning">{notes[platform]}</p>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Globe className="size-4 text-success" /> Publier en public
                </p>
                <Steps steps={publicSteps[platform]} />
              </div>
            </div>
          )}
        </div>

        {!cred.fromEnv && (
          <div className="flex flex-wrap justify-end gap-2">
            {cred.configured && (
              <Button variant="ghost" onClick={clear}>
                <Trash2 className="size-4" /> Supprimer
              </Button>
            )}
            <Button variant="primary" onClick={save} loading={saving}>
              <Save className="size-4" /> Enregistrer
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function HashtagGroups({ settings }: { settings: PublicSettings }) {
  const [groups, setGroups] = useState<HashtagGroup[]>(settings.hashtagGroups);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(groups) !== JSON.stringify(settings.hashtagGroups);
  const save = async () => {
    setSaving(true);
    try {
      await savePatch({ hashtagGroups: groups.filter((g) => g.name.trim()) });
      toast.success("Groupes de hashtags enregistrés");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card id="hashtags" className="scroll-mt-6">
      <CardHeader icon={<Hash className="size-4" />} title="Groupes de hashtags" description="Insérez un ensemble de hashtags en un clic depuis le composer." />
      <div className="space-y-3 p-5">
        {groups.map((g, i) => (
          <div key={g.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-start">
            <Input
              value={g.name}
              onChange={(e) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              placeholder="Nom du groupe"
              className="sm:w-44"
            />
            <div className="min-w-0 flex-1">
              <ChipsInput value={g.tags} onChange={(tags) => setGroups((gs) => gs.map((x, j) => (j === i ? { ...x, tags } : x)))} placeholder="Ajoutez des hashtags" />
            </div>
            <Button size="icon" variant="ghost" onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))} aria-label="Supprimer le groupe">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => setGroups((gs) => [...gs, { id: crypto.randomUUID(), name: "", tags: [] }])}>
            <Plus className="size-4" /> Ajouter un groupe
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Defaults({ settings }: { settings: PublicSettings }) {
  const [d, setD] = useState(settings.defaults);
  const set = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(d) !== JSON.stringify(settings.defaults);
  return (
    <Card id="defaults" className="scroll-mt-6">
      <CardHeader icon={<SlidersHorizontal className="size-4" />} title="Valeurs par défaut" description="Appliquées à chaque nouvelle publication." />
      <div className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Visibilité YouTube">
            <Select value={d.youtubePrivacy} onChange={(e) => set({ youtubePrivacy: e.target.value as typeof d.youtubePrivacy })}>
              {Object.entries(YOUTUBE_PRIVACY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Catégorie YouTube">
            <Select value={d.youtubeCategoryId} onChange={(e) => set({ youtubeCategoryId: e.target.value })}>
              {YOUTUBE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Langue">
            <Select value={d.youtubeLanguage} onChange={(e) => set({ youtubeLanguage: e.target.value })}>
              {YOUTUBE_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
          <Switch label="TikTok : autoriser les commentaires" checked={d.tiktokAllowComments} onChange={(v) => set({ tiktokAllowComments: v })} />
          <Switch label="TikTok : autoriser les duos" checked={d.tiktokAllowDuet} onChange={(v) => set({ tiktokAllowDuet: v })} />
          <Switch label="TikTok : autoriser les collages" checked={d.tiktokAllowStitch} onChange={(v) => set({ tiktokAllowStitch: v })} />
          <Switch label="Instagram : partager dans le fil" checked={d.instagramShareToFeed} onChange={(v) => set({ instagramShareToFeed: v })} />
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={async () => {
              await savePatch({ defaults: d });
              toast.success("Valeurs par défaut enregistrées");
            }}
          >
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Card>
  );
}

function General({ settings }: { settings: PublicSettings }) {
  const [currency, setCurrency] = useState(settings.currency);
  const [goal, setGoal] = useState(String(settings.monthlyRevenueGoal));
  const toggleDemo = async (v: boolean) => {
    await savePatch({ demoMode: v });
    // Les comptes, statistiques et revenus diffèrent selon le mode : on recharge tout.
    await globalMutate(() => true);
    toast.success(v ? "Mode démo activé" : "Mode démo désactivé", {
      description: v ? "Les publications et les données sont simulées." : "Connectez vos vrais comptes dans « Comptes ».",
    });
  };
  return (
    <div className="space-y-6">
      <Card id="general" className={cn("scroll-mt-6 overflow-hidden", settings.demoMode && "border-warning/40")}>
        <div className="flex items-start gap-4 p-5">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", settings.demoMode ? "bg-warning/15 text-warning" : "bg-surface-2 text-muted")}>
            <FlaskConical className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Switch
              label="Mode démo"
              description="Essayez tout l'outil sans clé d'API : comptes fictifs, publications simulées, statistiques et revenus d'exemple. Astuce : ajoutez #echec dans une légende pour simuler une erreur."
              checked={settings.demoMode}
              onChange={toggleDemo}
            />
          </div>
        </div>
      </Card>
      <Card id="revenue-settings" className="scroll-mt-6">
        <CardHeader icon={<Wallet className="size-4" />} title="Revenus" description="Devise d'affichage et objectif mensuel du tableau de bord." />
        <div className="grid gap-4 p-5 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <Field label="Devise">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["EUR", "USD", "GBP", "CHF", "CAD", "MAD", "XOF"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Objectif de revenus mensuel">
            <Input type="number" min={0} step={50} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
          <Button
            variant="primary"
            onClick={async () => {
              await savePatch({ currency, monthlyRevenueGoal: Number(goal) || 0 });
              await globalMutate((key) => typeof key === "string" && (key.startsWith("/api/revenue") || key.startsWith("/api/dashboard")));
              toast.success("Préférences enregistrées");
            }}
          >
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Deployment({ settings }: { settings: PublicSettings }) {
  const php = settings.hosting === "php";
  const desktop = settings.hosting === "desktop";
  return (
    <Card id="deploy" className="scroll-mt-6">
      <CardHeader
        icon={<ServerCog className="size-4" />}
        title="Serveur & sécurité"
        description={php ? "Hébergement mutualisé (PHP)." : desktop ? "Version ordinateur (Windows / macOS)." : "Paramètres définis par variables d'environnement (fichier .env)."}
      />
      <div className="divide-y divide-border">
        <div className="flex items-start gap-3 p-5">
          <Globe className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">URL publique</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted">{settings.publicUrl}</p>
            <p className="mt-1 text-xs text-muted">
              {settings.publicUrlIsReachable
                ? "Accessible en HTTPS : parfait pour les redirections OAuth et Instagram."
                : php
                  ? "Activez le certificat SSL (HTTPS) de votre hébergement : TikTok et Instagram l'exigent."
                  : desktop
                    ? "Adresse locale : parfaite pour YouTube. TikTok et Instagram exigent une adresse HTTPS publique : utilisez la version hébergée (ex. malabop.fr/posting) pour ces plateformes."
                  : "Adresse locale : suffisante pour YouTube, mais TikTok et Instagram (connexion Instagram) exigent une URL HTTPS publique. Définissez PUBLIC_URL."}
            </p>
          </div>
          <Badge tone={settings.publicUrlIsReachable ? "success" : "warning"}>{settings.publicUrlIsReachable ? "Publique" : "Locale"}</Badge>
        </div>
        {desktop && (
          <div className="flex items-start gap-3 p-5">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium">Application sur votre ordinateur</p>
              <p className="text-xs text-muted">
                Les publications programmées partent tant que {APP_NAME} est ouvert (ordinateur allumé, non en veille). Vos données sont stockées dans :
              </p>
              {settings.dataDir && <CopyField value={settings.dataDir} />}
            </div>
          </div>
        )}
        {php && settings.cronUrl && (
          <div className="flex items-start gap-3 p-5">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <p className="font-medium">Publications programmées (tâche planifiée)</p>
              <p className="text-xs text-muted">
                Un hébergement mutualisé ne fait rien tant que personne ne visite le site. Pour que les publications programmées partent à l&apos;heure
                même quand l&apos;application est fermée, faites appeler cette adresse <strong>toutes les minutes</strong> par un service gratuit comme{" "}
                <A href="https://cron-job.org">cron-job.org</A> (les tâches planifiées OVH sont limitées à une par heure).
              </p>
              <CopyField value={settings.cronUrl} />
            </div>
          </div>
        )}
        {php && settings.env && (
          <div className="flex items-start gap-3 p-5">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium">Fichier .env</p>
              <p className="text-xs text-muted">
                {!settings.env.found
                  ? "Aucun fichier .env trouvé : les identifiants saisis sur cette page sont utilisés. Déposez le fichier .env fourni hors du dossier public du site pour les y regrouper (voir LISEZ-MOI)."
                  : settings.env.public
                    ? "Attention : le fichier .env se trouve dans le dossier public du site. Déplacez-le au-dessus du dossier du site (ou dans posting/data)."
                    : settings.env.location === "data"
                      ? "Fichier .env trouvé dans le dossier protégé posting/data."
                      : "Fichier .env trouvé hors du dossier public : il n'est pas accessible depuis le web."}
              </p>
              {settings.env.found && settings.env.keys.length > 0 && (
                <p className="flex flex-wrap gap-1.5 pt-1">
                  {settings.env.keys.map((k) => (
                    <code key={k} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px]">
                      {k}
                    </code>
                  ))}
                </p>
              )}
            </div>
            <Badge tone={!settings.env.found ? "neutral" : settings.env.public ? "danger" : "success"}>
              {!settings.env.found ? "Absent" : settings.env.public ? "Exposé" : "Protégé"}
            </Badge>
          </div>
        )}
        <div className="flex items-start gap-3 p-5">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{php ? "Connexion avec Twitch" : "Protection par mot de passe"}</p>
            <p className="mt-1 text-xs text-muted">
              {php
                ? "Chaque compte Twitch autorisé dispose de son propre espace (publications, comptes connectés, statistiques)."
                : settings.passwordProtected
                  ? "L'accès à l'interface est protégé (APP_PASSWORD)."
                  : "Définissez APP_PASSWORD avant d'exposer l'application sur Internet."}
            </p>
            {php && settings.canManageApps && (
              <Link href="/admin" className={buttonClass("secondary", "sm", "mt-3")}>
                <ShieldCheck className="size-4" /> Gérer les espaces et les accès
              </Link>
            )}
          </div>
          <Badge tone={settings.passwordProtected ? "success" : "warning"}>{settings.passwordProtected ? "Activée" : "Désactivée"}</Badge>
        </div>
      </div>
    </Card>
  );
}

const NAV = [
  { id: "general", label: "Général" },
  { id: "tiktok", label: "API TikTok" },
  { id: "youtube", label: "API YouTube" },
  { id: "instagram", label: "API Instagram" },
  { id: "discord", label: "Discord" },
  { id: "legal", label: "Pages légales" },
  { id: "hashtags", label: "Hashtags" },
  { id: "defaults", label: "Valeurs par défaut" },
  { id: "deploy", label: "Serveur & sécurité" },
];

/** Espace d'un membre (hébergement multi-espaces) : les applications sont gérées par l'administrateur. */
function ManagedApiCard({ platform, settings, highlight }: { platform: PlatformId; settings: PublicSettings; highlight: boolean }) {
  const cred = settings.credentials[platform];
  return (
    <Card id={platform} className={cn("scroll-mt-6 transition-shadow", highlight && "ring-2 ring-accent")}>
      <CardHeader
        icon={<PlatformBadge platform={platform} size={36} />}
        title={`API ${PLATFORMS[platform].name}`}
        description={
          cred.configured
            ? `Application configurée par l'administrateur : connectez votre compte ${PLATFORMS[platform].name} dans « Comptes ».`
            : `L'administrateur n'a pas encore configuré l'application ${PLATFORMS[platform].name}. Utilisez le mode démo en attendant.`
        }
        actions={<StatusBadge configured={cred.configured} fromEnv={false} />}
        className="pb-5"
      />
    </Card>
  );
}

export function SettingsView() {
  const { data: settings } = useSettings();
  const params = useSearchParams();
  const missing = params.get("missing");

  const member = settings?.canManageApps === false;
  useEffect(() => {
    if (missing && missing in PLATFORMS && settings) {
      toast.info(member ? `API ${PLATFORMS[missing as PlatformId].name} non configurée` : `Configurez d'abord l'API ${PLATFORMS[missing as PlatformId].name}`, {
        description: member
          ? "Demandez à l'administrateur de configurer l'application, ou réactivez le mode démo."
          : "Renseignez les identifiants de votre application développeur.",
      });
      setTimeout(() => document.getElementById(missing)?.scrollIntoView({ behavior: "smooth" }), 300);
    }
    // Une seule notification, une fois les paramètres chargés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, !!settings]);

  return (
    <PageContainer>
      <PageHeader title="Paramètres" description="Mode démo, accès aux API des plateformes et préférences." />
      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="sticky top-6 hidden h-fit space-y-0.5 lg:block">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg">
              {n.label}
            </a>
          ))}
        </nav>
        {!settings ? (
          <div className="space-y-6">
            <Skeleton className="h-28" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : (
          <div className="min-w-0 space-y-6">
            <General settings={settings} />
            {(["tiktok", "youtube", "instagram"] as PlatformId[]).map((p) =>
              settings.canManageApps === false ? (
                <ManagedApiCard key={p} platform={p} settings={settings} highlight={missing === p} />
              ) : (
                <ApiCard key={p} platform={p} settings={settings} highlight={missing === p} />
              ),
            )}
            <DiscordCard settings={settings} />
            <LegalCard settings={settings} />
            <HashtagGroups settings={settings} />
            <Defaults settings={settings} />
            <Deployment settings={settings} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
