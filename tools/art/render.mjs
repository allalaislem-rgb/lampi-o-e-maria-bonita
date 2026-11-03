/**
 * Rasterises every code-authored SVG asset with headless Chromium.
 *   node tools/art/render.mjs            → render all assets to art/render/
 *   node tools/art/render.mjs sym_ bg_   → only assets whose name contains a filter
 *   node tools/art/render.mjs --sheet    → also write art/render/_sheet.png (preview)
 */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'art/render');
fs.mkdirSync(OUT, { recursive: true });

const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'public/fonts', f)).toString('base64')}`;
const CSS = `
@font-face{font-family:'Rye';src:url(${font('Rye.woff2')})}
@font-face{font-family:'Alfa Slab One';src:url(${font('AlfaSlabOne.woff2')})}
@font-face{font-family:'Roboto Condensed';src:url(${font('RobotoCondensed.woff2')});font-weight:100 900}
html,body{margin:0;padding:0;background:transparent}svg{display:block}`;

const modules = ['objects.mjs', 'env.mjs', 'ui.mjs', 'fx.mjs'];
const args = process.argv.slice(2);
const filters = args.filter((a) => !a.startsWith('--'));
const sheet = args.includes('--sheet');

const assets = [];
for (const m of modules) {
  const p = path.join(path.dirname(fileURLToPath(import.meta.url)), m);
  if (!fs.existsSync(p)) continue;
  const mod = await import(p);
  assets.push(...mod.default());
}
const todo = assets.filter((a) => !filters.length || filters.some((f) => a.name.includes(f)));
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const a of todo) {
  const s = a.scale ?? 2;
  await page.setViewportSize({ width: Math.ceil(a.w * s), height: Math.ceil(a.h * s) });
  const svg = a.svg.replace(/<svg /, `<svg style="width:${a.w * s}px;height:${a.h * s}px" `);
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${a.name}.${a.fmt === 'jpg' ? 'jpg' : 'png'}`);
  await page.screenshot({ path: file, omitBackground: a.fmt !== 'jpg', type: a.fmt === 'jpg' ? 'jpeg' : 'png', quality: a.fmt === 'jpg' ? 88 : undefined, clip: { x: 0, y: 0, width: Math.ceil(a.w * s), height: Math.ceil(a.h * s) } });
  process.stdout.write('.');
}
console.log(`\nrendered ${todo.length} assets`);

if (sheet) {
  const imgs = todo.map((a) => ({ name: a.name, src: 'data:image/' + (a.fmt === 'jpg' ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(path.join(OUT, `${a.name}.${a.fmt === 'jpg' ? 'jpg' : 'png'}`)).toString('base64') }));
  const html = `<html><body style="margin:0;background:#2a160c;display:flex;flex-wrap:wrap;gap:6px;padding:6px;width:1500px;font:11px sans-serif;color:#fff">${imgs
    .map((i) => `<div style="width:240px;text-align:center"><div style="height:220px;display:flex;align-items:center;justify-content:center;background:#3a2214"><img src="${i.src}" style="max-width:236px;max-height:216px"></div>${i.name}</div>`)
    .join('')}</body></html>`;
  await page.setViewportSize({ width: 1512, height: 800 });
  await page.setContent(html);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '_sheet.png'), fullPage: true });
}
await browser.close();
