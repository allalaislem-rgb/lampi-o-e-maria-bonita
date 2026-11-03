/**
 * HideoutView – 12-chest interactive pick board. A click only *requests* a pick
 * (onPick); the engine decides what the chest contains.
 */
import { Container, Sprite, Text, Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { ChestPrize, PublicHideout } from '../engine/features/hideout';
import { tex } from './assets';
import { T, goldText, plainText, destroyDeep } from './gfx';
import type { FX } from './fx';
import { money } from './format';
import { sound } from '../audio/sound';
import { WIN_W, WIN_H } from './reels';

const COLS = 4;
const CW = WIN_W / COLS;
const CH = WIN_H / 3;
const CHEST_H = 138;

class Chest extends Container {
  glow: Sprite;
  shadow: Graphics;
  sprite: Sprite;
  prizeLayer = new Container();
  opened = false;
  base = 1;
  bob: gsap.core.Tween | null = null;
  constructor(public index: number) {
    super();
    this.shadow = new Graphics().ellipse(0, CHEST_H * 0.46, 70, 12).fill({ color: 0x000000, alpha: 0.45 });
    this.glow = new Sprite(T.glow());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0.12;
    this.glow.scale.set(2.2, 1.7);
    this.glow.tint = 0xffb040;
    this.sprite = new Sprite(tex('chest_closed'));
    this.sprite.anchor.set(0.5);
    this.base = CHEST_H / (this.sprite.texture.height / 2.0) / 2.0;
    this.setTex('chest_closed');
    this.addChild(this.shadow, this.glow, this.sprite, this.prizeLayer);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.bob = gsap.to(this.sprite, { y: -5, duration: 1.3 + Math.random() * 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: Math.random() });
  }
  setTex(name: string) {
    this.sprite.texture = tex(name);
    const k = CHEST_H / this.sprite.texture.height;
    this.base = k;
    this.sprite.scale.set(k);
  }
  hover(on: boolean) {
    if (this.opened) return;
    gsap.to(this.sprite.scale, { x: this.base * (on ? 1.1 : 1), y: this.base * (on ? 1.1 : 1), duration: 0.2, ease: 'back.out(2)' });
    gsap.to(this.glow, { alpha: on ? 0.75 : 0.12, duration: 0.2 });
  }
}

export function prizeVisual(p: ChestPrize, bet: number): { texture: string; title: string; value: string; color: string } {
  switch (p.type) {
    case 'coins':
      return { texture: 'coins_pile', title: 'OURO', value: money(p.value * bet), color: '#ffe48a' };
    case 'multiplier':
      return { texture: 'token_mult', title: 'MULTIPLICADOR', value: `+${p.value}×`, color: '#ffb0a0' };
    case 'extraPick':
      return { texture: 'gold_star', title: 'ESCOLHA EXTRA', value: '+1', color: '#fff1b0' };
    case 'treasure':
      return { texture: 'chest_treasure', title: 'TESOURO DE LAMPIÃO', value: money(p.value * bet), color: '#ffcf5a' };
    case 'medallion':
      return { texture: 'medallion', title: 'MEDALHÃO DE MARIA', value: '×2', color: '#ff9d8a' };
    case 'empty':
      return { texture: '', title: 'VAZIO', value: '', color: '#b9a38a' };
  }
}

export class HideoutView extends Container {
  chests: Chest[] = [];
  frame: Sprite;
  onPick: (i: number) => void = () => {};
  private enabled = false;
  private bet = 100;

  constructor(private fx: FX) {
    super();
    this.frame = new Sprite(tex('frame_hideout'));
    this.frame.width = 1120;
    this.frame.height = 710;
    this.frame.position.set(-60, -110);
    this.addChild(this.frame);
    for (let i = 0; i < 12; i++) {
      const c = new Chest(i);
      c.position.set((i % COLS) * CW + CW / 2, Math.floor(i / COLS) * CH + CH / 2 + 2);
      c.on('pointerover', () => {
        if (!this.enabled || c.opened) return;
        c.hover(true);
        sound.play('chest_hover', { rate: 0.9 + Math.random() * 0.2 });
      });
      c.on('pointerout', () => c.hover(false));
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
      c.prizeLayer.removeChildren().forEach((x) => destroyDeep(x));
      c.setTex('chest_closed');
      c.sprite.tint = 0xffffff;
      c.alpha = 1;
      c.glow.alpha = 0.12;
      if (ch.opened && ch.prize) this.showOpened(c, ch.prize, false);
    });
  }

  /** Staggered entrance of the chests. */
  entrance() {
    this.chests.forEach((c, i) => {
      gsap.fromTo(c, { y: c.y - 60, alpha: 0 }, { y: c.y, alpha: 1, duration: 0.5, delay: 0.05 * i, ease: 'bounce.out' });
    });
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    for (const c of this.chests) c.cursor = on && !c.opened ? 'pointer' : 'default';
  }

  private showOpened(c: Chest, prize: ChestPrize, animate: boolean, dim = false) {
    c.opened = true;
    c.cursor = 'default';
    c.bob?.kill();
    c.sprite.y = 0;
    c.setTex(prize.type === 'empty' ? 'chest_empty' : prize.type === 'treasure' ? 'chest_treasure' : 'chest_open');
    if (prize.type !== 'treasure') c.sprite.tint = 0xb8a090;
    const vis = prizeVisual(prize, this.bet);
    const layer = c.prizeLayer;
    layer.removeChildren().forEach((x) => destroyDeep(x));
    if (vis.texture && prize.type !== 'treasure') {
      const icon = new Sprite(tex(vis.texture));
      icon.anchor.set(0.5);
      icon.scale.set(78 / icon.texture.height);
      icon.y = -34;
      layer.addChild(icon);
      if (prize.type === 'multiplier') {
        const t = goldText(vis.value, 30);
        t.y = -34;
        layer.addChild(t);
      }
      if (animate) gsap.from(icon, { y: 20, alpha: 0, duration: 0.6, ease: 'back.out(2)' });
    }
    const pill = new Graphics().roundRect(-CW / 2 + 14, 38, CW - 28, 30, 15).fill({ color: 0x120804, alpha: 0.78 }).stroke({ width: 1.5, color: 0xc98a1c, alpha: 0.8 });
    const title = plainText(vis.title, vis.title.length > 12 ? 13 : 16, vis.color);
    title.y = 53;
    layer.addChild(pill, title);
    let val: Text | null = null;
    if (vis.value && prize.type !== 'multiplier') {
      val = goldText(vis.value, 32);
      val.y = 14;
      layer.addChild(val);
    }
    if (dim) {
      c.alpha = 0.42;
      return;
    }
    c.glow.alpha = prize.type === 'empty' ? 0 : 0.6;
    if (animate && val) gsap.from(val.scale, { x: 0.2, y: 0.2, duration: 0.5, ease: 'back.out(3)', delay: 0.1 });
  }

  /** Engine-confirmed opening animation. */
  async open(index: number, prize: ChestPrize) {
    const c = this.chests[index];
    const gx = this.x + c.x * this.scale.x;
    const gy = this.y + c.y * this.scale.y;
    c.bob?.kill();
    // anticipation: rattle with rising glow
    await new Promise<void>((res) => {
      gsap.to(c.glow, { alpha: 0.9, duration: 0.45 });
      gsap.to(c.sprite, { rotation: 0.07, duration: 0.05, yoyo: true, repeat: 9, ease: 'sine.inOut', onComplete: () => res() });
    });
    c.sprite.rotation = 0;
    if (prize.type === 'empty') {
      sound.play('chest_empty');
      this.fx.dustBurst(gx, gy - 20, 10, 140);
    } else {
      sound.play(prize.type === 'treasure' || prize.type === 'medallion' ? 'treasure' : 'chest_open');
      const rays = new Sprite(T.rays());
      rays.anchor.set(0.5);
      rays.blendMode = 'add';
      rays.tint = 0xffd070;
      rays.position.set(c.x, c.y - 20);
      rays.scale.set(0.15);
      this.addChildAt(rays, 1);
      gsap.to(rays.scale, { x: 0.75, y: 0.75, duration: 0.45, ease: 'power2.out' });
      gsap.to(rays, { rotation: 1.2, alpha: 0, duration: 1.4, delay: 0.3, onComplete: () => rays.destroy() });
      this.fx.flash(gx, gy - 20, 2.2);
      this.fx.ring(gx, gy - 20, 1.2);
      this.fx.sparkBurst(gx, gy - 20, prize.type === 'treasure' ? 50 : 26, 420);
      if (prize.type === 'coins' || prize.type === 'treasure') this.fx.coinFountain(gx, gy - 20, prize.type === 'treasure' ? 30 : 12, 0.8);
    }
    this.showOpened(c, prize, true);
    gsap.fromTo(c.sprite.scale, { x: c.base * 1.25, y: c.base * 1.25 }, { x: c.base, y: c.base, duration: 0.5, ease: 'back.out(3)' });
    await new Promise((r) => setTimeout(r, 600));
  }

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
