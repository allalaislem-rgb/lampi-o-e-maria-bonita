/**
 * ReelsView – 5×3 reel set: spinning, landing, anticipation, win presentation,
 * expanding wilds, Wild reels (Arrival/Raid) and symbol transformations.
 * Purely presentational: it renders grids it is given by the engine.
 */
import { Container, Graphics, Sprite, Ticker, BlurFilter, Texture } from 'pixi.js';
import gsap from 'gsap';
import { REGULAR, SYMBOLS, type SymbolId } from '../config/gameConfig';
import type { Grid, LineWin, Pos } from '../engine/math';
import { PAYLINES } from '../config/gameConfig';
import { tex } from './assets';
import { frameTex, glowTex, goldText, raysTex, roundRect } from './gfx';
import type { FX } from './fx';
import { sound } from '../audio/sound';

export const CELL_W = 200;
export const CELL_H = 180;
export const WIN_W = CELL_W * 5;
export const WIN_H = CELL_H * 3;
export const FRAME_PAD = 40;
const SLOTS = 4; // 1 hidden + 3 visible

const textureOf = (s: SymbolId): Texture => tex(SYMBOLS[s].texture);

export class SymbolView extends Container {
  glow: Sprite;
  sprite: Sprite;
  id: SymbolId = 'CACT';
  constructor() {
    super();
    this.glow = new Sprite(glowTex());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(1.15);
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.addChild(this.glow, this.sprite);
  }
  set(id: SymbolId) {
    this.id = id;
    const t = textureOf(id);
    this.sprite.texture = t;
    const big = SYMBOLS[id].kind === 'premium' && (id === 'LAMP' || id === 'MARIA');
    const special = SYMBOLS[id].kind !== 'premium' && SYMBOLS[id].kind !== 'low';
    const maxW = CELL_W - (big || special ? 12 : 26);
    const maxH = CELL_H - (big || special ? 6 : 22);
    const k = Math.min(maxW / t.width, maxH / t.height);
    this.sprite.scale.set(k);
    this.sprite.tint = 0xffffff;
    this.sprite.alpha = 1;
  }
  reset() {
    gsap.killTweensOf(this.sprite.scale);
    gsap.killTweensOf(this.glow);
    gsap.killTweensOf(this);
    this.set(this.id);
    this.scale.set(1);
    this.glow.alpha = 0;
    this.rotation = 0;
  }
}

class Reel extends Container {
  views: SymbolView[] = [];
  pos = 0;
  speed = 0;
  spinning = false;
  target: number | null = null;
  final: SymbolId[] = [];
  blur = new BlurFilter({ strengthX: 0, strengthY: 0 });
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
  advance(d: number) {
    const before = this.views.map((_, j) => this.slot(j));
    this.pos += d;
    for (let j = 0; j < SLOTS; j++) {
      const s = this.slot(j);
      if (s < before[j]) {
        // wrapped to the top: assign incoming symbol
        if (this.target !== null && this.target - this.pos < SLOTS) {
          const finalSlot = this.slot(j, this.target);
          this.views[j].set(finalSlot === 0 ? this.randomSym() : this.final[finalSlot - 1]);
        } else this.views[j].set(this.randomSym());
      }
    }
    this.layoutViews();
  }
  /** View currently displaying a given row (after landing). */
  viewAt(row: number): SymbolView {
    const j = this.views.findIndex((_, k) => Math.round(this.slot(k)) % SLOTS === row + 1);
    return this.views[j];
  }
  setColumn(col: SymbolId[]) {
    this.pos = Math.round(this.pos);
    for (let j = 0; j < SLOTS; j++) {
      const s = Math.round(this.slot(j)) % SLOTS;
      this.views[j].reset();
      this.views[j].set(s === 0 ? this.randomSym() : col[s - 1]);
    }
    this.layoutViews();
  }
}

/** Fiery gold panel behind Wild reels. */
function wildPanelTex(): Texture {
  const key = 'wildPanel';
  const cached = (wildPanelTex as unknown as Record<string, Texture>)[key];
  if (cached) return cached;
  const w = CELL_W - 8;
  const h = WIN_H - 8;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5a0d06');
  g.addColorStop(0.35, '#c2410c');
  g.addColorStop(0.6, '#f59e0b');
  g.addColorStop(1, '#6b1606');
  c.fillStyle = g;
  roundRect(c, 3, 3, w - 6, h - 6, 16);
  c.fill();
  const r = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h / 2);
  r.addColorStop(0, 'rgba(255,240,180,.75)');
  r.addColorStop(1, 'rgba(255,200,80,0)');
  c.fillStyle = r;
  c.fillRect(0, 0, w, h);
  const s = c.createLinearGradient(0, 0, 0, h);
  s.addColorStop(0, '#fff3bf');
  s.addColorStop(0.5, '#c98a1c');
  s.addColorStop(1, '#fff3bf');
  c.strokeStyle = s;
  c.lineWidth = 6;
  roundRect(c, 3, 3, w - 6, h - 6, 16);
  c.stroke();
  const t = Texture.from(cv);
  (wildPanelTex as unknown as Record<string, Texture>)[key] = t;
  return t;
}

export class ReelsView extends Container {
  frame: Sprite;
  reelLayer = new Container();
  maskG = new Graphics();
  reels: Reel[] = [];
  overlay = new Container(); // wild reels, transformations
  lines = new Graphics();
  winLabel: ReturnType<typeof goldText>;
  anticipation: Sprite[] = [];
  private wildReels = new Map<number, Container>();
  turbo = false;
  private specials: SymbolId[] = ['WANT', 'MAP', 'EMBL', 'WILD'];
  allowWildInSpin = true;

  constructor(private fx: FX) {
    super();
    this.frame = new Sprite(frameTex('reels', WIN_W, WIN_H, FRAME_PAD, 'leather'));
    this.frame.position.set(-FRAME_PAD, -FRAME_PAD);
    this.addChild(this.frame);

    // column separators
    const sep = new Graphics();
    for (let i = 1; i < 5; i++) {
      sep.rect(i * CELL_W - 1, 8, 2, WIN_H - 16).fill({ color: 0xc98a1c, alpha: 0.35 });
    }
    this.addChild(sep);

    for (let r = 0; r < 5; r++) {
      const a = new Sprite(glowTex());
      a.anchor.set(0.5);
      a.blendMode = 'add';
      a.position.set(r * CELL_W + CELL_W / 2, WIN_H / 2);
      a.scale.set(1.1, 2.6);
      a.alpha = 0;
      a.tint = 0xffb030;
      this.anticipation.push(a);
      this.addChild(a);
    }

    this.maskG.rect(0, 0, WIN_W, WIN_H).fill(0xffffff);
    this.addChild(this.maskG);
    this.reelLayer.mask = this.maskG;
    this.addChild(this.reelLayer);
    for (let r = 0; r < 5; r++) {
      const reel = new Reel(r, () => this.randomSym());
      reel.x = r * CELL_W;
      reel.filters = [reel.blur];
      this.reels.push(reel);
      this.reelLayer.addChild(reel);
    }
    this.addChild(this.overlay, this.lines);
    this.winLabel = goldText('', 64);
    this.winLabel.position.set(WIN_W / 2, WIN_H - 40);
    this.winLabel.visible = false;
    this.addChild(this.winLabel);

    Ticker.shared.add((t) => {
      const dt = Math.min(0.05, t.deltaMS / 1000);
      for (const r of this.reels) if (r.spinning && r.target === null) r.advance(r.speed * dt);
    });
  }

  private randomSym(): SymbolId {
    if (Math.random() < 0.06) {
      const s = this.specials[Math.floor(Math.random() * this.specials.length)];
      if (s !== 'WILD' || this.allowWildInSpin) return s;
    }
    return REGULAR[Math.floor(Math.random() * REGULAR.length)];
  }

  cellCenter(r: number, row: number) {
    return { x: r * CELL_W + CELL_W / 2, y: row * CELL_H + CELL_H / 2 };
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
    const maxSpeed = this.turbo ? 30 : 22;
    this.reels.forEach((reel, i) => {
      reel.target = null;
      reel.spinning = true;
      reel.speed = 0;
      gsap.killTweensOf(reel);
      gsap.fromTo(reel, { y: 0 }, { y: -18, duration: 0.12, delay: i * 0.05, yoyo: true, repeat: 1, ease: 'sine.out' });
      gsap.to(reel, { speed: maxSpeed, duration: 0.3, delay: i * 0.05 + 0.1, ease: 'power2.in' });
      gsap.to(reel.blur, { strengthY: 10, duration: 0.3, delay: i * 0.05 + 0.1 });
    });
  }

  /** Stop the reels on `grid`. Anticipation for scatters when 2 have landed. */
  async stopOn(grid: Grid, opts: { quickStop?: boolean } = {}) {
    const counts: Record<string, number> = { WANT: 0, MAP: 0, EMBL: 0 };
    const baseDelay = this.turbo || opts.quickStop ? 0.08 : 0.22;
    let t = this.turbo ? 0.15 : 0.35;
    const stops: Promise<void>[] = [];
    for (let r = 0; r < 5; r++) {
      const antic = r >= 2 && Object.values(counts).some((c) => c >= 2) && !opts.quickStop;
      if (antic) t += this.turbo ? 0.6 : 1.4;
      stops.push(this.stopReel(r, grid[r], t, antic));
      for (const s of grid[r]) if (s in counts) counts[s]++;
      t += baseDelay;
    }
    await Promise.all(stops);
  }

  private stopReel(r: number, col: SymbolId[], delay: number, antic: boolean): Promise<void> {
    const reel = this.reels[r];
    return new Promise((res) => {
      if (antic) {
        gsap.delayedCall(Math.max(0, delay - 1.3), () => {
          const a = this.anticipation[r];
          gsap.to(a, { alpha: 0.9, duration: 0.3 });
          gsap.to(a.scale, { x: 1.4, duration: 0.5, yoyo: true, repeat: 3 });
          sound.play('anticipation');
        });
      }
      gsap.delayedCall(delay, () => {
        reel.final = col;
        reel.target = Math.ceil(reel.pos) + SLOTS + 1;
        const dist = reel.target - reel.pos;
        const v = Math.max(8, reel.speed || 20);
        const dur = Math.min(1.1, (3.6 * dist) / v);
        const proxy = { p: reel.pos };
        gsap.to(reel.blur, { strengthY: 0, duration: dur * 0.6 });
        gsap.to(proxy, {
          p: reel.target,
          duration: dur,
          ease: 'back.out(0.9)',
          onUpdate: () => reel.advance(proxy.p - reel.pos),
          onComplete: () => {
            reel.spinning = false;
            reel.speed = 0;
            reel.setColumn(col);
            reel.target = null;
            gsap.to(this.anticipation[r], { alpha: 0, duration: 0.3 });
            sound.play('reelStop');
            const scat = col.findIndex((s) => s === 'WANT' || s === 'MAP' || s === 'EMBL');
            if (scat >= 0) {
              sound.play('scatter', { pitch: 1 + r * 0.06 });
              const v2 = reel.viewAt(scat);
              gsap.fromTo(v2.scale, { x: 1.25, y: 1.25 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
              const c = this.cellCenter(r, scat);
              this.fx.sparkBurst(this.x + c.x * this.scale.x, this.y + c.y * this.scale.y, 10, 200);
            }
            res();
          },
        });
      });
    });
  }

  // ------------------------------------------------------------- wins
  clearWins() {
    this.lines.clear();
    this.winLabel.visible = false;
    gsap.killTweensOf(this.winLabel.scale);
    for (const r of this.reels) for (const v of r.views) v.reset();
    for (const w of this.wildReels.values()) gsap.killTweensOf(w.scale);
  }

  private drawLine(lineIdx: number, color = 0xffd25a) {
    const rows = PAYLINES[lineIdx];
    const pts = rows.map((row, r) => this.cellCenter(r, row));
    const g = this.lines;
    const path = () => {
      g.moveTo(-10, pts[0].y);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.lineTo(WIN_W + 10, pts[4].y);
    };
    path();
    g.stroke({ width: 16, color, alpha: 0.18, join: 'round', cap: 'round' });
    path();
    g.stroke({ width: 7, color, alpha: 0.95, join: 'round', cap: 'round' });
    path();
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.8, join: 'round', cap: 'round' });
  }

  /** Highlight a set of winning positions (dim the rest, pulse the winners). */
  highlight(positions: Pos[], dimOthers = true) {
    const set = new Set(positions.map(([r, row]) => `${r},${row}`));
    for (let r = 0; r < 5; r++)
      for (let row = 0; row < 3; row++) {
        const v = this.view(r, row);
        if (!v) continue;
        if (set.has(`${r},${row}`)) {
          v.sprite.tint = 0xffffff;
          gsap.to(v.glow, { alpha: 0.85, duration: 0.25 });
          gsap.fromTo(v.sprite.scale, { x: v.sprite.scale.x, y: v.sprite.scale.y }, { x: v.sprite.scale.x * 1.12, y: v.sprite.scale.y * 1.12, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' });
        } else if (dimOthers && !this.wildReels.has(r)) {
          v.sprite.tint = 0x5a4a40;
        }
      }
    for (const [r, w] of this.wildReels) {
      if (positions.some(([pr]) => pr === r)) gsap.fromTo(w.scale, { x: 1, y: 1 }, { x: 1.05, y: 1.03, duration: 0.3, yoyo: true, repeat: 3 });
    }
  }

  /** Show all wins together, then (optionally) cycle line by line until `signal.cancelled`. */
  async presentWins(wins: LineWin[], total: string, signal: { cancelled: boolean }, cycle = true) {
    if (!wins.length) return;
    this.lines.clear();
    for (const w of wins) this.drawLine(w.line);
    this.highlight(wins.flatMap((w) => w.positions));
    this.winLabel.text = total;
    this.winLabel.visible = true;
    gsap.fromTo(this.winLabel.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2.5)' });
    for (const w of wins) {
      for (const [r, row] of w.positions.slice(0, 1)) {
        const c = this.cellCenter(r, row);
        this.fx.sparkBurst(this.x + c.x * this.scale.x, this.y + c.y * this.scale.y, 6, 160);
      }
    }
    await wait(this.turbo ? 700 : 1500, signal);
    if (!cycle) return;
    // cycle individual lines (until next action)
    const run = async () => {
      let i = 0;
      while (!signal.cancelled && wins.length > 1) {
        const w = wins[i % wins.length];
        this.clearWinsSoft();
        this.drawLine(w.line);
        this.highlight(w.positions);
        this.winLabel.text = `${w.count}× ${SYMBOLS[w.symbol].name.toUpperCase()}`;
        await wait(1300, signal);
        i++;
      }
    };
    void run();
  }

  private clearWinsSoft() {
    this.lines.clear();
    for (const r of this.reels) for (const v of r.views) v.reset();
  }

  // ------------------------------------------------------------- wilds
  /**
   * Turn reels into full Wild reels.
   * mode 'expand': grows from the landed wild cell; 'raid'/'arrival': drops in.
   */
  async wildReel(reels: number[], mode: 'expand' | 'raid' | 'arrival', grid?: Grid) {
    const ps: Promise<void>[] = [];
    reels.forEach((r, i) => {
      if (this.wildReels.has(r)) return;
      const c = new Container();
      c.position.set(r * CELL_W + CELL_W / 2, WIN_H / 2);
      const rays = new Sprite(raysTex());
      rays.anchor.set(0.5);
      rays.blendMode = 'add';
      rays.scale.set(0.9);
      rays.alpha = 0.6;
      const panel = new Sprite(wildPanelTex());
      panel.anchor.set(0.5);
      const msk = new Graphics().rect(-CELL_W / 2, -WIN_H / 2, CELL_W, WIN_H).fill(0xffffff);
      rays.mask = msk;
      const lamp = new Sprite(tex('sym_wild'));
      lamp.anchor.set(0.5);
      const k = Math.min((CELL_W - 10) / lamp.texture.width, (WIN_H * 0.62) / lamp.texture.height);
      lamp.scale.set(k);
      const glow = new Sprite(glowTex());
      glow.anchor.set(0.5);
      glow.blendMode = 'add';
      glow.scale.set(1.3, 2.4);
      glow.alpha = 0.6;
      c.addChild(panel, msk, rays, glow, lamp);
      this.overlay.addChild(c);
      this.wildReels.set(r, c);
      gsap.to(rays, { rotation: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });
      gsap.to(glow, { alpha: 0.9, duration: 0.6, yoyo: true, repeat: -1 });

      const delay = i * 0.35;
      const p = new Promise<void>((res) => {
        if (mode === 'expand') {
          const row = grid ? Math.max(0, grid[r].indexOf('WILD')) : 1;
          const fromY = row * CELL_H + CELL_H / 2 - WIN_H / 2;
          c.y = WIN_H / 2 + fromY;
          c.scale.set(1, 1 / 3);
          gsap.to(c, { y: WIN_H / 2, duration: 0.55, delay, ease: 'back.out(1.4)' });
          gsap.to(c.scale, { y: 1, duration: 0.55, delay, ease: 'back.out(1.4)', onStart: () => sound.play('wild'), onComplete: () => res() });
        } else {
          c.alpha = 0;
          c.y = WIN_H / 2 - 120;
          gsap.to(c, { alpha: 1, y: WIN_H / 2, duration: 0.45, delay, ease: 'bounce.out', onStart: () => sound.play('wild'), onComplete: () => res() });
        }
        gsap.delayedCall(delay + 0.3, () => {
          const gx = this.x + c.x * this.scale.x;
          const gy = this.y + (WIN_H / 2) * this.scale.y;
          this.fx.flash(gx, gy, 2.5, 0xffb040);
          this.fx.sparkBurst(gx, gy, 26, 480);
          if (mode !== 'expand') this.fx.dustBurst(gx, this.y + WIN_H * this.scale.y, 8, 220);
        });
      });
      ps.push(p);
      // underlying reel shows wilds so line evaluation visuals match
      gsap.delayedCall(delay + 0.5, () => this.reels[r].views.forEach((v) => v.set('WILD')));
    });
    await Promise.all(ps);
  }

  clearOverlays() {
    for (const c of this.wildReels.values()) {
      gsap.killTweensOf(c);
      c.children.forEach((ch) => gsap.killTweensOf(ch));
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
          const c = this.cellCenter(r, row);
          gsap.delayedCall(i * 0.12, () => {
            gsap.to(v.scale, {
              x: 0,
              duration: 0.18,
              ease: 'power2.in',
              onComplete: () => {
                v.set(target);
                this.fx.flash(this.x + c.x * this.scale.x, this.y + c.y * this.scale.y, 1.6, 0xff5030);
                this.fx.sparkBurst(this.x + c.x * this.scale.x, this.y + c.y * this.scale.y, 12, 260, 0xff8040);
                sound.play('coin', { pitch: 0.7 + i * 0.05 });
                gsap.to(v.scale, { x: 1, duration: 0.35, ease: 'back.out(3)', onComplete: () => res() });
              },
            });
          });
        }),
    );
    await Promise.all(ps);
  }

  /** Pulse scatter symbols that triggered a bonus. */
  async celebrateScatters(positions: Pos[]) {
    for (const [r, row] of positions) {
      const v = this.view(r, row);
      gsap.to(v.glow, { alpha: 1, duration: 0.3 });
      gsap.fromTo(v.scale, { x: 1, y: 1 }, { x: 1.2, y: 1.2, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      const c = this.cellCenter(r, row);
      this.fx.sparkBurst(this.x + c.x * this.scale.x, this.y + c.y * this.scale.y, 18, 340);
    }
    sound.play('scatter');
    await wait(1600);
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
