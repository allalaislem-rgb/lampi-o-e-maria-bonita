/**
 * LastStandView – dedicated 5×3 Hold & Respin grid.
 */
import { Container, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { LSCell, RespinResult } from '../engine/features/lastStand';
import { tex } from './assets';
import { frameTex, glowTex, goldText, slotTex, plainText } from './gfx';
import type { FX } from './fx';
import { money } from './format';
import { sound } from '../audio/sound';
import { CELL_W, CELL_H, WIN_W, WIN_H, FRAME_PAD } from './reels';

const MULT_TEX: Record<number, string> = { 2: 'mult_2', 3: 'mult_3', 5: 'mult_5', 10: 'mult_10' };

class Slot extends Container {
  bg: Sprite;
  content = new Container();
  glow: Sprite;
  ghost: Sprite;
  cell: LSCell | null = null;
  constructor() {
    super();
    this.bg = new Sprite(slotTex(CELL_W - 6, CELL_H - 6));
    this.bg.anchor.set(0.5);
    this.glow = new Sprite(glowTex());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(0.9);
    this.ghost = new Sprite(tex('coin_star'));
    this.ghost.anchor.set(0.5);
    this.ghost.alpha = 0;
    this.ghost.scale.set(0.5);
    this.addChild(this.bg, this.glow, this.ghost, this.content);
  }
}

export class LastStandView extends Container {
  slots: Slot[] = [];
  constructor(private fx: FX) {
    super();
    const frame = new Sprite(frameTex('laststand', WIN_W, WIN_H, FRAME_PAD, 'iron'));
    frame.position.set(-FRAME_PAD, -FRAME_PAD);
    this.addChild(frame);
    for (let i = 0; i < 15; i++) {
      const s = new Slot();
      const reel = Math.floor(i / 3);
      const row = i % 3;
      s.position.set(reel * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2);
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
    s.content.removeChildren().forEach((c) => c.destroy());
    gsap.killTweensOf(s.glow);
    s.glow.alpha = 0;
    if (!cell) return;
    let icon: Sprite;
    let label: Text | null = null;
    if (cell.kind === 'coin') {
      icon = new Sprite(tex('coin_star'));
      label = goldText(money(cell.value * bet), cell.value >= 25 ? 34 : 30);
    } else if (cell.kind === 'mult') {
      icon = new Sprite(tex(MULT_TEX[cell.value] ?? 'mult_2'));
    } else {
      icon = new Sprite(tex('emblem_sun'));
      label = goldText(money(cell.value * bet), 26);
      label.y = 58;
    }
    icon.anchor.set(0.5);
    icon.scale.set((CELL_H - (cell.kind === 'emblem' ? 14 : 24)) / icon.texture.height);
    s.content.addChild(icon);
    if (label) {
      if (cell.kind === 'coin') label.y = 4;
      s.content.addChild(label);
    }
    if (cell.kind === 'coin' && cell.value >= 10) {
      const tag = plainText(cell.value >= 50 ? 'MEGA' : cell.value >= 25 ? 'MAJOR' : 'MINOR', 15, '#fff1b0');
      tag.y = -58;
      s.content.addChild(tag);
    }
    s.glow.alpha = 0.35;
    gsap.to(s.glow, { alpha: 0.6, duration: 1 + Math.random(), yoyo: true, repeat: -1, ease: 'sine.inOut' });
    if (animate) {
      gsap.fromTo(s.content.scale, { x: 1.9, y: 1.9 }, { x: 1, y: 1, duration: 0.35, ease: 'power3.in' });
      gsap.fromTo(s.content, { alpha: 0 }, { alpha: 1, duration: 0.2 });
    }
  }

  private gpos(i: number) {
    const s = this.slots[i];
    return { x: this.x + s.x * this.scale.x, y: this.y + s.y * this.scale.y };
  }

  /** Respin animation: empty slots shimmer, then results stamp in. */
  async play(result: RespinResult, bet: number, turbo: boolean) {
    sound.play('respin');
    const empty = this.slots.filter((s) => !s.cell);
    const textures = ['coin_star', 'mult_2', 'emblem_sun', 'coin_star', 'mult_5'];
    const iv = setInterval(() => {
      for (const s of empty) {
        s.ghost.texture = tex(textures[Math.floor(Math.random() * textures.length)]);
        s.ghost.scale.set(70 / s.ghost.texture.height);
        s.ghost.alpha = 0.12 + Math.random() * 0.18;
        s.ghost.y = (Math.random() - 0.5) * 60;
      }
    }, 60);
    await wait(turbo ? 350 : 750);
    clearInterval(iv);
    for (const s of empty) s.ghost.alpha = 0;

    for (const [k, l] of result.landed.entries()) {
      await wait(turbo ? 60 : 160);
      this.render(l.index, l.cell, bet, true);
      const p = this.gpos(l.index);
      gsap.delayedCall(0.33, () => {
        sound.play('lock', { pitch: 1 + k * 0.05 });
        this.fx.flash(p.x, p.y, 1.8);
        this.fx.sparkBurst(p.x, p.y, 16, 300);
        gsap.fromTo(this, { x: this.x + 6 }, { x: this.x, duration: 0.25, ease: 'elastic.out(1,0.3)' });
      });
    }
    if (result.landed.length) await wait(450);

    for (const em of result.emblemEffects) {
      const from = this.gpos(em.index);
      sound.play('multiplier');
      this.fx.flash(from.x, from.y, 3, 0xffa030);
      await wait(300);
      if (em.effect === 'upgrade') {
        for (const u of em.upgraded) {
          const to = this.gpos(u.index);
          await this.fx.beam(from.x, from.y, to.x, to.y);
          this.render(u.index, { kind: 'mult', value: u.to }, bet, true);
          sound.play('multiplier', { pitch: 1.2 });
        }
      } else {
        for (const a of em.added) {
          const to = this.gpos(a.index);
          await this.fx.beam(from.x, from.y, to.x, to.y);
          this.render(a.index, a.cell, bet, true);
          sound.play('lock');
        }
      }
      await wait(300);
    }
    // sync with authoritative cells (safety)
    result.cells.forEach((c, i) => {
      const s = this.slots[i];
      if (JSON.stringify(s.cell) !== JSON.stringify(c)) this.render(i, c, bet, false);
    });
  }

  async celebrateFull() {
    for (let i = 0; i < 15; i++) {
      const p = this.gpos(i);
      gsap.delayedCall(i * 0.05, () => this.fx.sparkBurst(p.x, p.y, 12, 300));
    }
    await wait(1000);
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
