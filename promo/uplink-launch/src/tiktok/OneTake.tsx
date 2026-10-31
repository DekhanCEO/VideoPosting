/**
 * Version TikTok (15 s, 9:16) : le contenu « essentiel » (une accroche, quatre messages, la fin) tourné en un seul
 * plan-séquence façon keynote. Fond clair #EEEEEC, encre presque noire, un seul point rouge, Inter Tight ; aucune
 * coupe, aucun fondu : chaque état naît du précédent (ressorts à ~10 %, flou de bougé selon la vitesse, ombres douces
 * en couches), une seconde immobile à la fin.
 *
 *  0–2,9 s   « Arrête de publier 3 fois la même vidéo. » → « Publie-la 1 fois partout. » ; les trois logos fusionnent
 *            en point rouge.
 *  2,9–5,7 s le point fait pousser « Publier », un pointeur le presse (« 1 clic. ») ; le bouton s'ouvre en carte qui se
 *            divise en trois (« 3 plateformes. »).
 *  5,7–7,9 s les trois cartes se rassemblent, prennent un cadre : un téléphone. « 19:00 » sort de l'application et
 *            devient géant (« Programme. »).
 *  7,9–10,2 s le message Discord sort du téléphone (« Ta commu prévenue. »).
 *  10,2–12 s le message se divise en trois chiffres (« Tes stats. Tes revenus. »).
 *  12–15 s   les chiffres rentrent dans le téléphone, la caméra recule, le téléphone devient le « o » de « partout »
 *            et le point rouge se pose en point final.
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, interpolateColors, useCurrentFrame } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { useFonts } from "../fonts";
import { PlayGlyph } from "../icons";
import { clamp01, mix } from "../motion";
import { Blur, GREY, GROUND, INK, IT, RED, Rise, SCREEN, blurOf, blurUrl, ease, shadow, sp } from "./motionKit";

export const ONETAKE_DURATION = 450;
const HOLD_FROM = ONETAKE_DURATION - 30;

/** Chronologie (images). */
const T = {
  roll: 38,
  merge: [66, 78],
  dot: 74,
  hookOut: 80,
  pill: 84,
  ptrIn: 92,
  press: 104,
  ptrOut: 112,
  open: 112,
  split: 128,
  chips: [134, 138, 142],
  regroup: [172, 182],
  phone: 182,
  header: 188,
  island: 196,
  cardB: 200,
  giant: 206,
  giantBack: 238,
  cardC: 246,
  msg: 250,
  msgOut: 300,
  stats: 306,
  back: 362,
  cardD: 374,
  pull: 374,
  dotFly: 380,
  line2: 404,
  sign: 410,
} as const;

/* ------------------------------------------------------------ Géométrie */

const CENTER = { x: 540, y: 1000 };
const CARD = { cx: 540, cy: 1040, w: 760, h: 432, r: 40 };
const GAP = 26;
const NAT_W = 436; // largeur naturelle des cartes de l'application
const ROW_H = 248 / 3;
const S_CARD = CARD.w / NAT_W;
const PHONE = { cx: 540, cy: 1240, w: 390, h: 788, r: 59, border: 12.5 };
const PS = (PHONE.w - 2 * PHONE.border) / 468;
const SCREEN0 = { x: PHONE.cx - PHONE.w / 2 + PHONE.border, y: PHONE.cy - PHONE.h / 2 + PHONE.border };
const NAT = { cardA: { x: 16, y: 152 }, cardB: { y: 416, h: 104 }, cardC: { y: 532, h: 104 }, cardD: { y: 648, h: 150 } };
/** Cible finale : le « o » de « partout » et son point (Inter Tight 700, 190 px). */
const O = { x: 600, y: 1128, w: 106, h: 108, stroke: 24, adv: 118 };
const LINE1_BASE = 1000;
const LINE2_BASE = 1180;
const FULL_STOP = { x: 846, y: 1165, r: 15 };
const PULL = { mass: 1, stiffness: 120, damping: 13 }; // ζ ≈ 0,59
const SHAPE = { mass: 1, stiffness: 120, damping: 24 }; // sans dépassement
const Z0 = PHONE.w / O.w;
const zoomOf = (e: number) => Math.pow(Z0, 1 - e);
/** Rectangle d'un élément de l'écran du téléphone (coordonnées naturelles → image). */
const phoneRect = (y: number, h: number) => ({ x: SCREEN0.x + PS * 16, y: SCREEN0.y + PS * y, w: PS * NAT_W, h: PS * h, r: PS * 26 });

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}
const mixRect = (a: Rect, b: Rect, t: number): Rect => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t), r: mix(a.r, b.r, t) });
const centered = (cx: number, cy: number, w: number, h: number, r: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h, r });

interface Dev {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
  border: number;
  bg: string;
  q: number;
  e: number;
}

/** L'objet unique : point → bouton → carte, puis (après la division) carte → téléphone → « o ». */
function dev(f: number): Dev {
  const g = sp(f, T.pill);
  const o = sp(f, T.open);
  if (f < T.regroup[1]) {
    const L = mix(518, 305, g);
    let w = mix(44, 470, g);
    let h = mix(44, 132, g);
    let cx = L + w / 2;
    let cy = CENTER.y;
    let r = h / 2;
    w = mix(w, CARD.w, o);
    h = mix(h, CARD.h, o);
    cx = mix(cx, CARD.cx, o);
    cy = mix(cy, CARD.cy, o);
    r = mix(r, CARD.r, o);
    const bg = f >= T.open ? interpolateColors(ease(f, T.open, T.open + 6), [0, 1], [INK, "#FFFFFF"]) : INK;
    return { cx, cy, w, h, r, border: 0, bg, q: 0, e: 0 };
  }
  const q = sp(f, T.phone);
  let w = mix(CARD.w, PHONE.w, q);
  let h = mix(CARD.h, PHONE.h, q);
  let cx = 540;
  let cy = mix(CARD.cy, PHONE.cy, q);
  let r = mix(CARD.r, PHONE.r, q);
  let border = mix(0, PHONE.border, q);
  let bg = interpolateColors(clamp01(q), [0, 1], ["#FFFFFF", SCREEN]);
  const e = sp(f, T.pull, PULL);
  if (f >= T.pull) {
    // Recul : caméra (ressort à 10 %, zoom logarithmique) et forme (sans dépassement) restent cohérentes.
    const m = sp(f, T.pull, SHAPE);
    const z = zoomOf(e);
    w = z * mix(w / Z0, O.w, m);
    h = z * mix(h / Z0, O.h, m);
    r = z * mix(r / Z0, O.w / 2, m);
    border = z * mix(border / Z0, O.stroke, m);
    cx = mix(cx, O.x, e);
    cy = mix(cy, O.y, e);
    bg = interpolateColors(clamp01(e), [0, 0.7], [SCREEN, GROUND]);
  }
  return { cx, cy, w, h, r, border, bg, q, e };
}
const devVisible = (f: number) => (f >= T.pill && f < T.split) || f >= T.regroup[1];

/** Échelle du contenu de l'écran (naturel 468 px → image). */
const contentScale = (f: number, d: Dev) => (f < T.pull ? mix(1, PS, d.q) : (d.w - 2 * d.border) / 468);
/** Placement de la liste des plateformes dans l'écran. */
const cardA = (q: number) => ({ x: mix(0, NAT.cardA.x, q), y: mix(0, NAT.cardA.y, q), s: mix(S_CARD, 1, q) });

/** Les trois cartes de plateformes : la carte se divise, puis se rassemble. */
function slices(f: number) {
  const R0 = dev(T.split);
  const s = sp(f, T.split);
  const m = ease(f, T.regroup[0], T.regroup[1]);
  const hs = CARD.h / 3;
  return [0, 1, 2].map((i) => {
    let x = mix(R0.cx - R0.w / 2, CARD.cx - CARD.w / 2, s);
    let w = mix(R0.w, CARD.w, s);
    let h = mix(R0.h / 3, hs, s);
    let y = mix(R0.cy - R0.h / 2 + (i * R0.h) / 3, CARD.cy - (CARD.h + 2 * GAP) / 2 + i * (hs + GAP), s);
    x = mix(x, CARD.cx - CARD.w / 2, m);
    y = mix(y, CARD.cy - CARD.h / 2 + i * hs, m);
    w = mix(w, CARD.w, m);
    h = mix(h, hs, m);
    const inner = 30 * clamp01(s) * (1 - m);
    const outer = mix(R0.r, CARD.r, clamp01(s));
    return { x, y, w, h, rt: i === 0 ? outer : inner, rb: i === 2 ? outer : inner };
  });
}

/** Pointeur : entre, presse, repart. */
function pointer(f: number) {
  const i = sp(f, T.ptrIn, { mass: 1, stiffness: 140, damping: 14 });
  let x = mix(1010, 640, i);
  let y = mix(1660, 1028, i);
  const out = ease(f, T.ptrOut, T.ptrOut + 13, Easing.in(Easing.cubic));
  x = mix(x, 1250, out);
  y = mix(y, 1380, out);
  const press = f >= T.press ? Math.sin(clamp01((f - T.press) / 6) * Math.PI) : 0;
  return { x, y, press };
}

/** Le point rouge : né des trois logos, il voyage jusqu'au point final. */
function redDot(f: number) {
  let x = CENTER.x;
  let y = CENTER.y;
  let r = 22 * sp(f, T.dot);
  if (f >= T.pill) {
    const g = sp(f, T.pill);
    const d = dev(Math.min(f, T.open));
    const px = mix(518, 305, g) + mix(44, 132, g) / 2;
    x = d.cx + (1 - 0.05 * pointer(f).press) * (px - d.cx);
    r = mix(22, 18, g);
  }
  const badge = () => {
    if (f < T.split) {
      const d = dev(f);
      return { x: d.cx - d.w / 2 + S_CARD * 12, y: d.cy - d.h / 2 + S_CARD * 12, r: 5 * S_CARD };
    }
    if (f < T.regroup[1]) {
      const s0 = slices(f)[0];
      const k = s0.w / NAT_W;
      return { x: s0.x + k * 12, y: s0.y + k * 12, r: 5 * k };
    }
    const d = dev(f);
    const cw = contentScale(f, d);
    const a = cardA(d.q);
    return { x: d.cx - d.w / 2 + d.border + cw * (a.x + a.s * 12), y: d.cy - d.h / 2 + d.border + cw * (a.y + a.s * 12), r: 5 * a.s * cw };
  };
  if (f >= T.open) {
    const o = sp(f, T.open);
    const b = badge();
    x = mix(x, b.x, o);
    y = mix(y, b.y, o);
    r = mix(r, b.r, o);
  }
  if (f >= T.dotFly) {
    const d = dev(f);
    const z = zoomOf(d.e);
    const k = sp(f, T.dotFly, { mass: 1, stiffness: 110, damping: 12.4 });
    x = mix(x, d.cx + z * (FULL_STOP.x - O.x), k);
    y = mix(y, d.cy + z * (FULL_STOP.y - O.y), k) - 190 * Math.sin(Math.PI * clamp01(k));
    r = mix(r, z * FULL_STOP.r, k);
  }
  return { x, y, r };
}

/** « 19:00 » qui sort de la carte « Programmé » et devient géant, puis y retourne. */
function giant(f: number) {
  const p = sp(f, T.giant) - sp(f, T.giantBack);
  const from = { x: SCREEN0.x + PS * 392, y: SCREEN0.y + PS * 468, s: (30 * PS) / 280 };
  return { x: mix(from.x, 540, p), y: mix(from.y, 664, p), s: Math.max(from.s * 0.6, mix(from.s, 1, p)) };
}

const MSG = centered(540, 770, 880, 316, 36);
function msgRect(f: number): Rect {
  return mixRect(phoneRect(NAT.cardC.y, NAT.cardC.h), MSG, sp(f, T.msg));
}
function statRects(f: number): Rect[] {
  const s = sp(f, T.stats);
  const b = sp(f, T.back);
  const home = phoneRect(NAT.cardD.y, NAT.cardD.h);
  return [0, 1, 2].map((i) => {
    const start: Rect = { x: MSG.x, y: MSG.y + (i * MSG.h) / 3, w: MSG.w, h: MSG.h / 3, r: i === 1 ? 0 : 36 };
    const final: Rect = { x: 100, y: 625 + i * 190, w: 880, h: 170, r: 36 };
    return mixRect(mixRect(start, final, s), home, b);
  });
}

/* ------------------------------------------------------------- Contenus */

const BRANDS: { b: Brand; n: string }[] = [
  { b: "tiktok", n: "TikTok" },
  { b: "youtube", n: "YouTube" },
  { b: "instagram", n: "Instagram" },
];

/** Une ligne « plateforme » (largeur naturelle 436, hauteur ROW_H). */
const PlatformRow: React.FC<{ i: number; f: number }> = ({ i, f }) => (
  <div style={{ width: NAT_W, height: ROW_H, display: "flex", alignItems: "center", gap: 14, padding: "0 22px", boxSizing: "border-box", fontFamily: IT, color: INK }}>
    <div style={{ width: 52, height: 52, borderRadius: 16, background: "#F1F1EF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <BrandLogo brand={BRANDS[i].b} size={26} color={INK} />
    </div>
    <div style={{ flex: 1, fontSize: 25, fontWeight: 600, letterSpacing: "-0.01em" }}>{BRANDS[i].n}</div>
    <div style={{ transform: `scale(${sp(f, T.chips[i])})`, background: INK, color: "#fff", fontSize: 17, fontWeight: 600, borderRadius: 20, padding: "7px 13px" }}>Publiée ✓</div>
  </div>
);

const SmallCard: React.FC<{ f: number; at: number; y: number; h: number; children: React.ReactNode }> = ({ f, at, y, h, children }) => {
  if (f < at) return null;
  const p = sp(f, at);
  return (
    <div style={{ position: "absolute", left: 16, top: y, width: NAT_W, height: h, borderRadius: 26, background: "#fff", boxShadow: shadow(0.7), transform: `translateY(${(1 - p) * 60}px) scale(${mix(0.7, 1, p)})`, fontFamily: IT, color: INK, display: "flex", alignItems: "center", gap: 16, padding: "0 22px", boxSizing: "border-box" }}>
      {children}
    </div>
  );
};
const Tile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 58, height: 58, borderRadius: 18, background: "#F1F1EF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{children}</div>
);
const ClockIcon = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round">
    <circle cx={12} cy={12} r={8.5} />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
const fmt = (n: number, d = 0) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n).replace(/[  ]/g, " ");

/** L'application dans le téléphone (coordonnées naturelles 468 × 978). */
const PhoneContent: React.FC<{ f: number; d: Dev }> = ({ f, d }) => {
  const a = cardA(d.q);
  const head = sp(f, T.header);
  const giantOut = f >= T.giant && f < T.giantBack + 10;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 468, height: 978, transformOrigin: "0 0", transform: `scale(${contentScale(f, d)})`, clipPath: f >= T.pull ? `circle(${(1 - ease(f, T.pull + 2, T.pull + 16, Easing.in(Easing.cubic))) * 620}px at 234px 489px)` : undefined }}>
      {f >= T.header && (
        <div style={{ position: "absolute", left: 0, top: 0, width: 468, height: 150, transform: `translateY(${(1 - head) * -150}px)`, fontFamily: IT, color: INK }}>
          <div style={{ position: "absolute", left: 34, top: 18, fontSize: 17, fontWeight: 600 }}>9:41</div>
          <div style={{ position: "absolute", right: 30, top: 22, display: "flex", gap: 6, alignItems: "flex-end" }}>
            {[6, 9, 12, 15].map((hh) => (
              <div key={hh} style={{ width: 4, height: hh, borderRadius: 1, background: INK }} />
            ))}
            <div style={{ marginLeft: 6, width: 26, height: 13, borderRadius: 4, border: `2px solid ${INK}`, boxSizing: "border-box", padding: 1.5 }}>
              <div style={{ width: "75%", height: "100%", borderRadius: 1.5, background: INK }} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 24, top: 70, fontSize: 15, fontWeight: 600, color: GREY }}>Uplink</div>
          <div style={{ position: "absolute", left: 24, top: 90, fontSize: 31, fontWeight: 700, letterSpacing: "-0.02em" }}>Bonsoir, Dekhan</div>
          <div style={{ position: "absolute", right: 24, top: 82, width: 42, height: 42, borderRadius: 21, background: INK, color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>DK</div>
        </div>
      )}
      {f >= T.island && <div style={{ position: "absolute", left: 234 - 58, top: 12, width: 116, height: 34, borderRadius: 17, background: INK, transform: `scale(${sp(f, T.island)})` }} />}
      <div style={{ position: "absolute", left: a.x, top: a.y, transformOrigin: "0 0", transform: `scale(${a.s})`, width: NAT_W, borderRadius: 28, background: "#fff", boxShadow: shadow(clamp01(d.q) * 0.7), overflow: "hidden" }}>
        {[0, 1, 2].map((i) => (
          <PlatformRow key={i} i={i} f={f} />
        ))}
      </div>
      <SmallCard f={f} at={T.cardB} y={NAT.cardB.y} h={NAT.cardB.h}>
        <Tile>
          <ClockIcon />
        </Tile>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 23, fontWeight: 700 }}>Programmé</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>Ce soir</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", visibility: giantOut ? "hidden" : "visible" }}>19:00</div>
      </SmallCard>
      <SmallCard f={f} at={T.cardC} y={NAT.cardC.y} h={NAT.cardC.h}>
        <Tile>
          <BrandLogo brand="discord" size={30} color={INK} />
        </Tile>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 23, fontWeight: 700 }}>Annonce envoyée</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>#annonces · 3 liens</div>
        </div>
        <div style={{ background: INK, color: "#fff", fontSize: 17, fontWeight: 600, borderRadius: 20, padding: "7px 13px" }}>Discord ✓</div>
      </SmallCard>
      {f >= T.cardD && (
        <div style={{ position: "absolute", left: 16, top: NAT.cardD.y, width: NAT_W, height: NAT.cardD.h, borderRadius: 26, background: "#fff", boxShadow: shadow(0.7), fontFamily: IT, color: INK, display: "flex", alignItems: "center", padding: "0 22px", boxSizing: "border-box", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em" }}>+5 990</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>abonnés · 28 jours</div>
          </div>
          <div style={{ width: 1, height: 84, background: "#E4E4E1" }} />
          <div style={{ flex: 1, paddingLeft: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em" }}>4 918 €</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>revenus ce mois</div>
          </div>
        </div>
      )}
      {f >= T.header && <div style={{ position: "absolute", left: 234 - 70, top: 958, width: 140, height: 5, borderRadius: 3, background: INK, transform: `scaleX(${head})` }} />}
    </div>
  );
};

/** Le message Discord (naturel 880 × 316). */
const Message: React.FC<{ f: number }> = ({ f }) => {
  const at = T.msg + 6;
  const lines: React.ReactNode[] = [
    <b key="t" style={{ fontWeight: 700, color: INK }}>Clutch 1v4 en ranked est en ligne !</b>,
    <>
      <b style={{ fontWeight: 700, color: INK }}>TikTok</b> · tiktok.com/@dekhan/video/7425…
    </>,
    <>
      <b style={{ fontWeight: 700, color: INK }}>YouTube</b> · youtube.com/shorts/Vq3dX8…
    </>,
    <>
      <b style={{ fontWeight: 700, color: INK }}>Instagram</b> · instagram.com/reel/DBk2pQ…
    </>,
  ];
  return (
    <div style={{ width: 880, height: 316, padding: "28px 34px", boxSizing: "border-box", fontFamily: IT, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: INK, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PlayGlyph size={26} color="#fff" />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <Rise k={f} enter={at} exit={T.msgOut}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>Uplink</span>
          </Rise>
          <Rise k={f} enter={at + 1} exit={T.msgOut}>
            <span style={{ fontSize: 15, fontWeight: 700, background: INK, color: "#fff", borderRadius: 6, padding: "3px 8px" }}>APP</span>
          </Rise>
          <Rise k={f} enter={at + 2} exit={T.msgOut}>
            <span style={{ fontSize: 21, fontWeight: 500, color: GREY }}>Aujourd'hui à 19:00</span>
          </Rise>
        </div>
        <BrandLogo brand="discord" size={40} color={INK} />
      </div>
      <div style={{ marginTop: 14, fontSize: 25, fontWeight: 500, color: GREY, lineHeight: 1.5, whiteSpace: "nowrap" }}>
        {lines.map((l, i) => (
          <div key={i}>
            <Rise k={f} enter={at + 3 + i * 2} exit={T.msgOut}>
              {l}
            </Rise>
          </div>
        ))}
      </div>
    </div>
  );
};

const STATS = [
  { v: 5990, d: 0, pre: "+", suf: "", label: "abonnés en 28 jours" },
  { v: 12.8, d: 1, pre: "", suf: " %", label: "taux d'influence" },
  { v: 4918.98, d: 2, pre: "", suf: " €", label: "de revenus ce mois" },
];
/** Une carte chiffrée (naturel 880 × 170) ; le nombre compte sans jamais revenir en arrière. */
const StatContent: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const s = STATS[i];
  const at = T.stats + 4 + i * 3;
  const c = ease(f, at, at + 18, Easing.out(Easing.cubic));
  return (
    <div style={{ width: 880, height: 170, padding: "0 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: IT, color: INK }}>
      <Rise k={f} enter={at}>
        <span style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>
          {s.pre}
          {fmt(s.v * c, s.d)}
          {s.suf}
        </span>
      </Rise>
      <Rise k={f} enter={at + 2}>
        <span style={{ fontSize: 32, fontWeight: 600, color: GREY }}>{s.label}</span>
      </Rise>
    </div>
  );
};

/* ------------------------------------------------------------- Accroche */

/** Remplace un texte par un autre : l'ancien sort par le haut, le nouveau monte à sa place. */
const Swap: React.FC<{ a: React.ReactNode; b: React.ReactNode; at: number; f: number }> = ({ a, b, at, f }) => {
  const out = ease(f, at, at + 6, Easing.in(Easing.cubic));
  const inn = sp(f, at + 4);
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "nowrap", padding: "0.08em 0.04em 0.2em", margin: "-0.08em 0 -0.2em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${-out * 125}%)` }}>{a}</span>
      <span style={{ position: "absolute", left: "50%", top: "0.08em", transform: `translate(-50%, ${(1 - inn) * 125}%)` }}>{b}</span>
    </span>
  );
};

const Hook: React.FC<{ f: number }> = ({ f }) => {
  if (f >= T.hookOut + 10) return null;
  const slam = sp(f, -3);
  const strike = ease(f, 26, 32, Easing.out(Easing.cubic)) * (1 - ease(f, 36, 41, Easing.in(Easing.cubic)));
  const roll = sp(f, T.roll);
  const out = ease(f, T.hookOut, T.hookOut + 8, Easing.in(Easing.cubic));
  const line = (node: React.ReactNode, size: number) => (
    <div style={{ overflow: "hidden", padding: "0.1em 0 0.2em", margin: "-0.1em 0 -0.2em" }}>
      <div style={{ fontSize: size, transform: `translateY(${-out * 130}%)` }}>{node}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 300, left: 40, right: 40, textAlign: "center", fontFamily: IT, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.05, color: INK }}>
      {line(<Swap f={f} a="Arrête de publier" b="Publie-la" at={36} />, 92)}
      {line(
        <div style={{ position: "relative", display: "inline-block", transform: `scale(${mix(1.9, 1, slam)})` }}>
          <span style={{ display: "inline-flex", alignItems: "baseline", fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 1.15 }}>
            <span style={{ display: "inline-block", width: "0.6em", height: "1.15em", overflow: "hidden", textAlign: "center" }}>
              <span style={{ display: "block", transform: `translateY(${-roll * 1.15}em)` }}>
                <span style={{ display: "block", height: "1.15em" }}>3</span>
                <span style={{ display: "block", height: "1.15em" }}>1</span>
              </span>
            </span>
            <span>&nbsp;fois</span>
          </span>
          <div style={{ position: "absolute", left: -16, right: -16, top: "54%", height: 18, marginTop: -9, borderRadius: 9, background: INK, transform: `rotate(-5deg) scaleX(${strike})`, transformOrigin: f < 36 ? "0 50%" : "100% 50%" }} />
        </div>,
        300,
      )}
      {line(<Swap f={f} a={<Rise k={f} enter={6}>la même vidéo.</Rise>} b="partout." at={40} />, 92)}
    </div>
  );
};

/** Les trois logos claquent, puis fusionnent en point rouge. */
const HookLogos: React.FC<{ f: number }> = ({ f }) => {
  if (f >= T.merge[1]) return null;
  const merge = ease(f, T.merge[0], T.merge[1], Easing.in(Easing.cubic));
  return (
    <>
      {BRANDS.map((x, i) => {
        const s = sp(f, 8 + i * 4);
        const cx = mix(CENTER.x + (i - 1) * 180, CENTER.x, merge);
        return (
          <div key={x.b} style={{ position: "absolute", left: cx - 66, top: CENTER.y - 66, width: 132, height: 132, borderRadius: 38, background: INK, boxShadow: shadow(0.9), display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s * mix(1, 0.16, merge)}) rotate(${(1 - s) * -20 + merge * (i - 1) * 60}deg)` }}>
            <BrandLogo brand={x.b} size={64} color="#fff" />
          </div>
        );
      })}
    </>
  );
};

/* -------------------------------------------------------------- Légendes */

const CAPTIONS: { lines: [string, number][]; sub?: [string, number]; exit: number }[] = [
  {
    lines: [
      ["1 clic.", T.press + 2],
      ["3 plateformes.", T.split + 2],
    ],
    exit: T.regroup[0] - 6,
  },
  { lines: [["Programme.", T.phone + 4]], sub: ["Uplink publie à ta place.", T.phone + 10], exit: T.giantBack - 6 },
  {
    lines: [
      ["Ta commu", T.cardC],
      ["prévenue.", T.cardC + 3],
    ],
    sub: ["Les liens partent sur Discord.", T.cardC + 8],
    exit: T.msgOut - 2,
  },
  {
    lines: [
      ["Tes stats.", T.stats + 4],
      ["Tes revenus.", T.stats + 8],
    ],
    exit: T.back,
  },
];

const Captions: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", top: 236, left: 64, right: 150, fontFamily: IT, color: INK }}>
    {CAPTIONS.map((c, i) =>
      f >= c.lines[0][1] && f < c.exit + 6 ? (
        <div key={i}>
          {c.lines.map(([t, at], j) => (
            <div key={j} style={{ fontSize: 116, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.04, whiteSpace: "nowrap" }}>
              {t.split(" ").map((w, wi) => (
                <React.Fragment key={wi}>
                  <Rise k={f} enter={at + wi * 2} exit={c.exit}>
                    {w}
                  </Rise>{" "}
                </React.Fragment>
              ))}
            </div>
          ))}
          {c.sub && (
            <div style={{ marginTop: 18, fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em", color: GREY, whiteSpace: "nowrap" }}>
              <Rise k={f} enter={c.sub[1]} exit={c.exit}>
                {c.sub[0]}
              </Rise>
            </div>
          )}
        </div>
      ) : null,
    )}
  </div>
);

/** Le texte final dans le « monde » : la caméra recule et le révèle autour du téléphone devenu « o ». */
const ClosingLine: React.FC<{ d: Dev }> = ({ d }) => {
  const z = zoomOf(d.e);
  const text: React.CSSProperties = { position: "absolute", fontFamily: IT, fontWeight: 700, fontSize: 190, letterSpacing: "-0.04em", lineHeight: 1, color: INK, whiteSpace: "nowrap" };
  const top = (base: number) => base - 0.864 * 190;
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${O.x}px ${O.y}px`, transform: `translate(${d.cx - O.x}px, ${d.cy - O.y}px) scale(${z})` }}>
      <div style={{ ...text, left: 0, right: 0, textAlign: "center", top: top(LINE1_BASE) }}>Publie</div>
      <div style={{ ...text, right: 1080 - (O.x - O.adv / 2), top: top(LINE2_BASE), textAlign: "right" }}>part</div>
      <div style={{ ...text, left: O.x + O.adv / 2, top: top(LINE2_BASE) }}>ut</div>
    </div>
  );
};

/* ------------------------------------------------------------------ Plan */

const Shot: React.FC = () => {
  const f = useCurrentFrame();
  const d = dev(f);
  const dp = dev(f - 1);
  const ob = blurOf(Math.abs(d.w - dp.w) / 2 + Math.abs(d.cx - dp.cx), Math.abs(d.h - dp.h) / 2 + Math.abs(d.cy - dp.cy), 0.16, 8);
  const dot = redDot(f);
  const dotP = redDot(f - 1);
  const db = blurOf(dot.x - dotP.x, dot.y - dotP.y, 0.35, 12);
  const pt = pointer(f);
  const ptP = pointer(f - 1);
  const pb = blurOf(pt.x - ptP.x, pt.y - ptP.y, 0.3, 14);
  const zb = f >= T.pull ? Math.min(6, Math.abs(zoomOf(d.e) - zoomOf(dp.e)) * 22) : 0;
  const sl = f >= T.split && f < T.regroup[1] ? slices(f) : null;
  const slP = sl ? slices(f - 1) : null;
  const sb = sl && slP ? blurOf(0, Math.max(...sl.map((s, i) => Math.abs(s.y - slP[i].y))), 0.3, 8) : { sx: 0, sy: 0 };
  const gi = giant(f);
  const giP = giant(f - 1);
  const gb = blurOf(gi.x - giP.x, gi.y - giP.y + (gi.s - giP.s) * 120, 0.3, 12);
  const showGiant = f >= T.giant && f < T.giantBack + 10;
  const mr = msgRect(f);
  const mrP = msgRect(f - 1);
  const mb = blurOf(Math.abs(mr.x - mrP.x) + Math.abs(mr.w - mrP.w) / 2, Math.abs(mr.y - mrP.y) + Math.abs(mr.h - mrP.h) / 2, 0.2, 10);
  const st = statRects(f);
  const stP = statRects(f - 1);
  const stb = blurOf(Math.max(...st.map((r, i) => Math.abs(r.x - stP[i].x))), Math.max(...st.map((r, i) => Math.abs(r.y - stP[i].y))), 0.25, 10);
  const press = pt.press;
  const ripple = ease(f, T.press + 1, T.press + 12, Easing.out(Easing.cubic));
  const label = sp(f, T.open);
  const pillLeft = d.cx - d.w / 2;

  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <Blur id="mb-obj" sx={ob.sx} sy={ob.sy} />
      <Blur id="mb-dot" sx={db.sx} sy={db.sy} />
      <Blur id="mb-ptr" sx={pb.sx} sy={pb.sy} />
      <Blur id="mb-zoom" sx={zb} sy={zb} />
      <Blur id="mb-sl" sx={sb.sx} sy={sb.sy} />
      <Blur id="mb-gi" sx={gb.sx} sy={gb.sy} />
      <Blur id="mb-msg" sx={mb.sx} sy={mb.sy} />
      <Blur id="mb-st" sx={stb.sx} sy={stb.sy} />

      <Hook f={f} />
      <HookLogos f={f} />

      {f >= T.pull && (
        <div style={{ position: "absolute", inset: 0, filter: blurUrl(zb, zb, "mb-zoom") }}>
          <ClosingLine d={d} />
        </div>
      )}

      {/* L'objet unique */}
      {devVisible(f) && (
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${d.cx}px ${d.cy}px`, transform: `scale(${1 - 0.05 * press})`, filter: blurUrl(ob.sx, ob.sy, "mb-obj") }}>
          <div style={{ position: "absolute", left: d.cx - d.w / 2, top: d.cy - d.h / 2, width: d.w, height: d.h, borderRadius: d.r, background: d.border > 0.5 ? INK : d.bg, boxShadow: shadow(f < T.open ? 0.9 : 1 - clamp01(d.e)), overflow: "hidden" }}>
            <div style={{ position: "absolute", left: d.border, top: d.border, width: d.w - 2 * d.border, height: d.h - 2 * d.border, borderRadius: Math.max(0, d.r - d.border), background: d.bg, overflow: "hidden" }}>
              {f < T.open + 12 && (
                <div style={{ position: "absolute", left: mix(518, 305, sp(f, T.pill)) + mix(44, 132, sp(f, T.pill)) / 2 - pillLeft + 40, top: 0, height: Math.max(132, d.h), display: "flex", alignItems: "center", transform: `translateY(${-label * 160}px)`, fontFamily: IT, fontWeight: 600, fontSize: 58, letterSpacing: "-0.02em", color: "#fff", whiteSpace: "nowrap" }}>
                  Publier
                </div>
              )}
              {f >= T.open && f < T.split && (
                <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${S_CARD})` }}>
                  {[0, 1, 2].map((i) => (
                    <PlatformRow key={i} i={i} f={f} />
                  ))}
                </div>
              )}
              {f >= T.regroup[1] && <PhoneContent f={f} d={d} />}
              {f > T.press && ripple < 1 && (
                <div style={{ position: "absolute", left: 640 - pillLeft - 90 * ripple, top: 1028 - (d.cy - d.h / 2) - 90 * ripple, width: 180 * ripple, height: 180 * ripple, borderRadius: "50%", border: `${(1 - ripple) * 10}px solid rgba(255,255,255,0.55)`, boxSizing: "border-box" }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* La carte qui se divise en trois plateformes */}
      {sl && (
        <div style={{ position: "absolute", inset: 0, filter: blurUrl(sb.sx, sb.sy, "mb-sl") }}>
          {sl.map((s, i) => (
            <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, background: "#fff", borderRadius: `${s.rt}px ${s.rt}px ${s.rb}px ${s.rb}px`, boxShadow: shadow(0.9), overflow: "hidden" }}>
              <div style={{ transformOrigin: "0 0", transform: `scale(${s.w / NAT_W})` }}>
                <PlatformRow i={i} f={f} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* « 19:00 » géant */}
      {showGiant && (
        <div style={{ position: "absolute", left: gi.x, top: gi.y, transform: `translate(-50%, -50%) scale(${gi.s})`, fontFamily: IT, fontWeight: 700, fontSize: 280, letterSpacing: "-0.05em", lineHeight: 1, color: INK, whiteSpace: "nowrap", filter: blurUrl(gb.sx, gb.sy, "mb-gi") }}>19:00</div>
      )}

      {/* Le message Discord sorti du téléphone */}
      {f >= T.msg && f < T.stats && (
        <div style={{ position: "absolute", left: mr.x, top: mr.y, width: mr.w, height: mr.h, borderRadius: mr.r, background: "#fff", boxShadow: shadow(1), overflow: "hidden", filter: blurUrl(mb.sx, mb.sy, "mb-msg") }}>
          <div style={{ transformOrigin: "0 0", transform: `scale(${mr.w / 880})` }}>
            <Message f={f} />
          </div>
        </div>
      )}

      {/* Trois chiffres, puis retour dans le téléphone */}
      {f >= T.stats && f < T.cardD + 2 && (
        <div style={{ position: "absolute", inset: 0, filter: blurUrl(stb.sx, stb.sy, "mb-st") }}>
          {st.map((r, i) => (
            <div key={i} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: r.r, background: "#fff", boxShadow: shadow(1), overflow: "hidden" }}>
              <div style={{ transformOrigin: "0 0", transform: `scale(${r.w / 880})` }}>
                <StatContent f={f} i={i} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Le point rouge */}
      {f >= T.dot && (
        <div style={{ position: "absolute", left: dot.x - dot.r, top: dot.y - dot.r, width: dot.r * 2, height: dot.r * 2, borderRadius: "50%", background: RED, boxShadow: `0 ${dot.r * 0.25}px ${dot.r * 0.8}px rgba(255,59,48,0.28)`, filter: blurUrl(db.sx, db.sy, "mb-dot") }} />
      )}

      {/* Pointeur */}
      {f >= T.ptrIn && f < T.ptrOut + 14 && (
        <div style={{ position: "absolute", left: pt.x - 6, top: pt.y - 4, transformOrigin: "6px 4px", transform: `scale(${1 - 0.14 * press})`, filter: blurUrl(pb.sx, pb.sy, "mb-ptr") }}>
          <svg width={66} height={80} viewBox="0 0 66 80" style={{ filter: "drop-shadow(0 6px 10px rgba(17,17,19,0.25))" }}>
            <path d="M6 4 L6 62 L20 49 L30 72 L40 67 L30 45 L50 45 Z" fill={INK} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <Captions f={f} />

      {/* Fin : promesse et adresse */}
      <div style={{ position: "absolute", top: 1316 - 0.864 * 84, left: 0, right: 0, textAlign: "center", fontFamily: IT, fontWeight: 700, fontSize: 84, letterSpacing: "-0.04em", lineHeight: 1, color: INK }}>
        {f >= T.line2 &&
          "Pilote tout.".split(" ").map((w, i) => (
            <React.Fragment key={i}>
              <Rise k={f} enter={T.line2 + i * 2}>
                {w}
              </Rise>{" "}
            </React.Fragment>
          ))}
      </div>
      {f >= T.sign && (
        <div style={{ position: "absolute", top: 1362, left: 0, right: 0, textAlign: "center", fontFamily: IT, fontSize: 38, fontWeight: 600, letterSpacing: "-0.01em", color: GREY }}>
          <Rise k={f} enter={T.sign}>
            <span style={{ color: INK, fontWeight: 700 }}>Uplink</span> · www.dsociety.fr/uplink
          </Rise>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const OneTake: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  return frame >= HOLD_FROM ? (
    <Freeze frame={HOLD_FROM}>
      <Shot />
    </Freeze>
  ) : (
    <Shot />
  );
};

/** Durée vérifiée à la compilation : la fin immobile doit tomber après le dernier élément. */
if (HOLD_FROM <= T.sign) throw new Error("La fin immobile commence avant la signature.");
