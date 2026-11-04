#!/usr/bin/env python3
"""Bande-son complète de la vidéo (55 s, 48 kHz stéréo), sans aucun échantillon externe :

- musique libre de droits générée ici même (pop électro « tech startup », 120 BPM, la mineur / do majeur),
  structurée sur les scènes : accroche → problème (filtré, sombre) → solutions (groove lumineux)
  → bémol (break, nappe seule) → appel à l'action (groove + final) ;
- bruitages synthétisés, placés sur les images calculées par src/cues.ts (via scripts/export-cues.mjs) ;
- ducking automatique : la musique baisse de 12 dB pendant la voix (enveloppe 60 ms / 250 ms) ;
- mixage final normalisé (crête ≤ -1 dBFS).

Entrées : build/voice.wav, src/data/timeline.json   (npm run voice)
Sorties : public/soundtrack.wav (utilisé par Remotion), build/music_raw.wav, build/music_ducked.wav, build/duck.json
Usage   : npm run audio
"""
from __future__ import annotations

import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SR = 48000
FPS = 30
DUR = 55.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM
DUCK_DB = -12.0
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR


# ------------------------------------------------------------------ utilitaires
def read_wav(p: Path) -> np.ndarray:
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2)
    return x


def write_wav(p: Path, x: np.ndarray) -> None:
    x = np.atleast_2d(x.T).T if x.ndim == 1 else x
    with wave.open(str(p), "wb") as w:
        w.setnchannels(x.shape[1] if x.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env(n, a, d):
    tt = np.arange(n) / SR
    return np.clip(tt / max(a, 1e-4), 0, 1) * np.exp(-tt / d)


def place(buf, start, sig, gain=1.0):
    i = int(round(start * SR))
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    if i < 0:
        sig, i = sig[-i:], 0
        j = min(len(buf), len(sig))
    buf[i:j] += sig[: j - i] * gain


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def osc(kind, f, n, ph=0.0):
    tt = np.arange(n) / SR
    p = (f * tt + ph) % 1.0
    if kind == "saw":
        return 2 * p - 1
    if kind == "sq":
        return np.where(p < 0.5, 1.0, -1.0)
    if kind == "tri":
        return 4 * np.abs(p - 0.5) - 1
    return np.sin(2 * np.pi * p)


def smooth_step(x0, x1, t):
    u = np.clip((t - x0) / max(1e-6, x1 - x0), 0, 1)
    return u * u * (3 - 2 * u)


# ------------------------------------------------------------------ musique
def music(scenes: dict[str, tuple[float, float]]) -> np.ndarray:
    L = np.zeros(N)
    R = np.zeros(N)
    # vi – IV – I – V  (la mineur → fa → do → sol), un accord par mesure (2 s)
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
    s_prob, e_prob = scenes["probleme"]
    s_bem, e_bem = scenes["bemol"]
    s_cta, _ = scenes["cta"]

    def section(t):
        if t < s_prob:
            return "hook"
        if t < e_prob:
            return "probleme"
        if s_bem <= t < e_bem:
            return "bemol"
        if t >= DUR - 0.55:
            return "end"
        return "groove"

    nbeats = int(DUR / BEAT) + 1
    for b in range(nbeats):
        t0 = b * BEAT
        sec = section(t0)
        bar = int(t0 // (4 * BEAT))
        root, chord = prog[bar % 4]
        pos = b % 4
        if sec == "end":
            continue
        # grosse caisse
        if sec in ("hook", "groove") or (sec == "probleme" and pos in (0, 2)) or (sec == "bemol" and pos == 0 and t0 > s_bem + 2.5):
            n = int(0.35 * SR)
            tt = np.arange(n) / SR
            f = 45 + 85 * np.exp(-tt / 0.035)
            k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16)
            k += 0.4 * rng.standard_normal(n) * np.exp(-tt / 0.003)
            g = 0.55 if sec != "bemol" else 0.3
            place(L, t0, k, g)
            place(R, t0, k, g)
        # clap sur 2 et 4
        if sec == "groove" and pos in (1, 3):
            n = int(0.25 * SR)
            c = bp(rng.standard_normal(n), 900, 3500) * env(n, 0.001, 0.07)
            for dt in (0, 0.011, 0.022):
                place(L, t0 + dt, c, 0.17)
                place(R, t0 + dt + 0.004, c, 0.17)
        # charleston sur les contretemps (+ doubles croches discrètes)
        if sec in ("groove", "hook"):
            for k8 in range(2):
                n = int(0.06 * SR)
                h = hp(rng.standard_normal(n), 7000) * env(n, 0.0005, 0.018 if k8 == 0 else 0.03)
                g = 0.05 if k8 == 0 else 0.09
                place(L, t0 + k8 * BEAT / 2, h, g * 1.1)
                place(R, t0 + k8 * BEAT / 2, h, g * 0.8)
        # basse en croches (pompe), coupée pendant le bémol
        if sec != "bemol":
            for k8 in range(2):
                n = int(BEAT / 2 * SR * 0.9)
                f = note(root - 12)
                bs = 0.6 * osc("saw", f, n) + 0.5 * osc("sin", f / 2, n)
                bs = lp(bs, 520 if sec != "probleme" else 260) * env(n, 0.004, 0.14)
                g = 0.22 if sec != "probleme" else 0.18
                place(L, t0 + k8 * BEAT / 2, bs, g)
                place(R, t0 + k8 * BEAT / 2, bs, g)
        # arpège « pluck » en doubles croches (solutions + accroche)
        if sec in ("groove", "hook"):
            seq = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
            for k16 in range(4):
                n = int(0.22 * SR)
                f = note(seq[(b * 4 + k16) % 4])
                p = 0.6 * osc("sq", f, n) + 0.4 * osc("saw", f * 1.003, n)
                p = lp(p, 2600) * env(n, 0.002, 0.07)
                pan = 0.35 if k16 % 2 else -0.35
                place(L, t0 + k16 * BEAT / 4, p, 0.06 * (1 - pan))
                place(R, t0 + k16 * BEAT / 4, p, 0.06 * (1 + pan))

    # nappe : un accord par mesure, attaque douce, plus présente pendant le bémol et le problème
    for bar in range(int(DUR / (4 * BEAT)) + 1):
        t0 = bar * 4 * BEAT
        if t0 >= DUR - 0.6:
            break
        root, chord = prog[bar % 4]
        n = int(4 * BEAT * SR * 1.1)
        pad_l = np.zeros(n)
        pad_r = np.zeros(n)
        for m in chord + [chord[0] + 12]:
            f = note(m)
            pad_l += osc("saw", f * 0.997, n, rng.random()) + osc("saw", f * 1.004, n, rng.random())
            pad_r += osc("saw", f * 1.002, n, rng.random()) + osc("saw", f * 0.995, n, rng.random())
        e = np.clip(np.arange(n) / (0.4 * SR), 0, 1) * np.clip((n - np.arange(n)) / (0.5 * SR), 0, 1)
        place(L, t0, lp(pad_l, 1400) * e, 0.012)
        place(R, t0, lp(pad_r, 1400) * e, 0.012)

    mix = np.stack([L, R], axis=1)
    # filtre « problème » : on assombrit (passe-bas) avec des fondus de 0,4 s
    dark = np.stack([lp(L, 650, 4), lp(R, 650, 4)], axis=1)
    w = (smooth_step(s_prob - 0.2, s_prob + 0.2, t_all) * (1 - smooth_step(e_prob - 0.4, e_prob + 0.05, t_all)))[:, None]
    mix = mix * (1 - w) + dark * w * 1.25
    # break du bémol : nappe un peu plus forte, sinon rien
    # final : accord tenu + cloche sur le dernier temps
    t_end = DUR - 0.55
    n = int(0.55 * SR)
    for m in [57, 60, 64, 69, 72]:
        s = osc("saw", note(m), n) + osc("saw", note(m) * 1.005, n)
        s = lp(s, 2200) * env(n, 0.003, 0.25)
        mix[int(t_end * SR) : int(t_end * SR) + n] += (s * 0.03)[:, None]
    # fondu de sortie (dernières 0,25 s)
    mix *= (1 - smooth_step(DUR - 0.25, DUR, t_all))[:, None]
    # rampe d'entrée très courte pour éviter un clic
    mix *= smooth_step(0, 0.01, t_all)[:, None]
    return mix


# ------------------------------------------------------------------ bruitages
def sfx(kind: str) -> np.ndarray:
    def nz(sec):
        return rng.standard_normal(int(sec * SR))

    if kind == "pop":
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        f = 380 + 900 * np.exp(-tt / 0.02)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.035) * 0.8
    if kind == "key":
        n = int(0.03 * SR)
        return bp(nz(0.03), 2000, 6000) * env(n, 0.0003, 0.006) * 0.9
    if kind == "whoosh" or kind == "swish":
        d = 0.32 if kind == "whoosh" else 0.22
        n = int(d * SR)
        x = nz(d)
        tt = np.arange(n) / SR
        # balayage : 4 bandes de bruit qui se relaient (grave → aigu → grave)
        y = np.zeros(n)
        for k, (lo, hi) in enumerate([(300, 900), (900, 2500), (2500, 6000), (6000, 12000)]):
            centre = d * (0.2 + 0.2 * k)
            y += bp(x, lo, hi) * np.exp(-(((tt - centre) / (d * 0.22)) ** 2))
        return y * np.sin(np.pi * tt / d) ** 1.5 * 0.5
    if kind == "zoom":
        a = sfx("whoosh")
        n = int(0.4 * SR)
        tt = np.arange(n) / SR
        f = 600 * 2 ** (tt / 0.4 * 2)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.4) * 0.12
        out = np.zeros(n)
        out[: len(a)] += a
        return out + s
    if kind == "impact":
        n = int(0.7 * SR)
        tt = np.arange(n) / SR
        f = 40 + 120 * np.exp(-tt / 0.05)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.25)
        crash = hp(nz(0.7), 3000) * np.exp(-tt / 0.18) * 0.25
        return (b + crash) * 0.85
    if kind == "glitch":
        n = int(0.28 * SR)
        y = np.zeros(n)
        for i in range(0, n, 960):
            f = rng.choice([220, 330, 880, 1320, 160])
            y[i : i + 960] = osc("sq", f, min(960, n - i)) * rng.uniform(0.2, 0.6)
        return lp(y, 5000) * 0.35
    if kind == "tick":
        out = np.zeros(int(0.7 * SR))
        for k in range(4):
            c = sfx("key") * 1.4
            place(out, k * 0.16, hp(c, 1500), 1)
        return out
    if kind == "error":
        n = int(0.24 * SR)
        a = osc("sq", 466, n // 2) * env(n // 2, 0.002, 0.05)
        b = osc("sq", 349, n // 2) * env(n // 2, 0.002, 0.07)
        return lp(np.concatenate([a, b]), 2500) * 0.35
    if kind == "sad":
        n = int(0.9 * SR)
        tt = np.arange(n) / SR
        f = 420 * 2 ** (-tt / 0.9 * 0.8) * (1 + 0.02 * np.sin(2 * np.pi * 6 * tt))
        return lp(np.sin(2 * np.pi * np.cumsum(f) / SR), 3000) * env(n, 0.02, 0.5) * 0.5
    if kind == "ding":
        n = int(1.0 * SR)
        tt = np.arange(n) / SR
        y = sum(a * np.sin(2 * np.pi * 1318.5 * r * tt) * np.exp(-tt / d) for r, a, d in [(1, 1, 0.5), (2.76, 0.35, 0.18), (5.4, 0.18, 0.08)])
        return y * np.clip(tt / 0.002, 0, 1) * 0.35
    if kind == "check":
        out = np.zeros(int(0.4 * SR))
        for k, m in enumerate([76, 83]):
            n = int(0.25 * SR)
            s = (osc("sin", note(m), n) + 0.3 * osc("tri", note(m) * 2, n)) * env(n, 0.002, 0.08)
            place(out, k * 0.07, s, 0.45)
        return out
    if kind == "sparkle":
        out = np.zeros(int(0.8 * SR))
        for k in range(9):
            n = int(0.18 * SR)
            f = rng.uniform(2200, 5200)
            place(out, k * 0.06 + rng.uniform(0, 0.02), osc("sin", f, n) * env(n, 0.001, 0.05), 0.18)
        return out
    if kind == "buzz":
        n = int(0.9 * SR)
        tt = np.arange(n) / SR
        y = osc("saw", 190, n) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * tt))
        return bp(y, 300, 2500) * np.sin(np.pi * tt / 0.9) * 0.22
    if kind == "zap":
        n = int(0.35 * SR)
        tt = np.arange(n) / SR
        f = 2400 * np.exp(-tt / 0.08) + 200
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.12) * 0.35
    if kind == "confetti":
        out = np.zeros(int(0.9 * SR))
        for k in range(14):
            place(out, rng.uniform(0, 0.45), sfx("pop") * rng.uniform(0.2, 0.5), 1)
        place(out, 0.05, sfx("sparkle"), 0.8)
        return out
    if kind == "warn":
        out = np.zeros(int(0.6 * SR))
        for k, m in enumerate([72, 67]):
            n = int(0.22 * SR)
            s = lp(osc("tri", note(m), n), 3000) * env(n, 0.005, 0.12)
            place(out, k * 0.2, s, 0.5)
        return out
    if kind == "bubble":
        n = int(0.18 * SR)
        tt = np.arange(n) / SR
        f = 300 + 1400 * tt / 0.18
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.06) * 0.6
    raise ValueError(kind)


# ------------------------------------------------------------------ ducking
def duck_envelope(lines: list[dict]) -> np.ndarray:
    """1 pendant la voix (avec 80 ms d'avance et 150 ms de traîne), respirations < 0,4 s pontées ; 0 sinon."""
    spans = []
    for ln in sorted(lines, key=lambda x: x["start"]):
        a, b = ln["start"] - 0.08, ln["end"] + 0.15
        if spans and a - spans[-1][1] < 0.4:
            spans[-1][1] = max(spans[-1][1], b)
        else:
            spans.append([a, b])
    target = np.zeros(N)
    for a, b in spans:
        target[max(0, int(a * SR)) : min(N, int(b * SR))] = 1
    # lissage attaque 60 ms / relâchement 250 ms (suiveur d'enveloppe à 1 pôle, asymétrique)
    out = np.empty(N)
    up, down = 1 - np.exp(-1 / (0.06 * SR / 4)), 1 - np.exp(-1 / (0.25 * SR / 4))
    acc = 0.0
    for i in range(0, N, 4):  # par pas de 4 échantillons (suffisant à 48 kHz)
        tg = target[i]
        acc += (up if tg > acc else down) * (tg - acc)
        out[i : i + 4] = acc
    return out, spans


def main() -> None:
    tl = json.loads((ROOT / "src" / "data" / "timeline.json").read_text())
    subprocess.run(["node", str(ROOT / "scripts" / "export-cues.mjs")], check=True)
    cues = json.loads((BUILD / "cues.json").read_text())
    scenes = {s["id"]: (s["from"] / FPS, s["to"] / FPS) for s in tl["scenes"]}

    voice = read_wav(BUILD / "voice.wav")
    m = music(scenes)
    m *= 0.32 / np.sqrt(np.mean(m**2)) * 0.2  # niveau de la musique sans ducking (~ -24 dBFS RMS)
    write_wav(BUILD / "music_raw.wav", m)

    d, spans = duck_envelope(tl["lines"])
    gain = 10 ** (DUCK_DB * d / 20)
    md = m * gain[:, None]
    write_wav(BUILD / "music_ducked.wav", md)
    (BUILD / "duck.json").write_text(json.dumps({"duck_db": DUCK_DB, "spans": spans}))

    fx = np.zeros((N, 2))
    for c in cues:
        s = sfx(c["kind"])
        pan = rng.uniform(-0.25, 0.25)
        start = c["frame"] / FPS
        place(fx[:, 0], start, s, c["gain"] * 0.5 * (1 - pan))
        place(fx[:, 1], start, s, c["gain"] * 0.5 * (1 + pan))
    # les bruitages restent sous la voix : -6 dB quand elle parle
    fx *= (10 ** (-6 * d / 20))[:, None]

    mix = voice[:, None] * 0.9 + md + fx * 0.6
    peak = np.abs(mix).max()
    mix *= 10 ** (-1.0 / 20) / peak  # crête à -1 dBFS
    (ROOT / "public").mkdir(exist_ok=True)
    write_wav(ROOT / "public" / "soundtrack.wav", mix)
    print(f"public/soundtrack.wav : {DUR:.0f} s, crête -1,0 dBFS (gain {20 * np.log10(10 ** (-1 / 20) / peak):+.1f} dB), "
          f"{len(cues)} bruitages, {len(spans)} zones de ducking")


if __name__ == "__main__":
    main()
