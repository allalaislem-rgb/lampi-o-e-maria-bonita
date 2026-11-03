/**
 * GameServer – the AUTHORITATIVE game engine facade.
 *
 * In this prototype it runs in the browser ("in-process server") with a simulated
 * wallet and a development RNG. The frontend only ever talks to it through the
 * request/response API below (see `client.ts`), so it can be moved behind a real,
 * certified backend without changing the presentation layer.
 *
 * Guarantees:
 *  - every action is validated against the current phase (no invalid states);
 *  - every request carries a requestId; repeated requestIds return the cached
 *    response (no duplicate stakes, purchases or payouts);
 *  - a round's payout is credited exactly once, at settlement;
 *  - the full state is persisted after every action → interrupted-game recovery;
 *  - max win is capped per round on every entry route.
 */
import { FEATURE_NAMES, GAME_CONFIG, type FeatureId, type GameConfig } from '../config/gameConfig';
import { playBaseSpin, type BaseSpinOutcome, type ForceOptions } from './baseGame';
import { boughtEscapeScatters, validateBuy } from './bonusBuy';
import { publicFeature, startFeature, type FeatureSession, type PublicFeature } from './bonusManager';
import { playFreeSpin, type FreeSpinResult } from './features/greatEscape';
import { pickChest, hideoutAward, type PickResult } from './features/hideout';
import { lastStandAward, playRespin, type RespinResult } from './features/lastStand';
import { FEATURE_PHASE, GameStateMachine, InvalidStateError, type Phase } from './gameState';
import { lineBetFor } from './math';
import { DevRng, type Rng } from './rng';
import { RoundLedger, SimulatedWallet, type RoundRecord } from './wallet';

export interface KVStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export class MemoryStorage implements KVStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

interface ActiveRound {
  roundId: string;
  type: 'spin' | 'buy';
  bet: number;
  baseWin: number;
  featureWin: number;
  feature: FeatureId | null;
  pendingChoice: FeatureId[] | null;
  /** entry info kept for the choice screen */
  entry: { scatters: number; emblemPositions: number[] };
}

export interface RoundSummary {
  roundId: string;
  type: 'spin' | 'buy';
  feature: FeatureId | null;
  bet: number;
  cost: number;
  baseWin: number;
  featureWin: number;
  totalWin: number;
  maxWinReached: boolean;
  balanceAfter: number;
}

export interface Snapshot {
  balance: number;
  betIndex: number;
  bet: number;
  betLevels: number[];
  phase: Phase;
  roundId: string | null;
  roundWin: number;
  baseWin: number;
  pendingChoice: FeatureId[] | null;
  feature: PublicFeature | null;
  buyPrices: Record<FeatureId, number>; // cents at current bet
  buyEnabled: boolean;
  buyMaxBet: number;
  maxWin: number; // cents at current bet
  rngLabel: string;
  simulatedWallet: true;
  certified: false;
}

export interface SpinResponse {
  kind: 'spin';
  roundId: string;
  bet: number;
  outcome: BaseSpinOutcome;
  /** Feature entered immediately (single trigger) */
  featureStarted: FeatureId | null;
  pendingChoice: FeatureId[] | null;
  settled: RoundSummary | null;
  snapshot: Snapshot;
}
export interface BuyResponse {
  kind: 'buy';
  roundId: string;
  feature: FeatureId;
  price: number;
  snapshot: Snapshot;
}
export interface ChooseResponse {
  kind: 'choose';
  feature: FeatureId;
  snapshot: Snapshot;
}
export interface FreeSpinResponse {
  kind: 'freeSpin';
  result: FreeSpinResult;
  settled: RoundSummary | null;
  snapshot: Snapshot;
}
export interface PickResponse {
  kind: 'pick';
  result: PickResult;
  settled: RoundSummary | null;
  snapshot: Snapshot;
}
export interface RespinResponse {
  kind: 'respin';
  result: RespinResult;
  settled: RoundSummary | null;
  snapshot: Snapshot;
}
export type AnyResponse = SpinResponse | BuyResponse | ChooseResponse | FreeSpinResponse | PickResponse | RespinResponse;

const STORAGE_KEY = 'lmb.server.v1';

export interface ServerOptions {
  config?: GameConfig;
  rng?: Rng;
  storage?: KVStorage;
  startingBalance?: number;
}

export class GameServer {
  readonly cfg: GameConfig;
  private rng: Rng;
  private storage: KVStorage;
  wallet: SimulatedWallet;
  ledger = new RoundLedger();
  private sm = new GameStateMachine('IDLE');
  private betIndex: number;
  private round: ActiveRound | null = null;
  private feature: FeatureSession | null = null;
  private responses = new Map<string, AnyResponse>();
  private roundSeq = 0;
  /** true when the state was restored from storage with an unfinished round */
  recovered = false;

  constructor(opts: ServerOptions = {}) {
    this.cfg = opts.config ?? GAME_CONFIG;
    this.rng = opts.rng ?? new DevRng();
    this.storage = opts.storage ?? new MemoryStorage();
    this.wallet = new SimulatedWallet(opts.startingBalance ?? this.cfg.startingBalance);
    this.betIndex = this.cfg.defaultBetIndex;
    this.restore();
  }

  // ------------------------------------------------------------ public API
  getSnapshot(): Snapshot {
    const bet = this.currentBet();
    const roundBet = this.round?.bet ?? bet;
    return {
      balance: this.wallet.balance,
      betIndex: this.betIndex,
      bet,
      betLevels: [...this.cfg.betLevels],
      phase: this.sm.phase,
      roundId: this.round?.roundId ?? null,
      roundWin: this.round ? this.roundWinSoFar() : 0,
      baseWin: this.round?.baseWin ?? 0,
      pendingChoice: this.round?.pendingChoice ?? null,
      feature: publicFeature(this.feature),
      buyPrices: {
        greatEscape: this.cfg.bonusBuy.prices.greatEscape * bet,
        hideout: this.cfg.bonusBuy.prices.hideout * bet,
        lastStand: this.cfg.bonusBuy.prices.lastStand * bet,
      },
      buyEnabled: this.cfg.bonusBuy.enabled,
      buyMaxBet: this.cfg.bonusBuy.maxBetForBuy,
      maxWin: this.cfg.maxWinMultiplier * roundBet,
      rngLabel: this.rng.label,
      simulatedWallet: true,
      certified: false,
    };
  }

  getLedger(): RoundRecord[] {
    return this.ledger.rounds.slice();
  }

  setBet(index: number): Snapshot {
    this.sm.assertCan('setBet');
    if (!Number.isInteger(index) || index < 0 || index >= this.cfg.betLevels.length) throw new Error('Invalid bet level');
    this.betIndex = index;
    this.persist();
    return this.getSnapshot();
  }

  spin(requestId: string, force?: ForceOptions): SpinResponse {
    return this.idempotent(requestId, () => {
      this.sm.assertCan('spin');
      if (force && !this.cfg.dev.allowForcedOutcomes) throw new Error('Forced outcomes are disabled');
      const bet = this.currentBet();
      const before = this.wallet.balance;
      const roundId = this.newRoundId();
      this.wallet.debit(`${roundId}:stake`, roundId, 'stake', bet);
      const rec = this.ledger.open({ roundId, type: 'spin', feature: null, bet, cost: bet, balanceBefore: before, rngRef: this.rngRef(), createdAt: Date.now() });

      const outcome = playBaseSpin(this.rng, this.cfg, bet, force);
      const maxWin = this.cfg.maxWinMultiplier * bet;
      const baseWin = Math.min(outcome.win, maxWin);
      rec.baseWin = baseWin;
      rec.outcome.push({ step: 'base', grid: outcome.finalGrid, event: outcome.event, win: baseWin, triggers: outcome.triggers });

      this.round = {
        roundId,
        type: 'spin',
        bet,
        baseWin,
        featureWin: 0,
        feature: null,
        pendingChoice: null,
        entry: { scatters: outcome.scatters.WANT.length, emblemPositions: outcome.scatters.EMBL.map(([r, row]) => r * 3 + row) },
      };

      let featureStarted: FeatureId | null = null;
      let pendingChoice: FeatureId[] | null = null;
      let settled: RoundSummary | null = null;
      const triggers = baseWin >= maxWin ? [] : outcome.triggers;
      if (triggers.length === 1) {
        featureStarted = triggers[0];
        this.enterFeature(featureStarted);
      } else if (triggers.length > 1) {
        pendingChoice = triggers;
        this.round.pendingChoice = triggers;
        this.sm.go('BONUS_CHOICE');
      } else {
        settled = this.settle();
      }
      return { kind: 'spin', roundId, bet, outcome, featureStarted, pendingChoice, settled, snapshot: this.getSnapshot() } as SpinResponse;
    });
  }

  chooseFeature(requestId: string, feature: FeatureId): ChooseResponse {
    return this.idempotent(requestId, () => {
      this.sm.assertCan('choose');
      if (!this.round?.pendingChoice?.includes(feature)) throw new InvalidStateError('Feature was not triggered');
      this.round.pendingChoice = null; // unselected features are not carried over (GDD §7)
      this.enterFeature(feature);
      return { kind: 'choose', feature, snapshot: this.getSnapshot() } as ChooseResponse;
    });
  }

  buyFeature(requestId: string, feature: FeatureId): BuyResponse {
    return this.idempotent(requestId, () => {
      this.sm.assertCan('buy'); // prevents duplicate purchase while a round is open
      const bet = this.currentBet();
      const price = validateBuy(this.cfg, feature, bet, this.wallet.balance);
      const before = this.wallet.balance;
      const roundId = this.newRoundId();
      this.wallet.debit(`${roundId}:buy`, roundId, 'buy', price);
      this.ledger.open({ roundId, type: 'buy', feature, bet, cost: price, balanceBefore: before, rngRef: this.rngRef(), createdAt: Date.now() });
      const scatters = feature === 'greatEscape' ? boughtEscapeScatters(this.rng, this.cfg) : 3;
      this.round = { roundId, type: 'buy', bet, baseWin: 0, featureWin: 0, feature: null, pendingChoice: null, entry: { scatters, emblemPositions: [] } };
      this.enterFeature(feature);
      return { kind: 'buy', roundId, feature, price, snapshot: this.getSnapshot() } as BuyResponse;
    });
  }

  freeSpin(requestId: string, opts?: { forceRaid?: boolean }): FreeSpinResponse {
    return this.idempotent(requestId, () => {
      this.sm.assertCan('freeSpin');
      const f = this.feature;
      if (!f || f.feature !== 'greatEscape' || !this.round) throw new InvalidStateError('No Great Escape in progress');
      if (opts?.forceRaid && !this.cfg.dev.allowForcedOutcomes) throw new Error('Forced outcomes are disabled');
      const { state, result } = playFreeSpin(this.rng, f.state, this.cfg.greatEscape, lineBetFor(this.round.bet), this.remainingCap(), !!opts?.forceRaid);
      f.state = state;
      this.round.featureWin = state.totalWin;
      this.ledger.get(this.round.roundId)?.outcome.push({ step: 'freeSpin', n: result.spinNumber, grid: result.finalGrid, win: result.spinWin, mult: result.multiplierAfter });
      const settled = state.spinsLeft <= 0 ? this.settle() : null;
      if (!settled) this.persist();
      return { kind: 'freeSpin', result, settled, snapshot: this.getSnapshot() } as FreeSpinResponse;
    });
  }

  pick(requestId: string, index: number): PickResponse {
    return this.idempotent(requestId, () => {
      this.sm.assertCan('pick');
      const f = this.feature;
      if (!f || f.feature !== 'hideout' || !this.round) throw new InvalidStateError('No Hideout in progress');
      const { state, result } = pickChest(f.state, index, this.cfg.hideout, this.round.bet, this.remainingCapForFeature());
      f.state = state;
      this.round.featureWin = result.award;
      this.ledger.get(this.round.roundId)?.outcome.push({ step: 'pick', index, prize: result.prize, award: result.award });
      const settled = state.ended ? this.settle() : null;
      if (!settled) this.persist();
      return { kind: 'pick', result, settled, snapshot: this.getSnapshot() } as PickResponse;
    });
  }

  respin(requestId: string): RespinResponse {
    return this.idempotent(requestId, () => {
      this.sm.assertCan('respin');
      const f = this.feature;
      if (!f || f.feature !== 'lastStand' || !this.round) throw new InvalidStateError('No Last Stand in progress');
      const { state, result } = playRespin(this.rng, f.state, this.cfg.lastStand, this.round.bet, this.remainingCapForFeature());
      f.state = state;
      this.round.featureWin = result.award;
      this.ledger.get(this.round.roundId)?.outcome.push({ step: 'respin', n: result.respinNumber, landed: result.landed.length, award: result.award });
      const settled = state.ended ? this.settle() : null;
      if (!settled) this.persist();
      return { kind: 'respin', result, settled, snapshot: this.getSnapshot() } as RespinResponse;
    });
  }

  /** Dev only: reset the simulated wallet. */
  resetWallet(): Snapshot {
    if (this.sm.phase !== 'IDLE') throw new InvalidStateError('Finish the current round first');
    this.wallet = new SimulatedWallet(this.cfg.startingBalance);
    this.persist();
    return this.getSnapshot();
  }

  // ------------------------------------------------------------ internals
  private currentBet() {
    return this.cfg.betLevels[this.betIndex];
  }

  private roundWinSoFar() {
    if (!this.round) return 0;
    return Math.min(this.round.baseWin + this.round.featureWin, this.cfg.maxWinMultiplier * this.round.bet);
  }

  private remainingCap() {
    if (!this.round) return 0;
    return this.cfg.maxWinMultiplier * this.round.bet - this.round.baseWin - this.round.featureWin;
  }

  /** Cap available to an accumulating feature award (award replaces featureWin). */
  private remainingCapForFeature() {
    if (!this.round) return 0;
    return this.cfg.maxWinMultiplier * this.round.bet - this.round.baseWin;
  }

  private enterFeature(feature: FeatureId) {
    if (!this.round) throw new InvalidStateError('No round');
    this.round.feature = feature;
    const rec = this.ledger.get(this.round.roundId);
    if (rec) rec.feature = feature;
    this.feature = startFeature(this.rng, this.cfg, feature, {
      scatters: this.round.entry.scatters,
      positions: this.round.type === 'spin' && this.round.entry.emblemPositions.length >= 3 ? this.round.entry.emblemPositions : undefined,
    });
    if (this.feature.feature === 'lastStand') {
      // initial award (coins already locked) counts toward the running feature win
      this.round.featureWin = lastStandAward(this.feature.state.cells, this.cfg.lastStand, this.round.bet, this.remainingCapForFeature()).award;
    }
    if (this.feature.feature === 'hideout') this.round.featureWin = hideoutAward(this.feature.state, this.round.bet, this.remainingCapForFeature());
    this.sm.go(FEATURE_PHASE[feature]);
    this.persist();
  }

  private settle(): RoundSummary {
    const r = this.round!;
    const maxWin = this.cfg.maxWinMultiplier * r.bet;
    const total = Math.min(r.baseWin + r.featureWin, maxWin);
    if (total > 0) this.wallet.credit(`${r.roundId}:payout`, r.roundId, total); // idempotent by txId
    const rec = this.ledger.get(r.roundId);
    if (rec) {
      rec.featureWin = r.featureWin;
      rec.totalWin = total;
    }
    this.ledger.complete(r.roundId, this.wallet.balance);
    const summary: RoundSummary = {
      roundId: r.roundId,
      type: r.type,
      feature: r.feature,
      bet: r.bet,
      cost: rec?.cost ?? r.bet,
      baseWin: r.baseWin,
      featureWin: r.featureWin,
      totalWin: total,
      maxWinReached: total >= maxWin,
      balanceAfter: this.wallet.balance,
    };
    this.round = null;
    this.feature = null;
    this.sm.go('IDLE');
    this.persist();
    return summary;
  }

  private idempotent<T extends AnyResponse>(requestId: string, fn: () => T): T {
    if (!requestId) throw new Error('requestId required');
    const cached = this.responses.get(requestId);
    if (cached) return cached as T;
    const res = fn();
    this.responses.set(requestId, res);
    if (this.responses.size > 30) this.responses.delete(this.responses.keys().next().value!);
    return res;
  }

  private newRoundId() {
    this.roundSeq++;
    return `R${Date.now().toString(36)}-${this.roundSeq.toString(36)}-${Math.floor(this.rng.next() * 1e6).toString(36)}`;
  }

  private rngRef() {
    return `${this.rng.label}#${this.rng.getState().join('.')}`;
  }

  // ------------------------------------------------------------ persistence
  private persist() {
    const data = {
      v: 1,
      wallet: this.wallet.toJSON(),
      ledger: this.ledger.rounds,
      phase: this.sm.phase,
      betIndex: this.betIndex,
      round: this.round,
      feature: this.feature,
      rng: this.rng.getState(),
      roundSeq: this.roundSeq,
    };
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full / unavailable: the game keeps running without recovery */
    }
  }

  private restore() {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.v !== 1) return;
      this.wallet = SimulatedWallet.fromJSON(d.wallet);
      this.ledger.rounds = d.ledger || [];
      this.sm = new GameStateMachine(d.phase);
      this.betIndex = d.betIndex ?? this.betIndex;
      this.round = d.round;
      this.feature = d.feature;
      this.roundSeq = d.roundSeq || 0;
      if (Array.isArray(d.rng)) this.rng.setState(d.rng);
      this.recovered = d.phase !== 'IDLE';
    } catch {
      this.storage.removeItem(STORAGE_KEY);
    }
  }
}

export { FEATURE_NAMES };
