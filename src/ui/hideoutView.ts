/**
 * HideoutView – 12 chest interactive pick board. Renders states it receives
 * from the engine; a click only *requests* a pick (onPick), the engine decides.
 */
import { Container, Sprite, Text, Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { ChestPrize } from '../engine/features/hideout';
import type { PublicHideout } from '../engine/features/hideout';
import { tex } from './assets';
import { glowTex, goldText, plainText, frameTex, raysTex } from './gfx';
import type { FX } from './fx';
import { money } from './format';
import { sound } from '../audio/sound';
import { WIN_W, WIN_H, FRAME_PAD } from './reels';

const COLS = 4;
const CW = WIN_W / COLS;
const CH = WIN_H / 3;

class Chest extends Container {
  glow: Sprite;
  sprite: Sprite;
  prizeLayer = new Container();
  opened = false;
  baseScale = 1;
  constructor(public index: number) {
    super();
    this.glow = new Sprite(glowTex());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0.15;
    this.glow.scale.set(0.9, 0.6);
    this.glow.y = 10;
    this.sprite = new Sprite(tex('chest_closed'));
    this.sprite.anchor.set(0.5);
    this.baseScale = 132 / this.sprite.texture.height;
    this.sprite.scale.set(this.baseScale);
    this.addChild(this.glow, this.sprite, this.prizeLayer);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerover', () => {
      if (this.opened || !this.eventMode || this.eventMode === 'none') return;
      gsap.to(this.sprite.scale, { x: this.baseScale * 1.08, y: this.baseScale * 1.08, duration: 0.2 });
      gsap.to(this.glow, { alpha: 0.6, duration: 0.2 });
    });
    this.on('pointerout', () => {
      if (this.opened) return;
      gsap.to(this.sprite.scale, { x: this.baseScale, y: this.baseScale, duration: 0.2 });
      gsap.to(this.glow, { alpha: 0.15, duration: 0.2 });
    });
    // idle bob
    gsap.to(this.sprite, { y: -4, duration: 1.4 + Math.random() * 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: Math.random() });
  }
}

export function prizeVisual(p: ChestPrize, bet: number): { texture: string; title: string; value: string; color: string } {
  switch (p.type) {
    case 'coins':
      return { texture: 'coins_pile', title: 'GOLD', value: money(p.value * bet), color: '#ffe48a' };
    case 'multiplier':
      return { texture: 'coin_star', title: 'MULTIPLIER', value: `+${p.value}×`, color: '#ffd760' };
    case 'extraPick':
      return { texture: 'gem_star', title: 'EXTRA PICK', value: '+1', color: '#fff1b0' };
    case 'treasure':
      return { texture: 'chest_gems', title: "LAMPIÃO'S TREASURE", value: money(p.value * bet), color: '#ffcf5a' };
    case 'medallion':
      return { texture: 'medallion', title: "MARIA'S MEDALLION", value: 'MULT ×2', color: '#ff9d8a' };
    case 'empty':
      return { texture: '', title: 'EMPTY', value: '', color: '#b9a38a' };
  }
}

export class HideoutView extends Container {
  chests: Chest[] = [];
  onPick: (i: number) => void = () => {};
  private enabled = false;
  private bet = 100;

  constructor(private fx: FX) {
    super();
    const frame = new Sprite(frameTex('hideout', WIN_W, WIN_H, FRAME_PAD, 'wood'));
    frame.position.set(-FRAME_PAD, -FRAME_PAD);
    this.addChild(frame);
    for (let i = 0; i < 12; i++) {
      const c = new Chest(i);
      c.position.set((i % COLS) * CW + CW / 2, Math.floor(i / COLS) * CH + CH / 2 + 4);
      c.on('pointertap', () => {
        if (!this.enabled || c.opened) return;
        sound.play('click');
        this.onPick(i);
      });
      this.chests.push(c);
      this.addChild(c);
    }
  }

  setup(state: PublicHideout, bet: number) {
    this.bet = bet;
    state.chests.forEach((ch, i) => {
      const c = this.chests[i];
      c.opened = false;
      c.prizeLayer.removeChildren();
      c.sprite.texture = tex('chest_closed');
      c.sprite.alpha = 1;
      c.sprite.tint = 0xffffff;
      c.alpha = 1;
      if (ch.opened && ch.prize) this.showOpened(c, ch.prize, false);
    });
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    for (const c of this.chests) c.cursor = on && !c.opened ? 'pointer' : 'default';
  }

  private showOpened(c: Chest, prize: ChestPrize, animate: boolean, dim = false) {
    c.opened = true;
    c.cursor = 'default';
    gsap.killTweensOf(c.sprite);
    c.sprite.y = 0;
    const special = prize.type === 'treasure';
    c.sprite.texture = tex(prize.type === 'empty' ? 'chest_wood' : special ? 'chest_gems' : 'chest_open');
    c.sprite.scale.set(132 / c.sprite.texture.height);
    c.sprite.tint = prize.type === 'empty' ? 0x777066 : 0xb8a898;
    const vis = prizeVisual(prize, this.bet);
    const layer = c.prizeLayer;
    layer.removeChildren();
    if (vis.texture && prize.type !== 'treasure') {
      const icon = new Sprite(tex(vis.texture));
      icon.anchor.set(0.5);
      icon.scale.set(70 / icon.texture.height);
      icon.y = -44;
      layer.addChild(icon);
      if (animate) gsap.from(icon, { y: 10, alpha: 0, duration: 0.6, ease: 'back.out(2)' });
    }
    const title = plainText(vis.title, vis.title.length > 12 ? 13 : 16, vis.color);
    title.y = 56;
    const val: Text | null = vis.value ? goldText(vis.value, 32) : null;
    if (val) val.y = 16;
    const bgPill = new Graphics().roundRect(-CW / 2 + 16, 42, CW - 32, 28, 14).fill({ color: 0x120804, alpha: 0.7 });
    layer.addChild(bgPill, title);
    if (val) layer.addChild(val);
    if (dim) {
      c.alpha = 0.45;
      return;
    }
    c.glow.alpha = prize.type === 'empty' ? 0 : 0.7;
    if (animate && val) gsap.from(val.scale, { x: 0.2, y: 0.2, duration: 0.5, ease: 'back.out(3)', delay: 0.1 });
  }

  /** Engine-confirmed open animation. */
  async open(index: number, prize: ChestPrize) {
    const c = this.chests[index];
    const gx = this.x + c.x * this.scale.x;
    const gy = this.y + c.y * this.scale.y;
    await new Promise<void>((res) => {
      gsap.to(c.sprite, { rotation: 0.08, duration: 0.06, yoyo: true, repeat: 7, ease: 'sine.inOut', onComplete: () => res() });
    });
    c.sprite.rotation = 0;
    if (prize.type === 'empty') {
      sound.play('chestEmpty');
      this.fx.dustBurst(gx, gy, 8, 120);
    } else {
      sound.play(prize.type === 'treasure' || prize.type === 'medallion' ? 'treasure' : 'chestOpen');
      const rays = new Sprite(raysTex());
      rays.anchor.set(0.5);
      rays.blendMode = 'add';
      rays.position.set(c.x, c.y);
      rays.scale.set(0.2);
      this.addChildAt(rays, 1);
      gsap.to(rays.scale, { x: 0.9, y: 0.9, duration: 0.5, ease: 'power2.out' });
      gsap.to(rays, { rotation: 1, alpha: 0, duration: 1.4, delay: 0.3, onComplete: () => rays.destroy() });
      this.fx.flash(gx, gy, 2.4);
      this.fx.sparkBurst(gx, gy, prize.type === 'treasure' ? 50 : 26, 420);
      if (prize.type === 'coins' || prize.type === 'treasure') this.fx.coinFountain(gx, gy, prize.type === 'treasure' ? 30 : 12);
    }
    this.showOpened(c, prize, true);
    gsap.fromTo(c.sprite.scale, { x: c.sprite.scale.x * 1.25, y: c.sprite.scale.y * 1.25 }, { x: c.sprite.scale.x, y: c.sprite.scale.y, duration: 0.5, ease: 'back.out(3)' });
    await new Promise((r) => setTimeout(r, 650));
  }

  /** End of feature: show what the other chests contained. */
  async revealRest(board: ChestPrize[]) {
    let k = 0;
    for (let i = 0; i < board.length; i++) {
      const c = this.chests[i];
      if (c.opened) continue;
      gsap.delayedCall(k++ * 0.07, () => this.showOpened(c, board[i], false, true));
    }
    await new Promise((r) => setTimeout(r, k * 70 + 900));
  }
}
