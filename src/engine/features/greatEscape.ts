/**
 * Great Escape Module – Free Spins with expanding Lampião Wilds, the Escape
 * Multiplier, the in-feature Cangaceiro Raid and retriggers.
 */
import { FREE_SPIN_REEL_WEIGHTS, REELS, ROWS, type GameConfig } from '../../config/gameConfig';
import { cloneGrid, countSymbol, evaluateLines, generateGrid, type Grid, type LineWin } from '../math';
import { pickWeighted, sample, type Rng } from '../rng';

export interface GreatEscapeState {
  spinsTotal: number;
  spinsLeft: number;
  spinsPlayed: number;
  multiplier: number;
  totalWin: number; // cents, feature win only
  retriggers: number;
  lastGrid: Grid | null;
}

export interface FreeSpinResult {
  spinNumber: number;
  grid: Grid; // landed symbols
  expandedReels: number[]; // reels where a landed wild expanded
  raidReels: number[]; // reels turned wild by the Cangaceiro Raid
  finalGrid: Grid; // after expansion + raid (evaluated grid)
  lineWins: LineWin[];
  multiplierBefore: number;
  multiplierAfter: number;
  qualifying: boolean;
  spinWin: number;
  scatters: number;
  retriggerSpins: number;
  spinsLeft: number;
  spinsTotal: number;
  totalWin: number;
  capped: boolean;
}

export type GECfg = GameConfig['greatEscape'];

export function startGreatEscape(cfg: GECfg, scatters: number): GreatEscapeState {
  const n = Math.max(3, Math.min(5, scatters));
  const spins = cfg.spinsAwarded[n];
  return { spinsTotal: spins, spinsLeft: spins, spinsPlayed: 0, multiplier: cfg.multiplierStart, totalWin: 0, retriggers: 0, lastGrid: null };
}

/**
 * Play one free spin. `remainingCap` is the amount (cents) the round may still win
 * before hitting the max-win cap.
 */
export function playFreeSpin(rng: Rng, state: GreatEscapeState, cfg: GECfg, lineBet: number, remainingCap: number, forceRaid = false): { state: GreatEscapeState; result: FreeSpinResult } {
  if (state.spinsLeft <= 0) throw new Error('No free spins left');
  const grid = generateGrid(rng, FREE_SPIN_REEL_WEIGHTS);

  // Expanding wilds
  const expandedReels: number[] = [];
  for (let r = 0; r < REELS; r++) if (grid[r].includes('WILD')) expandedReels.push(r);

  // Cangaceiro Raid (does not consume an extra spin)
  let raidReels: number[] = [];
  if (forceRaid || rng.next() < cfg.raidChance) {
    const candidates = [1, 2, 3, 4].filter((r) => !expandedReels.includes(r));
    if (candidates.length) {
      const n = Math.min(candidates.length, pickWeighted<number>(rng, cfg.raidReelCountWeights));
      raidReels = sample(rng, candidates, n).sort((a, b) => a - b);
    }
  }

  const finalGrid = cloneGrid(grid);
  for (const r of [...expandedReels, ...raidReels]) for (let row = 0; row < ROWS; row++) finalGrid[r][row] = 'WILD';

  const wins = evaluateLines(finalGrid, lineBet);
  const multiplierBefore = state.multiplier;
  let qualifying = false;
  for (const w of wins) {
    const applies = cfg.multiplierAppliesTo === 'allWins' || w.withWild;
    if (w.withWild) qualifying = true;
    w.multiplier = applies ? multiplierBefore : 1;
    w.pay = w.basePay * w.multiplier;
  }
  let spinWin = wins.reduce((s, w) => s + w.pay, 0);
  let capped = false;
  if (spinWin >= remainingCap) {
    spinWin = Math.max(0, remainingCap);
    capped = true;
  }
  const multiplierAfter = qualifying ? Math.min(cfg.multiplierCap, multiplierBefore + cfg.multiplierStep) : multiplierBefore;

  // Retrigger: posters counted on the landed grid
  const scatters = countSymbol(grid, 'WANT').length;
  let retriggerSpins = 0;
  if (scatters >= cfg.retriggerMinScatters && !capped) {
    retriggerSpins = Math.max(0, Math.min(cfg.retriggerSpins, cfg.maxTotalSpins - state.spinsTotal));
  }

  const next: GreatEscapeState = {
    spinsTotal: state.spinsTotal + retriggerSpins,
    spinsLeft: capped ? 0 : state.spinsLeft - 1 + retriggerSpins,
    spinsPlayed: state.spinsPlayed + 1,
    multiplier: multiplierAfter,
    totalWin: state.totalWin + spinWin,
    retriggers: state.retriggers + (retriggerSpins > 0 ? 1 : 0),
    lastGrid: finalGrid,
  };
  return {
    state: next,
    result: {
      spinNumber: next.spinsPlayed,
      grid,
      expandedReels,
      raidReels,
      finalGrid,
      lineWins: wins,
      multiplierBefore,
      multiplierAfter,
      qualifying,
      spinWin,
      scatters,
      retriggerSpins,
      spinsLeft: next.spinsLeft,
      spinsTotal: next.spinsTotal,
      totalWin: next.totalWin,
      capped,
    },
  };
}
