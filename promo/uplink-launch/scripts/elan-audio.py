#!/usr/bin/env python3
"""Bande-son de la vidéo « Élan » (15 s, 48 kHz stéréo), entièrement synthétisée (aucun échantillon externe).

Électro à 150 BPM (1 temps = 12 images) en fa dièse mineur, calée sur les temps forts de l'image :
  0 / 24 / 48     coups sur « 1 vidéo. », « 3 réseaux. », « 1 clic. » (tension qui monte)
  54 → 60         le clic, aspiration, puis l'impact (grave + éclat) ; souffle du volet chevron
  72 → 348        le groove (grosse caisse, clap, charleston, basse, accords) ; souffles aux changements de pose,
                  tintements des trois coches, cliquetis de l'odomètre, notification Discord, montée vers le volet
  348 → 450       impact, puis résolution premium : nappe ouverte, cloche sur le logo, fondu court à la fin.

Usage : npm run audio:elan   (écrit out/elan.wav, puis l'encode en AAC dans public/elan/elan.m4a)
"""
import os
import sys
import wave

import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
FPS = 30
BEAT = 12 / FPS  # 150 BPM
t = np.arange(N) / SR
rng = np.random.default_rng(23)


def fr(f):
    return f / FPS


def lowpass(x, cutoff):
    """Passe-bas un pôle (coupure fixe ou par échantillon)."""
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
        ph = (freq * (1 + d) * tt + rng.random()) % 1.0
        out += 2 * ph - 1
    return out / (3 if detune else 1)


def reverb(x, seconds=1.6, mix=0.2):
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = lowpass(ir, 5000)
    ir /= np.sqrt(np.sum(ir**2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - mix) + wet * mix


# --- instruments --------------------------------------------------------------------------------------------------
def kick(big=False):
    d = 0.5 if big else 0.32
    n = int(SR * d)
    tt = np.arange(n) / SR
    f = 44 + (170 if big else 130) * np.exp(-tt * (22 if big else 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (5 if big else 10))
    click = highpass(rng.standard_normal(n), 3000) * np.exp(-tt * 300) * 0.4
    return (body + click) * np.clip(tt / 0.002, 0, 1)


def clap():
    n = int(SR * 0.25)
    tt = np.arange(n) / SR
    noise = highpass(lowpass(rng.standard_normal(n), 3500), 900)
    e = np.zeros(n)
    for k, dt in enumerate([0.0, 0.011, 0.022]):
        e += np.where(tt >= dt, np.exp(-(tt - dt) * (180 if k < 2 else 22)), 0)
    return noise * e * 0.7


def hat(open_=False):
    n = int(SR * (0.16 if open_ else 0.045))
    tt = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 7500) * np.exp(-tt * (18 if open_ else 90)) * 0.35


def stab(freqs, d=0.22, bright=4200):
    n = int(SR * d)
    x = sum(saw(f, n, 0.006) for f in freqs) / len(freqs)
    return lp2(x, bright) * env(n, 0.003, d * 0.45)


def bass(freq, d):
    n = int(SR * d)
    x = saw(freq, n, 0.004) * 0.7 + np.sin(2 * np.pi * freq * np.arange(n) / SR) * 0.6
    cut = 300 + 1600 * np.exp(-np.arange(n) / SR * 14)
    return lowpass(x, cut) * env(n, 0.004, d * 0.6)


def whoosh(d=0.45, up=True):
    n = int(SR * d)
    tt = np.arange(n) / SR
    cut = np.interp(tt, [0, d * 0.7, d], [500, 5200, 1500] if up else [5000, 900, 400])
    s = lowpass(highpass(rng.standard_normal(n), 250), cut)
    return s * np.interp(tt, [0, d * 0.7, d], [0, 1, 0]) ** 1.5


def riser(d):
    n = int(SR * d)
    tt = np.arange(n) / SR
    k = tt / d
    s = lowpass(highpass(rng.standard_normal(n), 400), 500 + 7000 * k**2) * k**2.2
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * k**2) / SR) * k**3 * 0.25
    return s + tone


def impact():
    n = int(SR * 1.8)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-tt * 5)) / SR) * np.exp(-tt * 2.2)
    crash = highpass(rng.standard_normal(n), 2500) * np.exp(-tt * 3.2) * 0.35
    snap = lowpass(rng.standard_normal(n), 2500) * np.exp(-tt * 25) * 0.6
    return (sub + crash + snap) * np.clip(tt / 0.002, 0, 1)


def reverse_swell(d):
    n = int(SR * d)
    tt = np.arange(n) / SR
    s = highpass(rng.standard_normal(n), 3000) * (tt / d) ** 3
    return s * 0.6


def ding(freq, d=0.7):
    n = int(SR * d)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * tt) * np.exp(-tt * 8) + 0.12 * np.sin(2 * np.pi * freq * 3 * tt) * np.exp(-tt * 14)
    return x * env(n, 0.002, 0.22)


def tick():
    n = int(SR * 0.03)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3800 * tt) * 0.6 + highpass(rng.standard_normal(n), 5000) * 0.5) * np.exp(-tt * 260)


def blip(freq):
    n = int(SR * 0.12)
    tt = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-tt * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.04)


def bell(freq, d=2.6):
    n = int(SR * d)
    tt = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 1.4 * tt) * 2.2 * np.exp(-tt * 2.5)
    return np.sin(2 * np.pi * freq * tt + mod) * env(n, 0.003, 0.8)


def pad(freqs, d, cutoff=2400):
    n = int(SR * d)
    x = sum(saw(f, n, 0.008) for f in freqs) / len(freqs)
    return lp2(x, cutoff) * np.clip(np.arange(n) / SR / 0.35, 0, 1)


# --- accords (fa dièse mineur : i – VI – III – VII) ------------------------------------------------------------------
FS3, A3, CS4, D3, E3, GS3, B3, E4, FS4 = 185.0, 220.0, 277.18, 146.83, 164.81, 207.65, 246.94, 329.63, 369.99
CHORDS = [[FS3, A3, CS4], [D3, FS3, A3], [A3, CS4, E4], [E3, GS3, B3]]
ROOTS = [FS3 / 4, D3 / 2, A3 / 4, E3 / 2]

L = np.zeros(N)
R = np.zeros(N)
drums = np.zeros(N)
music = np.zeros(N)
fx = np.zeros(N)

# Acte I : drone tendu + pulsation filtrée qui s'ouvre, trois coups
hook_end = fr(60)
drone_env = np.clip(t / 0.15, 0, 1) * (t < hook_end) * (0.6 + 0.4 * t / hook_end)
drone = lowpass(saw(FS3 / 4, N, 0.01), 300 + 900 * np.clip(t / hook_end, 0, 1)) * drone_env * 0.45
music += drone
for k in range(int(hook_end / (BEAT / 4))):
    st = k * BEAT / 4
    if st < fr(54):
        place(music, st, stab([FS4, CS4 * 2], 0.08, 1200 + 3000 * st / hook_end), 0.10 + 0.12 * st / hook_end)
for f in (0, 24, 48):
    place(drums, fr(f), kick(big=True), 0.95)
    place(drums, fr(f), clap(), 0.5)
    place(music, fr(f), stab(CHORDS[0] + [FS4], 0.35, 5000), 0.32)
for i, f in enumerate((27, 29, 31)):  # les logos jaillissent
    place(fx, fr(f), blip(900 * (1.26**i)), 0.22)
place(fx, fr(43), whoosh(0.18, up=False), 0.25)  # aspirés dans le « 1 »
place(fx, fr(54), tick(), 0.8)  # le clic
place(fx, fr(54), blip(1500), 0.3)
place(fx, fr(54) + 0.04, reverse_swell(fr(6) - 0.04), 0.7)  # aspiration
place(fx, fr(60), impact(), 1.0)
place(music, fr(60), stab(CHORDS[0] + [FS4, CS4 * 2], 0.6, 6000), 0.4)
place(fx, fr(62) - 0.05, whoosh(0.55), 0.55)  # volet chevron

# Actes II–III : le groove (de l'image 72 à l'image 348)
g0, g1 = fr(72), fr(348)
nbeats = int(round((g1 - g0) / BEAT))
kicks = []
for b in range(nbeats):
    st = g0 + b * BEAT
    bar = b // 4
    chord = CHORDS[bar % 4]
    place(drums, st, kick(), 0.85)
    kicks.append(st)
    if b % 2 == 1:
        place(drums, st, clap(), 0.55)
    for h in range(4):
        place(drums, st + h * BEAT / 4, hat(open_=(h == 2)), 0.5 if h == 2 else (0.32 if h % 2 else 0.22))
    place(music, st + BEAT / 2, bass(ROOTS[bar % 4] * 2, BEAT * 0.45), 0.42)
    place(music, st + BEAT * 0.75, bass(ROOTS[bar % 4] * 2, BEAT * 0.22), 0.3)
    if b % 4 in (0, 2):
        place(music, st, stab(chord, 0.18, 3800), 0.16)
    if b % 4 == 3:
        place(music, st + BEAT / 2, stab([n * 2 for n in chord], 0.12, 5000), 0.1)
# arpège qui monte pendant les stats
for k in range(16):
    st = fr(296) + k * BEAT / 4
    chord = CHORDS[2]
    place(music, st, ding(chord[k % 3] * 2 * (2 if k >= 8 else 1), 0.25), 0.07 + 0.004 * k)

# Sidechain : la nappe et la basse respirent sur la grosse caisse
duck = np.ones(N)
for kt in kicks:
    i = int(kt * SR)
    n = min(N - i, int(SR * 0.25))
    duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.55 * np.exp(-np.arange(n) / SR / 0.07))
padbuf = np.zeros(N)
for bar in range(int(np.ceil(nbeats / 4))):
    st = g0 + bar * 4 * BEAT
    d = min(4 * BEAT, g1 - st) + 0.05
    if d > 0.05:
        place(padbuf, st, pad(CHORDS[bar % 4], d, 2000), 0.12)
music += padbuf * duck

# Effets synchronisés
place(fx, fr(96), blip(1200), 0.18)  # le bouton apparaît
place(fx, fr(108), tick(), 0.7)  # appui sur « Publier partout »
place(fx, fr(108), whoosh(0.3), 0.3)
place(fx, fr(114) - 0.05, whoosh(0.35), 0.35)  # les cartes sortent
for i, f in enumerate((119, 122, 125)):  # trois coches
    place(fx, fr(f), ding([FS4 * 2, A3 * 4, CS4 * 4][i], 0.8), 0.28)
for f in (148, 218, 288):  # changements de pose
    place(fx, fr(f) - 0.08, whoosh(0.38), 0.4)
# odomètre : cliquetis qui ralentit (une colonne arrive toutes les 2 images)
def expo_out(u):
    """Courbe signature cubic-bezier(0.16, 1, 0.3, 1), résolue numériquement (même courbe que l'image)."""
    s = np.linspace(0, 1, 4001)
    bx = 3 * (1 - s) ** 2 * s * 0.16 + 3 * (1 - s) * s**2 * 0.3 + s**3
    by = 3 * (1 - s) ** 2 * s * 1.0 + 3 * (1 - s) * s**2 * 1.0 + s**3
    return np.interp(u, bx, by)


ODO_COLS = [(0, 8), (2, 9), (5, 6), (7, 9)]  # (décalage en images, longueur de la bande) — voir Elan.tsx
odo_ticks = []
for d, n in ODO_COLS:
    fine = np.arange(0, 16.01, 0.25)
    k = np.floor(expo_out(fine / 16) * (n - 1) + 1e-6)
    odo_ticks += [158 + d + fine[i] for i in range(1, len(fine)) if k[i] > k[i - 1]]
odo_ticks = sorted(odo_ticks)
for f in odo_ticks:
    place(fx, fr(f), tick(), 0.45)
place(fx, fr(162), blip(1700), 0.2)
place(fx, fr(240) - 0.05, whoosh(0.32), 0.35)  # le message Discord sort
place(fx, fr(250), ding(1318.5, 0.6), 0.22)  # notification
place(fx, fr(250) + 0.11, ding(1760.0, 0.7), 0.2)
place(fx, fr(300), whoosh(0.3), 0.25)
place(fx, fr(304), whoosh(0.3), 0.2)
place(fx, fr(322), riser(fr(26)), 0.5)  # montée vers le volet
place(fx, fr(340) - 0.05, whoosh(0.55), 0.55)
place(fx, fr(348), impact(), 0.9)

# Acte IV : résolution premium (nappe ouverte, cloche sur le logo)
o0 = fr(348)
outro = np.zeros(N)
place(outro, o0, pad([D3, FS3, A3, E4, FS4], fr(30) + 0.3, 3200), 0.16)
place(outro, fr(378), pad([A3 / 2, A3, CS4, E4, B3 * 2], DUR - fr(378), 3600), 0.18)
place(outro, fr(348), bass(D3 / 2, 1.2), 0.35)
place(outro, fr(378), bass(A3 / 4, 2.6), 0.35)
place(fx, fr(362), whoosh(0.4), 0.2)  # le chevron pivote
place(fx, fr(372), blip(880), 0.25)  # le bouton lecture se remplit
place(fx, fr(378), bell(880.0), 0.32)  # « Uplink »
place(fx, fr(378) + 0.002, bell(1318.5, 2.2), 0.14)
place(fx, fr(390), ding(CS4 * 4, 0.9), 0.1)
place(fx, fr(402), ding(A3 * 4, 1.0), 0.14)  # l'adresse
place(fx, fr(420), ding(E4 * 4, 1.2), 0.08)  # reflet
music += outro

# --- mixage ---------------------------------------------------------------------------------------------------------
music = reverb(music, 1.8, 0.22)
fx = reverb(fx, 1.2, 0.15)
pan = 0.12 * np.sin(2 * np.pi * t / 2.4)
L = drums + music * (1 + pan) + fx
R = drums + music * (1 - pan) + fx
fade = np.clip((DUR - t) / 0.3, 0, 1)
mix = np.stack([L * fade, R * fade], axis=1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 10 ** (-1.0 / 20)

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "out", "elan.wav")
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok", os.path.abspath(out), f"{nbeats} temps de groove, {len(odo_ticks)} cliquetis d'odomètre")
