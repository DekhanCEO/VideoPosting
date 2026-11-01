/** Géométrie partagée : les morphings relient la position d'un élément d'un plan à celle d'un élément du suivant. */
export const SAFE = 80; // marge de sécurité haute et basse

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
}

/** Plan 1 : lignes de l'accroche (haut de chaque ligne) et mot d'accent. */
export const HOOK_LINES = [770, 900, 1030];
export const HOOK_SIZE = 120;
export const MOT_ACCENT: Box = { cx: 540, cy: 1096, w: 290, h: 132, r: 30 };

/** Plan 2 : logo (pictogramme) et nom. */
export const LOGO: Box = { cx: 540, cy: 760, w: 168, h: 168, r: 50 };
export const NAME_TOP = 880;
export const SUB_TOP = 1150;

/** Plan 3 : téléphone (corps et écran) et éléments de l'écran (coordonnées de l'écran, 532 × 1112). */
export const PHONE = { cx: 540, cy: 900, w: 560, h: 1140, r: 84, inset: 14 };
export const SCREEN = { w: PHONE.w - 2 * PHONE.inset, h: PHONE.h - 2 * PHONE.inset, r: PHONE.r - PHONE.inset };
export const SCREEN_ORIGIN = { x: PHONE.cx - SCREEN.w / 2, y: PHONE.cy - SCREEN.h / 2 };
export const PILL: Box = { cx: 266, cy: 880, w: 300, h: 100, r: 50 };
export const TIME_CARD: Box = { cx: 266, cy: 440, w: 440, h: 300, r: 56 };
export const BUBBLE: Box = { cx: 266, cy: 470, w: 452, h: 236, r: 48 };
export const CAPTION_TOP = 1560;

/** Plan 4 : carte de résultat (coordonnées de l'image) et centre du zoom. */
export const RESULT_CARD: Box = { cx: 540, cy: 1090, w: 760, h: 520, r: 56 };
export const ZOOM_ORIGIN = { x: 540, y: 960 };
export const ZOOM_MAX = 1.15;

/** Plan 5 : bouton d'appel à l'action. */
export const BUTTON: Box = { cx: 540, cy: 1200, w: 620, h: 128, r: 64 };

/** La bulle de notification en coordonnées de l'image (téléphone droit, échelle 1). */
export const BUBBLE_GLOBAL: Box = { ...BUBBLE, cx: SCREEN_ORIGIN.x + BUBBLE.cx, cy: SCREEN_ORIGIN.y + BUBBLE.cy };
