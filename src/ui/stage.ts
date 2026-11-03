/**
 * Stage – Pixi application, responsive layout and screen-space celebrations.
 */
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import { Environment } from './environment';
import { FX } from './fx';
import { ReelsView, WIN_W } from './reels';
import { HideoutView } from './hideoutView';
import { LastStandView } from './lastStandView';
import { InfoBar } from './infoBar';
import { tex } from './assets';
import { goldText, plainText, raysTex, glowTex, FONT_TITLE } from './gfx';
import { sound } from '../audio/sound';

/** World design bounds (reel window is 0..1000 × 0..540). */
const WORLD = { x: -70, y: -270, w: 1140, h: 890 };

export class Stage {
  app = new Application();
  env = new Environment();
  world = new Container();
  logo!: Sprite;
  info = new InfoBar();
  fx = new FX(); // world-space fx
  sfx = new FX(); // screen-space fx
  screen = new Container(); // screen-space overlays
  reels!: ReelsView;
  hideout!: HideoutView;
  laststand!: LastStandView;
  w = 1;
  h = 1;

  async init(parent: HTMLElement) {
    await this.app.init({ resizeTo: window, background: '#120804', antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
    parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.env, this.world, this.sfx, this.screen);

    this.logo = new Sprite(tex('logo'));
    this.logo.anchor.set(0.5);
    this.logo.scale.set(500 / this.logo.texture.width);
    this.logo.position.set(WIN_W / 2, -150);
    this.reels = new ReelsView(this.fx);
    this.hideout = new HideoutView(this.fx);
    this.laststand = new LastStandView(this.fx);
    this.info.position.set(WIN_W / 2, -140);
    this.world.addChild(this.reels, this.hideout, this.laststand, this.logo, this.info, this.fx);
    this.hideout.visible = false;
    this.laststand.visible = false;
    gsap.to(this.logo, { rotation: 0.012, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    this.env.set('base', true);
    window.addEventListener('resize', () => this.layout());
    window.addEventListener('orientationchange', () => setTimeout(() => this.layout(), 200));
    this.layout();
  }

  /** Fit the world into the area not covered by the DOM HUD / buy buttons. */
  layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.w = w;
    this.h = h;
    this.env.resize(w, h);
    const hud = document.getElementById('hud');
    const buy = document.getElementById('buy');
    const hudH = hud && !hud.classList.contains('hidden') ? hud.getBoundingClientRect().height : 0;
    let left = 0;
    let bottom = hudH;
    if (buy && !buy.classList.contains('hidden')) {
      const r = buy.getBoundingClientRect();
      if (r.width < w * 0.6) left = r.right + 8; // column (landscape)
      else bottom = h - r.top + 6; // row (portrait)
    }
    const top = 24;
    const availW = w - left * 2; // keep centred
    const availH = h - bottom - top;
    const portrait = availH > availW * 1.15;
    if (portrait) {
      // tall screens: reels fill the width, logo / feature bar float above them
      const R = { x: -50, y: -45, w: 1100, h: 640 };
      const s = Math.min(availW / R.w, (availH * 0.62) / R.h);
      this.world.scale.set(s);
      const reelsTop = top + availH * 0.6 - (R.h * s) / 2;
      this.world.position.set(w / 2 - (R.x + R.w / 2) * s, reelsTop - R.y * s);
      // logo/info centred in the free space above the reels (in world units)
      const freeTop = (top + 10 - this.world.y) / s;
      const freeBottom = R.y - 10;
      const mid = (freeTop + freeBottom) / 2;
      const room = freeBottom - freeTop;
      this.logo.y = mid;
      this.logo.scale.set(Math.min(1100, room * 2.6) / this.logo.texture.width);
      this.info.y = mid;
      this.info.scale.set(Math.min(1, room / 130));
    } else {
      const s = Math.min(availW / WORLD.w, availH / WORLD.h);
      this.world.scale.set(s);
      this.world.position.set(w / 2 - (WORLD.x + WORLD.w / 2) * s, top + availH / 2 - (WORLD.y + WORLD.h / 2) * s);
      this.logo.y = -150;
      this.logo.scale.set(500 / this.logo.texture.width);
      this.info.y = -140;
      this.info.scale.set(1);
    }
    // fx inside world uses world-local coordinates relative to the world parent
    for (const v of [this.reels, this.hideout, this.laststand]) v.position.set(0, 0);
  }

  /** Convert world child coordinates for FX that live in world space. */
  setMode(mode: 'reels' | 'hideout' | 'laststand') {
    this.reels.visible = mode === 'reels';
    this.hideout.visible = mode === 'hideout';
    this.laststand.visible = mode === 'laststand';
  }

  // ----------------------------------------------------------- transitions
  async transition(midway: () => void | Promise<void>) {
    sound.play('transition');
    const cover = new Graphics().rect(0, 0, this.w, this.h).fill(0x120804);
    cover.alpha = 0;
    this.screen.addChild(cover);
    for (let i = 0; i < 16; i++) this.sfx.dustBurst(Math.random() * this.w, this.h * (0.4 + Math.random() * 0.6), 3, 300);
    await gsap.to(cover, { alpha: 1, duration: 0.55, ease: 'power2.in' });
    await midway();
    this.layout();
    await gsap.to(cover, { alpha: 0, duration: 0.6, ease: 'power2.out' });
    cover.destroy();
  }

  // ----------------------------------------------------------- banners
  /** Character entrance banner for random events. */
  async eventBanner(kind: 'arrival' | 'raid') {
    const layer = new Container();
    this.screen.addChild(layer);
    const dim = new Graphics().rect(0, 0, this.w, this.h).fill({ color: 0x000000, alpha: 0.45 });
    dim.alpha = 0;
    layer.addChild(dim);
    gsap.to(dim, { alpha: 1, duration: 0.3 });
    const unit = Math.min(this.w, this.h);
    const title = new Text({
      text: kind === 'arrival' ? "LAMPIÃO'S ARRIVAL!" : "THE CANGACEIROS' RAID!",
      style: { fontFamily: FONT_TITLE, fontSize: Math.max(30, unit * 0.075), fill: kind === 'arrival' ? '#ffd760' : '#ff6a4a', stroke: { color: '#2a0d02', width: 8 }, dropShadow: { color: '#000', blur: 8, distance: 4, alpha: 0.8, angle: Math.PI / 2 }, align: 'center', wordWrap: true, wordWrapWidth: this.w * 0.9 },
      anchor: 0.5,
    });
    title.position.set(this.w / 2, this.h * 0.24);
    layer.addChild(title);
    gsap.from(title.scale, { x: 2.5, y: 2.5, duration: 0.45, ease: 'back.out(2)' });
    gsap.from(title, { alpha: 0, duration: 0.3 });

    if (kind === 'arrival') {
      sound.play('arrival');
      const glow = new Sprite(glowTex());
      glow.anchor.set(0.5);
      glow.blendMode = 'add';
      glow.position.set(this.w / 2, this.h * 0.58);
      glow.scale.set(unit / 256 * 1.4);
      const rays = new Sprite(raysTex());
      rays.anchor.set(0.5);
      rays.blendMode = 'add';
      rays.position.copyFrom(glow.position);
      rays.scale.set(unit / 512 * 1.6);
      rays.alpha = 0.6;
      const lamp = new Sprite(tex('sym_wild'));
      lamp.anchor.set(0.5);
      const k = (unit * 0.55) / lamp.texture.height;
      lamp.scale.set(k);
      lamp.position.set(-lamp.width, this.h * 0.6);
      layer.addChild(rays, glow, lamp);
      gsap.to(rays, { rotation: 1.2, duration: 2.2 });
      await gsap.to(lamp, { x: this.w / 2, duration: 0.55, ease: 'back.out(1.2)' });
      this.sfx.dustBurst(this.w / 2, this.h * 0.85, 14, 400);
      this.sfx.sparkBurst(this.w / 2, this.h * 0.55, 40, 600);
      await gsap.to(lamp.scale, { x: k * 1.08, y: k * 1.08, duration: 0.25, yoyo: true, repeat: 1 });
      await wait(500);
      await gsap.to(lamp, { y: -lamp.height, alpha: 0, duration: 0.45, ease: 'power2.in' });
    } else {
      sound.play('raid');
      // riders: scarves and hats racing across the screen
      const items: Sprite[] = [];
      for (let i = 0; i < 9; i++) {
        const s = new Sprite(tex(i % 3 === 0 ? 'hat_straps' : 'scarf'));
        s.anchor.set(0.5);
        s.scale.set((unit * (0.1 + Math.random() * 0.08)) / s.texture.height);
        s.position.set(this.w + 200 + i * 120, this.h * (0.4 + Math.random() * 0.4));
        s.rotation = (Math.random() - 0.5) * 0.6;
        layer.addChild(s);
        items.push(s);
        gsap.to(s, { x: -300, duration: 1.3 + Math.random() * 0.4, delay: i * 0.06, ease: 'none' });
        gsap.to(s, { y: s.y - 30, duration: 0.18, yoyo: true, repeat: 7, ease: 'sine.inOut' });
      }
      for (let i = 0; i < 10; i++) gsap.delayedCall(i * 0.12, () => this.sfx.dustBurst(this.w - i * this.w * 0.1, this.h * 0.85, 4, 260));
      await wait(1600);
      items.forEach((s) => gsap.killTweensOf(s));
    }
    await gsap.to(layer, { alpha: 0, duration: 0.3 });
    layer.destroy({ children: true });
  }

  /** Big / Mega / Epic win celebration with count-up. Click to skip. */
  async bigWin(amountCents: number, betCents: number, fmt: (c: number) => string) {
    const x = amountCents / betCents;
    const tier = x >= 100 ? 'EPIC WIN' : x >= 40 ? 'MEGA WIN' : 'BIG WIN';
    const dur = x >= 100 ? 6 : x >= 40 ? 4.5 : 3;
    const layer = new Container();
    layer.eventMode = 'static';
    this.screen.addChild(layer);
    const dim = new Graphics().rect(0, 0, this.w, this.h).fill({ color: 0x0a0402, alpha: 0.72 });
    layer.addChild(dim);
    const unit = Math.min(this.w, this.h);
    const rays = new Sprite(raysTex());
    rays.anchor.set(0.5);
    rays.blendMode = 'add';
    rays.position.set(this.w / 2, this.h * 0.45);
    rays.scale.set((unit / 512) * 2.4);
    layer.addChild(rays);
    gsap.to(rays, { rotation: Math.PI * 2, duration: 14, repeat: -1, ease: 'none' });
    const emblem = new Sprite(tex('emblem_sun'));
    emblem.anchor.set(0.5);
    emblem.position.set(this.w / 2, this.h * 0.3);
    emblem.scale.set((unit * 0.28) / emblem.texture.height);
    layer.addChild(emblem);
    const t = goldText(tier, Math.max(42, unit * 0.12), FONT_TITLE);
    t.position.set(this.w / 2, this.h * 0.52);
    const amt = goldText(fmt(0), Math.max(40, unit * 0.1));
    amt.position.set(this.w / 2, this.h * 0.68);
    const tap = plainText('TAP TO CONTINUE', Math.max(14, unit * 0.025), '#f7c84a');
    tap.position.set(this.w / 2, this.h * 0.82);
    tap.alpha = 0;
    layer.addChild(t, amt, tap);
    gsap.from(t.scale, { x: 0, y: 0, duration: 0.7, ease: 'back.out(2.5)' });
    gsap.from(emblem.scale, { x: 0, y: 0, duration: 0.8, ease: 'back.out(2)' });
    gsap.to(t.scale, { x: 1.06, y: 1.06, duration: 0.5, yoyo: true, repeat: -1, delay: 0.7 });
    sound.play('bigWin');
    this.sfx.coinShower(this.w, this.h, Math.round(40 + dur * 15), dur);
    const counter = { v: 0 };
    let done = false;
    let tick = 0;
    const tw = gsap.to(counter, {
      v: amountCents,
      duration: dur,
      ease: 'power1.out',
      onUpdate: () => {
        amt.text = fmt(Math.round(counter.v));
        if (++tick % 4 === 0) sound.play('countTick', { pitch: 0.8 + (counter.v / amountCents) * 0.6 });
      },
    });
    await new Promise<void>((res) => {
      const finish = () => {
        if (done) return;
        done = true;
        tw.progress(1);
        amt.text = fmt(amountCents);
        sound.play('fanfare');
        gsap.fromTo(amt.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
        gsap.to(tap, { alpha: 1, duration: 0.3 });
        setTimeout(res, 1400);
      };
      tw.eventCallback('onComplete', finish);
      layer.on('pointertap', finish);
    });
    await gsap.to(layer, { alpha: 0, duration: 0.35 });
    gsap.killTweensOf(rays);
    gsap.killTweensOf(t.scale);
    layer.destroy({ children: true });
  }

  /** Short centred callout (e.g. "+5 SPINS", "COUPLE'S FORTUNE"). */
  async callout(text: string, sub = '', ms = 1400, icons: string[] = []) {
    const layer = new Container();
    this.screen.addChild(layer);
    const unit = Math.min(this.w, this.h);
    const glow = new Sprite(glowTex());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.position.set(this.w / 2, this.h * 0.42);
    glow.scale.set((unit / 256) * 1.5, (unit / 256) * 0.8);
    layer.addChild(glow);
    icons.forEach((name, i) => {
      const s = new Sprite(tex(name));
      s.anchor.set(0.5);
      s.scale.set((unit * 0.2) / s.texture.height);
      s.position.set(this.w / 2 + (i - (icons.length - 1) / 2) * unit * 0.22, this.h * 0.26);
      layer.addChild(s);
      gsap.from(s.scale, { x: 0, y: 0, duration: 0.5, delay: i * 0.12, ease: 'back.out(2)' });
    });
    const t = goldText(text, Math.max(34, unit * 0.085), FONT_TITLE);
    t.position.set(this.w / 2, this.h * 0.42);
    layer.addChild(t);
    if (sub) {
      const s2 = goldText(sub, Math.max(28, unit * 0.06));
      s2.position.set(this.w / 2, this.h * 0.53);
      layer.addChild(s2);
    }
    gsap.from(t.scale, { x: 0.2, y: 0.2, duration: 0.5, ease: 'back.out(3)' });
    this.sfx.sparkBurst(this.w / 2, this.h * 0.42, 30, 500);
    await wait(ms);
    await gsap.to(layer, { alpha: 0, duration: 0.3 });
    layer.destroy({ children: true });
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
