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
import { sound } from './audio/sound';

async function boot() {
  const fill = document.querySelector<HTMLElement>('#loader .fill')!;
  let gfx = 0;
  let sfx = 0;
  const progress = () => (fill.style.width = `${Math.round((gfx * 0.75 + sfx * 0.25) * 100)}%`);
  const fonts = Promise.race([
    Promise.all([document.fonts.load('40px Rye'), document.fonts.load('40px "Alfa Slab One"'), document.fonts.load('20px "Roboto Condensed"')]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await Promise.all([
    loadAssets((p) => {
      gfx = p;
      progress();
    }),
    sound.preload((p) => {
      sfx = p;
      progress();
    }),
    fonts,
  ]);

  // Authoritative engine (in-process for the prototype), persisted for interrupted-game recovery.
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

  // Title screen: a user gesture is required to start audio.
  const play = document.getElementById('btn-play')!;
  document.querySelector('#loader .bar')!.classList.add('hidden');
  document.querySelector('#loader .hint')!.textContent = server.recovered ? 'Seu bônus inacabado está esperando' : 'A lenda te espera';
  play.classList.remove('hidden');
  await new Promise<void>((res) =>
    play.addEventListener(
      'click',
      () => {
        sound.unlock();
        sound.play('click');
        res();
      },
      { once: true },
    ),
  );
  const loader = document.getElementById('loader')!;
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 750);
  await controller.start();

  // debug handle for QA in the browser console
  (window as unknown as Record<string, unknown>).__lmb = { server, client, stage, sound };
}

boot().catch((e) => {
  console.error(e);
  const hint = document.querySelector('#loader .hint');
  if (hint) hint.textContent = 'Falha ao carregar: ' + (e as Error).message;
});
