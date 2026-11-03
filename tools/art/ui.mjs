/**
 * Logo, feature title signs, Bonus Buy card art, win banners (raster),
 * and vector HUD buttons/icons (written as .svg files to public/ui/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, lin, rad, fBevel, fGrain, fShadow, fGlow, svg, starPts, hexagram, GOLD_STOPS } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const O = (w = 2) => `stroke="${PAL.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const goldTextDefs = (p) => `${lin(p + 'tg', [[0, '#fffbe6'], [0.3, '#ffe07a'], [0.55, '#f5a524'], [0.75, '#c4700e'], [1, '#ffe48a']], 0, 0, 0, 1)}
  ${fBevel(p + 'tb', { blur: 1.4, surface: 2.2, spec: 1.1, exp: 22 })}
  ${fShadow(p + 'ts', { dy: 6, blur: 5, op: 0.75 })}`;

/** Layered gold title text: thick dark outline + gold bevel fill. */
function goldText(p, x, y, size, txt, { font = 'Rye', ls = 2, sw = null } = {}) {
  const s = sw ?? size * 0.12;
  return `<g filter="url(#${p}ts)">
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" letter-spacing="${ls}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="${s * 2}" stroke-linejoin="round">${txt}</text>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" letter-spacing="${ls}" fill="#7a3a08" stroke="#7a3a08" stroke-width="${s}" stroke-linejoin="round" transform="translate(0 ${size * 0.04})">${txt}</text>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" letter-spacing="${ls}" fill="url(#${p}tg)" filter="url(#${p}tb)">${txt}</text>
  </g>`;
}

function winBanner(kind) {
  const p = 'WB' + kind;
  const c = { big: ['#ffd36b', '#c4700e', 'BIG WIN', 120], mega: ['#ff7a4a', '#a3160c', 'MEGA WIN', 118], epic: ['#ff5ac8', '#5a1a9a', 'EPIC WIN', 118] }[kind];
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI - Math.PI;
    return `<path d="M450 200 L ${450 + Math.cos(a - 0.08) * 460} ${200 + Math.sin(a - 0.08) * 300} L ${450 + Math.cos(a + 0.08) * 460} ${200 + Math.sin(a + 0.08) * 300} Z" fill="${c[0]}" opacity=".35"/>`;
  }).join('');
  return svg(900, 320, `${goldTextDefs(p)}${lin(p + 'r', [[0, c[0]], [1, c[1]]], 0, 0, 0, 1)}${lin(p + 'tr', GOLD_STOPS, 0, 0, 0, 1)}${fShadow(p + 'sh', { dy: 8, blur: 8, op: 0.7 })}${fBevel(p + 'bev', { blur: 2, surface: 3 })}`,
    `${rays}
     <g filter="url(#${p}sh)"><path d="M60 140 L 840 140 L 880 210 L 840 280 L 60 280 L 20 210 Z" fill="url(#${p}r)" ${O(3)}/></g>
     <path d="M60 140 L 840 140 L 880 210 L 840 280 L 60 280 L 20 210 Z" fill="none" stroke="url(#${p}tr)" stroke-width="8" filter="url(#${p}bev)"/>
     ${[-1, 1].map((s) => `<polygon points="${starPts(450 + s * 330, 90, 5, 34, 14)}" fill="url(#${p}tr)" ${O(2)}/>`).join('')}
     ${goldText(p, 450, 248, c[3], c[2])}`);
}

// ------------------------------------------------------------------ DOM vector UI (written to public/ui)
function writeUiSvgs() {
  const dir = path.join(ROOT, 'public/ui');
  fs.mkdirSync(dir, { recursive: true });
  const ring = (id) => `${lin(id + 'g', [[0, '#fff3c0'], [0.25, '#ffd36b'], [0.55, '#b0640e'], [0.8, '#f2b84a'], [1, '#6a3a06']], 0, 0, 0.2, 1)}
    ${rad(id + 'l', [[0, '#7a4524'], [0.7, '#3a1a08'], [1, '#1a0a02']], 0.4, 0.3, 0.75)}`;
  const base = (inner, size = 100) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><defs>${ring('r')}
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".6"/></filter></defs>
    <g filter="url(#s)"><circle cx="50" cy="50" r="45" fill="url(#rg)" stroke="#2a1206" stroke-width="2"/></g>
    <circle cx="50" cy="50" r="36" fill="url(#rl)" stroke="#2a1206" stroke-width="1.5"/>
    <path d="M22 38 A 30 30 0 0 1 60 18" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>
    <g fill="#ffd97a" stroke="#ffd97a" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  const icons = {
    info: `<circle cx="50" cy="32" r="5" stroke="none"/><rect x="45" y="42" width="10" height="28" rx="3" stroke="none"/>`,
    sound: `<path d="M30 42 h10 l14 -12 v40 l-14 -12 h-10 z" stroke="none"/><path d="M62 38 q8 12 0 24 M68 32 q14 18 0 36" fill="none" stroke-width="4"/>`,
    mute: `<path d="M30 42 h10 l14 -12 v40 l-14 -12 h-10 z" stroke="none"/><path d="M62 40 l14 20 M76 40 l-14 20" fill="none" stroke-width="4.5"/>`,
    history: `<circle cx="50" cy="50" r="20" fill="none" stroke-width="4.5"/><path d="M50 38 v13 l9 6" fill="none" stroke-width="4.5"/>`,
    settings: `<path d="M50 28 l5 6 l8 -2 l1 8 l7 4 l-4 7 l4 7 l-7 4 l-1 8 l-8 -2 l-5 6 l-5 -6 l-8 2 l-1 -8 l-7 -4 l4 -7 l-4 -7 l7 -4 l1 -8 l8 2 z" stroke="none"/><circle cx="50" cy="50" r="7" fill="#3a1a08" stroke="none"/>`,
    turbo: `<path d="M30 32 l18 18 l-18 18 z M52 32 l18 18 l-18 18 z" stroke="none"/>`,
    auto: `<path d="M38 30 l30 20 l-30 20 z" stroke="none"/>`,
    stop: `<rect x="34" y="34" width="32" height="32" rx="4" stroke="none"/>`,
    plus: `<rect x="44" y="28" width="12" height="44" rx="3" stroke="none"/><rect x="28" y="44" width="44" height="12" rx="3" stroke="none"/>`,
    minus: `<rect x="28" y="44" width="44" height="12" rx="3" stroke="none"/>`,
    close: `<path d="M34 34 l32 32 M66 34 l-32 32" fill="none" stroke-width="7"/>`,
    music: `<path d="M42 64 v-30 l24 -6 v30" fill="none" stroke-width="4.5"/><circle cx="38" cy="65" r="6" stroke="none"/><circle cx="62" cy="59" r="6" stroke="none"/>`,
  };
  const keep = ['minus', 'plus', 'close', 'settings', 'music', 'history', 'stop'];
  for (const [n, inner] of Object.entries(icons)) if (keep.includes(n)) fs.writeFileSync(path.join(dir, `btn_${n}.svg`), base(inner));
  // Favicon
  fs.writeFileSync(path.join(dir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#c4700e"/><path d="${hexagram(32, 32, 20)}" fill="#fff3c0" stroke="#3a1206" stroke-width="2"/></svg>`);
}

export default function () {
  writeUiSvgs();
  return [
    { name: 'win_big', w: 900, h: 320, scale: 1.2, svg: winBanner('big'), group: 'ui' },
    { name: 'win_mega', w: 900, h: 320, scale: 1.2, svg: winBanner('mega'), group: 'ui' },
    { name: 'win_epic', w: 900, h: 320, scale: 1.2, svg: winBanner('epic'), group: 'ui' },
  ];
}
