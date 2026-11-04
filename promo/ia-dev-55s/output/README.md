# L'IA dans le dev : le guide en 55 s

Vidéo verticale 9:16 (1080x1920, 30 i/s, 55 s) pour TikTok, YouTube Shorts et Instagram Reels, réalisée avec **Remotion** (React + TypeScript). Elle explique en 8 scènes à quoi sert l'IA dans le développement applicatif, avec deux personnages SVG animés, Pixo (le robot IA) et Léa (la développeuse).

## Livrables (`output/`)
| Fichier | Contenu |
|---|---|
| `video_9x16_1080p.mp4` | Version finale : H.264 1080x1920 30 i/s, AAC 192 kb/s, 55,0 s |
| `thumbnail.png` | Couverture 1080x1920 « L'IA dans le dev : le guide en 55 s » |
| `brief.md`, `script.md`, `storyboard.md` | Documentation (copies des fichiers à la racine du projet) |
| `verification.md`, `checks/` | Rapport des vérifications automatiques et images témoins (0, 3, 10, 28, 46, 54 s) |

## Moteur TTS utilisé
**Piper en local, voix française `fr_FR-siwis-medium`.** Aucune clé ElevenLabs n'était disponible au moment du rendu.

- Les sous-titres mot à mot viennent des **alignements phonème → échantillon** renvoyés par Piper (timestamps du TTS, précision ≈ 11 ms).
- Si `ELEVENLABS_API_KEY` est renseignée dans `.env`, `npm run voice` bascule automatiquement sur ElevenLabs (endpoint `with-timestamps`). Les sous-titres se calent alors sur ses timestamps par caractère, et la timeline des scènes se recalcule.

## Clés API
Copiez `.env.example` en `.env` et renseignez-le. **Aucune clé n'est écrite dans le code.** `.env` est ignoré par git.

```
ELEVENLABS_API_KEY=...        # optionnel : voix ElevenLabs
ELEVENLABS_VOICE_ID=...       # optionnel
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

## Dépendances
- **Node 22+** et npm (`npm install` installe Remotion 4.0.539, React 19, Poppins et Inter).
- **Python 3.11+**, avec :
  ```
  pip install numpy scipy piper-tts onnx onnxruntime sherpa-onnx
  ```
  - `piper-tts` + `onnx` : voix locale, avec ses alignements ;
  - `sherpa-onnx` : reconnaissance vocale pour la vérification.
- **ffmpeg / ffprobe** : vérifications.
- **Modèles locaux** (≈ 200 Mo, hors git) : `npm run models`.
- **Chrome** : Remotion télécharge le sien. Sans accès réseau à `remotion.media`, indiquez un Chrome local :
  ```
  export REMOTION_BROWSER=/chemin/vers/chrome-headless-shell
  ```

## Commandes
```bash
npm install
npm run models       # voix Piper FR + modèle de reconnaissance vocale (une fois)
npm run voice        # TTS → build/voice.wav + src/data/timeline.json (scènes, mots, lip-sync)
npm run audio        # musique + bruitages + ducking → public/soundtrack.wav
npm run render       # → output/video_9x16_1080p.mp4  (npx remotion render src/index.ts IaDev55 …)
npm run thumbnail    # → output/thumbnail.png
npm run audit        # mesure DOM des textes, 1 image sur 3 → build/audit.json
npm run verify       # contrôles finaux → output/verification.md + output/checks/
npm run build:all    # tout, dans l'ordre
npm run studio       # aperçu interactif (compositions IaDev55, IaDev55Safe avec zones de sécurité, Thumbnail)
```

`public/soundtrack.wav` et `src/data/timeline.json` sont versionnés : `npm run render` fonctionne sans les modèles ni Python.

## Organisation
```
scripts/voice.py        TTS (Piper local ou ElevenLabs), timestamps par mot, placement sur 55 s, enveloppe de lip-sync
scripts/soundtrack.py   musique générée, bruitages synthétisés, ducking -12 dB, mixage
scripts/export-cues.mjs exporte les repères de src/cues.ts pour le mixage
scripts/audit.mjs       contrôle des textes (cadre, zones de sécurité, 12 mots max)
scripts/verify.py       durée, format, synchro voix/sous-titres, écrêtage, ducking, images témoins
src/cues.ts             repères de synchronisation calculés depuis les mots prononcés (image + son)
src/Video.tsx           assemblage, transitions (balayage 6 images / zoom-flash), sous-titres, audio
src/scenes/S1…S8        les 8 scènes
src/characters/         Pixo et Léa (SVG animés, respiration, clignements, expressions, lip-sync)
src/components/         sous-titres, titres, cartes, icônes et émojis SVG, confettis, audit
```
