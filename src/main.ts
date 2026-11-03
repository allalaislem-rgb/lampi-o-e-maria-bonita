/**
 * Lampião & Maria Bonita – The Legend of the Sertão (Orbit Games)
 * Development prototype entry point.
 */
import './ui/styles.css';
import { GameServer } from './engine/server';
import { GameClient } from './engine/client';
import { DevRng } from './engine/rng';
import { loadAssets } from './ui/assets';
import { Stage } from './ui/stage';
import { Controller } from './ui/controller';

async function boot() {
  const fill = document.querySelector<HTMLElement>('#loader .fill')!;
  const fontsReady = Promise.race([
    Promise.all([document.fonts.load('40px Rye'), document.fonts.load('40px "Alfa Slab One"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  await loadAssets((p) => (fill.style.width = `${Math.round(p * 100)}%`));
  await fontsReady;

  // Authoritative engine (in-process for the prototype). Persisted to localStorage
  // so an interrupted round resumes after reload.
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  const server = new GameServer({ rng: new DevRng(), storage });
  const client = new GameClient(server);

  const stage = new Stage();
  await stage.init(document.getElementById('game')!);
  const controller = new Controller(client, stage);

  const loader = document.getElementById('loader')!;
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 650);
  await controller.start();

  // debug handle for QA in the browser console
  (window as unknown as Record<string, unknown>).__lmb = { server, client, stage };
}

boot().catch((e) => {
  console.error(e);
  const hint = document.querySelector('#loader .hint');
  if (hint) hint.textContent = 'Failed to load: ' + (e as Error).message;
});
