"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ExternalLink, ImagePlus, Info, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { buildCaption, buildYoutubeDescription, countHashtags, countMentions, formatHashtags } from "@/lib/captions";
import {
  LIMITS,
  TIKTOK_PRIVACY_LABELS,
  YOUTUBE_CATEGORIES,
  YOUTUBE_LANGUAGES,
  YOUTUBE_PRIVACY_LABELS,
  isYoutubeShort,
} from "@/lib/platforms";
import type {
  CommonContent,
  InstagramOptions,
  MediaAsset,
  PublicAccount,
  PublicSettings,
  TiktokCreatorInfo,
  TiktokOptions,
  TiktokPrivacy,
  YoutubeOptions,
} from "@/lib/types";
import type { Issue } from "@/lib/validation";
import { captureFrame, mediaUrl, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button, Checkbox, Field, Input, Segmented, Select, Switch } from "../ui";
import { CoverPicker } from "./cover-picker";
import { ChipsInput, HashtagCount, Section, SyncBadge, SyncedTextField } from "./fields";

function fieldError(issues: Issue[], field: string) {
  return issues.find((i) => i.field === field && i.level === "error")?.message;
}

function Divider() {
  return <div className="h-px bg-border" />;
}

function Notice({ tone = "info", children }: { tone?: "info" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-xl px-3 py-2.5 text-xs leading-relaxed",
        tone === "info" ? "bg-sky-500/8 text-sky-700 dark:text-sky-300" : "bg-warning/10 text-warning",
      )}
    >
      {tone === "info" ? <Info className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* YouTube                                                             */
/* ------------------------------------------------------------------ */

function ThumbnailPicker({
  media,
  thumbnailId,
  onChange,
}: {
  media: MediaAsset | null | undefined;
  thumbnailId?: string;
  onChange: (id: string | undefined) => void;
}) {
  const [mode, setMode] = useState<"auto" | "frame" | "upload">(thumbnailId ? "upload" : "auto");
  const [frameMs, setFrameMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const useFrame = async () => {
    if (!media) return;
    setBusy(true);
    try {
      const blob = await captureFrame(mediaUrl(media.id), frameMs / 1000, 1280, 0.9);
      const asset = await uploadFile(blob, { fileName: "miniature.jpg", mimeType: "image/jpeg" });
      onChange(asset.id);
      setMode("upload");
      toast.success("Miniature enregistrée");
    } catch (err) {
      toast.error("Capture impossible", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast.error("Utilisez une image JPG ou PNG.");
    if (file.size > 2 * 1024 * 1024) return toast.error("YouTube limite les miniatures à 2 Mo.");
    setBusy(true);
    try {
      const asset = await uploadFile(file, { fileName: file.name, mimeType: file.type });
      onChange(asset.id);
    } catch (err) {
      toast.error("Envoi impossible", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (thumbnailId) {
    return (
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(thumbnailId)} alt="Miniature" className="aspect-video w-40 rounded-xl border border-border object-cover" />
        <div className="space-y-2">
          <Badge tone="success">Miniature personnalisée</Badge>
          <div>
            <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
              <Trash2 className="size-4" /> Retirer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Segmented
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: "auto", label: "Automatique" },
          { value: "frame", label: "Image de la vidéo" },
          { value: "upload", label: "Importer" },
        ]}
      />
      {mode === "auto" && <p className="text-xs text-muted">YouTube choisira une image parmi trois propositions.</p>}
      {mode === "frame" &&
        (media?.status === "ready" ? (
          <div className="space-y-3">
            <CoverPicker src={mediaUrl(media.id)} duration={media.duration ?? 1} valueMs={frameMs} onChange={setFrameMs} aspect="16/9" />
            <Button size="sm" variant="soft" onClick={useFrame} loading={busy}>
              <Wand2 className="size-4" /> Utiliser cette image
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted">Disponible une fois la vidéo envoyée.</p>
        ))}
      {mode === "upload" && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong py-5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Choisir une image (1280×720, JPG/PNG, 2 Mo max)
          </button>
        </>
      )}
    </div>
  );
}

export function YoutubePanel({
  common,
  value,
  onChange,
  media,
  issues,
}: {
  common: CommonContent;
  value: YoutubeOptions;
  onChange: (patch: Partial<YoutubeOptions>) => void;
  media: MediaAsset | null | undefined;
  issues: Issue[];
}) {
  const title = value.sync.title ? common.title : value.title;
  const description = value.sync.description ? buildYoutubeDescription(common) : value.description;
  const tags = value.sync.tags ? common.hashtags : value.tags;
  const short = isYoutubeShort(media ?? undefined);

  return (
    <div className="space-y-6">
      {media?.status === "ready" && (
        <Notice>
          {short ? (
            <>
              Vidéo verticale de moins de 3 minutes : elle sera publiée en <strong>Short</strong>.
            </>
          ) : (
            <>
              Elle sera publiée en <strong>vidéo YouTube classique</strong>
              {(media.height ?? 0) >= (media.width ?? 0) ? " (plus de 3 minutes)." : " (format horizontal)."}
            </>
          )}
        </Notice>
      )}

      <Section title="Détails">
        <SyncedTextField
          label="Titre"
          value={title}
          synced={value.sync.title}
          onChange={(v) => onChange({ title: v, sync: { ...value.sync, title: false } })}
          onResync={() => onChange({ sync: { ...value.sync, title: true } })}
          max={LIMITS.youtube.titleMax}
          placeholder="Un titre accrocheur (obligatoire)"
          error={fieldError(issues, "title")}
        />
        <SyncedTextField
          label="Description"
          value={description}
          synced={value.sync.description}
          onChange={(v) => onChange({ description: v, sync: { ...value.sync, description: false } })}
          onResync={() => onChange({ sync: { ...value.sync, description: true } })}
          max={LIMITS.youtube.descriptionMax}
          length={new TextEncoder().encode(description).length}
          multiline
          rows={6}
          placeholder="Présentez votre vidéo, ajoutez des liens, des chapitres (00:00 Intro)…"
          error={fieldError(issues, "description")}
        />
        <Field label="Tags" action={<SyncBadge synced={value.sync.tags} onResync={() => onChange({ sync: { ...value.sync, tags: true } })} />} error={fieldError(issues, "tags")} hint="Mots-clés pour aider YouTube à comprendre votre vidéo (500 caractères max).">
          <ChipsInput
            value={tags}
            prefix=""
            normalize={(t) => t.trim().replace(/^#/, "").slice(0, 100)}
            splitter={(raw) => raw.split(/[,;\n]+/)}
            onChange={(v) => onChange({ tags: v, sync: { ...value.sync, tags: false } })}
            placeholder="Ajoutez des tags, séparés par des virgules"
          />
        </Field>
      </Section>

      <Divider />
      <Section title="Miniature" description="La première chose que les spectateurs verront.">
        <ThumbnailPicker media={media} thumbnailId={value.thumbnailId} onChange={(id) => onChange({ thumbnailId: id })} />
      </Section>

      <Divider />
      <Section title="Visibilité">
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(YOUTUBE_PRIVACY_LABELS) as YoutubeOptions["privacy"][]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ privacy: p })}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                value.privacy === p ? "border-accent bg-accent-soft ring-2 ring-[var(--ring)]" : "border-border hover:border-border-strong",
              )}
            >
              <span className="block text-sm font-medium">{YOUTUBE_PRIVACY_LABELS[p].label}</span>
              <span className="mt-0.5 block text-xs text-muted">{YOUTUBE_PRIVACY_LABELS[p].hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Divider />
      <Section title="Audience" description="Obligation légale (COPPA) : indiquez si la vidéo s'adresse aux enfants.">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { v: false, label: "Non, elle n'est pas conçue pour les enfants" },
            { v: true, label: "Oui, elle est conçue pour les enfants" },
          ].map((o) => (
            <label
              key={String(o.v)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors",
                value.madeForKids === o.v ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong",
              )}
            >
              <input type="radio" checked={value.madeForKids === o.v} onChange={() => onChange({ madeForKids: o.v })} className="accent-[var(--accent)]" />
              {o.label}
            </label>
          ))}
        </div>
      </Section>

      <Divider />
      <Section title="Paramètres">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie">
            <Select value={value.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
              {YOUTUBE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Langue de la vidéo">
            <Select value={value.defaultLanguage} onChange={(e) => onChange({ defaultLanguage: e.target.value })}>
              {YOUTUBE_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="space-y-4 rounded-xl border border-border p-4">
          <Switch label="Notifier les abonnés" description="Envoie une notification et l'affiche dans leur fil." checked={value.notifySubscribers} onChange={(v) => onChange({ notifySubscribers: v })} />
          <Switch label="Autoriser l'intégration" description="Permet d'intégrer la vidéo sur d'autres sites." checked={value.embeddable} onChange={(v) => onChange({ embeddable: v })} />
          <Switch
            label="Contenu modifié ou synthétique"
            description="À activer si la vidéo contient du contenu réaliste généré ou modifié par IA."
            checked={value.containsSyntheticMedia}
            onChange={(v) => onChange({ containsSyntheticMedia: v })}
          />
          <Switch
            label="Licence Creative Commons"
            description="Autorise la réutilisation avec attribution (sinon licence YouTube standard)."
            checked={value.license === "creativeCommon"}
            onChange={(v) => onChange({ license: v ? "creativeCommon" : "youtube" })}
          />
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TikTok                                                              */
/* ------------------------------------------------------------------ */

export function TiktokPanel({
  common,
  value,
  onChange,
  media,
  creator,
  creatorError,
  account,
  issues,
}: {
  common: CommonContent;
  value: TiktokOptions;
  onChange: (patch: Partial<TiktokOptions>) => void;
  media: MediaAsset | null | undefined;
  creator: TiktokCreatorInfo | null | undefined;
  creatorError?: string;
  account?: PublicAccount;
  issues: Issue[];
}) {
  const caption = value.sync.caption ? buildCaption(common) : value.caption;
  const direct = value.mode === "direct";
  const options: TiktokPrivacy[] = creator?.privacyLevelOptions ?? [];

  return (
    <div className="space-y-6">
      {account && (
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <Avatar src={creator?.creatorAvatarUrl ?? account.avatarUrl} name={creator?.creatorNickname ?? account.name} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{creator?.creatorNickname ?? account.name}</p>
            <p className="truncate text-xs text-muted">@{creator?.creatorUsername ?? account.username ?? "compte TikTok"}</p>
          </div>
          {creator && <Badge tone="neutral">Max {Math.round(creator.maxVideoPostDurationSec / 60)} min</Badge>}
        </div>
      )}
      {creatorError && <Notice tone="warning">Impossible de récupérer les informations du compte TikTok : {creatorError}</Notice>}

      <Section title="Mode de publication">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { v: "direct" as const, label: "Publier directement", hint: "La vidéo est mise en ligne sur votre profil." },
            { v: "inbox" as const, label: "Envoyer en brouillon", hint: "Finalisez dans l'app TikTok (sons, effets…)." },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange({ mode: o.v })}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                value.mode === o.v ? "border-accent bg-accent-soft ring-2 ring-[var(--ring)]" : "border-border hover:border-border-strong",
              )}
            >
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      {direct ? (
        <>
          <SyncedTextField
            label="Légende"
            value={caption}
            synced={value.sync.caption}
            onChange={(v) => onChange({ caption: v, sync: { caption: false } })}
            onResync={() => onChange({ sync: { caption: true } })}
            max={LIMITS.tiktok.captionMax}
            length={caption.length}
            multiline
            rows={5}
            placeholder="Décrivez votre vidéo, ajoutez des #hashtags et @mentions"
            error={fieldError(issues, "caption")}
            footer={<HashtagCount count={countHashtags(caption)} />}
          />

          <Divider />
          <Section title="Qui peut voir cette vidéo ?">
            <Field error={fieldError(issues, "privacyLevel")}>
              <Select value={value.privacyLevel} onChange={(e) => onChange({ privacyLevel: e.target.value as TiktokPrivacy })}>
                <option value="" disabled>
                  Choisir la visibilité…
                </option>
                {(options.length ? options : (Object.keys(TIKTOK_PRIVACY_LABELS) as TiktokPrivacy[])).map((o) => (
                  <option key={o} value={o} disabled={o === "SELF_ONLY" && value.commercialContent && value.brandedContent}>
                    {TIKTOK_PRIVACY_LABELS[o]}
                    {o === "SELF_ONLY" && value.commercialContent && value.brandedContent ? " (indisponible pour un contenu de marque)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-3">
              <p className="text-sm font-medium">Autoriser les utilisateurs à</p>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <Checkbox
                  label="Commenter"
                  checked={value.allowComments && !creator?.commentDisabled}
                  disabled={creator?.commentDisabled}
                  onChange={(v) => onChange({ allowComments: v })}
                  description={creator?.commentDisabled ? "Désactivé dans vos réglages TikTok" : undefined}
                />
                <Checkbox
                  label="Duo"
                  checked={value.allowDuet && !creator?.duetDisabled}
                  disabled={creator?.duetDisabled}
                  onChange={(v) => onChange({ allowDuet: v })}
                  description={creator?.duetDisabled ? "Désactivé dans vos réglages TikTok" : undefined}
                />
                <Checkbox
                  label="Collage (Stitch)"
                  checked={value.allowStitch && !creator?.stitchDisabled}
                  disabled={creator?.stitchDisabled}
                  onChange={(v) => onChange({ allowStitch: v })}
                  description={creator?.stitchDisabled ? "Désactivé dans vos réglages TikTok" : undefined}
                />
              </div>
            </div>
          </Section>

          {media?.status === "ready" && (
            <>
              <Divider />
              <Section title="Couverture">
                <CoverPicker src={mediaUrl(media.id)} duration={media.duration ?? 1} valueMs={value.coverTimestampMs} onChange={(ms) => onChange({ coverTimestampMs: ms })} />
              </Section>
            </>
          )}

          <Divider />
          <Section title="Divulgation">
            <Switch
              label="Divulguer le contenu commercial"
              description="Indiquez si cette vidéo fait la promotion de vous-même, d'une marque, d'un produit ou d'un service."
              checked={value.commercialContent}
              onChange={(v) => onChange({ commercialContent: v, ...(v ? {} : { yourBrand: false, brandedContent: false }) })}
            />
            {value.commercialContent && (
              <div className="ml-1 space-y-3 border-l-2 border-accent/30 pl-4">
                <Checkbox
                  label="Votre marque"
                  description="Vous faites la promotion de vous-même ou de votre propre entreprise. Étiquette « Contenu promotionnel »."
                  checked={value.yourBrand}
                  onChange={(v) => onChange({ yourBrand: v })}
                />
                <Checkbox
                  label="Contenu de marque"
                  description="Vous faites la promotion d'une autre marque ou d'un tiers. Étiquette « Partenariat rémunéré »."
                  checked={value.brandedContent}
                  onChange={(v) => onChange({ brandedContent: v, ...(v && value.privacyLevel === "SELF_ONLY" ? { privacyLevel: "" } : {}) })}
                />
                {fieldError(issues, "commercial") && <p className="text-xs text-danger">{fieldError(issues, "commercial")}</p>}
              </div>
            )}
            <Switch
              label="Contenu généré par IA"
              description="Ajoute l'étiquette « Généré par IA » à la vidéo."
              checked={value.isAigc}
              onChange={(v) => onChange({ isAigc: v })}
            />
          </Section>
          <Notice>
            Après la publication, le traitement peut prendre quelques minutes avant que la vidéo n&apos;apparaisse sur votre profil.
          </Notice>
        </>
      ) : (
        <Notice>
          La vidéo sera envoyée dans votre boîte de réception TikTok. Ouvrez l&apos;application pour ajouter la légende, les sons et la
          publier. Légende et confidentialité se règlent alors dans TikTok.
        </Notice>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instagram                                                           */
/* ------------------------------------------------------------------ */

export function InstagramPanel({
  common,
  value,
  onChange,
  media,
  settings,
  account,
  issues,
}: {
  common: CommonContent;
  value: InstagramOptions;
  onChange: (patch: Partial<InstagramOptions>) => void;
  media: MediaAsset | null | undefined;
  settings?: PublicSettings;
  account?: PublicAccount;
  issues: Issue[];
}) {
  const caption = value.sync.caption ? buildCaption(common) : value.caption;
  const [advanced, setAdvanced] = useState(false);
  const needsPublicUrl =
    !account?.demo && (account?.meta?.loginType ?? settings?.credentials.instagram.loginType) === "instagram" && settings && !settings.publicUrlIsReachable;

  return (
    <div className="space-y-6">
      {needsPublicUrl && (
        <Notice tone="warning">
          Avec la connexion Instagram, Instagram télécharge la vidéo depuis votre serveur : l&apos;application doit être accessible en HTTPS
          (variable <code>PUBLIC_URL</code>). Sinon, utilisez la connexion via Facebook dans les paramètres.
        </Notice>
      )}
      <SyncedTextField
        label="Légende"
        value={caption}
        synced={value.sync.caption}
        onChange={(v) => onChange({ caption: v, sync: { caption: false } })}
        onResync={() => onChange({ sync: { caption: true } })}
        max={LIMITS.instagram.captionMax}
        multiline
        rows={5}
        placeholder="Écrivez une légende…"
        error={fieldError(issues, "caption")}
        footer={
          <div className="flex gap-4">
            <HashtagCount count={countHashtags(caption)} max={LIMITS.instagram.maxHashtags} />
            <span className={cn("text-xs text-subtle", countMentions(caption) > LIMITS.instagram.maxMentions && "font-semibold text-danger")}>
              @ {countMentions(caption)} / {LIMITS.instagram.maxMentions} mentions
            </span>
          </div>
        }
      />

      <Divider />
      <Section title="Diffusion">
        <Switch
          label="Partager aussi dans le fil"
          description="Le Reel apparaît dans la grille de votre profil et dans le fil de vos abonnés."
          checked={value.shareToFeed}
          onChange={(v) => onChange({ shareToFeed: v })}
        />
        <Field label="Collaborateurs" hint="Jusqu'à 3 comptes publics invités à co-signer le Reel." error={fieldError(issues, "collaborators")}>
          <ChipsInput
            value={value.collaborators}
            onChange={(v) => onChange({ collaborators: v })}
            prefix="@"
            max={LIMITS.instagram.maxCollaborators}
            normalize={(t) => t.trim().replace(/^@/, "").replace(/[^\w.]/g, "").slice(0, 30)}
            splitter={(raw) => raw.split(/[\s,;]+/)}
            placeholder="nom_utilisateur"
          />
        </Field>
      </Section>

      {media?.status === "ready" && (
        <>
          <Divider />
          <Section title="Couverture" description="Image affichée dans la grille et dans l'onglet Reels.">
            <CoverPicker src={mediaUrl(media.id)} duration={media.duration ?? 1} valueMs={value.thumbOffsetMs} onChange={(ms) => onChange({ thumbOffsetMs: ms })} />
          </Section>
        </>
      )}

      <Divider />
      <button type="button" onClick={() => setAdvanced((a) => !a)} className="text-sm font-medium text-accent hover:underline">
        {advanced ? "Masquer" : "Afficher"} les options avancées
      </button>
      {advanced && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'audio" hint="Renomme l'audio original (impossible si la vidéo utilise une musique sous licence).">
            <Input value={value.audioName} onChange={(e) => onChange({ audioName: e.target.value })} placeholder="Audio original" />
          </Field>
          <Field
            label="Identifiant de lieu"
            hint={
              <>
                ID d&apos;une Page Facebook avec adresse.{" "}
                <a className="inline-flex items-center gap-0.5 text-accent" href="https://developers.facebook.com/docs/instagram-platform/content-publishing" target="_blank" rel="noreferrer">
                  En savoir plus <ExternalLink className="size-3" />
                </a>
              </>
            }
          >
            <Input value={value.locationId} onChange={(e) => onChange({ locationId: e.target.value.replace(/\D/g, "") })} placeholder="Ex. 110774245616525" />
          </Field>
        </div>
      )}
    </div>
  );
}

export function CaptionSourceHint() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <Sparkles className="size-3.5 text-accent" />
      Les champs « synchronisés » sont générés à partir du contenu commun : titre, description puis {formatHashtags(["hashtags"])}.
    </p>
  );
}
