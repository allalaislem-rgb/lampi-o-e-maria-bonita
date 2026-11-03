# Architecture

```
 ┌──────────── Presentation (src/ui, src/audio) ────────────┐        ┌──────── Authoritative engine (src/engine) ────────┐
 │ HUD / Overlays (DOM)  ──input──▶  Controller              │  async │ GameClient ──▶ GameServer                          │
 │ Stage (Pixi): Environment, ReelsView, HideoutView,        │◀──────▶│   ├─ GameStateMachine (phases / allowed actions)   │
 │   LastStandView, InfoBar, FX            ◀──animate────    │        │   ├─ Base Game Engine ─ Math Engine ─ RNG Service │
 │ SoundManager                                              │        │   ├─ Random Event Manager                         │
 └───────────────────────────────────────────────────────────┘        │   ├─ Bonus Manager ─ GreatEscape/Hideout/LastStand│
                                                                       │   ├─ Bonus Buy Manager                            │
                       config/gameConfig.ts (all values) ─────────────▶│   ├─ Wallet + Round Ledger (simulated)            │
                                                                       │   └─ Persistence (KVStorage) → recovery           │
                                                                       └───────────────────────────────────────────────────┘
```

## Game flow (GDD §7)

1. `IDLE` → **spin**: the stake is debited and the round opens in the ledger. The engine generates the grid, rolls a random event, evaluates wins and checks triggers.
2. No trigger: the round settles (one idempotent credit) and the phase returns to `IDLE`.
3. One trigger: the phase moves to the feature (`GREAT_ESCAPE` / `HIDEOUT` / `LAST_STAND`).
4. Several triggers: the phase moves to `BONUS_CHOICE`, then **choose** leads to the selected feature. The other features are forfeited.
5. **buy** from `IDLE`: the price is debited and the feature is entered directly.
6. Feature actions (`freeSpin` / `pick` / `respin`) run until the feature ends. The round then settles: base win + feature win, capped at the max win, credited exactly once. The phase returns to `IDLE`.

## Safety properties

| Concern | Mechanism |
|---|---|
| Frontend deciding outcomes | The UI only calls `GameClient`. Every outcome comes from `GameServer` |
| Hidden information | Hideout board kept server-side; `publicHideout()` exposes opened chests only |
| Invalid states | `GameStateMachine.assertCan(action)` + `go(next)` transition table |
| Duplicate requests | `requestId` response cache in `GameServer.idempotent` |
| Duplicate purchases | Buying is only allowed in `IDLE`; the UI also guards against double clicks |
| Duplicate payouts | Wallet transactions are keyed (`<roundId>:payout`) and applied once, including after a reload |
| Max win | Per-round cap enforced in every feature step and at settlement |
| Interrupted games | Full state (wallet, ledger, phase, feature, RNG) persisted after every action and restored on boot. The UI resumes the right scene |
| Audit | Every round records id, type, bet, cost, RNG reference, step log, wins, balance before/after, status |

## Moving to production

- Run `GameServer`, or a certified re-implementation of it, behind an authenticated API. Implement `GameClient` over HTTP/WebSocket. The method set is `snapshot`, `setBet`, `spin`, `buy`, `choose`, `freeSpin`, `pick` and `respin`.
- Replace `DevRng` with the certified RNG through the `Rng` interface.
- Replace `SimulatedWallet` with the operator wallet integration (debit/credit by transaction id).
- Set `dev.allowForcedOutcomes = false`. This hides the QA panel, and the server rejects forced outcomes.
- Replace the development defaults in `gameConfig.ts` with the certified math.
