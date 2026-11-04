#!/usr/bin/env python3
"""Voix off + timeline de la vidéo « L'IA dans le dev » (55 s, 30 i/s).

1. Synthétise chaque réplique du script :
   - ElevenLabs (endpoint « with-timestamps ») si ELEVENLABS_API_KEY est défini (.env ou environnement) ;
   - sinon Piper en local (voix française fr_FR-siwis-medium), avec les alignements phonème → échantillons du modèle.
2. Déduit le minutage de chaque mot à partir de ces timestamps (aucune estimation « à l'œil »).
3. Place les répliques sur la timeline de 55 s (scènes calées au plus près du storyboard).
4. Écrit :
   - build/voice.wav           voix seule, 48 kHz mono, 55 s (relue par scripts/soundtrack.py)
   - src/data/timeline.json    scènes, répliques, mots (en secondes) + amplitude de la voix par image (lip-sync)

Usage : npm run voice    (les modèles locaux se récupèrent avec npm run models)
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
DATA = ROOT / "src" / "data"
MODEL = ROOT / "models" / "vits-piper-fr_FR-siwis-medium" / "fr_FR-siwis-medium.onnx"

FPS = 30
TOTAL_S = 55.0
SR = 48000
LENGTH_SCALE = 0.88  # Piper : < 1 = débit un peu plus rapide (rythme TikTok)

# Script mot pour mot (texte affiché). Un « | » sépare deux répliques d'une même scène (petite respiration).
SCENES = [
    {"id": "hook", "target": 3.0, "lines": ["Tu codes encore sans IA ?", "Tu perds des heures pour rien."]},
    {"id": "probleme", "target": 7.0, "lines": [
        "Un développeur passe souvent plus de temps sur le code répétitif, les bugs et la documentation "
        "que sur les fonctionnalités qui font la différence."]},
    {"id": "code", "target": 10.0, "lines": [
        "Formulaires, modèles de données, appels API : l'IA génère le squelette en quelques secondes, "
        "et toi tu te concentres sur la logique métier."]},
    {"id": "debug", "target": 8.0, "lines": [
        "Une erreur incompréhensible ?", "Colle le message dans l'IA : elle t'explique la cause et propose le correctif."]},
    {"id": "tests", "target": 8.0, "lines": [
        "Tests unitaires, documentation, commentaires : des tâches ingrates, automatisées en un prompt."]},
    {"id": "idee", "target": 10.0, "lines": [
        "Tu décris ton idée, l'IA t'aide à structurer le projet, coder les écrans et préparer la mise en ligne.",
        "Une application complète en quelques jours, là où il fallait des semaines."]},
    {"id": "bemol", "target": 6.0, "lines": [
        "L'IA ne remplace pas le développeur.", "Elle amplifie celui qui sait ce qu'il fait."]},
    {"id": "cta", "target": 3.0, "lines": [
        "Dis-moi en commentaire ce que tu aimerais automatiser en premier.", "Et suis pour la suite !"]},
]

# Prononciation pour le moteur local (le texte affiché ne change pas).
SPOKEN = {"IA": "[[ˌiˈa]]", "l'IA": "[[lˌiˈa]]", "L'IA": "[[lˌiˈa]]", "API": "a-pé-i", "prompt": "prompte", "codes": "[[kˈɔd]]"}

LEAD = 0.22        # silence entre la coupe et le premier mot d'une scène
LINE_GAP = 0.22    # respiration entre deux répliques d'une même scène
TAIL_MIN = 0.30    # au moins 0,3 s d'image après le dernier mot d'une scène
END_HOLD = 0.9     # écran final tenu après le dernier mot
PUNCT = set(".,;:!?…")


def load_env() -> None:
    env = ROOT / ".env"
    if env.exists():
        for raw in env.read_text().splitlines():
            m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", raw)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def tokens(line: str) -> list[str]:
    """Mots affichés ; la ponctuation isolée (« ? », « : », « ! ») est rattachée au mot précédent."""
    out: list[str] = []
    for t in line.split():
        if all(c in PUNCT for c in t) and out:
            out[-1] += " " + t
        else:
            out.append(t)
    return out


def bare(tok: str) -> str:
    return tok.replace(" ", " ").strip(" .,;:!?…")


def spoken_form(tok: str) -> str:
    """Forme envoyée au moteur local : substitution de prononciation, ponctuation conservée.
    Pour un bloc de phonèmes bruts [[…]], la ponctuation entre dans le bloc (sinon Piper perd l'intonation)."""
    word = bare(tok)
    punct = tok.replace("\u00a0", " ")[len(word):].strip()
    sub = SPOKEN.get(word, word)
    if sub.startswith("[[") and punct:
        return sub[:-2] + punct + "]]"
    return f"{sub} {punct}" if punct else sub


def resample(x: np.ndarray, sr_in: int) -> np.ndarray:
    if sr_in == SR:
        return x.astype(np.float64)
    n = int(round(len(x) * SR / sr_in))
    return np.interp(np.arange(n) * sr_in / SR, np.arange(len(x)), x).astype(np.float64)


# ---------------------------------------------------------------- Piper (local)
class PiperEngine:
    name = "Piper (local) · fr_FR-siwis-medium"

    def __init__(self) -> None:
        from piper import PiperVoice, SynthesisConfig

        if not MODEL.exists():
            sys.exit(f"Modèle introuvable : {MODEL}\n→ lancez d'abord : npm run models")
        self.voice = PiperVoice.load(str(MODEL), include_alignments=True)
        self.cfg = SynthesisConfig(length_scale=LENGTH_SCALE)
        self.sr = self.voice.config.sample_rate

    def phon_words(self, text: str) -> int:
        return sum(len([w for w in "".join(s).split(" ") if w.strip(".,;:!?…")]) for s in self.voice.phonemize(text))

    def synth(self, line: str) -> tuple[np.ndarray, list[dict]]:
        toks = tokens(line)
        spoken_toks = [spoken_form(t) for t in toks]
        spoken = " ".join(spoken_toks)
        # nombre de « mots phonétiques » espeak par mot affiché (« I A » = 2, « t'explique » = 1…)
        counts = [self.phon_words(SPOKEN.get(bare(t), bare(t))) for t in toks]

        audio: list[np.ndarray] = []
        groups: list[tuple[float, float]] = []  # (début, fin) de chaque mot phonétique, en secondes
        offset = 0
        for chunk in self.voice.synthesize(spoken, self.cfg, include_alignments=True):
            pos = offset
            cur: list[float] | None = None
            space_start = None
            for al in chunk.phoneme_alignments:
                ph, n = al.phoneme, int(al.num_samples)
                if ph == " ":
                    if cur:
                        groups.append((cur[0], cur[1]))
                        cur = None
                    space_start = pos
                elif ph in "^$" or ph in PUNCT:
                    if cur:
                        groups.append((cur[0], cur[1]))
                        cur = None
                    space_start = None
                elif ph in "ˈˌ-ʲ̃":  # accents, liaison, diacritiques : collés au mot courant
                    if cur is None:
                        cur = [pos / self.sr, (pos + n) / self.sr]
                    else:
                        cur[1] = (pos + n) / self.sr
                else:
                    if cur is None:
                        # le mot commence au milieu de l'espace qui le précède (transition coarticulée)
                        st = pos if space_start is None else (space_start + pos) / 2
                        cur = [st / self.sr, (pos + n) / self.sr]
                    else:
                        cur[1] = (pos + n) / self.sr
                    space_start = None
                pos += n
            if cur:
                groups.append((cur[0], cur[1]))
            audio.append(chunk.audio_float_array)
            offset += len(chunk.audio_float_array)

        if len(groups) != sum(counts):
            sys.exit(f"Alignement impossible pour « {line} » : {len(groups)} groupes phonétiques pour {sum(counts)} attendus {counts}")
        words, i = [], 0
        for t, c in zip(toks, counts):
            words.append({"text": t, "start": groups[i][0], "end": groups[i + c - 1][1]})
            i += c
        return resample(np.concatenate(audio), self.sr), words


# ---------------------------------------------------------------- ElevenLabs (API)
class ElevenEngine:
    def __init__(self, key: str) -> None:
        self.key = key
        self.voice_id = os.environ.get("ELEVENLABS_VOICE_ID") or "XrExE9yKIg1WjnnlVkGX"
        self.model = os.environ.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2"
        self.name = f"ElevenLabs · voix {self.voice_id} · {self.model}"

    def synth(self, line: str) -> tuple[np.ndarray, list[dict]]:
        text = " ".join(t.replace(" ", " ") for t in tokens(line))
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/with-timestamps?output_format=pcm_44100",
            data=json.dumps({"text": text, "model_id": self.model,
                             "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35}}).encode(),
            headers={"xi-api-key": self.key, "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.load(r)
        pcm = np.frombuffer(base64.b64decode(res["audio_base64"]), dtype="<i2").astype(np.float64) / 32768
        al = res["alignment"]
        chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
        words, cur = [], None
        for c, s, e in zip(chars, st, en):
            if c.isspace():
                if cur:
                    words.append(cur)
                cur = None
            elif cur is None:
                cur = {"raw": c, "start": s, "end": e}
            else:
                cur["raw"] += c
                cur["end"] = e
        if cur:
            words.append(cur)
        words = [w for w in words if bare(w["raw"])]
        toks = tokens(line)
        if len(words) != len(toks):
            sys.exit(f"ElevenLabs : {len(words)} mots horodatés pour {len(toks)} attendus dans « {line} »")
        return resample(pcm, 44100), [{"text": t, "start": w["start"], "end": w["end"]} for t, w in zip(toks, words)]


def trim(audio: np.ndarray, words: list[dict]) -> tuple[np.ndarray, list[dict]]:
    """Retire le silence de tête/queue (garde 40 ms) pour un placement précis sur la timeline."""
    a = words[0]["start"] - 0.04
    b = words[-1]["end"] + 0.12
    i, j = max(0, int(a * SR)), min(len(audio), int(b * SR))
    shift = i / SR
    return audio[i:j], [{**w, "start": w["start"] - shift, "end": w["end"] - shift} for w in words]


def main() -> None:
    load_env()
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    engine = ElevenEngine(key) if key else PiperEngine()
    print(f"Moteur TTS : {engine.name}")

    rendered = []  # par scène : liste de (audio, mots)
    for sc in SCENES:
        rendered.append([trim(*engine.synth(line)) for line in sc["lines"]])

    # Durée « tassée » de chaque scène, puis répartition du temps restant vers les durées du storyboard.
    voice_len = [sum(len(a) / SR for a, _ in r) + LINE_GAP * (len(r) - 1) for r in rendered]
    packed = [LEAD + v + TAIL_MIN for v in voice_len]
    packed[-1] = LEAD + voice_len[-1] + END_HOLD
    left = TOTAL_S - sum(packed)
    if left < 0:
        sys.exit(f"La voix dépasse 55 s de {-left:.2f} s : baissez LENGTH_SCALE.")
    deficit = [max(0.0, sc["target"] - p) for sc, p in zip(SCENES, packed)]
    extra = [d * min(1.0, left / sum(deficit)) if sum(deficit) else 0 for d in deficit]
    rest = left - sum(extra)
    extra = [e + rest / len(extra) for e in extra]
    durations = [p + e for p, e in zip(packed, extra)]

    # Arrondi à l'image, total exact = 1650 images.
    frames, acc = [], 0.0
    for d in durations:
        acc += d
        frames.append(round(acc * FPS))
    frames[-1] = int(TOTAL_S * FPS)
    starts = [0] + frames[:-1]

    voice = np.zeros(int(TOTAL_S * SR))
    scenes_out, lines_out, words_out = [], [], []
    for k, (sc, r) in enumerate(zip(SCENES, rendered)):
        s0, s1 = starts[k] / FPS, frames[k] / FPS
        # un peu plus d'attaque si la scène a du temps (max 0,5 s), sinon LEAD
        spare = (s1 - s0) - (LEAD + voice_len[k] + (END_HOLD if k == len(SCENES) - 1 else TAIL_MIN))
        t = s0 + LEAD + min(0.28, max(0.0, spare) * 0.15)
        scenes_out.append({"id": sc["id"], "from": starts[k], "to": frames[k]})
        for li, (audio, words) in enumerate(r):
            i = int(round(t * SR))
            voice[i : i + len(audio)] += audio
            ws = [{"text": w["text"], "start": round(t + w["start"], 3), "end": round(t + w["end"], 3),
                   "scene": sc["id"], "line": len(lines_out)} for w in words]
            lines_out.append({"scene": sc["id"], "text": sc["lines"][li], "start": ws[0]["start"], "end": ws[-1]["end"]})
            words_out.extend(ws)
            t += len(audio) / SR + LINE_GAP

    # Normalisation de la voix à -3 dBFS crête
    voice *= 10 ** (-3 / 20) / max(1e-9, np.abs(voice).max())

    # Amplitude par image (RMS sur la fenêtre de l'image), normalisée 0..1, pour le lip-sync
    hop = SR // FPS
    rms = np.array([np.sqrt(np.mean(voice[f * hop : (f + 1) * hop] ** 2)) for f in range(int(TOTAL_S * FPS))])
    mouth = np.clip(rms / np.percentile(rms[rms > 1e-4], 95), 0, 1)

    BUILD.mkdir(exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    with wave.open(str(BUILD / "voice.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(voice, -1, 1) * 32767).astype("<i2").tobytes())
    (DATA / "timeline.json").write_text(json.dumps({
        "engine": engine.name, "fps": FPS, "durationInFrames": int(TOTAL_S * FPS),
        "scenes": scenes_out, "lines": lines_out, "words": words_out,
        "mouth": [round(float(m), 3) for m in mouth],
    }, ensure_ascii=False, indent=1))

    for s in scenes_out:
        print(f"  {s['id']:9s} {s['from'] / FPS:6.2f} → {s['to'] / FPS:6.2f} s  ({(s['to'] - s['from']) / FPS:.2f} s)")
    print(f"Voix : {lines_out[0]['start']:.2f} → {lines_out[-1]['end']:.2f} s, {len(words_out)} mots → src/data/timeline.json")


if __name__ == "__main__":
    main()
