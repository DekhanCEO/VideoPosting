#!/usr/bin/env python3
"""Bande-son de « Suspense » (15 s, 48 kHz stéréo), entièrement synthétisée (aucun échantillon externe).

Construite comme une bande-annonce, calée sur l'image :
  0–120     la corvée : battement de cœur qui accélère, horloge, nappe dissonante qui monte, frappe au clavier,
            interrupteurs ; « ×3 » : impact et parasites ; aspiration ; à l'image 120, COUPURE NETTE
  120–160   silence ; deux notes sur « Et si une fois suffisait ? » ; souffle inversé jusqu'au trait de lumière
  160–241   rubans (scintillement), aspiration, IMPACT, notes sur « Uplink »
  241–377   le « drop » : groove à ~106 BPM, un plan tous les deux temps ; notifications, chiffres, ping, courbe
  377–450   accord final, cloche sur le logo, l'adresse ; fondu court.

Usage : npm run audio:suspense   (écrit out/suspense.wav puis l'encode en AAC dans public/suspense/suspense.m4a)
"""
import os
import sys
import wave

import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
FPS = 30
BEAT = 17 / FPS  # ≈ 106 BPM (deux temps par plan du montage)
t = np.arange(N) / SR
rng = np.random.default_rng(47)


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



def heartbeat(gain_dub=0.7):
    """Battement : « boum-boum » grave et feutré."""
    d = 0.42
    n = int(SR * d)
    tt = np.arange(n) / SR
    def thump(t0, f0):
        k = np.clip(tt - t0, 0, None)
        return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-k * 40))) / SR) * np.where(tt >= t0, np.exp(-k * 18), 0)
    return lowpass(thump(0, 52) + gain_dub * thump(0.14, 46), 900)


def glitch(d=0.3):
    """Parasites numériques : rafales de bruit hachées."""
    n = int(SR * d)
    tt = np.arange(n) / SR
    gate = (np.floor(tt * 90 + rng.random() * 3) % 3 == 0).astype(float)
    s = highpass(rng.standard_normal(n), 1500) * gate
    s = np.round(s * 4) / 4  # grain « bitcrush »
    return lowpass(s, 8000) * np.exp(-tt * 6) * 0.6


def riser(d, lo=300, hi=7000):
    n = int(SR * d)
    tt = np.arange(n) / SR
    k = tt / d
    s = lowpass(highpass(rng.standard_normal(n), 300), lo + (hi - lo) * k**2) * k**2.2
    return s + np.sin(2 * np.pi * np.cumsum(180 + 900 * k**2) / SR) * k**3 * 0.2


# --- accords (si mineur) --------------------------------------------------------------------------------------------
B1, C2, B2, D3, FS3, G2, A2, CS3, E3, A3, B3, D4, FS4 = 61.74, 65.41, 123.47, 146.83, 185.0, 98.0, 110.0, 138.59, 164.81, 220.0, 246.94, 293.66, 369.99
CHORDS = [[B2, D3, FS3], [G2, B2, D3], [D3, FS3, A3], [A2, CS3, E3]]

music = np.zeros(N)
drums = np.zeros(N)
fx = np.zeros(N)
a_bus = np.zeros(N)  # tout ce qui appartient à la corvée : coupé net à l'image 120

# Acte I : la corvée (0–120)
CUT = fr(120)
HEARTS = [0, 13, 27, 40, 50, 60, 70, 78, 86, 94]
for k, f in enumerate(HEARTS):
    place(a_bus, fr(f), heartbeat(), 0.75 + 0.25 * k / len(HEARTS))
ft = 2.0  # horloge : le tic-tac accélère (8 → 4 images), se tait sous les souffles et quand l'aspiration démarre
WHOOSH_AT = [-4, 40, 70]
TYPING = [(r0 + ln / 3 - 1, r0 + ln / 3 + ln / 3 * 0.85 + 2) for r0, ln in [(0, 40), (40, 30), (70, 24)]]
while ft < 104:
    if not any(0 <= ft - w < 8 for w in WHOOSH_AT) and not any(a <= ft < b for a, b in TYPING):
        place(a_bus, fr(ft), tick(5200 if int(ft) % 2 else 4600), 0.3 + 0.15 * ft / 104)
    ft += 8 - 4 * ft / 104
tension = np.clip(t / CUT, 0, 1)
drone = lowpass(saw(B1, N, 0.004) + saw(C2, N, 0.004), 250 + 2600 * tension**2) * (0.08 + 0.3 * tension**1.5) * (t < CUT + 0.2)
ROUNDS = [(0, 40), (40, 30), (70, 24)]
for r, (s0, ln) in enumerate(ROUNDS):
    step = ln / 3
    place(a_bus, fr(s0 - (4 if r == 0 else 0)), whoosh(0.22, True, 500, 6000), 0.55)  # la fiche arrive / « Importer »
    place(a_bus, fr(s0 + 4), glide(500, 1500, fr(step - 4)), 0.06)  # envoi
    t1 = s0 + step  # « Réécrire » : frappe au clavier
    fk = t1
    while fk < t1 + step * 0.85:
        place(a_bus, fr(fk), click(), 0.38)
        fk += 1.1 + rng.random() * 0.8
    t2 = s0 + 2 * step  # « Régler » : trois interrupteurs
    for i in range(3):
        place(a_bus, fr(t2 + i * ln / 12), tick(2200 + 300 * i), 0.55)
place(a_bus, fr(94), pad([B2 * 2, C2 * 4, FS3 * 2], 0.35, 5000, 0.005), 0.85)  # « Recommencer. »
place(a_bus, fr(104), boom(1.6), 1.0)  # « ×3 »
place(a_bus, fr(105), glitch(0.32), 1.7)
place(a_bus, fr(107), glitch(0.2), 1.4)
place(a_bus, fr(106), riser(fr(14)), 0.7)  # aspiration jusqu'au noir

# Acte II : le silence (120–160)
place(fx, fr(124), marimba(B3, 1.2), 0.22)  # « Et si une fois »
place(fx, fr(124), bell(B3 * 2, 2.0), 0.06)
place(fx, fr(130), marimba(D4, 1.2), 0.22)  # « suffisait ? »
place(fx, fr(144), reverse_swell(fr(16)), 0.45)  # vers le trait de lumière

# Acte III : la révélation (160–241) — images du générique de « Première » décalées de 6
O = 6
place(fx, fr(157 + O), shimmer(fr(30), 900, 5000, 18), 1.0)  # rubans
place(fx, fr(157 + O), whoosh(fr(31), True, 300, 6000), 0.55)
place(music, fr(157 + O), pad([B2, FS3, B3, D4], fr(40), 1400, 0.3), 0.1)
place(fx, fr(188 + O), reverse_swell(fr(8)), 1.1)  # aspiration
place(fx, fr(196 + O), boom(2.6), 1.0)  # IMPACT
place(music, fr(196 + O), pad([D3, FS3, A3, D4, FS4], fr(39), 3200, 0.02), 0.2)
for i, f in enumerate((204, 208, 212)):  # « Uplink »
    place(fx, fr(f + O), marimba([D4 * 2, FS4 * 2, A3 * 4][i], 0.9), 0.18)

# Acte IV : le montage (241–377)
DROP = 241
g0, g1 = fr(DROP), fr(377)
nbeats = int(round((g1 - g0) / BEAT))
place(fx, g0, boom(1.4), 0.6)  # le « drop »
duck = np.ones(N)
for bt in range(nbeats):
    st = g0 + bt * BEAT
    chord = CHORDS[(bt // 2) % 4]  # un accord par plan
    place(drums, st, kick(), 0.85)
    i = int(st * SR)
    nn = min(N - i, int(SR * 0.25))
    duck[i : i + nn] = np.minimum(duck[i : i + nn], 1 - 0.5 * np.exp(-np.arange(nn) / SR / 0.08))
    if bt % 2 == 1:
        place(drums, st, snap(), 0.55)
    for h in range(4):
        place(drums, st + h * BEAT / 4, hat(open_=(h == 2)), 0.3 if h == 2 else 0.16)
    for a in range(4):  # arpège en doubles croches
        place(music, st + a * BEAT / 4, pluck(chord[(bt * 4 + a) % 3] * 2, 0.22, 0.8), 0.06)
padbuf = np.zeros(N)
subbuf = np.zeros(N)
for k in range(4):
    st = g0 + k * 2 * BEAT
    place(padbuf, st, pad(CHORDS[k], 2 * BEAT + 0.2, 1900, 0.08), 0.09)
    place(subbuf, st, subbass(CHORDS[k][0] / 2, 2 * BEAT), 0.38)
music += (padbuf + subbuf) * duck
for i, f in enumerate((244, 248, 252)):  # trois notifications
    place(fx, fr(f), marimba([B3 * 4, D4 * 4, FS4 * 4][i] / 2, 0.6), 0.26)
    place(fx, fr(f) + 0.08, marimba([B3 * 4, D4 * 4, FS4 * 4][i], 0.6), 0.16)
for f in (269, 303, 337):  # filés entre les plans (le souffle culmine sur la coupe)
    place(fx, fr(f), whoosh(0.3, True, 400, 6500), 0.7)
for d_, n_ in [(0, 7), (2, 8), (5, 5), (7, 7)]:  # « 19:00 » qui roule (même courbe que l'image)
    fine = np.arange(0, 16.01, 0.25)
    kk = np.floor(bezier_ease(fine / 16, 0.22, 1, 0.36, 1) * (n_ - 1) + 1e-6)
    for j in range(1, len(fine)):
        if kk[j] > kk[j - 1]:
            place(fx, fr(275 + 2 + d_ + fine[j]), tick(4200), 0.7)
place(fx, fr(311), whoosh(0.32, True, 400, 6000), 0.55)  # le message Discord sort
place(fx, fr(321), marimba(1318.5, 0.6), 0.24)  # ping
place(fx, fr(326), marimba(1760.0, 0.7), 0.2)
place(fx, fr(346), glide(440, 1320, fr(19), 0.4), 0.09)  # la courbe se trace
for i, f in enumerate((351, 354, 357)):
    place(fx, fr(f), tick(2400 + 400 * i), 0.45)
place(fx, fr(363), marimba(FS4 * 2, 0.5), 0.18)

# Acte V : la chute (377–450)
o0 = fr(377)
place(fx, o0, boom(2.0), 0.4)
place(music, o0, pad([D3, FS3, A3, D4, E3 * 2, FS4], DUR - o0, 3000, 0.3), 0.2)
place(music, o0, subbass(D3 / 2, DUR - o0), 0.3)
place(fx, fr(387), marimba(FS4 * 2, 0.8), 0.14)  # « avant ? »
place(fx, fr(397), bell(A3 * 4, 2.2), 0.2)  # le logo
place(fx, fr(413), shimmer(0.7, 1200, 5000, 8), 0.22)  # reflet
place(fx, fr(411), marimba(D4 * 2, 0.9), 0.16)  # l'adresse

# --- mixage ---------------------------------------------------------------------------------------------------------
# La musique s'efface de 5 dB au plus sous chaque effet, pour que tous les bruitages ressortent.
fx_env = lowpass(np.abs(fx), 12.0)
fx_env /= np.max(fx_env) + 1e-9
side = 1 - 0.44 * np.clip(fx_env * 4, 0, 1)
music = music * side
drums = drums * side
music = reverb(music, 2.4, 0.26)
drums = reverb(drums, 0.9, 0.08)
# la nappe de tension s'efface elle aussi sous les effets de la corvée
a_env = lowpass(np.abs(a_bus), 12.0)
a_env /= np.max(a_env) + 1e-9
a_bus = a_bus + drone * (1 - 0.5 * np.clip(a_env * 4, 0, 1))
a_bus = reverb(a_bus, 1.2, 0.14)
a_bus *= np.clip((CUT - t) / 0.004, 0, 1)  # coupure nette à l'image 120 (réverbération comprise)
fx = reverb(fx, 1.6, 0.18)
fx = fx + a_bus  # après la réverbération des effets : rien de la corvée ne déborde sur le silence
pan = 0.14 * np.sin(2 * np.pi * t / 3.1)
L = drums + music * (1 + pan) + fx
R = drums + music * (1 - pan) + fx
fade = np.clip((DUR - t) / 0.3, 0, 1)
mix = np.stack([L * fade, R * fade], axis=1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 10 ** (-1.0 / 20)

out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "out", "suspense.wav")
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok", os.path.abspath(out), f"{nbeats} temps de groove")
