/**
 * Environments (3 parallax layers per scene, 1920×1080) and reel frames.
 *   bg_<scene>_back  (jpg)  sky + far landscape
 *   bg_<scene>_mid   (png)  mid-ground set dressing
 *   bg_<scene>_front (png)  foreground silhouettes framing the screen edges
 */
import { PAL, lin, rad, fBevel, fGrain, fShadow, svg, starPts, hexagram, GOLD_STOPS } from './lib.mjs';

const W = 1920;
const H = 1080;

// deterministic noise
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Ridge line path from x0..x1 at base y with amplitude, closed to bottom. */
function ridge(seed, y, amp, { x0 = -20, x1 = W + 20, step = 16, rough = 0.5, bottom = H + 20, mesa = false } = {}) {
  const r = mulberry(seed);
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
  const pts = [];
  for (let x = x0; x <= x1; x += step) {
    let v = Math.sin(x * 0.0021 + ph[0]) * 0.55 + Math.sin(x * 0.0057 + ph[1]) * 0.3 + Math.sin(x * 0.013 + ph[2]) * 0.15 * rough + (r() - 0.5) * 0.12 * rough;
    if (mesa) v = Math.max(-0.2, Math.min(0.55, v * 1.6)); // flat tops (chapadas)
    pts.push(`${x.toFixed(0)},${(y - v * amp).toFixed(1)}`);
  }
  return `M${x0},${bottom} L${pts.join(' L')} L${x1},${bottom} Z`;
}

const O = (w = 2) => `stroke="${PAL.ink}" stroke-width="${w}" stroke-linejoin="round"`;

function mandacaru(x, y, h, color, rim = null, flip = false) {
  const w = h * 0.15;
  const s = flip ? -1 : 1;
  const aw = w * 0.78;
  const arm = (dir, attachY, topY, off) => {
    const ax = dir * off;
    return `<rect x="${Math.min(0, ax)}" y="${attachY - aw / 2}" width="${Math.abs(ax)}" height="${aw}" rx="${aw / 2}"/>
      <rect x="${ax - aw / 2}" y="${topY}" width="${aw}" height="${attachY - topY + aw / 2}" rx="${aw / 2}"/>
      ${rim ? `<rect x="${ax - aw / 2 + aw * 0.12}" y="${topY + aw * 0.4}" width="${aw * 0.2}" height="${attachY - topY - aw * 0.4}" rx="${aw * 0.1}" fill="${rim}" opacity=".5"/>` : ''}`;
  };
  return `<g fill="${color}" transform="translate(${x} ${y}) scale(${s} 1)">
    <rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="${w / 2}"/>
    ${arm(1, -h * 0.42, -h * 0.78, w * 1.35)}${arm(-1, -h * 0.3, -h * 0.6, w * 1.2)}${arm(1, -h * 0.7, -h * 0.9, w * 0.95)}
    ${rim ? `<rect x="${w * 0.1}" y="${-h + w * 0.5}" width="${w * 0.22}" height="${h - w}" rx="${w * 0.1}" fill="${rim}" opacity=".5"/>` : ''}
  </g>`;
}

function shrub(x, y, s, color) {
  const r = mulberry(Math.round(x * 13 + y));
  const b = Array.from({ length: 9 }, () => {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    const l = s * (0.5 + r() * 0.6);
    return `M${x} ${y} Q ${x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 10} ${y + Math.sin(a) * l * 0.5} ${x + Math.cos(a) * l} ${y + Math.sin(a) * l}`;
  }).join(' ');
  return `<path d="${b}" stroke="${color}" stroke-width="${Math.max(2, s / 18)}" fill="none" stroke-linecap="round"/>`;
}

function deadTree(x, y, s, color) {
  return `<g stroke="${color}" fill="none" stroke-linecap="round" transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C 2 -40, -4 -70, 6 -110" stroke-width="9"/><path d="M2 -60 C 20 -70, 30 -90, 44 -96" stroke-width="5"/>
    <path d="M4 -86 C -14 -96, -24 -110, -36 -124" stroke-width="4"/><path d="M6 -110 C 12 -124, 8 -136, 16 -150" stroke-width="3"/>
    <path d="M30 -88 l12 -18 M-22 -112 l-4 -16" stroke-width="2.5"/></g>`;
}

// =================================================================== BASE
function baseBack() {
  const clouds = [[300, 210, 520], [1240, 160, 640], [900, 300, 420], [1600, 260, 380], [120, 360, 300]].map(([x, y, w], i) =>
    `<path d="M${x} ${y} q${w * 0.2} -26 ${w * 0.45} -10 q${w * 0.25} -22 ${w * 0.55} 6 q-${w * 0.3} 20 -${w} 4 z" fill="url(#cloud)" opacity="${0.75 - i * 0.08}"/>`).join('');
  return svg(W, H, `
    ${lin('sky', [[0, '#2a1438'], [0.3, '#7a2c52'], [0.52, '#d6563c'], [0.66, '#ff9a42'], [0.74, '#ffd27a']], 0, 0, 0, 1)}
    ${rad('sun', [[0, '#fffbe0'], [0.12, '#fff1b0'], [0.3, '#ffcf6a', 0.75], [1, '#ff8a3a', 0]], 0.5, 0.5, 0.5)}
    ${lin('cloud', [[0, '#ffcf8a'], [1, '#a8405a']], 0, 0, 0, 1)}
    ${lin('m1', [[0, '#b8506a'], [1, '#d77a5a']], 0, 0, 0, 1)}
    ${lin('m2', [[0, '#7a2c48'], [1, '#a8483a']], 0, 0, 0, 1)}
    ${lin('m3', [[0, '#4a1a30'], [1, '#6a2a24']], 0, 0, 0, 1)}
    ${lin('ground', [[0, '#8a3e22'], [0.4, '#5a2414'], [1, '#2a0e06']], 0, 0, 0, 1)}
    ${fGrain('gr', { freq: '0.004 0.04', oct: 3, amt: 0.18, seed: 5 })}`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <circle cx="820" cy="640" r="420" fill="url(#sun)"/>
     <circle cx="820" cy="640" r="92" fill="#fff4c8"/>
     ${clouds}
     <path d="${ridge(11, 640, 120, { rough: 0.6, mesa: true })}" fill="url(#m1)"/>
     <path d="${ridge(22, 690, 90, { rough: 0.8 })}" fill="url(#m2)"/>
     <path d="${ridge(33, 740, 60, { rough: 1 })}" fill="url(#m3)"/>
     <rect x="0" y="760" width="${W}" height="${H - 760}" fill="url(#ground)" filter="url(#gr)"/>
     <path d="M0 760 L ${W} 760" stroke="#ffb060" stroke-width="2" opacity=".35"/>`);
}

function house(x, y, w, h, wall, roof, lit = true) {
  const win = (wx, wy) => `<rect x="${wx}" y="${wy}" width="${w * 0.16}" height="${h * 0.26}" fill="${lit ? '#ffcf6a' : '#2a1206'}" stroke="#3a1a0a" stroke-width="2"/>`;
  return `<g>
    <rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${wall}" ${O(2.5)}/>
    <rect x="${x}" y="${y - h}" width="${w * 0.35}" height="${h}" fill="#000" opacity=".18"/>
    <path d="M${x - 8} ${y - h} L ${x + w / 2} ${y - h - h * 0.38} L ${x + w + 8} ${y - h} Z" fill="${roof}" ${O(2.5)}/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${x - 8 + (i * (w + 16)) / 6} ${y - h} l ${w / 12} ${-h * 0.06}" stroke="#5a1a08" stroke-width="2" opacity=".5"/>`).join('')}
    <rect x="${x + w * 0.42}" y="${y - h * 0.55}" width="${w * 0.18}" height="${h * 0.55}" fill="#4a2410" ${O(2)}/>
    ${win(x + w * 0.12, y - h * 0.7)}${win(x + w * 0.72, y - h * 0.7)}
  </g>`;
}

function church(x, y) {
  return `<g>
    <rect x="${x}" y="${y - 260}" width="320" height="260" fill="url(#wall)" ${O(3)}/>
    <path d="M${x - 14} ${y - 260} L ${x + 160} ${y - 360} L ${x + 334} ${y - 260} Z" fill="url(#wall)" ${O(3)}/>
    <path d="M${x + 6} ${y - 266} L ${x + 160} ${y - 352} L ${x + 314} ${y - 266}" fill="none" stroke="#fff3d8" stroke-width="3" opacity=".7"/>
    <!-- bell tower -->
    <rect x="${x + 230}" y="${y - 470}" width="110" height="470" fill="url(#wall)" ${O(3)}/>
    <path d="M${x + 222} ${y - 470} L ${x + 285} ${y - 540} L ${x + 348} ${y - 470} Z" fill="#c45a2a" ${O(3)}/>
    <path d="M${x + 285} ${y - 540} v-50 M${x + 268} ${y - 572} h34" stroke="${PAL.ink}" stroke-width="7"/>
    <path d="M${x + 260} ${y - 440} h50 v60 h-50 z" fill="#2a1206"/><path d="M${x + 260} ${y - 440} q25 -30 50 0" fill="#2a1206"/>
    <circle cx="${x + 285}" cy="${y - 404}" r="14" fill="url(#bell)"/>
    <!-- door + windows -->
    <path d="M${x + 120} ${y} v-110 q40 -46 80 0 v110 z" fill="#5a2a10" ${O(3)}/>
    <path d="M${x + 160} ${y} v-140" stroke="${PAL.ink}" stroke-width="2"/>
    <circle cx="${x + 160}" cy="${y - 200}" r="22" fill="#ffcf6a" ${O(3)}/>
    <rect x="${x + 40}" y="${y - 170}" width="36" height="56" rx="18" fill="#ffcf6a" ${O(2.5)}/>
    <rect x="${x + 250}" y="${y - 170}" width="36" height="56" rx="18" fill="#ffcf6a" ${O(2.5)}/>
    <rect x="${x}" y="${y - 260}" width="90" height="260" fill="#3a0a20" opacity=".22"/>
  </g>`;
}

function baseMid() {
  return svg(W, H, `
    ${lin('wall', [[0, '#ffe2bc'], [0.5, '#f0b98a'], [1, '#c9845a']], 0, 0, 1, 1)}
    ${rad('bell', [[0, '#ffe9a8'], [1, '#a8741f']])}
    ${lin('road', [[0, '#b0623a'], [1, '#5a2614']], 0, 0, 0, 1)}`,
    `<path d="M860 1080 C 900 900, 940 820, 960 772 L 990 772 C 1010 820, 1080 900, 1160 1080 Z" fill="url(#road)" opacity=".8"/>
     ${house(80, 820, 170, 120, '#e8a87a', '#b4471f')}${house(270, 812, 140, 100, '#f2c38e', '#a83c1a')}${house(1260, 812, 150, 104, '#e9b383', '#b0451d')}
     ${church(1430, 840)}
     ${mandacaru(560, 800, 150, '#3a5a24', '#7aa83a')}${mandacaru(1210, 790, 120, '#365220', '#78a03a', true)}${mandacaru(700, 780, 80, '#4a3a24')}
     ${shrub(470, 822, 40, '#3a2410')}${shrub(1350, 830, 36, '#3a2410')}${shrub(1880, 840, 50, '#3a2410')}
     <g stroke="#3a1a0a" stroke-width="5">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${620 + i * 46} 840 v-46"/>`).join('')}<path d="M610 810 h240 M610 826 h240" stroke-width="3"/></g>`);
}

function baseFront() {
  return svg(W, H, `${lin('rock', [[0, '#6a2a14'], [1, '#1a0804']], 0, 0, 0, 1)}`,
    `${mandacaru(110, 1110, 560, '#1c2a12', '#ff9a42')}
     ${mandacaru(1820, 1110, 470, '#1c2a12', '#ff9a42', true)}
     <path d="M-20 1090 C 60 990, 200 960, 320 1000 C 400 1030, 420 1080, 430 1100 Z" fill="url(#rock)"/>
     <path d="M1940 1090 C 1880 990, 1740 970, 1640 1010 C 1580 1040, 1560 1080, 1550 1100 Z" fill="url(#rock)"/>
     ${shrub(330, 1020, 90, '#1a0a04')}${shrub(1600, 1030, 100, '#1a0a04')}
     <path d="M-20 1000 C 60 990, 200 960, 320 1000" stroke="#ff9a42" stroke-width="4" fill="none" opacity=".5"/>`);
}

// =================================================================== ESCAPE (sunset chase)
function escapeBack() {
  return svg(W, H, `
    ${lin('sky', [[0, '#3a0a1a'], [0.35, '#9a1e1e'], [0.6, '#f0601e'], [0.75, '#ffb040'], [0.82, '#ffe08a']], 0, 0, 0, 1)}
    ${rad('sun', [[0, '#fffbe0'], [0.15, '#ffe9a0'], [0.4, '#ffb040', 0.6], [1, '#ff6a1e', 0]], 0.5, 0.5, 0.5)}
    ${lin('mesa1', [[0, '#9a3a2a'], [1, '#c8603a']], 0, 0, 0, 1)}
    ${lin('mesa2', [[0, '#5a1a18'], [1, '#7a2a1a']], 0, 0, 0, 1)}
    ${lin('plain', [[0, '#c0602a'], [0.3, '#7a2e14'], [1, '#2a0c04']], 0, 0, 0, 1)}`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <circle cx="960" cy="760" r="560" fill="url(#sun)"/><circle cx="960" cy="760" r="170" fill="#fff0b8" opacity=".95"/>
     ${[160, 230, 300, 360].map((y, i) => `<path d="M${-100 + i * 120} ${y} C ${400} ${y - 30}, ${1300} ${y + 30}, ${2100} ${y - 10}" stroke="#ffb070" stroke-width="${18 - i * 3}" opacity="${0.18 + i * 0.05}" fill="none" stroke-linecap="round"/>`).join('')}
     <path d="${ridge(7, 760, 160, { rough: 0.3, mesa: true, step: 24 })}" fill="url(#mesa1)" opacity=".9"/>
     <path d="${ridge(17, 800, 110, { rough: 0.5, mesa: true, step: 20 })}" fill="url(#mesa2)"/>
     <rect y="820" width="${W}" height="${H - 820}" fill="url(#plain)"/>
     <path d="M0 822 H${W}" stroke="#ffd08a" stroke-width="3" opacity=".4"/>`);
}
function escapeMid() {
  return svg(W, H, '', `<g fill="#2a0c06">${deadTree(260, 850, 1.3, '#2a0c06')}${deadTree(1620, 840, 1.1, '#2a0c06')}${deadTree(1420, 830, 0.7, '#3a1408')}</g>
     ${mandacaru(420, 850, 140, '#2a0c06')}${mandacaru(1500, 840, 110, '#2a0c06', null, true)}${mandacaru(1760, 860, 170, '#220a04')}
     ${shrub(600, 860, 50, '#2a0c06')}${shrub(1300, 856, 44, '#2a0c06')}`);
}
function escapeFront() {
  return svg(W, H, '', `<path d="M-20 1100 L -20 960 C 120 920, 260 950, 380 1010 C 440 1040, 470 1080, 480 1100 Z" fill="#160604"/>
    <path d="M1940 1100 L 1940 950 C 1800 920, 1660 950, 1560 1010 C 1500 1040, 1480 1080, 1470 1100 Z" fill="#160604"/>
    ${shrub(140, 960, 120, '#160604')}${shrub(1780, 955, 130, '#160604')}${shrub(380, 1010, 70, '#160604')}
    ${mandacaru(60, 1110, 420, '#120402', '#ff7a2a')}`);
}

// =================================================================== HIDEOUT (interior)
function hideoutBack() {
  const planks = Array.from({ length: 24 }, (_, i) => {
    const x = i * 82;
    const shade = ['#4a2812', '#40220f', '#52301a', '#3a1e0c'][i % 4];
    return `<rect x="${x}" y="0" width="82" height="${H}" fill="${shade}"/><path d="M${x} 0 V${H}" stroke="#1a0a04" stroke-width="5"/>
      ${[200, 560, 900].map((y) => `<circle cx="${x + 16}" cy="${y + (i % 3) * 20}" r="4" fill="#1a0a04"/><circle cx="${x + 66}" cy="${y + (i % 3) * 20}" r="4" fill="#1a0a04"/>`).join('')}`;
  }).join('');
  return svg(W, H, `
    ${fGrain('wg', { freq: '0.003 0.08', oct: 4, amt: 0.4, seed: 21 })}
    ${rad('pool', [[0, '#ffb24a', 0.55], [0.5, '#ff8a2a', 0.18], [1, '#ff6a00', 0]], 0.5, 0.5, 0.5)}
    ${rad('dark', [[0, '#000', 0], [0.6, '#000', 0.25], [1, '#000', 0.8]], 0.5, 0.45, 0.75)}
    ${lin('floor', [[0, '#3a1e0c'], [1, '#120602']], 0, 0, 0, 1)}`,
    `<g filter="url(#wg)">${planks}</g>
     <rect y="840" width="${W}" height="${H - 840}" fill="url(#floor)"/>
     <path d="M0 840 H${W}" stroke="#1a0a04" stroke-width="10"/>
     <!-- window with moonlight -->
     <g transform="translate(1540 150)"><rect width="230" height="200" fill="#1a2a4a" stroke="#1a0a04" stroke-width="14"/><path d="M115 0 V200 M0 100 H230" stroke="#1a0a04" stroke-width="10"/><circle cx="160" cy="60" r="26" fill="#e8f0ff" opacity=".85"/><path d="M0 200 L -120 760 L 330 760 L 230 200 Z" fill="#9ab8ff" opacity=".06"/></g>
     <ellipse cx="200" cy="420" rx="420" ry="380" fill="url(#pool)"/>
     <ellipse cx="1720" cy="560" rx="420" ry="360" fill="url(#pool)"/>
     <ellipse cx="960" cy="560" rx="700" ry="420" fill="url(#pool)" opacity=".6"/>
     <rect width="${W}" height="${H}" fill="url(#dark)"/>`);
}
function hideoutMid() {
  const shelf = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="18" fill="#5a3418" ${O(3)}/><path d="M${x + 20} ${y + 18} l20 40 M${x + w - 20} ${y + 18} l-20 40" stroke="#3a1e0c" stroke-width="10"/>`;
  const jug = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 0 C -34 -20, -30 -54, -10 -60 L -10 -76 L 10 -76 L 10 -60 C 30 -54, 34 -20, 20 0 Z" fill="${c}" ${O(3)}/><path d="M-12 -50 C -18 -40, -18 -26, -14 -16" stroke="#fff" stroke-width="4" opacity=".25" fill="none"/></g>`;
  return svg(W, H, `${lin('beam', [[0, '#6a3c1c'], [1, '#2a1406']], 0, 0, 0, 1)}`,
    `<rect x="0" y="0" width="${W}" height="70" fill="url(#beam)" ${O(4)}/>
     <rect x="0" y="0" width="70" height="${H}" fill="url(#beam)" ${O(4)}/><rect x="${W - 70}" y="0" width="70" height="${H}" fill="url(#beam)" ${O(4)}/>
     <path d="M70 70 L 300 300 M${W - 70} 70 L ${W - 300} 300" stroke="#3a1e0c" stroke-width="40"/>
     ${shelf(110, 360, 300)}${jug(170, 360, 0.9, '#a8502a')}${jug(250, 360, 1.1, '#7a3a1a')}${jug(340, 360, 0.8, '#b8683a')}
     ${shelf(1500, 470, 320)}${jug(1560, 470, 1, '#8a4a22')}${jug(1660, 470, 0.85, '#b0602e')}
     <!-- hanging hat -->
     <g transform="translate(1660 380)"><path d="M-70 40 C -70 0, -30 -36, 0 -36 C 30 -36, 70 0, 70 40 C 50 26, 30 18, 0 18 C -30 18, -50 26, -70 40 Z" fill="#7c4520" ${O(3)}/><path d="${hexagram(0, -6, 12)}" fill="none" stroke="#e0b154" stroke-width="3"/></g>
     <!-- rifles on wall -->
     <g transform="translate(220 600) rotate(-12)"><rect x="0" y="0" width="300" height="10" fill="#4a4844" ${O(2)}/><path d="M220 0 h90 q30 0 40 20 l-10 18 q-40 -18 -120 -18 z" fill="#7a3a14" ${O(2)}/></g>
     <g transform="translate(240 650) rotate(-8)"><rect x="0" y="0" width="280" height="10" fill="#4a4844" ${O(2)}/><path d="M200 0 h90 q30 0 40 20 l-10 18 q-40 -18 -120 -18 z" fill="#6a3010" ${O(2)}/></g>
     <!-- wanted poster on wall -->
     <g transform="translate(1530 640) rotate(4)"><rect width="150" height="190" fill="#e0c088" ${O(3)}/><text x="75" y="42" text-anchor="middle" font-family="Rye" font-size="28" fill="#4a1a08">WANTED</text><rect x="35" y="56" width="80" height="80" fill="#b89058"/><text x="75" y="168" text-anchor="middle" font-family="Rye" font-size="15" fill="#4a1a08">REWARD</text></g>`);
}
function hideoutFront() {
  const barrel = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-90 0 C -104 -80, -104 -180, -90 -260 L 90 -260 C 104 -180, 104 -80, 90 0 Z" fill="#4a2410" ${O(5)}/>${[-220, -130, -40].map((yy) => `<path d="M-98 ${yy} C -30 ${yy + 10}, 30 ${yy + 10}, 98 ${yy}" stroke="#2a2826" stroke-width="16" fill="none"/>`).join('')}<path d="M-50 -250 C -60 -170, -60 -90, -50 -10" stroke="#ffb24a" stroke-width="6" opacity=".35" fill="none"/></g>`;
  const crate = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="-200" width="240" height="200" fill="#5a3418" ${O(5)}/><path d="M0 -200 L 240 0 M0 0 L 240 -200" stroke="#3a1e0c" stroke-width="18"/><rect x="0" y="-200" width="240" height="200" fill="none" stroke="#3a1e0c" stroke-width="22"/></g>`;
  return svg(W, H, '', `${barrel(90, 1120, 1.4)}${crate(1640, 1110, 1.3)}${barrel(1840, 1110, 1.1)}
    <path d="M300 1080 C 320 1040, 380 1030, 420 1060 C 440 1076, 430 1090, 420 1100 Z" fill="#2a1406"/>`);
}

// =================================================================== LAST STAND (canyon)
function lastBack() {
  return svg(W, H, `
    ${lin('sky', [[0, '#0a0614'], [0.4, '#2a0e2a'], [0.7, '#7a1e1e'], [0.85, '#c8401e']], 0, 0, 0, 1)}
    ${rad('moon', [[0, '#fff4d8'], [0.2, '#ffd8a0', 0.6], [1, '#ff8a3a', 0]], 0.5, 0.5, 0.5)}
    ${lin('rockL', [[0, '#a8402a'], [0.5, '#6a1e14'], [1, '#2a0806']], 0, 0, 1, 0)}
    ${lin('rockR', [[0, '#2a0806'], [0.5, '#6a1e14'], [1, '#a8402a']], 0, 0, 1, 0)}
    ${lin('far', [[0, '#4a1420'], [1, '#7a2a1e']], 0, 0, 0, 1)}
    ${lin('floor', [[0, '#5a1a10'], [1, '#140402']], 0, 0, 0, 1)}
    <filter id="strata" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.002 0.05" numOctaves="4" seed="41"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0" intercept=".35"/></feComponentTransfer><feComposite in2="SourceAlpha" operator="in"/><feBlend in2="SourceGraphic" mode="multiply"/></filter>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     ${Array.from({ length: 70 }, (_, i) => { const r = mulberry(i + 5); return `<circle cx="${r() * W}" cy="${r() * 420}" r="${r() * 1.8 + 0.4}" fill="#fff" opacity="${0.3 + r() * 0.6}"/>`; }).join('')}
     <circle cx="1240" cy="260" r="240" fill="url(#moon)"/><circle cx="1240" cy="260" r="64" fill="#ffe8c8"/>
     ${[[300, 190, 700], [1100, 120, 900], [1500, 330, 600]].map(([x, y, w]) => `<path d="M${x} ${y} q${w * 0.3} -50 ${w * 0.6} -10 q${w * 0.3} -30 ${w * 0.4} 20 q-${w * 0.5} 30 -${w} -10 z" fill="#1a0814" opacity=".75"/>`).join('')}
     <path d="${ridge(51, 720, 140, { rough: 0.5, mesa: true })}" fill="url(#far)"/>
     <path d="M-20 1100 L -20 120 C 120 140, 260 220, 330 360 C 380 460, 400 600, 470 760 C 520 860, 560 960, 600 1100 Z" fill="url(#rockL)" filter="url(#strata)"/>
     <path d="M1940 1100 L 1940 80 C 1800 120, 1660 220, 1600 360 C 1550 470, 1520 620, 1450 760 C 1400 860, 1370 960, 1330 1100 Z" fill="url(#rockR)" filter="url(#strata)"/>
     <path d="M330 360 C 380 460, 400 600, 470 760" stroke="#ff8a4a" stroke-width="4" opacity=".4" fill="none"/>
     <path d="M1600 360 C 1550 470, 1520 620, 1450 760" stroke="#ff8a4a" stroke-width="4" opacity=".25" fill="none"/>
     <path d="M0 860 C 600 820, 1300 830, 1920 870 L1920 1080 L0 1080 Z" fill="url(#floor)"/>`);
}
function lastMid() {
  return svg(W, H, '', `<g fill="#1e0604">
      <path d="M520 880 L 560 640 L 590 600 L 620 650 L 650 880 Z"/><path d="M1300 890 L 1330 700 L 1360 660 L 1380 720 L 1420 890 Z"/>
      ${deadTree(700, 880, 0.9, '#1e0604')}${deadTree(1240, 870, 0.8, '#1e0604')}</g>
      ${mandacaru(800, 880, 120, '#1e0604')}${mandacaru(1150, 880, 100, '#1e0604', null, true)}`);
}
function lastFront() {
  return svg(W, H, '', `<path d="M-20 1100 L -20 900 C 80 860, 220 880, 300 960 C 340 1000, 360 1060, 370 1100 Z" fill="#0e0302"/>
    <path d="M1940 1100 L 1940 880 C 1820 850, 1700 880, 1620 950 C 1580 990, 1560 1060, 1550 1100 Z" fill="#0e0302"/>
    ${mandacaru(140, 1120, 380, '#0a0201', '#ff5a2a')}${mandacaru(1800, 1120, 330, '#0a0201', '#ff5a2a', true)}
    <path d="M-20 900 C 80 860, 220 880, 300 960" stroke="#ff5a2a" stroke-width="3" opacity=".5" fill="none"/>`);
}

// =================================================================== FRAMES
/**
 * Reel frame: window 1000×540 at (60,110). Canvas 1120×710.
 * theme: base (wood + leather + gold), hideout (dark wood + iron), last (iron + red leather)
 */
function frame(theme) {
  const FW = 1120, FH = 710, wx = 60, wy = 110, ww = 1000, wh = 540;
  const T = {
    base: { body: [['0', '#8a5228'], ['.5', '#5a3014'], ['1', '#3a1c08']], band: [['0', '#a5652f'], ['1', '#5a2e12']], trim: GOLD_STOPS, win: ['#2a1508', '#3d2010'] },
    hideout: { body: [['0', '#5a3418'], ['.5', '#3a1e0c'], ['1', '#1e0e04']], band: [['0', '#4a4844'], ['1', '#1e1c1a']], trim: [[0, '#d8d4cc'], [0.5, '#7a766e'], [1, '#2e2c28']], win: ['#1a0c04', '#2a1608'] },
    last: { body: [['0', '#5a5450'], ['.5', '#2e2a28'], ['1', '#141210']], band: [['0', '#a3160c'], ['1', '#4a0604']], trim: GOLD_STOPS, win: ['#140806', '#24100a'] },
  }[theme];
  const studs = [];
  for (let i = 0; i <= 12; i++) {
    const x = 34 + (i * (FW - 68)) / 12;
    studs.push([x, 82], [x, FH - 22]);
  }
  for (let i = 1; i < 6; i++) {
    const y = 82 + (i * (FH - 104)) / 6;
    studs.push([34, y], [FW - 34, y]);
  }
  const corner = (x, y) => `<g transform="translate(${x} ${y})"><circle r="30" fill="url(#trim)" ${O(2.5)} filter="url(#bev)"/><circle r="22" fill="url(#band)" ${O(1.5)}/><path d="${hexagram(0, 0, 15)}" fill="url(#trim)" ${O(1.2)}/></g>`;
  const crest = `<g transform="translate(${FW / 2} 62)">
      <path d="M-210 30 C -170 -10, -110 -30, -60 -20 L -40 40 Z M210 30 C 170 -10, 110 -30, 60 -20 L 40 40 Z" fill="url(#trim)" ${O(2.5)} filter="url(#bev)"/>
      <path d="M-200 26 C -160 0, -110 -14, -66 -8 M200 26 C 160 0, 110 -14, 66 -8" stroke="${PAL.gold4}" stroke-width="2" fill="none"/>
      <path d="M-92 -10 C -92 -52, -50 -62, 0 -62 C 50 -62, 92 -52, 92 -10 L 70 52 L 0 70 L -70 52 Z" fill="url(#band)" ${O(3)} filter="url(#bev)"/>
      <path d="M-92 -10 C -92 -52, -50 -62, 0 -62 C 50 -62, 92 -52, 92 -10 L 70 52 L 0 70 L -70 52 Z" fill="none" stroke="url(#trim)" stroke-width="6"/>
      <circle cx="0" cy="2" r="34" fill="url(#trim)" ${O(2)} filter="url(#bev)"/>
      <path d="${hexagram(0, 2, 26)}" fill="url(#band)" ${O(1.6)}/>
      <circle cx="0" cy="2" r="7" fill="${PAL.red1}" ${O(1.2)}/>
      ${[-1, 1].map((s) => `<polygon points="${starPts(s * 56, -16, 5, 10, 4)}" fill="url(#trim)" ${O(1.2)}/>`).join('')}
    </g>`;
  return svg(FW, FH, `
    ${lin('body', T.body.map(([o, c]) => [o, c]), 0, 0, 0.2, 1)}
    ${lin('band', T.band, 0, 0, 0, 1)}
    ${lin('trim', T.trim, 0, 0, 0.15, 1)}
    ${lin('win', [[0, T.win[0], 0.94], [0.5, T.win[1], 0.9], [1, T.win[0], 0.95]], 0, 0, 0, 1)}
    ${rad('stud', [[0, '#ffffff'], [0.4, '#d8d0c4'], [1, '#5a5048']], 0.35, 0.35, 0.7)}
    ${fBevel('bev', { blur: 2.4, surface: 3 })}
    ${fGrain('wood', { freq: '0.004 0.12', oct: 4, amt: 0.35, seed: 61 })}
    ${fShadow('sh', { dy: 14, blur: 16, op: 0.7 })}
    <filter id="inner" x="0" y="0" width="100%" height="100%"><feFlood flood-color="#000"/><feComposite in2="SourceAlpha" operator="out"/><feGaussianBlur stdDeviation="16"/><feComposite in2="SourceAlpha" operator="in"/><feComponentTransfer><feFuncA type="linear" slope=".9"/></feComponentTransfer></filter>`,
    `<g filter="url(#sh)">
      <rect x="14" y="62" width="${FW - 28}" height="${FH - 76}" rx="34" fill="url(#body)" ${O(3)}/>
    </g>
    <rect x="14" y="62" width="${FW - 28}" height="${FH - 76}" rx="34" fill="url(#body)" filter="url(#wood)"/>
    <rect x="14" y="62" width="${FW - 28}" height="${FH - 76}" rx="34" fill="none" stroke="url(#trim)" stroke-width="6"/>
    <rect x="${wx - 30}" y="${wy - 30}" width="${ww + 60}" height="${wh + 60}" rx="24" fill="url(#band)" ${O(2.5)} filter="url(#bev)"/>
    <rect x="${wx - 22}" y="${wy - 22}" width="${ww + 44}" height="${wh + 44}" rx="20" fill="none" stroke="#f0c088" stroke-width="2" stroke-dasharray="9 7" opacity=".55"/>
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="12" fill="url(#win)"/>
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="12" fill="#000" filter="url(#inner)"/>
    ${[1, 2, 3, 4].map((i) => `<rect x="${wx + i * 200 - 1.5}" y="${wy + 10}" width="3" height="${wh - 20}" fill="url(#trim)" opacity=".35"/>`).join('')}
    <rect x="${wx - 6}" y="${wy - 6}" width="${ww + 12}" height="${wh + 12}" rx="15" fill="none" stroke="url(#trim)" stroke-width="10" filter="url(#bev)"/>
    <rect x="${wx - 6}" y="${wy - 6}" width="${ww + 12}" height="${wh + 12}" rx="15" fill="none" stroke="${PAL.ink}" stroke-width="1.5"/>
    ${studs.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#stud)" ${O(1.2)}/>`).join('')}
    ${corner(40, 88)}${corner(FW - 40, 88)}${corner(40, FH - 28)}${corner(FW - 40, FH - 28)}
    ${crest}`);
}

/** Wide wooden sign plate for info bars (feature counters). */
function plate(w, h, name) {
  return svg(w, h, `${lin('b', [[0, '#5a3016'], [1, '#24100a']], 0, 0, 0, 1)}${lin('t', GOLD_STOPS, 0, 0, 0.2, 1)}${fBevel('bev', { blur: 2, surface: 2.6 })}${fGrain('g', { freq: '0.006 0.15', oct: 3, amt: 0.3, seed: 71 })}${fShadow('s', { dy: 6, blur: 6, op: 0.6 })}`,
    `<g filter="url(#s)"><rect x="8" y="6" width="${w - 16}" height="${h - 18}" rx="${h * 0.2}" fill="url(#b)" ${O(2.5)}/></g>
     <rect x="8" y="6" width="${w - 16}" height="${h - 18}" rx="${h * 0.2}" fill="url(#b)" filter="url(#g)"/>
     <rect x="8" y="6" width="${w - 16}" height="${h - 18}" rx="${h * 0.2}" fill="none" stroke="url(#t)" stroke-width="5" filter="url(#bev)"/>
     <rect x="16" y="14" width="${w - 32}" height="${h - 34}" rx="${h * 0.15}" fill="none" stroke="#f0c088" stroke-width="1.4" stroke-dasharray="6 5" opacity=".45"/>
     ${[[20, h / 2 - 6], [w - 20, h / 2 - 6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="url(#t)" ${O(1)}/>`).join('')}`);
}

/** Hold & Respin slot cell. */
function lsCell() {
  return svg(196, 176, `${lin('b', [[0, '#120806'], [1, '#2e140c']], 0, 0, 0, 1)}${lin('t', [[0, '#d9a441'], [0.5, '#6b3d0a'], [1, '#c98a1c']], 0, 0, 0, 1)}
    <filter id="in" x="0" y="0" width="100%" height="100%"><feFlood flood-color="#000"/><feComposite in2="SourceAlpha" operator="out"/><feGaussianBlur stdDeviation="10"/><feComposite in2="SourceAlpha" operator="in"/></filter>`,
    `<rect x="6" y="6" width="184" height="164" rx="18" fill="url(#b)"/><rect x="6" y="6" width="184" height="164" rx="18" fill="#000" filter="url(#in)"/>
     <rect x="6" y="6" width="184" height="164" rx="18" fill="none" stroke="url(#t)" stroke-width="3.5"/>
     <path d="${hexagram(98, 88, 36)}" fill="none" stroke="#6b3d0a" stroke-width="2" opacity=".35"/>`);
}

export default function () {
  const L = [];
  const bg = [['base', baseBack, baseMid, baseFront], ['escape', escapeBack, escapeMid, escapeFront], ['hideout', hideoutBack, hideoutMid, hideoutFront], ['laststand', lastBack, lastMid, lastFront]];
  for (const [n, b, m, f] of bg) {
    L.push({ name: `bg_${n}_back`, w: W, h: H, scale: 1, svg: b(), fmt: 'jpg', group: 'bg' });
    L.push({ name: `bg_${n}_mid`, w: W, h: H, scale: 1, svg: m(), group: 'bg' });
    L.push({ name: `bg_${n}_front`, w: W, h: H, scale: 1, svg: f(), group: 'bg' });
  }
  L.push({ name: 'frame_base', w: 1120, h: 710, scale: 1.6, svg: frame('base'), group: 'frame' });
  L.push({ name: 'frame_hideout', w: 1120, h: 710, scale: 1.6, svg: frame('hideout'), group: 'frame' });
  L.push({ name: 'frame_last', w: 1120, h: 710, scale: 1.6, svg: frame('last'), group: 'frame' });
  L.push({ name: 'plate_wide', w: 300, h: 110, scale: 2, svg: plate(300, 110), group: 'ui' });
  L.push({ name: 'plate_mid', w: 240, h: 110, scale: 2, svg: plate(240, 110), group: 'ui' });
  L.push({ name: 'plate_meter', w: 460, h: 120, scale: 2, svg: plate(460, 120), group: 'ui' });
  L.push({ name: 'ls_cell', w: 196, h: 176, scale: 2, svg: lsCell(), group: 'ui' });
  return L;
}
