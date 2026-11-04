import React from "react";
import { interpolate } from "remotion";
import { clamp } from "../anim";
import type { Word } from "../cues";
import { TL } from "../data";
import { C, FONT_TITLE } from "../theme";

/** Mots-clés : grossissent et passent en orange au moment où ils sont prononcés (typographie cinétique). */
const KEYWORDS = [
  "ia",
  "heures",
  "bugs",
  "repetitif",
  "documentation",
  "difference",
  "secondes",
  "logique",
  "cause",
  "correctif",
  "tests",
  "prompt",
  "jours",
  "semaines",
  "remplace",
  "amplifie",
  "commentaire",
  "suis",
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^l'/, "")
    .replace(/[^a-z0-9]/g, "");

const isKey = (w: string) => KEYWORDS.includes(norm(w));

/** Nombre maximal de mots par sous-titre, par scène (on reste à 12 mots maximum à l'écran, tous textes confondus). */
const MAX_WORDS: Record<string, number> = { probleme: 3, code: 3, bemol: 3 };
const MAX_CHARS = 26;

type Chunk = { words: Word[]; start: number; end: number };

function buildChunks(words: Word[]): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) chunks.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const max = MAX_WORDS[w.scene] ?? 4;
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (prev && (prev.line !== w.line || cur.length >= max || chars > MAX_CHARS || /[,.?!:]$/.test(prev.text))) flush();
    cur.push(w);
  }
  flush();
  return chunks;
}

const CHUNKS = buildChunks(TL.words);

/** Sous-titres incrustés mot par mot ; le mot en cours est surligné (pastille violette). */
export const Subtitles: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / TL.fps;
  const idx = CHUNKS.findIndex((c, i) => {
    const next = CHUNKS[i + 1];
    const until = next && next.start - c.end < 0.6 ? next.start : c.end + 0.35;
    return t >= c.start - 0.06 && t < until - 0.001;
  });
  if (idx < 0) return null;
  const chunk = CHUNKS[idx];
  const appear = interpolate(t, [chunk.start - 0.06, chunk.start + 0.08], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1346,
        height: 196,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: 14,
          rowGap: 6,
          transform: `scale(${0.88 + 0.12 * appear})`,
          opacity: appear,
          maxWidth: 960,
        }}
      >
        {chunk.words.map((w, i) => {
          const next = chunk.words[i + 1];
          const active = t >= w.start - 0.02 && (next ? t < next.start - 0.02 : t < chunk.end + 0.35);
          const said = t >= w.start - 0.02;
          const key = isKey(w.text);
          const pop = key ? interpolate(t, [w.start - 0.02, w.start + 0.08, w.start + 0.3], [1, 1.22, 1.1], clamp) : active ? 1.06 : 1;
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_TITLE,
                fontWeight: 800,
                fontSize: 70,
                lineHeight: 1.12,
                padding: "2px 16px 6px",
                borderRadius: 22,
                color: key && said ? (active ? C.white : C.orange) : C.white,
                background: active ? (key ? C.orange : C.violet) : "transparent",
                boxShadow: active ? "0 8px 0 rgba(2,6,23,0.4)" : "none",
                textShadow: active ? "none" : "0 5px 0 rgba(2,6,23,0.85), 0 0 18px rgba(2,6,23,0.9)",
                // contour sombre : lisible même sur le corps blanc de Pixo
                WebkitTextStroke: active ? "0" : "12px rgba(15,23,42,0.92)",
                paintOrder: "stroke fill",
                transform: `scale(${pop})`,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const SUBTITLE_CHUNKS = CHUNKS;
