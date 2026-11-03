/**
 * Art library – shared materials, filters and drawing helpers for the
 * code-authored artwork of Lampião & Maria Bonita.
 *
 * Every asset is authored as SVG (vector) and rasterised by tools/art/render.mjs
 * in headless Chromium at high resolution, then packed into texture atlases.
 *
 * Lighting convention for ALL assets (keeps the set cohesive):
 *   key light  : warm, from the top-left  (azimuth 225°, elevation ~50°)
 *   rim light  : sunset orange, from the right
 *   shadows    : warm dark brown (#2a1206), never pure black
 */

export const PAL = {
  ink: '#2a1206', // outline / deepest shadow
  ink2: '#4a2410',
  gold0: '#fff6cf', gold1: '#ffe08a', gold2: '#f5b83d', gold3: '#c47a14', gold4: '#7a430a',
  leather0: '#c98a52', leather1: '#a5652f', leather2: '#7c4520', leather3: '#4f2810',
  wood0: '#a8693a', wood1: '#7f4a24', wood2: '#5a3015', wood3: '#341a0a',
  red0: '#ff6b52', red1: '#e2321f', red2: '#a8180f', red3: '#650a06',
  steel0: '#f4f1ec', steel1: '#c9c4bc', steel2: '#8d867d', steel3: '#4a4540',
  brass0: '#ffe9a8', brass1: '#e0b154', brass2: '#a8741f', brass3: '#5e3d0c',
  skin0: '#f3c597', skin1: '#d99a68', skin2: '#a9663b', skin3: '#6e3a1c',
  hair: '#1d0f08', hair2: '#3a2216',
  green0: '#9ad06a', green1: '#5f9c3a', green2: '#356b22', green3: '#1b3d12',
  paper0: '#f7e6bf', paper1: '#e7c98d', paper2: '#c99a55', paper3: '#7f5326',
  teal0: '#7fd6cf', teal1: '#2f9a99', teal2: '#17605f', teal3: '#0b3434',
  sky0: '#ffd27a', sky1: '#ff9a3c', sky2: '#d9542a', sky3: '#6b1d2a',
};

let uid = 0;
export const id = (p = 'i') => `${p}${++uid}`;

// ------------------------------------------------------------------ gradients
export function lin(gid, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = 'objectBoundingBox') {
  return `<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="${units}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`;
}
export function rad(gid, stops, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy, units = 'objectBoundingBox') {
  return `<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}" gradientUnits="${units}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</radialGradient>`;
}

export const GOLD_STOPS = [[0, PAL.gold0], [0.22, PAL.gold1], [0.45, PAL.gold2], [0.62, PAL.gold3], [0.8, PAL.gold2], [1, PAL.gold4]];
export const GOLD_BRIGHT = [[0, '#fffbe8'], [0.3, PAL.gold1], [0.6, PAL.gold2], [1, PAL.gold3]];
export const STEEL_STOPS = [[0, PAL.steel0], [0.3, PAL.steel1], [0.55, PAL.steel2], [0.7, PAL.steel1], [1, PAL.steel3]];
export const LEATHER_STOPS = [[0, PAL.leather0], [0.45, PAL.leather1], [1, PAL.leather3]];
export const WOOD_STOPS = [[0, PAL.wood0], [0.5, PAL.wood1], [1, PAL.wood3]];
export const BRASS_STOPS = [[0, PAL.brass0], [0.35, PAL.brass1], [0.7, PAL.brass2], [1, PAL.brass3]];

// ------------------------------------------------------------------ filters
/** Embossed bevel with specular highlight (key light top-left). */
export function fBevel(fid, { blur = 2.2, surface = 3, spec = 0.9, exp = 18, elev = 48, color = '#fff6e0', amount = 1 } = {}) {
  return `<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>
    <feSpecularLighting in="b" surfaceScale="${surface}" specularConstant="${spec}" specularExponent="${exp}" lighting-color="${color}" result="s">
      <feDistantLight azimuth="225" elevation="${elev}"/></feSpecularLighting>
    <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
    <feDiffuseLighting in="b" surfaceScale="${surface}" diffuseConstant="1" lighting-color="#ffffff" result="d">
      <feDistantLight azimuth="225" elevation="${elev + 10}"/></feDiffuseLighting>
    <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="${0.9 * amount}" k2="${1 - 0.9 * amount + 0.15}" result="lit"/>
    <feComposite in="lit" in2="s2" operator="arithmetic" k2="1" k3="${0.75 * amount}" result="o"/>
    <feComposite in="o" in2="SourceAlpha" operator="in"/>
  </filter>`;
}

/** Grain / material texture: adds luminance noise inside the shape. */
export function fGrain(fid, { freq = '0.9', oct = 2, amt = 0.18, seed = 3, type = 'fractalNoise' } = {}) {
  return `<filter id="${fid}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="${type}" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0" result="g"/>
    <feComposite in="SourceGraphic" in2="g" operator="arithmetic" k2="1" k3="${amt}" k4="${-amt / 2}" result="m"/>
    <feComposite in="m" in2="SourceAlpha" operator="in"/>
  </filter>`;
}

/** Soft drop shadow (warm). */
export function fShadow(fid, { dx = 0, dy = 4, blur = 4, op = 0.55, color = PAL.ink } = {}) {
  return `<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${blur}" flood-color="${color}" flood-opacity="${op}"/></filter>`;
}

/** Outer glow. */
export function fGlow(fid, { blur = 6, color = '#ffd36b', op = 0.9 } = {}) {
  return `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>
    <feFlood flood-color="${color}" flood-opacity="${op}"/><feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

/** Plain gaussian blur. */
export const fBlur = (fid, sd = 3) => `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

// ------------------------------------------------------------------ helpers
export function svg(w, h, defs, body, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${extra}><defs>${defs}</defs>${body}</svg>`;
}

/** Star polygon points. */
export function starPts(cx, cy, n, r1, r2, rot = -Math.PI / 2) {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n;
    p.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return p.join(' ');
}

/** Hexagram (Signo de Salomão), as two triangles path. */
export function hexagram(cx, cy, r) {
  const tri = (rot) => {
    const pts = [0, 1, 2].map((i) => {
      const a = rot + (i * 2 * Math.PI) / 3;
      return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
    });
    return `M${pts[0]} L${pts[1]} L${pts[2]} Z`;
  };
  return tri(-Math.PI / 2) + ' ' + tri(Math.PI / 2);
}

export const rnd = (() => {
  let s = 1234567;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
})();

/** Repeat a shape along a polyline (used for bullets on bandoliers). */
export function along(points, step, fn) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    let d = acc;
    while (d < len) {
      const t = d / len;
      out.push(fn(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, ang, out.length));
      d += step;
    }
    acc = d - len;
  }
  return out.join('');
}

export const FONT_CSS = `
@font-face{font-family:'Rye';src:url('/fonts/Rye.woff2') format('woff2')}
@font-face{font-family:'Alfa Slab One';src:url('/fonts/AlfaSlabOne.woff2') format('woff2')}
@font-face{font-family:'Roboto Condensed';src:url('/fonts/RobotoCondensed.woff2') format('woff2');font-weight:100 900}`;
