# Art & audio production pipeline

## Art

The main artwork comes from the **client's painted asset sheet** `art/source/sheet_v5.webp`
(1125×750, true alpha). It covers the 14 reel symbols (including the winking Lampião and his Wild),
the character frame sequences, logo, bonus title cards, HUD buttons, panels, multiplier badges,
spinning coins, flares, smoke, muzzle flashes, casings, flowers and the glowing card frames.

`tools/art/cut_sheet.py` cuts it automatically:

- removes the faint alpha haze around every sprite (alpha below about 24 is dropped);
- keeps only the main shape, so slivers of neighbouring sprites are discarded;
- fits each reel symbol into a uniform 480×432 canvas;
- upscales the smaller items with Lanczos plus light sharpening;
- writes the HUD images to `public/ui/*.webp`.

Pieces the sheet does not contain are still **code-drawn** (`tools/art/*.mjs`, rasterised by
`render.mjs` in headless Chromium):

- the four parallax backgrounds;
- the three reel frames;
- the Hideout chests, Lampião's Emblem (Last Stand), medallion, heart and lantern;
- the Portuguese win banners (GRANDE / MEGA GANHO, GANHO ÉPICO);
- generic VFX (glow, ring, rays, shine);
- the small SVG buttons (−, +, close, settings, music).

Everything is packed into WebP texture atlases by `pack.py`:

| Atlas | Contents |
|---|---|
| `symbols` | The 14 symbols, each with a pre-rendered motion-blur variant |
| `objects` | Badges, coins, FX, props and panels |
| `chars` | Lampião and Maria frame sequences and the glowing card frames |

To regenerate the art you need Playwright with Chromium and Python 3 with Pillow and SciPy:

```bash
npm run art
```

**Resolution note.** The sheet is 1125 px wide, so a reel symbol is about 200 px in the source and is
upscaled about 2.2× for the 480 px symbol canvas. Large uses, such as the full-screen title cards in
bonus intros, are visibly soft. A higher-resolution export of the same sheet (2×–4×) can be dropped in
at the same coordinates scaled up; only the boxes in `cut_sheet.py` need multiplying.

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
| Base game | Baião in G mixolydian, 100 BPM: zabumba, triangle, viola, accordion melody | Tremolo strings and shaker. Rises during scatter anticipation and on bonus triggers |
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
