"use client";

import { useEffect, useState, type ReactNode } from "react";
import { mutate as globalMutate } from "swr";
import { Crown, Globe, Lock, MailPlus, MoreHorizontal, Save, ShieldCheck, ShieldOff, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatBytes, formatNumber, formatRelative } from "@/lib/format";
import { useAdmin, useSession, useSettings } from "@/lib/hooks";
import { BASE_PATH, pageUrl } from "@/lib/paths";
import type { AccessMode, AdminOverview, AdminUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader } from "./app-shell";
import { ChipsInput } from "./composer/fields";
import { TwitchLogo } from "./icons";
import { Avatar, Badge, Button, Card, CardHeader, CopyField, EmptyState, Field, Input, Menu, Skeleton, buttonClass } from "./ui";

async function save(url: string, method: "PUT" | "DELETE", json?: unknown) {
  const next = await api<AdminOverview>(url, { method, json });
  await globalMutate("/api/admin", next, { revalidate: false });
  return next;
}

const normalizeLogin = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
const splitLogins = (raw: string) => raw.split(/[\s,;]+/).filter(Boolean);

const MODES: { value: AccessMode; title: string; description: string; icon: ReactNode }[] = [
  { value: "owner", title: "Administrateurs uniquement", description: "Personne d'autre ne peut se connecter.", icon: <Lock className="size-4" /> },
  { value: "invite", title: "Sur invitation", description: "Les pseudos Twitch de votre liste peuvent créer leur espace.", icon: <MailPlus className="size-4" /> },
  { value: "open", title: "Tout compte Twitch", description: "N'importe qui peut créer un espace sur votre hébergement.", icon: <Globe className="size-4" /> },
];

function isAllowed(u: AdminUser, access: AdminOverview["access"]) {
  if (u.role === "admin" || access.mode === "open") return true;
  return access.mode === "invite" && access.allowed.includes(u.login.toLowerCase());
}

function AccessCard({ overview }: { overview: AdminOverview }) {
  const [mode, setMode] = useState(overview.access.mode);
  const [allowed, setAllowed] = useState(overview.access.allowed);
  const [saving, setSaving] = useState(false);
  const { data: settings } = useSettings();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  // Adresse officielle du site (celle déclarée chez Twitch), à défaut celle du navigateur.
  const loginUrl = settings?.publicUrl ? `${settings.publicUrl.replace(/\/+$/, "")}${pageUrl("/login").slice(BASE_PATH.length)}` : origin && origin + pageUrl("/login");
  const dirty = mode !== overview.access.mode || allowed.join(",") !== overview.access.allowed.join(",");

  const submit = async () => {
    setSaving(true);
    try {
      await save("/api/admin/access", "PUT", { mode, allowed });
      toast.success("Règles d'accès enregistrées");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader icon={<ShieldCheck className="size-4" />} title="Qui peut se connecter ?" description="Chaque personne autorisée se connecte avec son compte Twitch et obtient un espace vierge, séparé du vôtre." />
      <div className="space-y-5 p-5">
        <div className="grid gap-2.5 md:grid-cols-3" role="radiogroup" aria-label="Mode d'accès">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                mode === m.value ? "border-accent bg-accent-soft/60 ring-4 ring-[var(--ring)]" : "border-border hover:border-border-strong hover:bg-surface-2",
              )}
            >
              <span className={cn("flex items-center gap-2 text-sm font-semibold", mode === m.value && "text-accent")}>
                {m.icon}
                {m.title}
              </span>
              <span className="text-xs text-muted">{m.description}</span>
            </button>
          ))}
        </div>

        {mode === "invite" && (
          <Field label="Pseudos Twitch invités" hint="Saisissez un pseudo puis Entrée (le @ est facultatif). Retirer un pseudo coupe immédiatement son accès.">
            <ChipsInput value={allowed} onChange={setAllowed} prefix="@" normalize={normalizeLogin} splitter={splitLogins} placeholder="pseudo_twitch" max={500} />
          </Field>
        )}
        {mode === "open" && (
          <p className="rounded-xl bg-warning/8 p-3 text-xs text-warning">
            Toute personne possédant un compte Twitch pourra créer un espace et envoyer des vidéos sur votre hébergement (espace disque partagé).
          </p>
        )}
        {mode !== "owner" && loginUrl && (
          <Field label="Adresse à partager">
            <CopyField value={loginUrl} />
          </Field>
        )}

        <div className="flex justify-end">
          <Button variant="primary" onClick={submit} loading={saving} disabled={!dirty}>
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Card>
  );
}

function UserRow({ user, me, overview }: { user: AdminUser; me: string | undefined; overview: AdminOverview }) {
  const self = user.id === me;
  const allowed = isAllowed(user, overview.access);
  const setRole = async (role: "admin" | "member") => {
    try {
      await save(`/api/admin/users/${user.id}`, "PUT", { role });
      toast.success(role === "admin" ? `${user.displayName} est maintenant administrateur` : `${user.displayName} n'est plus administrateur`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const remove = async () => {
    if (!confirm(`Supprimer l'espace de ${user.displayName} ? Ses publications, vidéos, comptes connectés et statistiques seront définitivement effacés.`)) return;
    try {
      await save(`/api/admin/users/${user.id}`, "DELETE");
      toast.success("Espace supprimé");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        <Avatar src={user.avatarUrl ?? undefined} name={user.displayName} size={40} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            <span className="truncate">{user.displayName}</span>
            {self && <Badge tone="accent">Vous</Badge>}
            {user.role === "admin" && (
              <Badge tone="info">
                <Crown className="size-3" /> Admin
              </Badge>
            )}
            {!allowed && <Badge tone="warning">Accès retiré</Badge>}
          </p>
          <p className="truncate text-xs text-muted">
            @{user.login} · dernière connexion {formatRelative(user.lastLoginAt)}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-4 text-xs sm:w-72">
        <div>
          <dt className="text-muted">Publications</dt>
          <dd className="font-semibold tabular-nums">{formatNumber(user.posts)}</dd>
        </div>
        <div>
          <dt className="text-muted">Comptes</dt>
          <dd className="font-semibold tabular-nums">{formatNumber(user.accounts)}</dd>
        </div>
        <div>
          <dt className="text-muted">Vidéos</dt>
          <dd className="font-semibold tabular-nums">{formatBytes(user.storage)}</dd>
        </div>
      </dl>
      {self ? (
        <span className="size-8" aria-hidden />
      ) : (
        <Menu
          trigger={(p) => (
            <button {...p} className={buttonClass("ghost", "icon-sm")} aria-label={`Actions pour ${user.displayName}`}>
              <MoreHorizontal className="size-4" />
            </button>
          )}
          items={[
            user.role === "admin"
              ? { label: "Retirer les droits d'administrateur", icon: <ShieldOff />, onClick: () => setRole("member") }
              : { label: "Nommer administrateur", icon: <Crown />, onClick: () => setRole("admin") },
            "separator",
            { label: "Supprimer l'espace", icon: <Trash2 />, onClick: remove, danger: true },
          ]}
        />
      )}
    </li>
  );
}

function UsersCard({ overview }: { overview: AdminOverview }) {
  const { data: session } = useSession();
  const total = overview.users.reduce((n, u) => n + u.storage, 0);
  return (
    <Card>
      <CardHeader
        icon={<Users className="size-4" />}
        title="Espaces"
        description={`${overview.users.length} espace${overview.users.length > 1 ? "s" : ""} · ${formatBytes(total)} de vidéos stockées`}
      />
      {overview.users.length === 0 ? (
        <EmptyState icon={<UserRound className="size-6" />} title="Aucun utilisateur" />
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {overview.users.map((u) => (
            <UserRow key={u.id} user={u} me={session?.user?.id} overview={overview} />
          ))}
        </ul>
      )}
      <p className="border-t border-border px-5 py-3 text-xs text-muted">
        Les administrateurs gèrent les accès et les applications développeur TikTok, YouTube et Instagram (Paramètres), communes à tous les espaces.
      </p>
    </Card>
  );
}

function TwitchCard({ overview }: { overview: AdminOverview }) {
  const [clientId, setClientId] = useState(overview.twitch.clientId);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await save("/api/admin/twitch", "PUT", { clientId, clientSecret: secret });
      setSecret("");
      toast.success("Application Twitch mise à jour");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader
        icon={<TwitchLogo className="size-4 text-[#9146FF]" />}
        title="Application Twitch"
        description="Utilisée uniquement pour identifier les personnes qui se connectent."
        actions={
          overview.twitch.fromEnv ? (
            <Badge tone="info">Fichier .env</Badge>
          ) : (
            <Badge tone="success" dot>
              Active
            </Badge>
          )
        }
      />
      {overview.twitch.fromEnv ? (
        <div className="space-y-4 p-5">
          <p className="rounded-xl bg-sky-500/8 p-3 text-sm text-sky-700 dark:text-sky-300">
            L&apos;application Twitch est définie dans le fichier .env de l&apos;hébergement (TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET). Modifiez-la
            directement dans ce fichier.
          </p>
          <Field label="URL de redirection OAuth (console Twitch)">
            <CopyField value={overview.twitch.redirectUri} />
          </Field>
        </div>
      ) : (
      <div className="space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field htmlFor="admin-twitch-id" label="ID client">
            <Input id="admin-twitch-id" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
          <Field htmlFor="admin-twitch-secret" label="Secret client">
            <Input id="admin-twitch-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="•••••••••• (enregistré)" autoComplete="new-password" />
          </Field>
        </div>
        <Field label="URL de redirection OAuth (console Twitch)">
          <CopyField value={overview.twitch.redirectUri} />
        </Field>
        <div className="flex justify-end">
          <Button variant="primary" onClick={submit} loading={saving} disabled={!clientId.trim() || (clientId === overview.twitch.clientId && !secret)}>
            <Save className="size-4" /> Enregistrer
          </Button>
        </div>
      </div>
      )}
    </Card>
  );
}

export function AdminView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { data: overview, error } = useAdmin(isAdmin);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Espaces & accès" description="Chaque compte Twitch autorisé dispose de son propre espace : vidéos, comptes connectés, statistiques et revenus." />
      <div className="mt-6 space-y-6">
        {session && !isAdmin ? (
          <Card>
            <EmptyState icon={<Lock className="size-6" />} title="Réservé aux administrateurs" description="Seuls les administrateurs peuvent gérer les accès." />
          </Card>
        ) : error ? (
          <Card className="p-5 text-sm text-danger">{(error as Error).message}</Card>
        ) : !overview ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-72" />
          </>
        ) : (
          <>
            <AccessCard key={`${overview.access.mode}:${overview.access.allowed.join(",")}`} overview={overview} />
            <UsersCard overview={overview} />
            <TwitchCard key={overview.twitch.clientId} overview={overview} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
