/**
 * Animation Controller – connects authoritative engine outcomes to the
 * presentation. It never decides outcomes: it requests actions from the
 * GameClient and animates exactly what the engine returns.
 */
import gsap from 'gsap';
import { GAME_CONFIG, type FeatureId } from '../config/gameConfig';
import type { ForceOptions } from '../engine/baseGame';
import type { GameClient } from '../engine/client';
import type { PublicFeature } from '../engine/bonusManager';
import type { RoundSummary, Snapshot, SpinResponse } from '../engine/server';
import type { Grid } from '../engine/math';
import { sound } from '../audio/sound';
import { money } from './format';
import { Hud } from './hud';
import { CoupleTracker, MultiplierMeter, Plate } from './infoBar';
import * as UI from './overlays';
import type { Stage } from './stage';
import { WIN_W, wait } from './reels';

const THEME: Record<FeatureId, 'escape' | 'hideout' | 'laststand'> = { greatEscape: 'escape', hideout: 'hideout', lastStand: 'laststand' };
const BIG_WIN_X = 15;

export class Controller {
  hud = new Hud();
  private busy = false;
  private inFeature = false;
  private autoLeft = 0;
  private winSignal = { cancelled: false };
  private force: ForceOptions | null = null;
  private forceFsRaid = false;
  private lastBaseGrid: Grid | null = null;
  private calm: gsap.core.Tween | null = null;

  constructor(private client: GameClient, private stage: Stage) {}

  get snap(): Snapshot {
    return this.client.snapshot();
  }

  async start() {
    const s = this.snap;
    this.hud.show();
    this.refresh(s);
    this.hud.setWin(0, 'WIN', false);
    this.bind();
    this.stage.layout();
    void sound.setMode('base');
    this.stage.reels.onAnticipation = (on) => {
      if (on) {
        this.calm?.kill();
        sound.setIntensity(1.35, 0.5);
      }
    };
    // recovery of an interrupted game
    if (s.phase === 'BONUS_CHOICE' && s.pendingChoice) {
      this.busy = true;
      this.hud.setBusy(true);
      const f = await UI.showChoice(s.pendingChoice, true);
      await this.client.choose(f);
      await this.runFeature(f, true);
      this.endRound();
    } else if (s.phase !== 'IDLE' && s.feature) {
      this.busy = true;
      this.hud.setBusy(true);
      await this.runFeature(s.feature.feature, true);
      this.endRound();
    }
  }

  private refresh(s: Snapshot) {
    this.hud.setBalance(s.balance);
    this.hud.setBetLimits(s);
    this.hud.setBet(s);
    this.hud.setBusy(this.busy, this.inFeature, this.autoLeft > 0);
  }

  // ------------------------------------------------------------- input
  private bind() {
    const h = this.hud;
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    h.spin.addEventListener('click', () => this.onSpinButton());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !UI.isOverlayOpen()) {
        e.preventDefault();
        this.onSpinButton();
      }
    });
    h.minus.addEventListener('click', () => this.changeBet(-1));
    h.plus.addEventListener('click', () => this.changeBet(1));
    h.turbo.addEventListener('click', () => {
      sound.play('click');
      this.stage.reels.turbo = !this.stage.reels.turbo;
      h.turbo.classList.toggle('active', this.stage.reels.turbo);
      UI.toast(this.stage.reels.turbo ? 'Turbo ON' : 'Turbo OFF', 1000);
    });
    h.auto.addEventListener('click', async () => {
      sound.play('click');
      if (!GAME_CONFIG.autoplay.enabled) return UI.toast('Autoplay is not available in this market');
      if (this.autoLeft > 0) return this.stopAuto();
      if (this.busy) return;
      const n = await UI.showAutoplay(GAME_CONFIG.autoplay.options);
      if (!n) return;
      this.autoLeft = n;
      h.setAutoplay(n);
      void this.spin();
    });
    const syncSoundIcon = () => {
      h.soundBtn.classList.toggle('off', sound.muted || (sound.musicVolume === 0 && sound.sfxVolume === 0));
    };
    syncSoundIcon();
    h.soundBtn.addEventListener('click', () => {
      sound.unlock();
      sound.play('click');
      UI.showSoundSettings(syncSoundIcon);
    });
    document.getElementById('btn-menu')!.addEventListener('click', () => {
      sound.play('click');
      UI.showPaytable(this.snap.bet);
    });
    const full = document.getElementById('btn-full')!;
    if (!document.documentElement.requestFullscreen) full.classList.add('hidden');
    full.addEventListener('click', () => {
      sound.play('click');
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen().catch(() => UI.toast('Fullscreen not available'));
    });
    document.addEventListener('fullscreenchange', () => setTimeout(() => this.stage.layout(), 150));
    document.getElementById('btn-history')!.addEventListener('click', () => {
      sound.play('click');
      UI.showHistory(this.client.ledger());
    });
    const dev = document.getElementById('btn-dev')!;
    if (!GAME_CONFIG.dev.allowForcedOutcomes) dev.classList.add('hidden');
    dev.addEventListener('click', () => {
      sound.play('click');
      UI.showDev({
        rngLabel: this.snap.rngLabel,
        force: (k) => {
          const map: Record<string, ForceOptions> = {
            greatEscape: { features: ['greatEscape'] },
            greatEscape5: { features: ['greatEscape'], scatterCount: 5 },
            hideout: { features: ['hideout'] },
            lastStand: { features: ['lastStand'] },
            multi: { features: ['hideout', 'lastStand'] },
            arrival: { event: 'arrival' },
            raid: { event: 'raid' },
          };
          if (k === 'fsRaid') {
            this.forceFsRaid = true;
            UI.toast('Next free spin will trigger the Cangaceiro Raid');
          } else {
            this.force = map[k];
            UI.toast('Forced outcome armed for the next spin');
          }
        },
        reset: async () => {
          if (this.busy) return UI.toast('Finish the current round first');
          const s = await this.client.resetWallet();
          this.refresh(s);
          UI.toast('Simulated wallet reset');
        },
      });
    });
    for (const b of h.buyBtns) b.addEventListener('click', () => this.buy(b.dataset.feature as FeatureId));
  }

  private async changeBet(d: number) {
    if (this.busy) return;
    const s = this.snap;
    const i = s.betIndex + d;
    if (i < 0 || i >= s.betLevels.length) return;
    sound.play('click');
    const ns = await this.client.setBet(i);
    this.refresh(ns);
  }

  private onSpinButton() {
    if (this.autoLeft > 0) {
      this.stopAuto();
      return;
    }
    if (this.busy) {
      this.winSignal.cancelled = true; // skip presentation
      return;
    }
    void this.spin();
  }

  private stopAuto() {
    this.autoLeft = 0;
    this.hud.setAutoplay(0);
    this.hud.setBusy(this.busy, this.inFeature, false);
  }

  // ------------------------------------------------------------- base game
  async spin() {
    if (this.busy || this.client.isBusy || UI.isOverlayOpen()) return;
    const s = this.snap;
    if (s.phase !== 'IDLE') return;
    if (s.balance < s.bet) {
      sound.play('error');
      UI.toast('Insufficient balance – lower your bet or reset the demo wallet');
      this.stopAuto();
      return;
    }
    this.busy = true;
    this.winSignal.cancelled = true;
    this.winSignal = { cancelled: false };
    this.hud.setBusy(true, false, this.autoLeft > 0);
    this.hud.setWin(0, 'WIN', false);
    this.hud.setBalance(s.balance - s.bet);
    sound.play('spin');
    this.stage.reels.allowWildInSpin = true;
    this.stage.reels.startSpin();

    let resp: SpinResponse;
    try {
      resp = await this.client.spin(this.force ?? undefined);
    } catch (e) {
      this.force = null;
      await this.stage.reels.stopOn(this.lastBaseGrid ?? this.stage.reels.reels.map((r) => [0, 1, 2].map((row) => r.viewAt(row)?.id ?? 'CACT')) as Grid, { quickStop: true });
      UI.toast((e as Error).message);
      this.busy = false;
      this.refresh(this.snap);
      return;
    }
    this.force = null;
    const o = resp.outcome;
    await this.stage.reels.stopOn(o.grid);
    this.lastBaseGrid = o.finalGrid;
    // dynamic music: a near miss (2 of any scatter) lifts the tension, then it eases off
    const nearMiss = (['WANT', 'MAP', 'EMBL'] as const).some((k) => o.scatters[k].length === 2);
    this.calm?.kill();
    if (!o.triggers.length) {
      if (nearMiss) sound.setIntensity(1, 0.4);
      this.calm = gsap.delayedCall(nearMiss ? 4 : 0.2, () => sound.setIntensity(0, nearMiss ? 3 : 1.5));
    }

    // random events (they changed the authoritative outcome before evaluation)
    if (o.event?.type === 'arrival') {
      await this.stage.eventBanner('arrival');
      await this.stage.reels.wildReel(o.event.reels, 'arrival');
    } else if (o.event?.type === 'raid') {
      await this.stage.eventBanner('raid');
      await this.stage.reels.transform(o.event.cells, o.event.target);
    }

    const triggered = resp.featureStarted ? [resp.featureStarted] : resp.pendingChoice ?? [];
    if (o.win > 0) {
      const xw = o.win / resp.bet;
      sound.play(xw >= 5 ? 'win_medium' : 'win_small');
      if (xw >= 5) {
        const c = this.stage.reels.g(2, 1);
        this.stage.fx.coinFountain(c.x, c.y, Math.min(40, 10 + Math.round(xw)), 0.9);
      }
      this.hud.setWin(o.win);
      const big = o.win >= BIG_WIN_X * resp.bet;
      await this.stage.reels.presentWins(o.lineWins, o.win, money, this.winSignal, !triggered.length && !big && this.autoLeft === 0);
      if (big) {
        await this.stage.bigWin(o.win, resp.bet, money);
        this.winSignal.cancelled = true;
      }
    }
    if (triggered.length) {
      this.winSignal.cancelled = true;
      const pos = [...(triggered.includes('greatEscape') ? o.scatters.WANT : []), ...(triggered.includes('hideout') ? o.scatters.MAP : []), ...(triggered.includes('lastStand') ? o.scatters.EMBL : [])];
      this.stage.reels.clearWins();
      sound.play('trigger');
      this.calm?.kill();
      sound.setIntensity(2, 0.25);
      for (const f of triggered) sound.prefetch(THEME[f]);
      await this.stage.reels.celebrateScatters(pos);
      if (this.autoLeft > 0 && GAME_CONFIG.autoplay.stopOnFeature) this.stopAuto();
      let f = resp.featureStarted;
      if (!f && resp.pendingChoice) {
        f = await UI.showChoice(resp.pendingChoice);
        await this.client.choose(f);
      }
      await this.runFeature(f!, false);
    } else if (resp.settled) {
      this.hud.setBalance(resp.settled.balanceAfter);
    }
    this.endRound();
  }

  private endRound() {
    this.busy = false;
    this.inFeature = false;
    const s = this.snap;
    this.refresh(s);
    if (this.autoLeft > 0) {
      this.autoLeft--;
      this.hud.setAutoplay(this.autoLeft);
      if (this.autoLeft === 0) {
        this.stopAuto();
        return;
      }
      setTimeout(() => {
        if (this.autoLeft > 0) void this.spin();
      }, this.stage.reels.turbo ? 250 : 600);
    }
  }

  // ------------------------------------------------------------- bonus buy
  private async buy(f: FeatureId) {
    if (this.busy || this.client.isBusy || UI.isOverlayOpen()) return;
    sound.play('click');
    const s = this.snap;
    if (!s.buyEnabled) return UI.toast('Bonus Buy is not available');
    if (s.bet > s.buyMaxBet) return UI.toast(`Bonus Buy is available up to a bet of ${money(s.buyMaxBet)}`);
    const price = s.buyPrices[f];
    const ok = await UI.confirmBuy(f, price, s.balance, GAME_CONFIG.bonusBuy.prices[f]);
    if (!ok) return;
    if (this.busy) return; // double-click guard
    this.busy = true;
    this.hud.setBusy(true);
    try {
      const r = await this.client.buy(f);
      this.hud.setBalance(r.snapshot.balance);
      this.hud.setWin(0, 'WIN', false);
      sound.play('coin');
      await this.runFeature(f, false);
    } catch (e) {
      UI.toast((e as Error).message);
    }
    this.endRound();
  }

  // ------------------------------------------------------------- features
  private async runFeature(f: FeatureId, resumed: boolean) {
    this.inFeature = true;
    this.hud.setBusy(true, true);
    const st = this.stage;
    let feature = this.snap.feature as PublicFeature;
    const bet = this.snap.bet; // bet cannot change while a round is open
    const baseWin = this.snap.baseWin;
    sound.prefetch(THEME[f]);
    await st.transition(() => {
      st.env.set(THEME[f], true);
      st.reels.clearWins();
      st.reels.clearOverlays();
      st.reels.setFrame(f === 'greatEscape' ? 'escape' : 'base');
      st.logo.visible = false;
      st.info.clearAll();
      st.setMode(f === 'greatEscape' ? 'reels' : f === 'hideout' ? 'hideout' : 'laststand');
      void sound.setMode(THEME[f]);
    });
    await st.bonusIntro(THEME[f]);
    await UI.showIntro(f, feature.feature === 'greatEscape' ? feature.spinsLeft : undefined, resumed);

    let settled: RoundSummary | null = null;
    if (f === 'greatEscape') settled = await this.playGreatEscape(feature as Extract<PublicFeature, { feature: 'greatEscape' }>, bet, baseWin);
    else if (f === 'hideout') settled = await this.playHideout(feature as Extract<PublicFeature, { feature: 'hideout' }>, bet, baseWin);
    else settled = await this.playLastStand(feature as Extract<PublicFeature, { feature: 'lastStand' }>, bet, baseWin);
    feature = null as unknown as PublicFeature;

    const fw = settled?.featureWin ?? 0;
    if (settled && fw >= BIG_WIN_X * settled.bet) await st.bigWin(fw, settled.bet, money);
    await UI.showOutro(f, fw, settled?.maxWinReached ? '<p class="sub">MAXIMUM WIN REACHED</p>' : settled && settled.baseWin > 0 ? `<p class="note">Round total incl. base game win: ${money(settled.totalWin)}</p>` : '');
    await st.transition(() => {
      st.env.set('base', true);
      st.info.clearAll();
      st.logo.visible = true;
      st.setMode('reels');
      st.reels.clearOverlays();
      st.reels.setFrame('base');
      if (this.lastBaseGrid) st.reels.showGrid(this.lastBaseGrid);
      void sound.setMode('base');
    });
    if (settled) {
      this.hud.setBalance(settled.balanceAfter);
      this.hud.setWin(settled.totalWin);
    }
  }

  private async playGreatEscape(fs: Extract<PublicFeature, { feature: 'greatEscape' }>, bet: number, baseWin: number): Promise<RoundSummary | null> {
    const st = this.stage;
    const spins = new Plate('FREE SPINS', 250);
    spins.position.set(-WIN_W / 2 + 120, 0);
    const meter = new MultiplierMeter(GAME_CONFIG.greatEscape.multiplierCap);
    meter.position.set(-10, 0);
    const total = new Plate('FEATURE WIN', 270);
    total.position.set(WIN_W / 2 - 130, 0);
    st.info.addChild(spins, meter, total);
    spins.set(`${fs.spinsLeft}`);
    meter.set(fs.multiplier, false);
    total.set(money(fs.totalWin));
    if (fs.lastGrid) st.reels.showGrid(fs.lastGrid as Grid);
    this.hud.setWin(baseWin + fs.totalWin, 'TOTAL WIN', false);

    for (;;) {
      st.reels.startSpin();
      sound.play('spin');
      const r = await this.client.freeSpin(this.forceFsRaid ? { forceRaid: true } : undefined);
      this.forceFsRaid = false;
      const res = r.result;
      spins.set(`${Math.max(0, res.spinsLeft - res.retriggerSpins)}`, true);
      await wait(st.reels.turbo ? 100 : 250);
      await st.reels.stopOn(res.grid);
      if (res.raidReels.length) {
        await st.callout('CANGACEIRO RAID!', '', 900, ['sym_hat']);
        sound.play('raid');
        await st.reels.wildReel(res.raidReels, 'raid');
      }
      if (res.expandedReels.length) await st.reels.wildReel(res.expandedReels, 'expand', res.grid);
      if (res.spinWin > 0) {
        sound.play(res.spinWin >= 5 * bet ? 'win_medium' : 'win_small');
        const suffix = res.qualifying && res.multiplierBefore > 1 ? `  ×${res.multiplierBefore}` : '';
        total.set(money(res.totalWin), true);
        this.hud.setWin(baseWin + res.totalWin, 'TOTAL WIN');
        const sig = { cancelled: false };
        await st.reels.presentWins(res.lineWins, res.spinWin, money, sig, false, suffix);
        if (res.spinWin >= BIG_WIN_X * bet) await st.bigWin(res.spinWin, bet, money);
      }
      if (res.multiplierAfter !== res.multiplierBefore) {
        sound.play('multiplier', { rate: 1 + res.multiplierAfter * 0.04 });
        sound.setIntensity(Math.min(1, (res.multiplierAfter - 1) / 4));
        meter.set(res.multiplierAfter);
        await wait(500);
      }
      if (res.retriggerSpins > 0) {
        sound.play('retrigger');
        await st.reels.celebrateScatters(res.grid.flatMap((col, ri) => col.map((s, row) => (s === 'WANT' ? ([ri, row] as [number, number]) : null)).filter(Boolean) as [number, number][]));
        await st.callout(`+${res.retriggerSpins} FREE SPINS`, 'MULTIPLIER KEPT', 1400, ['sym_wanted']);
      }
      spins.set(`${res.spinsLeft}`, true);
      if (r.settled) return r.settled;
      await wait(st.reels.turbo ? 250 : 650);
    }
  }

  private async playHideout(h: Extract<PublicFeature, { feature: 'hideout' }>, bet: number, baseWin: number): Promise<RoundSummary | null> {
    const st = this.stage;
    const picks = new Plate('PICKS LEFT', 230);
    picks.position.set(-WIN_W / 2 + 110, 0);
    const mult = new Plate('MULTIPLIER', 200);
    mult.position.set(-WIN_W / 2 + 330, 0);
    const coll = new Plate('FEATURE WIN', 260);
    coll.position.set(WIN_W / 2 - 400, 0);
    const couple = new CoupleTracker();
    couple.position.set(WIN_W / 2 - 140, 0);
    st.info.addChild(picks, mult, coll, couple);
    const upd = (p: { picksLeft: number; multiplier: number; coinTotal: number; hasTreasure: boolean; hasMedallion: boolean; couplesFortune: boolean }, pop = false) => {
      picks.set(`${p.picksLeft}`, pop);
      mult.set(`×${p.multiplier}`, pop);
      coll.set(money(Math.min(p.coinTotal * p.multiplier * bet, this.snap.maxWin)), pop);
      couple.set(p.hasTreasure, p.hasMedallion, p.couplesFortune);
    };
    upd(h);
    st.hideout.setup(h, bet);
    st.hideout.entrance();
    sound.setIntensity(h.picksLeft <= 1 ? 1 : 0);
    this.hud.setWin(baseWin + h.coinTotal * h.multiplier * bet, 'TOTAL WIN', false);
    st.hideout.setEnabled(true);
    UI.toast('Choose a chest!', 1600);

    return new Promise<RoundSummary | null>((resolve) => {
      let pending = false;
      st.hideout.onPick = async (i) => {
        if (pending) return;
        pending = true;
        st.hideout.setEnabled(false);
        try {
          const r = await this.client.pick(i);
          const res = r.result;
          await st.hideout.open(i, res.prize);
          const s = r.snapshot.feature as Extract<PublicFeature, { feature: 'hideout' }> | null;
          upd({ picksLeft: res.picksLeft, multiplier: res.multiplier, coinTotal: res.coinTotal, hasTreasure: s ? s.hasTreasure : res.prize.type === 'treasure' || couple.lamp.tint === 0xffffff, hasMedallion: s ? s.hasMedallion : res.prize.type === 'medallion' || couple.maria.tint === 0xffffff, couplesFortune: s ? s.couplesFortune : res.couplesFortune }, true);
          this.hud.setWin(baseWin + res.award, 'TOTAL WIN');
          sound.setIntensity(res.picksLeft === 1 ? 1 : 0);
          if (res.prize.type === 'extraPick') await st.callout('EXTRA PICK!', '+1', 900, ['gold_star']);
          if (res.prize.type === 'medallion') await st.callout("MARIA'S MEDALLION", 'MULTIPLIER ×2', 1100, ['maria_5']);
          if (res.prize.type === 'treasure') await st.callout("LAMPIÃO'S TREASURE", money(res.prize.value * bet), 1100, ['lamp_2']);
          if (res.couplesFortune) {
            sound.play('couple');
            await st.callout("COUPLE'S FORTUNE!", `+${money(GAME_CONFIG.hideout.couplesFortune * bet)}`, 2200, ['lamp_0', 'heart_gem', 'maria_4']);
          }
          if (r.settled) {
            if (res.reveal) await st.hideout.revealRest(res.reveal);
            resolve(r.settled);
            return;
          }
          st.hideout.setEnabled(true);
        } catch (e) {
          UI.toast((e as Error).message);
          st.hideout.setEnabled(true);
        }
        pending = false;
      };
    });
  }

  private async playLastStand(ls: Extract<PublicFeature, { feature: 'lastStand' }>, bet: number, baseWin: number): Promise<RoundSummary | null> {
    const st = this.stage;
    const respins = new Plate('RESPINS', 210);
    respins.position.set(-WIN_W / 2 + 100, 0);
    const gold = new Plate('GOLD', 230);
    gold.position.set(-WIN_W / 2 + 330, 0);
    const mult = new Plate('MULTIPLIER', 200);
    mult.position.set(WIN_W / 2 - 370, 0);
    const total = new Plate('FEATURE WIN', 260);
    total.position.set(WIN_W / 2 - 130, 0);
    st.info.addChild(respins, gold, mult, total);
    const upd = (r: { respinsLeft: number; coinSum: number; multSum: number }, award: number, pop = false) => {
      respins.set(`${r.respinsLeft}`, pop);
      gold.set(money(r.coinSum * bet), pop);
      mult.set(`×${Math.max(1, r.multSum)}`, pop);
      total.set(money(award), pop);
    };
    st.laststand.setCells(ls.cells, bet);
    st.laststand.entrance();
    const intensity = (left: number, cells: unknown[]) => sound.setIntensity(left <= 1 || cells.filter(Boolean).length >= 12 ? 1 : 0.25);
    intensity(ls.respinsLeft, ls.cells);
    const initialAward = Math.min(ls.coinSum * Math.max(1, ls.multSum) * bet, this.snap.maxWin);
    upd(ls, initialAward);
    this.hud.setWin(baseWin + initialAward, 'TOTAL WIN', false);
    await wait(700);
    for (;;) {
      const r = await this.client.respin();
      const res = r.result;
      await st.laststand.play(res, bet, st.reels.turbo);
      const reset = res.landed.length > 0;
      if (reset && !res.ended) sound.play('respin_reset');
      intensity(res.respinsLeft, res.cells);
      upd(res, res.award, true);
      this.hud.setWin(baseWin + res.award, 'TOTAL WIN');
      if (reset && !res.ended) gsap.fromTo(respins.scale, { x: 1.2, y: 1.2 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
      if (r.settled) {
        if (res.full) {
          sound.play('grand');
          await st.laststand.celebrateFull();
          await st.callout('GRAND TREASURE!', money(GAME_CONFIG.lastStand.grandTreasure * bet), 2200, ['chest_treasure', 'emblem_sun', 'chest_treasure']);
        } else if (res.capped) await st.callout('MAXIMUM WIN!', '', 1600);
        await wait(600);
        return r.settled;
      }
      await wait(st.reels.turbo ? 200 : 450);
    }
  }
}
