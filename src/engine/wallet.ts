/**
 * Wallet / Round Ledger.
 *
 * SIMULATED PLAY-MONEY WALLET – development only. No real-money integration.
 * Every debit/credit is keyed by a transaction id and applied at most once,
 * which protects against duplicate payouts and duplicate purchases.
 */
import type { FeatureId } from '../config/gameConfig';

export interface Transaction {
  txId: string;
  roundId: string;
  kind: 'stake' | 'buy' | 'payout';
  amount: number; // cents (positive)
  balanceAfter: number;
  at: number;
}

export interface RoundRecord {
  roundId: string;
  type: 'spin' | 'buy';
  feature: FeatureId | null;
  bet: number; // total bet (cents)
  cost: number; // stake or purchase price (cents)
  balanceBefore: number;
  balanceAfter: number | null;
  baseWin: number;
  featureWin: number;
  totalWin: number;
  status: 'pending' | 'completed';
  rngRef: string; // RNG label + seed state at round start (audit)
  outcome: unknown[]; // compact step log
  createdAt: number;
  completedAt: number | null;
}

export class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient balance');
  }
}

export class SimulatedWallet {
  readonly simulated = true;
  balance: number;
  transactions: Transaction[] = [];
  private applied = new Set<string>();

  constructor(balance: number) {
    this.balance = balance;
  }

  debit(txId: string, roundId: string, kind: 'stake' | 'buy', amount: number): Transaction | null {
    if (this.applied.has(txId)) return null; // idempotent
    if (!Number.isInteger(amount) || amount < 0) throw new Error('Invalid amount');
    if (amount > this.balance) throw new InsufficientFundsError();
    this.balance -= amount;
    return this.record(txId, roundId, kind, amount);
  }

  credit(txId: string, roundId: string, amount: number): Transaction | null {
    if (this.applied.has(txId)) return null; // duplicate payout prevented
    if (!Number.isInteger(amount) || amount < 0) throw new Error('Invalid amount');
    this.balance += amount;
    return this.record(txId, roundId, 'payout', amount);
  }

  private record(txId: string, roundId: string, kind: Transaction['kind'], amount: number): Transaction {
    this.applied.add(txId);
    const t: Transaction = { txId, roundId, kind, amount, balanceAfter: this.balance, at: Date.now() };
    this.transactions.push(t);
    if (this.transactions.length > 500) this.transactions.shift();
    return t;
  }

  toJSON() {
    return { balance: this.balance, transactions: this.transactions, applied: [...this.applied].slice(-2000) };
  }

  static fromJSON(j: { balance: number; transactions: Transaction[]; applied: string[] }): SimulatedWallet {
    const w = new SimulatedWallet(j.balance);
    w.transactions = j.transactions || [];
    w.applied = new Set(j.applied || []);
    return w;
  }
}

export class RoundLedger {
  rounds: RoundRecord[] = [];
  open(r: Omit<RoundRecord, 'status' | 'balanceAfter' | 'completedAt' | 'outcome' | 'baseWin' | 'featureWin' | 'totalWin'>): RoundRecord {
    const rec: RoundRecord = { ...r, status: 'pending', balanceAfter: null, completedAt: null, outcome: [], baseWin: 0, featureWin: 0, totalWin: 0 };
    this.rounds.push(rec);
    if (this.rounds.length > 200) this.rounds.shift();
    return rec;
  }
  get(roundId: string) {
    return this.rounds.find((r) => r.roundId === roundId);
  }
  complete(roundId: string, balanceAfter: number) {
    const r = this.get(roundId);
    if (!r) throw new Error('Unknown round');
    if (r.status === 'completed') return r;
    r.status = 'completed';
    r.balanceAfter = balanceAfter;
    r.completedAt = Date.now();
    return r;
  }
}
