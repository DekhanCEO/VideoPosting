/**
 * Acte 2 — plan-séquence façon keynote (sans coupe, sans fondu). Fond clair #EEEEEC, encre presque noire, un seul
 * point rouge, Inter Tight. Le point de l'oscilloscope devient rouge et fait pousser un bouton « Publier » qu'un
 * pointeur presse ; le bouton s'ouvre en carte (TikTok, YouTube, Instagram en ligne), la carte se dote d'un cadre et
 * devient un téléphone ; la caméra recule, le contour du téléphone se referme en « o » de « partout » et le point
 * rouge vient se poser en point final. Ressorts à ~10 % de dépassement, flou de bougé proportionnel à la vitesse,
 * ombres douces en couches.
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { clamp01, mix } from "../motion";
import { Blur, GREY, GROUND, INK, IT, RED, Rise, SCREEN, blurOf, blurUrl, ease, shadow, sp } from "./motionKit";
import { DOT_X, LINE_Y } from "./Scope";

/** Chronologie locale (k = image depuis la fin de l'oscilloscope). */
export const K = { pill: 8, pointerIn: 24, press: 36, pointerOut: 44, card: 46, phone: 82, header: 88, island: 96, cards: [116, 156, 196], pull: 232, dotFly: 238, sub: 276 } as const;
export const KEYNOTE_LEN = 342;

/** Cible finale : le « o » de « partout » et son point (Inter Tight 700, 190 px). */
const O = { x: 600, y: 1128, w: 106, h: 108, stroke: 24, adv: 118 };
const LINE2_BASE = 1180;
const LINE1_BASE = 1000;
const FULL_STOP = { x: 846, y: 1165, r: 15 };
const PULL = { mass: 1, stiffness: 120, damping: 13 }; // ζ ≈ 0,59
const SHAPE = { mass: 1, stiffness: 120, damping: 24 }; // sans dépassement
const Z0 = 500 / O.w; // grossissement du monde au début du recul
/** Zoom interpolé en logarithme : vitesse perçue régulière, dépassement du ressort ressenti comme un léger « posé ». */
const zoomOf = (e: number) => Math.pow(Z0, 1 - e);

/* ------------------------------------------------------------ Géométrie */

interface Geo {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
  border: number;
  bg: string;
  shadow: number;
  e: number; // avancement du recul
  q: number; // avancement carte → téléphone
  o: number; // avancement bouton → carte
}

/** L'objet unique : point → bouton → carte → téléphone → « o ». */
function geometry(k: number): Geo {
  const g = sp(k, K.pill);
  const o = sp(k, K.card);
  const q = sp(k, K.phone);
  const e = sp(k, K.pull, PULL);
  const L = mix(518, 305, g);
  let w = mix(44, 470, g);
  let h = mix(44, 132, g);
  let cx = L + w / 2;
  let cy = LINE_Y;
  let r = h / 2;
  let border = 0;
  w = mix(w, 760, o);
  h = mix(h, 600, o);
  cx = mix(cx, 540, o);
  cy = mix(cy, 1010, o);
  r = mix(r, 52, o);
  w = mix(w, 500, q);
  h = mix(h, 1010, q);
  cy = mix(cy, 1040, q);
  r = mix(r, 76, q);
  border = mix(0, 16, q);
  if (k >= K.pull) {
    // Recul : la caméra (ressort à 10 %) et la forme (sans dépassement) restent cohérentes. Au grossissement Z0,
    // le téléphone mesure exactement la largeur du « o » ; sa forme se referme vers celle de la lettre.
    const m = sp(k, K.pull, SHAPE);
    const z = zoomOf(e);
    w = z * mix(w / Z0, O.w, m);
    h = z * mix(h / Z0, O.h, m);
    r = z * mix(r / Z0, O.w / 2, m);
    border = z * mix(border / Z0, O.stroke, m);
    cx = mix(cx, O.x, e);
    cy = mix(cy, O.y, e);
  }
  let bg = INK;
  if (k >= K.card) bg = interpolateColors(ease(k, K.card, K.card + 6), [0, 1], [INK, "#FFFFFF"]);
  if (k >= K.phone) bg = interpolateColors(clamp01(q), [0, 1], ["#FFFFFF", SCREEN]);
  if (k >= K.pull) bg = interpolateColors(clamp01(e), [0, 0.7], [SCREEN, GROUND]);
  const sh = (k < K.card ? 0.9 : 1) * (1 - clamp01(e));
  return { cx, cy, w, h, r, border, bg, shadow: sh, e, q, o };
}

/** Caméra pendant le téléphone : léger suivi de la carte active, neutralisé par le recul. */
function camera(k: number, e: number) {
  const y = (-20 * sp(k, K.cards[1]) - 22 * sp(k, K.cards[2])) * (1 - clamp01(e));
  const z = 1 + 0.03 * sp(k, K.cards[0]) * (1 - clamp01(e));
  return { y, z };
}
const camApply = (p: { x: number; y: number }, c: { x: number; y: number }, cam: { y: number; z: number }) => ({ x: c.x + cam.z * (p.x - c.x), y: c.y + cam.z * (p.y - c.y) + cam.y });

/** Placement de la carte « En ligne partout » (coordonnées naturelles de l'écran, 468 px de large). */
function cardA(k: number) {
  const q = sp(k, K.phone);
  return { x: mix(31, 16, q), y: mix(28, 152, q), s: mix(1.6, 1, q) };
}
/** Échelle du contenu de l'écran (1 jusqu'au recul, puis proportionnelle au téléphone qui rétrécit). */
const contentScale = (k: number, g: Geo) => (k < K.pull ? 1 : (g.w - 2 * g.border) / 468);

/** Position (écran) de l'emplacement du point rouge dans l'en-tête de la carte. */
function dotSlot(k: number) {
  const g = geometry(k);
  const a = cardA(k);
  const cs = contentScale(k, g);
  const p = { x: g.cx - g.w / 2 + g.border + cs * (a.x + a.s * 32), y: g.cy - g.h / 2 + g.border + cs * (a.y + a.s * 38) };
  return { p: camApply(p, { x: g.cx, y: g.cy }, camera(k, g.e)), r: 8 * a.s * cs };
}

/** Le point rouge, du point de l'oscilloscope au point final. */
function redDot(k: number) {
  const g0 = sp(k, 0);
  const gp = sp(k, K.pill);
  const geo = geometry(k);
  let x: number = DOT_X;
  let y: number = LINE_Y;
  let r = mix(9, 22, g0);
  // dans le bouton : sur la gauche, centré dans l'arrondi
  const pillDot = { x: mix(518, 305, gp) + mix(44, 132, gp) / 2, y: LINE_Y };
  if (k >= K.pill) {
    // le bouton s'enfonce de 5 % autour de son centre quand on le presse
    x = geo.cx + (1 - 0.05 * pointer(k).press) * (pillDot.x - geo.cx);
    r = mix(r, 18, gp);
  }
  if (k >= K.card) {
    const slot = dotSlot(k);
    x = mix(pillDot.x, slot.p.x, geo.o);
    y = mix(pillDot.y, slot.p.y, geo.o);
    r = mix(18, slot.r, geo.o);
  }
  if (k >= K.dotFly) {
    const slot = dotSlot(k);
    const d = sp(k, K.dotFly, { mass: 1, stiffness: 110, damping: 12.4 });
    // la cible suit le texte pendant que la caméra se pose
    const z = zoomOf(geo.e);
    const tx = geo.cx + z * (FULL_STOP.x - O.x);
    const ty = geo.cy + z * (FULL_STOP.y - O.y);
    x = mix(slot.p.x, tx, d);
    y = mix(slot.p.y, ty, d) - 190 * Math.sin(Math.PI * clamp01(d));
    r = mix(slot.r, z * FULL_STOP.r, d);
  }
  return { x, y, r };
}

/** Pointeur : entre, presse, repart. */
function pointer(k: number) {
  const tip = { x: 650, y: 1030 };
  const i = sp(k, K.pointerIn, { mass: 1, stiffness: 140, damping: 14 });
  let x = mix(1010, tip.x, i);
  let y = mix(1660, tip.y, i);
  const out = ease(k, K.pointerOut, K.pointerOut + 13, Easing.in(Easing.cubic));
  x = mix(x, 1250, out);
  y = mix(y, 1380, out);
  const press = k >= K.press ? Math.sin(clamp01((k - K.press) / 6) * Math.PI) : 0;
  return { x, y, press };
}

/* ------------------------------------------------------------- Rendu */

const CAPTIONS: { lines: [string, number][]; exit: number }[] = [
  {
    lines: [
      ["1 clic.", K.press + 1],
      ["3 plateformes.", 56],
    ],
    exit: K.phone,
  },
  { lines: [["Programme.", K.cards[0]]], exit: K.cards[1] - 6 },
  {
    lines: [
      ["Ta commu", K.cards[1]],
      ["prévenue.", K.cards[1] + 3],
    ],
    exit: K.cards[2] - 6,
  },
  {
    lines: [
      ["Tes stats.", K.cards[2]],
      ["Tes revenus.", K.cards[2] + 4],
    ],
    exit: K.pull - 6,
  },
];

const Captions: React.FC<{ k: number }> = ({ k }) => (
  <div style={{ position: "absolute", top: 236, left: 64, right: 150, fontFamily: IT, fontWeight: 700, fontSize: 116, letterSpacing: "-0.045em", lineHeight: 1.04, color: INK }}>
    {CAPTIONS.map((c, i) =>
      k >= c.lines[0][1] && k < c.exit + 6 ? (
        <div key={i}>
          {c.lines.map(([t, at], j) => (
            <div key={j} style={{ whiteSpace: "nowrap" }}>
              {t.split(" ").map((w, wi) => (
                <React.Fragment key={wi}>
                  <Rise k={k} enter={at + wi * 2} exit={c.exit}>
                    {w}
                  </Rise>{" "}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      ) : null,
    )}
  </div>
);

const BRANDS: { b: Brand; n: string }[] = [
  { b: "tiktok", n: "TikTok" },
  { b: "youtube", n: "YouTube" },
  { b: "instagram", n: "Instagram" },
];

/** Carte « En ligne partout » (largeur naturelle 436). L'emplacement du point rouge est laissé libre. */
const CardA: React.FC<{ k: number; bg: string }> = ({ k, bg }) => (
  <div style={{ width: 436, padding: "22px 24px", borderRadius: 28, background: bg, fontFamily: IT, color: INK }}>
    <div style={{ display: "flex", alignItems: "center", height: 32 }}>
      <div style={{ width: 16, height: 16, marginRight: 12 }} />
      <div style={{ fontSize: 22, fontWeight: 600, flex: 1 }}>En ligne partout</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: GREY }}>3/3</div>
    </div>
    <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>Clutch 1v4 en ranked</div>
    {BRANDS.map((x, i) => {
      const pop = sp(k, 60 + i * 6);
      return (
        <div key={x.b} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, height: 64 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "#F1F1EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BrandLogo brand={x.b} size={26} color={INK} />
          </div>
          <div style={{ flex: 1, fontSize: 24, fontWeight: 600 }}>{x.n}</div>
          <div style={{ transform: `scale(${pop})`, background: INK, color: "#fff", fontSize: 17, fontWeight: 600, borderRadius: 20, padding: "7px 13px" }}>Publiée ✓</div>
        </div>
      );
    })}
  </div>
);

const SmallCard: React.FC<{ k: number; at: number; y: number; h: number; children: React.ReactNode }> = ({ k, at, y, h, children }) => {
  if (k < at) return null;
  const p = sp(k, at);
  return (
    <div style={{ position: "absolute", left: 16, top: y, width: 436, height: h, borderRadius: 26, background: "#fff", boxShadow: shadow(0.7), transform: `translateY(${(1 - p) * 60}px) scale(${mix(0.7, 1, p)})`, fontFamily: IT, color: INK, display: "flex", alignItems: "center", gap: 16, padding: "0 22px", boxSizing: "border-box" }}>
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

/** Contenu de l'écran (coordonnées naturelles 468 × 978). */
const ScreenContent: React.FC<{ k: number; g: Geo }> = ({ k, g }) => {
  const a = cardA(k);
  const head = sp(k, K.header);
  const island = sp(k, K.island);
  // un compteur ne revient jamais en arrière : courbe sans dépassement
  const c = ease(k, K.cards[2] + 4, K.cards[2] + 22, Easing.out(Easing.cubic));
  const subs = Math.round(5990 * c);
  const rev = Math.round(4918 * c);
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/ /g, " ");
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 468, height: 978, transformOrigin: "0 0", transform: `scale(${contentScale(k, g)})`, clipPath: k >= K.pull ? `circle(${(1 - ease(k, K.pull + 2, K.pull + 16, Easing.in(Easing.cubic))) * 620}px at 234px 489px)` : undefined }}>
      {/* en-tête de l'application */}
      {k >= K.header && (
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
      {k >= K.island && <div style={{ position: "absolute", left: 234 - 58, top: 12, width: 116, height: 34, borderRadius: 17, background: INK, transform: `scale(${island})` }} />}
      {/* la carte qui était le bouton */}
      <div style={{ position: "absolute", left: a.x, top: a.y, transformOrigin: "0 0", transform: `scale(${a.s})`, borderRadius: 28, boxShadow: shadow(clamp01(g.q) * 0.7) }}>
        <CardA k={k} bg={k < K.phone ? g.bg : "#FFFFFF"} />
      </div>
      <SmallCard k={k} at={K.cards[0]} y={520} h={104}>
        <Tile>
          <ClockIcon />
        </Tile>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 23, fontWeight: 700 }}>Programmé</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>Ce soir · 19:00</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em" }}>19:00</div>
      </SmallCard>
      <SmallCard k={k} at={K.cards[1]} y={636} h={104}>
        <Tile>
          <BrandLogo brand="discord" size={30} color={INK} />
        </Tile>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 23, fontWeight: 700 }}>Annonce envoyée</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>#annonces · 3 liens</div>
        </div>
        <div style={{ background: INK, color: "#fff", fontSize: 17, fontWeight: 600, borderRadius: 20, padding: "7px 13px" }}>Discord ✓</div>
      </SmallCard>
      <SmallCard k={k} at={K.cards[2]} y={752} h={150}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em" }}>+{fmt(subs)}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>abonnés · 28 jours</div>
        </div>
        <div style={{ width: 1, height: 84, background: "#E4E4E1" }} />
        <div style={{ flex: 1, paddingLeft: 6 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em" }}>{fmt(rev)} €</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: GREY, marginTop: 2 }}>revenus ce mois</div>
        </div>
      </SmallCard>
      {k >= K.header && <div style={{ position: "absolute", left: 234 - 70, top: 958, width: 140, height: 5, borderRadius: 3, background: INK, transform: `scaleX(${head})` }} />}
    </div>
  );
};

/** Le texte final dans le « monde » : la caméra recule et le révèle autour du téléphone devenu « o ». */
const ClosingLine: React.FC<{ g: Geo }> = ({ g }) => {
  const z = zoomOf(g.e);
  const text: React.CSSProperties = { position: "absolute", fontFamily: IT, fontWeight: 700, fontSize: 190, letterSpacing: "-0.04em", lineHeight: 1, color: INK, whiteSpace: "nowrap" };
  const top = (base: number) => base - 0.864 * 190;
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${O.x}px ${O.y}px`, transform: `translate(${g.cx - O.x}px, ${g.cy - O.y}px) scale(${z})` }}>
      <div style={{ ...text, left: 0, right: 0, textAlign: "center", top: top(LINE1_BASE) }}>Publie</div>
      <div style={{ ...text, right: 1080 - (O.x - O.adv / 2), top: top(LINE2_BASE), textAlign: "right" }}>part</div>
      <div style={{ ...text, left: O.x + O.adv / 2, top: top(LINE2_BASE) }}>ut</div>
    </div>
  );
};

export const Keynote: React.FC = () => {
  const k = useCurrentFrame();
  const g = geometry(k);
  const gPrev = geometry(k - 1);
  const cam = camera(k, g.e);
  const iris = interpolate(k, [0, 9], [0, 2300], { easing: Easing.in(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // flou de bougé de l'objet (vitesse du centre et des bords)
  const ob = blurOf(Math.abs(g.w - gPrev.w) / 2 + Math.abs(g.cx - gPrev.cx), Math.abs(g.h - gPrev.h) / 2 + Math.abs(g.cy - gPrev.cy), 0.16, 8);
  const dot = redDot(k);
  const dotPrev = redDot(k - 1);
  const db = blurOf(dot.x - dotPrev.x, dot.y - dotPrev.y, 0.35, 12);
  const pt = pointer(k);
  const ptPrev = pointer(k - 1);
  const pb = blurOf(pt.x - ptPrev.x, pt.y - ptPrev.y, 0.3, 14);
  const zb = k >= K.pull ? Math.min(6, Math.abs(zoomOf(g.e) - zoomOf(gPrev.e)) * 22) : 0;
  const press = pt.press;
  const ripple = ease(k, K.press + 1, K.press + 12, Easing.out(Easing.cubic));
  const label = { x: (redDot(Math.min(k, K.card)).x - (g.cx - g.w / 2)) + 40, up: sp(k, K.card) };

  return (
    <AbsoluteFill style={{ clipPath: k < 9 ? `circle(${iris}px at ${DOT_X}px ${LINE_Y}px)` : undefined }}>
      <AbsoluteFill style={{ background: GROUND }} />
      <Blur id="mb-obj" sx={ob.sx} sy={ob.sy} />
      <Blur id="mb-dot" sx={db.sx} sy={db.sy} />
      <Blur id="mb-ptr" sx={pb.sx} sy={pb.sy} />
      <Blur id="mb-zoom" sx={zb} sy={zb} />

      {k >= K.pull && (
        <div style={{ position: "absolute", inset: 0, filter: blurUrl(zb, zb, "mb-zoom") }}>
          <ClosingLine g={g} />
        </div>
      )}

      {/* L'objet unique (bouton → carte → téléphone → « o ») */}
      {k >= K.pill && (
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${g.cx}px ${g.cy}px`, transform: `translateY(${cam.y}px) scale(${cam.z * (1 - 0.05 * press)})`, filter: blurUrl(ob.sx, ob.sy, "mb-obj") }}>
          <div style={{ position: "absolute", left: g.cx - g.w / 2, top: g.cy - g.h / 2, width: g.w, height: g.h, borderRadius: g.r, background: g.border > 0.5 ? INK : g.bg, boxShadow: shadow(g.shadow), overflow: "hidden" }}>
            <div style={{ position: "absolute", left: g.border, top: g.border, width: g.w - 2 * g.border, height: g.h - 2 * g.border, borderRadius: Math.max(0, g.r - g.border), background: g.bg, overflow: "hidden" }}>
              {k < K.card + 12 && (
                <div style={{ position: "absolute", left: label.x, top: 0, height: Math.max(132, g.h), display: "flex", alignItems: "center", transform: `translateY(${-label.up * 160}px)`, fontFamily: IT, fontWeight: 600, fontSize: 58, letterSpacing: "-0.02em", color: "#fff", whiteSpace: "nowrap" }}>
                  <span style={{ transform: "translateY(-1px)" }}>Publier</span>
                </div>
              )}
              {k >= K.card && <ScreenContent k={k} g={g} />}
              {/* onde de pression */}
              {k > K.press && ripple < 1 && (
                <div style={{ position: "absolute", left: pointer(K.press).x - (g.cx - g.w / 2) - 90 * ripple, top: pointer(K.press).y - (g.cy - g.h / 2) - 90 * ripple, width: 180 * ripple, height: 180 * ripple, borderRadius: "50%", border: `${(1 - ripple) * 10}px solid rgba(255,255,255,0.55)`, boxSizing: "border-box" }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Le point rouge (toujours au-dessus) */}
      <div style={{ position: "absolute", left: dot.x - dot.r, top: dot.y - dot.r, width: dot.r * 2, height: dot.r * 2, borderRadius: "50%", background: k < 6 ? interpolateColors(k, [0, 5], ["#F2FFF6", RED]) : RED, boxShadow: k < 6 ? `0 0 ${24 * (1 - k / 6)}px ${8 * (1 - k / 6)}px rgba(40,250,120,${0.8 * (1 - k / 6)})` : `0 ${dot.r * 0.25}px ${dot.r * 0.8}px rgba(255,59,48,0.28)`, filter: blurUrl(db.sx, db.sy, "mb-dot") }} />

      {/* Pointeur */}
      {k >= K.pointerIn && k < K.pointerOut + 14 && (
        <div style={{ position: "absolute", left: pt.x - 6, top: pt.y - 4, transformOrigin: "6px 4px", transform: `scale(${1 - 0.14 * press})`, filter: blurUrl(pb.sx, pb.sy, "mb-ptr") }}>
          <svg width={66} height={80} viewBox="0 0 66 80" style={{ filter: "drop-shadow(0 6px 10px rgba(17,17,19,0.25))" }}>
            <path d="M6 4 L6 62 L20 49 L30 72 L40 67 L30 45 L50 45 Z" fill={INK} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <Captions k={k} />

      {/* Signature */}
      {k >= K.sub && (
        <div style={{ position: "absolute", top: 1268, left: 0, right: 0, textAlign: "center", fontFamily: IT, fontSize: 40, fontWeight: 600, letterSpacing: "-0.01em", color: GREY }}>
          <Rise k={k} enter={K.sub}>
            <span style={{ color: INK, fontWeight: 700 }}>Uplink</span> · www.dsociety.fr/uplink
          </Rise>
        </div>
      )}
    </AbsoluteFill>
  );
};
