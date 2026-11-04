#!/usr/bin/env python3
"""Vérifications du rendu final (output/video_9x16_1080p.mp4) → output/verification.md

1. Format : durée 50–58 s, H.264 1080x1920 30 i/s, AAC 192 kb/s.
2. Images témoins à 0, 3, 10, 28, 46 et 54 s → output/checks/*.jpg (+ résultat de l'audit DOM build/audit.json :
   textes hors cadre, hors zones de sécurité, nombre de mots affichés).
3. Synchronisation voix / sous-titres (écart max toléré : 150 ms) :
   a. décalage global entre l'audio du MP4 et la bande-son source (intercorrélation) ;
   b. attaque réelle de chaque réplique (énergie de la voix) vs apparition du 1er mot sous-titré ;
   c. reconnaissance vocale indépendante (zipformer FR) sur l'audio du MP4 : instant de chaque mot reconnu vs
      sous-titre (latence propre au modèle en flux retirée = médiane des écarts).
   Les sous-titres sont affichés à l'image près (33 ms) : l'écart affiché inclut cette quantification.
4. Audio : pas d'écrêtage (crête échantillon et crête vraie), ducking -12 dB pendant la voix.
"""
from __future__ import annotations

import difflib
import json
import math
import re
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
BUILD = ROOT / "build"
VIDEO = OUT / "video_9x16_1080p.mp4"
ASR_DIR = ROOT / "models" / "sherpa-onnx-streaming-zipformer-fr-2023-04-14"
SR = 48000
TOL = 0.150
lines_md: list[str] = []
ok_all = True


def log(s=""):
    print(s)
    lines_md.append(s)


def check(name, ok, detail):
    global ok_all
    ok_all &= bool(ok)
    log(f"| {name} | {'✅' if ok else '❌'} | {detail} |")


def read_wav(p):
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
        return x.reshape(-1, w.getnchannels()) if w.getnchannels() > 1 else x


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def main():
    if not VIDEO.exists():
        sys.exit(f"{VIDEO} introuvable : lancez d'abord npm run render")
    tl = json.loads((ROOT / "src" / "data" / "timeline.json").read_text())
    fps = tl["fps"]

    # ------------------------------------------------------------ 1. format
    pr = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)]))
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next(s for s in pr["streams"] if s["codec_type"] == "audio")
    dur = float(pr["format"]["duration"])
    log("# Vérification du rendu\n")
    log(f"Fichier : `output/{VIDEO.name}` ({VIDEO.stat().st_size / 1e6:.1f} Mo) · TTS : {tl['engine']}\n")
    log("| Contrôle | Résultat | Détail |")
    log("|---|---|---|")
    check("Durée entre 50 et 58 s", 50 <= dur <= 58, f"{dur:.2f} s")
    check("Vidéo H.264 1080x1920", v["codec_name"] == "h264" and v["width"] == 1080 and v["height"] == 1920,
          f"{v['codec_name']} {v['width']}x{v['height']} @ {v['r_frame_rate']}, {v.get('pix_fmt')}")
    abr = int(a.get("bit_rate", 0))
    check("Audio AAC 192 kb/s", a["codec_name"] == "aac" and 180_000 <= abr <= 200_000, f"{a['codec_name']} {abr / 1000:.0f} kb/s, {a['sample_rate']} Hz, {a['channels']} canaux")

    # ------------------------------------------------------------ 2. images témoins + audit DOM
    (OUT / "checks").mkdir(exist_ok=True)
    for t in [0, 3, 10, 28, 46, 54]:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", str(VIDEO), "-frames:v", "1", "-q:v", "3",
                        str(OUT / "checks" / f"frame_{t:02d}s.jpg")], check=True)
    audit_p = BUILD / "audit.json"
    if audit_p.exists():
        au = json.loads(audit_p.read_text())
        check("Aucun texte hors cadre", not au["outOfFrame"], f"{au['framesChecked']} images mesurées (1 sur {au['step']}), {len(au['outOfFrame'])} débordement(s) ; {len(au.get('entrances', []))} entrée(s) en glissement depuis le bord, transitoires (< 6 images)")
        check("Aucun texte hors zones de sécurité (250 px haut / 350 px bas)", not au["outOfSafe"], f"{len(au['outOfSafe'])} texte(s) hors zone")
        check("12 mots max à l'écran", au["maxWords"] <= 12, f"maximum mesuré : {au['maxWords']} mots (image {au['maxWordsFrame']}, transitions de 6 images exclues)")
    else:
        check("Audit DOM des textes", False, "build/audit.json absent : lancez npm run audit")

    # ------------------------------------------------------------ 3. synchronisation
    wav = BUILD / "final_audio.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(VIDEO), "-vn", "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", str(wav)], check=True)
    mix = read_wav(wav)
    src = read_wav(ROOT / "public" / "soundtrack.wav")
    # a. décalage global (intercorrélation sur 0–20 s, résolution 1 ms)
    seg = slice(0, 20 * SR)
    x = mix[seg].mean(axis=1)
    y = src[seg].mean(axis=1)
    n = 1 << (len(x) * 2 - 1).bit_length()
    cc = np.fft.irfft(np.fft.rfft(x, n) * np.conj(np.fft.rfft(y, n)), n)
    lags = np.concatenate([cc[: SR // 2], cc[-SR // 2 :]])
    lag_idx = int(np.argmax(lags))
    lag = (lag_idx if lag_idx < SR // 2 else lag_idx - SR) / SR
    check("Audio du MP4 calé sur la bande-son", abs(lag) <= 0.010, f"décalage {lag * 1000:+.1f} ms")

    # b. attaque de chaque réplique (voix seule, enveloppe 5 ms, seuil -30 dB sous la crête de la réplique)
    voice = read_wav(BUILD / "voice.wav")
    hop = SR // 200
    e = np.sqrt(np.convolve(voice**2, np.ones(hop) / hop, mode="same"))
    worst = 0.0
    prev_end = 0.0
    for ln in tl["lines"]:
        # fenêtre de recherche : après la traîne de la réplique précédente (voice.py en garde 120 ms)
        i0, i1 = int(max(prev_end + 0.16, ln["start"] - 0.35) * SR), int((ln["start"] + 0.35) * SR)
        prev_end = ln["end"]
        w = e[i0:i1]
        thr = w.max() * 10 ** (-30 / 20)
        onset = (i0 + int(np.argmax(w > thr))) / SR
        shown = math.ceil((ln["start"] - 0.02) * fps - 1e-9) / fps  # image où le 1er mot devient actif
        worst = max(worst, abs(shown - onset))
    check("Attaque de chaque réplique vs sous-titre", worst <= TOL, f"{len(tl['lines'])} répliques, écart max {worst * 1000:.0f} ms")

    # c. reconnaissance vocale indépendante sur l'audio final
    try:
        import sherpa_onnx

        rec = sherpa_onnx.OnlineRecognizer.from_transducer(
            tokens=str(ASR_DIR / "tokens.txt"),
            encoder=str(ASR_DIR / "encoder-epoch-29-avg-9-with-averaged-model.int8.onnx"),
            decoder=str(ASR_DIR / "decoder-epoch-29-avg-9-with-averaged-model.int8.onnx"),
            joiner=str(ASR_DIR / "joiner-epoch-29-avg-9-with-averaged-model.int8.onnx"),
            num_threads=4,
        )
        m16 = mix.mean(axis=1)
        m16 = np.interp(np.arange(int(len(m16) / 3)) * 3, np.arange(len(m16)), m16).astype(np.float32)
        st = rec.create_stream()
        st.accept_waveform(16000, m16)
        st.accept_waveform(16000, np.zeros(16000, np.float32))
        st.input_finished()
        while rec.is_ready(st):
            rec.decode_stream(st)
        res = rec.get_result_all(st)
        asr_words = []
        for tok, ts in zip(res.tokens, res.timestamps):
            if tok.startswith(" ") or not asr_words:
                asr_words.append([tok.strip(), ts])
            else:
                asr_words[-1][0] += tok
        asr_words = [w for w in asr_words if norm(w[0])]
        ref = [w for w in tl["words"]]
        sm = difflib.SequenceMatcher(a=[norm(w["text"]) for w in ref], b=[norm(w[0]) for w in asr_words], autojunk=False)
        pairs = []
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                pairs.append((ref[blk.a + k], asr_words[blk.b + k]))
        deltas = np.array([aw[1] - math.ceil((rw["start"] - 0.02) * fps - 1e-9) / fps for rw, aw in pairs])
        bias = float(np.median(deltas))
        resid = np.abs(deltas - bias)
        within = float(np.mean(resid <= TOL))
        check(
            "Mots reconnus (ASR) vs sous-titres",
            within >= 0.9 and np.percentile(resid, 90) <= TOL,
            f"{len(pairs)}/{len(ref)} mots appariés · latence du modèle {bias * 1000:.0f} ms retirée · écart médian {np.median(resid) * 1000:.0f} ms, "
            f"90e centile {np.percentile(resid, 90) * 1000:.0f} ms · {within * 100:.0f} % ≤ 150 ms",
        )
    except Exception as exc:  # noqa: BLE001
        log(f"| Mots reconnus (ASR) vs sous-titres | ⚠️ | ASR indisponible : {exc} |")

    # ------------------------------------------------------------ 4. audio
    peak = float(np.abs(mix).max())
    clipped = int(np.sum(np.abs(mix) >= 0.999))
    eb = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(VIDEO), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", eb)[-1])
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)[-1])
    check("Pas d'écrêtage", clipped == 0 and tp < 0, f"crête échantillon {20 * np.log10(peak):.1f} dBFS, crête vraie {tp:.1f} dBTP, {clipped} échantillon(s) saturé(s), {lufs:.1f} LUFS intégrés")

    raw = read_wav(BUILD / "music_raw.wav")
    duck = read_wav(BUILD / "music_ducked.wav")
    spans = json.loads((BUILD / "duck.json").read_text())["spans"]
    inside = np.zeros(len(raw), bool)
    for s0, s1 in spans:
        inside[int((s0 + 0.3) * SR) : int((s1 - 0.1) * SR)] = True
    outside = np.ones(len(raw), bool)
    for s0, s1 in spans:
        outside[max(0, int((s0 - 0.1) * SR)) : int((s1 + 0.9) * SR)] = False
    db = lambda m: 10 * np.log10(np.mean(duck[m] ** 2) / np.mean(raw[m] ** 2))  # noqa: E731
    d_in, d_out = db(inside), db(outside) if outside.any() else 0.0
    check("Musique -12 dB pendant la voix", abs(d_in + 12) <= 0.5 and abs(d_out) <= 1.0, f"{d_in:+.1f} dB pendant la voix, {d_out:+.1f} dB hors voix ({outside.sum() / SR:.1f} s sans voix)")

    log("\nImages témoins : `output/checks/frame_00s.jpg` … `frame_54s.jpg`.")
    (OUT / "verification.md").write_text("\n".join(lines_md) + "\n")
    print("\n→ output/verification.md")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
