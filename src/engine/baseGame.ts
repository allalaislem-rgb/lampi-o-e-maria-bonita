/**
 * Base Game Engine – one paid spin: reels → random event → wins → bonus triggers.
 */
import { BASE_REEL_WEIGHTS, REELS, ROWS, SYMBOLS, type FeatureId, type GameConfig, type SymbolId } from '../config/gameConfig';
import { countSymbol, evaluateLines, generateGrid, lineBetFor, type Grid, type LineWin, type Pos } from './math';
import { rollRandomEvent, type ForcedEvent, type RandomEvent } from './randomEvents';
import { sample, type Rng } from './rng';

export interface BaseSpinOutcome {
  grid: Grid; // landed grid
  event: RandomEvent | null;
  finalGrid: Grid; // after random event (evaluated)
  lineWins: LineWin[];
  win: number; // cents
  scatters: Record<'WANT' | 'MAP' | 'EMBL', Pos[]>;
  triggers: FeatureId[];
}

/** QA/dev only: forced outcomes. Rejected by the server unless config.dev.allowForcedOutcomes. */
export interface ForceOptions {
  features?: FeatureId[];
  scatterCount?: number;
  event?: ForcedEvent;
}

const SCATTER_OF: Record<FeatureId, SymbolId> = { greatEscape: 'WANT', hideout: 'MAP', lastStand: 'EMBL' };

/** Inject scatters into distinct reels (dev forcing only). */
function injectScatters(rng: Rng, grid: Grid, symbol: SymbolId, n: number, taken: Set<string>) {
  const reels = sample(rng, [...Array(REELS).keys()], Math.min(REELS, n));
  for (const r of reels) {
    // remove existing scatter of this type on the reel, then place
    for (let row = 0; row < ROWS; row++) if (grid[r][row] === symbol) grid[r][row] = 'CACT';
    const rows = [0, 1, 2].filter((row) => !taken.has(`${r},${row}`));
    const row = rows[Math.floor(rng.next() * rows.length)] ?? 1;
    grid[r][row] = symbol;
    taken.add(`${r},${row}`);
  }
}

export function playBaseSpin(rng: Rng, cfg: GameConfig, totalBet: number, force?: ForceOptions): BaseSpinOutcome {
  const lineBet = lineBetFor(totalBet);
  const grid = generateGrid(rng, BASE_REEL_WEIGHTS);
  if (force?.features?.length) {
    const taken = new Set<string>();
    for (const f of force.features) injectScatters(rng, grid, SCATTER_OF[f], force.scatterCount ?? 3, taken);
  }
  const { event, grid: finalGrid } = rollRandomEvent(rng, grid, cfg.randomEvents, force?.event ?? null);
  const lineWins = evaluateLines(finalGrid, lineBet);
  const win = lineWins.reduce((s, w) => s + w.pay, 0);
  const scatters = {
    WANT: countSymbol(finalGrid, 'WANT'),
    MAP: countSymbol(finalGrid, 'MAP'),
    EMBL: countSymbol(finalGrid, 'EMBL'),
  };
  const triggers: FeatureId[] = [];
  if (scatters.WANT.length >= 3) triggers.push('greatEscape');
  if (scatters.MAP.length >= 3) triggers.push('hideout');
  if (scatters.EMBL.length >= 3) triggers.push('lastStand');
  return { grid, event, finalGrid, lineWins, win, scatters, triggers };
}

export const SYMBOL_LIST = Object.values(SYMBOLS);
