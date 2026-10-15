"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  CheckCircle2,
  Clock,
  Download,
  FlaskConical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  Receipt,
  PiggyBank,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { apiUrl } from "@/lib/paths";
import { addDays, isoDay, parseDay } from "@/lib/dates";
import { delta, formatCurrency, formatDate } from "@/lib/format";
import { usePosts, useRevenue, useSettings } from "@/lib/hooks";
import { INCOME_META, REVENUE_PLATFORMS, categoryLabel, revenuePlatformName } from "@/lib/revenue-meta";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type IncomeCategory,
  type PublicSettings,
  type RevenueCategory,
  type RevenueEntry,
  type RevenueEstimates,
  type RevenuePlatform,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageContainer, PageHeader } from "./app-shell";
import { BarList, ChartCard, Legend, StackedColumns, type ChartSeries } from "./charts";
import { PlatformBadge, RevenuePlatformBadge, TwitchLogo } from "./icons";
import { DeltaBadge, StatTile } from "./stat-tile";
import { Badge, Button, ButtonLink, Card, CardHeader, Dialog, EmptyState, Field, Input, Segmented, Select, Skeleton, Switch, Textarea, buttonClass } from "./ui";

type Period = "month" | "quarter" | "year" | "ytd";

function periodRange(p: Period): { from: string; to: string; label: string } {
  const today = isoDay();
  const now = parseDay(today);
  if (p === "month") return { from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: today, label: "ce mois-ci" };
  if (p === "quarter") return { from: addDays(today, -89), to: today, label: "sur 90 jours" };
  if (p === "ytd") return { from: `${now.getFullYear()}-01-01`, to: today, label: "depuis le 1er janvier" };
  return { from: addDays(today, -364), to: today, label: "sur 12 mois" };
}

const monthShort = (m: string) => formatDate(`${m}-15`, { month: "short" });
const monthLong = (m: string) => formatDate(`${m}-15`, { month: "long", year: "numeric" });

interface FormState {
  id?: string;
  kind: "income" | "expense";
  label: string;
  amount: string;
  date: string;
  category: RevenueCategory;
  platform: RevenuePlatform | "";
  partner: string;
  status: "received" | "pending";
  postId: string;
  note: string;
}

const emptyForm = (): FormState => ({
  kind: "income",
  label: "",
  amount: "",
  date: isoDay(),
  category: "sponsorship",
  platform: "",
  partner: "",
  status: "received",
  postId: "",
  note: "",
});

function EntryDialog({ form, setForm, onClose, onSaved, currency }: { form: FormState | null; setForm: (f: FormState) => void; onClose: () => void; onSaved: () => void; currency: string }) {
  const { data: posts } = usePosts();
  const [saving, setSaving] = useState(false);
  if (!form) return null;
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const published = (posts ?? []).filter((p) => p.status === "published" || p.status === "partial");
  const valid = form.label.trim() && Number(form.amount.replace(",", ".")) > 0 && form.date;

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        kind: form.kind,
        label: form.label.trim(),
        amount: Math.round(Number(form.amount.replace(",", ".")) * 100) / 100,
        date: form.date,
        category: form.category,
        platform: form.platform || undefined,
        partner: form.kind === "income" && form.partner.trim() ? form.partner.trim() : undefined,
        status: form.status,
        postId: form.postId || undefined,
        note: form.note.trim() || undefined,
      };
      await api(form.id ? `/api/revenue/${form.id}` : "/api/revenue", { method: form.id ? "PUT" : "POST", json: body });
      toast.success(form.id ? "Écriture mise à jour" : form.kind === "income" ? "Revenu ajouté" : "Dépense ajoutée");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={form.id ? "Modifier l'écriture" : "Nouvelle écriture"}
      description="Enregistrez un revenu (sponsoring, affiliation…) ou une dépense liée à votre activité."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!valid}>
            {form.id ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          className="w-full"
          value={form.kind}
          onChange={(kind) => set({ kind, category: kind === "income" ? "sponsorship" : "equipment" })}
          options={[
            { value: "income", label: "Revenu", icon: <ArrowUpCircle className="size-4" /> },
            { value: "expense", label: "Dépense", icon: <ArrowDownCircle className="size-4" /> },
          ]}
        />
        <Field label="Libellé">
          <Input value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder={form.kind === "income" ? "Ex. Partenariat Samsung – Galaxy S26" : "Ex. Micro Rode Wireless"} data-autofocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Montant (${currency})`}>
            <Input inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value.replace(/[^\d.,]/g, "") })} placeholder="0,00" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie">
            <Select value={form.category} onChange={(e) => set({ category: e.target.value as RevenueCategory })}>
              {(form.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Plateforme">
            <Select value={form.platform} onChange={(e) => set({ platform: e.target.value as FormState["platform"] })}>
              <option value="">Non spécifiée</option>
              {REVENUE_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {revenuePlatformName(p)}
                </option>
              ))}
              <option value="other">Autre / hors plateforme</option>
            </Select>
          </Field>
        </div>
        {form.kind === "income" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Partenaire / client">
              <Input value={form.partner} onChange={(e) => set({ partner: e.target.value })} placeholder="Ex. Samsung" />
            </Field>
            <Field label="Statut">
              <Segmented
                className="w-full"
                value={form.status}
                onChange={(status) => set({ status })}
                options={[
                  { value: "received", label: "Reçu" },
                  { value: "pending", label: "En attente" },
                ]}
              />
            </Field>
          </div>
        )}
        {published.length > 0 && (
          <Field label="Vidéo associée" hint="Pour savoir quelles vidéos rapportent le plus.">
            <Select value={form.postId} onChange={(e) => set({ postId: e.target.value })}>
              <option value="">Aucune</option>
              {published.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.common.title || p.options.youtube.title || "Sans titre"}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Note">
          <Textarea rows={2} value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="N° de facture, conditions de paiement…" />
        </Field>
      </div>
    </Dialog>
  );
}

export function RevenueView() {
  const [period, setPeriod] = useState<Period>("year");
  const range = periodRange(period);
  const { data, isLoading, isValidating, mutate } = useRevenue(range.from, range.to);
  const { data: settings } = useSettings();
  const [form, setForm] = useState<FormState | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | "income" | "expense">("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);

  const currency = data?.currency ?? settings?.currency ?? "EUR";
  const money = (n: number) => formatCurrency(n, currency);
  const moneyCompact = (n: number) => formatCurrency(n, currency, { compact: true });

  const categorySeries: ChartSeries[] = useMemo(() => {
    const used = new Set(data?.byMonth.flatMap((m) => Object.keys(m.income)) ?? []);
    return INCOME_CATEGORIES.filter((c) => used.has(c)).map((c) => ({ key: c, label: INCOME_META[c].label, color: INCOME_META[c].color }));
  }, [data]);

  const monthData = data?.byMonth.map((m) => ({ month: m.month, ...m.income })) ?? [];

  const entries = (data?.entries ?? []).filter((e) => {
    if (kindFilter !== "all" && e.kind !== kindFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return e.label.toLowerCase().includes(q) || (e.partner ?? "").toLowerCase().includes(q) || categoryLabel(e.category).toLowerCase().includes(q);
    }
    return true;
  });

  const refresh = () => {
    void mutate();
    void globalMutate("/api/dashboard");
    void globalMutate((k) => typeof k === "string" && k.startsWith("/api/analytics"));
  };

  const remove = async (e: RevenueEntry) => {
    if (!confirm(`Supprimer « ${e.label} » ?`)) return;
    await api(`/api/revenue/${e.id}`, { method: "DELETE" });
    toast.success("Écriture supprimée");
    refresh();
  };

  const markReceived = async (e: RevenueEntry) => {
    const { id, demo, auto, createdAt, ...rest } = e;
    void demo;
    void auto;
    void createdAt;
    await api(`/api/revenue/${id}`, { method: "PUT", json: { ...rest, status: "received" } });
    toast.success("Marqué comme reçu");
    refresh();
  };

  const goal = data?.monthlyGoal ?? 0;
  const thisMonth = data?.totals.thisMonth ?? 0;
  const goalPct = goal > 0 ? Math.min(100, (thisMonth / goal) * 100) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Revenus"
        description="Suivez ce que rapporte votre contenu : partenariats, publicité, programmes créateurs, affiliation…"
        actions={
          <>
            <a href={apiUrl(`/api/revenue/export?from=${range.from}&to=${range.to}`)} className={buttonClass("secondary", "md")}>
              <Download className="size-4" /> Export CSV
            </a>
            <Button variant="primary" onClick={() => setForm(emptyForm())}>
              <Plus className="size-4" /> Ajouter
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "month", label: "Ce mois" },
            { value: "quarter", label: "90 jours" },
            { value: "ytd", label: "Cette année" },
            { value: "year", label: "12 mois" },
          ]}
        />
        {settings?.demoMode && (
          <Badge tone="warning">
            <FlaskConical className="size-3" /> Données de démonstration
          </Badge>
        )}
      </div>

      {isLoading || !data ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <div className={cn("mt-6 space-y-6 transition-opacity", isValidating && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Revenus"
              icon={<TrendingUp />}
              value={money(data.totals.income)}
              delta={<DeltaBadge value={delta(data.totals.income, data.totals.incomePrevious)} />}
              hint={range.label}
            />
            <StatTile label="Dépenses" icon={<Receipt />} value={money(data.totals.expenses)} hint={range.label} />
            <StatTile
              label="Bénéfice net"
              icon={<PiggyBank />}
              value={money(data.totals.net)}
              hint={data.totals.income > 0 ? `Marge ${Math.round((data.totals.net / data.totals.income) * 100)} %` : range.label}
            />
            <StatTile
              label="En attente de paiement"
              icon={<Clock />}
              value={money(data.totals.pending)}
              hint={`${data.entries.filter((e) => e.status === "pending").length} facture(s)`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <ChartCard
              title="Revenus par mois"
              subtitle="12 derniers mois, par source de revenus"
              legend={categorySeries.length > 0 && <Legend series={categorySeries} />}
              chart={
                categorySeries.length ? (
                  <StackedColumns data={monthData} series={categorySeries} xKey="month" format={moneyCompact} xFormat={monthShort} tooltipLabel={monthLong} height={280} />
                ) : (
                  <EmptyState icon={<Wallet className="size-6" />} title="Aucun revenu enregistré" className="py-12" />
                )
              }
              table={{
                columns: ["Mois", ...categorySeries.map((s) => s.label), "Dépenses"],
                rows: [...data.byMonth].reverse().map((m) => [monthLong(m.month), ...categorySeries.map((s) => money(m.income[s.key] ?? 0)), money(m.expenses)]),
              }}
            />

            <Card className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Objectif du mois</h3>
                <Target className="size-4 text-muted" />
              </div>
              <p className="mt-3 text-[32px] leading-none font-semibold tracking-tight">{money(thisMonth)}</p>
              <p className="mt-1 text-sm text-muted">sur {money(goal)} visés</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-accent-soft">
                <div className="h-full rounded-full gradient-brand transition-[width] duration-700" style={{ width: `${goalPct}%` }} />
              </div>
              <p className="mt-3 text-sm">
                {goal <= 0 ? (
                  <span className="text-muted">Définissez un objectif dans les paramètres.</span>
                ) : thisMonth >= goal ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-success">
                    <CheckCircle2 className="size-4" /> Objectif atteint, bravo !
                  </span>
                ) : (
                  <span className="text-muted">
                    Encore <strong className="text-fg">{money(goal - thisMonth)}</strong> pour l&apos;atteindre ({Math.round(goalPct)} %).
                  </span>
                )}
              </p>
              <Link href="/settings#revenue-settings" className="mt-auto pt-4 text-xs font-medium text-accent hover:underline">
                Modifier l&apos;objectif →
              </Link>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold">Par source</h3>
              <p className="mt-0.5 text-sm text-muted">Revenus {range.label}</p>
              <div className="mt-5">
                {data.byCategory.length ? (
                  <BarList
                    format={money}
                    items={data.byCategory.map((c) => ({
                      key: c.category,
                      label: categoryLabel(c.category),
                      value: c.amount,
                      color: INCOME_META[c.category as IncomeCategory]?.color ?? "var(--subtle)",
                      icon: <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: INCOME_META[c.category as IncomeCategory]?.color ?? "var(--subtle)" }} />,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted">Aucun revenu sur la période.</p>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Par plateforme</h3>
              <p className="mt-0.5 text-sm text-muted">Revenus {range.label}</p>
              <div className="mt-5">
                {data.byPlatform.length ? (
                  <BarList
                    format={money}
                    items={data.byPlatform.map((p) => ({
                      key: p.platform,
                      label: revenuePlatformName(p.platform),
                      value: p.amount,
                      color: p.platform === "other" ? "var(--subtle)" : `var(--series-${p.platform})`,
                      icon: <RevenuePlatformBadge platform={p.platform} size={20} />,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted">Aucun revenu sur la période.</p>
                )}
              </div>
            </Card>
          </div>

          {settings && <EstimatesCard settings={settings} estimated={data.estimatedIncome ?? 0} money={money} periodLabel={range.label} onSaved={refresh} />}

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 p-5 pb-0 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">Écritures</h3>
                <p className="mt-0.5 text-sm text-muted">
                  {entries.length} écriture{entries.length > 1 ? "s" : ""} {range.label}
                  {data.youtubeAdsIncluded && " · revenus YouTube synchronisés automatiquement"}
                  {!!data.estimatedIncome && ` · dont ${money(data.estimatedIncome)} estimés`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Segmented
                  size="sm"
                  value={kindFilter}
                  onChange={setKindFilter}
                  options={[
                    { value: "all", label: "Tout" },
                    { value: "income", label: "Revenus" },
                    { value: "expense", label: "Dépenses" },
                  ]}
                />
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="h-9 w-48 pl-9" />
                </div>
              </div>
            </div>
            {entries.length === 0 ? (
              <EmptyState
                icon={<Wallet className="size-6" />}
                title="Aucune écriture"
                description="Ajoutez vos revenus (sponsoring, affiliation, programmes créateurs…) et vos dépenses pour suivre la rentabilité de votre contenu."
                action={
                  <Button variant="primary" onClick={() => setForm(emptyForm())}>
                    <Plus className="size-4" /> Ajouter une écriture
                  </Button>
                }
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-surface-2/60 text-left text-xs text-muted">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Date</th>
                      <th className="px-3 py-2.5 font-medium">Libellé</th>
                      <th className="px-3 py-2.5 font-medium">Catégorie</th>
                      <th className="px-3 py-2.5 font-medium">Statut</th>
                      <th className="px-3 py-2.5 text-right font-medium">Montant</th>
                      <th className="w-24 px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, visibleCount).map((e) => (
                      <tr key={e.id} className="group border-t border-border hover:bg-surface-2/40">
                        <td className="px-5 py-3 whitespace-nowrap text-muted tabular-nums">{formatDate(e.date)}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2.5">
                            <RevenuePlatformBadge platform={e.platform} size={22} />
                            <span className="min-w-0">
                              <span className="block max-w-80 truncate font-medium">{e.label}</span>
                              {(e.partner || e.note) && <span className="block max-w-80 truncate text-xs text-muted">{[e.partner, e.note].filter(Boolean).join(" · ")}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            {e.kind === "income" && <span className="size-2 rounded-[2px]" style={{ background: INCOME_META[e.category as IncomeCategory]?.color }} />}
                            {categoryLabel(e.category)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {e.estimated ? (
                            <Badge tone="accent">
                              <Calculator className="size-3" /> Estimé
                            </Badge>
                          ) : e.auto ? (
                            <Badge tone="info">
                              <RefreshCw className="size-3" /> Synchronisé
                            </Badge>
                          ) : e.status === "pending" ? (
                            <Badge tone="warning">
                              <Clock className="size-3" /> En attente
                            </Badge>
                          ) : (
                            <Badge tone="success">
                              <CheckCircle2 className="size-3" /> Reçu
                            </Badge>
                          )}
                        </td>
                        <td className={cn("px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums", e.kind === "expense" && "text-muted")}>
                          {e.kind === "expense" ? "−" : "+"}
                          {money(e.amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {!e.auto && (
                            <span className="inline-flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                              {e.status === "pending" && (
                                <button className={buttonClass("ghost", "icon-sm")} title="Marquer comme reçu" onClick={() => markReceived(e)}>
                                  <CheckCircle2 className="size-4" />
                                </button>
                              )}
                              <button
                                className={buttonClass("ghost", "icon-sm")}
                                title="Modifier"
                                onClick={() =>
                                  setForm({
                                    id: e.id,
                                    kind: e.kind,
                                    label: e.label,
                                    amount: String(e.amount).replace(".", ","),
                                    date: e.date,
                                    category: e.category,
                                    platform: e.platform ?? "",
                                    partner: e.partner ?? "",
                                    status: e.status,
                                    postId: e.postId ?? "",
                                    note: e.note ?? "",
                                  })
                                }
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button className={buttonClass("ghost", "icon-sm")} title="Supprimer" onClick={() => remove(e)}>
                                <Trash2 className="size-4" />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entries.length > visibleCount && (
                  <div className="border-t border-border p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => setVisibleCount((n) => n + 30)}>
                      Afficher plus ({entries.length - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {!settings?.demoMode && !data.youtubeAdsIncluded && (
            <p className="text-xs text-muted">
              Astuce : les revenus publicitaires YouTube sont importés automatiquement si votre chaîne est monétisée (YouTube Analytics). Les autres plateformes ne fournissent pas leurs revenus via API : ajoutez-les ici.{" "}
              <ButtonLink href="/analytics" size="xs" variant="ghost">
                Synchroniser
              </ButtonLink>
            </p>
          )}
        </div>
      )}

      <EntryDialog
        form={form}
        setForm={setForm}
        currency={currency}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          refresh();
        }}
      />
    </PageContainer>
  );
}

/** Réglages des estimations : RPM TikTok / Instagram, valeur des abonnements et des bits Twitch. */
function EstimatesCard({
  settings,
  estimated,
  money,
  periodLabel,
  onSaved,
}: {
  settings: PublicSettings;
  estimated: number;
  money: (n: number) => string;
  periodLabel: string;
  onSaved: () => void;
}) {
  const current: RevenueEstimates = settings.revenueEstimates ?? { enabled: true, tiktokRpm: 0.5, instagramRpm: 0, twitchSubValue: 2.5, twitchBitValue: 0.01 };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    tiktokRpm: String(current.tiktokRpm).replace(".", ","),
    instagramRpm: String(current.instagramRpm).replace(".", ","),
    twitchSubValue: String(current.twitchSubValue).replace(".", ","),
    twitchBitValue: String(current.twitchBitValue).replace(".", ","),
  }));
  const [saving, setSaving] = useState(false);
  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);
  const save = async (patch: Partial<RevenueEstimates>) => {
    setSaving(true);
    try {
      const next = await api<PublicSettings>("/api/settings", { method: "PUT", json: { revenueEstimates: patch } });
      await globalMutate("/api/settings", next, { revalidate: false });
      onSaved();
      toast.success("Estimations mises à jour");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const field = (key: keyof typeof form, label: string, suffix: string, hint: string, icon: React.ReactNode) => (
    <Field label={label} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">{icon}</span>
        <Input
          inputMode="decimal"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/[^\d.,]/g, "") }))}
          className="pr-24 pl-10 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-subtle">{suffix}</span>
      </div>
    </Field>
  );
  const cur = settings.currency;
  return (
    <Card>
      <CardHeader
        icon={<Calculator className="size-4" />}
        title="Estimations automatiques"
        description={
          current.enabled
            ? `TikTok, Instagram et Twitch ne communiquent pas leurs gains : VideoPosting les estime à partir des vues${settings.twitchAvailable ? ", des abonnements et des bits" : ""}.${estimated ? ` ${money(estimated)} estimés ${periodLabel}.` : ""}`
            : "Désactivées : seuls les revenus saisis et les revenus YouTube synchronisés sont comptés."
        }
        actions={<Switch checked={current.enabled} onChange={(v) => void save({ enabled: v })} label="" />}
      />
      <div className="px-5 pb-5">
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-3 text-sm font-medium text-accent hover:underline">
          {open ? "Masquer les réglages" : "Régler les montants"}
        </button>
        {open && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {field("tiktokRpm", "TikTok · pour 1 000 vues", `${cur} / 1 000 vues`, "Creator Rewards : environ 0,40 à 1 € (vidéos de plus d'1 minute). 0 = pas d'estimation.", <PlatformBadge platform="tiktok" size={18} />)}
              {field("instagramRpm", "Instagram · pour 1 000 vues", `${cur} / 1 000 vues`, "Bonus, programmes ou abonnements. 0 = pas d'estimation.", <PlatformBadge platform="instagram" size={18} />)}
              {settings.twitchAvailable && (
                <>
                  {field("twitchSubValue", "Twitch · par abonnement (niveau 1)", `${cur} net`, "Part reversée par abonnement (≈ 50 % de 4,99 $). Niveau 2 ×2, niveau 3 ×5.", <RevenuePlatformBadge platform="twitch" size={18} />)}
                  {field("twitchBitValue", "Twitch · par bit", cur, "Un bit rapporte 0,01 $ au créateur.", <TwitchLogo className="size-4 text-[#9146FF]" />)}
                </>
              )}
            </div>
            <p className="text-xs text-muted">
              Les montants estimés apparaissent « En attente » avec le badge Estimé : quand le paiement arrive, ajoutez le montant réel et réduisez l&apos;estimation à 0
              si besoin.
            </p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                loading={saving}
                onClick={() =>
                  void save({ tiktokRpm: num(form.tiktokRpm), instagramRpm: num(form.instagramRpm), twitchSubValue: num(form.twitchSubValue), twitchBitValue: num(form.twitchBitValue) })
                }
              >
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
