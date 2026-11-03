# Art & audio production pipeline

## Art

All artwork comes from the client's painted art packs in `art/source/`. Two scripts cut them automatically.

**`tools/art/cut_v6.py`** (art pack 6) produces:

| Source | What becomes of it |
|---|---|
| `in_6.webp` | Sunset village background. Used in every mode, colour-graded per mode. |
| `in_7.webp` | Rider gallop, 24 frames. Frames 0–7 are the approach, 8–23 the gallop loop. Used for the riders crossing the plain and the Great Escape intro. |
| `in_8.webp` | Western display font. Converted to an AngelCode bitmap font (`public/fonts/western.fnt` and `.png`). The alpha comes from luminance, so the glow is kept. Accented capitals (Ã Õ Á É Í Ó Ú Â Ê Ô À Ç) are drawn to match. |
| `in_9.webp` | UI kit: the logo, the three bonus cards (Bonus Buy and intros), SPIN / AUTO buttons, the BONUS BUY badge, x-multiplier badges, the BALANCE / WIN / BET panels (with the baked sample text erased), icons and plaques. |
| `in_10.webp` | Reel frame. Its inner window is mapped onto the 5×3 reel area, so the lanterns, cacti, skull and wheel overlap the edges slightly. |

**`tools/art/cut_sheet.py`** (`sheet_v5.webp`) produces the 14 reel symbols (the winking Lampião and his Wild), the Lampião and Maria frame sequences, coins, flares, smoke, muzzle flashes and the glowing card frames.

Only the Hideout chests, Lampião's Emblem in The Last Stand, the generic glow and ring effects, and the BIG / MEGA / EPIC WIN banners are still code-drawn (`tools/art/*.mjs`).

**Where the western font is used:**

- **Canvas text:** big numbers and titles through Pixi `BitmapText`. If a string contains a character the font lacks (apostrophes, lowercase), it falls back to the gold Rye text.
- **HTML HUD:** balance, bet, win, Buy prices and the autoplay counter, drawn by a small canvas renderer (`src/ui/westernDom.ts`).

To regenerate the art you need Playwright with Chromium and Python 3 with Pillow and SciPy:

```bash
npm run art
```

## Audio pipeline

```
tools/audio/synth.py   instrument models + mixing (numpy / scipy)
tools/audio/compose.py score + SFX → public/audio/*.ogg + *.m4a + manifest.json
```

**Instruments** are modelled, not sampled:

- **Accordion:** additive reeds, two detuned voices (musette), vibrato and a bellows envelope.
- **Viola / guitar:** Karplus-Strong plucked strings with strums.
- **Zabumba:** a pitched membrane plus the *bacalhau* stick click.
- **Triangle:** inharmonic metal partials.
- **Also:** bass, string ensemble, brass, taiko, anvil, bells.
- **Reverb:** convolution with synthetic room, hall and canyon impulse responses.

**Score.** Each game mode has a main stem and an intensity layer of the same length and tempo. They
run in sample-accurate sync and the runtime crossfades between them:

| Mode | Main stem | Intensity layer (when it rises) |
|---|---|---|
| Base game | Sertão baião in D mixolydian, 104 BPM. A *banda de pífanos* lead (two fifes in thirds) over sanfona offbeat chords, zabumba, triangle and bass | Two layers. **Tension** (tremolo strings, shaker 16ths, heartbeat zabumba, sanfona drone) comes in on a near miss with 2 scatters, then eases off after about 4 s. The suspense on the last reels pushes it further. **Drive** (doubled zabumba, taiko, brass stabs, fife an octave up) comes in at full level when a bonus hits |
| The Great Escape | Fast forró in D mixolydian, 138 BPM, accordion runs | Brass stabs and pandeiro. Follows the Escape Multiplier |
| The Hideout | Mysterious viola arpeggios in E minor, 76 BPM, music box | Heartbeat and high strings on the last pick |
| The Last Stand | War drums in A phrygian dominant, 96 BPM, low-string ostinato, brass | Snare rolls, choir pad and anvils when 1 respin is left or the grid is nearly full |
| Big win | Celebratory brass, accordion and percussion loop | The mode music is ducked underneath |

**Seamless loops.** The reverb is rendered circularly, so the tail wraps into the start of the loop.
Files carry a pre-roll and post-roll, and the runtime loops between the `loopStart` and `loopEnd`
values in `manifest.json`, so encoder padding never causes a gap or click.

**Sound effects.** There are 40 dedicated effects:

- **Reels:** spin, reel stop (pitched per reel), and three rising scatter-landing tones.
- **Line wins:** anticipation riser, small and medium win, coin, count-up tick.
- **Wilds:** Wild land and Wild expand.
- **Random events:** gunshot, Lampião's Arrival, Raid (gallop), symbol transform.
- **Bonus entry:** bonus trigger fanfare, transition, and one intro per bonus.
- **Great Escape:** multiplier and retrigger.
- **Hideout:** chest hover, open, empty, treasure, and Couple's Fortune.
- **Last Stand:** lock stamp, respin, respin reset, emblem, Grand Treasure.
- **Celebrations:** big-win hit, big-win end, tier-up, feature end.
- **UI:** click and error.

**Runtime** (`src/audio/sound.ts`): Web Audio with separate Music and SFX gain channels and a
master mute, all persisted per player in the Sound settings panel. It also handles sync-crossfaded
stems, intensity layers, ducking for big wins, lazy loading of each mode's music, and format
selection (Ogg Vorbis, or AAC for Safari).

To regenerate the audio you need Python 3 with numpy and scipy, plus ffmpeg with libvorbis:

```bash
npm run audio
```

## Limitations

- **Art:** the backgrounds, reel frames and Hideout chests are still code-drawn vector art, so their style is flatter than the painted sheet. Painted versions can replace them file-for-file.
- **Audio:** the music is synthesised offline, not a recorded ensemble. Recorded stems can be dropped into `public/audio/` with the same names and `manifest.json` loop points.
