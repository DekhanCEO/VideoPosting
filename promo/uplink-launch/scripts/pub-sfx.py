#!/usr/bin/env python3
"""Bruitages de la publicité Uplink, synthétisés (aucun échantillon externe, aucun droit à gérer).

  whoosh.wav : souffle filtré qui balaie le spectre (morphings)
  tick.wav   : clic net et court (apparition du logo)
  chime.wav  : carillon léger (bouton d'appel à l'action)

Usage : python3 scripts/pub-sfx.py  → écrit public/pub/sfx/*.wav (44,1 kHz, mono, 16 bits)
"""
import math
import os
import wave

import numpy as np

RATE = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "pub", "sfx")
rng = np.random.default_rng(7)


def write(name: str, x: np.ndarray, peak_db: float = -3.0) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * (10 ** (peak_db / 20))
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def whoosh(dur: float = 0.6) -> np.ndarray:
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    # passe-bande d'état variable (SVF) dont la fréquence balaie 250 Hz → 2,8 kHz → 900 Hz
    sweep = np.interp(t, [0, dur * 0.55, dur], [250, 2800, 900])
    low = band = 0.0
    out = np.zeros(n)
    q = 1.6
    for i in range(n):
        f = 2 * math.sin(math.pi * sweep[i] / RATE)
        high = noise[i] - low - band / q
        band += f * high
        low += f * band
        out[i] = band
    env = np.interp(t, [0, dur * 0.55, dur], [0.0, 1.0, 0.0]) ** 1.6
    return out * env


def tick(dur: float = 0.09) -> np.ndarray:
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    click = rng.standard_normal(n) * np.exp(-t / 0.0012)
    click = np.diff(click, prepend=0.0)  # passe-haut grossier : clic sec
    tone = np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.018) * 0.6
    return click * 0.5 + tone


def chime(dur: float = 1.7) -> np.ndarray:
    n = int(RATE * dur)
    t = np.arange(n) / RATE
    partials = [(880.0, 1.0, 1.1), (1318.5, 0.55, 0.85), (1760.0, 0.32, 0.6), (2637.0, 0.14, 0.4)]
    x = np.zeros(n)
    for f, a, d in partials:
        x += a * np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 5 * t)) * np.exp(-t / d)
    attack = np.clip(t / 0.006, 0, 1)
    return x * attack


if __name__ == "__main__":
    write("whoosh.wav", whoosh(), -4.0)
    write("tick.wav", tick(), -5.0)
    write("chime.wav", chime(), -4.0)
    print("ok :", os.path.abspath(OUT))
