import type { ExpenseCategory, IncomeCategory, RevenueCategory } from "./types";

/** Couleur fixe par catégorie (la couleur suit la catégorie, jamais son rang). */
export const INCOME_META: Record<IncomeCategory, { label: string; color: string; hint: string }> = {
  sponsorship: { label: "Partenariats & sponsoring", color: "var(--cat-1)", hint: "Placements de produit, collaborations de marque" },
  ads: { label: "Revenus publicitaires", color: "var(--cat-2)", hint: "AdSense YouTube, partage de revenus" },
  creator_fund: { label: "Programmes créateurs", color: "var(--cat-3)", hint: "TikTok Creator Rewards, bonus Reels…" },
  affiliate: { label: "Affiliation", color: "var(--cat-4)", hint: "Liens affiliés, codes promo" },
  merch: { label: "Produits & boutique", color: "var(--cat-5)", hint: "Merch, formations, presets" },
  subscriptions: { label: "Abonnements & membres", color: "var(--cat-6)", hint: "Membres YouTube, abonnements, Patreon" },
  tips: { label: "Dons & cadeaux", color: "var(--cat-7)", hint: "Super Thanks, cadeaux en live" },
  other_income: { label: "Autres revenus", color: "var(--cat-8)", hint: "" },
};

export const EXPENSE_META: Record<ExpenseCategory, { label: string }> = {
  equipment: { label: "Matériel" },
  software: { label: "Logiciels & abonnements" },
  freelance: { label: "Prestataires (montage, design…)" },
  ads_spend: { label: "Publicité / promotion" },
  travel: { label: "Déplacements" },
  other_expense: { label: "Autres dépenses" },
};

export function categoryLabel(c: RevenueCategory): string {
  return (INCOME_META as Record<string, { label: string }>)[c]?.label ?? (EXPENSE_META as Record<string, { label: string }>)[c]?.label ?? c;
}
