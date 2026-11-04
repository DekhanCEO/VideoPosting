/**
 * Points de synchronisation de la vidéo, calculés à partir des timestamps de la voix (src/data/timeline.json).
 * Source unique pour l'image (scènes) ET le son (bruitages placés par scripts/soundtrack.py via scripts/export-cues.mjs).
 * Fichier volontairement autonome (aucun import exécutable) pour pouvoir être lu par Node directement.
 */

export type Word = { text: string; start: number; end: number; scene: string; line: number };
export type Scene = { id: string; from: number; to: number };
export type Timeline = {
  engine: string;
  fps: number;
  durationInFrames: number;
  scenes: Scene[];
  lines: { scene: string; text: string; start: number; end: number }[];
  words: Word[];
  mouth: number[];
};

export type SceneId = "hook" | "probleme" | "code" | "debug" | "tests" | "idee" | "bemol" | "cta";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9']/g, "");

export function sceneOf(tl: Timeline, id: SceneId): Scene {
  const s = tl.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`Scène inconnue : ${id}`);
  return s;
}

/** Image (relative au début de la scène) où commence le n-ième mot de la scène qui commence par `text`. */
export function wordAt(tl: Timeline, id: SceneId, text: string, nth = 0): number {
  const s = sceneOf(tl, id);
  const hits = tl.words.filter((w) => w.scene === id && norm(w.text).startsWith(norm(text)));
  const w = hits[nth];
  if (!w) throw new Error(`Mot introuvable dans ${id} : ${text} (#${nth})`);
  return Math.round(w.start * tl.fps) - s.from;
}

export function computeCues(tl: Timeline) {
  const W = (id: SceneId, t: string, nth = 0) => wordAt(tl, id, t, nth);
  const len = (id: SceneId) => sceneOf(tl, id).to - sceneOf(tl, id).from;
  return {
    hook: {
      shake: W("hook", "IA"),
      flash: W("hook", "IA") + 12,
      clockEyes: W("hook", "heures"),
    },
    probleme: {
      windows: [6, 26, 44, 62, 82, 100, 118, 140, 160, 182],
      chipBugs: W("probleme", "bugs"),
      chipDoc: W("probleme", "documentation"),
      chipBoiler: W("probleme", "repetitif"),
      yawn: W("probleme", "temps"),
      star: W("probleme", "fonctionnalites"),
    },
    code: {
      title: 2,
      tabForm: W("code", "formulaires"),
      tabModel: W("code", "modeles"),
      tabApi: W("code", "appels"),
      burst: W("code", "genere"),
      timer: W("code", "secondes"),
      idea: W("code", "logique"),
    },
    debug: {
      title: 2,
      bug: W("debug", "erreur"),
      paste: W("debug", "colle"),
      trap: W("debug", "dans"),
      cause: W("debug", "cause"),
      fix: W("debug", "correctif"),
    },
    tests: {
      title: 2,
      checks: [W("tests", "tests"), W("tests", "unitaires"), W("tests", "documentation"), W("tests", "commentaires")].map(
        (f, i) => f + 6 + i * 2,
      ),
      doc: W("tests", "taches"),
      prompt: W("tests", "prompt"),
    },
    idee: {
      title: 2,
      steps: [W("idee", "idee"), W("idee", "structurer"), W("idee", "ecrans"), W("idee", "ligne")],
      switch: W("idee", "une") - 4,
      x3: W("idee", "jours"),
      weeks: W("idee", "semaines"),
    },
    bemol: {
      finger: 4,
      cards: [W("bemol", "developpeur"), W("bemol", "elle"), W("bemol", "sait")],
      titleOut: W("bemol", "sait") - 6,
      amplify: W("bemol", "amplifie"),
    },
    cta: {
      text: 2,
      comment: W("cta", "commentaire"),
      follow: W("cta", "suis"),
      end: len("cta"),
    },
  };
}

export type Cues = ReturnType<typeof computeCues>;

export type Sfx = { frame: number; kind: string; gain: number };

/** Liste des bruitages (images absolues). Les noms correspondent aux générateurs de scripts/soundtrack.py. */
export function sfxList(tl: Timeline): Sfx[] {
  const c = computeCues(tl);
  const abs = (id: SceneId, f: number) => sceneOf(tl, id).from + f;
  const out: Sfx[] = [];
  const add = (id: SceneId, f: number, kind: string, gain = 1) => out.push({ frame: abs(id, f), kind, gain });

  // transitions (balayage ou zoom-flash) à chaque coupe
  for (const s of tl.scenes.slice(1)) {
    const zoom = ["code", "bemol", "cta"].includes(s.id);
    out.push({ frame: s.from - (zoom ? 4 : 3), kind: zoom ? "zoom" : "whoosh", gain: 0.8 });
  }
  add("hook", 0, "pop", 0.7);
  add("hook", c.hook.shake, "glitch", 0.6);
  add("hook", c.hook.flash, "impact", 1);
  add("hook", c.hook.clockEyes, "tick", 0.7);
  c.probleme.windows.forEach((f, i) => add("probleme", f + 10, "error", 0.42 - i * 0.015));
  [c.probleme.chipBugs, c.probleme.chipDoc, c.probleme.chipBoiler].forEach((f) => add("probleme", f, "pop", 0.6));
  add("probleme", c.probleme.star, "sad", 0.5);
  add("code", c.code.title, "pop", 0.7);
  for (let f = 18; f < 230; f += 5) add("code", f, "key", f > c.code.burst && f < c.code.burst + 40 ? 0.42 : 0.25);
  add("code", c.code.burst, "sparkle", 0.6);
  add("code", c.code.timer, "ding", 0.5);
  add("code", c.code.idea, "pop", 0.6);
  add("debug", c.debug.title, "pop", 0.7);
  add("debug", c.debug.bug, "buzz", 0.45);
  add("debug", c.debug.paste, "whoosh", 0.4);
  add("debug", c.debug.trap, "zap", 0.6);
  add("debug", c.debug.cause, "pop", 0.5);
  add("debug", c.debug.fix, "confetti", 0.8);
  add("debug", c.debug.fix, "ding", 0.6);
  add("tests", c.tests.title, "pop", 0.7);
  c.tests.checks.forEach((f, i) => add("tests", f, "check", 0.55 + i * 0.05));
  add("tests", c.tests.doc, "whoosh", 0.35);
  add("tests", c.tests.prompt, "sparkle", 0.6);
  add("idee", c.idee.title, "pop", 0.7);
  c.idee.steps.forEach((f, i) => add("idee", f + 4, "check", 0.55 + i * 0.07));
  add("idee", c.idee.x3, "impact", 0.8);
  add("idee", c.idee.x3 + 2, "ding", 0.6);
  add("bemol", c.bemol.finger, "warn", 0.7);
  c.bemol.cards.forEach((f) => add("bemol", f, "swish", 0.5));
  add("bemol", c.bemol.amplify, "sparkle", 0.45);
  add("cta", c.cta.text, "pop", 0.8);
  add("cta", c.cta.comment, "bubble", 0.6);
  add("cta", c.cta.follow, "ding", 0.7);
  return out.sort((a, b) => a.frame - b.frame);
}
