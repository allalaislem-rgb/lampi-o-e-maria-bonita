/**
 * Slot symbols – 200×180 cell, rendered at 2.4× (480×432 px).
 */
import { PAL, lin, rad, fBevel, fGrain, fShadow, fGlow, svg, starPts, hexagram, GOLD_STOPS, STEEL_STOPS, BRASS_STOPS, along } from './lib.mjs';
import { lampiao, maria } from './characters.mjs';

const W = 200;
const H = 180;
const S = 2.4;
const O = `stroke="${PAL.ink}" stroke-linejoin="round" stroke-linecap="round"`;

/** Common defs every symbol may use (prefixed per symbol). */
function common(p) {
  return `${rad(p + 'goldR', [[0, '#fffbe6'], [0.35, PAL.gold1], [0.7, PAL.gold2], [1, PAL.gold3]], 0.35, 0.3, 0.75)}
    ${lin(p + 'gold', GOLD_STOPS, 0, 0, 0.3, 1)}
    ${lin(p + 'steel', STEEL_STOPS, 0, 0, 0, 1)}
    ${lin(p + 'brassL', BRASS_STOPS, 0, 0, 0, 1)}
    ${fBevel(p + 'bevel', { blur: 1.6, surface: 2.4 })}
    ${fBevel(p + 'bevelSoft', { blur: 2.6, surface: 2, spec: 0.55, exp: 14, amount: 0.7 })}
    ${fShadow(p + 'shadow', { dy: 5, blur: 4.5, op: 0.6 })}
    ${fGrain(p + 'grain', { freq: '0.8', amt: 0.14 })}`;
}

/** Ornate gold card used by the character symbols. */
function card(p, bgStops, inner, { glow = null, plate = null } = {}) {
  const x = 8, y = 5, w = 184, h = 170, r = 20;
  const ix = x + 9, iy = y + 9, iw = w - 18, ih = h - 18;
  return {
    defs: `${rad(p + 'bg', bgStops, 0.62, 0.32, 0.85)}
      <clipPath id="${p}clip"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${r - 8}"/></clipPath>
      ${lin(p + 'frame', [[0, '#fff5c9'], [0.18, PAL.gold1], [0.4, PAL.gold3], [0.55, PAL.gold2], [0.78, PAL.gold1], [1, PAL.gold4]], 0, 0, 0.4, 1)}
      ${lin(p + 'glass', [[0, '#ffffff', 0.28], [0.45, '#ffffff', 0.04], [1, '#ffffff', 0]], 0, 0, 0.6, 1)}
      ${lin(p + 'vig', [[0, '#000', 0], [0.75, '#000', 0], [1, PAL.ink, 0.4]], 0, 0, 0, 1)}`,
    body: `<g filter="url(#${p}shadow)">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${p}frame)" ${O} stroke-width="2.2" filter="url(#${p}bevel)"/>
      </g>
      <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${r - 8}" fill="url(#${p}bg)"/>
      <g clip-path="url(#${p}clip)">
        ${inner}
        <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#${p}vig)"/>
        <path d="M${ix} ${iy} L ${ix + iw * 0.62} ${iy} L ${ix} ${iy + ih * 0.55} Z" fill="url(#${p}glass)"/>
      </g>
      <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${r - 8}" fill="none" stroke="${PAL.gold4}" stroke-width="2.4"/>
      <rect x="${ix - 1.5}" y="${iy - 1.5}" width="${iw + 3}" height="${ih + 3}" rx="${r - 7}" fill="none" stroke="#fff3c0" stroke-width=".8" opacity=".7"/>
      ${[[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]]
        .map(([cx, cy]) => `<polygon points="${starPts(cx, cy, 4, 8, 2.6, 0)}" fill="url(#${p}goldR)" ${O} stroke-width=".9"/>`)
        .join('')}
      ${glow || ''}${plate || ''}`,
  };
}

/** Landscape inside the portrait cards. */
function vista(p, sky, hill, sun = true) {
  return `${sun ? `<circle cx="150" cy="70" r="26" fill="${sky}" opacity=".9"/><circle cx="150" cy="70" r="40" fill="${sky}" opacity=".25"/>` : ''}
    <path d="M10 128 L40 108 L58 118 L84 96 L104 112 L128 92 L150 110 L172 100 L196 116 L196 190 L10 190 Z" fill="${hill}" opacity=".85"/>
    <path d="M10 140 C 50 128, 90 136, 120 130 C 150 124, 175 132, 196 128 L196 190 L10 190 Z" fill="${hill}" opacity="1" style="filter:brightness(.7)"/>
    <g fill="${hill}" style="filter:brightness(.55)"><path d="M28 140 v-26 q0 -4 4 -4 q4 0 4 4 v10 h6 v-8 q0 -3 3 -3 q3 0 3 3 v12 q0 4 -6 4 h-6 v8z"/><path d="M168 140 v-22 q0 -3 3 -3 q3 0 3 3 v7 h5 v-6 q0 -3 3 -3 q3 0 3 3 v9 q0 4 -5 4 h-6 v8z"/></g>`;
}

// ===================================================================== symbols
function symLampiao() {
  const p = 'L';
  const ch = lampiao(p, { faceY: 100 });
  const c = card(p, [[0, '#ffd27a'], [0.35, '#f08a35'], [0.7, '#b03a1e'], [1, '#4a1010']], vista(p, '#ffe9a8', '#6b2614') + ch.body);
  return svg(W, H, common(p) + ch.defs + c.defs, c.body);
}

function symMaria() {
  const p = 'M';
  const ch = maria(p, { faceY: 100 });
  const c = card(p, [[0, '#bfe9df'], [0.35, '#4fb3ad'], [0.7, '#1f6b73'], [1, '#0b2a33']], vista(p, '#fff1c9', '#123f45') + ch.body);
  return svg(W, H, common(p) + ch.defs + c.defs, c.body);
}

function symWild() {
  const p = 'W';
  const ch = lampiao(p, { cx: 88, faceY: 86, scale: 0.92 });
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `<path d="M100 82 L ${100 + Math.cos(a - 0.09) * 160} ${82 + Math.sin(a - 0.09) * 160} L ${100 + Math.cos(a + 0.09) * 160} ${82 + Math.sin(a + 0.09) * 160} Z" fill="#fff6c8" opacity="${i % 2 ? 0.16 : 0.28}"/>`;
  }).join('');
  const plate = `<g filter="url(#${p}shadow)">
      <path d="M22 128 L178 128 L186 150 L178 172 L22 172 L14 150 Z" fill="url(#${p}plateRed)" ${O} stroke-width="2.2"/>
      <path d="M26 132 L174 132 L181 150 L174 168 L26 168 L19 150 Z" fill="none" stroke="${PAL.gold1}" stroke-width="2"/>
    </g>
    <text x="100" y="164" text-anchor="middle" font-family="Rye" font-size="38" fill="url(#${p}wildTxt)" stroke="${PAL.ink}" stroke-width="2.6" paint-order="stroke" letter-spacing="2">WILD</text>
    <text x="100" y="164" text-anchor="middle" font-family="Rye" font-size="38" fill="none" stroke="#fff8d8" stroke-width=".7" opacity=".7" letter-spacing="2">WILD</text>`;
  const rv = revolverArt(p);
  const gun = `<g transform="translate(150 118) rotate(-78) scale(.5) translate(-40 -130)">${rv.body}</g>
    <g transform="translate(146 112)"><ellipse rx="11" ry="9" fill="url(#${p}skinH)" ${O} stroke-width="1.6"/><path d="M-8 -4 h12 M-9 1 h13 M-8 6 h11" stroke="${PAL.skin3}" stroke-width="1.2"/></g>
    <path d="M128 180 C 132 150, 140 130, 146 120 L 160 124 C 156 140, 150 160, 150 180 Z" fill="#5a3a1e" ${O} stroke-width="1.8"/>
    <g transform="translate(176 28)" opacity=".95"><polygon points="${starPts(0, 0, 4, 16, 3, 0)}" fill="#fffbe0"/><circle r="5" fill="#fff"/></g>`;
  const c = card(p, [[0, '#fff3b8'], [0.3, '#ffc94a'], [0.65, '#e07a12'], [1, '#6a2406']], rays + ch.body + gun, { plate });
  const defs = rv.defs + `${lin(p + 'skinH', [[0, PAL.skin0], [1, PAL.skin2]], 0, 0, 1, 1)}
    ${lin(p + 'plateRed', [[0, '#e8402a'], [0.5, '#a3160c'], [1, '#5a0805']], 0, 0, 0, 1)}
    ${lin(p + 'wildTxt', [[0, '#fffbe6'], [0.4, '#ffe07a'], [0.7, '#f2a52a'], [1, '#ffe9a0']], 0, 0, 0, 1)}`;
  return svg(W, H, common(p) + ch.defs + c.defs + defs, c.body);
}

// ----- scatters
function symWanted() {
  const p = 'P';
  const ch = lampiao(p, { faceY: 96, scale: 0.62 });
  const paper = `M30 10 L170 8 Q 176 30 172 60 Q 178 100 172 130 Q 176 152 170 172 L 32 174 Q 24 150 28 120 Q 22 80 28 50 Q 24 26 30 10 Z`;
  return svg(W, H, common(p) + ch.defs + `
    ${lin(p + 'paper', [[0, PAL.paper0], [0.6, PAL.paper1], [1, PAL.paper2]], 0, 0, 0.3, 1)}
    ${rad(p + 'burn', [[0, '#000', 0], [0.75, PAL.paper3, 0.0], [1, '#5a2e0c', 0.75]], 0.5, 0.5, 0.62)}
    <filter id="${p}sepia" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.36 0.62 0.16 0 0  0.30 0.52 0.12 0 0  0.20 0.38 0.10 0 0  0 0 0 1 0"/></filter>
    <clipPath id="${p}portrait"><rect x="54" y="52" width="92" height="82"/></clipPath>
    ${fGrain(p + 'paperGrain', { freq: '0.04 0.9', oct: 3, amt: 0.22, seed: 9 })}`,
    `<g filter="url(#${p}shadow)" transform="rotate(-2 100 90)">
      <path d="${paper}" fill="url(#${p}paper)" ${O} stroke-width="1.8" filter="url(#${p}paperGrain)"/>
      <path d="${paper}" fill="url(#${p}burn)"/>
      <text x="100" y="44" text-anchor="middle" font-family="Rye" font-size="27" fill="#4a1a08" letter-spacing="1">WANTED</text>
      <rect x="52" y="50" width="96" height="86" fill="#d9b67a" stroke="#4a1a08" stroke-width="2"/>
      <g clip-path="url(#${p}portrait)" filter="url(#${p}sepia)"><rect x="54" y="52" width="92" height="82" fill="#e9cf98"/>${ch.body}</g>
      <text x="100" y="155" text-anchor="middle" font-family="Rye" font-size="13" fill="#4a1a08">DEAD OR ALIVE</text>
      <text x="100" y="168" text-anchor="middle" font-family="Alfa Slab One" font-size="11" fill="${PAL.red2}">REWARD</text>
      <circle cx="38" cy="18" r="4" fill="url(#${p}steel)" ${O} stroke-width=".8"/><circle cx="162" cy="17" r="4" fill="url(#${p}steel)" ${O} stroke-width=".8"/>
      <path d="M150 140 l14 -6 l-4 12 z" fill="${PAL.red2}" opacity=".0"/>
    </g>`);
}

function symMap() {
  const p = 'A';
  return svg(W, H, common(p) + `
    ${lin(p + 'paper', [[0, PAL.paper0], [0.5, '#ecd19b'], [1, PAL.paper2]], 0, 0, 1, 1)}
    ${lin(p + 'roll', [[0, PAL.paper3], [0.35, PAL.paper1], [0.6, PAL.paper0], [1, PAL.paper2]], 0, 0, 1, 0)}
    ${rad(p + 'edge', [[0, '#000', 0], [0.7, '#000', 0], [1, '#6b3a12', 0.6]], 0.5, 0.5, 0.65)}
    ${fGrain(p + 'paperGrain', { freq: '0.05 0.7', oct: 3, amt: 0.2, seed: 4 })}`,
    `<g filter="url(#${p}shadow)">
      <path d="M30 26 C 70 18, 120 32, 170 22 L 174 150 C 124 160, 76 146, 28 156 Z" fill="url(#${p}paper)" ${O} stroke-width="1.8" filter="url(#${p}paperGrain)"/>
      <path d="M30 26 C 70 18, 120 32, 170 22 L 174 150 C 124 160, 76 146, 28 156 Z" fill="url(#${p}edge)"/>
      <!-- mountains -->
      <g stroke="#6b3a12" stroke-width="1.6" fill="none" stroke-linejoin="round">
        <path d="M44 74 l12 -18 l8 10 l10 -16 l14 24"/><path d="M52 66 l4 -4 M68 56 l4 6"/>
        <path d="M118 120 l10 -14 l7 8 l9 -12 l12 18"/>
      </g>
      <!-- cacti -->
      <g fill="${PAL.green2}"><path d="M120 66 v-14 q0 -3 2.5 -3 t2.5 3 v6 h3 v-4 q0 -2 2 -2 t2 2 v6 q0 3 -4 3 h-1 v3z"/><path d="M60 124 v-12 q0 -2.5 2 -2.5 t2 2.5 v5 h3 v-3 q0 -2 2 -2 t2 2 v5 q0 3 -3 3 h-2 v2z"/></g>
      <!-- route -->
      <path d="M50 132 C 62 108, 84 120, 92 98 S 112 70, 130 86 S 146 64, 150 52" fill="none" stroke="${PAL.red2}" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round"/>
      <g transform="translate(150 50)"><path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="${PAL.red2}" stroke-width="5" stroke-linecap="round"/><path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="${PAL.red0}" stroke-width="2" stroke-linecap="round"/></g>
      <!-- compass -->
      <g transform="translate(64 136)"><circle r="13" fill="none" stroke="#6b3a12" stroke-width="1.4"/><polygon points="${starPts(0, 0, 4, 12, 3, -Math.PI / 2)}" fill="#6b3a12"/><polygon points="0,-12 3,0 0,0" fill="${PAL.red2}"/></g>
      <!-- rolled ends -->
      <path d="M22 22 C 26 18, 36 18, 38 24 L 36 160 C 32 154, 24 154, 20 158 Z" fill="url(#${p}roll)" ${O} stroke-width="1.6"/>
      <path d="M162 18 C 166 14, 176 14, 180 20 L 182 152 C 178 146, 170 146, 166 150 Z" fill="url(#${p}roll)" ${O} stroke-width="1.6"/>
    </g>`);
}

function symEmblem() {
  const p = 'E';
  const studs = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `<circle cx="${100 + Math.cos(a) * 66}" cy="${90 + Math.sin(a) * 66}" r="3.6" fill="url(#${p}goldR)" ${O} stroke-width=".7"/>`;
  }).join('');
  const smallStars = [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i - 1) * 0.62;
    return `<polygon points="${starPts(100 + Math.cos(a) * 46, 90 + Math.sin(a) * 46, 5, 9, 3.8)}" fill="url(#${p}goldR)" ${O} stroke-width="1"/>`;
  }).join('');
  return svg(W, H, common(p) + `
    ${rad(p + 'leather', [[0, '#b8743c'], [0.6, '#7c4520'], [1, '#3f1e0b']], 0.4, 0.35, 0.75)}
    ${fGrain(p + 'lg', { freq: '1.2', oct: 2, amt: 0.2, seed: 7 })}
    ${fGlow(p + 'glow', { blur: 7, color: '#ffcf5a', op: 0.55 })}`,
    `<g filter="url(#${p}shadow)">
      <!-- tassels -->
      <g stroke="${PAL.leather3}" stroke-width="1.2">${[44, 156].map((x) => `<path d="M${x} 130 l-6 40 h12 z" fill="url(#${p}brassL)" stroke="${PAL.ink}"/>`).join('')}</g>
      <circle cx="100" cy="90" r="80" fill="url(#${p}leather)" ${O} stroke-width="2.4" filter="url(#${p}lg)"/>
      <circle cx="100" cy="90" r="80" fill="none" stroke="url(#${p}gold)" stroke-width="7" filter="url(#${p}bevel)"/>
      <circle cx="100" cy="90" r="72" fill="none" stroke="${PAL.leather0}" stroke-width="1.4" stroke-dasharray="4 3" opacity=".8"/>
      ${studs}
      <g filter="url(#${p}glow)">
        <circle cx="100" cy="98" r="34" fill="url(#${p}steel)" ${O} stroke-width="1.8" filter="url(#${p}bevel)"/>
        <path d="${hexagram(100, 98, 27)}" fill="url(#${p}goldR)" ${O} stroke-width="1.6" filter="url(#${p}bevel)"/>
        <circle cx="100" cy="98" r="7" fill="${PAL.red1}" ${O} stroke-width="1.2"/>
        <circle cx="98" cy="96" r="2.4" fill="#fff" opacity=".7"/>
      </g>
      ${smallStars}
    </g>`);
}

// ----- premium objects
function symHat() {
  const p = 'T';
  return svg(W, H, common(p) + `
    ${lin(p + 'leatherA', [[0, '#c98a52'], [0.5, '#93531f'], [1, '#4f2810']], 0.1, 0, 0.9, 1)}
    ${lin(p + 'brim', [[0, '#7c4520'], [1, '#3f1e0b']], 0, 0, 0, 1)}
    ${fGrain(p + 'lg', { freq: '1.1', amt: 0.18, seed: 2 })}`,
    `<g filter="url(#${p}shadow)" transform="translate(0 6)">
      <!-- back brim -->
      <path d="M14 124 C 30 100, 170 100, 186 124 C 160 146, 40 146, 14 124 Z" fill="url(#${p}brim)" ${O} stroke-width="2"/>
      <!-- crown -->
      <path d="M52 118 C 50 84, 70 58, 100 58 C 130 58, 150 84, 148 118 Z" fill="#5e3416" ${O} stroke-width="2"/>
      <!-- front half-moon -->
      <path d="M18 128 C 18 80, 56 22, 100 22 C 144 22, 182 80, 182 128 C 166 118, 140 96, 100 96 C 60 96, 34 118, 18 128 Z" fill="url(#${p}leatherA)" ${O} stroke-width="2.4" filter="url(#${p}lg)"/>
      <path d="M30 118 C 34 80, 64 34, 100 34 C 136 34, 166 80, 170 118" fill="none" stroke="#e0a76a" stroke-width="1.5" stroke-dasharray="4 3" opacity=".8"/>
      <path d="M44 74 C 60 40, 92 30, 120 34" stroke="#fff" stroke-width="5" opacity=".18" fill="none" stroke-linecap="round"/>
      ${[-0.95, -0.62, -0.31, 0.31, 0.62, 0.95].map((t) => {
        const x = 100 + Math.sin(t) * 64;
        const y = 66 + (1 - Math.cos(t)) * 52;
        return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="7.5" fill="url(#${p}steel)" ${O} stroke-width="1" filter="url(#${p}bevel)"/><polygon points="${starPts(0, 0, 5, 5, 2)}" fill="${PAL.steel3}" opacity=".6"/></g>`;
      }).join('')}
      <g transform="translate(100 62)"><circle r="20" fill="url(#${p}goldR)" ${O} stroke-width="1.8" filter="url(#${p}bevel)"/>
        <path d="${hexagram(0, 0, 15)}" fill="none" stroke="${PAL.gold4}" stroke-width="2.2"/><circle r="4.5" fill="${PAL.red1}" stroke="${PAL.gold4}"/></g>
      <!-- chin strap -->
      <path d="M22 128 C 40 160, 160 160, 178 128" fill="none" stroke="${PAL.leather3}" stroke-width="3"/>
    </g>`);
}

function symCartucheira() {
  const p = 'C';
  // a coiled cartridge belt seen at 3/4
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    pts.push([100 + Math.cos(t) * 72, 96 + Math.sin(t) * 40]);
  }
  const bullets = along(pts, 9.2, (x, y, a, i) => {
    const front = y > 96 - 6;
    return `<g transform="translate(${x.toFixed(1)} ${(y - 14).toFixed(1)})" opacity="${front ? 1 : 0.92}"><rect x="-3.6" y="-14" width="7.2" height="20" rx="2" fill="url(#${p}brass)" stroke="${PAL.brass3}" stroke-width=".8"/><path d="M-3.6 -10 h7.2" stroke="${PAL.brass3}" stroke-width=".6"/><ellipse cx="0" cy="-14" rx="3.6" ry="1.6" fill="${PAL.steel1}"/></g>`;
  });
  return svg(W, H, common(p) + `
    ${lin(p + 'belt', [[0, '#b0703a'], [0.5, '#7c4520'], [1, '#3f1e0b']], 0, 0, 0, 1)}
    ${lin(p + 'brass', [[0, PAL.brass3], [0.3, PAL.brass1], [0.5, PAL.brass0], [0.8, PAL.brass2], [1, PAL.brass3]], 0, 0, 1, 0)}`,
    `<g filter="url(#${p}shadow)">
      <ellipse cx="100" cy="96" rx="80" ry="48" fill="none" stroke="url(#${p}belt)" stroke-width="24"/>
      <ellipse cx="100" cy="96" rx="80" ry="48" fill="none" stroke="${PAL.ink}" stroke-width="1.6" opacity=".0"/>
      <ellipse cx="100" cy="96" rx="92" ry="60" fill="none" stroke="${PAL.ink}" stroke-width="1.8"/>
      <ellipse cx="100" cy="96" rx="68" ry="36" fill="none" stroke="${PAL.ink}" stroke-width="1.8"/>
      <ellipse cx="100" cy="96" rx="80" ry="48" fill="none" stroke="#e0a76a" stroke-width="1.2" stroke-dasharray="3 3" opacity=".7"/>
      <g>${bullets}</g>
      <!-- buckle -->
      <g transform="translate(100 146)"><rect x="-17" y="-13" width="34" height="26" rx="5" fill="none" stroke="url(#${p}gold)" stroke-width="6"/><rect x="-17" y="-13" width="34" height="26" rx="5" fill="none" stroke="${PAL.ink}" stroke-width="1"/><rect x="-2" y="-13" width="4" height="26" fill="url(#${p}steel)"/></g>
    </g>`);
}

function revolverArt(p) {
  return {
    defs: `${lin(p + 'metal', [[0, '#ffffff'], [0.25, '#cfd2d4'], [0.5, '#7d8286'], [0.7, '#b9bdc0'], [1, '#3a3d40']], 0, 0, 0, 1)}
    ${lin(p + 'grip', [[0, '#a8622c'], [0.5, '#6e3814'], [1, '#3a1a08']], 0, 0, 1, 1)}
    ${fGrain(p + 'wood', { freq: '0.06 0.9', oct: 3, amt: 0.3, seed: 5 })}`,
    body: `<rect x="66" y="62" width="122" height="15" rx="3" fill="url(#${p}metal)" ${O} stroke-width="2" filter="url(#${p}bevel)"/>
      <rect x="66" y="77" width="96" height="9" rx="3" fill="url(#${p}metal)" ${O} stroke-width="1.6"/>
      <rect x="180" y="56" width="5" height="7" fill="url(#${p}metal)" ${O} stroke-width="1"/>
      <path d="M46 58 L 92 58 L 96 96 L 84 104 L 60 104 L 46 90 Z" fill="url(#${p}metal)" ${O} stroke-width="2.2" filter="url(#${p}bevel)"/>
      <rect x="62" y="62" width="34" height="32" rx="7" fill="url(#${p}metal)" ${O} stroke-width="2"/>
      <path d="M68 66 v24 M76 64 v28 M84 64 v28 M92 66 v24" stroke="#3a3d40" stroke-width="1.6" opacity=".7"/>
      <path d="M44 60 L 34 46 L 42 44 L 54 58 Z" fill="url(#${p}metal)" ${O} stroke-width="1.8"/>
      <path d="M60 104 C 60 124, 86 124, 86 104" fill="none" stroke="url(#${p}metal)" stroke-width="5"/>
      <path d="M60 104 C 60 124, 86 124, 86 104" fill="none" stroke="${PAL.ink}" stroke-width="1.2"/>
      <path d="M70 102 C 72 110, 74 112, 76 114" stroke="${PAL.steel3}" stroke-width="3" stroke-linecap="round"/>
      <path d="M46 88 C 40 104, 26 132, 18 150 C 26 160, 44 160, 52 152 C 56 130, 62 112, 64 102 Z" fill="url(#${p}grip)" ${O} stroke-width="2.2" filter="url(#${p}wood)"/>
      <circle cx="44" cy="124" r="3.5" fill="url(#${p}goldR)" ${O} stroke-width=".8"/>
      <path d="M24 148 C 30 154, 42 154, 50 148" stroke="${PAL.steel1}" stroke-width="3" fill="none"/>
      <path d="M70 64 L 184 64" stroke="#fff" stroke-width="2" opacity=".75"/>`,
  };
}

function symRevolver() {
  const p = 'R';
  const r = revolverArt(p);
  return svg(W, H, common(p) + r.defs, `<g filter="url(#${p}shadow)" transform="rotate(-14 100 92)">${r.body}</g>`);
}

function symSanfona() {
  const p = 'F';
  const folds = Array.from({ length: 9 }, (_, i) => {
    const x = 70 + i * 7.5;
    return `<path d="M${x} 46 L ${x + 3.75} 42 L ${x + 7.5} 46 L ${x + 7.5} 138 L ${x + 3.75} 142 L ${x} 138 Z" fill="${i % 2 ? '#7a1010' : '#a51a14'}" stroke="${PAL.ink}" stroke-width="1"/>
      <path d="M${x + 3.75} 42 L ${x + 3.75} 142" stroke="#ff8a6a" stroke-width=".8" opacity=".6"/>`;
  }).join('');
  const keys = Array.from({ length: 8 }, (_, i) => `<rect x="34" y="${50 + i * 11}" width="22" height="8" rx="2" fill="#fff8e8" stroke="${PAL.ink}" stroke-width=".8"/>`).join('');
  const buttons = Array.from({ length: 12 }, (_, i) => `<circle cx="${152 + (i % 2) * 10}" cy="${54 + Math.floor(i / 2) * 15}" r="3.6" fill="url(#${p}goldR)" stroke="${PAL.ink}" stroke-width=".7"/>`).join('');
  return svg(W, H, common(p) + `
    ${lin(p + 'body', [[0, '#e8402a'], [0.5, '#a3160c'], [1, '#4a0805']], 0, 0, 1, 1)}
    ${lin(p + 'grille', [[0, '#3a1a0a'], [1, '#1a0904']], 0, 0, 0, 1)}`,
    `<g filter="url(#${p}shadow)">
      <!-- left body -->
      <rect x="22" y="34" width="50" height="116" rx="7" fill="url(#${p}body)" ${O} stroke-width="2.2" filter="url(#${p}bevel)"/>
      ${keys}
      <rect x="22" y="34" width="50" height="116" rx="7" fill="none" stroke="url(#${p}gold)" stroke-width="3"/>
      <!-- bellows -->
      ${folds}
      <!-- right body -->
      <rect x="138" y="34" width="44" height="116" rx="7" fill="url(#${p}body)" ${O} stroke-width="2.2" filter="url(#${p}bevel)"/>
      <rect x="138" y="34" width="44" height="116" rx="7" fill="none" stroke="url(#${p}gold)" stroke-width="3"/>
      ${buttons}
      <!-- ornament grille on left -->
      <path d="M60 52 q6 20 0 40 q-6 20 0 40" stroke="url(#${p}gold)" stroke-width="2.4" fill="none"/>
      <path d="M26 40 L 68 40" stroke="#fff" stroke-width="2" opacity=".35"/>
      <!-- strap -->
      <path d="M150 30 C 160 14, 176 16, 178 34" fill="none" stroke="${PAL.leather2}" stroke-width="5"/>
    </g>`);
}

// ----- low objects (no frame, bold silhouettes)
function symRifles() {
  const p = 'G';
  const rifle = (flip) => `<g transform="${flip ? 'translate(200 0) scale(-1 1)' : ''} rotate(34 100 92)">
      <rect x="18" y="86" width="132" height="7" rx="2" fill="url(#${p}metal)" ${O} stroke-width="1.6"/>
      <rect x="100" y="80" width="40" height="18" rx="3" fill="url(#${p}metal)" ${O} stroke-width="1.6"/>
      <path d="M136 84 L 152 84 C 170 84, 186 92, 192 104 L 186 118 C 172 110, 160 104, 140 100 Z" fill="url(#${p}stock)" ${O} stroke-width="1.8" filter="url(#${p}wood)"/>
      <path d="M60 92 L 132 92 L 132 100 L 66 100 Z" fill="url(#${p}stock)" ${O} stroke-width="1.6" filter="url(#${p}wood)"/>
      <path d="M118 98 C 118 110, 132 110, 132 98" fill="none" stroke="${PAL.steel2}" stroke-width="3"/>
      <rect x="40" y="90" width="4" height="12" fill="url(#${p}goldR)" stroke="${PAL.ink}" stroke-width=".6"/>
    </g>`;
  return svg(W, H, common(p) + `
    ${lin(p + 'metal', [[0, '#e6e8ea'], [0.5, '#6d7276'], [1, '#2e3134']], 0, 0, 0, 1)}
    ${lin(p + 'stock', [[0, '#c27a3c'], [0.5, '#8a4a1c'], [1, '#4a2108']], 0, 0, 0, 1)}
    ${fGrain(p + 'wood', { freq: '0.05 0.8', oct: 3, amt: 0.3, seed: 11 })}`,
    `<g filter="url(#${p}shadow)">${rifle(false)}${rifle(true)}
      <circle cx="100" cy="92" r="7" fill="url(#${p}goldR)" ${O} stroke-width="1.2"/></g>`);
}

function symFacao() {
  const p = 'K';
  return svg(W, H, common(p) + `
    ${lin(p + 'blade', [[0, '#ffffff'], [0.35, '#d7dadc'], [0.5, '#9aa0a4'], [0.65, '#d7dadc'], [1, '#6a7074']], 0, 0, 0, 1)}
    ${lin(p + 'handle', [[0, '#8a4a1c'], [0.5, '#5a2a0c'], [1, '#2e1404']], 0, 0, 1, 0)}
    ${fGrain(p + 'wood', { freq: '0.9 0.06', oct: 3, amt: 0.32, seed: 13 })}`,
    `<g filter="url(#${p}shadow)" transform="rotate(-38 100 92)">
      <path d="M70 80 L 168 70 C 186 70, 194 80, 192 92 L 186 100 C 150 100, 110 102, 70 104 Z" fill="url(#${p}blade)" ${O} stroke-width="2.2" filter="url(#${p}bevel)"/>
      <path d="M72 84 L 170 76" stroke="#ffffff" stroke-width="1.6" opacity=".8"/>
      <path d="M74 98 L 182 96" stroke="#5a6064" stroke-width="1.2" opacity=".6"/>
      <rect x="58" y="76" width="14" height="32" rx="3" fill="url(#${p}gold)" ${O} stroke-width="1.8" filter="url(#${p}bevel)"/>
      <path d="M8 84 C 10 80, 56 80, 58 82 L 58 102 C 56 104, 10 104, 8 100 C 4 96, 4 88, 8 84 Z" fill="url(#${p}handle)" ${O} stroke-width="2" filter="url(#${p}wood)"/>
      ${[20, 36, 50].map((x) => `<circle cx="${x}" cy="92" r="3" fill="url(#${p}goldR)" stroke="${PAL.ink}" stroke-width=".7"/>`).join('')}
    </g>`);
}

function symCactus() {
  const p = 'Q';
  const arm = (d) => `<path d="${d}" fill="url(#${p}cact)" ${O} stroke-width="2.2"/>`;
  const ribs = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L ${x2} ${y2}" stroke="${PAL.green3}" stroke-width="1.4" opacity=".55"/>`;
  const spines = Array.from({ length: 34 }, (_, i) => {
    const x = 84 + (i % 4) * 10 + (Math.floor(i / 4) % 2) * 5;
    const y = 30 + Math.floor(i / 4) * 15;
    return `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff6d8" opacity=".75"/><path d="M${x} ${y} l-2.4 -2 M${x} ${y} l2.4 -2" stroke="#fff6d8" stroke-width=".6" opacity=".55"/>`;
  }).join('');
  return svg(W, H, common(p) + `
    ${lin(p + 'cact', [[0, '#b6e07c'], [0.35, PAL.green1], [0.75, PAL.green2], [1, PAL.green3]], 0, 0, 1, 0)}
    ${lin(p + 'pot', [[0, '#c46a3a'], [1, '#6a2a10']], 0, 0, 0, 1)}`,
    `<g filter="url(#${p}shadow)">
      <ellipse cx="100" cy="166" rx="60" ry="8" fill="#8a5a2a" opacity=".55"/>
      ${arm('M50 120 C 44 120, 40 114, 40 106 L 40 66 C 40 56, 56 56, 56 66 L 56 100 L 82 100 L 82 118 Z')}
      ${arm('M150 104 C 156 104, 160 98, 160 90 L 160 46 C 160 36, 144 36, 144 46 L 144 84 L 118 84 L 118 102 Z')}
      ${arm('M82 168 L 82 30 C 82 12, 118 12, 118 30 L 118 168 Z')}
      ${ribs(92, 24, 92, 166)}${ribs(108, 24, 108, 166)}${ribs(48, 62, 48, 108)}${ribs(152, 42, 152, 92)}
      <path d="M88 30 C 88 20, 98 16, 104 18" stroke="#efffd0" stroke-width="4" stroke-linecap="round" opacity=".55" fill="none"/>
      ${spines}
      <g>${[[100, 14], [48, 56], [152, 36]].map(([x, y]) => `<circle cx="${x - 5}" cy="${y}" r="5" fill="#e83a6a" ${O} stroke-width="1"/><circle cx="${x + 5}" cy="${y + 1}" r="5" fill="#ff5a8a" ${O} stroke-width="1"/><circle cx="${x}" cy="${y - 4}" r="5" fill="#ff7aa0" ${O} stroke-width="1"/>`).join('')}</g>
    </g>`);
}

function symCantil() {
  const p = 'N';
  return svg(W, H, common(p) + `
    ${rad(p + 'body', [[0, '#d9a066'], [0.5, '#a0602c'], [1, '#4f2810']], 0.38, 0.35, 0.7)}
    ${fGrain(p + 'lg', { freq: '1.3', amt: 0.18, seed: 21 })}`,
    `<g filter="url(#${p}shadow)">
      <!-- strap -->
      <path d="M44 74 C 30 30, 70 6, 100 6 C 130 6, 170 30, 156 74" fill="none" stroke="${PAL.leather3}" stroke-width="9"/>
      <path d="M44 74 C 30 30, 70 6, 100 6 C 130 6, 170 30, 156 74" fill="none" stroke="${PAL.leather1}" stroke-width="5"/>
      <!-- body -->
      <path d="M100 38 C 150 38, 170 74, 166 112 C 162 148, 132 170, 100 170 C 68 170, 38 148, 34 112 C 30 74, 50 38, 100 38 Z" fill="url(#${p}body)" ${O} stroke-width="2.4" filter="url(#${p}lg)"/>
      <path d="M100 48 C 144 48, 158 80, 156 112 C 152 142, 128 160, 100 160 C 72 160, 48 142, 44 112 C 42 80, 56 48, 100 48 Z" fill="none" stroke="#f0c088" stroke-width="1.4" stroke-dasharray="4 3" opacity=".8"/>
      <!-- tooled flower -->
      <g transform="translate(100 108)" stroke="#5a2e10" stroke-width="1.8" fill="none" opacity=".8">
        ${Array.from({ length: 8 }, (_, i) => `<path d="M0 0 C 6 -10, 6 -22, 0 -28 C -6 -22, -6 -10, 0 0" transform="rotate(${i * 45})"/>`).join('')}
        <circle r="5" fill="#5a2e10"/></g>
      <path d="M58 70 C 72 54, 92 50, 108 52" stroke="#fff" stroke-width="5" opacity=".2" fill="none" stroke-linecap="round"/>
      <!-- neck + cap -->
      <rect x="88" y="22" width="24" height="20" rx="3" fill="url(#${p}brassL)" ${O} stroke-width="1.8" filter="url(#${p}bevel)"/>
      <rect x="84" y="14" width="32" height="10" rx="3" fill="url(#${p}gold)" ${O} stroke-width="1.6"/>
    </g>`);
}

export default function () {
  const list = [
    ['sym_lampiao', symLampiao], ['sym_maria', symMaria], ['sym_wild', symWild], ['sym_wanted', symWanted], ['sym_map', symMap],
    ['sym_emblem', symEmblem], ['sym_hat', symHat], ['sym_cartucheira', symCartucheira], ['sym_revolver', symRevolver], ['sym_sanfona', symSanfona],
    ['sym_rifles', symRifles], ['sym_facao', symFacao], ['sym_cactus', symCactus], ['sym_cantil', symCantil],
  ];
  return list.map(([name, fn]) => ({ name, w: W, h: H, scale: S, svg: fn(), group: 'symbols' }));
}

export { lampiao, maria };
