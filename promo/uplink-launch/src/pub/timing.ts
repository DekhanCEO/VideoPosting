/**
 * Toutes les constantes de temps de la publicité (en images, 30 i/s, 450 images = 15 s).
 * Les morphings chevauchent volontairement la frontière entre deux plans : l'élément sortant devient l'élément entrant.
 */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 450;

/** Plans du storyboard (début inclus, fin exclue). */
export const PLAN = {
  accroche: { from: 0, to: 75 }, // 0 – 2,5 s
  revelation: { from: 75, to: 150 }, // 2,5 – 5 s
  produit: { from: 150, to: 300 }, // 5 – 10 s
  detail: { from: 300, to: 390 }, // 10 – 13 s
  cta: { from: 390, to: 450 }, // 13 – 15 s
} as const;

/** Plan 1 — accroche mot par mot (fondu + 8 px), un mot toutes les 6 images ; le dernier mot est remplacé par l'accent. */
export const ACCROCHE = { firstWord: 8, wordInterval: 6, wordIn: 12, swap: 46, swapOut: 6, swapIn: 12, linesOut: [54, 64] } as const;
/** Morphing 1 → 2 : le mot d'accent devient le logo. */
export const MORPH_MOT_LOGO = [62, 80] as const;

/** Plan 2 — révélation. */
export const REVELATION = { glyph: [72, 84], name: 78, sub: 92, out: [124, 138] } as const;
/** Morphing 2 → 3 : le logo devient l'écran du téléphone. */
export const MORPH_LOGO_ECRAN = [140, 168] as const;

/** Plan 3 — produit : trois écrans d'environ 1,6 s, enchaînés par morphing. */
export const PRODUIT = {
  tilt: [140, 152], // le téléphone pivote à 12° puis se redresse (ressort)
  straighten: 152,
  a: { card: 156, tiles: [162, 166, 170], pill: 170, press: 180, lines: [182, 196], checks: [194, 197, 200], out: [198, 208] },
  b: { morph: [206, 222], time: 220, dots: 226, pick: 236, out: [250, 262] },
  c: { morph: [252, 268], icon: 260, links: [264, 268, 272], members: 270, out: [288, 300] },
  /** Légendes (début du fondu d'entrée, début du fondu de sortie) ; elles ne se superposent jamais. */
  captions: { a: [172, 200], b: [212, 246], c: [258, 286] },
  captionFade: 10,
  pushOut: [292, 306], // la caméra pousse vers l'écran, le téléphone s'efface
} as const;
/** Morphing 3 → 4 : la notification devient la carte de résultat. */
export const MORPH_BULLE_CARTE = [292, 314] as const;

/** Plan 4 — détail : zoom lent 1 → 1,15, puis arrêt et fond qui s'assombrit (dernière demi-seconde). */
export const DETAIL = { number: 304, label: 310, rows: 306, bars: 314, barStagger: 9, barDur: 24, zoom: [300, 375], darken: [375, 390], out: [380, 390] } as const;
/** Morphing 4 → 5 : la carte de résultat devient le bouton. */
export const MORPH_CARTE_BOUTON = [382, 402] as const;

/** Plan 5 — appel à l'action, fondu au noir sur les 10 dernières images. */
export const CTA = { logo: 392, slogan: 398, label: 398, small: 408, fadeBlack: [440, 450] } as const;

/** Lumière diagonale à chaque transition majeure. */
export const SWEEPS = [80, 150, 302, 394] as const;
export const SWEEP_DUR = 26;

/** Bruitages. */
export const SFX = { whoosh: [58, 136, 204, 250, 288, 378], tick: 78, chime: 402 } as const;
