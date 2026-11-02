#!/usr/bin/env python3
"""Bande-son de « Première » (25 s, 48 kHz stéréo), entièrement synthétisée (aucun échantillon externe).

Ouverture cinéma en si mineur, puis groove épuré à 120 BPM (1 temps = 15 images) pour les épisodes :
  0–64      coup grave d'ouverture, souffle du mur qui défile et ralentit, nappe
  66–141    l'affiche sort du mur (souffle qui monte), petits clics de l'interface, appui, glissando de la
            publication, trois tintements (TikTok, YouTube, Instagram), carillon de réussite
  150–196   la fiche s'éteint (balayage), rubans (glissando scintillant), aspiration, IMPACT, notes sur « Uplink »
  240–304   plongeon dans le triangle, liste des épisodes (clics), lancement
  300–660   groove ; glissés à chaque épisode, notifications, chiffres qui roulent, ping Discord, courbe
  660–750   accord final, reflet, adresse ; fondu court.

Usage : npm run audio:premiere   (écrit out/premiere.wav puis l'encode en AAC dans public/premiere/premiere.m4a)
"""
import os
import sys
import wave

import numpy as np

SR = 48000
DUR = 25.0
N = int(SR * DUR)
FPS = 30
BEAT = 15 / FPS  # 120 BPM
t = np.arange(N) / SR
rng = np.random.default_rng(31)


def fr(f):
    return f / FPS


def lowpass(x, cutoff):
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def lp2(x, cutoff):
    return lowpass(lowpass(x, cutoff), cutoff)


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def env(n, attack, decay):
    tt = np.arange(n) / SR
    return np.clip(tt / max(attack, 1e-4), 0, 1) * np.exp(-tt / decay)


def place(buf, start_s, sig, gain=1.0):
    i = int(round(start_s * SR))
    if i >= len(buf) or i + len(sig) <= 0:
        return
    s0 = max(0, -i)
    i = max(0, i)
    j = min(len(buf), i + len(sig) - s0)
    buf[i:j] += sig[s0 : s0 + j - i] * gain


def saw(freq, n, detune=0.0):
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for d in ([-detune, 0.0, detune] if detune else [0.0]):
        out += 2 * ((freq * (1 + d) * tt + rng.random()) % 1.0) - 1
    return out / (3 if detune else 1)


def reverb(x, seconds=2.2, mix=0.25):
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = lowpass(ir, 4500)
    ir /= np.sqrt(np.sum(ir**2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - mix) + wet * mix


def bezier_ease(u, x1, y1, x2, y2):
    s = np.linspace(0, 1, 4001)
    bx = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s**2 * x2 + s**3
    by = 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s**2 * y2 + s**3
    return np.interp(np.clip(u, 0, 1), bx, by)


# --- instruments --------------------------------------------------------------------------------------------------
def kick(d=0.32, depth=130):
    n = int(SR * d)
    tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(46 + depth * np.exp(-tt * 30)) / SR) * np.exp(-tt * 9)
    return (body + highpass(rng.standard_normal(n), 3000) * np.exp(-tt * 320) * 0.3) * np.clip(tt / 0.002, 0, 1)


def snap():
    n = int(SR * 0.16)
    tt = np.arange(n) / SR
    return highpass(lowpass(rng.standard_normal(n), 5000), 1500) * np.exp(-tt * 45) * 0.6


def hat(open_=False):
    n = int(SR * (0.14 if open_ else 0.04))
    tt = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 8000) * np.exp(-tt * (20 if open_ else 100)) * 0.3


def pluck(freq, d=0.4, bright=1.0):
    n = int(SR * d)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tt) + 0.4 * bright * np.sin(4 * np.pi * freq * tt) * np.exp(-tt * 10) + 0.15 * np.sin(6 * np.pi * freq * tt) * np.exp(-tt * 18)
    return x * env(n, 0.003, d * 0.35)


def subbass(freq, d):
    n = int(SR * d)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * tt) * np.clip(tt / 0.01, 0, 1) * np.exp(-tt / (d * 0.7))


def pad(freqs, d, cutoff=2200, attack=0.6):
    n = int(SR * d)
    x = sum(saw(f, n, 0.007) for f in freqs) / len(freqs)
    tt = np.arange(n) / SR
    return lp2(x, cutoff) * np.clip(tt / attack, 0, 1) * np.clip((d - tt) / 0.4, 0, 1)


def whoosh(d=0.5, up=True, lo=400, hi=5000):
    n = int(SR * d)
    tt = np.arange(n) / SR
    cut = np.interp(tt, [0, d * 0.7, d], [lo, hi, lo * 3] if up else [hi, lo * 2, lo])
    s = lowpass(highpass(rng.standard_normal(n), 200), cut)
    return s * np.interp(tt, [0, d * 0.7, d], [0, 1, 0]) ** 1.5


def boom(d=3.0):
    n = int(SR * d)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-tt * 4)) / SR) * np.exp(-tt * 1.4)
    tom = np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-tt * 12)) / SR) * np.exp(-tt * 6) * 0.6
    air = lowpass(rng.standard_normal(n), 1800) * np.exp(-tt * 9) * 0.35
    return (sub + tom + air) * np.clip(tt / 0.003, 0, 1)


def reverse_swell(d, hi=True):
    n = int(SR * d)
    tt = np.arange(n) / SR
    s = lowpass(highpass(rng.standard_normal(n), 2500 if hi else 600), 9000) * (tt / d) ** 3
    return s * 0.7


def glide(f0, f1, d, bright=0.5):
    n = int(SR * d)
    tt = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (tt / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + bright * 0.3 * np.sin(2 * ph)) * np.clip(tt / 0.02, 0, 1) * np.clip((d - tt) / 0.05, 0, 1)


def shimmer(d, f0=600, f1=4000, voices=14):
    """Glissando scintillant : plusieurs voix qui montent à des vitesses différentes (les rubans)."""
    n = int(SR * d)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for v in range(voices):
        a = f0 * (1 + 0.5 * rng.random())
        b = f1 * (0.6 + 0.6 * rng.random())
        start = rng.random() * 0.35 * d
        k = np.clip((tt - start) / (d - start), 0, 1)
        f = a * (b / a) ** k
        e = np.where(tt >= start, np.sin(np.pi * k) ** 2, 0)
        out += np.sin(2 * np.pi * np.cumsum(f) / SR) * e
    return out / voices


def tick(freq=3600):
    n = int(SR * 0.03)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * tt) * 0.6 + highpass(rng.standard_normal(n), 5000) * 0.4) * np.exp(-tt * 260)


def click():
    n = int(SR * 0.05)
    tt = np.arange(n) / SR
    return (np.diff(rng.standard_normal(n) * np.exp(-tt / 0.0015), prepend=0) * 0.6 + np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt / 0.006)) * 0.9


def marimba(freq, d=0.6):
    n = int(SR * d)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * tt) + 0.25 * np.sin(2 * np.pi * freq * 3.9 * tt) * np.exp(-tt * 30)) * env(n, 0.002, 0.16)


def bell(freq, d=2.5):
    n = int(SR * d)
    tt = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 1.4 * tt) * 2.0 * np.exp(-tt * 2.5)
    return np.sin(2 * np.pi * freq * tt + mod) * env(n, 0.003, 0.9)


# --- accords (si mineur : i – VI – III – VII) ---------------------------------------------------------------------
B2, D3, FS3, G2, A2, CS3, E3, A3, B3, D4, FS4 = 123.47, 146.83, 185.0, 98.0, 110.0, 138.59, 164.81, 220.0, 246.94, 293.66, 369.99
CHORDS = [[B2, D3, FS3], [G2, B2, D3], [D3, FS3, A3], [A2, CS3, E3]]

music = np.zeros(N)
drums = np.zeros(N)
fx = np.zeros(N)

# Ouverture (0–150) : coup grave, souffle du mur qui ralentit, nappe
place(fx, 0, boom(2.4), 0.75)
wall_speed = 1 - bezier_ease(t / fr(64), 0.22, 1, 0.36, 1)
rush = lowpass(highpass(rng.standard_normal(N), 300), 600 + 5000 * wall_speed) * wall_speed**1.3 * (t < fr(70))
fx += rush * 0.35
place(music, 0, pad([B2, D3, FS3, B3], fr(150) + 0.4, 1600, 0.05), 0.2)
place(music, 0, subbass(B2 / 2, fr(150)), 0.25)
place(fx, fr(-6) + 0.2, marimba(B3 * 2), 0.18)  # « Publie une fois. »
place(fx, fr(14), marimba(FS4 * 2), 0.28)  # « Diffuse partout. »
place(fx, fr(64), tick(1800), 0.35)  # le mur se pose
place(fx, fr(62), whoosh(1.1, True, 400, 6500), 0.75)  # l'affiche sort du mur
for k, f in enumerate((96, 100, 104, 108)):
    place(fx, fr(f), tick(3000 + 300 * k), 0.32)
place(fx, fr(122), click(), 0.6)  # appui
place(fx, fr(125), glide(330, 990, fr(16), 0.6), 0.1)  # publication
for i, f in enumerate((129, 133, 137)):
    place(fx, fr(f), marimba([FS4 * 2, A3 * 4, B3 * 4][i], 0.7), 0.34)
place(fx, fr(141), bell(B3 * 4, 1.6), 0.2)
place(fx, fr(141) + 0.004, bell(FS4 * 2, 1.4), 0.12)

# Générique (150–256)
place(fx, fr(150), whoosh(0.22, False, 300, 7000), 0.85)  # la fiche s'éteint
place(fx, fr(157), shimmer(fr(30), 900, 5000, 18), 1.0)  # les rubans
place(fx, fr(157), whoosh(fr(31), True, 300, 6000), 0.55)  # montée sous les rubans
place(music, fr(157), pad([B2, FS3, B3, D4], fr(40), 1400, 0.3), 0.1)
place(fx, fr(188), reverse_swell(fr(8)), 1.1)  # aspiration
place(fx, fr(196), boom(3.0), 1.0)  # IMPACT
place(music, fr(196), pad([D3, FS3, A3, D4, FS4], fr(44) + 0.6, 3200, 0.02), 0.22)
for i, f in enumerate((204, 208, 212)):  # « Uplink »
    place(fx, fr(f), marimba([D4 * 2, FS4 * 2, A3 * 4][i], 0.9), 0.16)
place(fx, fr(214), bell(D4 * 2, 2.0), 0.08)
place(fx, fr(238), whoosh(fr(18) + 0.1, True, 200, 7000), 0.55)  # plongeon
place(fx, fr(256), tick(2200), 1.0)
for k, f in enumerate((260, 264, 268, 272)):
    place(fx, fr(f), tick(2600 + 250 * k), 0.45)
place(fx, fr(276), marimba(B3 * 2, 0.4), 0.12)
place(fx, fr(285), click(), 0.5)
place(fx, fr(290), whoosh(0.5, True, 300, 4500), 0.4)

# Épisodes (300–660) : groove épuré
g0, g1 = fr(300), fr(660)
nbeats = int(round((g1 - g0) / BEAT))
duck = np.ones(N)
for bt in range(nbeats):
    st = g0 + bt * BEAT
    bar = bt // 4
    chord = CHORDS[bar % 4]
    place(drums, st, kick(), 0.8)
    i = int(st * SR)
    nn = min(N - i, int(SR * 0.25))
    duck[i : i + nn] = np.minimum(duck[i : i + nn], 1 - 0.5 * np.exp(-np.arange(nn) / SR / 0.08))
    if bt % 2 == 1:
        place(drums, st, snap(), 0.5)
    for h in range(2):
        place(drums, st + h * BEAT / 2, hat(open_=(h == 1 and bt % 4 == 3)), 0.32 if h else 0.2)
    place(music, st + BEAT / 2, pluck(chord[0], 0.25, 0.4), 0.16)
    for a in range(2):  # arpège en croches
        place(music, st + a * BEAT / 2, pluck(chord[(bt * 2 + a) % 3] * 2, 0.3, 0.8), 0.07)
padbuf = np.zeros(N)
subbuf = np.zeros(N)
for bar in range(int(np.ceil(nbeats / 4))):
    st = g0 + bar * 4 * BEAT
    d = min(4 * BEAT, g1 - st)
    place(padbuf, st, pad(CHORDS[bar % 4], d + 0.3, 1800, 0.2), 0.08)
    place(subbuf, st, subbass(CHORDS[bar % 4][0] / 2, d), 0.35)
music += (padbuf + subbuf) * duck
for f in (384, 474, 564):  # glissés d'un épisode à l'autre
    place(fx, fr(f), whoosh(0.42, True, 400, 6000), 0.7)
for i, f in enumerate((336, 341, 346)):  # notifications
    place(fx, fr(f), marimba([B3 * 4, D4 * 4, FS4 * 4][i] / 2, 0.6), 0.22)
    place(fx, fr(f) + 0.08, marimba([B3 * 4, D4 * 4, FS4 * 4][i], 0.6), 0.14)
# chiffres de « 19:00 » qui roulent (même courbe que l'image)
for d_, n_ in [(0, 7), (2, 8), (5, 5), (7, 7)]:
    fine = np.arange(0, 20.01, 0.25)
    k = np.floor(bezier_ease(fine / 20, 0.22, 1, 0.36, 1) * (n_ - 1) + 1e-6)
    for j in range(1, len(fine)):
        if k[j] > k[j - 1]:
            place(fx, fr(390 + 10 + d_ + fine[j]), tick(4200), 0.7)
place(fx, fr(494), whoosh(0.35, True, 400, 6000), 0.55)  # le message Discord sort
place(fx, fr(506), marimba(1318.5, 0.6), 0.2)
place(fx, fr(511), marimba(1760.0, 0.7), 0.18)
for i, f in enumerate((580, 584, 588)):
    place(fx, fr(f), tick(2400 + 400 * i), 0.4)
place(fx, fr(596), glide(440, 1320, fr(26), 0.4), 0.06)  # la courbe se trace
place(fx, fr(618), marimba(FS4 * 2, 0.6), 0.16)

# Fin (652–750) : accord final, reflet, adresse
place(music, fr(652), pad([D3, FS3, A3, D4, E3 * 2, FS4], DUR - fr(652), 3000, 0.4), 0.2)
place(music, fr(660), subbass(D3 / 2, DUR - fr(660)), 0.3)
place(fx, fr(660), boom(2.2), 0.45)
place(fx, fr(682), shimmer(0.8, 1200, 5000, 8), 0.22)  # reflet sur le logo
place(fx, fr(668), marimba(D4 * 2, 0.9), 0.12)
place(fx, fr(696), bell(A3 * 4, 2.0), 0.16)  # l'adresse
place(fx, fr(718), shimmer(0.7, 1500, 6000, 6), 0.1)

# --- mixage ---------------------------------------------------------------------------------------------------------
# La musique s'efface de 5 dB au plus sous chaque effet, pour que tous les bruitages ressortent.
fx_env = lowpass(np.abs(fx), 12.0)
fx_env /= np.max(fx_env) + 1e-9
side = 1 - 0.44 * np.clip(fx_env * 4, 0, 1)
music = music * side
drums = drums * side
music = reverb(music, 2.4, 0.26)
fx = reverb(fx, 1.6, 0.18)
drums = reverb(drums, 0.9, 0.08)
pan = 0.14 * np.sin(2 * np.pi * t / 3.1)
L = drums + music * (1 + pan) + fx
R = drums + music * (1 - pan) + fx
fade = np.clip((DUR - t) / 0.35, 0, 1)
mix = np.stack([L * fade, R * fade], axis=1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 10 ** (-1.0 / 20)

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "out", "premiere.wav")
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok", os.path.abspath(out), f"{nbeats} temps de groove")
