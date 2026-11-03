/**
 * VFX textures (white/neutral so they can be tinted at runtime, rendered additive).
 */
import { svg, starPts, rad } from './lib.mjs';

const glow = () => svg(128, 128, rad('g', [[0, '#fff', 1], [0.25, '#fff', 0.6], [0.6, '#fff', 0.15], [1, '#fff', 0]]), `<circle cx="64" cy="64" r="64" fill="url(#g)"/>`);
const dot = () => svg(32, 32, rad('g', [[0, '#fff', 1], [0.5, '#fff', 0.7], [1, '#fff', 0]]), `<circle cx="16" cy="16" r="16" fill="url(#g)"/>`);
const spark = () => svg(128, 128, rad('g', [[0, '#fff', 1], [0.2, '#fff', 0.9], [1, '#fff', 0]]),
  `<polygon points="${starPts(64, 64, 4, 64, 5, 0)}" fill="url(#g)"/><polygon points="${starPts(64, 64, 4, 34, 4, Math.PI / 4)}" fill="url(#g)" opacity=".6"/><circle cx="64" cy="64" r="10" fill="#fff"/>`);
const ring = () => svg(256, 256, rad('g', [[0, '#fff', 0], [0.78, '#fff', 0], [0.88, '#fff', 0.9], [0.94, '#fff', 0.5], [1, '#fff', 0]]), `<circle cx="128" cy="128" r="128" fill="url(#g)"/>`);
const streak = () => svg(256, 32, `<linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="v" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  `<ellipse cx="128" cy="16" rx="128" ry="10" fill="url(#g)"/>`);
const rays = () => {
  const b = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const w = i % 3 === 0 ? 0.07 : 0.035;
    return `<path d="M256 256 L ${256 + Math.cos(a - w) * 256} ${256 + Math.sin(a - w) * 256} L ${256 + Math.cos(a + w) * 256} ${256 + Math.sin(a + w) * 256} Z" fill="url(#g)" opacity="${i % 2 ? 0.55 : 1}"/>`;
  }).join('');
  return svg(512, 512, rad('g', [[0, '#fff', 0.9], [0.4, '#fff', 0.35], [1, '#fff', 0]], 0.5, 0.5, 0.5, 0.5, 0.5, 'objectBoundingBox').replace('id="g"', 'id="g" gradientUnits="userSpaceOnUse" cx="256" cy="256" r="256" fx="256" fy="256"'), b);
};
const dust = (seed) => svg(256, 256, `<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -0.9"/></filter>
  <radialGradient id="m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="k"><rect width="256" height="256" fill="url(#m)"/></mask>`, `<rect width="256" height="256" filter="url(#f)" mask="url(#k)"/>`);
const ember = () => svg(48, 48, rad('g', [[0, '#fff', 1], [0.3, '#fff', 0.8], [1, '#fff', 0]]), `<ellipse cx="24" cy="24" rx="10" ry="22" fill="url(#g)"/>`);
const flare = () => svg(512, 128, `<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".15" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="h" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  `<rect x="0" y="60" width="512" height="8" fill="url(#h)"/><ellipse cx="256" cy="64" rx="70" ry="64" fill="url(#g)"/>`);
/** Diagonal shine band used to sweep across winning/wild symbols. */
const shine = () => svg(128, 256, `<linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset=".56" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".35"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  `<rect width="128" height="256" fill="url(#g)"/>`);
const smoke = (seed) => dust(seed + 10);

export default function () {
  const L = [
    ['fx_glow', 128, 128, glow()], ['fx_dot', 32, 32, dot()], ['fx_spark', 128, 128, spark()], ['fx_ring', 256, 256, ring()],
    ['fx_streak', 256, 32, streak()], ['fx_rays', 512, 512, rays()], ['fx_dust1', 256, 256, dust(3)], ['fx_dust2', 256, 256, dust(8)],
    ['fx_ember', 48, 48, ember()], ['fx_flare', 512, 128, flare()], ['fx_shine', 128, 256, shine()], ['fx_smoke', 256, 256, smoke(4)],
  ];
  return L.map(([name, w, h, s]) => ({ name, w, h, scale: 1, svg: s, group: 'fx' }));
}
