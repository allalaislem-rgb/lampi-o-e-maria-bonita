/**
 * Last Stand Module – Hold & Respin on a dedicated 5×3 grid (reusable engine).
 *
 * - starts with 3 respins; landed gold symbols lock;
 * - every respin that lands at least one new symbol resets the counter to 3,
 *   otherwise one respin is consumed;
 * - multiplier symbols (2×/3×/5×/10×) add up and multiply the collected coins;
 * - Lampião's Emblem upgrades every locked multiplier one tier, or awards extra
 *   gold positions;
 * - filling all 15 positions awards the Grand Treasure;
 * - ends when respins run out, the grid is full, or the max-win cap is reached.
 */
import type { GameConfig } from '../../config/gameConfig';
import { pickWeighted, pickWeightedList, sample, type Rng } from '../rng';

export const LS_CELLS = 15;
export type LSCell =
  | { kind: 'coin'; value: number } // × total bet
  | { kind: 'mult'; value: number }
  | { kind: 'emblem'; value: number; effect: 'upgrade' | 'positions' };

export interface LastStandState {
  cells: (LSCell | null)[]; // index = reel * 3 + row
  respinsLeft: number;
  respinsPlayed: number;
  ended: boolean;
  full: boolean;
  capped: boolean;
}

export interface EmblemEffectResult {
  index: number;
  effect: 'upgrade' | 'positions';
  upgraded: { index: number; from: number; to: number }[];
  added: { index: number; cell: LSCell }[];
}

export interface RespinResult {
  respinNumber: number;
  landed: { index: number; cell: LSCell }[];
  emblemEffects: EmblemEffectResult[];
  respinsLeft: number;
  cells: (LSCell | null)[];
  coinSum: number;
  multSum: number;
  award: number; // cents, running (capped)
  full: boolean;
  grandAwarded: boolean;
  capped: boolean;
  ended: boolean;
}

export type LSCfg = GameConfig['lastStand'];

function coin(rng: Rng, cfg: LSCfg): LSCell {
  return { kind: 'coin', value: pickWeightedList(rng, cfg.coinValues) };
}

function randomSymbol(rng: Rng, cfg: LSCfg): LSCell {
  const kind = pickWeighted<'coin' | 'mult' | 'emblem'>(rng, cfg.symbolWeights);
  if (kind === 'mult') return { kind: 'mult', value: pickWeightedList(rng, cfg.multiplierValues) };
  if (kind === 'emblem') return { kind: 'emblem', value: pickWeightedList(rng, cfg.coinValues), effect: pickWeighted<'upgrade' | 'positions'>(rng, cfg.emblemEffects) };
  return coin(rng, cfg);
}

/** Natural trigger: emblem positions become the initial gold coins. Bought: random positions. */
export function startLastStand(rng: Rng, cfg: LSCfg, initialPositions?: number[]): LastStandState {
  const cells: (LSCell | null)[] = Array(LS_CELLS).fill(null);
  let positions = initialPositions;
  if (!positions || positions.length < 3) {
    const n = pickWeighted<number>(rng, cfg.boughtInitialCount);
    positions = sample(rng, [...Array(LS_CELLS).keys()], n);
  }
  for (const p of positions) cells[p] = coin(rng, cfg);
  return { cells, respinsLeft: cfg.initialRespins, respinsPlayed: 0, ended: false, full: false, capped: false };
}

export function totals(cells: (LSCell | null)[]) {
  let coinSum = 0;
  let multSum = 0;
  for (const c of cells) {
    if (!c) continue;
    if (c.kind === 'mult') multSum += c.value;
    else coinSum += c.value;
  }
  return { coinSum, multSum };
}

export function lastStandAward(cells: (LSCell | null)[], cfg: LSCfg, totalBet: number, cap: number): { award: number; capped: boolean; grand: boolean } {
  const { coinSum, multSum } = totals(cells);
  const full = cells.every((c) => c !== null);
  let award = coinSum * Math.max(1, multSum) * totalBet;
  if (full) award += cfg.grandTreasure * totalBet;
  const capped = award >= cap;
  return { award: Math.min(award, cap), capped, grand: full };
}

export function playRespin(rng: Rng, state: LastStandState, cfg: LSCfg, totalBet: number, cap: number): { state: LastStandState; result: RespinResult } {
  if (state.ended) throw new Error('Last Stand has ended');
  const cells = state.cells.slice();
  const landed: { index: number; cell: LSCell }[] = [];
  for (let i = 0; i < LS_CELLS; i++) {
    if (cells[i]) continue;
    if (rng.next() < cfg.landChance) {
      const c = randomSymbol(rng, cfg);
      cells[i] = c;
      landed.push({ index: i, cell: c });
    }
  }

  // Resolve Lampião's Emblems in grid order
  const emblemEffects: EmblemEffectResult[] = [];
  for (const l of landed) {
    if (l.cell.kind !== 'emblem') continue;
    const tiers = cfg.multiplierTiers;
    const locked = cells.map((c, i) => ({ c, i })).filter((x) => x.c?.kind === 'mult' && tiers.indexOf(x.c.value) < tiers.length - 1);
    let effect = l.cell.effect;
    if (effect === 'upgrade' && locked.length === 0) effect = 'positions';
    (l.cell as { effect: string }).effect = effect;
    const res: EmblemEffectResult = { index: l.index, effect, upgraded: [], added: [] };
    if (effect === 'upgrade') {
      for (const { c, i } of locked) {
        const from = (c as { value: number }).value;
        const to = tiers[tiers.indexOf(from) + 1];
        cells[i] = { kind: 'mult', value: to };
        res.upgraded.push({ index: i, from, to });
      }
    } else {
      const empty = cells.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
      const n = Math.min(empty.length, pickWeighted<number>(rng, cfg.emblemPositions));
      for (const i of sample(rng, empty, n)) {
        const c = coin(rng, cfg);
        cells[i] = c;
        res.added.push({ index: i, cell: c });
      }
    }
    emblemEffects.push(res);
  }

  const gotNew = landed.length > 0;
  const respinsLeft = gotNew ? cfg.initialRespins : state.respinsLeft - 1;
  const { award, capped, grand } = lastStandAward(cells, cfg, totalBet, cap);
  const full = cells.every((c) => c !== null);
  const ended = respinsLeft <= 0 || full || capped;
  const { coinSum, multSum } = totals(cells);
  const next: LastStandState = { cells, respinsLeft: ended ? 0 : respinsLeft, respinsPlayed: state.respinsPlayed + 1, ended, full, capped };
  return {
    state: next,
    result: {
      respinNumber: next.respinsPlayed,
      landed,
      emblemEffects,
      respinsLeft: next.respinsLeft,
      cells,
      coinSum,
      multSum,
      award,
      full,
      grandAwarded: grand,
      capped,
      ended,
    },
  };
}
