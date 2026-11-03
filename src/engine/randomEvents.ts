/**
 * Random Event Manager – Lampião's Arrival and The Cangaceiros' Raid.
 * Events are RNG-controlled and modify the grid BEFORE win evaluation, so they
 * change the real outcome (their contribution is part of base-game RTP).
 */
import { LOW, REELS, ROWS, SCATTERS, type GameConfig, type SymbolId } from '../config/gameConfig';
import { cloneGrid, type Grid, type Pos } from './math';
import { pickWeighted, randInt, sample, type Rng } from './rng';

export type RandomEvent =
  | { type: 'arrival'; reels: number[] }
  | { type: 'raid'; mode: 'cluster' | 'reel' | 'multi'; target: SymbolId; reels: number[]; cells: Pos[] };

export type ForcedEvent = 'arrival' | 'raid' | null;

export interface EventResult {
  event: RandomEvent | null;
  grid: Grid;
}

export function applyArrival(grid: Grid, reels: number[]): Grid {
  const g = cloneGrid(grid);
  for (const r of reels) for (let row = 0; row < ROWS; row++) if (!SCATTERS.includes(g[r][row])) g[r][row] = 'WILD';
  return g;
}

export function rollRandomEvent(rng: Rng, grid: Grid, cfg: GameConfig['randomEvents'], forced: ForcedEvent = null): EventResult {
  const roll = rng.next();
  let type: ForcedEvent = forced;
  if (!type) {
    if (roll < cfg.arrivalChance) type = 'arrival';
    else if (roll < cfg.arrivalChance + cfg.raidChance) type = 'raid';
  }
  if (type === 'arrival') {
    const n = pickWeighted<number>(rng, cfg.arrivalReelCountWeights);
    const reels = sample(rng, [...cfg.arrivalReels], n).sort((a, b) => a - b);
    return { event: { type: 'arrival', reels }, grid: applyArrival(grid, reels) };
  }
  if (type === 'raid') {
    const res = raid(rng, grid, cfg);
    if (res) return res;
  }
  return { event: null, grid };
}

function lowCells(grid: Grid, reels: number[]): Pos[] {
  const out: Pos[] = [];
  for (const r of reels) for (let row = 0; row < ROWS; row++) if (LOW.includes(grid[r][row])) out.push([r, row]);
  return out;
}

function raid(rng: Rng, grid: Grid, cfg: GameConfig['randomEvents']): EventResult | null {
  const allReels = [0, 1, 2, 3, 4];
  if (lowCells(grid, allReels).length < 2) return null; // nothing meaningful to transform
  let mode = pickWeighted<'cluster' | 'reel' | 'multi'>(rng, cfg.raidModeWeights);
  const target = pickWeighted<SymbolId>(rng, cfg.raidTargetWeights);
  let cells: Pos[] = [];
  let reels: number[] = [];

  if (mode === 'cluster') {
    // two or more low-paying symbols of the same kind transform into the same premium symbol
    const counts = new Map<SymbolId, Pos[]>();
    for (const p of lowCells(grid, allReels)) {
      const s = grid[p[0]][p[1]];
      if (!counts.has(s)) counts.set(s, []);
      counts.get(s)!.push(p);
    }
    const groups = [...counts.values()].filter((g) => g.length >= 2);
    if (groups.length) {
      cells = groups[randInt(rng, groups.length)];
      reels = [...new Set(cells.map((c) => c[0]))];
    } else mode = 'reel';
  }
  if (mode === 'reel' || mode === 'multi') {
    const candidates = allReels.filter((r) => lowCells(grid, [r]).length > 0);
    const n = mode === 'multi' ? Math.min(candidates.length, 2 + randInt(rng, 2)) : 1;
    reels = sample(rng, candidates, n).sort((a, b) => a - b);
    cells = lowCells(grid, reels);
  }
  if (!cells.length) return null;
  const g = cloneGrid(grid);
  for (const [r, row] of cells) g[r][row] = target;
  return { event: { type: 'raid', mode, target, reels, cells }, grid: g };
}

export const ALL_REELS = Array.from({ length: REELS }, (_, i) => i);
