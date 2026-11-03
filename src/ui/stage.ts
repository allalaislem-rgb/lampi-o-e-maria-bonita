/**
 * Stage – Pixi application, responsive layout, cinematic transitions,
 * bonus intro sequences, random-event banners and tiered win celebrations.
 */
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import { Environment } from './environment';
import { FX } from './fx';
import { ReelsView, WIN_W } from './reels';
import { HideoutView } from './hideoutView';
import { LastStandView } from './lastStandView';
import { InfoBar } from './infoBar';
import { tex, seq } from './assets';
import { goldText, plainText, T, FONT_TITLE, destroyDeep } from './gfx';
import { sound } from '../audio/sound';

/** World design bounds (reel window is 0..1000 × 0..540, frame extends to -60..1060 × -110..600). */
const WORLD = { x: -70, y: -300, w: 1140, h: 910 };
const LOGO_W = 440;

export class Stage {
  app = new Application();
  env = new Environment();
  world = new Container();
  logo!: Sprite;
  info = new InfoBar();
  fx = new FX();
  sfx = new FX();
  screen = new Container();
  reels!: ReelsView;
  hideout!: HideoutView;
  laststand!: LastStandView;
  w = 1;
  h = 1;
  private logoBase = 1;

  async init(parent: HTMLElement) {
    await this.app.init({ resizeTo: window, background: '#120804', antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true, powerPreference: 'high-performance' });
    parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.env, this.world, this.sfx, this.screen);

    this.logo = new Sprite(tex('logo'));
    this.logo.anchor.set(0.5);
    this.reels = new ReelsView(this.fx);
    this.hideout = new HideoutView(this.fx);
    this.laststand = new LastStandView(this.fx);
    this.world.addChild(this.reels, this.hideout, this.laststand, this.logo, this.info, this.fx);
    this.hideout.visible = false;
    this.laststand.visible = false;
    gsap.to(this.logo, { rotation: 0.01, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    const glint = () => {
      if (this.logo.visible) {
        const p = this.logo.getGlobalPosition();
        const s = this.world.scale.x * this.logo.scale.x;
        this.sfx.spawn(T.spark(), p.x + (Math.random() - 0.5) * this.logo.texture.width * s * 0.75, p.y + (Math.random() - 0.3) * this.logo.texture.height * s * 0.4, { life: 0.8, scale: 0.05, grow: 0.6, add: true, vr: 2 });
      }
      gsap.delayedCall(1.4 + Math.random() * 2.4, glint);
    };
    glint();

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
    if (buy && !buy.classList.contains('hidden') && buy.offsetParent !== null) {
      const r = buy.getBoundingClientRect();
      if (r.width < w * 0.6) left = r.right + 8;
      else bottom = h - r.top + 6;
    }
    const top = 18;
    const availW = w - left * 2;
    const availH = h - bottom - top;
    const portrait = availH > availW * 1.15;
    if (portrait) {
      const R = { x: -64, y: -112, w: 1128, h: 716 };
      const s = Math.min(availW / R.w, (availH * 0.64) / R.h);
      this.world.scale.set(s);
      const reelsTop = top + availH * 0.6 - (R.h * s) / 2;
      this.world.position.set(w / 2 - (R.x + R.w / 2) * s, reelsTop - R.y * s);
      const freeTop = (top + 6 - this.world.y) / s;
      const freeBottom = R.y - 6;
      const mid = (freeTop + freeBottom) / 2;
      const room = freeBottom - freeTop;
      this.logo.position.set(WIN_W / 2, mid);
      this.logoBase = Math.min(1100, room * 2.3) / this.logo.texture.width;
      this.logo.scale.set(this.logoBase);
      this.info.position.set(WIN_W / 2, mid);
      this.info.scale.set(Math.min(1, room / 130));
    } else {
      const s = Math.min(availW / WORLD.w, availH / WORLD.h);
      this.world.scale.set(s);
      this.world.position.set(w / 2 - (WORLD.x + WORLD.w / 2) * s, top + availH / 2 - (WORLD.y + WORLD.h / 2) * s);
      this.logo.position.set(WIN_W / 2, -200);
      this.logoBase = LOGO_W / this.logo.texture.width;
      this.logo.scale.set(this.logoBase);
      this.info.position.set(WIN_W / 2, -180);
      this.info.scale.set(1);
    }
  }

  setMode(mode: 'reels' | 'hideout' | 'laststand') {
    this.reels.visible = mode === 'reels';
    this.hideout.visible = mode === 'hideout';
    this.laststand.visible = mode === 'laststand';
  }

  shake(px = 10, dur = 0.4) {
    const ox = this.world.x;
    const oy = this.world.y;
    const p = { k: 1 };
    gsap.to(p, { k: 0, duration: dur, ease: 'power2.out', onUpdate: () => this.world.position.set(ox + (Math.random() - 0.5) * px * p.k, oy + (Math.random() - 0.5) * px * p.k), onComplete: () => this.world.position.set(ox, oy) });
  }

  // ----------------------------------------------------------- transitions
  async transition(midway: () => void | Promise<void>) {
    sound.play('transition');
    const cover = new Graphics().rect(0, 0, this.w, this.h).fill(0x1a0a04);
    cover.alpha = 0;
    this.screen.addChild(cover);
    for (let i = 0; i < 26; i++) {
      gsap.delayedCall(i * 0.02, () => this.sfx.spawn(T.dust(), this.w + 100, this.h * Math.random(), { vx: -this.w * 1.6, life: 1.2, scale: 2 + Math.random() * 2, alpha: 0.85, tint: 0xc89060, rot: Math.random() * 6 }));
    }
    await gsap.to(cover, { alpha: 1, duration: 0.5, ease: 'power2.in' });
    await midway();
    this.layout();
    await gsap.to(cover, { alpha: 0, duration: 0.65, ease: 'power2.out' });
    cover.destroy();
  }

  private letterbox() {
    const h = this.h * 0.11;
    const top = new Graphics().rect(0, 0, this.w, h).fill(0x000000);
    const bot = new Graphics().rect(0, 0, this.w, h).fill(0x000000);
    bot.y = this.h;
    top.y = -h;
    this.screen.addChild(top, bot);
    gsap.to(top, { y: 0, duration: 0.4, ease: 'power2.out' });
    gsap.to(bot, { y: this.h - h, duration: 0.4, ease: 'power2.out' });
    return async () => {
      await Promise.all([gsap.to(top, { y: -h, duration: 0.4 }), gsap.to(bot, { y: this.h, duration: 0.4 })]);
      top.destroy();
      bot.destroy();
    };
  }

  private titleSlam(name: string, y: number, maxW: number) {
    const t = new Sprite(tex(name));
    t.anchor.set(0.5);
    const k = Math.min(maxW / t.texture.width, (this.h * 0.36) / t.texture.height);
    t.scale.set(k * 2.4);
    t.alpha = 0;
    t.position.set(this.w / 2, y);
    this.screen.addChild(t);
    gsap.to(t, { alpha: 1, duration: 0.15 });
    gsap.to(t.scale, { x: k, y: k, duration: 0.45, ease: 'back.out(1.6)' });
    return t;
  }

  /** Cinematic introduction – each bonus has its own visual language. */
  async bonusIntro(kind: 'escape' | 'hideout' | 'laststand') {
    const layer = new Container();
    this.screen.addChild(layer);
    const unit = Math.min(this.w, this.h);
    const close = this.letterbox();
    let title: Sprite;
    if (kind === 'escape') {
      sound.play('intro_escape');
      for (let i = 0; i < 40; i++) {
        gsap.delayedCall(i * 0.03, () => this.sfx.spawn(T.streak(), this.w + 200, this.h * Math.random(), { vx: -this.w * 2.4, life: 0.7, scale: 1 + Math.random() * 2, sy: 0.6, add: true, tint: 0xffc080, alpha: 0.6 }));
      }
      for (let i = 0; i < 4; i++) {
        const r = new Sprite(tex('rider'));
        r.anchor.set(0.5, 1);
        r.scale.set((unit / 900) * (0.9 + i * 0.15));
        r.tint = 0x1a0604;
        r.position.set(-r.width - i * 220, this.h * (0.9 + i * 0.02));
        layer.addChild(r);
        gsap.to(r, { x: this.w + r.width, duration: 1.6, delay: i * 0.08, ease: 'none' });
        gsap.to(r, { y: r.y - 14, duration: 0.16, yoyo: true, repeat: 9, ease: 'sine.inOut' });
        gsap.delayedCall(0.2 + i * 0.2, () => this.sfx.dustBurst(this.w * (0.2 + i * 0.2), this.h * 0.86, 6, 260));
      }
      await wait(700);
      title = this.titleSlam('title_escape_lg', this.h * 0.45, this.w * 0.62);
      gsap.delayedCall(0.4, () => this.shake(14));
    } else if (kind === 'hideout') {
      sound.play('intro_hideout');
      const dark = new Graphics().rect(0, 0, this.w, this.h).fill(0x000000);
      layer.addChild(dark);
      const bloom = new Sprite(T.glow());
      bloom.anchor.set(0.5);
      bloom.blendMode = 'add';
      bloom.tint = 0xffb040;
      bloom.position.set(this.w / 2, this.h / 2);
      bloom.scale.set(0.2);
      layer.addChild(bloom);
      gsap.to(bloom.scale, { x: unit / 60, y: unit / 60, duration: 1.6, ease: 'power2.out' });
      gsap.to(bloom, { alpha: 0, duration: 1.2, delay: 1.0 });
      gsap.to(dark, { alpha: 0, duration: 1.5, delay: 0.3, ease: 'sine.inOut' });
      for (let i = 0; i < 40; i++) this.sfx.spawn(T.dot(), this.w / 2 + (Math.random() - 0.5) * unit, this.h / 2 + (Math.random() - 0.5) * unit * 0.6, { vy: -20 - Math.random() * 30, life: 2.2, scale: 0.4 + Math.random(), add: true, tint: 0xffd890, fadeIn: 0.6, alpha: 0.7 });
      await wait(650);
      title = this.titleSlam('title_hideout_lg', this.h * 0.45, this.w * 0.62);
      this.characterCameo('maria_', 6, -1, 0.75);
    } else {
      sound.play('intro_last');
      this.env.lightning();
      const flash = new Graphics().rect(0, 0, this.w, this.h).fill(0xffffff);
      layer.addChild(flash);
      flash.alpha = 0;
      gsap.timeline().to(flash, { alpha: 0.9, duration: 0.05 }).to(flash, { alpha: 0, duration: 0.25 }).to(flash, { alpha: 0.6, duration: 0.05, delay: 0.2 }).to(flash, { alpha: 0, duration: 0.6 });
      for (let i = 0; i < 4; i++) gsap.delayedCall(0.3 + i * 0.15, () => this.sfx.embers(0, this.h, this.w, 25, 0xff6a1a));
      await wait(1100);
      title = this.titleSlam('title_last_lg', this.h * 0.45, this.w * 0.62);
      this.characterCameo('lamp_', 6, 1, 0.75);
      gsap.delayedCall(0.38, () => {
        this.shake(22, 0.6);
        this.sfx.ring(this.w / 2, this.h * 0.45, unit / 120, 0xff8040);
      });
    }
    gsap.delayedCall(0.55, () => {
      const sh = new Sprite(T.shine());
      sh.anchor.set(0.5);
      sh.blendMode = 'add';
      sh.scale.set(2, (title.height / 256) * 1.4);
      sh.rotation = 0.3;
      sh.position.set(title.x - title.width / 2, title.y);
      const m = new Graphics().rect(title.x - title.width / 2, title.y - title.height / 2, title.width, title.height).fill(0xffffff);
      sh.mask = m;
      this.screen.addChild(m, sh);
      gsap.to(sh, {
        x: title.x + title.width / 2,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: () => {
          sh.destroy();
          m.destroy();
        },
      });
    });
    this.sfx.sparkBurst(this.w / 2, this.h * 0.45, 40, 700);
    await wait(1700);
    await gsap.to(title!, { alpha: 0, y: title!.y - 30, duration: 0.35 });
    destroyDeep(title!);
    await close();
    destroyDeep(layer);
  }

  /** Character slides in beside the title and plays its painted frame loop. */
  private characterCameo(prefix: string, n: number, side: 1 | -1, size = 0.7) {
    const frames = seq(prefix, n);
    const s = new Sprite(frames[0]);
    s.anchor.set(0.5, 1);
    const k = (Math.min(this.w, this.h) * size) / frames[0].height;
    s.scale.set(k * (side < 0 ? 1 : 1), k);
    const tx = this.w / 2 + side * Math.min(this.w * 0.36, this.w / 2 - s.width * 0.3);
    s.position.set(tx + side * this.w * 0.4, this.h * 0.98);
    this.screen.addChild(s);
    gsap.to(s, { x: tx, duration: 0.5, ease: 'back.out(1.2)' });
    const st = { f: 0 };
    gsap.to(st, { f: n - 1, duration: 1.4, delay: 0.3, ease: 'none', onUpdate: () => (s.texture = frames[Math.round(st.f)]) });
    gsap.delayedCall(2.4, () => void gsap.to(s, { x: tx + side * this.w * 0.4, alpha: 0, duration: 0.4, ease: 'power2.in', onComplete: () => destroyDeep(s) }));
  }

  // ----------------------------------------------------------- banners
  async eventBanner(kind: 'arrival' | 'raid') {
    const layer = new Container();
    this.screen.addChild(layer);
    const dim = new Graphics().rect(0, 0, this.w, this.h).fill({ color: 0x000000, alpha: 0.5 });
    dim.alpha = 0;
    layer.addChild(dim);
    gsap.to(dim, { alpha: 1, duration: 0.25 });
    const unit = Math.min(this.w, this.h);
    const title = new Text({
      text: kind === 'arrival' ? 'A CHEGADA DE LAMPIÃO!' : 'O ATAQUE DOS CANGACEIROS!',
      style: { fontFamily: FONT_TITLE, fontSize: Math.max(30, unit * 0.08), fill: kind === 'arrival' ? '#ffd760' : '#ff7a5a', stroke: { color: '#2a0d02', width: 9 }, dropShadow: { color: '#000', blur: 8, distance: 4, alpha: 0.8, angle: Math.PI / 2 }, align: 'center', wordWrap: true, wordWrapWidth: this.w * 0.9, padding: 10 },
      anchor: 0.5,
      resolution: 2,
    });
    title.position.set(this.w / 2, this.h * 0.22);
    layer.addChild(title);
    gsap.from(title.scale, { x: 2.6, y: 2.6, duration: 0.45, ease: 'back.out(2)' });
    gsap.from(title, { alpha: 0, duration: 0.25 });

    if (kind === 'arrival') {
      sound.play('transform');
      const rays = new Sprite(T.rays());
      rays.anchor.set(0.5);
      rays.blendMode = 'add';
      rays.tint = 0xffc060;
      rays.position.set(this.w / 2, this.h * 0.6);
      rays.scale.set((unit / 512) * 1.8);
      rays.alpha = 0.7;
      layer.addChild(rays);
      gsap.to(rays, { rotation: 1.4, duration: 2.6 });
      // Lampião draws, aims and fires (painted frame sequence)
      const frames = seq('lamp_', 6);
      const lamp = new Sprite(frames[0]);
      lamp.anchor.set(0.5, 0.55);
      const k = (unit * 0.5) / frames[0].height;
      lamp.scale.set(k);
      lamp.position.set(-lamp.width, this.h * 0.62);
      layer.addChild(lamp);
      await gsap.to(lamp, { x: this.w / 2 - unit * 0.06, duration: 0.45, ease: 'back.out(1.3)' });
      this.sfx.dustBurst(this.w / 2, this.h * 0.9, 12, 380);
      const step = { f: 0 };
      await gsap.to(step, { f: 5, duration: 0.75, ease: 'none', onUpdate: () => (lamp.texture = frames[Math.round(step.f)]) });
      // shot!
      const mx = lamp.x + lamp.width * 0.42;
      const my = lamp.y - lamp.height * 0.02;
      sound.play('arrival');
      this.shake(18);
      const flash = this.sfx.spawn(tex('muzzle_1'), mx, my, { life: 0.25, scale: k * 0.7, add: true });
      void flash;
      this.sfx.spawn(tex('blast_1'), mx + unit * 0.05, my, { life: 0.55, scale: k * 0.6, add: true, grow: 0.5 });
      for (let i = 0; i < 4; i++) this.sfx.spawn(tex(`smoke_${i}`), mx + unit * 0.04, my, { vx: 80 + Math.random() * 120, vy: -40 - Math.random() * 60, life: 1.3, scale: k * 0.45, alpha: 0.7, grow: 0.3, drag: 1 });
      for (let i = 0; i < 3; i++) this.sfx.spawn(tex(i % 2 ? 'casing_1' : 'casing_2'), lamp.x + lamp.width * 0.15, my, { vx: -120 - Math.random() * 160, vy: -380 - Math.random() * 120, g: 1400, life: 1.0, scale: k * 0.22, vr: 12 });
      this.sfx.sparkBurst(mx, my, 30, 520);
      gsap.to(lamp, { x: lamp.x - unit * 0.02, duration: 0.06, yoyo: true, repeat: 1 });
      await wait(700);
      await gsap.to(lamp, { y: -lamp.height, alpha: 0, duration: 0.4, ease: 'power2.in' });
    } else {
      sound.play('raid');
      for (let i = 0; i < 10; i++) {
        const isHat = i % 3 === 0;
        const s = new Sprite(tex(isHat ? 'sym_hat' : 'scarf'));
        s.anchor.set(0.5);
        s.scale.set((unit * (isHat ? 0.16 : 0.12)) / s.texture.height);
        s.position.set(this.w + 200 + i * 130, this.h * (0.38 + Math.random() * 0.42));
        s.rotation = (Math.random() - 0.5) * 0.6;
        layer.addChild(s);
        gsap.to(s, { x: -300, duration: 1.25 + Math.random() * 0.35, delay: i * 0.06, ease: 'none' });
        gsap.to(s, { y: s.y - 30, rotation: s.rotation + 0.3, duration: 0.18, yoyo: true, repeat: 7, ease: 'sine.inOut' });
      }
      for (let i = 0; i < 10; i++) gsap.delayedCall(i * 0.12, () => this.sfx.dustBurst(this.w - i * this.w * 0.1, this.h * 0.86, 4, 280));
      await wait(1600);
    }
    await gsap.to(layer, { alpha: 0, duration: 0.3 });
    destroyDeep(layer);
  }

  /**
   * Tiered win celebration: BIG (≥15×) → MEGA (≥40×) → EPIC (≥100×).
   * The count-up escalates through the tiers. Tap to skip to the final amount.
   */
  async bigWin(amountCents: number, betCents: number, fmt: (c: number) => string) {
    const x = amountCents / betCents;
    const tiers: { at: number; name: string }[] = [{ at: 0, name: 'win_big' }];
    if (x >= 40) tiers.push({ at: 40 * betCents, name: 'win_mega' });
    if (x >= 100) tiers.push({ at: 100 * betCents, name: 'win_epic' });
    const dur = 2.6 + (tiers.length - 1) * 2.2;
    const layer = new Container();
    layer.eventMode = 'static';
    this.screen.addChild(layer);
    const dim = new Graphics().rect(0, 0, this.w, this.h).fill({ color: 0x0a0402, alpha: 0.78 });
    layer.addChild(dim);
    gsap.from(dim, { alpha: 0, duration: 0.3 });
    const unit = Math.min(this.w, this.h);
    const rays = new Sprite(T.rays());
    rays.anchor.set(0.5);
    rays.blendMode = 'add';
    rays.tint = 0xffc050;
    rays.position.set(this.w / 2, this.h * 0.42);
    rays.scale.set((unit / 512) * 2.6);
    layer.addChild(rays);
    gsap.to(rays, { rotation: Math.PI * 2, duration: 16, repeat: -1, ease: 'none' });
    const emblem = new Sprite(tex('emblem_sun'));
    emblem.anchor.set(0.5);
    emblem.position.set(this.w / 2, this.h * 0.24);
    emblem.scale.set((unit * 0.24) / emblem.texture.height);
    layer.addChild(emblem);
    gsap.from(emblem.scale, { x: 0, y: 0, duration: 0.8, ease: 'back.out(2)' });
    gsap.to(emblem, { rotation: Math.PI * 2, duration: 20, repeat: -1, ease: 'none' });
    const banner = new Sprite(tex(tiers[0].name));
    banner.anchor.set(0.5);
    const bk = Math.min((this.w * 0.86) / banner.texture.width, (this.h * 0.3) / banner.texture.height);
    banner.scale.set(bk);
    banner.position.set(this.w / 2, this.h * 0.47);
    layer.addChild(banner);
    gsap.from(banner.scale, { x: 0, y: 0, duration: 0.6, ease: 'back.out(2.2)' });
    const breathe = gsap.to(banner.scale, { x: bk * 1.04, y: bk * 1.04, duration: 0.5, yoyo: true, repeat: -1, delay: 0.6, ease: 'sine.inOut' });
    const amt = goldText(fmt(0), Math.max(44, unit * 0.11));
    amt.position.set(this.w / 2, this.h * 0.68);
    const tap = plainText('TOQUE PARA CONTINUAR', Math.max(14, unit * 0.025), '#f7c84a');
    tap.position.set(this.w / 2, this.h * 0.84);
    tap.alpha = 0;
    layer.addChild(amt, tap);
    sound.play('bigwin_hit');
    void sound.startBigWin();
    this.shake(12);
    let showers = 0;
    const shower = () => {
      this.sfx.coinShower(this.w, this.h, 30 + showers * 12, 1.2);
      showers++;
    };
    shower();
    const showerTimer = gsap.to({}, { duration: 1.1, repeat: -1, onRepeat: shower });
    let tierIdx = 0;
    const counter = { v: 0 };
    let done = false;
    let tick = 0;
    const tw = gsap.to(counter, {
      v: amountCents,
      duration: dur,
      ease: 'power1.inOut',
      onUpdate: () => {
        amt.text = fmt(Math.round(counter.v));
        if (++tick % 3 === 0) sound.play('tick', { rate: 0.8 + (counter.v / amountCents) * 0.7, gain: 0.6 });
        const next = tiers[tierIdx + 1];
        if (next && counter.v >= next.at) {
          tierIdx++;
          banner.texture = tex(next.name);
          sound.play('tier_up');
          this.shake(18);
          this.sfx.ring(this.w / 2, this.h * 0.47, unit / 140, 0xffa040);
          this.sfx.sparkBurst(this.w / 2, this.h * 0.47, 60, 900);
          gsap.fromTo(banner.scale, { x: bk * 1.5, y: bk * 1.5 }, { x: bk, y: bk, duration: 0.5, ease: 'back.out(2)' });
          rays.tint = next.name === 'win_epic' ? 0xff60e0 : 0xff7040;
        }
      },
    });
    await new Promise<void>((res) => {
      const finish = () => {
        if (done) return;
        done = true;
        tw.progress(1);
        amt.text = fmt(amountCents);
        if (tierIdx < tiers.length - 1) banner.texture = tex(tiers[tiers.length - 1].name);
        sound.play('bigwin_end');
        gsap.fromTo(amt.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
        gsap.to(tap, { alpha: 1, duration: 0.3 });
        setTimeout(res, 1500);
      };
      tw.eventCallback('onComplete', finish);
      layer.on('pointertap', finish);
    });
    showerTimer.kill();
    breathe.kill();
    sound.stopBigWin();
    await gsap.to(layer, { alpha: 0, duration: 0.35 });
    gsap.killTweensOf(rays);
    gsap.killTweensOf(emblem);
    destroyDeep(layer);
  }

  async callout(text: string, sub = '', ms = 1400, icons: string[] = []) {
    const layer = new Container();
    this.screen.addChild(layer);
    const unit = Math.min(this.w, this.h);
    const glow = new Sprite(T.glow());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.tint = 0xffa040;
    glow.position.set(this.w / 2, this.h * 0.42);
    glow.scale.set((unit / 128) * 1.6, (unit / 128) * 0.8);
    layer.addChild(glow);
    icons.forEach((name, i) => {
      const s = new Sprite(tex(name));
      s.anchor.set(0.5);
      s.scale.set((unit * 0.2) / s.texture.height);
      s.position.set(this.w / 2 + (i - (icons.length - 1) / 2) * unit * 0.22, this.h * 0.25);
      layer.addChild(s);
      gsap.from(s.scale, { x: 0, y: 0, duration: 0.5, delay: i * 0.12, ease: 'back.out(2)' });
    });
    const t = goldText(text, Math.max(34, unit * 0.085), FONT_TITLE);
    t.position.set(this.w / 2, this.h * 0.43);
    layer.addChild(t);
    if (sub) {
      const s2 = goldText(sub, Math.max(28, unit * 0.06));
      s2.position.set(this.w / 2, this.h * 0.54);
      layer.addChild(s2);
      gsap.from(s2, { alpha: 0, y: s2.y + 20, duration: 0.4, delay: 0.15 });
    }
    gsap.from(t.scale, { x: 0.2, y: 0.2, duration: 0.5, ease: 'back.out(3)' });
    this.sfx.sparkBurst(this.w / 2, this.h * 0.43, 30, 500);
    this.sfx.ring(this.w / 2, this.h * 0.43, unit / 260);
    await wait(ms);
    await gsap.to(layer, { alpha: 0, duration: 0.3 });
    destroyDeep(layer);
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
