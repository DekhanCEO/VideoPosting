"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, Save, Scale } from "lucide-react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { DATA_DELETION_ANCHOR, LEGAL_PAGES, legalInfo, legalUrl, type LegalInfo } from "@/lib/legal";
import type { PublicSettings } from "@/lib/types";
import { PlatformBadge } from "./icons";
import { Button, Card, CardHeader, CopyField, ExternalA, Field, Input } from "./ui";

/** Où coller les adresses dans chaque console développeur. */
function WhereToPaste({ home }: { home: string }) {
  const rows = [
    {
      platform: "tiktok" as const,
      text: (
        <>
          <ExternalA href="https://developers.tiktok.com/apps">TikTok for Developers</ExternalA> → votre application → <b>App details</b> :{" "}
          <i>Terms of Service URL</i> et <i>Privacy Policy URL</i>.
        </>
      ),
    },
    {
      platform: "instagram" as const,
      text: (
        <>
          <ExternalA href="https://developers.facebook.com/apps">Meta for Developers</ExternalA> → votre app → <b>Paramètres de l&apos;app → Général</b> :
          URL de la politique de confidentialité, URL des conditions de service et, dans « Suppression des données », l&apos;URL des instructions.
        </>
      ),
    },
    {
      platform: "youtube" as const,
      text: (
        <>
          <ExternalA href="https://console.cloud.google.com/auth/branding">Google Cloud</ExternalA> → <b>Écran de consentement OAuth (Branding)</b> : page
          d&apos;accueil de l&apos;application (<code className="rounded bg-surface-2 px-1 text-[11px]">{home}</code>), lien vers les règles de confidentialité
          et lien vers les conditions d&apos;utilisation.
        </>
      ),
    },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.platform} className="flex items-start gap-3 text-sm">
          <PlatformBadge platform={r.platform} size={22} className="mt-0.5" />
          <p className="min-w-0 text-muted [&_b]:text-fg">{r.text}</p>
        </div>
      ))}
      <p className="text-xs text-subtle">Twitch et Discord ne demandent pas ces pages.</p>
    </div>
  );
}

export function LegalCard({ settings }: { settings: PublicSettings }) {
  const saved = legalInfo(settings.legal);
  const [form, setForm] = useState<LegalInfo>(saved);
  const [saving, setSaving] = useState(false);
  const canEdit = settings.canManageApps !== false;
  const slash = settings.hosting === "php";
  const terms = legalUrl(settings.publicUrl, LEGAL_PAGES.terms.path, slash);
  const privacy = legalUrl(settings.publicUrl, LEGAL_PAGES.privacy.path, slash);
  const deletion = legalUrl(settings.publicUrl, LEGAL_PAGES.privacy.path, slash, DATA_DELETION_ANCHOR);
  const home = `${settings.publicUrl.replace(/\/+$/, "")}/`;
  const dirty = JSON.stringify(legalInfo(form)) !== JSON.stringify(saved);
  const emailInvalid = form.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const save = async () => {
    setSaving(true);
    try {
      const next = await api<PublicSettings>("/api/settings", { method: "PUT", json: { legal: form } });
      await globalMutate("/api/settings", next, { revalidate: false });
      await globalMutate("/api/legal");
      toast.success("Pages légales mises à jour");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="legal" className="scroll-mt-6">
      <CardHeader
        icon={<Scale className="size-4" />}
        title="Pages légales"
        description="Conditions d'utilisation et politique de confidentialité publiques, en français, demandées par TikTok, Meta et Google pour valider vos applications."
      />
      <div className="space-y-5 p-5">
        {canEdit && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nom du service" htmlFor="legal-service" hint="Idéalement le nom de vos applications développeur.">
                <Input id="legal-service" value={form.serviceName} onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))} placeholder="VideoPosting" maxLength={80} />
              </Field>
              <Field label="Éditeur" htmlFor="legal-editor" hint="Votre nom ou celui de votre société.">
                <Input id="legal-editor" value={form.editor} onChange={(e) => setForm((f) => ({ ...f, editor: e.target.value }))} placeholder="Prénom Nom" maxLength={160} />
              </Field>
              <Field label="E-mail de contact" htmlFor="legal-email" error={emailInvalid ? "Adresse e-mail invalide." : undefined} hint="Questions et demandes de suppression.">
                <Input
                  id="legal-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contact@exemple.fr"
                  maxLength={160}
                  invalid={emailInvalid}
                />
              </Field>
            </div>
            {!saved.email && (
              <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs text-warning">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Ajoutez un e-mail de contact : les plateformes vérifient que vos pages indiquent comment vous joindre et comment demander la suppression
                de ses données.
              </p>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={save} loading={saving} disabled={!dirty || emailInvalid}>
                <Save className="size-4" /> Enregistrer
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {[
            { label: "Conditions d'utilisation", url: terms },
            { label: "Politique de confidentialité", url: privacy },
            { label: "Instructions de suppression des données (Meta)", url: deletion },
          ].map((row) => (
            <Field
              key={row.label}
              label={row.label}
              action={
                <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Voir <ExternalLink className="size-3" />
                </a>
              }
            >
              <CopyField value={row.url} />
            </Field>
          ))}
          {!settings.publicUrlIsReachable && (
            <p className="text-xs text-warning">Ces adresses doivent être publiques et en HTTPS pour être acceptées par les plateformes.</p>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">Où les indiquer</p>
          <WhereToPaste home={home} />
        </div>
      </div>
    </Card>
  );
}
