"""Original score + sound effects for Lampião & Maria Bonita, rendered offline.

Usage: python3 tools/audio/compose.py
Output: public/audio/*.ogg + *.m4a and public/audio/manifest.json

Music is written as layered STEMS that share tempo and length within a game
mode, so the runtime can crossfade intensity layers in perfect sync:
  base      : bed (baião in G mixolydian)            + tension (strings/shaker riser layer)
  escape    : main (fast forró in D mixolydian)      + hype (brass stabs, pandeiro)
  hideout   : main (mysterious viola, E minor)        + tension (heartbeat, high strings)
  laststand : main (war drums, A phrygian dominant)   + intense (rolls, choir pad, anvils)
  bigwin    : celebratory loop
"""
import json
import os
import subprocess
import tempfile
import numpy as np
from scipy.io import wavfile
import synth as S
from synth import SR, n2m, place

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'audio')
os.makedirs(OUT, exist_ok=True)
MANIFEST = {}

HALL = S.impulse(2.2, 5200, 0.6)
ROOM = S.impulse(1.1, 4200, 0.28)
BIG = S.impulse(3.2, 3800, 0.95)


def encode(name, stereo, loop=False, preroll=0.5):
    """Write ogg + m4a. Loops get pre/post-roll so decoder padding never clicks."""
    if loop:
        pr = int(preroll * SR)
        data = np.concatenate([stereo[-pr:], stereo, stereo[:pr]])
        MANIFEST[name] = {'loop': True, 'loopStart': preroll, 'loopEnd': preroll + stereo.shape[0] / SR}
    else:
        data = stereo
        MANIFEST[name] = {'loop': False, 'duration': round(stereo.shape[0] / SR, 3)}
    pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        wavfile.write(f.name, SR, pcm)
        tmp = f.name
    q = ['-q:a', '4'] if loop else ['-q:a', '5']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', *q, os.path.join(OUT, f'{name}.ogg')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '128k' if loop else '112k', os.path.join(OUT, f'{name}.m4a')], check=True)
    os.unlink(tmp)
    print(f'  {name:22s} {data.shape[0] / SR:6.2f}s')


def buf(seconds):
    return np.zeros((int(round(seconds * SR)), 2))


# ======================================================================== BASE
def base_theme():
    """Sertão baião in D mixolydian, 104 BPM – banda de pífanos lead over sanfona, zabumba & triangle.
    Three synchronised stems (same length) so the runtime can raise intensity:
      music_base          calm bed: zabumba baião, triangle, bass, sanfona offbeat chords, pífano melody
      music_base_tension  near-miss / anticipation: tremolo strings, shaker 16ths, low drone, heartbeat zabumba
      music_base_drive    bonus hit: doubled zabumba, taiko, brass stabs, fife harmony an octave up
    """
    bpm = 104
    beat = 60 / bpm
    bar = beat * 4
    bars = 16
    L = bar * bars
    bed, tension, drive = buf(L), buf(L), buf(L)
    s16 = beat / 4
    prog = ['D', 'D', 'C', 'D', 'G', 'G', 'A7', 'D', 'D', 'D', 'C', 'D', 'G', 'A7', 'D', 'D']
    CH = {'D': ['D4', 'F#4', 'A4'], 'C': ['C4', 'E4', 'G4'], 'G': ['G3', 'B3', 'D4'], 'A7': ['A3', 'C#4', 'E4', 'G4']}
    ROOT = {'D': 'D2', 'C': 'C2', 'G': 'G2', 'A7': 'A2'}
    for b in range(bars):
        t0 = b * bar
        ch = prog[b]
        r = n2m(ROOT[ch])
        for cell in range(2):  # baião cell per half bar
            c0 = t0 + cell * beat * 2
            place(bed, S.zabumba(1.0), c0, 0.85, -0.05)
            place(bed, S.zabumba(0.7, pitch=1.06), c0 + 3 * s16, 0.7, -0.05)
            place(bed, S.bacalhau(0.6), c0 + 2 * s16, 0.55, 0.12)
            place(bed, S.bacalhau(0.7), c0 + 6 * s16, 0.6, 0.12)
            for st in range(8):
                place(bed, S.triangle_hit(open_=st in (2, 6), vel=0.55 if st % 2 else 0.35), c0 + st * s16, 0.75, 0.45)
            place(bed, S.bass(r, beat * 1.3), c0, 0.85, 0)
            place(bed, S.bass(r + 7, beat * 0.5), c0 + 3 * s16, 0.55, 0)
            place(bed, S.bass(r + 12, beat * 0.5), c0 + 6 * s16, 0.5, 0)
            # sanfona offbeat chord pumps
            for o in (2, 6):
                for nn in CH[ch]:
                    place(bed, S.accordion(n2m(nn), s16 * 1.6, 0.42, bright=0.8), c0 + o * s16, 0.45, -0.25)
            # tension: shaker 16ths + heartbeat
            for st in range(8):
                place(tension, S.shaker(0.8 if st % 2 else 0.45), c0 + st * s16, 0.7, 0.3)
            place(tension, S.zabumba(0.7, 0.3, pitch=0.7), c0, 0.8, 0)
            place(tension, S.zabumba(0.45, 0.3, pitch=0.75), c0 + 0.16, 0.6, 0)
            # drive: doubled zabumba on every 8th + taiko on 1, brass stabs offbeats
            for st in (0, 2, 3, 4, 6):
                place(drive, S.zabumba(0.9, 0.3, pitch=1.15), c0 + st * s16, 0.6, 0.1)
            place(drive, S.taiko(0.8, 0.9, 1.1), c0, 0.55, 0)
            for nn in CH[ch]:
                place(drive, S.brass(n2m(nn) + 12, s16 * 1.5, 0.75), c0 + 2 * s16, 0.4, 0.25)
                place(drive, S.brass(n2m(nn) + 12, s16 * 1.5, 0.8), c0 + 6 * s16, 0.45, 0.25)
        # tension: tremolo strings + drone (bar-long)
        for nn in CH[ch]:
            st_ = S.strings(n2m(nn) + 12, bar + 0.25, 0.5, attack=0.25)
            trem = 0.55 + 0.45 * np.sin(2 * np.pi * 13 * np.arange(len(st_)) / SR)
            place(tension, st_ * trem, t0, 0.75, -0.2)
        place(tension, S.drone(r + 12, bar + 0.2, 0.6), t0, 0.7, 0)
        if b % 4 == 3:
            place(tension, S.whoosh(bar * 0.9, 200, 5000, 0.35), t0 + bar * 0.1, 0.6, 0)
            place(drive, S.anvil(0.5), t0 + 3.5 * beat, 0.4, 0.4)
    # pífano melody (beat offset, beats, note) – call (A) and answer (B), D mixolydian
    A = [[(0, .5, 'A5'), (.5, .5, 'B5'), (1, .75, 'C6'), (1.75, .25, 'B5'), (2, 1, 'A5'), (3, .5, 'F#5'), (3.5, .5, 'A5')],
         [(0, 1.5, 'G5'), (1.5, .5, 'F#5'), (2, 1, 'E5'), (3, 1, 'D5')],
         [(0, .5, 'E5'), (.5, .5, 'G5'), (1, .75, 'C6'), (1.75, .25, 'B5'), (2, 1, 'G5'), (3, .5, 'E5'), (3.5, .5, 'G5')],
         [(0, 1, 'F#5'), (1, .5, 'E5'), (1.5, .5, 'F#5'), (2, 2, 'D5')]]
    B = [[(0, .25, 'D6'), (.25, .25, 'C6'), (.5, .5, 'A5'), (1, .5, 'C6'), (1.5, .5, 'A5'), (2, .5, 'G5'), (2.5, .5, 'F#5'), (3, 1, 'G5')],
         [(0, .5, 'B5'), (.5, .5, 'A5'), (1, .5, 'G5'), (1.5, .5, 'B5'), (2, 2, 'A5')],
         [(0, .5, 'C#6'), (.5, .5, 'B5'), (1, .5, 'A5'), (1.5, .5, 'G5'), (2, .5, 'E5'), (2.5, .5, 'G5'), (3, 1, 'C#6')],
         [(0, .75, 'D6'), (.75, .25, 'C6'), (1, .5, 'A5'), (1.5, .5, 'F#5'), (2, 2, 'D5')]]
    melody = A + B + A + B
    for b, notes in enumerate(melody):
        for (o, d, nn) in notes:
            m = n2m(nn)
            place(bed, S.pifano(m, d * beat * 0.92, 0.85), b * bar + o * beat, 0.95, 0.12)
            # second fife a third below in the answer phrases (classic two-pífano harmony)
            if b % 8 >= 4:
                place(bed, S.pifano(m - 4 if (m % 12) in (2, 4, 9, 11) else m - 3, d * beat * 0.92, 0.55), b * bar + o * beat, 0.6, -0.15)
            # drive: fife doubled an octave up + accordion unison
            place(drive, S.pifano(m + 12, d * beat * 0.9, 0.5, breath=0.25), b * bar + o * beat, 0.45, 0.2)
            place(drive, S.accordion(m, d * beat * 0.92, 0.7, bright=1.1), b * bar + o * beat, 0.5, -0.1)
    encode('music_base', S.master(S.reverb_loop(bed, HALL, 0.2)), loop=True)
    encode('music_base_tension', S.master(S.reverb_loop(tension, HALL, 0.3), peak_db=-3), loop=True)
    encode('music_base_drive', S.master(S.reverb_loop(drive, ROOM, 0.22), peak_db=-2), loop=True)


# ======================================================================== ESCAPE
def escape_theme():
    bpm = 138
    beat = 60 / bpm
    bar = beat * 4
    bars = 16
    L = bar * bars
    main = buf(L)
    hype = buf(L)
    s16 = beat / 4
    prog = ['D', 'D', 'C', 'D', 'G', 'G', 'A7', 'D'] * 2
    CH = {'D': ['D4', 'F#4', 'A4'], 'C': ['C4', 'E4', 'G4'], 'G': ['G3', 'B3', 'D4'], 'A7': ['A3', 'C#4', 'E4', 'G4']}
    ROOT = {'D': 'D2', 'C': 'C2', 'G': 'G2', 'A7': 'A2'}
    SCALE = [0, 2, 4, 5, 7, 9, 10]  # mixolydian
    rng = np.random.default_rng(11)
    for b in range(bars):
        t0 = b * bar
        ch = prog[b]
        for beat_i in range(4):
            bt = t0 + beat_i * beat
            place(main, S.zabumba(1.0 if beat_i % 2 == 0 else 0.8, 0.35), bt, 0.9, -0.05)
            place(main, S.bacalhau(0.7), bt + 2 * s16, 0.65, 0.15)
            for st in range(4):
                place(main, S.triangle_hit(open_=(st == 2), vel=0.55), bt + st * s16, 0.7, 0.45)
            r = n2m(ROOT[ch])
            place(main, S.bass(r + (0 if beat_i % 2 == 0 else 7), beat * 0.8), bt, 0.85, 0)
            place(main, S.strum([n2m(x) for x in CH[ch]], beat * 0.4, 0.4, up=beat_i % 2 == 1), bt + 2 * s16, 0.45, -0.35)
            # hype: brass stabs on offbeats + pandeiro jingles
            if beat_i % 2 == 1:
                for nn in CH[ch][:3]:
                    place(hype, S.brass(n2m(nn) + 12, beat * 0.35, 0.7), bt + 2 * s16, 0.55, 0.25)
            for st in range(4):
                place(hype, S.shaker(0.9 if st % 2 else 0.5, 0.05), bt + st * s16, 0.8, -0.4)
        if b % 4 == 3:
            place(hype, S.taiko(0.9, pitch=1.2), t0 + 3 * beat, 0.6, 0)
        # melody: fast accordion runs built from chord tones + mixolydian passing tones
        root_pc = n2m(CH[ch][0]) % 12
        base = 74 + ((root_pc - 2) % 12 if root_pc != 2 else 0)
        pattern = b % 4
        notes = []
        if pattern in (0, 2):
            degs = [0, 2, 4, 7, 9, 7, 4, 2, 4, 5, 4, 2, 0, -1, 0, 2]
            for i, d in enumerate(degs):
                notes.append((i * 0.25, 0.25, d))
        elif pattern == 1:
            notes = [(0, .5, 7), (.5, .25, 7), (.75, .25, 9), (1, .5, 10), (1.5, .5, 9), (2, .5, 7), (2.5, .5, 4), (3, 1, 2)]
        else:
            notes = [(0, .75, 4), (.75, .25, 5), (1, .5, 7), (1.5, .5, 4), (2, 1.5, 0), (3.5, .5, -3)]
        for (o, d, deg) in notes:
            octv, idx = divmod(deg, 7)
            semis = SCALE[idx] + 12 * octv
            m = (n2m('D5') if ch in ('D', 'A7') else n2m('C5') if ch == 'C' else n2m('G4') + 12) + semis
            if ch == 'A7':
                m -= 5
            place(main, S.accordion(m, d * beat * 0.9, 0.9, bright=1.15), t0 + o * beat, 0.95, 0.12)
    main = S.master(S.reverb_loop(main, ROOM, 0.2))
    hype = S.master(S.reverb_loop(hype, ROOM, 0.25), peak_db=-3)
    encode('music_escape', main, loop=True)
    encode('music_escape_hype', hype, loop=True)


# ======================================================================== HIDEOUT
def hideout_theme():
    bpm = 76
    beat = 60 / bpm
    bar = beat * 4
    bars = 8
    L = bar * bars
    main = buf(L)
    tension = buf(L)
    prog = ['Em', 'Em', 'C', 'D', 'Em', 'Am', 'B7', 'Em']
    ARP = {'Em': ['E3', 'B3', 'E4', 'G4'], 'C': ['C3', 'G3', 'C4', 'E4'], 'D': ['D3', 'A3', 'D4', 'F#4'], 'Am': ['A2', 'E3', 'A3', 'C4'], 'B7': ['B2', 'F#3', 'A3', 'D#4']}
    melody = {0: [(1, 1.5, 'B4'), (2.5, .5, 'A4'), (3, 1, 'G4')], 1: [(0, 2, 'E4'), (2.5, 1.5, 'F#4')], 2: [(0, 1, 'G4'), (1, 1, 'E5'), (2, 2, 'C5')],
              3: [(0, 1.5, 'D5'), (1.5, .5, 'C5'), (2, 2, 'A4')], 4: [(1, 1, 'B4'), (2, .5, 'C5'), (2.5, .5, 'B4'), (3, 1, 'G4')],
              5: [(0, 2, 'A4'), (2, 1, 'C5'), (3, 1, 'E5')], 6: [(0, 1.5, 'D#5'), (1.5, .5, 'C5'), (2, 2, 'B4')], 7: [(0, 3.5, 'E4')]}
    for b in range(bars):
        t0 = b * bar
        ch = prog[b]
        arp = [n2m(x) for x in ARP[ch]]
        seq = [0, 1, 2, 3, 2, 1, 2, 3]
        for i, k in enumerate(seq):
            place(main, S.pluck(arp[k], beat * 1.4, 0.55, bright=0.3, decay=0.997), t0 + i * beat / 2, 0.7, -0.3 + 0.2 * k)
        place(main, S.strings(arp[0] - 12, bar + 0.2, 0.55, attack=0.8, fc=700), t0, 0.9, 0)
        for (o, d, nn) in melody[b]:
            place(main, S.bell(n2m(nn) + 12, 2.2, 0.45), t0 + o * beat, 0.6, 0.35)
        place(main, S.shaker(0.3, 0.12), t0 + 1.5 * beat, 0.5, 0.5)
        place(main, S.shaker(0.3, 0.12), t0 + 3.5 * beat, 0.5, 0.5)
        # tension: heartbeat + high strings
        for bb in range(4):
            place(tension, S.zabumba(0.8, 0.3, pitch=0.7), t0 + bb * beat, 0.9, 0)
            place(tension, S.zabumba(0.5, 0.3, pitch=0.75), t0 + bb * beat + 0.18, 0.7, 0)
        place(tension, S.strings(arp[3] + 12, bar + 0.3, 0.45, attack=0.6, fc=3000), t0, 0.8, 0.3)
    main = S.master(S.reverb_loop(main, HALL, 0.35), peak_db=-2)
    tension = S.master(S.reverb_loop(tension, HALL, 0.35), peak_db=-3)
    encode('music_hideout', main, loop=True)
    encode('music_hideout_tension', tension, loop=True)


# ======================================================================== LAST STAND
def laststand_theme():
    bpm = 96
    beat = 60 / bpm
    bar = beat * 4
    bars = 8
    L = bar * bars
    main = buf(L)
    intense = buf(L)
    s8 = beat / 2
    roots = ['A2', 'A2', 'Bb2', 'A2', 'G2', 'F2', 'Bb2', 'A2']
    for b in range(bars):
        t0 = b * bar
        r = n2m(roots[b])
        # war drums
        for st, v in [(0, 1.0), (3, 0.7), (4, 0.9), (6, 0.6), (7, 0.7)]:
            place(main, S.taiko(v, 1.0, pitch=1.0 if st % 2 == 0 else 1.2), t0 + st * s8, 0.85, -0.15 if st % 2 else 0.15)
        place(main, S.anvil(0.35), t0 + 3.5 * beat, 0.5, 0.4)
        # low string ostinato (8ths): root with phrygian upper neighbour
        for i in range(8):
            m = r + (1 if i in (3, 7) else 0) + (12 if i % 4 == 2 else 0)
            place(main, S.strings(m, s8 * 0.9, 0.9, attack=0.01, fc=1600), t0 + i * s8, 0.9, -0.1)
        # brass stabs
        if b % 2 == 0:
            for nn in (r + 12, r + 16, r + 19):
                place(main, S.brass(nn, beat * 1.5, 0.8), t0, 0.6, 0.15)
        else:
            for nn in (r + 13, r + 16, r + 20):
                place(main, S.brass(nn, beat * 0.8, 0.7), t0 + 2.5 * beat, 0.55, 0.15)
        # intense: snare rolls, choir pad, extra anvils
        for k in range(16):
            place(intense, S.snare(0.25 + 0.04 * k / 2 if k < 12 else 0.6, 0.15), t0 + k * beat / 4, 0.6, 0.2)
        for nn in (r + 12, r + 16, r + 19):
            place(intense, S.strings(nn + 12, bar + 0.2, 0.5, attack=0.4, fc=3200), t0, 0.7, -0.2)
        place(intense, S.anvil(0.5, f0=1500), t0 + 1.5 * beat, 0.45, -0.4)
    main = S.master(S.reverb_loop(main, BIG, 0.22))
    intense = S.master(S.reverb_loop(intense, BIG, 0.25), peak_db=-3)
    encode('music_laststand', main, loop=True)
    encode('music_laststand_intense', intense, loop=True)


# ======================================================================== BIG WIN loop
def bigwin_theme():
    bpm = 120
    beat = 60 / bpm
    bar = beat * 4
    bars = 4
    m = buf(bar * bars)
    prog = [('G', ['G3', 'B3', 'D4']), ('C', ['C4', 'E4', 'G4']), ('D', ['D4', 'F#4', 'A4']), ('G', ['G3', 'B3', 'D4'])]
    fan = [(0, .5, 'D5'), (.5, .5, 'G5'), (1, .5, 'B5'), (1.5, .5, 'G5'), (2, 1, 'D6'), (3, 1, 'B5')]
    for b, (name, ch) in enumerate(prog):
        t0 = b * bar
        for k in range(4):
            place(m, S.taiko(0.9 if k % 2 == 0 else 0.6, 0.6), t0 + k * beat, 0.7, 0)
            place(m, S.snare(0.5), t0 + k * beat + beat / 2, 0.5, 0.2)
            for st in range(4):
                place(m, S.triangle_hit(st == 2, 0.6), t0 + k * beat + st * beat / 4, 0.7, 0.45)
        for nn in ch:
            place(m, S.brass(n2m(nn), beat * 1.8, 0.8), t0, 0.5, -0.2)
            place(m, S.brass(n2m(nn), beat * 1.8, 0.7), t0 + 2 * beat, 0.45, -0.2)
        place(m, S.bass(n2m(ch[0]) - 12, bar * 0.9), t0, 0.8, 0)
        for (o, d, nn) in fan:
            shift = [0, 5, 7, 0][b]
            place(m, S.accordion(n2m(nn) - 12 + shift, d * beat, 0.9, 1.2), t0 + o * beat, 0.8, 0.15)
            place(m, S.bell(n2m(nn) + shift, 0.8, 0.35), t0 + o * beat, 0.4, 0.3)
    encode('music_bigwin', S.master(S.reverb_loop(m, HALL, 0.2)), loop=True)


# ======================================================================== SFX
def sfx(name, x, wet=0.12, ir=None, peak=-1.5, stereo_pan=0.0):
    out = np.zeros((len(x), 2))
    place(out, x, 0, 1.0, stereo_pan)
    out = S.reverb_tail(out, ir if ir is not None else ROOM, wet)
    # trim silence at end
    env = np.abs(out).max(axis=1)
    last = np.nonzero(env > 1e-3)[0]
    out = out[: (last[-1] + 1 if len(last) else len(out))]
    fade = min(len(out), int(0.02 * SR))
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    encode(name, S.master(out, peak_db=peak, drive=1.05))


def cat(*parts):
    total = max(int(o * SR) + len(p) for o, p in parts)
    y = np.zeros(total)
    for o, p in parts:
        s = int(o * SR)
        y[s:s + len(p)] += p
    return y


def all_sfx():
    sfx('sfx_click', cat((0, S.pluck(n2m('G6'), 0.08, 0.5, 0.9)), (0, S.bacalhau(0.3))), 0.05, peak=-6)
    sfx('sfx_spin', cat((0, S.whoosh(0.45, 200, 3000, 0.6)), (0, S.zabumba(0.4, 0.2, 1.4)), (0.02, S.shaker(0.6, 0.2))), 0.08, peak=-5)
    # reel stop: wooden thunk + leather
    thunk = lambda p: cat((0, S.zabumba(0.9, 0.25, p)), (0, S.bacalhau(0.5)), (0.005, S.lp(S.noise(int(0.04 * SR)), 900) * S.exp_decay(int(0.04 * SR), 0.01) * 0.4))
    sfx('sfx_reelstop', thunk(1.25), 0.06, peak=-4)
    sfx('sfx_reelstop_quick', thunk(1.45), 0.04, peak=-6)
    for i, base in enumerate(['E5', 'G5', 'B5']):
        m = n2m(base)
        sfx(f'sfx_scatter{i + 1}', cat((0, S.bell(m + 12, 1.4, 0.8)), (0.06, S.bell(m + 19, 1.2, 0.6)), (0, S.triangle_hit(True, 1.2)), (0, S.zabumba(0.6, 0.3, 1.5))), 0.25, HALL, -2)
    riser = S.whoosh(3.0, 120, 6000, 0.5, True) + np.concatenate([S.strings(n2m('G3') + k, 3.0, 0.5, attack=2.5) for k in [0]])[: int(3 * SR)]
    sfx('sfx_anticipation', riser, 0.3, HALL, -3)
    sfx('sfx_win_small', cat(*[(i * 0.05, S.accordion(n2m(n), 0.35, 0.8)) for i, n in enumerate(['G4', 'B4', 'D5'])], (0.1, S.triangle_hit(True, 0.9))), 0.2, HALL, -3)
    sfx('sfx_win_medium', cat(*[(i * 0.07, S.accordion(n2m(n), 0.5, 0.9, 1.1)) for i, n in enumerate(['G4', 'B4', 'D5', 'G5'])], (0, S.zabumba(0.8)), (0.28, S.zabumba(0.7)), (0.2, S.triangle_hit(True, 1))), 0.22, HALL, -2)
    sfx('sfx_coin', cat((0, S.bell(n2m('E7'), 0.35, 0.6)), (0.03, S.bell(n2m('B7'), 0.3, 0.4))), 0.1, peak=-6)
    sfx('sfx_tick', S.bell(n2m('G6'), 0.12, 0.6), 0.03, peak=-10)
    # wild: whip crack + chime
    crack = S.hp(S.noise(int(0.06 * SR)), 1500) * S.exp_decay(int(0.06 * SR), 0.008) * 1.5
    sfx('sfx_wild', cat((0, crack), (0.02, S.taiko(0.8, 0.8, 1.4)), (0.05, S.bell(n2m('D6'), 1.2, 0.7)), (0.1, S.bell(n2m('A6'), 1.0, 0.5))), 0.25, HALL, -1.5)
    sfx('sfx_wild_expand', cat((0, S.whoosh(0.6, 200, 5000, 0.8)), (0.45, S.taiko(1.0, 1.2, 0.9)), (0.45, S.anvil(0.4, 900)), (0.5, S.bell(n2m('G5'), 1.4, 0.6))), 0.3, HALL, -1)
    gun = S.lp(S.noise(int(0.5 * SR)), 2500) * S.exp_decay(int(0.5 * SR), 0.06) * 1.6
    sfx('sfx_gunshot', cat((0, gun), (0, S.taiko(1, 0.8, 1.6))), 0.45, BIG, -1)
    # arrival: two gunshots + accordion flourish
    flourish = [(0.55 + i * 0.06, S.accordion(n2m(n), 0.25, 0.9, 1.2)) for i, n in enumerate(['G4', 'B4', 'D5', 'F5', 'G5'])]
    sfx('sfx_arrival', cat((0, gun), (0, S.taiko(1, 0.8, 1.6)), (0.3, gun * 0.8), *flourish, (0.86, S.accordion(n2m('B5'), 0.8, 1, 1.2))), 0.35, BIG, -1)
    # raid: galloping hooves (3-beat pattern) + shouts (formant-ish brass)
    hooves = []
    for i in range(10):
        b = i * 0.24
        for k, d in enumerate([0, 0.06, 0.11]):
            hooves.append((b + d, S.lp(S.noise(int(0.05 * SR)), 1200) * S.exp_decay(int(0.05 * SR), 0.012) * (0.9 - k * 0.15) * (0.4 + i / 14)))
    shout = [(0.9, S.brass(n2m('A4'), 0.35, 0.8)), (1.4, S.brass(n2m('C5'), 0.35, 0.8)), (1.9, S.brass(n2m('E5'), 0.6, 0.9))]
    sfx('sfx_raid', cat(*hooves, *shout, (0.2, S.whoosh(2.2, 150, 2500, 0.3))), 0.2, HALL, -1.5)
    sfx('sfx_transform', cat((0, S.whoosh(0.25, 800, 7000, 0.5)), (0.18, S.bell(n2m('E6'), 0.6, 0.6))), 0.15, peak=-4)
    # bonus trigger fanfare
    fan = [(i * 0.12, S.brass(n2m(n), 0.4 if i < 3 else 1.2, 0.9)) for i, n in enumerate(['G4', 'C5', 'E5', 'G5'])]
    sfx('sfx_trigger', cat(*fan, (0, S.taiko(1)), (0.36, S.taiko(1, 1.4, 0.8)), (0.36, S.anvil(0.4)), (0.36, S.triangle_hit(True, 1.2))), 0.35, BIG, -1)
    sfx('sfx_transition', cat((0, S.whoosh(1.1, 120, 4000, 0.9)), (0.9, S.taiko(1, 1.4, 0.8))), 0.3, BIG, -2)
    # intros (per-bonus identity)
    gallop = []
    for i in range(12):
        b = i * 0.2
        for k, d in enumerate([0, 0.05, 0.1]):
            gallop.append((b + d, S.lp(S.noise(int(0.05 * SR)), 1100) * S.exp_decay(int(0.05 * SR), 0.012) * (0.5 + i / 16)))
    run = [(1.0 + i * 0.07, S.accordion(n2m(n), 0.2, 1, 1.2)) for i, n in enumerate(['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C6', 'D6'])]
    sfx('sfx_intro_escape', cat(*gallop, *run, (1.6, S.accordion(n2m('D6'), 0.9, 1, 1.2)), (1.6, S.taiko(1))), 0.3, HALL, -1)
    creak = S.bp(S.noise(int(0.9 * SR)), 180, 900) * (0.5 + 0.5 * np.sin(np.linspace(0, 40, int(0.9 * SR))) ** 2) * S.exp_decay(int(0.9 * SR), 0.5)
    sfx('sfx_intro_hideout', cat((0, creak * 0.8), (0.7, S.strings(n2m('E3'), 2.0, 0.8, attack=0.4, fc=900)), (0.8, S.bell(n2m('B5'), 2, 0.6)), (1.1, S.bell(n2m('G5'), 2, 0.5)), (1.4, S.bell(n2m('E5'), 2.2, 0.6))), 0.4, HALL, -2)
    thunder = S.lp(S.noise(int(2.5 * SR)), 300) * S.exp_decay(int(2.5 * SR), 0.7) * 1.4
    sfx('sfx_intro_last', cat((0, thunder), (0.6, S.taiko(1.0, 1.5, 0.8)), (0.9, S.taiko(1.0, 1.5, 0.8)), (1.2, S.taiko(1, 1.5, 0.7)), *[(1.2, S.brass(n2m(n), 1.6, 1)) for n in ['A3', 'C#4', 'E4']], (1.2, S.anvil(0.6))), 0.35, BIG, -1)
    sfx('sfx_multiplier', cat(*[(i * 0.05, S.accordion(n2m(n), 0.2, 0.9, 1.2)) for i, n in enumerate(['G5', 'B5', 'D6'])], (0.12, S.bell(n2m('G6'), 0.8, 0.7)), (0, S.zabumba(0.6, 0.3, 1.3))), 0.25, HALL, -2)
    sfx('sfx_retrigger', cat(*[(i * 0.09, S.bell(n2m(n), 1.0, 0.7)) for i, n in enumerate(['E5', 'G5', 'B5', 'E6'])], (0, S.taiko(0.8)), (0.3, S.brass(n2m('E5'), 0.8, 0.8))), 0.3, HALL, -1.5)
    sfx('sfx_chest_hover', S.bp(S.noise(int(0.25 * SR)), 250, 900) * S.exp_decay(int(0.25 * SR), 0.1) * 0.6, 0.1, peak=-12)
    sfx('sfx_chest_open', cat((0, creak[: int(0.5 * SR)]), (0.35, S.bell(n2m('E6'), 1.0, 0.6)), (0.42, S.bell(n2m('B6'), 1.0, 0.5)), (0.36, S.whoosh(0.5, 2000, 9000, 0.3))), 0.3, HALL, -2)
    sfx('sfx_chest_empty', cat((0, creak[: int(0.4 * SR)]), (0.3, S.zabumba(0.8, 0.4, 0.8)), (0.32, S.lp(S.noise(int(0.4 * SR)), 1200) * S.exp_decay(int(0.4 * SR), 0.15) * 0.4)), 0.2, ROOM, -3)
    sfx('sfx_treasure', cat(*[(i * 0.06, S.bell(n2m(n), 1.2, 0.6)) for i, n in enumerate(['C6', 'E6', 'G6', 'C7', 'E7', 'G7'])], (0, S.taiko(0.8)), (0, S.triangle_hit(True, 1.2))), 0.35, HALL, -1)
    romance = [(i * 0.28, S.accordion(n2m(n), 0.5, 0.9, 0.9)) for i, n in enumerate(['B4', 'D5', 'G5', 'F#5', 'G5'])]
    sfx('sfx_couple', cat(*romance, *[(1.2, S.strings(n2m(n), 1.6, 0.7, attack=0.2)) for n in ['G3', 'B3', 'D4']], (1.2, S.bell(n2m('G6'), 2, 0.6))), 0.4, HALL, -1)
    sfx('sfx_lock', cat((0, S.anvil(0.7, 1400)), (0, S.taiko(0.8, 0.6, 1.5)), (0.01, S.bell(n2m('A6'), 0.6, 0.5))), 0.25, HALL, -1.5)
    sfx('sfx_respin', cat((0, S.whoosh(0.5, 300, 3000, 0.6)), *[(k * 0.05, S.snare(0.3 + k * 0.04, 0.12)) for k in range(8)]), 0.15, ROOM, -4)
    sfx('sfx_respin_reset', cat((0, S.anvil(0.5, 1800)), (0.05, S.bell(n2m('E6'), 0.8, 0.6)), (0.1, S.bell(n2m('A6'), 0.8, 0.5))), 0.25, HALL, -3)
    sfx('sfx_emblem', cat((0, S.whoosh(0.8, 1000, 9000, 0.5)), *[(0.2 + i * 0.05, S.bell(n2m(n), 0.9, 0.6)) for i, n in enumerate(['A5', 'C#6', 'E6', 'A6'])], (0.2, S.taiko(0.7, 1.0, 1.1))), 0.35, HALL, -1.5)
    sfx('sfx_grand', cat(*[(i * 0.15, S.brass(n2m(n), 0.6 if i < 4 else 2.0, 1)) for i, n in enumerate(['A4', 'C#5', 'E5', 'A5', 'C#6'])], (0, S.taiko(1)), (0.6, S.taiko(1, 1.6, 0.7)), (0.6, S.anvil(0.6)), *[(0.6 + i * 0.05, S.bell(n2m(n), 1.6, 0.5)) for i, n in enumerate(['A6', 'C#7', 'E7'])]), 0.4, BIG, -0.8)
    sfx('sfx_bigwin_hit', cat((0, S.taiko(1, 1.6, 0.7)), (0, S.anvil(0.5, 900)), (0, S.whoosh(0.4, 4000, 10000, 0.5, False))), 0.4, BIG, -1)
    sfx('sfx_bigwin_end', cat(*[(i * 0.12, S.brass(n2m(n), 0.4 if i < 3 else 1.6, 1)) for i, n in enumerate(['D5', 'G5', 'B5', 'D6'])], (0.36, S.taiko(1)), (0.36, S.anvil(0.5)), (0.36, S.triangle_hit(True, 1.2))), 0.35, BIG, -0.8)
    sfx('sfx_tier_up', cat((0, S.taiko(1, 1.2, 0.9)), (0, S.whoosh(0.5, 400, 8000, 0.6)), *[(0.05 + i * 0.05, S.bell(n2m(n), 0.8, 0.6)) for i, n in enumerate(['G5', 'B5', 'D6', 'G6'])]), 0.35, BIG, -1)
    sfx('sfx_feature_end', cat(*[(i * 0.22, S.accordion(n2m(n), 0.4 if i < 3 else 1.4, 0.9)) for i, n in enumerate(['D5', 'C5', 'B4', 'G4'])], *[(0.66, S.strum([n2m(x) for x in ['G3', 'B3', 'D4', 'G4']], 1.4, 0.7))], (0.66, S.zabumba(1))), 0.3, HALL, -1.5)
    sfx('sfx_error', cat((0, S.pluck(n2m('C3'), 0.2, 0.7, 0.3)), (0.08, S.pluck(n2m('B2'), 0.25, 0.7, 0.3))), 0.05, peak=-8)


if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    if os.path.exists(os.path.join(OUT, 'manifest.json')):
        MANIFEST.update(json.load(open(os.path.join(OUT, 'manifest.json'))))
    if 'base' in only:
        print('music (base only):')
        base_theme()
    if not only or 'music' in only:
        print('music:')
        base_theme()
        escape_theme()
        hideout_theme()
        laststand_theme()
        bigwin_theme()
    if not only or 'sfx' in only:
        print('sfx:')
        all_sfx()
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(MANIFEST, f, indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT))
    print(f'audio total {total / 1e6:.1f} MB (ogg + m4a)')
