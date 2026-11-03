import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../src/config/gameConfig';
import { playFreeSpin, startGreatEscape } from '../src/engine/features/greatEscape';
import { generateBoard, pickChest, startHideout, type ChestPrize, type HideoutState } from '../src/engine/features/hideout';
import { lastStandAward, playRespin, startLastStand, type LSCell } from '../src/engine/features/lastStand';
import { DevRng, ScriptedRng } from '../src/engine/rng';

const ge = GAME_CONFIG.greatEscape;
const ho = GAME_CONFIG.hideout;
const ls = GAME_CONFIG.lastStand;
const BIG = 1e12;

describe('The Great Escape', () => {
  it('awards 10/12/15 spins for 3/4/5 posters', () => {
    expect(startGreatEscape(ge, 3).spinsLeft).toBe(10);
    expect(startGreatEscape(ge, 4).spinsLeft).toBe(12);
    expect(startGreatEscape(ge, 5).spinsLeft).toBe(15);
    expect(startGreatEscape(ge, 3).multiplier).toBe(1);
  });

  it('runs to completion, multiplier never exceeds cap and only grows on qualifying wins', () => {
    const rng = new DevRng(11);
    for (let run = 0; run < 300; run++) {
      let s = startGreatEscape(ge, 3);
      let total = 0;
      while (s.spinsLeft > 0) {
        const { state, result } = playFreeSpin(rng, s, ge, 4, BIG);
        expect(result.multiplierAfter).toBeLessThanOrEqual(ge.multiplierCap);
        if (result.qualifying) expect(result.multiplierAfter).toBe(Math.min(ge.multiplierCap, result.multiplierBefore + 1));
        else expect(result.multiplierAfter).toBe(result.multiplierBefore);
        // expanded reels are fully wild in the evaluated grid
        for (const r of [...result.expandedReels, ...result.raidReels]) expect(result.finalGrid[r]).toEqual(['WILD', 'WILD', 'WILD']);
        // multiplier applies to wild wins only (config: wildWins)
        for (const w of result.lineWins) expect(w.pay).toBe(w.basePay * (w.withWild ? result.multiplierBefore : 1));
        total += result.spinWin;
        s = state;
      }
      expect(s.totalWin).toBe(total);
      expect(s.spinsTotal).toBeLessThanOrEqual(ge.maxTotalSpins);
    }
  });

  it('retriggers +5 spins on 3+ posters and keeps the multiplier', () => {
    const rng = new DevRng(1234);
    let found = false;
    for (let run = 0; run < 3000 && !found; run++) {
      let s = { ...startGreatEscape(ge, 3), multiplier: 4 };
      const { state, result } = playFreeSpin(rng, s, ge, 4, BIG);
      if (result.scatters >= 3) {
        found = true;
        expect(result.retriggerSpins).toBe(5);
        expect(state.spinsLeft).toBe(s.spinsLeft - 1 + 5);
        expect(state.multiplier).toBeGreaterThanOrEqual(4);
      }
      s = state;
    }
    expect(found).toBe(true);
  });

  it('Cangaceiro Raid turns reels wild without consuming an extra spin', () => {
    const rng = new DevRng(8);
    const s = startGreatEscape(ge, 3);
    const { state, result } = playFreeSpin(rng, s, ge, 4, BIG, true);
    expect(result.raidReels.length + result.expandedReels.length).toBeGreaterThan(0);
    expect(state.spinsLeft).toBe(s.spinsLeft - 1 + result.retriggerSpins);
  });

  it('respects the max-win cap', () => {
    const rng = new DevRng(8);
    const s = startGreatEscape(ge, 3);
    const { state, result } = playFreeSpin(rng, s, ge, 4, 0, true);
    expect(result.spinWin).toBe(0);
    if (result.lineWins.length) {
      expect(result.capped).toBe(true);
      expect(state.spinsLeft).toBe(0);
    }
  });
});

function boardState(board: ChestPrize[]): HideoutState {
  return { ...startHideout(new DevRng(1), ho), board };
}

describe('The Hideout', () => {
  it('generates 12 chests respecting max counts', () => {
    const rng = new DevRng(2);
    for (let i = 0; i < 500; i++) {
      const b = generateBoard(rng, ho);
      expect(b).toHaveLength(12);
      expect(b.filter((p) => p.type === 'treasure').length).toBeLessThanOrEqual(1);
      expect(b.filter((p) => p.type === 'medallion').length).toBeLessThanOrEqual(1);
      expect(b.filter((p) => p.type === 'extraPick').length).toBeLessThanOrEqual(2);
    }
  });

  it('3 picks, coins + multiplier, prizes never lost', () => {
    const board: ChestPrize[] = [
      { type: 'coins', value: 10 }, { type: 'multiplier', value: 2 }, { type: 'empty' },
      ...Array(9).fill({ type: 'empty' }),
    ];
    let s = boardState(board);
    let r = pickChest(s, 0, ho, 100, BIG);
    expect(r.result.award).toBe(1000);
    s = r.state;
    r = pickChest(s, 1, ho, 100, BIG);
    expect(r.result.multiplier).toBe(3);
    expect(r.result.award).toBe(3000);
    s = r.state;
    r = pickChest(s, 2, ho, 100, BIG);
    expect(r.result.award).toBe(3000); // empty chest does not reduce
    expect(r.result.ended).toBe(true);
    expect(r.result.reveal).toHaveLength(12);
  });

  it('extra selection grants another pick', () => {
    const board: ChestPrize[] = [{ type: 'extraPick' }, ...Array(11).fill({ type: 'coins', value: 1 })];
    let s = boardState(board);
    s = pickChest(s, 0, ho, 100, BIG).state;
    expect(s.picksLeft).toBe(3);
    for (let i = 1; i <= 3; i++) s = pickChest(s, i, ho, 100, BIG).state;
    expect(s.ended).toBe(true);
    expect(s.picksUsed).toBe(4);
  });

  it("Couple's Fortune when Lampião's treasure and Maria's medallion are both collected", () => {
    const board: ChestPrize[] = [{ type: 'treasure', value: ho.prizes.find((p) => p.type === 'treasure')!.value! }, { type: 'medallion' }, ...Array(10).fill({ type: 'empty' })];
    let s = boardState(board);
    s = pickChest(s, 0, ho, 100, BIG).state;
    const r = pickChest(s, 1, ho, 100, BIG);
    expect(r.result.couplesFortune).toBe(true);
    expect(r.state.multiplier).toBe(2);
    expect(r.state.coinTotal).toBe(60 + ho.couplesFortune);
  });

  it('rejects invalid / duplicate picks', () => {
    let s = boardState(Array(12).fill({ type: 'empty' }));
    s = pickChest(s, 0, ho, 100, BIG).state;
    expect(() => pickChest(s, 0, ho, 100, BIG)).toThrow();
    expect(() => pickChest(s, 12, ho, 100, BIG)).toThrow();
    expect(() => pickChest(s, -1, ho, 100, BIG)).toThrow();
  });
});

describe('The Last Stand', () => {
  it('starts with 3 respins and locked initial golds', () => {
    const s = startLastStand(new DevRng(4), ls, [0, 7, 14]);
    expect(s.respinsLeft).toBe(3);
    expect(s.cells.filter(Boolean)).toHaveLength(3);
    expect(s.cells[0]?.kind).toBe('coin');
  });

  it('no landing consumes a respin; a landing resets to 3; ends at 0', () => {
    let s = startLastStand(new DevRng(4), ls, [0, 1, 2]);
    const never = new ScriptedRng([0.999]); // rng.next() ≥ landChance → nothing lands
    s = playRespin(never, s, ls, 100, BIG).state;
    expect(s.respinsLeft).toBe(2);
    s = playRespin(never, s, ls, 100, BIG).state;
    expect(s.respinsLeft).toBe(1);
    // land exactly one coin: first empty cell lands (0.0), rest miss
    const one = new ScriptedRng([0.0, 0.0, 0.0, ...Array(11).fill(0.999)]);
    const r = playRespin(one, s, ls, 100, BIG);
    expect(r.result.landed.length).toBeGreaterThan(0);
    expect(r.state.respinsLeft).toBe(3);
    s = r.state;
    for (let i = 0; i < 3; i++) s = playRespin(never, s, ls, 100, BIG).state;
    expect(s.ended).toBe(true);
    expect(s.respinsLeft).toBe(0);
  });

  it('locked symbols persist across respins', () => {
    const rng = new DevRng(77);
    let s = startLastStand(rng, ls, [3, 4, 5]);
    while (!s.ended) {
      const prev = s.cells;
      s = playRespin(rng, s, ls, 100, BIG).state;
      prev.forEach((c, i) => {
        if (c && c.kind === 'coin') expect(s.cells[i]).toEqual(c);
        if (c) expect(s.cells[i]).not.toBeNull();
      });
    }
  });

  it('multiplier symbols add up and multiply the coin total; full grid adds Grand Treasure', () => {
    const coins: LSCell[] = Array(13).fill({ kind: 'coin', value: 2 });
    const cells: (LSCell | null)[] = [...coins, { kind: 'mult', value: 2 }, { kind: 'mult', value: 3 }];
    const { award, grand } = lastStandAward(cells, ls, 100, BIG);
    expect(grand).toBe(true);
    expect(award).toBe(13 * 2 * 5 * 100 + ls.grandTreasure * 100);
    const partial = cells.slice();
    partial[0] = null;
    expect(lastStandAward(partial, ls, 100, BIG).award).toBe(12 * 2 * 5 * 100);
    expect(lastStandAward(partial, ls, 100, 500).award).toBe(500); // capped
  });

  it("Lampião's Emblem upgrades multipliers one tier", () => {
    const s = startLastStand(new DevRng(1), ls, [0, 1, 2]);
    s.cells[3] = { kind: 'mult', value: 2 };
    s.cells[4] = { kind: 'mult', value: 5 };
    // Script: cells 5..14 roll; first empty (5) lands (0), kind roll → emblem (0.99), coin value (0), effect upgrade (0), rest miss
    const rng = new ScriptedRng([0.0, 0.99, 0.0, 0.0, ...Array(9).fill(0.999)]);
    const r = playRespin(rng, s, ls, 100, BIG);
    const em = r.result.emblemEffects[0];
    expect(em.effect).toBe('upgrade');
    expect(r.state.cells[3]).toEqual({ kind: 'mult', value: 3 });
    expect(r.state.cells[4]).toEqual({ kind: 'mult', value: 10 });
  });

  it('ends when the grid is full', () => {
    const s = startLastStand(new DevRng(1), ls, [0, 1, 2]);
    const r = playRespin(new ScriptedRng([0.0, 0.0, 0.0]), s, ls, 100, BIG);
    expect(r.state.full).toBe(true);
    expect(r.state.ended).toBe(true);
    expect(r.result.grandAwarded).toBe(true);
  });
});
