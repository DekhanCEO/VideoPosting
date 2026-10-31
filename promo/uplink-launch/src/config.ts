/**
 * Contenu et rythme du plan de lancement. Tout ce qui est à personnaliser est ici.
 */

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION = 150; // 5 s

/** [MY APP NAME] */
export const APP_NAME = "Uplink";

/** [MY BRAND COLOUR] — le seul accent de l'image. */
export const ACCENT = "#7C3AED";

export const INK = "#0E0F14";
export const MUTED = "#6B6F7C";
export const SCREEN_BG = "#F3F4F7";
export const CARD_BG = "#FFFFFF";
export const HAIRLINE = "#E9EBF0";

/** [MY MAIN NUMBER] — compte de `from` à `to` sur chiffres à chasse fixe. */
export const MAIN_NUMBER = {
  label: "Audience totale",
  from: 112_000,
  to: 171_140,
  suffix: "",
  delta: "+5 990 · 28 jours",
};

/** Courbe du petit graphique (28 jours, valeurs relatives). */
export const CHART = [
  12, 13, 12.6, 14, 15.2, 14.8, 16, 17.4, 17, 18.6, 19.8, 19.2, 21, 22.6, 22, 23.8, 25.4, 24.6, 26.8, 28.4, 27.6, 29.8, 31.6,
  30.8, 33.2, 35, 34.4, 37.2,
];

/** [MY 3 ROWS] */
export const ROWS = [
  { title: "Clutch 1v4 en ranked", meta: "TikTok · YouTube · Instagram", value: "77,8 k", unit: "vues" },
  { title: "Visite de mon setup stream", meta: "YouTube · vidéo longue", value: "16,4 k", unit: "vues" },
  { title: "Récap de la DreamHack", meta: "Instagram · TikTok · 4 photos", value: "98,0 k", unit: "vues" },
];

/**
 * [CARD 1], [CARD 2], [CARD 3] — chaque carte naît d'une forme : pilule, puce ou disque.
 */
export const CARDS = {
  pill: { label: "En ligne", title: "Publié partout", sub: "TikTok · YouTube · Instagram", aside: "3/3" },
  chip: { title: "Annonce Discord envoyée", sub: "#annonces · 3 liens" },
  disc: { value: 12.8, title: "Taux d'influence", sub: "+2,4 pts" },
};

/** Rythme (en images, 30 i/s). */
export const T = {
  screenStart: 6, // l'écran se construit pendant l'atterrissage
  countStart: 12,
  countEnd: 54,
  chartStart: 18,
  chartEnd: 58,
  rowsStart: 30,
  rowsStagger: 6,
  card1: 60,
  card2: 75,
  card3: 90,
  floatStart: 98,
  floatEnd: 120, // puis plan fixe pendant la dernière seconde
};
