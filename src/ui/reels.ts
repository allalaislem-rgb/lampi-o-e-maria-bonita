/**
 * ReelsView – 5×3 reel set: spinning (pre-rendered motion-blur textures),
 * landing with overshoot + squash, anticipation, win presentation (animated
 * paylines, per-symbol win animations), expanding wilds, Wild reels and
 * symbol transformations. Purely presentational – renders engine outcomes.
 */
import { Container, Graphics, Sprite, Ticker, FillGradient, NineSliceSprite, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { REGULAR, SYMBOLS, PAYLINES, type SymbolId } from '../config/gameConfig';
import type { Grid, LineWin, Pos } from '../engine/math';
import { tex, seq } from './assets';
import { T, goldText } from './gfx';
import type { FX } from './fx';
import { sound } from '../audio/sound';

export const CELL_W = 200;
export const CELL_H = 180;
export const WIN_W = CELL_W * 5;
export const WIN_H = CELL_H * 3;
export const FRAME_PAD = 40;
const SLOTS = 4; // 1 hidden + 3 visible

const texOf = (s: SymbolId, blur = false): Texture => tex(SYMBOLS[s].texture + (blur ? '_blur' : ''));
const isPortrait = (s: SymbolId) => s === 'LAMP' || s === 'MARIA' || s === 'WILD';
const isScatter = (s: SymbolId) => s === 'WANT' || s === 'MAP' || s === 'EMBL';

export class SymbolView extends Container {
  glow: Sprite;
  sprite: Sprite;
  shine: Sprite;
  shineMask: Graphics;
  id: SymbolId = 'CACT';
  blurred = false;
  frameFx: NineSliceSprite;
  private frameAnim: gsap.core.Tween | null = null;
  constructor() {
    super();
    this.glow = new Sprite(T.glow());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.visible = false;
    this.glow.scale.set(2.3, 2.1);
    this.glow.tint = 0xffc850;
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.shineMask = new Graphics().roundRect(-CELL_W / 2 + 12, -CELL_H / 2 + 10, CELL_W - 24, CELL_H - 20, 14).fill(0xffffff);
    this.shine = new Sprite(T.shine());
    this.shine.anchor.set(0.5);
    this.shine.blendMode = 'add';
    this.shine.alpha = 0;
    this.shine.rotation = 0.35;
    this.shine.scale.set(1.2, 1.1);
    this.shine.visible = false;
    this.shineMask.visible = false;
    // painted glowing card frame (art sheet) – animates in around winning symbols
    this.frameFx = new NineSliceSprite({ texture: tex('glowcard_7'), leftWidth: 34, rightWidth: 34, topHeight: 34, bottomHeight: 34, width: CELL_W + 6, height: CELL_H + 6 });
    this.frameFx.pivot.set((CELL_W + 6) / 2, (CELL_H + 6) / 2);
    this.frameFx.blendMode = 'add';
    this.frameFx.visible = false;
    this.addChild(this.glow, this.sprite, this.shineMask, this.shine, this.frameFx);
  }
  set(id: SymbolId, blur = false) {
    this.id = id;
    this.blurred = blur;
    this.sprite.texture = texOf(id, blur);
    this.sprite.width = CELL_W;
    this.sprite.height = CELL_H;
    this.sprite.tint = 0xffffff;
    this.sprite.alpha = 1;
  }
  reset() {
    gsap.killTweensOf(this.sprite.scale);
    gsap.killTweensOf(this.sprite);
    gsap.killTweensOf(this.glow);
    gsap.killTweensOf(this.shine);
    gsap.killTweensOf(this.scale);
    gsap.killTweensOf(this);
    this.set(this.id, this.blurred);
    this.scale.set(1);
    this.rotation = 0;
    this.glow.alpha = 0;
    this.glow.visible = false;
    this.shine.alpha = 0;
    this.shine.visible = false;
    this.shine.mask = null;
    this.frameAnim?.kill();
    this.frameAnim = null;
    this.frameFx.visible = false;
  }
  /** Flipbook of the painted glowing card: ignite (frames 2→7), then flicker between the brightest frames. */
  private igniteFrame() {
    const frames = seq('glowcard_', 8);
    const st = { f: 2 };
    this.frameFx.visible = true;
    this.frameFx.alpha = 1;
    this.frameAnim?.kill();
    this.frameAnim = gsap.to(st, {
      f: 7,
      duration: 0.35,
      ease: 'power1.in',
      onUpdate: () => (this.frameFx.texture = frames[Math.round(st.f)]),
      onComplete: () => {
        const fl = { f: 5 };
        this.frameAnim = gsap.to(fl, { f: 7, duration: 0.25, yoyo: true, repeat: -1, ease: 'sine.inOut', onUpdate: () => (this.frameFx.texture = frames[Math.round(fl.f)]) });
      },
    });
  }
  /** Shine band sweeping across the symbol. */
  sweep(delay = 0, dur = 0.7) {
    this.shine.mask = this.shineMask;
    gsap.fromTo(this.shine, { x: -CELL_W * 0.9, alpha: 0.95 }, {
      x: CELL_W * 0.9, duration: dur, delay, ease: 'power2.inOut',
      onStart: () => void (this.shine.visible = true),
      onComplete: () => {
        this.shine.alpha = 0;
        this.shine.visible = false;
        this.shine.mask = null;
      },
    });
  }
  /** Per-kind win animation. */
  celebrate(strong = false) {
    const id = this.id;
    const base = { x: this.sprite.scale.x, y: this.sprite.scale.y };
    this.sprite.tint = 0xffffff;
    this.glow.visible = true;
    gsap.to(this.glow, { alpha: strong ? 0.95 : 0.7, duration: 0.25 });
    this.igniteFrame();
    if (isPortrait(id)) {
      gsap.fromTo(this.sprite.scale, { x: base.x, y: base.y }, { x: base.x * 1.13, y: base.y * 1.13, duration: 0.32, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      this.sweep(0.1);
      this.sweep(0.95);
    } else if (SYMBOLS[id].kind === 'premium') {
      gsap.fromTo(this.sprite, { rotation: 0 }, { rotation: 0.09, duration: 0.12, yoyo: true, repeat: 7, ease: 'sine.inOut' });
      gsap.fromTo(this.sprite.scale, { x: base.x, y: base.y }, { x: base.x * 1.1, y: base.y * 1.1, duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      this.sweep(0.2);
    } else {
      gsap.fromTo(this.sprite.scale, { x: base.x, y: base.y }, { x: base.x * 1.07, y: base.y * 1.07, duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    }
  }
  /** Landing squash (y) with springy recovery. */
  squash(k = 0.9) {
    const b = { x: this.sprite.scale.x, y: this.sprite.scale.y };
    gsap.fromTo(this.sprite.scale, { x: b.x * (2 - k) * 0.98 + b.x * 0.02, y: b.y * k }, { x: b.x, y: b.y, duration: 0.45, ease: 'elastic.out(1.1, 0.45)' });
  }
}

class Reel extends Container {
  views: SymbolView[] = [];
  pos = 0;
  speed = 0;
  spinning = false;
  target: number | null = null;
  final: SymbolId[] = [];
  constructor(public index: number, private randomSym: () => SymbolId) {
    super();
    for (let j = 0; j < SLOTS; j++) {
      const v = new SymbolView();
      v.set(randomSym());
      v.x = CELL_W / 2;
      this.views.push(v);
      this.addChild(v);
    }
    this.layoutViews();
  }
  private slot(j: number, p = this.pos) {
    return (((p + j) % SLOTS) + SLOTS) % SLOTS;
  }
  layoutViews() {
    for (let j = 0; j < SLOTS; j++) this.views[j].y = (this.slot(j) - 1) * CELL_H + CELL_H / 2;
  }
  setBlur(on: boolean) {
    for (const v of this.views) if (v.blurred !== on) v.set(v.id, on);
  }
  advance(d: number) {
    const before = this.views.map((_, j) => this.slot(j));
    this.pos += d;
    for (let j = 0; j < SLOTS; j++) {
      const s = this.slot(j);
      if (s < before[j]) {
        const blur = this.views[j].blurred;
        if (this.target !== null && this.target - this.pos < SLOTS) {
          const finalSlot = this.slot(j, this.target);
          this.views[j].set(finalSlot === 0 ? this.randomSym() : this.final[finalSlot - 1], blur);
        } else this.views[j].set(this.randomSym(), blur);
      }
    }
    this.layoutViews();
  }
  viewAt(row: number): SymbolView {
    const j = this.views.findIndex((_, k) => Math.round(this.slot(k)) % SLOTS === row + 1);
    return this.views[j];
  }
  setColumn(col: SymbolId[]) {
    this.pos = Math.round(this.pos);
    for (let j = 0; j < SLOTS; j++) {
      const s = Math.round(this.slot(j)) % SLOTS;
      this.views[j].reset();
      this.views[j].set(s === 0 ? this.randomSym() : col[s - 1], false);
    }
    this.layoutViews();
  }
}

export class ReelsView extends Container {
  frame: Sprite;
  reelLayer = new Container();
  maskG = new Graphics();
  reels: Reel[] = [];
  dim = new Graphics();
  overlay = new Container();
  lines = new Graphics();
  lineFx = new Container();
  winLabel: ReturnType<typeof goldText>;
  anticip: Graphics[] = [];
  private wildReels = new Map<number, Container>();
  turbo = false;
  private specials: SymbolId[] = ['WANT', 'MAP', 'EMBL', 'WILD'];
  allowWildInSpin = true;
  onAnticipation: (on: boolean) => void = () => {};

  constructor(private fx: FX) {
    super();
    const pf = paintedFrame();
    this.frame = pf.front;
    this.addChild(pf.back);

    this.maskG.rect(0, 0, WIN_W, WIN_H).fill(0xffffff);
    this.addChild(this.maskG);
    this.reelLayer.mask = this.maskG;
    this.addChild(this.reelLayer);
    for (let r = 0; r < 5; r++) {
      const reel = new Reel(r, () => this.randomSym());
      reel.x = r * CELL_W;
      this.reels.push(reel);
      this.reelLayer.addChild(reel);
    }
    this.dim.alpha = 0;
    this.addChild(this.dim);
    for (let r = 0; r < 5; r++) {
      const g = new Graphics();
      g.roundRect(r * CELL_W + 4, 2, CELL_W - 8, WIN_H - 4, 16).stroke({ width: 7, color: 0xffd36b, alpha: 1 });
      g.roundRect(r * CELL_W - 2, -4, CELL_W + 4, WIN_H + 8, 20).stroke({ width: 16, color: 0xff9a2a, alpha: 0.35 });
      g.alpha = 0;
      g.blendMode = 'add';
      this.anticip.push(g);
      this.addChild(g);
    }
    this.addChild(this.overlay, this.frame, this.lines, this.lineFx);
    this.winLabel = goldText('', 70);
    this.winLabel.position.set(WIN_W / 2, WIN_H / 2);
    this.winLabel.visible = false;
    this.addChild(this.winLabel);

    Ticker.shared.add((t) => {
      const dt = Math.min(0.05, t.deltaMS / 1000);
      for (const r of this.reels) if (r.spinning && r.target === null) r.advance(r.speed * dt);
    });
  }

  setFrame(theme: 'base' | 'escape') {
    this.frame.tint = theme === 'escape' ? 0xffe0c8 : 0xffffff;
  }

  private randomSym(): SymbolId {
    if (Math.random() < 0.07) {
      const s = this.specials[Math.floor(Math.random() * this.specials.length)];
      if (s !== 'WILD' || this.allowWildInSpin) return s;
    }
    return REGULAR[Math.floor(Math.random() * REGULAR.length)];
  }

  cellCenter(r: number, row: number) {
    return { x: r * CELL_W + CELL_W / 2, y: row * CELL_H + CELL_H / 2 };
  }
  /** Coordinates in the parent (world) space, where FX live. */
  g(r: number, row: number) {
    const c = this.cellCenter(r, row);
    return { x: this.x + c.x * this.scale.x, y: this.y + c.y * this.scale.y };
  }
  view(r: number, row: number) {
    return this.reels[r].viewAt(row);
  }

  showGrid(grid: Grid) {
    this.clearOverlays();
    this.clearWins();
    grid.forEach((col, r) => this.reels[r].setColumn(col));
  }

  // ------------------------------------------------------------- spin
  startSpin() {
    this.clearWins();
    this.clearOverlays();
    const maxSpeed = this.turbo ? 32 : 24;
    this.reels.forEach((reel, i) => {
      reel.target = null;
      reel.speed = 0;
      gsap.killTweensOf(reel);
      const d = i * (this.turbo ? 0.03 : 0.07);
      // wind-up: lift, then drop into the spin
      gsap.timeline({ delay: d })
        .to(reel, { y: -22, duration: 0.13, ease: 'power2.out' })
        .add(() => {
          reel.spinning = true;
          reel.setBlur(true);
        })
        .to(reel, { y: 0, duration: 0.12, ease: 'power2.in' })
        .to(reel, { speed: maxSpeed, duration: 0.25, ease: 'power2.in' }, '<');
    });
  }

  /** Stop the reels on `grid`. Anticipation when 2 scatters of a kind have landed. */
  async stopOn(grid: Grid, opts: { quickStop?: boolean } = {}) {
    const counts: Record<string, number> = { WANT: 0, MAP: 0, EMBL: 0 };
    const gap = this.turbo || opts.quickStop ? 0.07 : 0.2;
    let t = this.turbo ? 0.12 : 0.32;
    const stops: Promise<void>[] = [];
    let anyAntic = false;
    for (let r = 0; r < 5; r++) {
      const antic = r >= 2 && Object.values(counts).some((c) => c >= 2) && !opts.quickStop;
      if (antic) {
        t += this.turbo ? 0.7 : 1.6;
        anyAntic = true;
      }
      stops.push(this.stopReel(r, grid[r], t, antic, counts));
      for (const s of grid[r]) if (s in counts) counts[s]++;
      t += gap;
    }
    await Promise.all(stops);
    if (anyAntic) this.endAnticipation();
  }

  private startAnticipation(r: number) {
    const a = this.anticip[r];
    gsap.killTweensOf(a);
    gsap.to(a, { alpha: 1, duration: 0.25 });
    gsap.to(a, { alpha: 0.55, duration: 0.3, yoyo: true, repeat: -1, delay: 0.25, ease: 'sine.inOut' });
    this.dim.clear();
    for (let k = 0; k < 5; k++) if (k !== r) this.dim.rect(k * CELL_W, 0, CELL_W, WIN_H).fill(0x000000);
    gsap.to(this.dim, { alpha: 0.45, duration: 0.3 });
    sound.play('anticipation');
    this.onAnticipation(true);
    const sparks = gsap.to({}, {
      duration: 1.5,
      onUpdate: () => {
        if (Math.random() < 0.5) {
          const p = this.g(r, 0);
          const side = Math.random() < 0.5 ? -1 : 1;
          this.fx.spawn(T.spark(), p.x + side * (CELL_W / 2) * this.scale.x, this.y + Math.random() * WIN_H * this.scale.y, { vy: -60, life: 0.6, scale: 0.18, add: true, tint: 0xffc040 });
        }
      },
    });
    void sparks;
  }

  private endAnticipation() {
    this.anticip.forEach((a) => {
      gsap.killTweensOf(a);
      gsap.to(a, { alpha: 0, duration: 0.3 });
    });
    gsap.to(this.dim, { alpha: 0, duration: 0.3 });
    this.onAnticipation(false);
  }

  private stopReel(r: number, col: SymbolId[], delay: number, antic: boolean, counts: Record<string, number>): Promise<void> {
    const reel = this.reels[r];
    return new Promise((res) => {
      if (antic) {
        gsap.delayedCall(Math.max(0, delay - (this.turbo ? 0.6 : 1.45)), () => {
          this.anticip.forEach((a, k) => k !== r && gsap.to(a, { alpha: 0, duration: 0.2 }));
          this.startAnticipation(r);
          gsap.to(reel, { speed: (reel.speed || 24) * 0.55, duration: 0.6 });
        });
      }
      gsap.delayedCall(delay, () => {
        reel.final = col;
        reel.target = Math.ceil(reel.pos) + SLOTS + 1;
        const dist = reel.target - reel.pos;
        const v = Math.max(8, reel.speed || 20);
        const dur = Math.min(0.95, (3.2 * dist) / v);
        const proxy = { p: reel.pos };
        gsap.delayedCall(dur * 0.45, () => reel.setBlur(false));
        gsap.to(proxy, {
          p: reel.target,
          duration: dur,
          ease: 'back.out(1.15)',
          onUpdate: () => reel.advance(proxy.p - reel.pos),
          onComplete: () => {
            reel.spinning = false;
            reel.speed = 0;
            reel.setColumn(col);
            reel.target = null;
            sound.play(this.turbo ? 'reelstop_quick' : 'reelstop', { rate: 0.96 + r * 0.025, pan: (r - 2) * 0.25 });
            for (let row = 0; row < 3; row++) {
              const v2 = reel.viewAt(row);
              v2.squash(0.93);
            }
            const scat = col.findIndex((s) => isScatter(s));
            if (scat >= 0) {
              const s = col[scat];
              const n = (counts[s] ?? 0) + 1;
              sound.play(n >= 3 ? 'scatter3' : n === 2 ? 'scatter2' : 'scatter1');
              const v2 = reel.viewAt(scat);
              gsap.fromTo(v2.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.55, ease: 'back.out(3)' });
              v2.glow.visible = true;
              gsap.fromTo(v2.glow, { alpha: 1 }, { alpha: 0.35, duration: 1.2 });
              const p = this.g(r, scat);
              this.fx.ring(p.x, p.y, 1.1, 0xffd36b);
              this.fx.sparkBurst(p.x, p.y, 16, 260);
            }
            const wild = col.findIndex((s) => s === 'WILD');
            if (wild >= 0) {
              const v2 = reel.viewAt(wild);
              v2.sweep(0.05, 0.6);
              v2.glow.visible = true;
              gsap.fromTo(v2.glow, { alpha: 0.9 }, { alpha: 0.25, duration: 1 });
              sound.play('wild', { gain: 0.55 });
            }
            res();
          },
        });
      });
    });
  }

  // ------------------------------------------------------------- wins
  clearWins() {
    gsap.killTweensOf(this.lines);
    this.lines.clear();
    this.lineFx.removeChildren().forEach((c) => { gsap.killTweensOf(c); c.destroy(); });
    this.winLabel.visible = false;
    gsap.killTweensOf(this.winLabel.scale);
    for (const r of this.reels) for (const v of r.views) v.reset();
  }

  private linePts(lineIdx: number) {
    const rows = PAYLINES[lineIdx];
    const pts = rows.map((row, r) => this.cellCenter(r, row));
    return [{ x: -16, y: pts[0].y }, ...pts, { x: WIN_W + 16, y: pts[4].y }];
  }

  /** Animated line draw (progress 0..1). */
  private drawLines(lineIdxs: number[], progress: number) {
    const g = this.lines;
    g.clear();
    for (const li of lineIdxs) {
      const pts = this.linePts(li);
      const segs = pts.length - 1;
      const reach = progress * segs;
      const path = () => {
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i <= segs; i++) {
          if (i <= reach) g.lineTo(pts[i].x, pts[i].y);
          else {
            const f = reach - (i - 1);
            if (f > 0) g.lineTo(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f);
            break;
          }
        }
      };
      path();
      g.stroke({ width: 18, color: 0xffa020, alpha: 0.22, join: 'round', cap: 'round' });
      path();
      g.stroke({ width: 7, color: 0xffd25a, alpha: 0.95, join: 'round', cap: 'round' });
      path();
      g.stroke({ width: 2.5, color: 0xfffbe0, alpha: 0.95, join: 'round', cap: 'round' });
    }
  }

  private animateLines(lineIdxs: number[], dur = 0.45) {
    const p = { v: 0 };
    gsap.to(p, { v: 1, duration: dur, ease: 'power1.inOut', onUpdate: () => this.drawLines(lineIdxs, p.v) });
    // flare travelling along each line
    for (const li of lineIdxs.slice(0, 6)) {
      const pts = this.linePts(li);
      const fl = new Sprite(T.lensFlare());
      fl.anchor.set(0.5);
      fl.blendMode = 'add';
      fl.scale.set(0.5);
      fl.tint = 0xffe08a;
      this.lineFx.addChild(fl);
      const q = { v: 0 };
      gsap.to(q, {
        v: pts.length - 1,
        duration: dur * 1.1,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (fl.destroyed) return;
          const i = Math.min(pts.length - 2, Math.floor(q.v));
          const f = q.v - i;
          fl.position.set(pts[i].x + (pts[i + 1].x - pts[i].x) * f, pts[i].y + (pts[i + 1].y - pts[i].y) * f);
        },
        onComplete: () => void (!fl.destroyed && gsap.to(fl, { alpha: 0, duration: 0.2, onComplete: () => { gsap.killTweensOf(fl); if (!fl.destroyed) fl.destroy(); } })),
      });
    }
  }

  highlight(positions: Pos[], dimOthers = true, strong = false) {
    const set = new Set(positions.map(([r, row]) => `${r},${row}`));
    for (let r = 0; r < 5; r++)
      for (let row = 0; row < 3; row++) {
        const v = this.view(r, row);
        if (!v) continue;
        if (set.has(`${r},${row}`)) v.celebrate(strong);
        else if (dimOthers && !this.wildReels.has(r)) gsap.to(v.sprite, { alpha: 0.35, duration: 0.25 });
      }
    for (const [r, w] of this.wildReels) {
      if (positions.some(([pr]) => pr === r)) gsap.fromTo(w.scale, { x: 1, y: 1 }, { x: 1.04, y: 1.02, duration: 0.3, yoyo: true, repeat: 3 });
    }
  }

  /** Show all wins together with a count-up, then cycle line by line (optional). */
  async presentWins(wins: LineWin[], total: number, fmt: (c: number) => string, signal: { cancelled: boolean }, cycle = true, suffix = '') {
    if (!wins.length) return;
    const strong = wins.some((w) => isPortrait(w.symbol));
    this.animateLines(wins.map((w) => w.line));
    this.highlight(wins.flatMap((w) => w.positions), true, strong);
    for (const w of wins.slice(0, 8)) {
      const [r, row] = w.positions[w.positions.length - 1];
      const p = this.g(r, row);
      this.fx.sparkBurst(p.x, p.y, strong ? 12 : 6, strong ? 260 : 160);
    }
    this.winLabel.visible = true;
    this.winLabel.alpha = 1;
    gsap.fromTo(this.winLabel.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2.5)' });
    const c = { v: 0 };
    gsap.to(c, { v: total, duration: Math.min(1.2, 0.4 + total / 20000), ease: 'power1.out', onUpdate: () => (this.winLabel.text = fmt(Math.round(c.v)) + suffix) });
    await wait(this.turbo ? 700 : 1500, signal);
    if (!cycle || signal.cancelled) return;
    const run = async () => {
      let i = 0;
      while (!signal.cancelled && wins.length > 1) {
        const w = wins[i % wins.length];
        for (const r of this.reels) for (const v of r.views) v.reset();
        this.lineFx.removeChildren().forEach((ch) => { gsap.killTweensOf(ch); ch.destroy(); });
        this.animateLines([w.line], 0.3);
        this.highlight(w.positions, true, isPortrait(w.symbol));
        this.winLabel.text = `${fmt(w.pay)}`;
        await wait(1300, signal);
        i++;
      }
    };
    void run();
  }

  // ------------------------------------------------------------- wilds
  private buildWildReel(): Container {
    const c = new Container();
    const fill = new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: '#5a0d06' }, { offset: 0.3, color: '#c2410c' }, { offset: 0.5, color: '#f5a524' }, { offset: 0.7, color: '#c2410c' }, { offset: 1, color: '#5a0d06' }],
      textureSpace: 'local',
    });
    const panel = new Graphics().roundRect(-CELL_W / 2 + 4, -WIN_H / 2 + 4, CELL_W - 8, WIN_H - 8, 16).fill(fill).stroke({ width: 6, color: 0xffd36b });
    const msk = new Graphics().roundRect(-CELL_W / 2 + 4, -WIN_H / 2 + 4, CELL_W - 8, WIN_H - 8, 16).fill(0xffffff);
    const rays = new Sprite(T.rays());
    rays.anchor.set(0.5);
    rays.blendMode = 'add';
    rays.scale.set(1.1);
    rays.alpha = 0.55;
    rays.tint = 0xffe0a0;
    rays.mask = msk;
    const glow = new Sprite(T.glow());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.scale.set(2.2, 4.2);
    glow.alpha = 0.6;
    glow.tint = 0xffc040;
    const lamp = new Sprite(tex('sym_wild'));
    lamp.anchor.set(0.5);
    lamp.width = CELL_W * 1.12;
    lamp.height = CELL_H * 1.12;
    const shine = new Sprite(T.shine());
    shine.anchor.set(0.5);
    shine.blendMode = 'add';
    shine.scale.set(1.6, 2.4);
    shine.rotation = 0.3;
    shine.mask = msk;
    shine.alpha = 0.9;
    const border = new NineSliceSprite({ texture: tex('glowcard_7'), leftWidth: 34, rightWidth: 34, topHeight: 34, bottomHeight: 34, width: CELL_W + 8, height: WIN_H + 8 });
    border.pivot.set((CELL_W + 8) / 2, (WIN_H + 8) / 2);
    border.blendMode = 'add';
    c.addChild(panel, msk, rays, glow, lamp, shine, border);
    gsap.to(border, { alpha: 0.6, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(rays, { rotation: Math.PI * 2, duration: 9, repeat: -1, ease: 'none' });
    gsap.to(glow, { alpha: 0.95, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.fromTo(shine, { y: -WIN_H }, { y: WIN_H, duration: 1.6, repeat: -1, repeatDelay: 1.2, ease: 'power2.inOut' });
    return c;
  }

  async wildReel(reels: number[], mode: 'expand' | 'raid' | 'arrival', grid?: Grid) {
    const ps: Promise<void>[] = [];
    reels.forEach((r, i) => {
      if (this.wildReels.has(r)) return;
      const c = this.buildWildReel();
      c.position.set(r * CELL_W + CELL_W / 2, WIN_H / 2);
      this.overlay.addChild(c);
      this.wildReels.set(r, c);
      const delay = i * 0.3;
      ps.push(
        new Promise<void>((res) => {
          if (mode === 'expand') {
            const row = grid ? Math.max(0, grid[r].indexOf('WILD')) : 1;
            c.y = row * CELL_H + CELL_H / 2;
            c.scale.set(1, 1 / 3);
            gsap.to(c, { y: WIN_H / 2, duration: 0.5, delay, ease: 'back.out(1.6)' });
            gsap.to(c.scale, { y: 1, duration: 0.5, delay, ease: 'back.out(1.6)', onStart: () => sound.play('wild_expand'), onComplete: () => res() });
          } else {
            c.alpha = 0;
            c.y = WIN_H / 2 - 160;
            gsap.to(c, { alpha: 1, y: WIN_H / 2, duration: 0.42, delay, ease: 'bounce.out', onStart: () => sound.play('wild_expand'), onComplete: () => res() });
          }
          gsap.delayedCall(delay + 0.3, () => {
            const gx = this.x + c.x * this.scale.x;
            const gy = this.y + (WIN_H / 2) * this.scale.y;
            this.fx.flash(gx, gy, 2.4, 0xffb040);
            this.fx.sparkBurst(gx, gy, 30, 520);
            this.fx.ring(gx, gy, 2, 0xffc060);
            if (mode !== 'expand') this.fx.dustBurst(gx, this.y + WIN_H * this.scale.y, 8, 240);
            this.shake(mode === 'expand' ? 6 : 10);
          });
        }),
      );
      gsap.delayedCall(delay + 0.5, () => this.reels[r].views.forEach((v) => v.set('WILD')));
    });
    await Promise.all(ps);
  }

  shake(px = 8, dur = 0.35) {
    const ox = this.x;
    const oy = this.y;
    const p = { k: 1 };
    gsap.to(p, {
      k: 0,
      duration: dur,
      ease: 'power2.out',
      onUpdate: () => this.position.set(ox + (Math.random() - 0.5) * px * p.k, oy + (Math.random() - 0.5) * px * p.k),
      onComplete: () => this.position.set(ox, oy),
    });
  }

  clearOverlays() {
    for (const c of this.wildReels.values()) {
      c.children.forEach((ch) => gsap.killTweensOf(ch));
      gsap.killTweensOf(c);
      gsap.killTweensOf(c.scale);
      c.destroy({ children: true });
    }
    this.wildReels.clear();
    this.overlay.removeChildren();
  }

  /** Raid transformation of individual cells into `target`. */
  async transform(cells: Pos[], target: SymbolId) {
    const ps = cells.map(
      ([r, row], i) =>
        new Promise<void>((res) => {
          const v = this.view(r, row);
          gsap.delayedCall(i * 0.11, () => {
            gsap.to(v.scale, {
              x: 0,
              duration: 0.16,
              ease: 'power2.in',
              onComplete: () => {
                v.set(target);
                const p = this.g(r, row);
                this.fx.flash(p.x, p.y, 1.4, 0xff5030);
                this.fx.sparkBurst(p.x, p.y, 12, 260, 0xff8040);
                sound.play('transform', { rate: 0.9 + i * 0.04 });
                gsap.to(v.scale, { x: 1, duration: 0.4, ease: 'back.out(3)', onComplete: () => res() });
                v.sweep(0.2, 0.5);
              },
            });
          });
        }),
    );
    await Promise.all(ps);
  }

  async celebrateScatters(positions: Pos[]) {
    for (const [r, row] of positions) {
      const v = this.view(r, row);
      v.glow.visible = true;
      gsap.to(v.glow, { alpha: 1, duration: 0.3 });
      gsap.fromTo(v.scale, { x: 1, y: 1 }, { x: 1.22, y: 1.22, duration: 0.32, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      v.sweep(0.1);
      const p = this.g(r, row);
      this.fx.ring(p.x, p.y, 1.6);
      this.fx.sparkBurst(p.x, p.y, 20, 360);
    }
    await wait(1500);
  }
}

export function wait(ms: number, signal?: { cancelled: boolean }) {
  return new Promise<void>((res) => {
    const t0 = performance.now();
    const tick = () => {
      if (signal?.cancelled || performance.now() - t0 >= ms) res();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * The client's painted reel frame (frame_painted, 1672×941). Its inner window
 * (x 175–1500, y 130–838 in the source) is mapped onto the 1000×540 reel window,
 * so lanterns, cacti, the skull and the wagon wheel slightly overlap the reel edges.
 * Returns a dark backing plate (behind the symbols) and the frame (drawn on top).
 */
export function paintedFrame() {
  const k = WIN_W / 1325;
  const front = new Sprite(tex('frame_painted'));
  front.scale.set(k);
  front.position.set(-175 * k, -130 * k);
  front.eventMode = 'none';
  const back = new Graphics()
    .roundRect(88 * k - 175 * k, 120 * k - 130 * k, (1585 - 88) * k, (849 - 120) * k, 10)
    .fill({ color: 0x1a0c06, alpha: 0.88 });
  return { front, back };
}
