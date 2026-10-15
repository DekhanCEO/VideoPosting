"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Globe2, MapPin, PencilLine, Plus, Trash2, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatDate, formatPercent } from "@/lib/format";
import { averageAge, combineAudiences, countryFlag, countryName, dominantAge } from "@/lib/influence";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import { AGE_BUCKETS, type AgeBucket, type AnalyticsSummary, type AudienceDemographics, type PlatformId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShareBar, ShareList } from "./charts";
import { PlatformBadge } from "./icons";
import { Badge, Button, Card, Dialog, EmptyState, Input, Segmented, Select } from "./ui";

type Filter = "all" | PlatformId;

const GENDER = [
  { key: "female", label: "Femmes", color: "var(--cat-5)" },
  { key: "male", label: "Hommes", color: "var(--cat-1)" },
  { key: "other", label: "Autres / non précisé", color: "var(--axis)" },
] as const;

const AGE_LABEL: Record<AgeBucket, string> = {
  "13-17": "13–17 ans",
  "18-24": "18–24 ans",
  "25-34": "25–34 ans",
  "35-44": "35–44 ans",
  "45-54": "45–54 ans",
  "55-64": "55–64 ans",
  "65+": "65 ans et +",
};

/** Pays proposés dans la saisie manuelle (francophonie et principaux marchés). */
const COUNTRY_CODES = [
  "FR", "BE", "CH", "CA", "LU", "MC", "MA", "DZ", "TN", "SN", "CI", "CM", "ML", "BF", "NE", "TG", "BJ", "GN", "CD", "CG", "GA", "MG", "MU", "RE",
  "HT", "US", "GB", "IE", "DE", "ES", "PT", "IT", "NL", "AT", "PL", "RO", "SE", "NO", "DK", "FI", "GR", "TR", "EG", "SA", "AE", "QA", "IL", "LB",
  "IN", "PK", "ID", "PH", "VN", "TH", "JP", "KR", "CN", "AU", "NZ", "BR", "MX", "AR", "CO", "CL", "PE", "ZA", "NG", "KE", "GH",
];

const pct0 = (n: number | null | undefined) => formatPercent(n, 0);

const SOURCE_LABEL: Record<PlatformId, string> = {
  youtube: "YouTube Analytics",
  instagram: "Instagram Insights",
  tiktok: "TikTok",
};

function sourceText(a: AudienceDemographics): string {
  if (a.source === "demo") return "Données de démonstration";
  if (a.source === "manual") return `Saisie manuelle · ${formatDate(a.updatedAt)}`;
  return `${SOURCE_LABEL[a.platform]} · ${a.basis === "viewers" ? "spectateurs des 90 derniers jours" : "abonnés"} · ${formatDate(a.updatedAt)}`;
}

function Tile({ label, icon, children, hint, className }: { label: string; icon: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-muted [&>svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2">{children}</div>
      {hint && <div className="mt-auto pt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Saisie manuelle (TikTok Studio, ou toute plateforme sans API)       */
/* ------------------------------------------------------------------ */

function AudienceEditor({
  platform,
  current,
  open,
  onClose,
  onSaved,
}: {
  platform: PlatformId;
  current?: AudienceDemographics;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const manual = current?.source === "manual" ? current : undefined;
  const toPct = (v?: number) => (v ? String(Math.round(v * 1000) / 10) : "");
  const [gender, setGender] = useState({ female: toPct(manual?.gender?.female), male: toPct(manual?.gender?.male), other: toPct(manual?.gender?.other) });
  const [ages, setAges] = useState<Record<AgeBucket, string>>(
    () => Object.fromEntries(AGE_BUCKETS.map((b) => [b, toPct(manual?.ages?.[b])])) as Record<AgeBucket, string>,
  );
  const [countries, setCountries] = useState<{ code: string; share: string }[]>(
    manual?.countries?.length ? manual.countries.map((c) => ({ code: c.code, share: toPct(c.share) })) : [{ code: "FR", share: "" }],
  );
  const [saving, setSaving] = useState(false);
  const num = (s: string) => {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };
  const genderSum = num(gender.female) + num(gender.male) + num(gender.other);
  const agesSum = AGE_BUCKETS.reduce((n, b) => n + num(ages[b]), 0);
  const countryOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ code: c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [],
  );

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/analytics/audience/${platform}`, {
        method: "PUT",
        json: {
          gender: genderSum > 0 ? { female: num(gender.female), male: num(gender.male), other: num(gender.other) } : undefined,
          ages: agesSum > 0 ? Object.fromEntries(AGE_BUCKETS.map((b) => [b, num(ages[b])])) : undefined,
          countries: countries.filter((c) => num(c.share) > 0).map((c) => ({ code: c.code, share: num(c.share) })),
        },
      });
      toast.success(`Audience ${PLATFORMS[platform].name} enregistrée`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer l'audience saisie ?")) return;
    await api(`/api/analytics/audience/${platform}`, { method: "DELETE" });
    toast.success("Audience supprimée");
    onSaved();
    onClose();
  };

  const sumHint = (sum: number) => (
    <span className={cn("tabular-nums", sum > 0 && Math.abs(sum - 100) > 1 ? "text-warning" : "text-muted")}>
      Total {sum.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %{sum > 0 && Math.abs(sum - 100) > 1 ? " · sera ramené à 100 %" : ""}
    </span>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Audience ${PLATFORMS[platform].name}`}
      description={
        platform === "tiktok"
          ? "TikTok ne transmet pas ces chiffres aux applications. Recopiez-les depuis TikTok Studio → Analyses → Abonnés."
          : "Saisissez les pourcentages affichés dans les statistiques de la plateforme."
      }
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          {manual && (
            <Button variant="ghost" onClick={remove}>
              <Trash2 className="size-4" /> Supprimer
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Enregistrer
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Genre</h4>
            {sumHint(genderSum)}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {GENDER.map((g) => (
              <label key={g.key} className="block text-xs text-muted">
                <span className="mb-1 flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} /> {g.label}
                </span>
                <PercentInput value={gender[g.key]} onChange={(v) => setGender((s) => ({ ...s, [g.key]: v }))} />
              </label>
            ))}
          </div>
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Âge</h4>
            {sumHint(agesSum)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AGE_BUCKETS.map((b) => (
              <label key={b} className="block text-xs text-muted">
                <span className="mb-1 block">{AGE_LABEL[b]}</span>
                <PercentInput value={ages[b]} onChange={(v) => setAges((s) => ({ ...s, [b]: v }))} />
              </label>
            ))}
          </div>
        </section>
        <section>
          <h4 className="mb-2 text-sm font-semibold">Principaux pays</h4>
          <div className="space-y-2">
            {countries.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={c.code} onChange={(e) => setCountries((list) => list.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))} className="flex-1">
                  {countryOptions.map((o) => (
                    <option key={o.code} value={o.code}>
                      {countryFlag(o.code)} {o.name}
                    </option>
                  ))}
                </Select>
                <div className="w-28">
                  <PercentInput value={c.share} onChange={(v) => setCountries((list) => list.map((x, j) => (j === i ? { ...x, share: v } : x)))} />
                </div>
                <Button size="icon" variant="ghost" aria-label="Retirer" onClick={() => setCountries((list) => list.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            {countries.length < 15 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCountries((list) => [...list, { code: countryOptions.find((o) => !list.some((x) => x.code === o.code))?.code ?? "BE", share: "" }])}
              >
                <Plus className="size-4" /> Ajouter un pays
              </Button>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}

function Missing({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted">
      <p>Non renseigné pour cette plateforme.</p>
      {onComplete && (
        <Button size="sm" onClick={onComplete}>
          <PencilLine className="size-4" /> Compléter
        </Button>
      )}
    </div>
  );
}

function PercentInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0" className="pr-8 tabular-nums" />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-subtle">%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue                                                                 */
/* ------------------------------------------------------------------ */

export function AudienceView({ data, onChanged }: { data: AnalyticsSummary; onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<PlatformId | null>(null);
  const audiences = data.audience ?? {};
  const followers = Object.fromEntries(data.platforms.map((p) => [p.platform, p.followers ?? 0])) as Record<PlatformId, number>;
  const available = PLATFORM_ORDER.filter((p) => audiences[p]);

  const combined = useMemo(
    () => combineAudiences(available.map((p) => ({ audience: audiences[p]!, weight: Math.max(1, followers[p]) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const selected: AudienceDemographics | null = filter === "all" ? null : (audiences[filter] ?? null);
  const view =
    filter === "all"
      ? combined && { gender: combined.gender, ages: combined.ages, countries: combined.countries, cities: undefined as AudienceDemographics["cities"] }
      : selected && { gender: selected.gender, ages: selected.ages, countries: selected.countries, cities: selected.cities };
  const color = filter === "all" ? "var(--accent)" : `var(--series-${filter})`;
  const canEdit = filter !== "all" && selected?.source !== "api";

  const filterRow = (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        options={[
          { value: "all", label: "Toutes", icon: <Users className="size-3.5" /> },
          ...PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORMS[p].name, icon: <PlatformBadge platform={p} size={14} /> })),
        ]}
      />
      <span className="text-xs text-muted">
        {filter === "all"
          ? available.length
            ? `Moyenne de ${available.map((p) => PLATFORMS[p].name).join(", ")}, pondérée par le nombre d'abonnés`
            : ""
          : selected
            ? sourceText(selected)
            : ""}
      </span>
      {filter !== "all" && selected?.source !== "api" && (
        <Button size="sm" className="ml-auto" onClick={() => setEditing(filter)}>
          <PencilLine className="size-4" /> {selected?.source === "manual" ? "Modifier" : "Saisir l'audience"}
        </Button>
      )}
    </div>
  );

  const editor = editing && (
    <AudienceEditor key={editing} platform={editing} current={audiences[editing]} open onClose={() => setEditing(null)} onSaved={onChanged} />
  );

  if (!view || (!view.gender && !view.ages && !view.countries?.length)) {
    const p = filter === "all" ? null : filter;
    return (
      <div className="space-y-6">
        {filterRow}
        <Card>
          <EmptyState
            icon={<UserRound className="size-6" />}
            title={p ? `Pas encore d'audience ${PLATFORMS[p].name}` : "Pas encore de données d'audience"}
            description={
              p === "tiktok"
                ? "TikTok ne transmet pas le genre, l'âge ni les pays de vos abonnés aux applications. Recopiez-les en une minute depuis TikTok Studio → Analyses → Abonnés."
                : p === "youtube"
                  ? "Synchronisez vos statistiques. YouTube affiche ces données quand la chaîne a suffisamment de vues sur les 90 derniers jours."
                  : p === "instagram"
                    ? "Synchronisez vos statistiques. Instagram fournit l'audience des comptes professionnels à partir de 100 abonnés."
                    : "Connectez vos comptes et synchronisez vos statistiques, ou saisissez l'audience TikTok à la main."
            }
            action={
              p ? (
                <Button variant="primary" onClick={() => setEditing(p)}>
                  <PencilLine className="size-4" /> Saisir l&apos;audience {PLATFORMS[p].name}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setEditing("tiktok")}>
                  <PencilLine className="size-4" /> Saisir l&apos;audience TikTok
                </Button>
              )
            }
          />
        </Card>
        {editor}
      </div>
    );
  }

  const avgAge = averageAge(view.ages);
  const mainAge = dominantAge(view.ages);
  const countries = view.countries ?? [];
  const top = countries[0];
  const listed = countries.slice(0, 10);
  const rest = Math.max(0, 1 - listed.reduce((n, c) => n + c.share, 0));

  return (
    <div className="space-y-6">
      {filterRow}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Genre" icon={<Users />} className="xl:col-span-2">
          {view.gender ? (
            <>
              <p className="mb-3 text-[28px] leading-tight font-semibold tracking-tight">
                {pct0(Math.max(view.gender.female, view.gender.male))}{" "}
                <span className="text-base font-medium text-muted">{view.gender.female >= view.gender.male ? "de femmes" : "d'hommes"}</span>
              </p>
              <ShareBar format={pct0} parts={GENDER.map((g) => ({ key: g.key, label: g.label, color: g.color, share: view.gender![g.key] }))} />
            </>
          ) : (
            <p className="text-sm text-muted">Non disponible</p>
          )}
        </Tile>
        <Tile label="Âge moyen" icon={<UserRound />} hint={mainAge ? `Tranche principale : ${AGE_LABEL[mainAge]} (${pct0(view.ages?.[mainAge])})` : undefined}>
          <p className="text-[28px] leading-tight font-semibold tracking-tight">
            {avgAge !== null ? (
              <>
                {Math.round(avgAge)} <span className="text-base font-medium text-muted">ans</span>
              </>
            ) : (
              "—"
            )}
          </p>
        </Tile>
        <Tile
          label="Pays principal"
          icon={<Globe2 />}
          hint={countries.length > 1 ? `${countries.length} pays · ${pct0(1 - (top?.share ?? 0))} de l'audience hors ${top ? countryName(top.code) : ""}` : undefined}
        >
          {top ? (
            <p className="flex items-center gap-2 text-[28px] leading-tight font-semibold tracking-tight">
              <span aria-hidden>{countryFlag(top.code)}</span>
              <span className="min-w-0 truncate text-xl">{countryName(top.code)}</span>
              <span className="ml-auto text-base font-medium text-muted tabular-nums">{pct0(top.share)}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Non disponible</p>
          )}
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col p-5">
          <h3 className="font-semibold">Âge</h3>
          <p className="mt-0.5 text-sm text-muted">
            {avgAge !== null ? `Âge moyen estimé : ${Math.round(avgAge)} ans (milieu de chaque tranche).` : "Répartition par tranche d'âge."}
          </p>
          <div className="mt-5">
            {view.ages ? (
              <ShareList color={color} format={pct0} items={AGE_BUCKETS.map((b) => ({ key: b, label: AGE_LABEL[b], share: view.ages?.[b] ?? 0 }))} />
            ) : (
              <Missing onComplete={canEdit ? () => setEditing(filter as PlatformId) : undefined} />
            )}
          </div>
          {view.ages && (
            <dl className="mt-auto grid grid-cols-3 gap-3 pt-5">
              {[
                { label: "Moins de 25 ans", buckets: ["13-17", "18-24"] as AgeBucket[] },
                { label: "25 à 44 ans", buckets: ["25-34", "35-44"] as AgeBucket[] },
                { label: "45 ans et +", buckets: ["45-54", "55-64", "65+"] as AgeBucket[] },
              ].map((g) => (
                <div key={g.label} className="rounded-xl bg-surface-2/60 p-3">
                  <dt className="text-xs text-muted">{g.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">{pct0(g.buckets.reduce((n, b) => n + (view.ages?.[b] ?? 0), 0))}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Pays touchés</h3>
          <p className="mt-0.5 text-sm text-muted">Principaux pays de votre audience.</p>
          <div className="mt-5">
            {listed.length ? (
              <ShareList
                color={color}
                format={pct0}
                items={[
                  ...listed.map((c) => ({ key: c.code, label: countryName(c.code), share: c.share, icon: <span className="text-base leading-none" aria-hidden>{countryFlag(c.code)}</span> })),
                  ...(rest > 0.005 ? [{ key: "rest", label: "Autres pays", share: rest, muted: true, icon: <Globe2 className="size-4 text-subtle" /> }] : []),
                ]}
              />
            ) : (
              <Missing onComplete={canEdit ? () => setEditing(filter as PlatformId) : undefined} />
            )}
          </div>
        </Card>
      </div>

      {view.cities?.length ? (
        <Card className="p-5">
          <h3 className="font-semibold">Villes principales</h3>
          <p className="mt-0.5 text-sm text-muted">Abonnés Instagram par ville.</p>
          <div className="mt-5 grid gap-x-10 sm:grid-cols-2">
            <ShareList
              color={color}
              format={pct0}
              items={view.cities.slice(0, 10).map((c) => ({ key: c.name, label: c.name, share: c.share, icon: <MapPin className="size-4 text-subtle" /> }))}
            />
          </div>
        </Card>
      ) : null}

      {filter === "all" && (
        <Card className="overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="font-semibold">Comparaison des plateformes</h3>
            <p className="mt-0.5 text-sm text-muted">Qui vous suit, plateforme par plateforme.</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-2/60 text-left text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Plateforme</th>
                  <th className="px-3 py-2.5 text-right font-medium">Femmes</th>
                  <th className="px-3 py-2.5 text-right font-medium">Hommes</th>
                  <th className="px-3 py-2.5 text-right font-medium">Âge moyen</th>
                  <th className="px-3 py-2.5 font-medium">Tranche principale</th>
                  <th className="px-3 py-2.5 font-medium">Pays n°1</th>
                  <th className="px-5 py-2.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_ORDER.map((p) => {
                  const a = audiences[p];
                  const age = averageAge(a?.ages);
                  const main = dominantAge(a?.ages);
                  const c = a?.countries?.[0];
                  return (
                    <tr key={p} className="border-t border-border">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <PlatformBadge platform={p} size={24} />
                          <span className="font-medium">{PLATFORMS[p].name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{pct0(a?.gender?.female)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{pct0(a?.gender?.male)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{age !== null ? `${Math.round(age)} ans` : "—"}</td>
                      <td className="px-3 py-3">{main ? `${AGE_LABEL[main]} · ${pct0(a?.ages?.[main])}` : "—"}</td>
                      <td className="px-3 py-3">{c ? `${countryFlag(c.code)} ${countryName(c.code)} · ${pct0(c.share)}` : "—"}</td>
                      <td className="px-5 py-3">
                        {a ? (
                          <Badge tone={a.source === "api" ? "success" : a.source === "manual" ? "info" : "warning"}>
                            {a.source === "api" ? SOURCE_LABEL[p] : a.source === "manual" ? "Saisie manuelle" : "Démo"}
                          </Badge>
                        ) : (
                          <button onClick={() => setEditing(p)} className="text-xs font-medium text-accent hover:underline">
                            Saisir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editor}
    </div>
  );
}
