import { Assets, Texture } from 'pixi.js';

const NAMES = [
  'sym_lampiao', 'sym_maria', 'sym_wild', 'sym_wanted', 'sym_map', 'sym_emblem', 'sym_hat', 'sym_cartucheira', 'sym_revolver',
  'sym_sanfona', 'sym_rifles', 'sym_facao', 'sym_cactus', 'sym_cantil',
  'logo', 'lantern', 'wheel', 'jug', 'saddle', 'drum', 'rooster', 'sunflower', 'hibiscus', 'bougainvillea',
  'chest_closed', 'chest_open', 'chest_gems', 'chest_gold', 'chest_wood', 'coins_pile', 'coin_gold', 'coin_star', 'medallion',
  'mult_2', 'mult_3', 'mult_5', 'mult_10', 'xmult_2', 'xmult_3', 'xmult_5', 'xmult_10',
  'gem_star', 'gem_heart', 'gem_diamond', 'emblem_sun', 'banner_star', 'scarf', 'hat_straps',
  'title_escape', 'title_hideout', 'title_laststand',
];
const JPG = ['bg_village', 'bg_hideout', 'bg_canyon', 'bg_escape'];

export async function loadAssets(onProgress: (p: number) => void) {
  const list = [
    ...NAMES.map((n) => ({ alias: n, src: `./assets/${n}.png` })),
    ...JPG.map((n) => ({ alias: n, src: `./assets/${n}.jpg` })),
  ];
  Assets.addBundle('game', list);
  await Assets.loadBundle('game', onProgress);
}

export function tex(name: string): Texture {
  return Assets.get<Texture>(name) ?? Texture.WHITE;
}
