import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { bounce, clamp, fade, lerp, slide, spr } from "../anim";
import { Pixo } from "../characters/Pixo";
import { Confetti } from "../components/Confetti";
import { BugSvg, Check, Cross, Magnifier } from "../components/icons";
import { Background, Card, SectionTitle } from "../components/ui";
import { CUES, mouthAt } from "../data";
import { C, FONT_BODY, FONT_TITLE } from "../theme";

const K = CUES.debug;

export const S4Debug: React.FC<{ f: number; abs: number }> = ({ f, abs }) => {
  // trajectoire de l'insecte : traverse l'écran de gauche à droite en zigzag, jusqu'à être piégé
  const trapT = spr(f, K.trap, 13, 0.6, 140);
  const walk = Math.min(f, K.trap + 6);
  const bx = interpolate(walk, [K.bug - 10, K.trap + 6], [-160, 470], clamp);
  const by = 1105 + Math.sin(walk / 6) * 40;
  const dir = Math.atan2(Math.cos(walk / 6) * 40 / 6, 630 / (K.trap + 16 - K.bug)) * (180 / Math.PI) + 90;
  const caught = f >= K.trap + 6;
  const struggle = caught ? Math.sin(f * 1.7) * 8 : 0;
  const gone = f >= K.fix;
  const bugScale = gone ? interpolate(f, [K.fix, K.fix + 4], [1, 0], clamp) : 1;

  const fixed = f >= K.fix;
  const fixP = spr(f, K.fix, 12, 0.5, 160);
  // message d'erreur collé dans l'IA : la ligne rouge vole vers Pixo
  const pasteP = lerp(f, K.paste, K.paste + 18, 0, 1);

  return (
    <AbsoluteFill>
      <Background frame={abs} tint={C.cyan} />
      <SectionTitle frame={f} at={K.title} num="2" lines={["Il trouve", "les bugs."]} accent={["bugs"]} color={C.orange} />

      {/* terminal */}
      <Card style={{ position: "absolute", left: 70, top: 600, width: 940, height: 330, transform: `translateX(${slide(f, 4, -1100)}px)`, overflow: "hidden" }}>
        <div style={{ height: 60, background: "#111A2E", display: "flex", alignItems: "center", gap: 14, padding: "0 24px" }}>
          {[C.red, C.yellow, C.green].map((c) => (
            <div key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />
          ))}
        </div>
        <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 48, color: C.cyan }}>$</span>
            <div style={{ width: 300, height: 22, borderRadius: 11, background: "#64748B" }} />
          </div>
          {/* la ligne rouge devient verte */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "12px 20px",
              borderRadius: 20,
              background: fixed ? `rgba(34,197,94,${0.18 * fixP})` : "rgba(244,63,94,0.16)",
              border: `4px solid ${fixed ? C.green : C.red}`,
              transform: `scale(${fixed ? 1 + 0.06 * Math.sin(Math.min(1, (f - K.fix) / 10) * Math.PI) : 1})`,
            }}
          >
            {fixed ? <Check size={64} /> : <Cross size={64} />}
            <span style={{ fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 60, color: fixed ? C.green : C.red }}>{fixed ? "Corrigé" : "TypeError"}</span>
            {!fixed && <div style={{ width: 200, height: 20, borderRadius: 10, background: "rgba(244,63,94,0.55)" }} />}
          </div>
          <div style={{ width: 520, height: 22, borderRadius: 11, background: "#475569", marginLeft: 46 }} />
        </div>
        {/* la cause */}
        {f >= K.cause && (
          <div
            style={{
              position: "absolute",
              right: 30,
              top: 130,
              background: C.orange,
              borderRadius: 24,
              padding: "6px 26px 10px",
              fontFamily: FONT_TITLE,
              fontWeight: 900,
              fontSize: 52,
              color: C.bg,
              transform: `scale(${bounce(f, K.cause)}) rotate(4deg)`,
              boxShadow: "0 10px 0 rgba(2,6,23,0.35)",
              opacity: fixed ? interpolate(f, [K.fix + 8, K.fix + 14], [1, 0], clamp) : 1,
            }}
          >
            ligne 42
          </div>
        )}
      </Card>

      {/* message collé qui vole vers Pixo */}
      {f >= K.paste && f < K.paste + 22 && (
        <div
          style={{
            position: "absolute",
            left: interpolate(pasteP, [0, 1], [180, 760]),
            top: interpolate(pasteP, [0, 0.5, 1], [740, 820, 1070]),
            transform: `scale(${1 - 0.7 * pasteP}) rotate(${pasteP * 20}deg)`,
            opacity: 1 - fade(f, K.paste + 16, 6),
          }}
        >
          <div style={{ background: C.red, borderRadius: 18, padding: "10px 22px", display: "flex", gap: 12, alignItems: "center", boxShadow: "0 10px 0 rgba(2,6,23,0.35)" }}>
            <Cross size={48} />
            <div style={{ width: 160, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.7)" }} />
          </div>
        </div>
      )}

      {/* insecte + loupe */}
      {!gone || f < K.fix + 4 ? (
        <div style={{ position: "absolute", left: bx - 60 + struggle, top: by - 60, transform: `rotate(${caught ? struggle * 2 : dir}deg) scale(${bugScale})` }}>
          <BugSvg frame={caught ? abs * 2 : abs} size={120} />
        </div>
      ) : null}
      {f >= K.trap - 8 && (
        <div
          style={{
            position: "absolute",
            left: interpolate(trapT, [0, 1], [1100, 470 - 120]),
            top: interpolate(trapT, [0, 1], [1300, 1105 - 125]),
            transform: `rotate(${interpolate(trapT, [0, 1], [40, 0])}deg)`,
            opacity: gone ? interpolate(f, [K.fix + 6, K.fix + 14], [1, 0], clamp) : 1,
          }}
        >
          <Magnifier size={300} />
        </div>
      )}
      <Confetti frame={f} at={K.fix} x={480} y={1100} />
      <Confetti frame={f} at={K.fix + 2} x={560} y={780} count={40} spread={0.8} />

      {/* Pixo analyse puis propose le correctif */}
      <div style={{ position: "absolute", left: 740, top: 975, transform: `translateX(${slide(f, 8, 500)}px)` }}>
        <Pixo
          frame={abs}
          size={290}
          mouth={mouthAt(abs)}
          expr={f >= K.fix ? "happy" : f >= K.paste ? "neutral" : "wow"}
          lookX={f < K.paste ? -0.8 : f < K.cause ? Math.sin(f / 4) * 0.8 : -0.6}
          lookY={f >= K.cause && f < K.fix ? -0.8 : 0}
          point={f >= K.cause - 4 && f < K.fix + 10 ? interpolate(f, [K.cause - 4, K.cause + 4], [0, 1], clamp) : 0}
          pointAngle={-120}
        />
      </div>
    </AbsoluteFill>
  );
};
