/** Accroche TikTok (0–2,6 s) : « Arrête de publier 3 fois la même vidéo. » → « Publie-la 1 fois partout. » */
import React from "react";
import { AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { mix } from "../motion";
import { LogoMark } from "../tour/Caption";
import { FONT } from "../tour/kit";
import { ease, Word } from "./parts";

export const HOOK_END = 78;
/** Point de fusion des logos, centre du volet qui ouvre la suite. */
export const MERGE = { x: 540, y: 1216 };
export const PORTAL_START = 64;

const ACCENT_ON_DARK = "#A78BFA";
const STRIKE = "#FF3B5C";
const SLAMS = [-3, 10, 14, 18, 54];

function shake(frame: number) {
  let x = 0;
  let y = 0;
  for (const s of SLAMS) {
    const d = frame - s;
    if (d < 0 || d > 16) continue;
    const a = 12 * Math.exp(-d / 3.2);
    x += a * Math.sin(d * 2.3 + s);
    y += a * Math.cos(d * 2.9 + s) * 0.7;
  }
  return { x, y };
}

/** Remplace un texte par un autre : l'ancien sort par le haut, le nouveau (plus court) monte à sa place. */
const Swap: React.FC<{ a: React.ReactNode; b: React.ReactNode; at: number }> = ({ a, b, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = ease(frame, at, at + 6, Easing.in(Easing.cubic));
  const inn = spring({ frame: frame - at - 4, fps, config: { damping: 20, stiffness: 300, mass: 0.6 } });
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "nowrap", padding: "0.06em 0.04em 0.18em", margin: "-0.06em 0 -0.18em" }}>
      <span style={{ display: "inline-block", transform: `translateY(${-out * 125}%)` }}>{a}</span>
      <span style={{ position: "absolute", left: "50%", top: "0.06em", transform: `translate(-50%, ${(1 - inn) * 125}%)` }}>{b}</span>
    </span>
  );
};

const BRAND_TILES: { brand: Brand; bg: string; ring?: string }[] = [
  { brand: "tiktok", bg: "#000", ring: "inset 0 0 0 2px rgba(255,255,255,0.22)" },
  { brand: "youtube", bg: "#FF0033" },
  { brand: "instagram", bg: "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 28%, #D62976 55%, #962FBF 78%, #4F5BD5 100%)" },
];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sh = shake(frame);
  // « 3 fois » claque dès la première image (déjà en mouvement à l'image 0).
  const slam = spring({ frame: frame + 3, fps, config: { damping: 15, stiffness: 240, mass: 0.7 } });
  const strike = ease(frame, 27, 33, Easing.out(Easing.cubic)) * (1 - ease(frame, 36, 41, Easing.in(Easing.cubic)));
  const roll = spring({ frame: frame - 38, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  const merge = ease(frame, 44, 56, Easing.in(Easing.cubic));
  const glow = 0.28 + (frame >= 54 ? 0.22 * Math.exp(-(frame - 54) / 8) : 0);
  const big: React.CSSProperties = { fontSize: 88, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05, color: "#fff" };

  return (
    <AbsoluteFill style={{ background: "#0B0B12", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 42% at 50% 44%, rgba(124,58,237,${glow}) 0%, rgba(124,58,237,0) 70%)` }} />
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)`, fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 470, left: 40, right: 40, textAlign: "center" }}>
          <div style={big}>
            <Swap a="Arrête de publier" b="Publie-la" at={36} />
          </div>
          <div style={{ position: "relative", display: "inline-block", marginTop: 6, transform: `scale(${mix(2.1, 1, slam)})` }}>
            <span style={{ display: "inline-flex", alignItems: "baseline", fontSize: 250, fontWeight: 800, letterSpacing: -10, lineHeight: 1.2, color: ACCENT_ON_DARK }}>
              <span style={{ display: "inline-block", width: "0.56em", height: "1.2em", overflow: "hidden", textAlign: "center" }}>
                <span style={{ display: "block", transform: `translateY(${-roll * 1.2}em)` }}>
                  <span style={{ display: "block", height: "1.2em" }}>3</span>
                  <span style={{ display: "block", height: "1.2em" }}>1</span>
                </span>
              </span>
              <span>&nbsp;fois</span>
            </span>
            <div style={{ position: "absolute", left: -18, right: -18, top: "52%", height: 20, marginTop: -10, borderRadius: 10, background: STRIKE, transform: `rotate(-5deg) scaleX(${strike})`, transformOrigin: frame < 36 ? "0 50%" : "100% 50%" }} />
          </div>
          <div style={{ ...big, marginTop: 4 }}>
            <Swap a={<Word enter={6}>la même vidéo.</Word>} b="partout." at={40} />
          </div>
        </div>

        {/* Les trois plateformes claquent, puis fusionnent en une seule application. */}
        {frame < 58 &&
          BRAND_TILES.map((b, i) => {
            const s = spring({ frame: frame - (10 + i * 4), fps, config: { damping: 10, stiffness: 230, mass: 0.6 } });
            const x = mix(MERGE.x + (i - 1) * 180, MERGE.x, merge);
            return (
              <div
                key={b.brand}
                style={{
                  position: "absolute",
                  left: x - 68,
                  top: MERGE.y - 68,
                  width: 136,
                  height: 136,
                  borderRadius: 38,
                  background: b.bg,
                  boxShadow: `${b.ring ? b.ring + ", " : ""}0 26px 50px -18px rgba(0,0,0,0.6)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${s * mix(1, 0.3, merge)}) rotate(${(1 - s) * -28 + merge * (i - 1) * 70}deg)`,
                }}
              >
                <BrandLogo brand={b.brand} size={68} color="#fff" />
              </div>
            );
          })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Logo Uplink né de la fusion ; il se referme pendant que le volet ouvre la suite. */
export const MergeLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < 50 || frame >= HOOK_END) return null;
  const pop = spring({ frame: frame - 52, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const close = ease(frame, 66, 76, Easing.in(Easing.back(1.7)));
  const wave = ease(frame, 54, 72, Easing.out(Easing.cubic));
  return (
    <>
      <div style={{ position: "absolute", left: MERGE.x - 90 - wave * 330, top: MERGE.y - 90 - wave * 330, width: 180 + wave * 660, height: 180 + wave * 660, borderRadius: "50%", border: `6px solid ${ACCENT_ON_DARK}`, opacity: (1 - wave) * (frame >= 54 ? 0.9 : 0) }} />
      <div style={{ position: "absolute", left: MERGE.x - 88, top: MERGE.y - 88, transform: `scale(${pop * (1 - close)}) rotate(${(1 - pop) * -20}deg)` }}>
        <LogoMark size={176} />
      </div>
    </>
  );
};
