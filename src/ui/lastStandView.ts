/**
 * LastStandView – dedicated 5×3 Hold & Respin grid.
 */
import { Container, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { LSCell, RespinResult } from '../engine/features/lastStand';
import { tex } from './assets';
import { T, goldText, plainText, destroyDeep } from './gfx';
import type { FX } from './fx';
import { money } from './format';
import { sound } from '../audio/sound';
import { CELL_W, CELL_H } from './reels';

const MULT_TEX: Record<number, string> = { 2: 'badge_2', 3: 'badge_3', 5: 'badge_5', 10: 'badge_10' };
const GHOSTS = ['coin_blank', 'badge_2', 'emblem_sun', 'coin_blank', 'badge_5', 'coinspin_3'];

class Slot extends Container {
  bg: Sprite;
  content = new Container();
  glow: Sprite;
  ghost: Sprite;
  cell: LSCell | null = null;
  constructor() {
    super();
    this.bg = new Sprite(tex('ls_cell'));
    this.bg.anchor.set(0.5);
    this.bg.width = CELL_W - 4;
    this.bg.height = CELL_H - 4;
    this.glow = new Sprite(T.glow());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(1.9);
    this.glow.tint = 0xffb040;
    this.ghost = new Sprite(tex('coin_blank'));
    this.ghost.anchor.set(0.5);
    this.ghost.alpha = 0;
    this.addChild(this.bg, this.glow, this.ghost, this.content);
  }
}

export class LastStandView extends Container {
  slots: Slot[] = [];
  frame: Sprite;
  constructor(private fx: FX) {
    super();
    this.frame = new Sprite(tex('frame_last'));
    this.frame.width = 1120;
    this.frame.height = 710;
    this.frame.position.set(-60, -110);
    this.addChild(this.frame);
    for (let i = 0; i < 15; i++) {
      const s = new Slot();
      s.position.set(Math.floor(i / 3) * CELL_W + CELL_W / 2, (i % 3) * CELL_H + CELL_H / 2);
      this.slots.push(s);
      this.addChild(s);
    }
  }

  setCells(cells: (LSCell | null)[], bet: number) {
    cells.forEach((c, i) => this.render(i, c, bet, false));
  }

  private render(i: number, cell: LSCell | null, bet: number, animate: boolean) {
    const s = this.slots[i];
    s.cell = cell;
    s.content.children.forEach((c) => gsap.killTweensOf(c));
    s.content.removeChildren().forEach((c) => destroyDeep(c));
    gsap.killTweensOf(s.glow);
    s.glow.alpha = 0;
    if (!cell) return;
    let icon: Sprite;
    let label: Text | null = null;
    if (cell.kind === 'coin') {
      icon = new Sprite(tex('coin_blank'));
      label = goldText(money(cell.value * bet), cell.value >= 25 ? 32 : 28);
      label.y = 4;
    } else if (cell.kind === 'mult') {
      icon = new Sprite(tex(MULT_TEX[cell.value] ?? 'badge_2'));
    } else {
      icon = new Sprite(tex('emblem_sun'));
      label = goldText(money(cell.value * bet), 24);
      label.y = 62;
    }
    icon.anchor.set(0.5);
    icon.scale.set((CELL_H - (cell.kind === 'emblem' ? 10 : 26)) / icon.texture.height);
    s.content.addChild(icon);
    if (label) s.content.addChild(label);
    if (cell.kind === 'coin' && cell.value >= 10) {
      const tag = plainText(cell.value >= 50 ? 'MEGA' : cell.value >= 25 ? 'MAIOR' : 'MENOR', 15, '#fff1b0');
      tag.y = -56;
      s.content.addChild(tag);
    }
    if (cell.kind === 'emblem') gsap.to(icon, { rotation: Math.PI * 2, duration: 14, repeat: -1, ease: 'none' });
    s.glow.alpha = 0.3;
    gsap.to(s.glow, { alpha: 0.55, duration: 1 + Math.random(), yoyo: true, repeat: -1, ease: 'sine.inOut' });
    if (animate) {
      gsap.fromTo(s.content.scale, { x: 2.0, y: 2.0 }, { x: 1, y: 1, duration: 0.32, ease: 'power3.in' });
      gsap.fromTo(s.content, { alpha: 0 }, { alpha: 1, duration: 0.18 });
    }
  }

  private gpos(i: number) {
    const s = this.slots[i];
    return { x: this.x + s.x * this.scale.x, y: this.y + s.y * this.scale.y };
  }

  entrance() {
    this.slots.forEach((s, i) => gsap.fromTo(s.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: 0.4, delay: (i % 3) * 0.05 + Math.floor(i / 3) * 0.07, ease: 'back.out(2)' }));
  }

  async play(result: RespinResult, bet: number, turbo: boolean) {
    sound.play('respin');
    const empty = this.slots.filter((s) => !s.cell);
    let alive = true;
    const flick = () => {
      if (!alive) return;
      for (const s of empty) {
        s.ghost.texture = tex(GHOSTS[Math.floor(Math.random() * GHOSTS.length)]);
        s.ghost.scale.set(80 / s.ghost.texture.height);
        s.ghost.alpha = 0.1 + Math.random() * 0.18;
        s.ghost.y = (Math.random() - 0.5) * 70;
      }
      gsap.delayedCall(0.06, flick);
    };
    flick();
    await wait(turbo ? 320 : 700);
    alive = false;
    for (const s of empty) s.ghost.alpha = 0;

    for (const [k, l] of result.landed.entries()) {
      await wait(turbo ? 60 : 150);
      this.render(l.index, l.cell, bet, true);
      const p = this.gpos(l.index);
      gsap.delayedCall(0.3, () => {
        sound.play('lock', { rate: 1 + k * 0.04 });
        this.fx.flash(p.x, p.y, 1.6);
        this.fx.ring(p.x, p.y, 1.1, l.cell.kind === 'mult' ? 0xff7050 : 0xffd36b);
        this.fx.sparkBurst(p.x, p.y, 16, 300);
        this.shake(5);
      });
    }
    if (result.landed.length) await wait(420);

    for (const em of result.emblemEffects) {
      const from = this.gpos(em.index);
      sound.play('emblem');
      this.fx.flash(from.x, from.y, 3, 0xffa030);
      this.fx.ring(from.x, from.y, 2, 0xffa030);
      await wait(320);
      if (em.effect === 'upgrade') {
        for (const u of em.upgraded) {
          const to = this.gpos(u.index);
          await this.fx.beam(from.x, from.y, to.x, to.y);
          this.render(u.index, { kind: 'mult', value: u.to }, bet, true);
          sound.play('multiplier', { rate: 1.1 });
        }
      } else {
        for (const a of em.added) {
          const to = this.gpos(a.index);
          await this.fx.beam(from.x, from.y, to.x, to.y);
          this.render(a.index, a.cell, bet, true);
          sound.play('lock');
        }
      }
      await wait(260);
    }
    result.cells.forEach((c, i) => {
      if (JSON.stringify(this.slots[i].cell) !== JSON.stringify(c)) this.render(i, c, bet, false);
    });
  }

  shake(px = 6) {
    const ox = this.x;
    const p = { k: 1 };
    gsap.to(p, { k: 0, duration: 0.25, onUpdate: () => (this.x = ox + (Math.random() - 0.5) * px * p.k), onComplete: () => void (this.x = ox) });
  }

  async celebrateFull() {
    for (let i = 0; i < 15; i++) {
      const p = this.gpos(i);
      gsap.delayedCall(i * 0.05, () => {
        this.fx.sparkBurst(p.x, p.y, 12, 300);
        this.fx.ring(p.x, p.y, 0.9);
      });
    }
    await wait(1000);
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
