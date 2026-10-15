"use client";

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Film, MoreHorizontal, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  DEFAULT_DISCORD_MESSAGE,
  DISCORD_TEMPLATE_VARIABLES,
  PLATFORM_EMOJI,
  buildDiscordPayload,
  isDiscordWebhookUrl,
  type DiscordMention,
  type DiscordStyle,
  type DiscordTiming,
  type DiscordWebhookSettings,
  type PublicDiscordWebhook,
} from "@/lib/discord";
import { formatRelative } from "@/lib/format";
import { useDiscordWebhooks } from "@/lib/hooks";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { PlatformId, PublicSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DiscordBadge, PlatformBadge } from "./icons";
import { Badge, Button, Card, CardHeader, Dialog, ExternalA, Field, Input, Menu, Segmented, Select, Skeleton, Steps, Switch, Textarea, buttonClass } from "./ui";

type FormState = DiscordWebhookSettings & { url: string; roleId: string; username: string };

const TIMING_LABELS: Record<DiscordTiming, string> = {
  each: "Un message par plateforme",
  grouped: "Un récapitulatif",
};
const STYLE_LABELS: Record<DiscordStyle, string> = { links: "Liens", card: "Carte" };
const MENTION_LABELS: Record<DiscordMention, string> = { none: "Aucune mention", everyone: "@everyone", here: "@here", role: "Un rôle" };

/** Liens d'exemple de l'aperçu (adresses au format réel de chaque plateforme). */
const SAMPLE_LINKS: Record<PlatformId, string> = {
  tiktok: "https://www.tiktok.com/@vous/video/7301234567890123456",
  youtube: "https://www.youtube.com/watch?v=aBcD3fGh1jK",
  instagram: "https://www.instagram.com/reel/C8xYz12AbCd/",
};

function emptyForm(): FormState {
  return {
    name: "",
    url: "",
    platforms: [...PLATFORM_ORDER],
    timing: "each",
    style: "links",
    message: DEFAULT_DISCORD_MESSAGE,
    mention: "none",
    roleId: "",
    username: "",
    enabled: true,
  };
}

function toForm(h: PublicDiscordWebhook): FormState {
  return {
    name: h.name,
    url: "",
    platforms: h.platforms,
    timing: h.timing,
    style: h.style,
    message: h.message,
    mention: h.mention,
    roleId: h.roleId ?? "",
    username: h.username ?? "",
    enabled: h.enabled,
  };
}

/** Champs envoyés à l'API (adresse vide = inchangée lors d'une modification). */
function toBody(f: FormState) {
  return { ...f, url: f.url.trim() || undefined, roleId: f.mention === "role" ? f.roleId.trim() : "", username: f.username.trim() };
}

/* ------------------------------------------------------------------ */
/* Aperçu façon Discord                                                */
/* ------------------------------------------------------------------ */

const INLINE_RE = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))|(<https?:\/\/[^>\s]+>)|(https?:\/\/[^\s<]+)|(@everyone|@here)|(<@&\d+>)/g;

/** Rendu minimal du Markdown de Discord : gras, liens, mentions. */
function DiscordText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const [token] = m;
    const key = `${i}-${token.length}`;
    if (m[1]) out.push(<strong key={key} className="font-semibold text-white"><DiscordText text={token.slice(2, -2)} /></strong>);
    else if (m[2]) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) ?? [];
      out.push(<span key={key} className="text-[#00A8FC]" title={href}>{label}</span>);
    } else if (m[3] || m[4]) out.push(<span key={key} className="break-all text-[#00A8FC]">{m[3] ? token.slice(1, -1) : token}</span>);
    else out.push(<span key={key} className="rounded-[3px] bg-[#5865F2]/30 px-0.5 font-medium text-[#C9CDFB]">{m[6] ? "@rôle" : token}</span>);
    last = i + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function DiscordPreview({ hook, platform }: { hook: DiscordWebhookSettings; platform?: PlatformId }) {
  const links = (hook.timing === "each" ? [platform ?? hook.platforms[0]] : hook.platforms).filter((p): p is PlatformId => !!p).map((p) => ({ platform: p, url: SAMPLE_LINKS[p] }));
  const payload = buildDiscordPayload(hook, {
    title: "Ma nouvelle vidéo",
    description: "Les coulisses de mon dernier tournage, avec toutes les étapes.",
    kind: "video",
    links,
  }) as { username: string; content: string; embeds?: { title: string; description?: string; color: number; fields: { name: string; value: string }[] }[] };
  const embed = payload.embeds?.[0];
  const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-xl bg-[#313338] p-4 font-[system-ui] text-[15px] leading-[1.375] text-[#DBDEE1] shadow-inner">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full gradient-brand">
          <svg viewBox="0 0 24 24" className="size-4 text-white" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-white">{payload.username}</span>
            <span className="rounded-[4px] bg-[#5865F2] px-1 text-[10px] leading-4 font-semibold text-white">APP</span>
            <span className="text-xs text-[#949BA4]">Aujourd&apos;hui à {time}</span>
          </div>
          {payload.content && (
            <div className="mt-0.5 break-words whitespace-pre-wrap">
              <DiscordText text={payload.content} />
            </div>
          )}
          {embed ? (
            <div className="mt-2 grid max-w-[440px] grid-cols-[1fr_auto] gap-3 rounded-[4px] border-l-4 bg-[#2B2D31] p-3 pr-4" style={{ borderLeftColor: `#${embed.color.toString(16).padStart(6, "0")}` }}>
              <div className="min-w-0">
                <div className="font-semibold text-[#00A8FC]">{embed.title}</div>
                {embed.description && <div className="mt-1 text-sm text-[#DBDEE1]">{embed.description}</div>}
                <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-x-4 gap-y-2">
                  {embed.fields.map((f) => (
                    <div key={f.name} className="min-w-0 text-sm">
                      <div className="text-xs font-semibold text-white">{f.name}</div>
                      <DiscordText text={f.value} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-[#949BA4]">Publié avec VideoPosting • Aujourd&apos;hui à {time}</div>
              </div>
              <div className="flex size-20 items-center justify-center rounded-[4px] bg-gradient-to-br from-[#7c3aed] to-[#db2777]">
                <Film className="size-6 text-white/80" />
              </div>
            </div>
          ) : (
            links.map((l) => (
              <div key={l.platform} className="mt-2 max-w-[440px] rounded-[4px] border-l-4 bg-[#2B2D31] p-3" style={{ borderLeftColor: PLATFORMS[l.platform].color }}>
                <div className="text-xs text-[#B5BAC1]">{PLATFORMS[l.platform].name}</div>
                <div className="mt-0.5 text-sm font-semibold text-[#00A8FC]">Ma nouvelle vidéo</div>
                <div className={cn("mt-2 flex items-center justify-center rounded-[4px] bg-[#1E1F22] text-[#4E5058]", l.platform === "youtube" ? "aspect-video" : "h-24 w-16")}>
                  <PlatformBadge platform={l.platform} size={22} className="opacity-70" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ajout / modification d'un webhook                                   */
/* ------------------------------------------------------------------ */

function HowTo() {
  return (
    <Steps
      steps={[
        <>Dans Discord, ouvrez les <b>Paramètres du salon</b> (roue dentée à côté de son nom) → <b>Intégrations</b> → <b>Webhooks</b>.</>,
        <>Cliquez sur <b>Nouveau webhook</b>, donnez-lui un nom et une image si vous voulez, puis <b>Copier l&apos;URL du webhook</b>.</>,
        <>Collez l&apos;adresse ci-dessous : elle commence par <code className="rounded bg-surface-2 px-1 text-xs">https://discord.com/api/webhooks/</code>.</>,
      ]}
    />
  );
}

function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; title: string; description: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
              on ? "border-accent bg-accent-soft/50 ring-2 ring-[var(--ring)]" : "border-border hover:border-border-strong hover:bg-surface-2/60",
            )}
          >
            <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", on ? "border-accent" : "border-border-strong")}>
              {on && <span className="size-1.5 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{o.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WebhookDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: PublicDiscordWebhook | null }) {
  const { mutate } = useDiscordWebhooks();
  const [form, setForm] = useState<FormState>(() => (editing ? toForm(editing) : emptyForm()));
  const [previewPlatform, setPreviewPlatform] = useState<PlatformId | undefined>(undefined);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const errors = {
    name: !form.name.trim() ? "Donnez un nom (par exemple « #annonces »)." : null,
    url: !editing || form.url.trim() ? (isDiscordWebhookUrl(form.url) ? null : "Collez l'adresse complète du webhook Discord.") : null,
    platforms: form.platforms.length ? null : "Choisissez au moins une plateforme.",
    roleId: form.mention === "role" && !/^\d{5,25}$/.test(form.roleId.trim()) ? "Identifiant du rôle : une suite de chiffres." : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const shown = (k: keyof typeof errors) => (showErrors || (k === "url" && form.url.trim() !== "") ? errors[k] : null);

  const togglePlatform = (p: PlatformId) =>
    set({ platforms: form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : PLATFORM_ORDER.filter((x) => x === p || form.platforms.includes(x)) });

  const insertVariable = (v: string) => {
    const el = messageRef.current;
    const start = el?.selectionStart ?? form.message.length;
    const end = el?.selectionEnd ?? form.message.length;
    set({ message: form.message.slice(0, start) + v + form.message.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + v.length, start + v.length);
    });
  };

  const save = async () => {
    setShowErrors(true);
    if (invalid) return;
    setSaving(true);
    try {
      if (editing) await api(`/api/discord/webhooks/${editing.id}`, { method: "PUT", json: toBody(form) });
      else await api("/api/discord/webhooks", { method: "POST", json: toBody(form) });
      await mutate();
      toast.success(editing ? "Webhook mis à jour" : "Webhook ajouté", {
        description: editing ? undefined : "Cliquez sur « Tester » pour vérifier qu'un message arrive bien dans le salon.",
      });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const shownPreviewPlatform = previewPlatform && form.platforms.includes(previewPlatform) ? previewPlatform : form.platforms[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={editing ? `Modifier « ${editing.name} »` : "Nouveau webhook Discord"}
      description="Les liens de vos publications seront envoyés dans ce salon dès qu'elles sont en ligne."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {editing ? "Enregistrer" : "Ajouter le webhook"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="dc-name" error={shown("name")}>
              <Input id="dc-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="#annonces" maxLength={80} invalid={!!shown("name")} data-autofocus />
            </Field>
            <Field label="Nom affiché dans Discord" htmlFor="dc-username" hint="Facultatif.">
              <Input id="dc-username" value={form.username} onChange={(e) => set({ username: e.target.value })} placeholder="VideoPosting" maxLength={80} />
            </Field>
          </div>

          <Field
            label="Adresse du webhook"
            htmlFor="dc-url"
            error={shown("url")}
            hint={editing ? `Actuelle : ${editing.urlHint}. Laissez vide pour la conserver.` : "Elle reste sur votre serveur : seule une version masquée est affichée ensuite."}
          >
            <Input
              id="dc-url"
              value={form.url}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://discord.com/api/webhooks/…"
              autoComplete="off"
              spellCheck={false}
              invalid={!!shown("url")}
            />
          </Field>
          {!editing && (
            <details className="group rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-fg marker:text-muted">Où trouver cette adresse ?</summary>
              <div className="mt-3">
                <HowTo />
              </div>
            </details>
          )}

          <Field label="Plateformes à annoncer" error={shown("platforms")}>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_ORDER.map((p) => {
                const on = form.platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                      on ? cn("bg-surface shadow-card", PLATFORMS[p].accentClass) : "border-border text-muted opacity-70 hover:opacity-100",
                    )}
                  >
                    <PlatformBadge platform={p} size={20} />
                    {PLATFORMS[p].name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Quand envoyer ?">
            <ChoiceCards
              value={form.timing}
              onChange={(timing) => set({ timing })}
              options={[
                { value: "each", title: "À chaque plateforme", description: "Un message dès que chaque lien est en ligne." },
                { value: "grouped", title: "Récapitulatif", description: "Un seul message quand tout est publié." },
              ]}
            />
          </Field>

          <Field label="Présentation">
            <ChoiceCards
              value={form.style}
              onChange={(style) => set({ style })}
              options={[
                { value: "links", title: "Liens", description: "Discord affiche lui-même l'aperçu de chaque lien." },
                { value: "card", title: "Carte", description: "Titre, description et un bouton par plateforme." },
              ]}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mentionner" htmlFor="dc-mention">
              <Select id="dc-mention" value={form.mention} onChange={(e) => set({ mention: e.target.value as DiscordMention })}>
                {(Object.keys(MENTION_LABELS) as DiscordMention[]).map((m) => (
                  <option key={m} value={m}>
                    {MENTION_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
            {form.mention === "role" && (
              <Field
                label="Identifiant du rôle"
                htmlFor="dc-role"
                error={shown("roleId")}
                hint="Paramètres Discord → Avancés → Mode développeur, puis clic droit sur le rôle → Copier l'identifiant."
              >
                <Input id="dc-role" inputMode="numeric" value={form.roleId} onChange={(e) => set({ roleId: e.target.value.replace(/\D/g, "") })} placeholder="123456789012345678" invalid={!!shown("roleId")} />
              </Field>
            )}
          </div>

          <Field
            label="Message"
            htmlFor="dc-message"
            counter={{ value: form.message.length, max: 1500 }}
            action={
              form.message !== DEFAULT_DISCORD_MESSAGE && (
                <button type="button" onClick={() => set({ message: DEFAULT_DISCORD_MESSAGE })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                  <RotateCcw className="size-3" /> Par défaut
                </button>
              )
            }
          >
            <Textarea id="dc-message" ref={messageRef} rows={3} value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder={DEFAULT_DISCORD_MESSAGE} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DISCORD_TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.label}
                  onClick={() => insertVariable(v.key)}
                  className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {v.key}
                </button>
              ))}
            </div>
          </Field>

          <Switch label="Annonces activées" description="Désactivez pour mettre ce salon en pause sans le supprimer." checked={form.enabled} onChange={(enabled) => set({ enabled })} />
        </div>

        <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Aperçu</span>
            {form.timing === "each" && form.platforms.length > 1 && (
              <Segmented
                size="sm"
                value={shownPreviewPlatform}
                onChange={setPreviewPlatform}
                options={form.platforms.map((p) => ({ value: p, label: PLATFORMS[p].name }))}
              />
            )}
          </div>
          {form.platforms.length ? (
            <DiscordPreview hook={form} platform={shownPreviewPlatform} />
          ) : (
            <div className="rounded-xl bg-[#313338] p-6 text-center text-sm text-[#949BA4]">Choisissez une plateforme pour voir l&apos;aperçu.</div>
          )}
          <p className="text-xs text-muted">
            {form.timing === "each"
              ? `Exemple du message envoyé quand la vidéo est en ligne sur ${PLATFORMS[shownPreviewPlatform ?? "tiktok"].name} : chaque plateforme a son propre message.`
              : "Un seul message, envoyé une fois toutes les plateformes terminées, avec les liens de celles qui ont réussi."}
            {form.style === "links" && " Les vignettes sont ajoutées par Discord."}
          </p>
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Carte des paramètres                                                */
/* ------------------------------------------------------------------ */

function LastResult({ result }: { result: PublicDiscordWebhook["lastResult"] }) {
  if (!result) return <span className="text-xs text-subtle">Aucun envoi pour l&apos;instant</span>;
  return result.ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <CheckCircle2 className="size-3.5" /> Dernier envoi réussi {formatRelative(result.at)}
    </span>
  ) : (
    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-danger">
      <AlertTriangle className="size-3.5 shrink-0" />
      <span className="truncate">
        {result.error ?? "Échec de l'envoi"} · {formatRelative(result.at)}
      </span>
    </span>
  );
}

function WebhookRow({ hook, onEdit }: { hook: PublicDiscordWebhook; onEdit: () => void }) {
  const { mutate } = useDiscordWebhooks();
  const [testing, setTesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      await api(`/api/discord/webhooks/${hook.id}/test`, { method: "POST" });
      toast.success(`Message de test envoyé dans « ${hook.name} »`);
    } catch (err) {
      toast.error("Envoi impossible", { description: (err as Error).message });
    } finally {
      setTesting(false);
      await mutate();
    }
  };
  const toggle = async (enabled: boolean) => {
    try {
      await api(`/api/discord/webhooks/${hook.id}`, { method: "PUT", json: toBody({ ...toForm(hook), enabled }) });
      await mutate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const remove = async () => {
    try {
      await api(`/api/discord/webhooks/${hook.id}`, { method: "DELETE" });
      await mutate();
      toast.success("Webhook supprimé");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const details = [TIMING_LABELS[hook.timing], STYLE_LABELS[hook.style], hook.mention !== "none" && (hook.mention === "role" ? "Mention d'un rôle" : MENTION_LABELS[hook.mention])].filter(Boolean);

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center", !hook.enabled && "bg-surface-2/40")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <DiscordBadge size={36} className={cn(!hook.enabled && "opacity-50 grayscale")} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{hook.name}</span>
            {!hook.enabled && <Badge>En pause</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              {hook.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} size={16} />
              ))}
            </span>
            {details.map((d) => (
              <Fragment key={d as string}>
                <span className="text-subtle">·</span>
                <span>{d}</span>
              </Fragment>
            ))}
          </div>
          <div className="truncate font-mono text-[11px] text-subtle">{hook.urlHint}</div>
          <LastResult result={hook.lastResult} />
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center">
        <Switch size="sm" checked={hook.enabled} onChange={toggle} />
        <Button size="sm" onClick={test} loading={testing}>
          {!testing && <Send className="size-3.5" />} Tester
        </Button>
        <Menu
          trigger={(props) => (
            <button {...props} className={buttonClass("ghost", "icon-sm")} aria-label={`Actions pour ${hook.name}`}>
              <MoreHorizontal className="size-4" />
            </button>
          )}
          items={[
            { label: "Modifier", icon: <Pencil />, onClick: onEdit },
            { label: "Supprimer", icon: <Trash2 />, danger: true, onClick: () => setConfirmDelete(true) },
          ]}
        />
      </div>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Supprimer ce webhook ?"
        description={`Les prochaines publications ne seront plus annoncées dans « ${hook.name} ». Le webhook reste présent dans Discord.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setConfirmDelete(false);
                await remove();
              }}
            >
              <Trash2 className="size-4" /> Supprimer
            </Button>
          </>
        }
      />
    </div>
  );
}

export function DiscordCard({ settings }: { settings: PublicSettings }) {
  const { data: hooks, error } = useDiscordWebhooks();
  const [dialog, setDialog] = useState<{ editing: PublicDiscordWebhook | null; key: number } | null>(null);
  const open = (editing: PublicDiscordWebhook | null) => setDialog({ editing, key: Date.now() });
  const sample = useMemo<DiscordWebhookSettings>(() => ({ ...emptyForm(), timing: "grouped", style: "card" }), []);

  return (
    <Card id="discord" className="scroll-mt-6">
      <CardHeader
        icon={<DiscordBadge size={36} />}
        title="Annonces Discord"
        description="Dès qu'une publication est en ligne, ses liens TikTok, YouTube et Instagram sont envoyés dans vos salons Discord."
        actions={
          hooks && hooks.length > 0 ? (
            <Button size="sm" variant="primary" onClick={() => open(null)}>
              <Plus className="size-4" /> Ajouter
            </Button>
          ) : null
        }
      />
      <div className="space-y-3 p-5">
        {settings.demoMode && hooks && hooks.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>Mode démo : les publications simulées ne sont pas annoncées (leurs liens n&apos;existent pas). Utilisez « Tester » pour vérifier un salon.</span>
          </div>
        )}
        {error ? (
          <p className="text-sm text-danger">{(error as Error).message}</p>
        ) : !hooks ? (
          <Skeleton className="h-20" />
        ) : hooks.length === 0 ? (
          <div className="grid gap-5 rounded-xl border border-dashed border-border-strong p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Ajoutez un webhook par salon (annonces, membres, VIP…) et choisissez pour chacun les plateformes à partager, le moment et le message.
              </p>
              <HowTo />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => open(null)}>
                  <Plus className="size-4" /> Ajouter un webhook
                </Button>
                <ExternalA href="https://support.discord.com/hc/fr/articles/228383668">Aide Discord sur les webhooks</ExternalA>
              </div>
            </div>
            <div className="hidden md:block">
              <DiscordPreview hook={sample} />
            </div>
          </div>
        ) : (
          hooks.map((h) => <WebhookRow key={h.id} hook={h} onEdit={() => open(h)} />)
        )}
        {hooks && hooks.length > 0 && (
          <p className="text-xs text-muted">
            Chaque publication peut aussi choisir ses salons dans le composer (carte « Annonce Discord »). En cas d&apos;échec, l&apos;erreur apparaît dans le journal de la publication, qui reste publiée.
          </p>
        )}
      </div>
      {dialog && <WebhookDialog key={dialog.key} open onClose={() => setDialog(null)} editing={dialog.editing} />}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Composer : choix des salons pour une publication                    */
/* ------------------------------------------------------------------ */

export function ComposerDiscordCard({
  value,
  onChange,
  platforms,
  demoMode,
  readOnly,
}: {
  value: string[] | null | undefined;
  onChange: (ids: string[]) => void;
  platforms: PlatformId[];
  demoMode: boolean;
  readOnly?: boolean;
}) {
  const { data: hooks } = useDiscordWebhooks();
  if (!hooks?.length) return null;
  const enabled = hooks.filter((h) => h.enabled);
  // null : tous les webhooks actifs (y compris ceux ajoutés plus tard).
  const selected = value ?? enabled.map((h) => h.id);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const count = enabled.filter((h) => selected.includes(h.id) && h.platforms.some((p) => platforms.includes(p))).length;

  return (
    <Card>
      <CardHeader
        icon={<DiscordBadge size={36} />}
        title="Annonce Discord"
        description={count ? `Les liens seront envoyés dans ${count} salon${count > 1 ? "s" : ""} dès leur mise en ligne.` : "Aucun salon ne sera prévenu pour cette publication."}
      />
      <div className="space-y-2 p-5">
        {hooks.map((h) => {
          const concerned = h.platforms.filter((p) => platforms.includes(p));
          const on = h.enabled && selected.includes(h.id);
          return (
            <label
              key={h.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                on && concerned.length ? "border-accent/40 bg-accent-soft/40" : "border-border",
                (!h.enabled || readOnly) && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={!h.enabled || readOnly}
                onChange={() => toggle(h.id)}
                className="size-4 shrink-0 cursor-pointer rounded accent-[var(--accent)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{h.name}</span>
                <span className="block text-xs text-muted">
                  {!h.enabled
                    ? "En pause (Paramètres)"
                    : concerned.length
                      ? `${concerned.map((p) => `${PLATFORM_EMOJI[p]} ${PLATFORMS[p].name}`).join("  ")} · ${TIMING_LABELS[h.timing].toLowerCase()}`
                      : "Aucune des plateformes choisies"}
                </span>
              </span>
            </label>
          );
        })}
        {demoMode && <p className="pt-1 text-xs text-muted">Mode démo : aucune annonce n&apos;est envoyée pour les publications simulées.</p>}
      </div>
    </Card>
  );
}
