/* Zufallsgenerator pro Partie.
   Vorher lag der Zustand (SEED) auf Modulebene — ein einziger, globaler
   Zufallsstrom für den gesamten Prozess. Auf einem Server, der mehrere
   Partien parallel bedient, hätten sich diese Partien denselben Strom
   geteilt: Ziehung A verschiebt, welche Zahl Ziehung B als Nächstes bekommt.
   createRng() kapselt genau diesen Zustand in einer Instanz je Partie —
   derselbe Generator (linearer Kongruenzgenerator), aber ohne Modul-Global. */

/* Parameter des linearen Kongruenzgenerators. Sie stehen hier als Konstanten,
   weil lib/engine/replay.ts den Generator rückwärts laufen lassen muss, um ein
   bereits ausgewertetes Halbjahr exakt zu wiederholen — und dafür denselben
   Multiplikator, Zuwachs und Modulus braucht, nicht eine zweite Abschrift.  */
export const LCG_A = 1664525;
export const LCG_C = 1013904223;
export const LCG_M = 4294967296;

export interface Rng {
  rnd(): number;
  nrm(spread?: number): number;
  pick<T>(arr: readonly T[]): T;
  band(range: readonly [number, number]): number;
  readonly seed: number;
  /* Zahl der bisherigen Ziehungen dieser Instanz. Nur die Wiederholung
     ausgewerteter Halbjahre braucht sie: Sie misst damit, wie weit ein
     Halbjahr den Strom vorgerückt hat, und findet so seine Startposition. */
  readonly draws: number;
  setSeed(v: number): void;
}

export function createRng(seed: number): Rng {
  let s = seed;
  let n = 0;

  function rnd(): number {
    s = (s * LCG_A + LCG_C) % LCG_M;
    n += 1;
    return s / LCG_M;
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
    get draws() { return n; },
    setSeed(v: number) { s = v; },
  };
}
