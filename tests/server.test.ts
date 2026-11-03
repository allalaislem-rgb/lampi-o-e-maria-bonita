import { describe, expect, it } from 'vitest';
import { GAME_CONFIG, type FeatureId } from '../src/config/gameConfig';
import { MemoryStorage, GameServer, type RoundSummary } from '../src/engine/server';
import { DevRng } from '../src/engine/rng';

let n = 0;
const id = () => `t${n++}`;

function newServer(seed = 1, storage = new MemoryStorage(), balance = 100_000) {
  return new GameServer({ rng: new DevRng(seed), storage, startingBalance: balance });
}

/** Play out whatever feature is active, returning the settlement. */
function finishFeature(s: GameServer): RoundSummary {
  for (let guard = 0; guard < 1000; guard++) {
    const snap = s.getSnapshot();
    if (snap.phase === 'GREAT_ESCAPE') {
      const r = s.freeSpin(id());
      if (r.settled) return r.settled;
    } else if (snap.phase === 'HIDEOUT') {
      const f = snap.feature as Extract<typeof snap.feature, { feature: 'hideout' }>;
      const idx = f.chests.findIndex((c) => !c.opened);
      const r = s.pick(id(), idx);
      if (r.settled) return r.settled;
    } else if (snap.phase === 'LAST_STAND') {
      const r = s.respin(id());
      if (r.settled) return r.settled;
    } else throw new Error('No feature active: ' + snap.phase);
  }
  throw new Error('feature did not end');
}

describe('Wallet & balance updates', () => {
  it('debits the stake and credits the win exactly once per base spin', () => {
    const s = newServer(3);
    let bal = s.getSnapshot().balance;
    for (let i = 0; i < 300; i++) {
      if (s.getSnapshot().phase !== 'IDLE') {
        const st = finishFeature(s);
        bal += st.totalWin;
        expect(s.getSnapshot().balance).toBe(bal);
        continue;
      }
      const bet = s.getSnapshot().bet;
      const r = s.spin(id());
      bal -= bet;
      if (r.settled) {
        bal += r.settled.totalWin;
        expect(r.settled.totalWin).toBe(r.outcome.win);
      }
      expect(r.snapshot.balance).toBe(bal);
    }
  });

  it('rejects spins with insufficient balance', () => {
    const s = newServer(1, new MemoryStorage(), 50);
    expect(() => s.spin(id())).toThrow(/Insufficient/);
    expect(s.getSnapshot().phase).toBe('IDLE');
  });

  it('duplicate requestIds do not double-charge or double-pay', () => {
    const s = newServer(4);
    const before = s.getSnapshot().balance;
    const a = s.spin('same');
    const b = s.spin('same');
    expect(b).toBe(a);
    if (a.settled) expect(s.getSnapshot().balance).toBe(before - a.bet + a.settled.totalWin);
    expect(s.wallet.transactions.filter((t) => t.kind === 'stake')).toHaveLength(1);
  });
});

describe('Bonus Buy', () => {
  for (const f of ['greatEscape', 'hideout', 'lastStand'] as FeatureId[]) {
    it(`${f}: deducts the configured price immediately, enters the bonus and returns to base`, () => {
      const s = newServer(5);
      const snap = s.getSnapshot();
      const price = GAME_CONFIG.bonusBuy.prices[f] * snap.bet;
      expect(snap.buyPrices[f]).toBe(price);
      const r = s.buyFeature(id(), f);
      expect(r.price).toBe(price);
      expect(r.snapshot.balance).toBe(snap.balance - price);
      expect(r.snapshot.phase).not.toBe('IDLE');
      expect(r.snapshot.feature?.feature).toBe(f);
      const settled = finishFeature(s);
      expect(settled.type).toBe('buy');
      expect(settled.cost).toBe(price);
      expect(s.getSnapshot().phase).toBe('IDLE');
      expect(s.getSnapshot().balance).toBe(snap.balance - price + settled.totalWin);
    });
  }

  it('prevents duplicate purchases while a bonus is active', () => {
    const s = newServer(6);
    s.buyFeature(id(), 'hideout');
    expect(() => s.buyFeature(id(), 'hideout')).toThrow(/not allowed/);
    expect(s.wallet.transactions.filter((t) => t.kind === 'buy')).toHaveLength(1);
  });

  it('validates balance and max bet', () => {
    const s = newServer(7, new MemoryStorage(), 1000);
    expect(() => s.buyFeature(id(), 'lastStand')).toThrow(/Insufficient/);
    expect(s.getSnapshot().balance).toBe(1000);
    const rich = newServer(7, new MemoryStorage(), 1e9);
    rich.setBet(GAME_CONFIG.betLevels.length - 1);
    expect(() => rich.buyFeature(id(), 'greatEscape')).toThrow(/Bet too high/);
  });
});

describe('Game-state transitions', () => {
  it('blocks actions that are invalid in the current phase', () => {
    const s = newServer(8);
    expect(() => s.freeSpin(id())).toThrow();
    expect(() => s.pick(id(), 0)).toThrow();
    expect(() => s.respin(id())).toThrow();
    expect(() => s.chooseFeature(id(), 'hideout')).toThrow();
    s.buyFeature(id(), 'lastStand');
    expect(() => s.spin(id())).toThrow();
    expect(() => s.setBet(0)).toThrow();
    expect(() => s.freeSpin(id())).toThrow();
  });

  it('single natural trigger enters the feature directly; base win is paid with the feature', () => {
    const s = newServer(9);
    const r = s.spin(id(), { features: ['greatEscape'] });
    expect(r.featureStarted).toBe('greatEscape');
    expect(r.settled).toBeNull();
    expect(r.snapshot.phase).toBe('GREAT_ESCAPE');
    const spins = (r.snapshot.feature as { spinsLeft: number }).spinsLeft;
    expect([10, 12, 15]).toContain(spins);
    const st = finishFeature(s);
    expect(st.baseWin).toBe(r.outcome.win);
    expect(st.totalWin).toBe(st.baseWin + st.featureWin);
  });

  it('natural Last Stand uses the landed emblem positions', () => {
    const s = newServer(10);
    const r = s.spin(id(), { features: ['lastStand'] });
    const f = r.snapshot.feature as { cells: unknown[] };
    for (const [reel, row] of r.outcome.scatters.EMBL) expect(f.cells[reel * 3 + row]).not.toBeNull();
  });

  it('simultaneous triggers → bonus choice; unselected feature is not carried over', () => {
    const s = newServer(11);
    const r = s.spin(id(), { features: ['hideout', 'lastStand'] });
    expect(r.snapshot.phase).toBe('BONUS_CHOICE');
    expect(r.pendingChoice).toEqual(expect.arrayContaining(['hideout', 'lastStand']));
    expect(() => s.chooseFeature(id(), 'greatEscape')).toThrow();
    const c = s.chooseFeature(id(), 'hideout');
    expect(c.snapshot.phase).toBe('HIDEOUT');
    finishFeature(s);
    expect(s.getSnapshot().phase).toBe('IDLE');
    expect(s.getSnapshot().pendingChoice).toBeNull();
  });

  it('forced outcomes are rejected when disabled in config', () => {
    const cfg = { ...GAME_CONFIG, dev: { allowForcedOutcomes: false } };
    const s = new GameServer({ config: cfg, rng: new DevRng(1), storage: new MemoryStorage() });
    expect(() => s.spin(id(), { features: ['hideout'] })).toThrow(/disabled/);
  });
});

describe('Max win cap', () => {
  it('caps every route at maxWinMultiplier × bet', () => {
    const cfg = { ...GAME_CONFIG, maxWinMultiplier: 30 };
    for (const f of ['greatEscape', 'hideout', 'lastStand'] as FeatureId[]) {
      for (let seed = 0; seed < 15; seed++) {
        const s = new GameServer({ config: cfg, rng: new DevRng(seed), storage: new MemoryStorage(), startingBalance: 1e9 });
        s.buyFeature(id(), f);
        const st = finishFeature(s);
        expect(st.totalWin).toBeLessThanOrEqual(30 * st.bet);
      }
    }
  });
});

describe('Interrupted-game recovery', () => {
  it('restores an in-progress Hideout with the same hidden board and balance', () => {
    const storage = new MemoryStorage();
    const s1 = newServer(12, storage);
    s1.buyFeature(id(), 'hideout');
    s1.pick(id(), 0);
    const snap1 = s1.getSnapshot();

    // "reload": a new server instance over the same storage
    const s2 = new GameServer({ rng: new DevRng(999), storage });
    expect(s2.recovered).toBe(true);
    const snap2 = s2.getSnapshot();
    expect(snap2.phase).toBe('HIDEOUT');
    expect(snap2.balance).toBe(snap1.balance);
    expect(snap2.feature).toEqual(snap1.feature);
    const r1 = s1.pick('p-a', 5);
    const r2 = s2.pick('p-b', 5);
    expect(r2.result.prize).toEqual(r1.result.prize);
    const st = finishFeature(s2);
    expect(s2.getSnapshot().balance).toBe(snap1.balance + st.totalWin);
  });

  it('restores Great Escape spins and multiplier', () => {
    const storage = new MemoryStorage();
    const s1 = newServer(13, storage);
    s1.buyFeature(id(), 'greatEscape');
    s1.freeSpin(id());
    s1.freeSpin(id());
    const f1 = s1.getSnapshot().feature;
    const s2 = new GameServer({ storage });
    expect(s2.getSnapshot().feature).toEqual(f1);
    finishFeature(s2);
    expect(s2.getSnapshot().phase).toBe('IDLE');
  });

  it('a settled round is never paid twice after reload', () => {
    const storage = new MemoryStorage();
    const s1 = newServer(14, storage);
    s1.buyFeature(id(), 'lastStand');
    const st = finishFeature(s1);
    const bal = s1.getSnapshot().balance;
    const s2 = new GameServer({ storage });
    expect(s2.getSnapshot().balance).toBe(bal);
    expect(s2.wallet.credit(`${st.roundId}:payout`, st.roundId, st.totalWin)).toBeNull();
    expect(s2.getSnapshot().balance).toBe(bal);
  });
});
