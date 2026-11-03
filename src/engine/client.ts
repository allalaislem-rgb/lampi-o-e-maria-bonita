/**
 * GameClient – the ONLY entry point the presentation layer uses.
 * Wraps the authoritative GameServer behind an async request/response API
 * (as a network backend would be). Generates unique requestIds and blocks
 * concurrent requests so the UI cannot double-submit.
 */
import type { FeatureId } from '../config/gameConfig';
import type { ForceOptions } from './baseGame';
import type { GameServer } from './server';

let seq = 0;
const rid = () => `q${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export class GameClient {
  private busy = false;
  constructor(private server: GameServer, private latencyMs = 60) {}

  get isBusy() {
    return this.busy;
  }

  private async call<T>(fn: (requestId: string) => T): Promise<T> {
    if (this.busy) throw new Error('Request already in flight');
    this.busy = true;
    const id = rid();
    try {
      await new Promise((r) => setTimeout(r, this.latencyMs));
      return structuredClone(fn(id));
    } finally {
      this.busy = false;
    }
  }

  snapshot() {
    return structuredClone(this.server.getSnapshot());
  }
  get recovered() {
    return this.server.recovered;
  }
  ledger() {
    return structuredClone(this.server.getLedger());
  }
  setBet(index: number) {
    return this.call(() => this.server.setBet(index));
  }
  spin(force?: ForceOptions) {
    return this.call((id) => this.server.spin(id, force));
  }
  buy(feature: FeatureId) {
    return this.call((id) => this.server.buyFeature(id, feature));
  }
  choose(feature: FeatureId) {
    return this.call((id) => this.server.chooseFeature(id, feature));
  }
  freeSpin(opts?: { forceRaid?: boolean }) {
    return this.call((id) => this.server.freeSpin(id, opts));
  }
  pick(index: number) {
    return this.call((id) => this.server.pick(id, index));
  }
  respin() {
    return this.call((id) => this.server.respin(id));
  }
  resetWallet() {
    return this.call(() => this.server.resetWallet());
  }
}
