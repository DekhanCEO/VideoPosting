/**
 * « Suspense » — teaser de 15 s (9:16) construit comme une bande-annonce, pour donner le sentiment qu'Uplink est
 * indispensable : on vit d'abord la corvée, on s'arrête, puis on découvre la solution. Même univers que « Première »
 * (noir cinéma, spectre violet → corail), motion design selon le skill de LottieFiles.
 *
 *  0–4 s       La corvée (tension) : « Importer. Réécrire. Régler. » pour TikTok, puis YouTube, puis Instagram, de
 *              plus en plus vite, sur un battement de cœur qui accélère ; les fiches s'empilent ; « Recommencer. » ;
 *              le « ×3 » envahit l'écran : « Pour chaque vidéo. »
 *  4–5,3 s     Silence et noir : « Et si une fois suffisait ? »
 *  5,3–8 s     La révélation : un trait de lumière, des rubans, le logo, l'impact, « Uplink ».
 *  8–12,6 s    La preuve, en montage rapide : « 1 clic. 3 réseaux. », « Programmé. », « Ta commu prévenue. »,
 *              « Tes revenus suivis. »
 *  12,6–15 s   La chute : « Comment tu faisais avant ? », le logo, l'adresse.
 */
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { BrandLogo, type Brand } from "../brands";
import { useFonts } from "../fonts";
import { PlayGlyph } from "../icons";
import { DiscordScreen, PublishScreen } from "../tour/screens2";
import { ScheduleScreen } from "../tour/screens1";
import { Blur, Grain, IT, POP, Ring, SNAP, Vignette, blurOf, blurUrl, clamp01, ez, mix, sp, wave } from "../elan/kit";
import { At, CAMERA, DUR, ENTER, INK, LEAVE, MUTED, Poster, UplinkMark, appear, both, gradText, leave, remap } from "../premiere/parts";
import { Banner, DiscordCard, PLATS, REV_D, Spotlight, StudioPhone, TOP, TitleScene, type Pose } from "../premiere/Premiere";

export const SUSPENSE_DURATION = 450;
const CORAL = "#FF5C7A";
const CORAL_GRAD = "linear-gradient(180deg, #FFB4C2 0%, #FF5C7A 55%, #E11D48 100%)";

/* ================================================================== Temps forts */
const ROUNDS: { start: number; len: number; b: Brand; name: string }[] = [
  { start: 0, len: 40, b: "tiktok", name: "TikTok" },
  { start: 40, len: 30, b: "youtube", name: "YouTube" },
  { start: 70, len: 24, b: "instagram", name: "Instagram" },
];
const STEP_WORDS = ["Importer", "Réécrire", "Régler"];
const WORDS = [
  ...ROUNDS.flatMap((r) => STEP_WORDS.map((w, s) => ({ w, at: Math.round(r.start + (s * r.len) / 3) }))),
  { w: "Recommencer", at: 94 },
];
WORDS[0].at = -4; // l'image 0 montre déjà le premier mot
const HEARTS = [0, 13, 27, 40, 50, 60, 70, 78, 86, 94, 104];
const SLAM = 104;
const CUT = 120; // noir et silence
const QUESTION = 124;
const TITLE_OFFSET = 6; // image du générique de « Première » = image - 6
const DROP = 241; // la musique démarre, montage
const BEAT = 34;
const MONTAGE = [0, 1, 2, 3].map((k) => ({ start: DROP + k * BEAT, end: DROP + (k + 1) * BEAT }));
const OUTRO = DROP + 4 * BEAT; // 377

/* ================================================================== Acte I : la corvée */
const CAPTION = "Clutch 1v4 en ranked. Le round qui a tout retourné.";

/** Mot qui monte d'un masque et repart par le haut (rapide : la tension accélère). */
const SlotWord: React.FC<{ f: number; at: number; next?: number; children: React.ReactNode }> = ({ f, at, next, children }) => {
  if (f < at) return null;
  const inE = ez(f, at, at + 5, ENTER);
  const out = next === undefined ? 0 : ez(f, next - 2, next + 1, LEAVE);
  if (out >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - inE) * 110 - out * 115}%)` }}>{children}</div>
  );
};

const StepBody: React.FC<{ f: number; s: number; at: number; len: number }> = ({ f, s, at, len }) => {
  const v = f - at;
  const st = appear(v, 0, 5, 24, 0);
  if (s === 0) {
    const slide = ez(v, 0, 6, ENTER);
    const up = clamp01(v / len); // envoi : linéaire
    return (
      <div style={{ ...st, display: "flex", gap: 30, alignItems: "center", height: "100%", padding: "0 34px", border: "3px dashed rgba(255,255,255,0.22)", borderRadius: 30 }}>
        <div style={{ transform: `translateX(${(1 - slide) * 220}px)`, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <Poster i={7} w={150} h={266} title="Clutch" palette={0} radius={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#fff" }}>clutch.mp4</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: MUTED, marginTop: 6 }}>Importation…</div>
          <div style={{ marginTop: 22, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div style={{ width: `${up * 100}%`, height: "100%", background: "#fff", borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }
  if (s === 1) {
    const chars = Math.floor(CAPTION.length * clamp01(v / (len * 0.85)));
    return (
      <div style={{ ...st, height: "100%", padding: "28px 34px", borderRadius: 30, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: MUTED, letterSpacing: "0.08em" }}>LÉGENDE</div>
        <div style={{ marginTop: 14, fontSize: 38, fontWeight: 600, color: "#fff", lineHeight: 1.35, minHeight: 150 }}>
          {CAPTION.slice(0, chars)}
          <span style={{ display: "inline-block", width: 4, height: 40, marginLeft: 3, background: CORAL, verticalAlign: "text-bottom", opacity: Math.floor(f / 4) % 2 ? 1 : 0.2 }} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, opacity: ez(v, len * 0.8, len) }}>
          {["#valorant", "#clutch", "#fyp"].map((h) => (
            <span key={h} style={{ fontSize: 26, fontWeight: 700, color: "#C4B5FD", background: "rgba(155,107,255,0.16)", borderRadius: 12, padding: "6px 14px" }}>
              {h}
            </span>
          ))}
        </div>
      </div>
    );
  }
  const rows = ["Visibilité : public", "Format : vertical", "Commentaires"];
  return (
    <div style={{ ...st, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
      {rows.map((r, i) => {
        const on = ez(v, (i * len) / 4, (i * len) / 4 + 4, ENTER);
        return (
          <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 30px", borderRadius: 24, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 34, fontWeight: 600, color: "#fff" }}>{r}</span>
            <div style={{ width: 92, height: 52, borderRadius: 26, background: interpolateColors(on, [0, 1], ["rgba(255,255,255,0.18)", "#fff"]), position: "relative" }}>
              <div style={{ position: "absolute", top: 5, left: mix(5, 45, on), width: 42, height: 42, borderRadius: 21, background: interpolateColors(on, [0, 1], ["#fff", INK]) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const UploadPanel: React.FC<{ f: number; r: number }> = ({ f, r }) => {
  const R = ROUNDS[r];
  const inE = r === 0 ? 1 : ez(f, R.start - 2, R.start + 7, ENTER);
  // profondeur : chaque nouvelle fiche repousse les précédentes (la pile de travail grandit)
  const depth = ROUNDS.slice(r + 1).reduce((a, n) => a + ez(f, n.start - 2, n.start + 7, CAMERA), 0);
  const stepLen = R.len / 3;
  const s = Math.min(2, Math.max(0, Math.floor((f - R.start) / stepLen)));
  const stepAt = r === 0 && s === 0 ? -6 : Math.round(R.start + s * stepLen);
  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        top: 600,
        width: 800,
        height: 560,
        padding: 30,
        borderRadius: 40,
        background: "linear-gradient(180deg, rgba(34,32,44,0.98), rgba(18,18,24,0.98))",
        border: "1.5px solid rgba(255,255,255,0.12)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
        fontFamily: IT,
        opacity: inE,
        transform: `translateY(${(1 - inE) * 260 - depth * 74}px) scale(${(0.92 + 0.08 * inE) * (1 - 0.07 * depth)})`,
        filter: depth > 0.01 ? `brightness(${1 - 0.38 * depth})` : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, height: 60, marginBottom: 22 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "#0B0B10", border: "1.5px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BrandLogo brand={R.b} size={32} color="#fff" />
        </div>
        <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{R.name}</span>
        <span style={{ marginLeft: "auto", fontSize: 24, fontWeight: 600, color: MUTED }}>Nouvelle publication</span>
      </div>
      <div style={{ height: 418 }}>
        <StepBody key={s} f={f} s={s} at={stepAt} len={stepLen} />
      </div>
    </div>
  );
};

const ChoreScene: React.FC<{ f: number }> = ({ f }) => {
  const pulse = HEARTS.reduce((m, h) => (f >= h ? Math.max(m, Math.exp(-(f - h) / 4)) : m), 0);
  const amp = 7 * clamp01(f / 100) + (f >= SLAM ? 14 * Math.exp(-(f - SLAM) / 4) : 0);
  const shakeX = amp * (Math.sin(f * 1.9) + 0.5 * Math.sin(f * 4.3));
  const shakeY = amp * 0.7 * Math.cos(f * 2.7);
  const round = f < 40 ? 0 : f < 70 ? 1 : 2;
  const slam = sp(f, SLAM, POP);
  const glitch = f >= SLAM ? Math.exp(-(f - SLAM) / 3) : 0;
  const dimAll = ez(f, SLAM, SLAM + 6, ENTER);
  return (
    <AbsoluteFill style={{ transform: `translate(${shakeX}px, ${shakeY}px) scale(${1 + 0.012 * pulse})`, filter: `saturate(${1 - 0.45 * clamp01(f / 100)})${glitch > 0.02 ? ` drop-shadow(${(9 * glitch).toFixed(1)}px 0 0 rgba(255,60,100,0.75)) drop-shadow(${(-9 * glitch).toFixed(1)}px 0 0 rgba(60,210,255,0.6))` : ""}` }}>
      <AbsoluteFill style={{ background: `radial-gradient(110% 70% at 50% 50%, rgba(0,0,0,0) 45%, rgba(255,60,100,${0.08 + 0.16 * pulse}) 100%)` }} />
      <div style={{ opacity: 1 - 0.7 * dimAll }}>
        {ROUNDS.map((_, r) => (f >= ROUNDS[r].start - 2 ? <UploadPanel key={r} f={f} r={r} /> : null))}
      </div>
      {/* Le mot de l'étape */}
      <div style={{ position: "absolute", left: 64, right: 64, top: 340, height: 150, overflow: "hidden", fontFamily: IT, fontSize: 120, fontWeight: 800, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1.18, opacity: 1 - dimAll }}>
        {WORDS.map((w, i) => (
          <SlotWord key={i} f={f} at={w.at} next={WORDS[i + 1]?.at ?? SLAM}>
            {w.w}
            <span style={{ color: CORAL }}>.</span>
          </SlotWord>
        ))}
      </div>
      {/* Le compteur ×1 ×2 ×3, qui finit par envahir l'écran */}
      <div
        style={{
          position: "absolute",
          left: mix(930 - 320, 540 - 160, slam),
          top: mix(226, 760, slam),
          width: 320,
          textAlign: f >= SLAM ? "center" : "right",
          fontFamily: IT,
          fontSize: 100,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          transformOrigin: f >= SLAM ? "50% 50%" : "100% 50%",
          transform: `scale(${mix(1, 3.1, slam) * (1 + 0.25 * Math.exp(-Math.max(0, f - ROUNDS[round].start) / 3))})`,
          filter: `drop-shadow(0 0 ${30 + 30 * slam}px rgba(255,92,122,0.55))`,
        }}
      >
        <span style={{ background: CORAL_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>×{round + 1}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", fontFamily: IT, fontSize: 64, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", ...appear(f, SLAM + 3, 8, 24, 6) }}>Pour chaque vidéo.</div>
    </AbsoluteFill>
  );
};

/* ================================================================== Acte II : le silence */
const QuestionScene: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", fontFamily: IT, fontSize: 104, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1.1, color: "#fff" }}>
    <div style={both(appear(f, QUESTION, DUR.m + 4, 30, 12), leave(f, 149, 10, -20, 8))}>Et si une fois</div>
    <div style={both(appear(f, QUESTION + 6, DUR.m + 4, 30, 12), leave(f, 150, 10, -20, 8))}>
      <span style={gradText}>suffisait ?</span>
    </div>
  </div>
);

/* ================================================================== Acte IV : la preuve, en montage */
const BigTitle: React.FC<{ u: number; text: string }> = ({ u, text }) => {
  const lines = text.split("|");
  let k = 0;
  return (
    <div style={{ position: "absolute", top: 250, left: 64, right: 150, fontFamily: IT, color: "#fff" }}>
      {lines.map((line, li) => (
        <div key={li} style={{ fontSize: 124, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.0, whiteSpace: "nowrap" }}>
          {line.split(" ").map((w, wi, arr) => {
            const i = k++;
            const last = li === lines.length - 1 && wi === arr.length - 1 && w.endsWith(".");
            return (
              <React.Fragment key={wi}>
                <span style={{ display: "inline-block", ...appear(u, i * 2, DUR.s, 30, 8) }}>
                  {last ? (
                    <>
                      {w.slice(0, -1)}
                      <span style={gradText}>.</span>
                    </>
                  ) : (
                    w
                  )}
                </span>
                {wi < arr.length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const drift = (u: number, a: number, b: number) => mix(a, b, ez(u, -4, BEAT + 4, Easing.inOut(Easing.sin)));

const Beat1: React.FC<{ u: number }> = ({ u }) => {
  const pose = (x: number): Pose => ({ rotY: drift(x, -20, -10), rotX: 7, rotZ: -1, x: 0, y: 340 + wave(x, 120) * 5, scale: 0.78 });
  return (
    <>
      <StudioPhone p={pose(u)} q={pose(u - 1)} id="s1">
        <At screen={PublishScreen} time={remap(u, 30, 96, 126)} />
      </StudioPhone>
      {PLATS.map((p, i) => (
        <Banner key={p.b} t={u} at={3 + i * 4} y={600 + i * 132} p={p} />
      ))}
      <BigTitle u={u} text="1 clic.|3 réseaux." />
    </>
  );
};

const CLOCK: ({ seq: string[]; d: number } | { colon: true; d: number })[] = [
  { seq: ["", "6", "7", "8", "9", "0", "1"], d: 0 },
  { seq: ["", "3", "4", "5", "6", "7", "8", "9"], d: 2 },
  { colon: true, d: 4 },
  { seq: ["", "7", "8", "9", "0"], d: 5 },
  { seq: ["", "5", "6", "7", "8", "9", "0"], d: 7 },
];
const CLK = 280;
const CLOCK_ROLL = 16;
const Beat2: React.FC<{ u: number }> = ({ u }) => {
  const pose = (x: number): Pose => ({ rotY: drift(x, 18, 8), rotX: 10, rotZ: 3, x: 30, y: 450 + wave(x, 120) * 5, scale: 0.72 });
  return (
    <>
      <StudioPhone p={pose(u)} q={pose(u - 1)} id="s2">
        <At screen={ScheduleScreen} time={remap(u + 6, 34, 0, 44)} />
      </StudioPhone>
      <div style={{ position: "absolute", left: 0, right: 0, top: 452, textAlign: "center", fontFamily: IT, fontSize: 38, fontWeight: 600, color: "rgba(255,255,255,0.72)", ...appear(u, 2, DUR.s, 14, 4) }}>Ce soir</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 500, height: CLK, display: "flex", justifyContent: "center", fontFamily: IT, fontSize: CLK, fontWeight: 200, lineHeight: 1, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 0 60px rgba(155,107,255,0.45)" }}>
        {CLOCK.map((col, ci) => {
          if ("colon" in col) {
            return (
              <div key={ci} style={{ width: "0.3em", textAlign: "center", marginTop: "-0.05em", ...appear(u, 2 + col.d, DUR.s, 20, 0) }}>
                :
              </div>
            );
          }
          const k = ez(u, 2 + col.d, 2 + col.d + CLOCK_ROLL, ENTER) * (col.seq.length - 1);
          const kp = ez(u - 1, 2 + col.d, 2 + col.d + CLOCK_ROLL, ENTER) * (col.seq.length - 1);
          const b = blurOf(0, (k - kp) * CLK, 0.2, 18);
          return (
            <div key={ci} style={{ width: "0.56em", height: "1em", overflow: "hidden", textAlign: "center", filter: blurUrl(b, `sclk${ci}`) }}>
              <Blur id={`sclk${ci}`} sx={0} sy={b.sy} region={10} />
              <div style={{ transform: `translateY(${-k}em)` }}>
                {col.seq.map((d, di) => (
                  <div key={di} style={{ height: "1em", fontVariantNumeric: "tabular-nums" }}>
                    {d || " "}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <BigTitle u={u} text="Programmé." />
    </>
  );
};

const DISC_AT = 2;
const discFly = (u: number) => {
  const e = sp(u, DISC_AT, { mass: 1, stiffness: 150, damping: 15 });
  return { x: mix(720, 450, e), y: mix(1300, 1080, e), z: mix(-20, 220, e), ry: mix(-28, -8, e), s: mix(0.32, 1, e) };
};
const Beat3: React.FC<{ u: number }> = ({ u }) => {
  const pose = (x: number): Pose => ({ rotY: drift(x, -26, -16), rotX: -3, rotZ: -2, x: 170, y: 270 + wave(x, 120) * 5, scale: 0.86 });
  const c = discFly(u);
  const q = discFly(u - 1);
  const b = blurOf(c.x - q.x + (c.s - q.s) * 300, c.y - q.y, 0.3, 12);
  return (
    <>
      <StudioPhone p={pose(u)} q={pose(u - 1)} id="s3">
        <At screen={DiscordScreen} time={remap(u + 8, 34, 20, 96)} />
      </StudioPhone>
      {u >= DISC_AT && (
        <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 55%", filter: blurUrl(b, "sdisc") }}>
          <Blur id="sdisc" sx={b.sx} sy={b.sy} region={10} />
          <div style={{ position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) translate3d(0, ${wave(u, 70) * 5}px, ${c.z}px) rotateY(${c.ry}deg) scale(${c.s})` }}>
            <DiscordCard t={u + 12} />
          </div>
        </AbsoluteFill>
      )}
      <Ring f={u} at={12} x={772} y={978} r0={20} r1={120} dur={14} w0={6} color="#A5B4FC" alpha={0.9} />
      <BigTitle u={u} text="Ta commu|prévenue." />
    </>
  );
};

const Beat4: React.FC<{ u: number }> = ({ u }) => {
  const draw = ez(u, 3, 22, ENTER);
  const dot = sp(u, 20, SNAP);
  return (
    <>
      <div style={{ position: "absolute", left: 64, top: 540, width: 866, padding: "22px 26px 24px", borderRadius: 34, background: "linear-gradient(180deg, rgba(36,34,48,0.95), rgba(20,20,24,0.95))", border: "1.5px solid rgba(255,255,255,0.10)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: IT, ...appear(u, 0, DUR.s, 30, 6) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Revenus</span>
          <span style={{ width: 48, height: 48, borderRadius: 15, background: "rgba(155,107,255,0.2)", color: "#C4B5FD", fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>€</span>
        </div>
        <svg width={814} height={170} style={{ overflow: "visible", display: "block" }}>
          <defs>
            <linearGradient id="su-line" x1={0} y1={0} x2={1} y2={0}>
              <stop offset={0} stopColor="#8B5CF6" />
              <stop offset={0.6} stopColor="#E879F9" />
              <stop offset={1} stopColor={CORAL} />
            </linearGradient>
            <linearGradient id="su-area" x1={0} y1={0} x2={0} y2={1}>
              <stop offset={0} stopColor="#B794FF" stopOpacity={0.4} />
              <stop offset={1} stopColor="#B794FF" stopOpacity={0} />
            </linearGradient>
            <clipPath id="su-reveal">
              <rect x={-10} y={-20} width={10 + 834 * draw} height={210} />
            </clipPath>
          </defs>
          <path d={`${REV_D} L 814 170 L 0 170 Z`} fill="url(#su-area)" clipPath="url(#su-reveal)" />
          <path d={REV_D} fill="none" stroke="url(#su-line)" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          {dot > 0 && <circle cx={814} cy={14} r={11 * dot} fill="#fff" stroke={CORAL} strokeWidth={5} />}
        </svg>
      </div>
      <div style={{ position: "absolute", left: 64, top: 900, fontFamily: IT, fontSize: 32, fontWeight: 700, color: "#fff", ...appear(u, 6, DUR.s, 14, 4) }}>Top 3 de tes vidéos</div>
      {TOP.map((v, i) => {
        const left = 64 + i * 286;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left, top: 944, fontFamily: IT, fontSize: 300, fontWeight: 800, lineHeight: 1, color: INK, WebkitTextStroke: "5px rgba(255,255,255,0.78)", letterSpacing: "-0.06em", ...appear(u, 8 + i * 3, DUR.s, 26, 6) }}>{i + 1}</div>
            <div style={{ position: "absolute", left: left + 96, top: 960, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", borderRadius: 16, ...appear(u, 9 + i * 3, DUR.s, 26, 6) }}>
              <Poster i={40 + i} w={170} h={302} title={v.title} palette={v.pal} radius={16} />
            </div>
          </React.Fragment>
        );
      })}
      <BigTitle u={u} text="Tes revenus|suivis." />
    </>
  );
};
const BEATS = [Beat1, Beat2, Beat3, Beat4];

/** Un plan du montage : arrive et repart par un filé de 6 images (le premier arrive sur le « drop »). */
const MontageSlot: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  const { start, end } = MONTAGE[k];
  const B = BEATS[k];
  const xAt = (g: number) => (k > 0 ? 1080 * (1 - ez(g, start - 3, start + 3, CAMERA)) : 0) - (k < 3 ? 1080 * ez(g, end - 3, end + 3, CAMERA) : 0);
  const x = xAt(f);
  const b = blurOf(x - xAt(f - 1), 0, 0.3, 26);
  const out = k === 3 ? leave(f, end - 6, 7, -20, 8) : {};
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: [blurUrl(b, `mslide${k}`), out.filter].filter(Boolean).join(" ") || undefined, opacity: out.opacity }}>
      <Blur id={`mslide${k}`} sx={b.sx} sy={0} region={4} />
      <B u={f - start} />
    </AbsoluteFill>
  );
};

/* ================================================================== Acte V : la chute */
const OutroScene: React.FC<{ f: number }> = ({ f }) => {
  const u = f - OUTRO;
  const logo = ez(u, 20, 40, ENTER);
  const breathe = u > 50 ? 1 + 0.012 * wave(u - 50, 75) : 1;
  const words = ["Comment", "tu", "faisais", "avant ?"];
  return (
    <AbsoluteFill style={{ fontFamily: IT, color: "#fff" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 430, textAlign: "center", fontSize: 108, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.08 }}>
        <div>
          {words.slice(0, 3).map((w, i) => (
            <React.Fragment key={i}>
              <span style={{ display: "inline-block", ...appear(u, 1 + i * 3, DUR.m, 34, 10) }}>{w}</span>{" "}
            </React.Fragment>
          ))}
        </div>
        <div>
          <span style={{ display: "inline-block", ...appear(u, 10, DUR.m, 34, 10) }}>
            avant <span style={gradText}>?</span>
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 540 - 380, top: 900 - 380, width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(124,58,237,0.32), rgba(124,58,237,0))", opacity: logo }} />
      <div style={{ position: "absolute", left: 540 - 85, top: 900 - 85, opacity: logo, transform: `translateY(${(1 - logo) * 24}px) scale(${0.96 + 0.04 * logo})` }}>
        <UplinkMark size={170} sheen={ez(u, 36, 58, Easing.bezier(0.4, 0, 0.2, 1))} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1010, display: "flex", justifyContent: "center", fontSize: 128, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
        {"Uplink".split("").map((ch, i) => (
          <span key={i} style={{ display: "inline-block", ...appear(u, 24 + i * 2, DUR.m, 30, 8) }}>
            {ch}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1186, display: "flex", justifyContent: "center", ...appear(u, 34, DUR.m, 22, 0) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 46px 24px 38px", borderRadius: 999, background: "#fff", color: "#0A0A0C", fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em", boxShadow: "0 24px 70px rgba(124,58,237,0.45)", transform: `scale(${breathe})` }}>
          <PlayGlyph size={42} color="#0A0A0C" />
          dsociety.fr/uplink
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1350, textAlign: "center", fontSize: 26, fontWeight: 600, letterSpacing: "0.34em", color: "rgba(255,255,255,0.55)", ...appear(u, 44, DUR.m, 16, 6) }}>UNE CRÉATION DSOCIETY</div>
    </AbsoluteFill>
  );
};

/* ================================================================== Montage */
export const Suspense: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const flash = f >= DROP ? 1 - ez(f, DROP, DROP + 8, ENTER) : 0;
  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      <Audio src={staticFile("suspense/suspense.m4a")} />
      {(f < CUT || f >= DROP - 2) && <Spotlight f={f} />}
      {f < CUT && <ChoreScene f={f} />}
      {f >= CUT && f < 162 && <QuestionScene f={f} />}
      {f >= 160 && f < DROP && <TitleScene f={f - TITLE_OFFSET} credit={false} />}
      {MONTAGE.map(({ start, end }, k) => {
        const from = k === 0 ? DROP : start - 3;
        const to = k === 3 ? end : end + 3;
        return f >= from && f < to ? <MontageSlot key={k} f={f} k={k} /> : null;
      })}
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% 50%, rgba(255,255,255,${0.55 * flash}), rgba(183,148,255,${0.25 * flash}) 50%, rgba(0,0,0,0) 100%)` }} />}
      {f >= OUTRO && <OutroScene f={f} />}
      <Grain f={f} opacity={f < CUT ? 0.09 : 0.06} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
