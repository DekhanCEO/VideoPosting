// Contrôle des textes, image par image (composition IaDev55Audit) :
//  - aucun texte hors du cadre 1080x1920 ;
//  - aucun texte dans les 250 px du haut ni les 350 px du bas ;
//  - au plus 12 mots affichés simultanément (hors images de transition).
// Usage : node scripts/audit.mjs [pas=3]   → build/audit.json
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const step = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 3);
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const tl = JSON.parse(readFileSync("src/data/timeline.json", "utf8"));
const cuts = tl.scenes.slice(1).map((s) => s.from);
mkdirSync("build", { recursive: true });

let results = [];
if (process.argv.includes("--analyze")) {
  results = JSON.parse(readFileSync("build/audit-raw.json", "utf8"));
} else {
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "IaDev55Audit", browserExecutable });
  for (let frame = 0; frame < composition.durationInFrames; frame += step) {
    let data = null;
    await renderStill({
      serveUrl, composition, frame, output: "build/audit-tmp.png", scale: 0.25, browserExecutable,
      onBrowserLog: (log) => { if (log.text.startsWith("AUDIT ")) data = JSON.parse(log.text.slice(6)); },
    });
    if (data) results.push(data);
  }
  writeFileSync("build/audit-raw.json", JSON.stringify(results));
}

// Un texte partiellement hors cadre qui est entièrement dans le cadre 6 images plus tard est une entrée en glissement
// (carte ou libellé qui arrive du bord) : on la compte à part, ce n'est pas un débordement.
const inside = (it) => it.x0 >= -1 && it.x1 <= 1081 && it.y0 >= -1 && it.y1 <= 1921;
const settled = (frame, text) => {
  const later = results.find((r) => r.frame === frame + 2 * step);
  return later && later.items.some((it) => it.text === text && inside(it));
};
const isWord = (t) => /[A-Za-zÀ-ÿ]/.test(t);
const report = { framesChecked: results.length, step, entrances: [], outOfFrame: [], outOfSafe: [], words: [], maxWords: 0, maxWordsFrame: -1 };
for (const r of results) {
  const transition = cuts.some((c) => Math.abs(r.frame - c) <= 5);
  let words = 0;
  for (const it of r.items) {
    // texte de taille nulle (rebond qui commence) ou entièrement hors de l'image (carte pas encore entrée) : non affiché
    if ((it.x1 - it.x0) * (it.y1 - it.y0) < 100) continue;
    if (it.x1 <= 0 || it.x0 >= 1080 || it.y1 <= 0 || it.y0 >= 1920) continue;
    if (!inside(it) && settled(r.frame, it.text)) report.entrances.push({ frame: r.frame, text: it.text });
    else if (!inside(it)) report.outOfFrame.push({ frame: r.frame, text: it.text, box: [it.x0, it.y0, it.x1, it.y1].map(Math.round) });
    else if (it.y0 < r.safeTop || it.y1 > r.safeBottom) report.outOfSafe.push({ frame: r.frame, text: it.text, box: [it.x0, it.y0, it.x1, it.y1].map(Math.round) });
    if (it.opacity >= 0.5) words += it.text.split(/\s+/).filter(isWord).length;
  }
  if (!transition) {
    report.words.push([r.frame, words]);
    if (words > report.maxWords) { report.maxWords = words; report.maxWordsFrame = r.frame; }
  }
}
writeFileSync("build/audit.json", JSON.stringify(report, null, 1));
console.log(`Images contrôlées : ${report.framesChecked} (1 sur ${step})`);
console.log(`Entrées en glissement (transitoires, exclues) : ${report.entrances.length}`);
for (const v of report.entrances) console.log("  entrée", v.frame, JSON.stringify(v.text));
console.log(`Textes hors cadre : ${report.outOfFrame.length}`);
for (const v of report.outOfFrame.slice(0, 40)) console.log("  hors cadre", v.frame, JSON.stringify(v.text), v.box.join(","));
console.log(`Textes hors zone de sécurité : ${report.outOfSafe.length}`);
for (const v of report.outOfSafe.slice(0, 40)) console.log("  hors zone", v.frame, JSON.stringify(v.text), v.box.join(","));
console.log(`Mots affichés simultanément : max ${report.maxWords} (image ${report.maxWordsFrame})`);
for (const [f, n] of report.words.filter(([, n]) => n > 12)) console.log("  > 12 mots", f, n);
