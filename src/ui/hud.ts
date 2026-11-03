/**
 * HUD – binds the DOM control bar and Bonus Buy buttons.
 */
import type { FeatureId } from '../config/gameConfig';
import type { Snapshot } from '../engine/server';
import { money } from './format';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class Hud {
  balance = $('balance');
  bet = $('bet');
  win = $('win');
  winLabel = $('win-label');
  winPanel = $('panel-win');
  spin = $<HTMLButtonElement>('btn-spin');
  autoCount = $('auto-count');
  minus = $<HTMLButtonElement>('bet-minus');
  plus = $<HTMLButtonElement>('bet-plus');
  turbo = $<HTMLButtonElement>('btn-turbo');
  auto = $<HTMLButtonElement>('btn-auto');
  soundBtn = $<HTMLButtonElement>('btn-sound');
  buyBtns = [...document.querySelectorAll<HTMLButtonElement>('.buy-btn')];
  private winAnim = 0;

  show() {
    $('hud').classList.remove('hidden');
    $('buy').classList.remove('hidden');
  }

  setBalance(c: number) {
    this.balance.textContent = money(c);
  }

  setBet(snap: Snapshot) {
    this.bet.textContent = money(snap.bet);
    this.minus.disabled = snap.betIndex <= 0;
    this.plus.disabled = snap.betIndex >= snap.betLevels.length - 1;
    for (const b of this.buyBtns) {
      const f = b.dataset.feature as FeatureId;
      const p = b.querySelector('.buy-price')!;
      p.textContent = snap.buyEnabled ? money(snap.buyPrices[f]) : 'N/A';
    }
  }

  /** Animated count-up of the win meter. */
  setWin(c: number, label = 'GANHO', animate = true) {
    cancelAnimationFrame(this.winAnim);
    this.winLabel.textContent = label;
    this.winPanel.classList.toggle('lit', c > 0);
    if (c > 0) {
      this.winPanel.classList.remove('pop');
      void this.winPanel.offsetWidth;
      this.winPanel.classList.add('pop');
    }
    const from = Number(this.win.dataset.v || 0);
    this.win.dataset.v = String(c);
    if (!animate || c <= from) {
      this.win.textContent = money(c);
      return;
    }
    const t0 = performance.now();
    const dur = Math.min(1500, 300 + (c - from) / 50);
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      this.win.textContent = money(Math.round(from + (c - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) this.winAnim = requestAnimationFrame(step);
    };
    step();
  }

  /** Lock controls while a round/feature is running. */
  setBusy(busy: boolean, inFeature = false, autoplay = false) {
    this.minus.disabled = busy || this.minus.dataset.min === '1';
    this.plus.disabled = busy || this.plus.dataset.max === '1';
    for (const b of this.buyBtns) b.disabled = busy || autoplay;
    this.auto.disabled = (busy && !autoplay) || inFeature;
    this.spin.disabled = inFeature;
    this.spin.classList.toggle('spinning', busy && !inFeature);
  }

  setBetLimits(snap: Snapshot) {
    this.minus.dataset.min = snap.betIndex <= 0 ? '1' : '0';
    this.plus.dataset.max = snap.betIndex >= snap.betLevels.length - 1 ? '1' : '0';
  }

  setAutoplay(n: number) {
    this.autoCount.textContent = n > 0 ? String(n) : '';
    this.spin.classList.toggle('auto', n > 0);
    this.auto.classList.toggle('active', n > 0);
  }
}
