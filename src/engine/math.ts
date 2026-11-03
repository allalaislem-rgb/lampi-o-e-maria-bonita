/**
 * Math Engine – reel generation, payline evaluation, scatter counting.
 * Pure functions: no state, no I/O, no presentation concerns.
 *
 * Grid convention: grid[reel][row], reel 0..4 left→right, row 0..2 top→bottom.
 */
import { PAYLINES, REELS, ROWS, SCATTERS, SYMBOLS, type ReelWeights, type SymbolId } from '../config/gameConfig';
import { pickWeighted, type Rng } from './rng';

export type Grid = SymbolId[][];
export type Pos = [reel: number, row: number];

export interface LineWin {
  line: number; // 0-based payline index
  symbol: SymbolId; // paying symbol (WILD if pure-wild line)
  count: number;
  positions: Pos[];
  /** Base pay in cents (line bet × pay), before any feature multiplier. */
  basePay: number;
  multiplier: number;
  pay: number; // cents after multiplier
  /** true if any substituting / expanded wild is part of the win. */
  withWild: boolean;
}

/** Generate a 5×3 grid from per-reel weights. At most one of each scatter per reel. */
export function generateGrid(rng: Rng, weights: ReelWeights): Grid {
  const grid: Grid = [];
  for (let r = 0; r < REELS; r++) {
    const col: SymbolId[] = [];
    const w = { ...weights[r] };
    for (let row = 0; row < ROWS; row++) {
      const s = pickWeighted<SymbolId>(rng, w);
      col.push(s);
      if (SCATTERS.includes(s)) w[s] = 0; // one per reel
    }
    grid.push(col);
  }
  return grid;
}

export function cloneGrid(g: Grid): Grid {
  return g.map((c) => c.slice());
}

const isWild = (s: SymbolId) => s === 'WILD';
const isScatter = (s: SymbolId) => SCATTERS.includes(s);

/**
 * Evaluate one payline left→right.
 * Wild substitutes for every regular symbol (not scatters). If a run of leading wilds
 * pays more on its own than the substituted symbol run, the wild pay is used.
 */
export function evaluateLine(grid: Grid, lineIdx: number, lineBet: number): LineWin | null {
  const rows = PAYLINES[lineIdx];
  const syms = rows.map((row, reel) => grid[reel][row]);

  // leading wild run
  let wildRun = 0;
  while (wildRun < REELS && isWild(syms[wildRun])) wildRun++;

  // substituted symbol run
  let target: SymbolId | null = null;
  let count = 0;
  for (let i = 0; i < REELS; i++) {
    const s = syms[i];
    if (isScatter(s)) break;
    if (isWild(s)) {
      count++;
      continue;
    }
    if (target === null) {
      target = s;
      count++;
      continue;
    }
    if (s === target) count++;
    else break;
  }

  const wildPay = wildRun >= 3 ? SYMBOLS.WILD.pays![wildRun as 3 | 4 | 5] : 0;
  const symPay = target && count >= 3 ? SYMBOLS[target].pays![count as 3 | 4 | 5] : 0;
  if (!wildPay && !symPay) return null;

  const useWild = wildPay >= symPay;
  const n = useWild ? wildRun : count;
  const positions: Pos[] = [];
  for (let i = 0; i < n; i++) positions.push([i, rows[i]]);
  const base = (useWild ? wildPay : symPay) * lineBet;
  return {
    line: lineIdx,
    symbol: useWild ? 'WILD' : (target as SymbolId),
    count: n,
    positions,
    basePay: base,
    multiplier: 1,
    pay: base,
    withWild: positions.some(([r, row]) => isWild(grid[r][row])),
  };
}

export function evaluateLines(grid: Grid, lineBet: number): LineWin[] {
  const wins: LineWin[] = [];
  for (let i = 0; i < PAYLINES.length; i++) {
    const w = evaluateLine(grid, i, lineBet);
    if (w) wins.push(w);
  }
  return wins;
}

export function countSymbol(grid: Grid, s: SymbolId): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < grid.length; r++) for (let row = 0; row < grid[r].length; row++) if (grid[r][row] === s) out.push([r, row]);
  return out;
}

export function lineBetFor(totalBet: number): number {
  if (totalBet % PAYLINES.length !== 0) throw new Error(`Total bet ${totalBet} must be divisible by ${PAYLINES.length}`);
  return totalBet / PAYLINES.length;
}

export function sumPays(wins: { pay: number }[]): number {
  return wins.reduce((s, w) => s + w.pay, 0);
}
