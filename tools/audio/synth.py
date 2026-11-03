"""Small offline synthesis toolkit (numpy) used to compose the soundtrack and SFX.

Instruments are modelled, not sampled:
  - accordion  : additive reeds (2 detuned voices, musette), bellows envelope, vibrato
  - viola/guitar: Karplus-Strong plucked strings with strum
  - zabumba    : pitched membrane (pitch drop) + bacalhau stick click
  - triangle   : inharmonic metal partials (open / muted)
  - bass       : plucked, low-passed
  - strings    : detuned saw ensemble, slow attack
  - brass      : saw stack with filter envelope
  - taiko / anvil / bells / noise FX
  - reverb     : convolution with a synthetic stereo room/hall impulse response
"""
import numpy as np
from scipy.signal import lfilter, fftconvolve, butter, sosfilt

SR = 44100
RNG = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n2m(s):
    """'G4' -> 67"""
    name = s[:-1]
    octv = int(s[-1])
    return 12 * (octv + 1) + NOTE[name]


def t(n):
    return np.arange(int(n)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.1, hold=None):
    n = int(n)
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    e = np.ones(n) * s
    a_n = min(a_n, n)
    e[:a_n] = np.linspace(0, 1, a_n, endpoint=False)
    d_end = min(n, a_n + d_n)
    e[a_n:d_end] = np.linspace(1, s, d_end - a_n, endpoint=False)
    if r_n > 0:
        r_start = max(0, n - r_n)
        e[r_start:] *= np.linspace(1, 0, n - r_start)
    return e


def exp_decay(n, tau):
    return np.exp(-t(n) / tau)


def lp(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def hp(x, fc, order=2):
    sos = butter(order, fc, 'high', fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def noise(n):
    return RNG.uniform(-1, 1, int(n))


# ------------------------------------------------------------------ instruments
def additive(f, dur, amps, detune=0.0, vib=(5.2, 0.0), phase_rand=True):
    n = int(dur * SR)
    tt = t(n)
    vibrato = 1 + vib[1] * np.sin(2 * np.pi * vib[0] * tt)
    ph_base = 2 * np.pi * np.cumsum(np.full(n, f * (1 + detune)) * vibrato) / SR
    out = np.zeros(n)
    for k, a in enumerate(amps, start=1):
        if a == 0 or f * k > SR * 0.45:
            continue
        out += a * np.sin(k * ph_base + (RNG.uniform(0, 6.28) if phase_rand else 0))
    return out


ACC_AMPS = [1, 0.75, 0.62, 0.5, 0.44, 0.36, 0.3, 0.26, 0.2, 0.17, 0.14, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.04]


def accordion(note, dur, vel=0.8, bright=1.0):
    f = midi(note)
    amps = [a * (bright ** (i * 0.12)) for i, a in enumerate(ACC_AMPS)]
    a = additive(f, dur + 0.08, amps, detune=-0.0025, vib=(5.5, 0.0018))
    b = additive(f, dur + 0.08, amps, detune=+0.0030, vib=(4.9, 0.0018))
    x = (a + b) * 0.5
    x = lp(x, 3800 + 1800 * bright)
    e = env_adsr(len(x), a=0.025, d=0.08, s=0.85, r=0.07)
    # bellows: slight swell
    e *= 0.9 + 0.1 * np.sin(np.linspace(0, np.pi, len(x)))
    return x * e * vel * 0.18


def pluck(note, dur, vel=0.8, bright=0.5, decay=0.996):
    f = midi(note)
    N = max(2, int(SR / f))
    n = int(dur * SR)
    exc = np.zeros(n)
    burst = lp(noise(N), 1500 + 6000 * bright) if bright < 0.99 else noise(N)
    exc[:N] = burst
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -0.5 * decay
    a[N + 1] = -0.5 * decay
    y = lfilter([1.0], a, exc)
    y *= env_adsr(n, a=0.001, d=0.0, s=1, r=0.05)
    return y * vel * 0.5


def strum(notes, dur, vel=0.6, spread=0.012, bright=0.45, up=False):
    order = list(reversed(notes)) if up else list(notes)
    n = int(dur * SR)
    out = np.zeros(n + int(spread * SR * len(notes)) + 10)
    for i, m in enumerate(order):
        p = pluck(m, dur, vel * (0.85 + 0.3 * RNG.random()), bright)
        off = int(i * spread * SR)
        out[off:off + len(p)] += p
    return out[:n]


def bass(note, dur, vel=0.9):
    f = midi(note)
    x = additive(f, dur, [1, 0.5, 0.22, 0.1, 0.05], vib=(0, 0))
    x += pluck(note, dur, 0.5, 0.25) * 0.8
    x = lp(x, 900)
    return x * env_adsr(len(x), a=0.004, d=0.18, s=0.55, r=0.06) * vel * 0.55


def zabumba(vel=1.0, dur=0.45, pitch=1.0):
    n = int(dur * SR)
    tt = t(n)
    f = (95 * pitch) * np.exp(-tt * 9) + 52 * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_decay(n, 0.16)
    click = lp(noise(n), 1800) * exp_decay(n, 0.008) * 0.5
    return (body + click) * vel * 0.9


def bacalhau(vel=0.6):
    n = int(0.09 * SR)
    x = bp(noise(n), 1600, 5200) * exp_decay(n, 0.012)
    x += np.sin(2 * np.pi * 820 * t(n)) * exp_decay(n, 0.02) * 0.4
    return x * vel * 0.7


def triangle_hit(open_=False, vel=0.5):
    dur = 0.9 if open_ else 0.08
    n = int(dur * SR)
    f0 = 1830
    out = np.zeros(n)
    for ratio, amp in [(1, 1), (2.73, 0.6), (5.41, 0.45), (8.93, 0.3), (13.3, 0.18)]:
        out += amp * np.sin(2 * np.pi * f0 * ratio * t(n) + RNG.uniform(0, 6))
    out *= exp_decay(n, 0.35 if open_ else 0.018)
    return hp(out, 1500) * vel * 0.12


def shaker(vel=0.4, dur=0.07):
    n = int(dur * SR)
    return bp(noise(n), 4000, 11000) * env_adsr(n, a=0.012, d=0.03, s=0.2, r=0.02) * vel * 0.3


def saw_stack(note, dur, voices=5, spread=0.012, harmonics=18):
    f = midi(note)
    amps = [1 / k for k in range(1, harmonics + 1)]
    out = np.zeros(int(dur * SR))
    for v in range(voices):
        d = (v - (voices - 1) / 2) / max(1, voices - 1) * spread
        out += additive(f, dur, amps, detune=d, vib=(4 + v * 0.3, 0.002))[:len(out)]
    return out / voices


def strings(note, dur, vel=0.5, attack=0.4, fc=2400):
    x = saw_stack(note, dur, voices=5, harmonics=14)
    x = lp(x, fc)
    return x * env_adsr(len(x), a=attack, d=0.2, s=0.9, r=min(0.6, dur * 0.4)) * vel * 0.22


def brass(note, dur, vel=0.7):
    n = int(dur * SR)
    x = saw_stack(note, dur, voices=3, spread=0.006, harmonics=20)
    # filter sweep: blend lowpassed versions
    lo = lp(x, 700)
    hi = lp(x, 4200)
    k = np.clip(env_adsr(n, a=0.04, d=0.25, s=0.45, r=0.1), 0, 1)
    y = lo * (1 - k) + hi * k
    return y * env_adsr(n, a=0.02, d=0.1, s=0.85, r=0.12) * vel * 0.3


def taiko(vel=1.0, dur=1.2, pitch=1.0):
    n = int(dur * SR)
    tt = t(n)
    f = 70 * pitch * np.exp(-tt * 5) + 38 * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_decay(n, 0.35)
    skin = lp(noise(n), 900) * exp_decay(n, 0.05) * 0.6
    return np.tanh((body + skin) * 1.6) * vel * 0.9


def anvil(vel=0.6, f0=1250):
    n = int(1.4 * SR)
    out = np.zeros(n)
    for ratio, amp, tau in [(1, 1, 0.5), (2.32, 0.7, 0.35), (3.91, 0.5, 0.25), (5.6, 0.35, 0.15), (7.3, 0.2, 0.1)]:
        out += amp * np.sin(2 * np.pi * f0 * ratio * t(n)) * exp_decay(n, tau)
    out += hp(noise(n), 3000) * exp_decay(n, 0.01) * 0.8
    return out * vel * 0.25


def bell(note, dur=1.6, vel=0.5):
    f = midi(note)
    n = int(dur * SR)
    out = np.zeros(n)
    for ratio, amp, tau in [(1, 1, 0.8), (2.0, 0.5, 0.5), (3.0, 0.25, 0.3), (4.2, 0.2, 0.2), (5.4, 0.12, 0.12)]:
        out += amp * np.sin(2 * np.pi * f * ratio * t(n)) * exp_decay(n, tau * dur)
    return out * env_adsr(n, a=0.002, d=0, s=1, r=0.05) * vel * 0.25


def snare(vel=0.6, dur=0.25):
    n = int(dur * SR)
    x = bp(noise(n), 1200, 9000) * exp_decay(n, 0.06)
    x += np.sin(2 * np.pi * 190 * t(n)) * exp_decay(n, 0.04) * 0.6
    return x * vel * 0.5


def whoosh(dur=0.6, lo=300, hi=4000, vel=0.6, rise=True):
    n = int(dur * SR)
    x = noise(n)
    # crude time-varying bandpass by mixing bands
    out = np.zeros(n)
    bands = np.geomspace(lo, hi, 7)
    for i in range(len(bands) - 1):
        b = bp(x, bands[i], bands[i + 1])
        center = (i + 0.5) / (len(bands) - 1)
        pos = np.linspace(0, 1, n) if rise else np.linspace(1, 0, n)
        w = np.exp(-((pos - center) ** 2) / 0.03)
        out += b * w
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5 * vel


# ------------------------------------------------------------------ mixing
def place(buf, x, start_s, gain=1.0, pan=0.0):
    """Mix mono x into stereo buf at time start_s (wraps around for seamless loops)."""
    s = int(start_s * SR)
    L = buf.shape[0]
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    n = len(x)
    idx = (np.arange(n) + s) % L
    np.add.at(buf[:, 0], idx, x * gl)
    np.add.at(buf[:, 1], idx, x * gr)


def impulse(dur=2.0, damp=4000, tau=0.55, pre=0.012):
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for c in range(2):
        x = noise(n) * exp_decay(n, tau)
        x = lp(x, damp)
        x[: int(pre * SR)] = 0
        out[:, c] = x
    # early reflections
    for d, g in [(0.013, 0.5), (0.021, 0.35), (0.034, 0.3), (0.047, 0.22)]:
        out[int(d * SR), 0] += g
        out[int((d + 0.003) * SR), 1] += g
    out /= np.sqrt((out ** 2).sum(axis=0, keepdims=True)) + 1e-9
    return out


def reverb_loop(dry, ir, wet=0.25):
    """Circular reverb so the tail wraps into the loop start (seamless loop)."""
    L = dry.shape[0]
    out = dry.copy()
    for c in range(2):
        ext = np.concatenate([dry[:, c], dry[:, c]])
        r = fftconvolve(ext, ir[:, c])[: 2 * L]
        out[:, c] += wet * r[L: 2 * L]
    return out


def reverb_tail(dry, ir, wet=0.25):
    n = dry.shape[0] + ir.shape[0] - 1
    out = np.zeros((n, 2))
    out[: dry.shape[0]] = dry
    for c in range(2):
        out[:, c] += wet * fftconvolve(dry[:, c], ir[:, c])[:n]
    return out


def master(x, peak_db=-1.0, drive=1.15):
    x = x - x.mean(axis=0, keepdims=True)
    m = np.max(np.abs(x)) + 1e-9
    x = np.tanh(x / m * drive) / np.tanh(drive)
    return x * (10 ** (peak_db / 20))
