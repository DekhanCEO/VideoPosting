/**
 * Pages légales publiques (conditions d'utilisation, politique de confidentialité) exigées par TikTok, Meta et Google
 * lors de la création et de la validation des applications développeur.
 */

export interface LegalInfo {
  /** Nom du service tel qu'il apparaît chez les plateformes (ex. « VideoPosting Malabop »). */
  serviceName: string;
  /** Personne ou société qui exploite le site. */
  editor: string;
  /** Adresse de contact (questions, exercice des droits RGPD, suppression des données). */
  email: string;
}

export const DEFAULT_LEGAL: LegalInfo = { serviceName: "VideoPosting", editor: "", email: "" };

/** Date de la version en vigueur des deux documents (à changer à chaque modification du texte). */
export const LEGAL_UPDATED = "15 octobre 2026";

export const LEGAL_PAGES = {
  terms: { path: "/conditions", title: "Conditions d'utilisation" },
  privacy: { path: "/confidentialite", title: "Politique de confidentialité" },
} as const;

/** Ancre de la section « Suppression de vos données » (URL d'instructions demandée par Meta). */
export const DATA_DELETION_ANCHOR = "suppression";

export function legalInfo(stored?: Partial<LegalInfo> | null): LegalInfo {
  return {
    serviceName: stored?.serviceName?.trim() || DEFAULT_LEGAL.serviceName,
    editor: stored?.editor?.trim() ?? "",
    email: stored?.email?.trim() ?? "",
  };
}

/** Adresse absolue d'une page (à coller dans les consoles développeur), d'après l'adresse publique du site. */
export function legalUrl(publicUrl: string, path: string, trailingSlash: boolean, anchor?: string): string {
  return `${publicUrl.replace(/\/+$/, "")}${path}${trailingSlash ? "/" : ""}${anchor ? `#${anchor}` : ""}`;
}
