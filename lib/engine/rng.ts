/* Zufallsgenerator pro Partie.
   Vorher lag der Zustand (SEED) auf Modulebene — ein einziger, globaler
   Zufallsstrom für den gesamten Prozess. Auf einem Server, der mehrere
   Partien parallel bedient, hätten sich diese Partien denselben Strom
   geteilt: Ziehung A verschiebt, welche Zahl Ziehung B als Nächstes bekommt.
   createRng() kapselt genau diesen Zustand in einer Instanz je Partie —
   derselbe Generator (linearer Kongruenzgenerator), aber ohne Modul-Global. */

export interface Rng {
  rnd(): number;
  nrm(spread?: number): number;
  pick<T>(arr: readonly T[]): T;
  band(range: readonly [number, number]): number;
  readonly seed: number;
  setSeed(v: number): void;
}

export function createRng(seed: number): Rng {
  let s = seed;

  function rnd(): number {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  }
  function nrm(spread: number = 1): number {
    return (rnd() + rnd() + rnd() + rnd() - 2) * spread;
  }
  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(rnd() * arr.length)];
  }
  function band([a, b]: readonly [number, number]): number {
    return a + rnd() * (b - a);
  }

  return {
    rnd,
    nrm,
    pick,
    band,
    get seed() { return s; },
    setSeed(v: number) { s = v; },
  };
}
