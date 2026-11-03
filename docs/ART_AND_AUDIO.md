# Art & audio production pipeline

All artwork, music and sound effects in this build are **original**. They were made from scratch
for this game: authored in code, then rendered offline. Nothing comes from the earlier concept
sprite sheets, which have been removed from the repository, and no third-party images or audio
are used.

## Art pipeline

```
tools/art/*.mjs  ──(SVG)──▶  tools/art/render.mjs  ──(PNG/JPG, headless Chromium)──▶  art/render/
                                                     tools/art/pack.py  ──▶  public/gfx/*.webp + *.json
```

| Module | Contents |
|---|---|
| `lib.mjs` | Shared palette, material gradients (gold, leather, wood, steel, brass, paper), filters (bevel, specular, grain, drop shadow, glow), drawing helpers. All assets share one lighting rule: warm key light from the top-left, sunset rim light, warm-brown shadows. |
| `characters.mjs` | Lampião and Maria Bonita busts, plus the cangaceiro half-moon hat with its Signo de Salomão star. |
| `symbols.mjs` | The 14 reel symbols (200×180 cell, rendered at ×2.4). Portraits sit in gold cards. The Wild uses a distinct pose: raised revolver, radiant gold card, red WILD plate. |
| `objects.mjs` | Chests (closed / open / treasure / empty), coins, multiplier coins, Lampião's Emblem, Maria's medallion, gold star, ruby heart, lantern, scarf, rider silhouette. |
| `env.mjs` | Four environments × three parallax layers (back, mid, front) and three reel frames (base, hideout, last stand), plus info plates and the Hold & Respin cell. |
| `ui.mjs` | Logo, feature title signs, BIG / MEGA / EPIC WIN banners, and vector HUD buttons written to `public/ui/*.svg` (crisp at any resolution). |
| `fx.mjs` | Neutral VFX textures, tinted at runtime: glow, spark, ring, streak, rays, dust, smoke, ember, flare, shine. |

**Atlases.** `symbols.webp` holds every symbol plus a pre-rendered vertical **motion-blur** variant
used while the reels spin. `objects.webp` holds objects, VFX and plates. Large images (backgrounds,
frames, logo, titles, win banners) are standalone WebP files. Total graphics payload is about 2.3 MB.

To regenerate the art you need Playwright with Chromium (`npm i -D playwright`, then `npx playwright install chromium`) and Python 3 with Pillow:

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

This is code-authored, stylised illustration and offline synthesis. It is not painted 3D renders
or a recorded live ensemble. The pipeline and runtime already support swapping in final assets:

- **Art:** replace the PNG output of `render.mjs` (same names and sizes) and re-run `pack.py`.
- **Audio:** drop recorded stems and SFX into `public/audio/` with the same names and update `manifest.json`.
