/**
 * RNG Service.
 *
 * DEVELOPMENT-ONLY RNG. `DevRng` is a seedable xoshiro128** generator seeded from
 * `crypto.getRandomValues`. It is NOT a certified RNG. A production deployment must
 * replace this with the certified server-side RNG behind the same `Rng` interface.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Serialisable state, used for interrupted-game recovery and audit. */
  getState(): number[];
  setState(s: number[]): void;
  readonly label: string;
}

function splitmix32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return (t ^= t >>> 15) >>> 0;
  };
}

export class DevRng implements Rng {
  readonly label = 'DEV-xoshiro128** (NOT CERTIFIED)';
  private s: Uint32Array;
  constructor(seed?: number) {
    if (seed === undefined) {
      const buf = new Uint32Array(1);
      (globalThis.crypto as Crypto).getRandomValues(buf);
      seed = buf[0];
    }
    const sm = splitmix32(seed);
    this.s = new Uint32Array([sm(), sm(), sm(), sm()]);
  }
  private nextU32(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return result;
  }
  next(): number {
    return this.nextU32() / 4294967296;
  }
  getState(): number[] {
    return Array.from(this.s);
  }
  setState(st: number[]): void {
    this.s = new Uint32Array(st);
  }
}

function rotl(x: number, k: number) {
  return (x << k) | (x >>> (32 - k));
}

/** Deterministic queue-driven RNG for unit tests: returns the given values in order, then repeats. */
export class ScriptedRng implements Rng {
  readonly label = 'SCRIPTED (tests)';
  private i = 0;
  constructor(private values: number[]) {}
  next(): number {
    const v = this.values[this.i % this.values.length];
    this.i++;
    return v;
  }
  getState(): number[] {
    return [this.i];
  }
  setState(s: number[]): void {
    this.i = s[0];
  }
}

// ---------------------------------------------------------------- helpers
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng.next() * n);
}

/** Weighted pick from a record of key → weight. */
export function pickWeighted<K extends string | number>(rng: Rng, weights: Partial<Record<K, number>>): K {
  const entries = Object.entries(weights) as [string, number][];
  const total = entries.reduce((s, [, w]) => s + (w || 0), 0);
  let r = rng.next() * total;
  for (const [k, w] of entries) {
    if (!w) continue;
    r -= w;
    if (r < 0) return (isNaN(Number(k)) ? k : Number(k)) as K;
  }
  const last = entries.filter(([, w]) => w > 0).pop()!;
  return (isNaN(Number(last[0])) ? last[0] : Number(last[0])) as K;
}

/** Weighted pick from a list of {v, w}. */
export function pickWeightedList<T>(rng: Rng, list: readonly { v: T; w: number }[]): T {
  const total = list.reduce((s, e) => s + e.w, 0);
  let r = rng.next() * total;
  for (const e of list) {
    r -= e.w;
    if (r < 0) return e.v;
  }
  return list[list.length - 1].v;
}

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(rng: Rng, arr: T[], n: number): T[] {
  return shuffle(rng, arr).slice(0, n);
}
