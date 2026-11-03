import { describe, expect, it } from 'vitest';
import { BASE_REEL_WEIGHTS, GAME_CONFIG, PAYLINES, SCATTERS, SYMBOLS, type SymbolId } from '../src/config/gameConfig';
import { playBaseSpin } from '../src/engine/baseGame';
import { countSymbol, evaluateLine, evaluateLines, generateGrid, lineBetFor, type Grid } from '../src/engine/math';
import { applyArrival, rollRandomEvent } from '../src/engine/randomEvents';
import { DevRng, pickWeighted } from '../src/engine/rng';

/** Build a grid from 3 row strings of 5 symbols (top→bottom). */
export function G(rows: SymbolId[][]): Grid {
  return [0, 1, 2, 3, 4].map((r) => [rows[0][r], rows[1][r], rows[2][r]]);
}
const F: SymbolId = 'CANT';

describe('RNG service', () => {
  it('is deterministic for a given seed and serialisable', () => {
    const a = new DevRng(42);
    const b = new DevRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    const st = a.getState();
    const v = a.next();
    a.setState(st);
    expect(a.next()).toBe(v);
  });
  it('values are in [0,1) and weighted pick respects zero weights', () => {
    const r = new DevRng(1);
    for (let i = 0; i < 5000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect(pickWeighted(r, { a: 1, b: 0 })).toBe('a');
    }
  });
});

describe('Reel generation', () => {
  it('produces 5×3 grids of known symbols with at most one scatter of each type per reel', () => {
    const rng = new DevRng(7);
    for (let i = 0; i < 3000; i++) {
      const g = generateGrid(rng, BASE_REEL_WEIGHTS);
      expect(g).toHaveLength(5);
      for (const col of g) {
        expect(col).toHaveLength(3);
        for (const s of col) expect(SYMBOLS[s]).toBeDefined();
        for (const sc of SCATTERS) expect(col.filter((s) => s === sc).length).toBeLessThanOrEqual(1);
      }
      expect(g[0]).not.toContain('WILD'); // no wild on reel 1 in base game
    }
  });
});

describe('Paylines', () => {
  it('has 25 unique lines of 5 valid rows', () => {
    expect(PAYLINES).toHaveLength(25);
    expect(new Set(PAYLINES.map((l) => l.join())).size).toBe(25);
    for (const l of PAYLINES) {
      expect(l).toHaveLength(5);
      for (const r of l) expect([0, 1, 2]).toContain(r);
    }
  });
  it('line bet = total / 25 and rejects non-divisible bets', () => {
    expect(lineBetFor(100)).toBe(4);
    expect(() => lineBetFor(101)).toThrow();
  });
  it('pays left-to-right 3/4/5 of a kind on the middle line', () => {
    const lb = 4;
    const g = G([
      [F, 'FACA', F, 'FACA', 'RIFL'],
      ['LAMP', 'LAMP', 'LAMP', 'LAMP', 'CACT'],
      ['RIFL', F, 'RIFL', F, F],
    ]);
    const w = evaluateLine(g, 0, lb)!;
    expect(w.symbol).toBe('LAMP');
    expect(w.count).toBe(4);
    expect(w.pay).toBe(SYMBOLS.LAMP.pays![4] * lb);
    expect(w.positions).toEqual([[0, 1], [1, 1], [2, 1], [3, 1]]);
  });
  it('does not pay right-to-left or interrupted runs', () => {
    const g = G([
      ['FACA', 'RIFL', 'FACA', 'RIFL', 'FACA'],
      ['HAT', 'REV', 'LAMP', 'LAMP', 'LAMP'],
      ['RIFL', 'FACA', 'RIFL', 'FACA', 'RIFL'],
    ]);
    expect(evaluateLine(g, 0, 4)).toBeNull();
  });
});

describe('Wild substitution', () => {
  it('wild substitutes for regular symbols', () => {
    const g = G([
      [F, F, F, 'RIFL', 'FACA'],
      ['HAT', 'WILD', 'HAT', 'WILD', 'REV'],
      ['RIFL', 'FACA', 'RIFL', F, 'RIFL'],
    ]);
    const w = evaluateLine(g, 0, 4)!;
    expect(w.symbol).toBe('HAT');
    expect(w.count).toBe(4);
    expect(w.withWild).toBe(true);
  });
  it('a leading wild run pays as wild when better', () => {
    const g = G([
      [F, F, 'RIFL', 'RIFL', 'FACA'],
      ['WILD', 'WILD', 'WILD', 'SANF', 'REV'],
      ['RIFL', 'FACA', F, F, 'RIFL'],
    ]);
    const w = evaluateLine(g, 0, 4)!;
    // WILD×3 = 60 vs SANF×4 = 75 → SANF wins
    expect(w.symbol).toBe('SANF');
    expect(w.count).toBe(4);
    const g2 = G([
      [F, F, 'RIFL', 'RIFL', 'FACA'],
      ['WILD', 'WILD', 'WILD', 'CACT', 'REV'],
      ['RIFL', 'FACA', F, F, 'RIFL'],
    ]);
    const w2 = evaluateLine(g2, 0, 4)!;
    expect(w2.symbol).toBe('WILD');
    expect(w2.count).toBe(3);
    expect(w2.pay).toBe(SYMBOLS.WILD.pays![3] * 4);
  });
  it('wild does not substitute for scatters and scatters break lines', () => {
    const g = G([
      [F, F, 'RIFL', 'RIFL', 'FACA'],
      ['WANT', 'WILD', 'WANT', 'WANT', 'REV'],
      ['RIFL', 'FACA', F, F, 'RIFL'],
    ]);
    expect(evaluateLine(g, 0, 4)).toBeNull();
  });
});

describe('Scatter triggers', () => {
  const blank = (): SymbolId[][] => [
    ['RIFL', 'FACA', 'CACT', 'CANT', 'RIFL'],
    ['FACA', 'CACT', 'CANT', 'RIFL', 'FACA'],
    ['CACT', 'CANT', 'RIFL', 'FACA', 'CACT'],
  ];
  it('counts scatters anywhere', () => {
    const rows = blank();
    rows[0][0] = 'WANT';
    rows[2][2] = 'WANT';
    rows[1][4] = 'WANT';
    expect(countSymbol(G(rows), 'WANT')).toHaveLength(3);
  });
  it('base spin forced triggers all three bonuses', () => {
    const rng = new DevRng(3);
    for (const f of ['greatEscape', 'hideout', 'lastStand'] as const) {
      const o = playBaseSpin(rng, GAME_CONFIG, 100, { features: [f] });
      expect(o.triggers).toContain(f);
    }
    const o = playBaseSpin(rng, GAME_CONFIG, 100, { features: ['hideout', 'lastStand'] });
    expect(o.triggers).toEqual(expect.arrayContaining(['hideout', 'lastStand']));
  });
  it('natural triggers happen over many spins', () => {
    const rng = new DevRng(99);
    const seen = new Set<string>();
    for (let i = 0; i < 20000 && seen.size < 3; i++) playBaseSpin(rng, GAME_CONFIG, 100).triggers.forEach((t) => seen.add(t));
    expect(seen.size).toBe(3);
  });
});

describe('Random events affect real outcomes', () => {
  it("Lampião's Arrival turns whole reels wild (keeping scatters) and changes the payout", () => {
    const g = G([
      ['LAMP', 'RIFL', 'LAMP', 'FACA', 'CACT'],
      ['LAMP', 'CANT', 'CACT', 'RIFL', 'FACA'],
      ['CACT', 'WANT', 'FACA', 'CANT', 'RIFL'],
    ]);
    const before = evaluateLines(g, 4).reduce((s, w) => s + w.pay, 0);
    const after = applyArrival(g, [1]);
    expect(after[1]).toEqual(['WILD', 'WILD', 'WANT']);
    expect(evaluateLines(after, 4).reduce((s, w) => s + w.pay, 0)).toBeGreaterThan(before);
  });
  it('Raid transforms low symbols into a single premium symbol', () => {
    const rng = new DevRng(5);
    for (let i = 0; i < 200; i++) {
      const g = generateGrid(rng, BASE_REEL_WEIGHTS);
      const { event, grid } = rollRandomEvent(rng, g, GAME_CONFIG.randomEvents, 'raid');
      if (!event) continue;
      expect(event.type).toBe('raid');
      if (event.type !== 'raid') continue;
      expect(['LAMP', 'MARIA', 'HAT', 'CART', 'REV', 'SANF']).toContain(event.target);
      expect(event.cells.length).toBeGreaterThan(0);
      for (const [r, row] of event.cells) {
        expect(['RIFL', 'FACA', 'CACT', 'CANT']).toContain(g[r][row]);
        expect(grid[r][row]).toBe(event.target);
      }
    }
  });
});
