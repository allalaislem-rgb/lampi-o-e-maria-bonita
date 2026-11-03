# Lampião & Maria Bonita – The Legend of the Sertão

**Orbit Games** · playable development prototype of a premium 5×3, 25-line video slot with three
separate bonus games, three Bonus Buy options and two random base-game events.

> ⚠️ **DEVELOPMENT PROTOTYPE.** It uses a simulated wallet (play money), a development RNG, and
> mathematical values that are unvalidated development defaults. It is **not certified** and
> must not be connected to real-money payments.

## Quick start

Requirements: Node.js 18+ (tested on Node 22). Python 3 with Pillow, NumPy and SciPy is needed
only if you want to re-cut the sprites.

```bash
npm install
```

```bash
npm run dev
```

Then open the URL that Vite prints (http://localhost:5173). Other scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (`--host` is set, so you can open it on a phone on the same network) |
| `npm run build` | Type-check plus a production build into `dist/` (a static site you can host anywhere) |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run sim -- [spins] [featureRuns]` | Monte-Carlo RTP simulation of the dev math |
| `npm run assets` | Re-extract the sprites from `art/source/sheet1.jpg` / `sheet2.jpg` |

**Controls:** Space or the round button spins. Click Spin during a win presentation to skip it.
The **⚙ (settings)** button opens the QA panel, which can force any bonus or random event on the next spin.

## Implemented features

### Base game
- 5×3 reels, 25 fixed paylines, left-to-right wins, Wild substitution (reels 2–5), 10 regular symbols and 4 special symbols.
- Reel spin with motion blur, a staggered stop with bounce, anticipation (glow and sound) when 2 scatters have landed, scatter landing effects, payline drawing, winner highlighting, and a line-by-line win cycle.
- Big / Mega / Epic win celebrations with a coin shower and count-up.
- Bet selector (10 levels), balance and win meters, turbo mode, autoplay (10/25/50/100; stops when a feature triggers or the balance runs out; it can be switched off per market in config), sound toggle, paytable and rules (values in currency for the current bet, plus a payline diagram), round history (ledger), QA panel.
- **Lampião's Arrival:** a character entrance, then 1 reel (rarely 2) turns into a full Wild reel *before* evaluation.
- **The Cangaceiros' Raid:** riders sweep across the screen, then low symbols transform into one premium symbol (a matching group, a whole reel, or rarely several reels) *before* evaluation.

### The Great Escape (Free Spins)
- 3 / 4 / 5 Wanted Posters award 10 / 12 / 15 spins. Wilds expand to fill their reel (grow animation).
- The Escape Multiplier meter (1× → 10×) goes up after each spin where a Wild contributes to a win and persists for the whole feature.
- The Cangaceiro Raid turns random reels Wild without using a spin. 3+ posters retrigger +5 spins.
- Sunset environment with riders, streaming dust, sun rays and faster music.

### The Hideout (Pick bonus)
- 12 chests and 3 picks. Prizes: gold coins, multipliers, extra picks, Lampião's Treasure, Maria's Medallion (×2 multiplier) and empty chests.
- The **Couple's Fortune** tracker; collecting both specials unlocks a bonus reward. Prizes already won can never be lost.
- Chest shake, burst of light rays, coin fountain, prize reveal, and a "what you missed" reveal at the end.
- Dark wooden hideout environment with flickering lanterns and floating motes.

### The Last Stand (Hold & Respin)
- A dedicated 5×3 grid with 3 respins. Gold symbols lock in place; any new symbol resets the counter to 3.
- Additive multiplier symbols (2× 3× 5× 10×). Lampião's Emblem sends beams that either upgrade multipliers or add gold positions.
- Filling all 15 positions awards the Grand Treasure. The feature also ends when respins run out or the max win is reached.
- Canyon environment with darker grading, rising embers, metallic lock stamps and heavy percussion.

### Bonus Buy
- Three separate buttons showing live prices (configurable multiple × current bet), a confirmation dialog, balance and max-bet validation, immediate deduction, entry into the correct bonus, and a return to the base game.
- Purchases can't be duplicated: the engine refuses a buy while a round is open, every request is idempotent, and the UI guards against double clicks.

### Platform
- Responsive layout for desktop landscape, mobile portrait (two-row HUD with the buy row) and short mobile landscape screens.
- **Interrupted-game recovery:** the engine state, including the hidden Hideout board and the RNG state, is saved after every action. Reloading mid-feature resumes exactly where play stopped, with no double payout.
- Original procedurally synthesised sound effects and music: a forró / baião-style loop with zabumba, triangle and accordion-like lead, plus separate themes for each bonus.

## Architecture

```
src/
  config/gameConfig.ts        ← ALL tunable values: symbols, pays, weights, paylines, features, buy prices, bets, max win
  engine/                     ← authoritative game engine (no rendering code)
    rng.ts                    RNG Service (DevRng xoshiro128**, seedable/serialisable; ScriptedRng for tests)
    math.ts                   Math Engine (grid generation, payline evaluation, scatters)
    baseGame.ts               Base Game Engine (spin → event → wins → triggers)
    randomEvents.ts           Random Event Manager (Arrival, Raid)
    features/greatEscape.ts   Great Escape Module
    features/hideout.ts       Hideout Module (reusable pick engine)
    features/lastStand.ts     Last Stand Module (reusable Hold & Respin engine)
    bonusManager.ts           Bonus Manager (feature routing + client-safe views)
    bonusBuy.ts               Bonus Buy Manager (pricing + validation)
    wallet.ts                 Wallet / Round Ledger (simulated, idempotent transactions)
    gameState.ts              Game State Manager (phase machine, allowed actions/transitions)
    server.ts                 GameServer facade: idempotent requests, max-win cap, settlement, persistence/recovery
    client.ts                 GameClient: the async API the UI uses (backend-ready seam)
  audio/sound.ts              Sound manager (Web Audio synthesis)
  ui/                         ← presentation only
    controller.ts             Animation Controller: requests outcomes and animates them
    stage.ts                  Pixi app, responsive layout, transitions, banners, big wins
    environment.ts            Per-mode cinematic backgrounds + ambient VFX
    reels.ts                  Reel set (spin/stop/anticipation/wins/wild reels/transform)
    hideoutView.ts            Pick board
    lastStandView.ts          Hold & Respin grid
    infoBar.ts                Feature plates, multiplier meter, Couple's Fortune tracker
    fx.ts, gfx.ts             Particles and procedurally generated textures/text styles
    hud.ts, overlays.ts       DOM HUD and modal dialogs
tests/                        Vitest: math, features, server (wallet, buy, states, cap, recovery)
tools/simulate.ts             RTP simulator
tools/extract_assets.py       Sprite extraction from the concept sheets
art/source/                   Supplied sprite sheets + GDD
docs/                         MATH_ASSUMPTIONS.md, ARCHITECTURE.md
```

**Authoritative outcomes.** The UI never decides anything. `Controller` calls `GameClient`, which
calls `GameServer`, which returns the complete outcome (grids, events, wins, feature state).
The views only play back what they receive. The Hideout board stays inside the server until a chest
is opened. To move to a real backend, re-implement `GameClient` over HTTP/WebSocket with the
same method signatures, run `GameServer` (or a certified equivalent) server-side, and swap
`DevRng` for the certified RNG.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/MATH_ASSUMPTIONS.md`](docs/MATH_ASSUMPTIONS.md).

## Tests

`npm test` runs 48 tests covering:
- RNG determinism
- reel generation
- payline uniqueness and calculation
- Wild substitution and pure-wild lines
- scatter triggers, both forced and natural, for all three bonuses
- random events changing the payout
- Great Escape: spin awards, multiplier progression and cap, multiplier application, retriggers, Raid, max-win cap
- Hideout: board constraints, picks, prize retention, extra picks, Couple's Fortune, invalid and duplicate picks
- Last Stand: the respin counter (consume, reset, end), locking, multiplier maths, emblem upgrades, full grid
- Bonus Buy deduction, validation and duplicate prevention
- balance updates, idempotent requests and no double payout
- state-machine transitions and the simultaneous-trigger choice
- the max-win cap on every route
- recovery of an interrupted Hideout or Great Escape, and that a settled round is never paid twice

## Remaining placeholders

- **Artwork.** Symbols, props, titles and backgrounds are cut from the two supplied concept sprite sheets (Sheet 1 for all symbols, as the client chose). They are low resolution (about 200 px source, upscaled ×2), and the three backgrounds are about 280 px source plates that are upscaled and blurred. Final high-resolution art, animated character rigs (Spine) and layered parallax backgrounds are still needed.
- **Generated graphics.** The reel frames, plates, glows, particles and Wild-reel panels are drawn procedurally in code.
- **Audio.** All sound effects and music are synthesised at runtime as placeholders for a sound designer's assets.
- **Fonts.** Rye and Alfa Slab One load from Google Fonts, with serif fallbacks when offline.
- **Mathematics.** Every value is a development default (see `docs/MATH_ASSUMPTIONS.md`).
- **Platform.** The wallet and RNG are simulated and development-only. Responsible-gaming tools, localisation and jurisdiction configuration are not implemented.
