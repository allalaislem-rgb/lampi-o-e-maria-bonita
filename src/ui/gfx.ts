/**
 * Procedurally generated textures (canvas 2D) and shared text styles.
 * Keeps the build free of extra image files for frames, glows and particles.
 */
import { FillGradient, Text, TextStyle, Texture } from 'pixi.js';

const cache = new Map<string, Texture>();

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = Texture.from(cv);
  cache.set(key, t);
  return t;
}

/** Soft white radial dot (particles, glows – tint it). */
export const softDot = () =>
  canvasTex('softDot', 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

/** Warm golden glow. */
export const glowTex = () =>
  canvasTex('glow', 256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,170,0.95)');
    g.addColorStop(0.3, 'rgba(255,190,70,0.55)');
    g.addColorStop(0.65, 'rgba(255,120,20,0.18)');
    g.addColorStop(1, 'rgba(255,90,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

/** 4-point star sparkle. */
export const sparkTex = () =>
  canvasTex('spark', 128, 128, (c, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.15, 'rgba(255,230,150,.8)');
    g.addColorStop(1, 'rgba(255,180,60,0)');
    c.fillStyle = g;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? w / 2 : w * 0.07;
      c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  });

/** Dust cloud puff. */
export const dustTex = () =>
  canvasTex('dust', 128, 128, (c, w, h) => {
    for (let i = 0; i < 14; i++) {
      const x = w / 2 + (Math.random() - 0.5) * w * 0.45;
      const y = h / 2 + (Math.random() - 0.5) * h * 0.45;
      const r = w * (0.15 + Math.random() * 0.2);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(225,180,120,.35)');
      g.addColorStop(1, 'rgba(200,150,90,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  });

/** Full-screen vignette. */
export const vignetteTex = (strength = 0.85) =>
  canvasTex('vignette' + strength, 512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

/** God rays fan (additive). */
export const raysTex = () =>
  canvasTex('rays', 512, 512, (c, w, h) => {
    c.translate(w / 2, h / 2);
    for (let i = 0; i < 18; i++) {
      c.rotate((Math.PI * 2) / 18);
      const g = c.createLinearGradient(0, 0, 0, -h / 2);
      g.addColorStop(0, 'rgba(255,220,140,.5)');
      g.addColorStop(1, 'rgba(255,200,100,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-w * 0.05, -h / 2);
      c.lineTo(w * 0.05, -h / 2);
      c.closePath();
      c.fill();
    }
  });

function goldStroke(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, lw: number) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#fff3bf');
  g.addColorStop(0.18, '#f7c84a');
  g.addColorStop(0.5, '#a8650f');
  g.addColorStop(0.78, '#f2bd45');
  g.addColorStop(1, '#6b3d0a');
  c.strokeStyle = g;
  c.lineWidth = lw;
  roundRect(c, x, y, w, h, r);
  c.stroke();
}

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Leather & gold reel frame. `inner` = reel window size; returns texture sized inner + 2*pad. */
export function frameTex(key: string, iw: number, ih: number, pad: number, theme: 'leather' | 'wood' | 'iron' = 'leather') {
  const S = 1; // drawn at 1:1 design pixels (world scale handles DPI)
  return canvasTex(`frame-${key}`, (iw + pad * 2) * S, (ih + pad * 2) * S, (c, W, H) => {
    c.scale(S, S);
    const w = W / S;
    const h = H / S;
    // outer body
    const body = c.createLinearGradient(0, 0, 0, h);
    if (theme === 'iron') {
      body.addColorStop(0, '#4a3a33');
      body.addColorStop(0.5, '#231915');
      body.addColorStop(1, '#3a2b24');
    } else if (theme === 'wood') {
      body.addColorStop(0, '#5b3218');
      body.addColorStop(0.5, '#3a1d0c');
      body.addColorStop(1, '#4d2a14');
    } else {
      body.addColorStop(0, '#7a4220');
      body.addColorStop(0.5, '#4a2410');
      body.addColorStop(1, '#5e3117');
    }
    c.shadowColor = 'rgba(0,0,0,.7)';
    c.shadowBlur = 30;
    c.shadowOffsetY = 12;
    c.fillStyle = body;
    roundRect(c, 10, 10, w - 20, h - 20, 34);
    c.fill();
    c.shadowColor = 'transparent';
    // grain / stitching texture
    c.save();
    roundRect(c, 10, 10, w - 20, h - 20, 34);
    c.clip();
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = `rgba(${theme === 'iron' ? '200,180,160' : '255,200,140'},${Math.random() * 0.05})`;
      c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 30, 1);
    }
    c.restore();
    // stitching line
    c.setLineDash([9, 7]);
    c.strokeStyle = 'rgba(255,220,160,.45)';
    c.lineWidth = 2;
    roundRect(c, 22, 22, w - 44, h - 44, 26);
    c.stroke();
    c.setLineDash([]);
    // gold outer border
    goldStroke(c, 12, 12, w - 24, h - 24, 32, 7);
    // inner window
    const ix = pad;
    const iy = pad;
    const win = c.createLinearGradient(0, iy, 0, iy + ih);
    if (theme === 'iron') {
      win.addColorStop(0, 'rgba(25,14,10,.92)');
      win.addColorStop(1, 'rgba(45,22,12,.92)');
    } else {
      win.addColorStop(0, 'rgba(52,26,12,.90)');
      win.addColorStop(0.5, 'rgba(78,40,18,.86)');
      win.addColorStop(1, 'rgba(40,20,9,.92)');
    }
    c.fillStyle = win;
    roundRect(c, ix, iy, iw, ih, 14);
    c.fill();
    // inner shadow
    c.save();
    roundRect(c, ix, iy, iw, ih, 14);
    c.clip();
    c.shadowColor = 'rgba(0,0,0,.9)';
    c.shadowBlur = 26;
    c.lineWidth = 30;
    c.strokeStyle = 'rgba(0,0,0,.6)';
    roundRect(c, ix - 15, iy - 15, iw + 30, ih + 30, 20);
    c.stroke();
    c.restore();
    goldStroke(c, ix - 3, iy - 3, iw + 6, ih + 6, 16, 5);
    // silver conchos (like the cangaceiro hat)
    const studs = (x: number, y: number) => {
      const g = c.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, '#c9c4bb');
      g.addColorStop(1, '#5d5148');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, 10, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#3b2a1c';
      c.lineWidth = 1.5;
      c.stroke();
      // tiny star
      c.fillStyle = 'rgba(90,70,50,.8)';
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? 2.2 : 5.5;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.fill();
    };
    const n = Math.floor(w / 130);
    for (let i = 1; i < n; i++) {
      studs((w / n) * i, pad / 2 + 4);
      studs((w / n) * i, h - pad / 2 - 4);
    }
    const m = Math.max(2, Math.floor(h / 160));
    for (let i = 1; i < m; i++) {
      studs(pad / 2 + 4, (h / m) * i);
      studs(w - pad / 2 - 4, (h / m) * i);
    }
  });
}

/** Column separator / cell slot for Hold & Respin. */
export const slotTex = (w: number, h: number) =>
  canvasTex(`slot-${w}x${h}`, w, h, (c) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1c0f0a');
    g.addColorStop(1, '#3a1f12');
    c.fillStyle = g;
    roundRect(c, 4, 4, w - 8, h - 8, 16);
    c.fill();
    c.save();
    roundRect(c, 4, 4, w - 8, h - 8, 16);
    c.clip();
    c.shadowColor = 'rgba(0,0,0,1)';
    c.shadowBlur = 18;
    c.lineWidth = 16;
    c.strokeStyle = 'rgba(0,0,0,.7)';
    roundRect(c, -4, -4, w + 8, h + 8, 20);
    c.stroke();
    c.restore();
    const s = c.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, '#d9a441');
    s.addColorStop(0.5, '#6b3d0a');
    s.addColorStop(1, '#c98a1c');
    c.strokeStyle = s;
    c.lineWidth = 3;
    roundRect(c, 4, 4, w - 8, h - 8, 16);
    c.stroke();
  });

/** Info plate (wood + gold). */
export const plateTex = (w: number, h: number) =>
  canvasTex(`plate-${w}x${h}`, w, h, (c) => {
    c.shadowColor = 'rgba(0,0,0,.7)';
    c.shadowBlur = 12;
    c.shadowOffsetY = 5;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4f2912');
    g.addColorStop(1, '#1d0d05');
    c.fillStyle = g;
    roundRect(c, 8, 6, w - 16, h - 16, 18);
    c.fill();
    c.shadowColor = 'transparent';
    goldStroke(c, 8, 6, w - 16, h - 16, 18, 4);
  });

// ------------------------------------------------------------------ text
export const FONT_TITLE = 'Rye, Georgia, serif';
export const FONT_NUM = '"Alfa Slab One", Georgia, serif';

function goldFill() {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: '#fffbe0' },
      { offset: 0.35, color: '#ffd760' },
      { offset: 0.6, color: '#f0a020' },
      { offset: 1, color: '#ffe48a' },
    ],
    textureSpace: 'local',
  });
}

export function goldText(text: string, size: number, font = FONT_NUM, strokeW = Math.max(3, size / 9)): Text {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: font,
      fontSize: size,
      fill: goldFill(),
      stroke: { color: '#4a2005', width: strokeW, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.65, blur: 6, distance: Math.max(2, size / 14), angle: Math.PI / 2 },
      align: 'center',
      letterSpacing: 1,
    }),
    anchor: 0.5,
  });
}

export function plainText(text: string, size: number, color = '#fbe9c6', font = FONT_TITLE): Text {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: font,
      fontSize: size,
      fill: color,
      stroke: { color: '#1a0a02', width: Math.max(2, size / 8), join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.6, blur: 3, distance: 2, angle: Math.PI / 2 },
      align: 'center',
      letterSpacing: 1,
    }),
    anchor: 0.5,
  });
}
