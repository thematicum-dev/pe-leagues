"use client";

/* ============================================================================
   Battle Cards — visuelle Identität von Sektor und Unternehmen.

   Diese Datei enthält ausschließlich Darstellung. Keine Spiellogik, keine
   Kennzahlenrechnung: Die Werte kommen fertig aus `lib/engine`, hier werden sie
   nur in Form gebracht. `ui.tsx` entscheidet weiterhin, welche Zahl wann
   sichtbar ist.

   Zwei Ebenen von Identität:

   1. Der Sektor. Er ist der Typ der Karte und trägt eine Farbe (SECCOLOR in
      lib/engine), ein Wappen, ein Motiv und einen Anspruch ("BETTER LIVES").
      Fünf Sektoren, fünf klar getrennte Farbfamilien — man erkennt den Typ,
      bevor man das Etikett liest.

   2. Das einzelne Unternehmen. Zwei Zielobjekte aus demselben Sektor dürfen
      nicht austauschbar aussehen. Aus dem Firmennamen wird deshalb eine eigene
      Identität abgeleitet: ein Farbton innerhalb der Sektorfamilie, ein
      Monogramm, eine Bildvariante und ein Hintergrundmuster. Alles
      deterministisch — dasselbe Unternehmen sieht über die ganze Partie gleich
      aus, ohne dass irgendwo ein Bild gespeichert werden müsste.

   Warum überhaupt gezeichnet und nicht fotografiert: Die Zielobjekte entstehen
   zur Laufzeit aus einem Katalog von Archetypen. Es gibt kein Bild, das man
   ihnen zuordnen könnte — also muss es aus dem Namen entstehen.
   ========================================================================== */

import React from "react";
import { SECCOLOR, SECLABEL } from "@/lib/engine";

/* ---------------------------------------------------------------- Zufall --
   FNV-1a über den Namen, danach ein linearer Kongruenzgenerator. Reicht
   vollkommen für Bildrauschen und ist in jedem Browser gleich.              */
export function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < (str || "").length; i++) {
    h ^= (str || "").charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function lcg(seed) {
  let s = (seed || 1) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const cl = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------- Farbraum --
   Die Sektorfarbe wird in HSL zerlegt, damit sich daraus eine Familie bilden
   lässt: derselbe Sektor, andere Firma, leicht anderer Ton. Ein reines
   Aufhellen oder Abdunkeln reicht dafür nicht — der Farbton selbst muss
   wandern, sonst sehen zwei Karten desselben Sektors gleich aus.            */
function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#888888");
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
const hsl = (h, s, l, a = 1) =>
  a >= 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
         : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`;

/* -------------------------------------------------- Identität des Sektors --
   Der Anspruch ist bewusst kurz und englisch: Er steht als Signet im Bild,
   nicht als Satz im Fließtext, und soll auf zwei Zeilen passen.             */
export const SECTOR_ID = {
  Software:    { scene: "racks",   claim: ["INNOVATION", "SCALES"] },
  Healthcare:  { scene: "helix",   claim: ["BETTER", "LIVES"] },
  Industrials: { scene: "robot",   claim: ["REAL", "ASSETS"] },
  Consumer:    { scene: "bottle",  claim: ["BRANDS", "PEOPLE LOVE"] },
  Services:    { scene: "network", claim: ["EXPERTISE", "AT WORK"] },
};
const secId = (sector) => SECTOR_ID[sector] || SECTOR_ID.Services;

/* ------------------------------------------------ Identität der Firma --
   Der Name eines Zielobjekts ist "Hausname + Geschäftsfeld" ("Markmont
   Dentallabore"). Beides wird gebraucht: das Monogramm kommt aus dem
   Hausnamen, das Geschäftsfeld steht als Zeile unter dem Namen.             */
export function houseOf(name) { return (name || "").split(" ")[0] || ""; }
export function tradeOf(name) { return (name || "").split(" ").slice(1).join(" "); }

function monogramOf(name) {
  const parts = (name || "?").split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "?").slice(0, 2).toUpperCase();
}

/* Der Anspruch der Karte in einem Satz: der erste Satz der Beschreibung. Er
   ist im Katalog immer die Zusammenfassung des Geschäftsmodells, der Rest die
   Begründung. So steht oben eine Zeile und unten die These — ohne dass ein
   Text doppelt erscheint oder irgendwo erfunden werden müsste.              */
export function splitDesc(desc) {
  const t = (desc || "").trim();
  const i = t.indexOf(". ");
  if (i < 0) return { lead: t, rest: "" };
  return { lead: t.slice(0, i + 1), rest: t.slice(i + 2).trim() };
}

export function identityOf(name, sector) {
  const seed = seedOf(name + "|" + sector);
  const rnd = lcg(seed);
  const b = hexToHsl(SECCOLOR[sector] || "#888888");
  // Farbton wandert innerhalb der Sektorfamilie, Sättigung und Helligkeit nur
  // wenig — sonst zerfällt der Sektor als erkennbare Gruppe.
  const h = (b.h + (rnd() * 2 - 1) * 15 + 360) % 360;
  const s = cl(b.s + (rnd() * 2 - 1) * 12, 34, 92);
  const l = cl(b.l + (rnd() * 2 - 1) * 6, 34, 66);
  return {
    seed,
    sector,
    uid: "i" + (seed % 1000000),
    own: hsl(h, s, l),
    lit: hsl(h, Math.min(96, s + 10), Math.min(74, l + 16)),
    deep: hsl(h, Math.min(96, s + 6), Math.max(13, l - 30)),
    /* Fast schwarz, aber in der Familie: das Gehäuse, gegen das der helle
       Strich als Kante wirkt. Ohne diesen Ton verschwimmen die goldenen und
       roséfarbenen Sektoren zu einer einzigen Mitteltönung. */
    shade: hsl(h, Math.min(70, s * 0.5), 10),
    mono: monogramOf(name),
    scene: secId(sector).scene,
    claim: secId(sector).claim,
    variant: Math.floor(rnd() * 1000),
    pattern: Math.floor(rnd() * 4),
    rnd,
  };
}

/* ================================================================= Fotos ==
   Der Kartenkopf trägt entweder ein Foto oder die gezeichnete Szene. Welches
   von beidem, entscheidet allein diese Tabelle: Sie sagt, wie viele Motive je
   Sektor unter `public/sektoren/` liegen. Steht dort eine Null, zeichnet die
   Karte weiter — es gibt also keinen Zustand, in dem ein fehlendes Bild ein
   Loch hinterlässt.

   Warum mehrere Motive je Sektor: Ein Foto je Sektor hieße, dass alle
   Dentallabore gleich aussehen. Aus dem Startwert des Unternehmens wird eines
   der vorhandenen Motive gewählt; mit drei Motiven je Sektor bleibt von der
   Identität des einzelnen Unternehmens so viel übrig, wie mit fertigen Bildern
   überhaupt möglich ist. Den Rest tragen weiterhin Farbton, Monogramm und
   Signet.

   Dateien heißen `<sektor>-<nummer>.webp`, durchnummeriert ab 1. Wer ein Motiv
   hinzufügt, erhöht hier die Zahl — sonst wird es nie gezogen.             */
export const PHOTO_VARIANTS = {
  Software: 1, Healthcare: 1, Industrials: 1, Services: 1, Consumer: 1,
};
/* Die beiden Stellschrauben der Farbkorrektur, an einer Stelle, weil sie
   zusammen wirken: Sättigung des Motivs und Deckkraft der Firmenfarbe darüber.

   Die Farbe wird im Modus `color` aufgetragen, nicht als deckende Fläche: Er
   nimmt Farbton und Sättigung aus der Auflage und die Helligkeit aus dem Foto
   darunter. Eine deckende Fläche hätte die Tiefen angehoben — aus einem
   nächtlichen Rechenzentrum wurde damit ein milchiger blauer Schleier. Weil
   die Helligkeit unangetastet bleibt, darf das Motiv auch fast seine volle
   Sättigung behalten. */
export const PHOTO_SATURATION = 0.85;
export const PHOTO_TINT = 0.18;
const PHOTO_SLUG = {
  Software: "software", Healthcare: "healthcare", Industrials: "industrials",
  Services: "services", Consumer: "consumer",
};
export function photoOf(id) {
  const n = PHOTO_VARIANTS[id.sector] || 0;
  if (!n) return null;
  return `/sektoren/${PHOTO_SLUG[id.sector]}-${1 + (id.seed % n)}.webp`;
}

/* ---------------------------------------------------------------- Wappen --
   Ein Sektor ist der Typ der Karte. Jeder bekommt ein eigenes Zeichen, das
   klein in der Typzeile wie groß als Wasserzeichen funktioniert — deshalb
   reine Pfade ohne Füllfarbe, die Farbe kommt über `currentColor`.          */
export function SectorEmblem({ sector, style = undefined, className = "" }) {
  const P = {
    Industrials: (<><path d="M4 21h17M6 21V11l5 3V11l5 3V8l3-1v14" /><path d="M9.5 17.5h1.5M14 17.5h1.5" /></>),
    Healthcare:  (<><path d="M3 13h3l2-4 2.5 8L14 7l2 6h5" /><path d="M12 3v3M10.5 4.5h3" /></>),
    Software:    (<><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" /></>),
    Services:    (<><path d="M12 5.5 8 9l4 3.5L16 9z" /><path d="M12 12.5 8 16l4 3.5L16 16z" /><path d="M6.5 12.5 4 12l2.5-.5M17.5 12.5 20 12l-2.5-.5" /></>),
    Consumer:    (<><path d="M6 8h12l-1.2 11.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>),
  };
  return (
    <svg viewBox="0 0 24 24" className={"bemb " + className} style={style} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {P[sector] || P.Services}
    </svg>
  );
}

/* --------------------------------------------------------------- Signet --
   Das Monogramm im Sechseck ist das Firmenzeichen: dieselbe Stelle auf jeder
   Karte, eigene Farbe je Unternehmen. Es ist das, was im Regal und in der
   Kopfzeile wiedererkannt wird.                                             */
export function Sigil({ id, size = 40, className = "" }) {
  return (
    <span className={"bsigil " + className} style={{ width: size, height: size * 1.1 }}>
      <svg viewBox="0 0 40 44" aria-hidden="true">
        <defs>
          <linearGradient id={id.uid + "sg"} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={id.lit} /><stop offset="100%" stopColor={id.own} />
          </linearGradient>
        </defs>
        <polygon points="20,1 39,11.5 39,32.5 20,43 1,32.5 1,11.5"
          fill={`url(#${id.uid}sg)`} fillOpacity=".16"
          stroke={`url(#${id.uid}sg)`} strokeWidth="1.4" />
        <text x="20" y="27.5" textAnchor="middle" fontSize="15" fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif" letterSpacing="-.5" fill={id.lit}>{id.mono}</text>
      </svg>
    </span>
  );
}

/* ================================================================== Bild ==
   Fünf Szenen, eine je Sektor — dieselben Bildideen wie im Entwurf: Serverreihe,
   Doppelhelix, Roboterarm, Flasche mit Botanik, Standortnetz. Gezeichnet, nicht
   fotografiert, weil die Zielobjekte erst zur Laufzeit entstehen.

   Jede Szene liest `rnd` und variiert daran ihre Anzahl, Stellung und Dichte:
   zwei Dentallabore bekommen dieselbe Bildidee, aber nicht dasselbe Bild.
   Die Zeichenfläche ist 220 x 200; die Szene sitzt rechts, links bleibt Platz
   für Name und Anspruch.
   ========================================================================= */

/* Kleine Hilfe: ein Viereck aus vier Punkten. Alle Szenen bauen ihre Körper
   aus solchen Flächen, weil eine Fläche mit heller und dunkler Seite Volumen
   hat, eine Linie dagegen nicht.                                            */
const poly = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* ---------------------------------------------------------- Software & IT --
   Eine Reihe Serverschränke, die nach hinten links im Dunkeln verschwindet;
   der vorderste ist vom rechten Kartenrand angeschnitten.

   Das Licht kommt von oben rechts. Jeder Schrank ist ein Körper aus drei
   Flächen: Vorderseite mit Verlauf von hell (rechts) nach dunkel (links),
   Seitenwand im Schatten, Deckel als schmale helle Sichel. Erst diese drei
   Flächen machen aus einem Rechteck einen Gegenstand.

   Nur der vorderste Schrank bekommt helle Leuchtdioden; die dahinter werden
   kleiner, höher und dunkler. Das ist die ganze Tiefenwirkung — drei
   Helligkeitsstufen, mehr braucht es nicht.                                 */
function Racks({ rnd, id, k = "", glow = false }) {
  const dx = rnd() * 8 - 4;
  /* Drei Schränke von hinten nach vorn. `dim` ist die Tiefenstufe: Sie
     bestimmt Deckkraft und ob überhaupt Licht gezeigt wird. */
  const cabs = [
    { x: 44 + dx, w: 42, top: 92, bot: 188, dim: 0.3, rows: 6 },
    { x: 92 + dx, w: 50, top: 74, bot: 194, dim: 0.6, rows: 7 },
    { x: 150 + dx, w: 78, top: 46, bot: 200, dim: 1, rows: 8 + Math.floor(rnd() * 3) },
  ];
  // Welche Einschübe leuchten und wie breit ihr Lichtband ist
  cabs.forEach((c) => {
    c.lit = Array.from({ length: c.rows }, () => rnd() < 0.42);
    c.wide = Array.from({ length: c.rows }, () => 0.28 + rnd() * 0.42);
  });

  // Geometrie eines Schranks: Vorderseite geschert, Seitenwand nach links
  const geo = (c) => {
    const sh = 9, dep = 20;
    const FL = [c.x, c.top + sh], FR = [c.x + c.w, c.top];
    const BL = [c.x, c.bot], BR = [c.x + c.w, c.bot - sh];
    const SL = [c.x - dep, c.top + sh + 7], SB = [c.x - dep, c.bot + 7];
    const units = Array.from({ length: c.rows }, (_, i) => {
      const t0 = (i + 0.5) / (c.rows + 0.6), t1 = t0 + 0.6 / (c.rows + 0.6);
      return { a: lerp(FL, BL, t0), b: lerp(FR, BR, t0),
               c: lerp(FR, BR, t1), d: lerp(FL, BL, t1) };
    });
    return { FL, FR, BL, BR, SL, SB, units };
  };

  /* Der Leuchtdurchgang zeichnet nur, was Licht abgibt: die Dioden des
     vordersten Schranks und die beiden Kanten, auf die das Licht fällt. Er
     läuft unscharf darunter und gibt ihnen den Hof. */
  if (glow) {
    const c = cabs[2], g = geo(c);
    return (
      <g>
        {g.units.map((u, i) => (c.lit[i] ? (
          <rect key={i} x={u.a[0] + 8} y={(u.a[1] + u.d[1]) / 2 - 2}
            width={(u.b[0] - u.a[0]) * c.wide[i]} height="4" rx="2" fill={id.lit} />
        ) : null))}
        <polyline points={poly([g.SL, g.FL, g.FR])} fill="none" stroke={id.lit} strokeWidth="3" />
        <line x1={g.FR[0]} y1={g.FR[1]} x2={g.BR[0]} y2={g.BR[1]} stroke={id.lit} strokeWidth="2.5" />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <linearGradient id={k + "rf"} x1="1" y1="0" x2="0" y2="0.35">
          <stop offset="0%" stopColor={id.own} />
          <stop offset="52%" stopColor={id.deep} />
          <stop offset="100%" stopColor={id.shade} />
        </linearGradient>
        <linearGradient id={k + "rs"} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={id.deep} /><stop offset="100%" stopColor={id.shade} />
        </linearGradient>
        <linearGradient id={k + "rfl"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={id.own} stopOpacity=".3" />
          <stop offset="100%" stopColor={id.own} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Boden und die Spiegelung darauf */}
      <rect x="0" y="188" width="220" height="14" fill={id.shade} opacity=".6" />
      <rect x="70" y="188" width="160" height="24" fill={`url(#${k}rfl)`} />

      {cabs.map((c, ci) => {
        const g = geo(c), front = ci === cabs.length - 1;
        return (
          <g key={ci} opacity={c.dim}>
            <polygon points={poly([g.SL, g.FL, g.BL, g.SB])} fill={`url(#${k}rs)`} />
            <polygon points={poly([g.FL, g.FR, g.BR, g.BL])} fill={`url(#${k}rf)`} />
            {/* Deckel: die Fläche, auf die das Licht direkt fällt */}
            <polygon points={poly([g.SL, g.FL, g.FR, [g.FR[0] - 20, g.FR[1] + 7]])}
              fill={id.own} opacity=".55" />
            {g.units.map((u, i) => (
              <g key={i}>
                <polygon points={poly([u.a, u.b, u.c, u.d])} fill={id.shade} opacity=".9" />
                <line x1={u.a[0]} y1={u.a[1]} x2={u.b[0]} y2={u.b[1]}
                  stroke={id.own} strokeWidth=".7" opacity=".45" />
                <rect x={u.a[0] + (front ? 8 : 5)} y={(u.a[1] + u.d[1]) / 2 - 1.5}
                  width={(u.b[0] - u.a[0]) * c.wide[i]} height="3" rx="1.5"
                  fill={c.lit[i] && front ? id.lit : id.own}
                  opacity={c.lit[i] ? (front ? 1 : 0.5) : 0.28} />
              </g>
            ))}
            {/* Lichtsaum nur dort, wo das Licht tatsächlich hinfällt */}
            <polyline points={poly([g.SL, g.FL, g.FR])} fill="none" stroke={id.lit}
              strokeWidth={front ? 1.7 : 1} opacity={front ? 0.95 : 0.5} />
            <line x1={g.FR[0]} y1={g.FR[1]} x2={g.BR[0]} y2={g.BR[1]}
              stroke={id.lit} strokeWidth={front ? 1.5 : 0.9} opacity={front ? 0.75 : 0.4} />
            <line x1={g.FL[0]} y1={g.FL[1]} x2={g.BL[0]} y2={g.BL[1]}
              stroke={id.shade} strokeWidth="1.2" opacity=".85" />
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------- Healthcare --
   Eine Doppelhelix mit Tiefe: Die vordere Strebe deckt die hintere ab, wird
   dorthin dicker und heller, wo sie auf den Betrachter zuläuft, und dünner und
   dunkler, wo sie nach hinten wegdreht.

   Das geht nicht mit einem Pfad — ein Pfad hat eine Strichbreite und eine
   Farbe. Jede Strebe ist deshalb in kurze Abschnitte zerlegt, und jeder
   Abschnitt bekommt Breite, Farbe und Deckkraft aus seiner Tiefe. Gezeichnet
   wird nach Tiefe sortiert, damit vorne wirklich vorne liegt.

   Das Licht kommt von oben rechts: Abschnitte auf der rechten Seite der Achse
   bekommen eine Stufe mehr.                                                 */
function Helix({ rnd, id, glow = false }) {
  const turns = 2 + rnd() * 0.8;
  const A = 36 + rnd() * 8;
  const cx = 162 + rnd() * 10, top = 12, bot = 208;
  const N = 30;                       // Abschnitte je Strebe
  const RUNGS = 13;

  const at = (t, ph) => {
    const a = t * Math.PI * 2 * turns + ph;
    return { p: [cx + Math.sin(a) * A, top + t * (bot - top)], z: Math.cos(a) };
  };
  // Tiefe 0..1, rechts der Achse eine Stufe heller (Licht von oben rechts)
  const lvl = (z, x) => Math.max(0, Math.min(1, (z + 1) / 2 + (x > cx ? 0.12 : 0)));
  const col = (u) => (u < 0.26 ? id.shade : u < 0.52 ? id.deep : u < 0.8 ? id.own : id.lit);

  const segs = [];
  [0, Math.PI].forEach((ph, si) => {
    for (let i = 0; i < N; i++) {
      const a = at(i / N, ph), b = at((i + 1) / N, ph);
      const z = (a.z + b.z) / 2, u = lvl(z, (a.p[0] + b.p[0]) / 2);
      segs.push({ a: a.p, b: b.p, z, u, si });
    }
  });
  segs.sort((m, n) => m.z - n.z);     // hinten zuerst

  const rungs = Array.from({ length: RUNGS }, (_, i) => {
    const t = (i + 0.5) / RUNGS;
    const a = at(t, 0), b = at(t, Math.PI);
    const u = lvl(Math.max(a.z, b.z), cx);
    return { a: a.p, b: b.p, u, spread: Math.abs(a.p[0] - b.p[0]) / (2 * A) };
  });

  /* Der Leuchtdurchgang: nur die vordersten Abschnitte und die Knoten, die
     dort sitzen. Sie sind die Lichtquelle des Bildes. */
  if (glow) {
    return (
      <g>
        {segs.filter((s2) => s2.u > 0.8).map((s2, i) => (
          <line key={i} x1={s2.a[0]} y1={s2.a[1]} x2={s2.b[0]} y2={s2.b[1]}
            stroke={id.lit} strokeWidth="6" strokeLinecap="round" />
        ))}
        {rungs.filter((r) => r.u > 0.82).map((r, i) => (
          <circle key={i} cx={r.a[0]} cy={r.a[1]} r="4" fill={id.lit} />
        ))}
      </g>
    );
  }

  return (
    <g>
      {/* Die Sprossen liegen zwischen den Streben; weit auseinanderstehende
          sieht man von der Seite, zusammenlaufende von vorn — deshalb hängt
          ihre Deckkraft an der Spreizung. */}
      {rungs.map((r, i) => (
        <line key={"r" + i} x1={r.a[0]} y1={r.a[1]} x2={r.b[0]} y2={r.b[1]}
          stroke={col(r.u * 0.8)} strokeWidth={1 + r.spread * 1.6}
          strokeLinecap="round" opacity={0.25 + r.spread * 0.5} />
      ))}
      {segs.map((s2, i) => (
        <line key={i} x1={s2.a[0]} y1={s2.a[1]} x2={s2.b[0]} y2={s2.b[1]}
          stroke={col(s2.u)} strokeWidth={1.8 + s2.u * 4.4}
          strokeLinecap="round" opacity={0.42 + s2.u * 0.58} />
      ))}
      {/* Knoten an den Ansatzpunkten der Sprossen — vorne hell und groß */}
      {rungs.map((r, i) => (
        <g key={"n" + i}>
          <circle cx={r.a[0]} cy={r.a[1]} r={1.4 + r.u * 2} fill={col(Math.min(1, r.u + 0.15))}
            opacity={0.5 + r.u * 0.5} />
          <circle cx={r.b[0]} cy={r.b[1]} r={1.4 + (1 - r.u) * 2} fill={col(1 - r.u)}
            opacity={0.5 + (1 - r.u) * 0.5} />
        </g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------ Industrials --
   Ein Roboterarm, gebaut wie eine Maschine: Sockel, Drehteller, zwei sich
   verjüngende Armstücke, Gelenkringe mit Schraubenkranz, ein Greifer mit zwei
   Backen, eine Kabelführung. Dahinter die Halle nur als Silhouette.

   Ein Armstück ist keine Linie, sondern eine Fläche, die sich zum Gelenk hin
   verjüngt: Nur so hat es eine Ober- und eine Unterseite, und nur dann kann
   das Licht von oben rechts auf der einen liegen und die andere im Schatten
   lassen. Genau dieser Unterschied macht aus dem Strich ein Bauteil.       */
function Robot({ rnd, id, k = "", glow = false }) {
  const bx = 116 + rnd() * 10, by = 182;
  const a1 = (-66 - rnd() * 26) * Math.PI / 180;
  const a2 = (52 + rnd() * 40) * Math.PI / 180;
  const L1 = 62 + rnd() * 10, L2 = 46 + rnd() * 10;
  const sh = [bx, by - 26];
  const el = [sh[0] + Math.cos(a1) * L1, sh[1] + Math.sin(a1) * L1];
  const wr = [el[0] + Math.cos(a1 + a2) * L2, el[1] + Math.sin(a1 + a2) * L2];
  const aw = a1 + a2;

  /* Ein sich verjüngendes Armstück als Viereck, dazu die Linien für Ober- und
     Unterkante. Die Normale zur Achse gibt die beiden Seiten. */
  const limb = (p, q, w0, w1) => {
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const nx = -(q[1] - p[1]) / d, ny = (q[0] - p[0]) / d;
    const A = [p[0] + nx * w0, p[1] + ny * w0], B = [q[0] + nx * w1, q[1] + ny * w1];
    const C = [q[0] - nx * w1, q[1] - ny * w1], D = [p[0] - nx * w0, p[1] - ny * w0];
    // Die dem Licht zugewandte Seite ist die mit dem kleineren y
    const upper = A[1] + B[1] < C[1] + D[1] ? [A, B] : [D, C];
    const lower = A[1] + B[1] < C[1] + D[1] ? [D, C] : [A, B];
    return { quad: [A, B, C, D], upper, lower };
  };
  const arm1 = limb(sh, el, 11, 8), arm2 = limb(el, wr, 8.5, 6);

  const bolts = (c, r, n) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.4;
    return <circle key={i} cx={c[0] + Math.cos(a) * r} cy={c[1] + Math.sin(a) * r} r="1.1"
      fill={id.lit} opacity=".55" />;
  });
  const jaw = (s2) => `M${wr[0] + Math.cos(aw) * 7} ${wr[1] + Math.sin(aw) * 7}
    q${Math.cos(aw + s2 * 0.7) * 13} ${Math.sin(aw + s2 * 0.7) * 13}
     ${Math.cos(aw + s2 * 0.25) * 24} ${Math.sin(aw + s2 * 0.25) * 24}`;
  const sparks = Array.from({ length: 8 }, () => ({
    x: wr[0] + (rnd() - 0.3) * 44, y: wr[1] + (rnd() - 0.35) * 40,
    r: 0.7 + rnd() * 1.5, o: 0.3 + rnd() * 0.5,
  }));

  /* Der Leuchtdurchgang: die Kanten im Licht, die Gelenkringe und die Funken. */
  if (glow) {
    return (
      <g>
        <polyline points={poly(arm1.upper)} fill="none" stroke={id.lit} strokeWidth="4" strokeLinecap="round" />
        <polyline points={poly(arm2.upper)} fill="none" stroke={id.lit} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={sh[0]} cy={sh[1]} r="12" fill="none" stroke={id.lit} strokeWidth="3.5" />
        <circle cx={el[0]} cy={el[1]} r="9.5" fill="none" stroke={id.lit} strokeWidth="3.5" />
        <path d={jaw(1)} fill="none" stroke={id.lit} strokeWidth="4" strokeLinecap="round" />
        <path d={jaw(-1)} fill="none" stroke={id.lit} strokeWidth="4" strokeLinecap="round" />
        {sparks.map((s2, i) => <circle key={i} cx={s2.x} cy={s2.y} r={s2.r * 1.6} fill={id.lit} opacity={s2.o} />)}
      </g>
    );
  }

  return (
    <g>
      <defs>
        <linearGradient id={k + "ro"} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor={id.own} />
          <stop offset="45%" stopColor={id.deep} />
          <stop offset="100%" stopColor={id.shade} />
        </linearGradient>
        <linearGradient id={k + "rb"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={id.deep} /><stop offset="100%" stopColor={id.shade} />
        </linearGradient>
      </defs>

      {/* Halle: nur Silhouette, damit sie Tiefe gibt und nichts behauptet */}
      <g opacity=".5">
        {Array.from({ length: 5 }, (_, i) => {
          const x = 16 + i * 40, h = 40 + rnd() * 58;
          return <rect key={i} x={x} y={184 - h} width="26" height={h} fill={id.shade} />;
        })}
        {/* Kranbahn: beginnt erst rechts, damit sie nicht als Strich durch den
            Namen läuft */}
        <rect x="72" y="58" width="148" height="4" fill={id.shade} />
        {Array.from({ length: 3 }, (_, i) => (
          <rect key={"c" + i} x={92 + i * 52} y="58" width="3" height="24" fill={id.shade} />
        ))}
      </g>
      <rect x="0" y="184" width="220" height="18" fill={id.shade} opacity=".7" />

      {/* Sockel und Drehteller */}
      <path d={`M${bx - 30} 192 L${bx - 17} 160 H${bx + 17} L${bx + 30} 192 Z`}
        fill={`url(#${k}rb)`} stroke={id.shade} strokeWidth="1.4" />
      <line x1={bx - 17} y1="160" x2={bx + 17} y2="160" stroke={id.own} strokeWidth="1.2" opacity=".6" />
      <rect x={bx - 20} y="152" width="40" height="11" rx="3" fill={id.deep} stroke={id.shade} strokeWidth="1.2" />
      <line x1={bx - 19} y1="153" x2={bx + 19} y2="153" stroke={id.lit} strokeWidth="1.6" opacity=".85" />

      {/* Kabelführung, hinter dem Arm */}
      <path d={`M${bx - 6} 158 Q${sh[0] - 22} ${(sh[1] + el[1]) / 2} ${el[0] - 10} ${el[1] + 8}`}
        fill="none" stroke={id.shade} strokeWidth="4" strokeLinecap="round" />
      <path d={`M${bx - 6} 158 Q${sh[0] - 22} ${(sh[1] + el[1]) / 2} ${el[0] - 10} ${el[1] + 8}`}
        fill="none" stroke={id.deep} strokeWidth="2" strokeLinecap="round" />

      {/* Armstücke: Fläche, helle Oberkante, dunkle Unterkante */}
      {[arm1, arm2].map((a, i) => (
        <g key={i}>
          <polygon points={poly(a.quad)} fill={`url(#${k}ro)`} stroke={id.shade} strokeWidth="1.6" />
          <polyline points={poly(a.upper)} fill="none" stroke={id.lit} strokeWidth={i ? 1.4 : 1.7} opacity=".9" />
          <polyline points={poly(a.lower)} fill="none" stroke={id.shade} strokeWidth="1.6" opacity=".9" />
        </g>
      ))}

      {/* Gelenke: Ring mit Schraubenkranz — das Zeichen für "Maschine" */}
      {[[sh, 12, 8], [el, 9.5, 6]].map(([c, r, n], i) => (
        <g key={i}>
          <circle cx={c[0]} cy={c[1]} r={r} fill={`url(#${k}rb)`} stroke={id.lit} strokeWidth="1.8" />
          <circle cx={c[0]} cy={c[1]} r={r * 0.42} fill={id.shade} stroke={id.own} strokeWidth="1" />
          {bolts(c, r * 0.72, n)}
        </g>
      ))}

      {/* Greifer */}
      <circle cx={wr[0]} cy={wr[1]} r="6" fill={id.deep} stroke={id.lit} strokeWidth="1.4" />
      <path d={jaw(1)} fill="none" stroke={id.own} strokeWidth="4.5" strokeLinecap="round" />
      <path d={jaw(-1)} fill="none" stroke={id.own} strokeWidth="4.5" strokeLinecap="round" />
      <path d={jaw(1)} fill="none" stroke={id.lit} strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
      <path d={jaw(-1)} fill="none" stroke={id.lit} strokeWidth="1.4" strokeLinecap="round" opacity=".8" />

      {sparks.map((s2, i) => <circle key={i} cx={s2.x} cy={s2.y} r={s2.r} fill={id.lit} opacity={s2.o} />)}
    </g>
  );
}

/* -------------------------------------------------------------- Consumer --
   Eine Flasche mit Schulter, Hals und eingezogener Taille, davor und dahinter
   gefächerte Blätter.

   Drei Dinge machen aus der Silhouette ein Objekt: der Verlauf über den Bauch
   (links Schatten, rechts Licht), ein schmaler Glanzstreifen auf der
   Lichtseite und die helle Kante an der rechten Silhouette. Das Etikett liegt
   als eigene Fläche darüber und bekommt eigene Kanten — sonst sieht es
   aufgemalt aus statt aufgeklebt.

   Die Blätter liegen in zwei Ebenen: hinten klein und dunkel, vorn größer, mit
   Mittelrippe und heller Kante. Sie überlappen einander; ein Fächer aus
   gleich hellen Blättern liest sich als Strahlenkranz, nicht als Pflanze.  */
function Bottle({ rnd, id, k = "", glow = false }) {
  const cx = 158 + rnd() * 10;
  const base = 190, bodyTop = 122, neckTop = 74, capTop = 58;
  const hw = 27 + rnd() * 3, nw = 9;

  const body = `M${cx - hw} ${base} V${bodyTop + 4}
    C${cx - hw} ${bodyTop - 8} ${cx - hw + 5} ${bodyTop - 16} ${cx - nw} ${neckTop + 22}
    V${neckTop} H${cx + nw} V${neckTop + 22}
    C${cx + hw - 5} ${bodyTop - 16} ${cx + hw} ${bodyTop - 8} ${cx + hw} ${bodyTop + 4}
    V${base} Z`;
  const rightEdge = `M${cx + hw} ${base - 6} V${bodyTop + 4}
    C${cx + hw} ${bodyTop - 8} ${cx + hw - 5} ${bodyTop - 16} ${cx + nw} ${neckTop + 22} V${neckTop + 2}`;

  // Blätter: Ansatz unten an der Flasche, Spitze nach außen oben
  const leaf = (i, n, front) => {
    const side = i % 2 ? 1 : -1, r = Math.floor(i / 2);
    /* Vorne stehen die Blätter flach am Fuß und bleiben kurz — sonst decken
       sie Etikett und Bauch ab, also genau das, was die Flasche ausmacht. */
    const ang = front ? side * (62 + rnd() * 12) - 90 : side * (26 + r * 20 + rnd() * 10) - 90;
    const len = front ? 38 + rnd() * 14 : 42 + rnd() * 26;
    const a = front ? [cx + side * 15, 176] : [cx + side * (10 + r * 4), 158 - r * 8];
    const rad = ang * Math.PI / 180;
    const t = [a[0] + Math.cos(rad) * len, a[1] + Math.sin(rad) * len];
    const nx = -(t[1] - a[1]) / len, ny = (t[0] - a[0]) / len, w = len * 0.4;
    const m = [(a[0] + t[0]) / 2, (a[1] + t[1]) / 2];
    return {
      d: `M${a[0]} ${a[1]} Q${m[0] + nx * w} ${m[1] + ny * w} ${t[0]} ${t[1]}
          Q${m[0] - nx * w} ${m[1] - ny * w} ${a[0]} ${a[1]} Z`,
      rib: `M${a[0]} ${a[1]} Q${m[0] + nx * w * 0.12} ${m[1] + ny * w * 0.12} ${t[0]} ${t[1]}`,
      lit: side > 0,
    };
  };
  /* Der Fächer liegt fast vollständig hinter der Flasche. Vorne stehen nur
     zwei Blätter am Fuß — als dunkle Form mit heller Kante, nicht als helle
     Fläche: Ein helles Blatt vor dem Glas sieht aus wie Nebel darauf. */
  const backLeaves = Array.from({ length: 8 }, (_, i) => leaf(i, 8, false));
  const frontLeaves = Array.from({ length: 2 }, (_, i) => leaf(i, 2, true));

  /* Der Leuchtdurchgang: der Glanzstreifen, die Lichtkante und der Deckel. */
  if (glow) {
    return (
      <g>
        <path d={rightEdge} fill="none" stroke={id.lit} strokeWidth="4" strokeLinecap="round" />
        <rect x={cx + hw - 12} y="132" width="5" height="48" rx="2.5" fill={id.lit} />
        <rect x={cx - 12} y={capTop} width="24" height="6" rx="3" fill={id.lit} />
        {frontLeaves.filter((l) => l.lit).map((l, i) => (
          <path key={i} d={l.rib} fill="none" stroke={id.lit} strokeWidth="2.5" />
        ))}
      </g>
    );
  }

  return (
    <g>
      <defs>
        <linearGradient id={k + "bg"} x1="0" y1="0" x2="1" y2="0.12">
          <stop offset="0%" stopColor={id.shade} />
          <stop offset="30%" stopColor={id.shade} />
          <stop offset="62%" stopColor={id.deep} />
          <stop offset="90%" stopColor={id.own} />
          <stop offset="100%" stopColor={id.deep} />
        </linearGradient>
        <linearGradient id={k + "bl"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={id.shade} stopOpacity=".2" />
          <stop offset="100%" stopColor={id.lit} stopOpacity=".26" />
        </linearGradient>
        <radialGradient id={k + "bs"} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={id.shade} stopOpacity=".8" />
          <stop offset="100%" stopColor={id.shade} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Hintere Blätter: gestaffelt, weiter hinten dunkler */}
      {backLeaves.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill={id.deep} opacity={0.5 - (i % 4) * 0.09} />
          <path d={l.rib} fill="none" stroke={id.own} strokeWidth=".8" opacity={0.3 - (i % 4) * 0.05} />
        </g>
      ))}

      {/* Standschatten */}
      <ellipse cx={cx} cy={base + 2} rx="54" ry="12" fill={`url(#${k}bs)`} />

      {/* Flasche */}
      <path d={body} fill={`url(#${k}bg)`} stroke={id.shade} strokeWidth="1.6" />
      {/* Glanzstreifen auf der Lichtseite */}
      <rect x={cx + hw - 11} y="126" width="5" height="56" rx="2.5" fill={id.lit} opacity=".7" />
      <rect x={cx - hw + 6} y="140" width="2" height="30" rx="1" fill={id.lit} opacity=".18" />
      <path d={rightEdge} fill="none" stroke={id.lit} strokeWidth="1.6" opacity=".85" />

      {/* Etikett als eigene Fläche mit eigenen Kanten */}
      <rect x={cx - hw + 1} y="136" width={hw * 2 - 2} height="38" fill={`url(#${k}bl)`} />
      <line x1={cx - hw + 1} y1="136" x2={cx + hw - 1} y2="136" stroke={id.lit} strokeWidth="1" opacity=".5" />
      <line x1={cx - hw + 1} y1="174" x2={cx + hw - 1} y2="174" stroke={id.shade} strokeWidth="1.2" opacity=".8" />
      {Array.from({ length: 3 }, (_, i) => (
        <rect key={i} x={cx - 13} y={145 + i * 8} width={i === 0 ? 26 : 20 - i * 4} height="2.2"
          rx="1.1" fill={id.lit} opacity={i === 0 ? 0.55 : 0.3} />
      ))}

      {/* Verschluss mit Riffelung */}
      <rect x={cx - 12} y={capTop} width="24" height="18" rx="3" fill={id.deep} stroke={id.shade} strokeWidth="1.2" />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={cx - 8 + i * 4} y1={capTop + 3} x2={cx - 8 + i * 4} y2={capTop + 15}
          stroke={id.shade} strokeWidth="1" opacity=".7" />
      ))}
      <rect x={cx - 12} y={capTop} width="24" height="4" rx="2" fill={id.lit} opacity=".8" />

      {/* Vordere Blätter: dunkle Form mit heller Kante — sie stehen vor dem
          Glas und dürfen es nicht aufhellen */}
      {frontLeaves.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill={id.shade} opacity=".88" />
          <path d={l.d} fill="none" stroke={l.lit ? id.lit : id.own} strokeWidth="1.3"
            opacity={l.lit ? 0.75 : 0.45} />
          <path d={l.rib} fill="none" stroke={l.lit ? id.lit : id.own} strokeWidth=".9" opacity=".5" />
        </g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------ Business Services --
   Ein Netz mit Zentrum: vorn ein großer Knoten, dahinter kleinere, die nach
   hinten kleiner und dunkler werden, verbunden durch leicht gebogene Bögen.

   Die Tiefe hängt an der Höhe im Bild — was weiter unten steht, ist näher.
   Das ist die Regel, nach der man eine Landschaft liest, und sie macht aus
   einer Punktwolke eine Fläche mit Vorder- und Hintergrund. Gerade Linien
   zwischen den Knoten ergäben ein Diagramm; die Bögen machen daraus ein Netz.
   Nur der vorderste Knoten trägt eine Figur, die übrigen sind Punkte.      */
function Network({ rnd, id, glow = false }) {
  const N = 9 + Math.floor(rnd() * 3);
  /* Der Knotenpunkt steht fest, er wird nicht ausgewürfelt: Nähme man einfach
     den vordersten der zufälligen Knoten, landete er je nach Startwert in der
     unteren rechten Ecke — dort, wo der Anspruch des Sektors steht, und
     angeschnitten obendrein. Die Streuung gehört den übrigen Knoten. */
  const hub = { x: 154 + rnd() * 16, y: 122 + rnd() * 16, z: 1 };
  const nodes = Array.from({ length: N - 1 }, () => {
    const x = 96 + rnd() * 128, y = 34 + rnd() * 132;
    return { x, y, z: Math.max(0, Math.min(0.88, (y - 34) / 150 + (rnd() - 0.5) * 0.2)) };
  });
  nodes.push(hub);
  nodes.sort((a, b) => a.z - b.z);
  const col = (u) => (u < 0.3 ? id.shade : u < 0.56 ? id.deep : u < 0.82 ? id.own : id.lit);

  // Bögen nur zwischen benachbarten Knoten, sonst wird es ein Knäuel
  const arcs = [];
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > 74) return;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d, bow = d * 0.17;
    arcs.push({
      d: `M${a.x} ${a.y} Q${mx + nx * bow} ${my + ny * bow} ${b.x} ${b.y}`,
      u: Math.min(a.z, b.z), near: Math.max(a.z, b.z) > 0.9,
    });
  }));
  const pulses = arcs.filter((a) => a.near).slice(0, 3);

  const figure = (n, r) => (
    <g>
      <circle cx={n.x} cy={n.y - r * 0.3} r={r * 0.3} fill={id.lit} />
      <path d={`M${n.x - r * 0.46} ${n.y + r * 0.52} a${r * 0.46} ${r * 0.46} 0 0 1 ${r * 0.92} 0`}
        fill="none" stroke={id.lit} strokeWidth={r * 0.19} strokeLinecap="round" />
    </g>
  );

  /* Der Leuchtdurchgang: der Ring des vordersten Knotens, die Figur darin und
     die Bögen, die von ihm ausgehen. */
  if (glow) {
    return (
      <g>
        <circle cx={hub.x} cy={hub.y} r="15" fill="none" stroke={id.lit} strokeWidth="4" />
        {figure(hub, 15)}
        {pulses.map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={id.lit} strokeWidth="3" strokeLinecap="round" />
        ))}
        {nodes.filter((n) => n.z > 0.72 && n !== hub).map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={5 + n.z * 4} fill={id.lit} opacity=".7" />
        ))}
      </g>
    );
  }

  return (
    <g>
      {/* Bögen: hinten fast im Grund, vorn kräftig */}
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={col(a.u)} strokeWidth={0.7 + a.u * 1.3}
          opacity={0.2 + a.u * 0.6} strokeLinecap="round" />
      ))}
      {nodes.map((n, i) => {
        const isHub = n === hub, r = isHub ? 15 : 3.4 + n.z * 6;
        return (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={r} fill={id.shade}
              stroke={col(Math.min(1, n.z + 0.12))} strokeWidth={isHub ? 2.2 : 0.9 + n.z}
              opacity={0.45 + n.z * 0.55} />
            {isHub ? figure(n, r)
              : n.z > 0.62
                ? figure(n, r)
                : <circle cx={n.x} cy={n.y} r={r * 0.34} fill={col(n.z)} opacity={0.4 + n.z * 0.5} />}
          </g>
        );
      })}
      {/* Der vorderste Knoten bekommt einen zweiten Ring — er ist das Zentrum */}
      <circle cx={hub.x} cy={hub.y} r="21" fill="none" stroke={id.own} strokeWidth="1" opacity=".45" />
      <circle cx={hub.x} cy={hub.y} r="27" fill="none" stroke={id.own} strokeWidth=".8" opacity=".2" />
      {pulses.map((a, i) => (
        <path key={"p" + i} d={a.d} fill="none" stroke={id.lit} strokeWidth="1.4" opacity=".8"
          strokeLinecap="round" />
      ))}
    </g>
  );
}

const SCENES = { racks: Racks, helix: Helix, robot: Robot, bottle: Bottle, network: Network };

/* Hintergrundmuster: vier Raster, eines je Unternehmen. Sie liegen sehr weit
   hinten und sollen nur verhindern, dass die Fläche neben der Szene leer wirkt. */
function Pattern({ id }) {
  const p = id.pattern;
  if (p === 0) return (
    <g opacity=".16">{Array.from({ length: 15 }, (_, i) =>
      <line key={i} x1={-40 + i * 30} y1="0" x2={10 + i * 30} y2="200" stroke={id.own} strokeWidth="1" />)}</g>
  );
  if (p === 1) return (
    <g opacity=".2">{Array.from({ length: 8 }, (_, r) => Array.from({ length: 13 }, (_, c) =>
      <circle key={r + "-" + c} cx={8 + c * 24} cy={10 + r * 26} r="1.5" fill={id.own} />))}</g>
  );
  if (p === 2) return (
    <g opacity=".14">{Array.from({ length: 7 }, (_, i) =>
      <circle key={i} cx="230" cy="52" r={26 + i * 28} fill="none" stroke={id.own} strokeWidth="1" />)}</g>
  );
  return (
    <g opacity=".13">{Array.from({ length: 9 }, (_, i) =>
      <line key={i} x1="0" y1={12 + i * 23} x2="300" y2={12 + i * 23} stroke={id.own} strokeWidth="1" />)}</g>
  );
}

/* Das Bild einer Karte: Fläche in der Firmenfarbe, Muster, Szene, Leuchten und
   zwei Verläufe, die zum Kartengrund überblenden — links, damit der Text
   darüber lesbar bleibt, unten, damit die Karte nicht abreißt. Die Verläufe
   greifen auf var(--card) zu und folgen damit dem Theme.                     */
export function HeroArt({ id, tier = "common" }) {
  const Scene = SCENES[id.scene] || Network;
  const u = id.uid;
  /* Lässt sich das Motiv nicht laden — Datei fehlt, Name vertippt, in
     PHOTO_VARIANTS eine Nummer zu hoch —, fällt die Karte auf ihre gezeichnete
     Szene zurück, statt eine leere getönte Fläche zu zeigen. Damit darf ein
     Sektor scharfgeschaltet werden, bevor seine Datei im Ordner liegt: Sobald
     sie da ist, erscheint sie, ohne dass am Code etwas zu ändern wäre. */
  const [failed, setFailed] = React.useState(false);
  const photo = failed ? null : photoOf(id);
  /* Zeichenfläche 300 x 200, an der rechten unteren Ecke verankert: Der
     Kartenkopf ist breiter als hoch, `slice` beschneidet also oben. Verankert
     man stattdessen mittig, verschwindet der Boden jeder Szene — die
     Serverreihe stünde ohne Stellfläche da. Die gezeichnete Szene sitzt um 80
     nach rechts versetzt, damit links Platz für Name und Anspruch bleibt; ein
     Foto füllt die Fläche und wird von der Abdeckung nach links ausgeblendet. */
  return (
    <div className={"bheroart tier-" + tier} aria-hidden="true">
      <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMax slice">
        <defs>
          {/* Das Feld ist dunkel und satt, nicht hell: Erst darauf leuchtet der
              helle Strich der Szene. Mit einem hellen Verlauf verschwamm alles
              zu derselben Mitteltönung. */}
          <linearGradient id={u + "sky"} x1="0.1" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={id.deep} stopOpacity=".72" />
            <stop offset="52%" stopColor={id.own} stopOpacity=".20" />
            <stop offset="100%" stopColor={id.deep} stopOpacity=".62" />
          </linearGradient>
          <radialGradient id={u + "glow"} cx="66%" cy="24%" r="56%">
            <stop offset="0%" stopColor={id.lit} stopOpacity=".30" />
            <stop offset="100%" stopColor={id.lit} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={u + "sh"} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--card)" stopOpacity=".96" />
            <stop offset="30%" stopColor="var(--card)" stopOpacity=".82" />
            <stop offset="62%" stopColor="var(--card)" stopOpacity=".34" />
            <stop offset="100%" stopColor="var(--card)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={u + "sv"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--card)" stopOpacity="0" />
            <stop offset="72%" stopColor="var(--card)" stopOpacity=".35" />
            <stop offset="100%" stopColor="var(--card)" stopOpacity=".96" />
          </linearGradient>
          <filter id={u + "bl"} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {/* Farbkorrektur für Fotos, Stellschrauben oben bei PHOTO_SATURATION */}
          <filter id={u + "gr"} colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values={String(PHOTO_SATURATION)} />
          </filter>
        </defs>

        {photo ? (
          <>
            <image href={photo} x="0" y="0" width="300" height="200"
              preserveAspectRatio="xMaxYMid slice" filter={`url(#${u}gr)`}
              onError={() => setFailed(true)} />
            {/* Die Farbe der Firma legt sich über das Motiv — im Modus `color`,
                also nur Farbton und Sättigung, ohne die Helligkeit anzutasten.
                So bleibt ein nächtliches Motiv nachts und bekommt trotzdem den
                Ton seines Sektors und seines Unternehmens. */}
            <rect width="300" height="200" fill={id.own} opacity={PHOTO_TINT}
              style={{ mixBlendMode: "color" }} />
            {/* Die Tiefen zurückholen, die jede Auflage anhebt */}
            <rect width="300" height="200" fill={id.shade} opacity=".2"
              style={{ mixBlendMode: "multiply" }} />
          </>
        ) : (
          <>
            <rect width="300" height="200" fill={`url(#${u}sky)`} />
            <Pattern id={id} />
            <rect width="300" height="200" fill={`url(#${u}glow)`} />
            {/* Zwei Durchgänge derselben Szene: erst nur das, was leuchtet,
                unscharf und kräftig — dann die Szene selbst, scharf. So bekommt
                das Licht einen Hof, ohne dass die ganze Zeichnung vernebelt.

                Beide Durchgänge bekommen dieselbe Zufallsfolge. Vorher liefen
                sie mit verschiedenen Startwerten: Der Hof gehörte zu einem
                anderen Bild als die Zeichnung darüber. */}
            <g transform="translate(80 0)">
              <g filter={`url(#${u}bl)`} opacity=".85">
                <Scene rnd={lcg(id.seed)} id={id} k={u + "g"} glow />
              </g>
              <Scene rnd={lcg(id.seed)} id={id} k={u + "m"} />
            </g>
          </>
        )}

        <rect width="300" height="200" fill={`url(#${u}sh)`} />
        <rect width="300" height="200" fill={`url(#${u}sv)`} />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------- Bausteine -- */

/* Sektorplakette: Wappen und Name des Sektors in der Sektorfarbe — nicht in der
   Firmenfarbe. Sie sagt den Typ, nicht die Firma.                            */
export function SectorPill({ sector }) {
  return (
    <span className="bpill">
      <SectorEmblem sector={sector} />{SECLABEL[sector] || sector}
    </span>
  );
}

/* Zustands- oder Artplakette rechts oben. */
export function StatePill({ tone = "dim", children }) {
  return <span className={"bstate " + tone}>{children}</span>;
}

/* Fähigkeiten: Flaggen sind das, was auf einer Sammelkarte die Fähigkeit ist —
   eine Eigenschaft, die den Wert der Karte verschiebt.                       */
export function Ability({ kind = "risk", children }) {
  return (
    <span className={"babil " + kind}>
      <i>{kind === "angle" ? "◆" : kind === "hidden" ? "?" : kind === "good" ? "✦" : "⚑"}</i>
      <span>{children}</span>
    </span>
  );
}

/* Kopfzeile der Karte: Bild, Signet, Name, Anspruch, Fähigkeiten, Sektoranspruch. */
export function CardHero({ id, sector, name, claim, tier = "common", state = null,
                          meta = null, abilities = null }) {
  /* Die beiden Randtöne der Firmenfarbe stehen als Variablen bereit, damit der
     Anspruch des Sektors im hellen Theme den dunklen und im dunklen den hellen
     nehmen kann. Fest verdrahtet auf den hellen Ton stand er auf weißem Grund
     fast unsichtbar. */
  return (
    <div className={"bhero tier-" + tier} style={{ "--lit": id.lit, "--deep": id.deep }}>
      <HeroArt id={id} tier={tier} />
      <div className="bheroin">
        <div className="bherotop">
          <SectorPill sector={sector} />
          {state}
        </div>
        <div className="bheroname">
          <Sigil id={id} />
          <div className="bnamewrap">
            <h3 className="bname">{name}</h3>
            {meta && <div className="bmeta">{meta}</div>}
          </div>
        </div>
        {claim && <p className="bclaim">{claim}</p>}
        {abilities}
        <div className="bsecclaim">
          {id.claim.map((l) => <span key={l}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}

/* Kopfzahlen: drei Werte nebeneinander, durch Linien getrennt — die Zeile, an
   der eine Karte im Vorbeiscrollen erkannt wird.                             */
export function Headline({ items }) {
  return (
    <div className="bheadline">
      {items.map((it) => (
        <div key={it.k}>
          <span className="l">{it.k}{it.info}</span>
          <span className={"v mono " + (it.tone || "")}>{it.v}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- Stat-Icons -- */
const ICONS = {
  growth: <path d="M3 17 9 11l4 4 8-8M15 7h6v6" />,
  margin: <path d="M20.8 6.6a5 5 0 0 0-8.8-1.6A5 5 0 0 0 3.2 6.6C2 9.5 4.3 13 12 19c7.7-6 10-9.5 8.8-12.4z" />,
  cash:   <path d="M12 3s6 6.4 6 10.2A6 6 0 0 1 6 13.2C6 9.4 12 3 12 3z" />,
  grade:  <path d="M12 2.6 20 7v10l-8 4.4L4 17V7z" />,
  lever:  (<><path d="M3.5 17a9 9 0 1 1 17 0" /><path d="M12 17 16 9" /><circle cx="12" cy="17" r="1.4" /></>),
  clock:  (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.4l3.4 2" /></>),
};
export function StatIcon({ k }) {
  return (
    <svg viewBox="0 0 24 24" className="bsi" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[k] || ICONS.grade}</svg>
  );
}

/* Vier Kennzahlen mit Zeichen: die Zeile, die im Entwurf unter den Kopfzahlen
   steht. Das Zeichen ist die Lesehilfe, die Zahl bleibt die Aussage.         */
export function StatRow({ items }) {
  return (
    <div className="bicons">
      {items.map((it) => (
        <div key={it.k}>
          <span className="ic" style={it.color ? { color: it.color } : undefined}><StatIcon k={it.icon} /></span>
          <span className="l">{it.k}{it.info}</span>
          <span className={"v mono " + (it.tone || "")}>{it.v}</span>
          {it.sub != null && <span className={"s " + (it.subTone || "")}>{it.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/* Abschnitt mit Überschrift — "Investment Thesis" und alles, was ihr folgt. */
export function Section({ title, right = null, children, flush = false }) {
  return (
    <section className={"bsec" + (flush ? " flush" : "")}>
      {title && (
        <div className="bsech">
          <h4>{title}</h4>
          {right && <span className="r">{right}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/* Aufklappbarer Bereich für alles, was nicht auf den ersten Blick gebraucht
   wird. Nichts verschwindet — es liegt eine Geste entfernt.                  */
export function More({ label = "Mehr Details", children, open = false }) {
  return (
    <details className="bmore" open={open}>
      <summary><span className="mi">↓</span>{label}<span className="mc">›</span></summary>
      <div className="bmorebody">{children}</div>
    </details>
  );
}

/* Zeile in einem Kartenfuß: Bezeichnung links, Wert rechts. */
export function Row({ k, v, tone = "", info = null }) {
  return (
    <div className="bfrow">
      <span className="bflab">{k}{info}</span>
      <span className={"bfval mono " + tone}>{v}</span>
    </div>
  );
}

/* Messbalken für eine Größe mit natürlicher Ober- und Untergrenze. `mark`
   setzt eine Referenz (Benchmark, Covenant) auf dieselbe Skala — die Zahl
   allein sagt nicht, ob 12 % Marge viel ist.                                */
export function Meter({ label, value, v, max = 1, tone = "", mark = null, info = null, sub = null }) {
  return (
    <div className="bmrow">
      <div className="bmhead">
        <span className="bmlab">{label}{info}</span>
        <span className={"bmval mono " + tone}>{value}</span>
      </div>
      <div className="bmeter">
        <i className={tone} style={{ width: `${cl(v / (max || 1)) * 100}%` }} />
        {mark != null && <b style={{ left: `${cl(mark / (max || 1)) * 100}%` }} />}
      </div>
      {sub && <div className="bmsub">{sub}</div>}
    </div>
  );
}

/* Kennzahlkachel für den Detailbereich. */
export function StatTile({ label, value, tone = "", sub = null, info = null, wide = false }) {
  return (
    <div className={"btile" + (wide ? " wide" : "")}>
      <div className="btilelab">{label}{info}</div>
      <div className={"btileval mono " + tone}>{value}</div>
      {sub != null && <div className="btilesub">{sub}</div>}
    </div>
  );
}

/* Note und Punktzahl wie auf einer Spielerkarte. Der Buchstabe ist eine
   Lesehilfe für den Rohwert, keine neue Kennzahl — die Schwellen stehen hier,
   damit sie an einer Stelle liegen.                                          */
export function gradeOf(score) {
  if (score >= 85) return { g: "S", tone: "gold" };
  if (score >= 70) return { g: "A", tone: "teal" };
  if (score >= 55) return { g: "B", tone: "teal" };
  if (score >= 40) return { g: "C", tone: "neutral" };
  return { g: "D", tone: "ox" };
}
export function GradeChip({ score }) {
  const v = score == null || !Number.isFinite(score) ? null : Math.round(score);
  const { g, tone } = v == null ? { g: "?", tone: "neutral" } : gradeOf(v);
  return <span className={"bchip " + tone}>{g}</span>;
}

/* ------------------------------------------------------------ Netzdiagramm --
   Fünf Achsen, eine Fläche: das Profil eines Unternehmens auf einen Blick. Der
   Sinn ist der Vergleich zweier Karten — ein schmales Dreieck und ein volles
   Fünfeck unterscheiden sich, bevor man eine Zahl gelesen hat. Die Rohwerte
   stehen unverändert daneben; das Diagramm ersetzt keine Zahl.               */
export function StatRadar({ axes, color, redacted = false, note = null }) {
  const R = 42, CX = 70, CY = 58;
  const n = axes.length;
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  };
  const ring = (f) => axes.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
  const shape = axes.map((a, i) => pt(i, R * cl(a.v)).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <div className="bradar">
      <svg viewBox="0 0 140 122" role="img"
        aria-label={redacted ? "Profil ohne Datenraum verdeckt"
          : "Profil: " + axes.map((a) => `${a.k} ${Math.round(cl(a.v) * 100)} von 100`).join(", ")}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="var(--rule)" strokeWidth=".7" />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, R);
          return <line key={a.k} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--rule)" strokeWidth=".7" />;
        })}
        {!redacted && <>
          <polygon points={shape} fill={color} fillOpacity=".26" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
          {axes.map((a, i) => {
            const [x, y] = pt(i, R * cl(a.v));
            return <circle key={a.k} cx={x} cy={y} r="2" fill={color} />;
          })}
        </>}
        {axes.map((a, i) => {
          const [x, y] = pt(i, R + 14);
          return (
            <text key={a.k} x={x} y={y + 2.5} fontSize="7" textAnchor="middle"
              fontFamily="Inter" style={{ fill: "var(--ink2)" }}>{a.k}</text>
          );
        })}
        {redacted && <text x={CX} y={CY + 3} fontSize="8.5" textAnchor="middle" fontFamily="Inter"
          style={{ fill: "var(--ink2)" }} letterSpacing=".1em">VERDECKT</text>}
      </svg>
      {note && <div className="bradarnote">{note}</div>}
    </div>
  );
}

/* Normierung der Radarachsen. Steht hier und nicht bei den Aufrufern, damit
   Dealflow und Portfolio dieselbe Skala benutzen — sonst wäre ein Zielobjekt
   nicht mit der eigenen Beteiligung vergleichbar.                            */
export const AX = {
  margin: (v) => cl((v ?? 0) / 28),
  growth: (v) => cl(((v ?? 0) + 3) / 16),
  quality: (v) => cl((v ?? 0) / 100),
  conv: (v) => cl((v ?? 0) / 95),
  size: (v) => cl((v ?? 0) / 32),
  headroom: (v) => cl((v ?? 0) / 2.2),
};

/* ----------------------------------------------------------------- CSS -- */
export const BATTLE_CSS = `
/* ============================================================
   BATTLE CARDS — Dealflow und Portfolio
   Zwei Farbvariablen tragen die Karte: --sec ist der Sektor (Typ),
   --own die Firma (Identität). Alles Grafische greift auf --own zu,
   alles Typisierende auf --sec.
   ============================================================ */

.pel .bcard{position:relative;margin:16px;border-radius:18px;overflow:hidden;background:var(--card);
  border:1px solid color-mix(in srgb, var(--own) 32%, var(--rule));
  box-shadow:0 18px 40px -26px color-mix(in srgb, var(--own) 85%, transparent),0 1px 2px var(--glow);
  animation:rise .32s cubic-bezier(.22,.9,.34,1) both;}
.pel .bcard:nth-of-type(2){animation-delay:.03s;}
.pel .bcard:nth-of-type(3){animation-delay:.06s;}
@media (prefers-reduced-motion:reduce){.pel .bcard{animation:none;}}
.pel .bcard .bedge{position:absolute;top:0;left:0;right:0;height:3px;z-index:4;
  background:linear-gradient(90deg,var(--own) 0%,color-mix(in srgb, var(--own) 30%, transparent) 62%,transparent);}

/* Seltenheitsstufen: Trophy Asset in Gold, proprietärer Zugang abgesetzt. */
.pel .bcard.tier-myth{border-color:var(--gold);
  box-shadow:0 0 40px -12px var(--gold),0 18px 40px -26px rgba(0,0,0,.55);}
.pel .bcard.tier-myth .bedge{background:linear-gradient(90deg,var(--gold),transparent);height:4px;}
.pel .bcard.tier-rare{border-color:color-mix(in srgb, var(--gold) 42%, var(--own));}

/* ---------- Kopfbereich mit Bild ---------- */
.pel .bhero{position:relative;overflow:hidden;padding:16px 15px 15px;min-height:238px;
  display:flex;flex-direction:column;
  background:linear-gradient(155deg,color-mix(in srgb, var(--own) 16%, var(--card)) 0%,var(--card) 68%);}
.pel .bheroart{position:absolute;inset:0;z-index:0;}
.pel .bheroart svg{position:absolute;inset:0;width:100%;height:100%;display:block;}
/* Die Motive sind für dunklen Grund aufgenommen. Auf hellem Grund werden sie
   zurückgenommen, sonst steht ein schwarzer Block in einer weißen Karte. */
.pel:not(.dark) .bheroart image{opacity:.62;}
/* Der Foliengang über Trophy Assets: einmal quer, dann Pause. */
.pel .bheroart.tier-myth:after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.20) 50%,transparent 65%);
  transform:translateX(-100%);animation:foil 4.8s ease-in-out 1s infinite;}
@keyframes foil{0%{transform:translateX(-100%);}45%,100%{transform:translateX(100%);}}
@media (prefers-reduced-motion:reduce){.pel .bheroart.tier-myth:after{animation:none;opacity:0;}}
.pel .bheroin{position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;flex:1;}

.pel .bherotop{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.pel .bpill{display:inline-flex;align-items:center;gap:6px;font-size:9.5px;letter-spacing:.13em;
  text-transform:uppercase;font-weight:700;border-radius:99px;padding:5px 11px 5px 8px;
  color:var(--sec);background:color-mix(in srgb, var(--sec) 15%, var(--card));
  border:1px solid color-mix(in srgb, var(--sec) 48%, transparent);white-space:nowrap;}
.pel .bpill .bemb{width:13px;height:13px;flex:none;}
.pel .bstate{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:9.5px;
  letter-spacing:.1em;text-transform:uppercase;font-weight:700;border-radius:99px;padding:5px 10px;
  white-space:nowrap;color:var(--teal);background:color-mix(in srgb, var(--teal) 16%, var(--card));
  border:1px solid color-mix(in srgb, var(--teal) 45%, transparent);}
.pel .bstate.att{color:var(--ox);background:color-mix(in srgb, var(--ox) 16%, var(--card));
  border-color:color-mix(in srgb, var(--ox) 48%, transparent);}
.pel .bstate.gold{color:var(--gold);background:color-mix(in srgb, var(--gold) 16%, var(--card));
  border-color:color-mix(in srgb, var(--gold) 48%, transparent);}
.pel .bstate.dim{color:var(--ink2);background:color-mix(in srgb, var(--ink) 8%, var(--card));
  border-color:var(--rule);}

/* Signet und Name stehen nebeneinander: das Zeichen zuerst, wie auf einem Wappen. */
.pel .bheroname{display:flex;align-items:flex-start;gap:11px;margin-top:2px;max-width:80%;}
.pel .bsigil{flex:none;display:block;filter:drop-shadow(0 2px 10px color-mix(in srgb, var(--own) 55%, transparent));}
.pel .bsigil svg{width:100%;height:100%;display:block;}
.pel .bnamewrap{min-width:0;flex:1;}
/* Firmennamen sind lang und zusammengesetzt. hyphens:auto trennt nach den
   deutschen Regeln (die Seite ist als lang="de" ausgezeichnet), overflow-wrap
   ist der Notnagel für das, was das Wörterbuch nicht kennt. */
.pel .bname{margin:0;font-size:22px;font-weight:700;letter-spacing:-.035em;line-height:1.12;
  hyphens:auto;overflow-wrap:break-word;}
.pel .bmeta{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);
  font-weight:600;margin-top:5px;display:flex;gap:8px;flex-wrap:wrap;}
.pel .bclaim{margin:0;font-size:12.5px;line-height:1.5;color:var(--ink2);max-width:62%;}

/* Der Anspruch des Sektors: zwei Zeilen, gesperrt, unten rechts im Bild. */
.pel .bsecclaim{position:absolute;right:0;bottom:0;display:flex;flex-direction:column;
  align-items:flex-end;gap:2px;font-size:11.5px;font-weight:700;letter-spacing:.16em;
  line-height:1.25;text-align:right;pointer-events:none;color:var(--deep);
  text-shadow:0 1px 10px var(--card),0 0 3px var(--card);}
.pel.dark .bsecclaim{color:var(--lit);text-shadow:0 1px 10px var(--card);}
@media (max-width:379px){.pel .bsecclaim{font-size:10px;letter-spacing:.12em;}
  .pel .bclaim{max-width:100%;}}

/* Fähigkeiten */
/* Bis 68 % der Breite: rechts unten steht der Anspruch des Sektors, und die
   Fähigkeiten dürfen nicht darunterlaufen. */
.pel .babils{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:4px;max-width:68%;}
.pel .babil{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;
  border-radius:99px;padding:5px 11px;line-height:1.25;
  color:var(--ox);background:color-mix(in srgb, var(--ox) 13%, var(--card));
  border:1px solid color-mix(in srgb, var(--ox) 38%, transparent);}
.pel .babil.angle{color:var(--gold);background:color-mix(in srgb, var(--gold) 14%, var(--card));
  border-color:color-mix(in srgb, var(--gold) 45%, transparent);}
.pel .babil.hidden{color:var(--ink2);background:color-mix(in srgb, var(--ink) 6%, var(--card));
  border-style:dashed;border-color:var(--rule);}
.pel .babil.good{color:var(--teal);background:color-mix(in srgb, var(--teal) 14%, var(--card));
  border-color:color-mix(in srgb, var(--teal) 42%, transparent);}
.pel .babil i{font-style:normal;font-size:10px;line-height:1;opacity:.9;}

/* ---------- Kopfzahlen ---------- */
.pel .bheadline{display:flex;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);
  background:color-mix(in srgb, var(--own) 6%, transparent);}
.pel .bheadline > div{flex:1;min-width:0;padding:13px 8px 14px;text-align:center;}
.pel .bheadline > div + div{border-left:1px solid var(--rule);}
/* Die Bezeichnung darf umbrechen — "Enterprise Value" passt in einem Drittel
   der Breite nicht in eine Zeile und wurde sonst abgeschnitten. Die feste
   Mindesthöhe hält die drei Werte darunter trotzdem auf einer Linie. */
.pel .bheadline .l{display:block;font-size:9px;letter-spacing:.11em;text-transform:uppercase;
  color:var(--ink2);font-weight:650;line-height:1.35;min-height:24px;}
.pel .bheadline .v{display:block;font-size:15px;font-weight:650;letter-spacing:-.03em;margin-top:6px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bheadline .v.teal{color:var(--teal);} .pel .bheadline .v.ox{color:var(--ox);}
.pel .bheadline .v.gold{color:var(--gold);} .pel .bheadline .v.dim{color:var(--ink2);}
/* Unter 360 px lassen drei Spalten einem Geldbetrag rund 74 px — er wurde
   dort abgeschnitten. Die dritte Zahl rückt deshalb in eine zweite Zeile. */
@media (max-width:379px){.pel .bheadline .v{font-size:13.5px;}}
@media (max-width:359px){
  .pel .bheadline{flex-wrap:wrap;}
  .pel .bheadline > div{flex:1 1 45%;}
  .pel .bheadline > div:nth-child(3){flex-basis:100%;border-left:0;border-top:1px solid var(--rule);}
}

/* ---------- Vier Kennzahlen mit Zeichen ---------- */
.pel .bicons{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:14px 12px 4px;}
.pel .bicons > div{min-width:0;text-align:center;}
.pel .bicons .ic{display:flex;align-items:center;justify-content:center;width:38px;height:38px;
  margin:0 auto 7px;border-radius:12px;color:var(--own);
  background:color-mix(in srgb, var(--own) 13%, transparent);
  border:1px solid color-mix(in srgb, var(--own) 30%, transparent);}
.pel .bsi{width:19px;height:19px;}
.pel .bicons .l{display:block;font-size:9px;letter-spacing:.05em;color:var(--ink2);font-weight:600;
  line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bicons .v{display:block;font-size:13.5px;font-weight:650;letter-spacing:-.02em;margin-top:3px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bicons .v.teal{color:var(--teal);} .pel .bicons .v.ox{color:var(--ox);}
.pel .bicons .v.gold{color:var(--gold);} .pel .bicons .v.dim{color:var(--ink2);}
.pel .bicons .s{display:block;font-size:8.5px;color:var(--ink2);margin-top:2px;line-height:1.3;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bicons .s.teal{color:var(--teal);} .pel .bicons .s.ox{color:var(--ox);}
/* "Cash Conv." samt Erklär-Punkt braucht rund 73 px; eine Viertelspalte hat
   auf 360 px nur 79 px abzüglich Abstand. Ab hier stehen zwei nebeneinander. */
@media (max-width:379px){
  .pel .bicons{grid-template-columns:repeat(2,1fr);gap:14px 6px;}
}

/* Notenzeichen neben der Punktzahl */
.pel .bchip{display:inline-block;min-width:16px;padding:1px 5px;border-radius:5px;margin-left:5px;
  font-size:10px;font-weight:800;letter-spacing:0;vertical-align:1px;color:var(--card);
  background:var(--ink2);}
.pel .bchip.gold{background:var(--gold);color:#1A1508;}
.pel .bchip.teal{background:var(--teal);color:#06201B;}
.pel .bchip.ox{background:var(--ox);color:#2A0C09;}

/* ---------- Hinweisfeld mit Handlung ----------
   Für den Fall, dass an der Karte etwas fehlt und genau eine Schaltfläche das
   behebt. Es steht dort, wo die Lücke sichtbar wird, trägt die Warnfarbe im
   Rahmen statt als nackten Text darunter und hält die Schaltfläche in
   derselben Zeile — ein Knopf über die volle Breite hätte mehr Gewicht
   bekommen als die Kennzahlen, um die es geht. */
.pel .bcallout{display:flex;align-items:flex-start;gap:10px;margin:14px 15px 0;
  padding:10px 11px;border-radius:12px;
  border:1px solid color-mix(in srgb, var(--ox) 40%, transparent);
  background:color-mix(in srgb, var(--ox) 9%, transparent);}
.pel .bcicon{flex:none;width:32px;height:32px;border-radius:9px;display:flex;
  align-items:center;justify-content:center;font-size:16px;line-height:1;
  background:color-mix(in srgb, var(--ox) 16%, transparent);
  border:1px solid color-mix(in srgb, var(--ox) 32%, transparent);}
.pel .bcbody{flex:1;min-width:0;}
/* Überschrift und Schaltfläche teilen sich die erste Zeile, der erklärende
   Satz bekommt darunter die volle Breite. Stünde die Schaltfläche neben dem
   ganzen Textblock, blieben der Erklärung rund 150 px — sie brach dort auf
   vier Zeilen um und machte das Feld höher als die Kennzahlen darüber. */
.pel .bchead{display:flex;align-items:center;justify-content:space-between;gap:10px;
  min-height:32px;}
.pel .bchead b{font-size:12.5px;font-weight:650;color:var(--ox);letter-spacing:-.01em;}
.pel .bcbody p{margin:4px 0 2px;font-size:11.5px;line-height:1.45;color:var(--ink2);}
.pel .bcallout button{flex:none;padding:8px 11px;font-size:11.5px;font-weight:600;
  border-color:color-mix(in srgb, var(--ox) 55%, transparent);color:var(--ox);
  background:var(--card);white-space:nowrap;}
.pel .bcallout button:hover:not(:disabled){background:var(--ox);color:var(--card);
  border-color:var(--ox);}
/* Unter 340 px passen Überschrift und Schaltfläche nicht mehr nebeneinander. */
@media (max-width:339px){
  .pel .bchead{flex-wrap:wrap;}
  .pel .bcallout button{width:100%;}
}

/* ---------- Abschnitte ---------- */
.pel .bsec{padding:16px 15px 0;}
.pel .bsec.flush{padding-left:0;padding-right:0;}
.pel .bsec.flush > .bsech{padding:0 15px;}
.pel .bsech{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:9px;}
.pel .bsech h4{margin:0;font-size:13.5px;font-weight:650;letter-spacing:-.015em;}
.pel .bsech .r{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);
  font-weight:650;white-space:nowrap;}
.pel .bthesis{margin:0;font-size:12.5px;line-height:1.62;color:var(--ink2);}

/* Aufklappbarer Detailbereich */
.pel .bmore{margin:16px 15px 0;border:1px solid var(--rule);border-radius:12px;overflow:hidden;
  background:color-mix(in srgb, var(--ink) 3%, transparent);}
.pel .bmore > summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;
  padding:13px 14px;font-size:13px;font-weight:600;-webkit-tap-highlight-color:transparent;}
.pel .bmore > summary::-webkit-details-marker{display:none;}
.pel .bmore > summary .mi{display:inline-flex;align-items:center;justify-content:center;
  width:24px;height:24px;border-radius:50%;flex:none;font-size:12px;
  color:var(--own);background:color-mix(in srgb, var(--own) 14%, transparent);
  border:1px solid color-mix(in srgb, var(--own) 32%, transparent);transition:transform .2s ease;}
.pel .bmore > summary .mc{margin-left:auto;color:var(--ink2);font-size:16px;line-height:1;
  transition:transform .2s ease;}
.pel .bmore[open] > summary .mc{transform:rotate(90deg);}
.pel .bmore[open] > summary .mi{transform:rotate(180deg);}
.pel .bmore > summary:hover{background:color-mix(in srgb, var(--own) 7%, transparent);}
.pel .bmorebody{border-top:1px solid var(--rule);padding-bottom:14px;}
@media (prefers-reduced-motion:reduce){.pel .bmore > summary .mi,.pel .bmore > summary .mc{transition:none;}}

/* ---------- Kennzahlenkacheln (Detailbereich) ---------- */
.pel .bstats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:14px 15px 0;}
.pel .bstats.two{grid-template-columns:1fr 1fr;}
.pel .btile{border:1px solid var(--rule);border-radius:10px;padding:9px 9px 10px;min-width:0;
  background:var(--card);display:flex;flex-direction:column;}
.pel .btile.wide{grid-column:span 3;}
.pel .bstats.two .btile.wide{grid-column:span 2;}
/* Feste Mindesthöhe für Bezeichnung und Zusatz: ohne sie stehen die Werte
   zweier Kacheln auf verschiedenen Linien und die Zeile liest sich nicht mehr
   als Zeile. Der Erklär-Punkt läuft im Text mit, statt eine eigene Zeile zu
   erzwingen — deshalb kein Flex-Container. */
.pel .btilelab{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);
  font-weight:600;line-height:1.35;min-height:23px;}
.pel .btileval{font-size:14.5px;font-weight:650;line-height:1.3;margin-top:5px;white-space:nowrap;
  letter-spacing:-.03em;overflow:hidden;text-overflow:ellipsis;}
.pel .btileval.teal{color:var(--teal);} .pel .btileval.ox{color:var(--ox);}
.pel .btileval.gold{color:var(--gold);} .pel .btileval.dim{color:var(--ink2);}
.pel .btilesub{font-size:9.5px;line-height:1.35;color:var(--ink2);margin-top:4px;min-height:26px;
  overflow:hidden;}
.pel .btilesub.teal{color:var(--teal);} .pel .btilesub.ox{color:var(--ox);}
/* Drei Spalten lassen der Zahl auf 390 px rund 96 px. Ein Geldbetrag braucht
   dort etwa 100 px — unter 380 px stehen deshalb nur noch zwei nebeneinander. */
@media (max-width:430px){.pel .btileval{font-size:13px;}}
@media (max-width:379px){
  .pel .bstats{grid-template-columns:1fr 1fr;}
  .pel .bstats .btile.wide{grid-column:span 2;}
}

/* ---------- Messbalken ---------- */
.pel .bmeters{padding:14px 15px 0;display:flex;flex-direction:column;gap:11px;}
.pel .bmhead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:5px;}
.pel .bmlab{font-size:11px;color:var(--ink2);}
.pel .bmval{font-size:12.5px;font-weight:650;white-space:nowrap;}
.pel .bmval.teal{color:var(--teal);} .pel .bmval.ox{color:var(--ox);} .pel .bmval.gold{color:var(--gold);}
.pel .bmeter{position:relative;height:6px;border-radius:99px;background:var(--rule);}
.pel .bmeter i{display:block;height:100%;border-radius:99px;background:var(--own);
  transition:width .45s cubic-bezier(.22,.9,.34,1);}
.pel .bmeter i.teal{background:var(--teal);} .pel .bmeter i.ox{background:var(--ox);}
.pel .bmeter i.gold{background:var(--gold);} .pel .bmeter i.neutral{background:var(--ink2);}
.pel .bmeter b{position:absolute;top:-3px;width:2px;height:12px;border-radius:1px;
  background:var(--ink);opacity:.55;transform:translateX(-1px);}
.pel .bmsub{font-size:9.5px;color:var(--ink2);margin-top:5px;line-height:1.35;}
@media (prefers-reduced-motion:reduce){.pel .bmeter i{transition:none;}}

/* ---------- Netzdiagramm ---------- */
.pel .bprofile{display:flex;align-items:center;gap:8px;padding:14px 15px 0;}
.pel .bradar{flex:none;width:138px;}
.pel .bradar svg{width:100%;display:block;}
.pel .bradarnote{font-size:9.5px;color:var(--ink2);text-align:center;margin-top:-2px;}
.pel .bprofile .bprofnote{flex:1;min-width:0;font-size:11.5px;line-height:1.55;color:var(--ink2);}
@media (max-width:339px){
  .pel .bprofile{flex-direction:column;align-items:stretch;}
  .pel .bradar{width:100%;max-width:180px;margin:0 auto;}
}

/* ---------- Kartenfuß: Preisschild und Rechnung ---------- */
.pel .bfoot{margin:14px 15px 0;padding:13px 14px;border-radius:14px;
  background:color-mix(in srgb, var(--own) 8%, transparent);
  border:1px solid color-mix(in srgb, var(--own) 26%, var(--rule));}
.pel .bfrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  font-size:12px;padding:6px 0;}
.pel .bfrow + .bfrow{border-top:1px dashed color-mix(in srgb, var(--own) 24%, var(--rule));}
.pel .bflab{color:var(--ink2);}
.pel .bfval{font-weight:650;white-space:nowrap;}
.pel .bfval.teal{color:var(--teal);} .pel .bfval.ox{color:var(--ox);} .pel .bfval.dim{color:var(--ink2);}
.pel .bfoot .bfnums{margin-top:14px;padding-top:4px;
  border-top:1px dashed color-mix(in srgb, var(--own) 24%, var(--rule));}
.pel .bfoot > .bdial:first-child{margin-top:0;}

/* Die Schlagkraft der Karte: Implied MoM beziehungsweise Total Value je Euro.
   Steht wie auf einer Spielkarte unten rechts und ist die größte Zahl. */
.pel .bpower{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-top:11px;padding-top:11px;
  border-top:1px solid color-mix(in srgb, var(--own) 26%, var(--rule));}
.pel .bpowerlab{font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink2);
  font-weight:700;line-height:1.45;}
.pel .bpowerval{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:29px;font-weight:700;
  letter-spacing:-.04em;line-height:1;white-space:nowrap;}
.pel .bpowerval.teal{color:var(--teal);} .pel .bpowerval.ox{color:var(--ox);}
.pel .bpowerval.gold{color:var(--gold);} .pel .bpowerval.dim{color:var(--ink2);}

/* Wertungsbalken direkt unter dem Bild: die eine Zahl, nach der eine
   Beteiligung beurteilt wird. */
.pel .bscore{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:13px 15px;border-top:1px solid var(--rule);
  background:linear-gradient(90deg,color-mix(in srgb, var(--own) 13%, transparent),transparent 78%);}
.pel .bscore .l{font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink2);
  font-weight:700;line-height:1.45;}
.pel .bscore .s{display:block;font-size:11px;letter-spacing:0;text-transform:none;font-weight:500;
  color:var(--ink2);margin-top:4px;}
.pel .bscore .v{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:30px;font-weight:700;
  letter-spacing:-.04em;line-height:1;white-space:nowrap;}
.pel .bscore .v.teal{color:var(--teal);} .pel .bscore .v.ox{color:var(--ox);}

/* Regler. Der Systemregler übernimmt im dunklen Theme die Fahrbahn des
   Betriebssystems — hell und flächig — und stünde damit als hellster Balken
   über allem anderen. Beide Herstellerpräfixe sind nötig, WebKit und Gecko
   teilen sich keinen Selektor dafür. */
.pel .bcard input[type=range]{-webkit-appearance:none;appearance:none;width:100%;
  background:transparent;margin:8px 0 2px;height:20px;cursor:pointer;}
.pel .bcard input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:99px;background:var(--rule);}
.pel .bcard input[type=range]::-moz-range-track{height:6px;border-radius:99px;background:var(--rule);}
.pel .bcard input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
  width:19px;height:19px;border-radius:50%;margin-top:-6.5px;background:var(--own);
  border:2px solid var(--card);box-shadow:0 0 0 1px color-mix(in srgb, var(--own) 70%, transparent),
  0 2px 6px rgba(0,0,0,.35);}
.pel .bcard input[type=range]::-moz-range-thumb{width:19px;height:19px;border-radius:50%;
  background:var(--own);border:2px solid var(--card);
  box-shadow:0 0 0 1px color-mix(in srgb, var(--own) 70%, transparent),0 2px 6px rgba(0,0,0,.35);}
.pel .bcard input[type=range]:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:99px;}
.pel .bdial{margin-top:12px;}
.pel .bdial + .bdial{margin-top:14px;}

/* ---------- Handlungsflächen ---------- */
.pel .bacts{padding:14px 15px 0;}
.pel .bactgrid{display:flex;gap:8px;}
.pel .bactgrid > *{flex:1;min-width:0;}
.pel .bcard .hint{padding:0;}
.pel .bnote{margin:14px 15px 0;padding:11px 13px;border-radius:12px;font-size:12px;line-height:1.5;
  border:1px solid var(--rule);color:var(--ink2);}
.pel .bnote.gold{border-color:color-mix(in srgb, var(--gold) 45%, transparent);color:var(--gold);
  background:color-mix(in srgb, var(--gold) 8%, transparent);}
.pel .bnote.ox{border-color:color-mix(in srgb, var(--ox) 45%, transparent);color:var(--ox);
  background:color-mix(in srgb, var(--ox) 8%, transparent);}
.pel .bnote b{color:var(--ink);font-weight:650;}
.pel .bnote.gold b{color:var(--gold);}
.pel .bcard .bend{height:16px;}

/* Positionsreihe */
.pel .bseats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:0 15px;}
.pel .bseat{border:1px solid var(--rule);border-radius:12px;padding:10px 5px;text-align:center;
  background:var(--card);}
.pel .bseat .rn{font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink2);
  font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bseat .sk{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:17px;font-weight:700;
  line-height:1.45;letter-spacing:-.02em;}
.pel .bseat .rn2{font-size:9px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bseat.vac{border-color:var(--ox);border-style:dashed;}
.pel .bseat.vac .sk{color:var(--ox);}
.pel .bseat.busy{border-color:var(--gold);}
.pel .bseat.busy .sk{color:var(--gold);}
.pel .bseat:hover:not(:disabled){background:color-mix(in srgb, var(--own) 12%, transparent);
  border-color:color-mix(in srgb, var(--own) 55%, var(--rule));color:var(--ink);}

/* ---------- Reifegrade als Fähigkeitsbalken ---------- */
.pel .bability{padding:0 15px;display:flex;flex-direction:column;gap:9px;}
.pel .babrow{display:flex;align-items:center;gap:9px;}
/* Spaltenbreite nach dem längsten Wort ("Performance"). */
.pel .bablab{width:92px;flex:none;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink2);font-weight:650;white-space:nowrap;}
.pel .babpips{display:flex;gap:3px;flex:1;min-width:0;}
.pel .babpip{flex:1;height:8px;border-radius:2px;background:var(--rule);transform:skewX(-16deg);opacity:.5;}
.pel .babpip.on{opacity:1;}
.pel .babpip.half{opacity:.6;}
.pel .babpip.p{background:var(--gold);} .pel .babpip.l{background:var(--teal);}
.pel .babpip.a{background:#8478BE;}
.pel .babst{flex:none;min-width:74px;text-align:right;font-size:9.5px;color:var(--ink2);
  font-weight:600;letter-spacing:.02em;}
.pel .babst.warn{color:var(--ox);} .pel .babst.run{color:var(--gold);}

/* ---------- Regalkachel (kompakte Portfolio-Übersicht) ---------- */
.pel .bshelf{display:flex;gap:11px;align-items:center;margin:9px 16px;padding:10px 12px;
  border-radius:14px;cursor:pointer;text-align:left;width:calc(100% - 32px);
  background:linear-gradient(100deg,color-mix(in srgb, var(--own) 17%, var(--card)),var(--card) 62%);
  border:1px solid color-mix(in srgb, var(--own) 30%, var(--rule));
  transition:transform .14s cubic-bezier(.34,1.56,.64,1),border-color .15s ease,box-shadow .15s ease;}
.pel .bshelf:hover{border-color:color-mix(in srgb, var(--own) 65%, var(--rule));
  box-shadow:0 10px 22px -16px color-mix(in srgb, var(--own) 90%, transparent);
  background:linear-gradient(100deg,color-mix(in srgb, var(--own) 17%, var(--card)),var(--card) 62%);
  color:var(--ink);}
.pel .bshelf:active{transform:scale(.985);}
.pel .bshelf .bsigil{flex:none;}
/* Die Kinder sind <span>, weil die ganze Kachel ein <button> ist — ohne
   display:block flössen sie als Fließtext um die Sparkline herum. */
.pel .bshelfmain{flex:1;min-width:0;display:block;}
.pel .bshelfname{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:650;
  letter-spacing:-.015em;white-space:nowrap;overflow:hidden;}
.pel .bshelfname i{flex:none;}
.pel .bshelfname span{overflow:hidden;text-overflow:ellipsis;}
.pel .bshelfmeta{display:block;font-size:10.5px;color:var(--ink2);margin-top:3px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.pel .bshelfspark{width:52px;height:24px;flex:none;display:block;}
.pel .bshelfmoic{flex:none;text-align:right;min-width:56px;display:block;}
.pel .bshelfmoic .v{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:16px;
  font-weight:700;line-height:1.15;letter-spacing:-.02em;}
.pel .bshelfmoic .l{display:block;font-size:8.5px;letter-spacing:.11em;text-transform:uppercase;
  color:var(--ink2);font-weight:600;margin-top:1px;}
.pel .bslot{margin:9px 16px;padding:16px 12px;border-radius:14px;border:1px dashed var(--rule);
  text-align:center;font-size:12px;color:var(--ink2);
  background:repeating-linear-gradient(135deg,transparent,transparent 9px,
    color-mix(in srgb, var(--ink) 3%, transparent) 9px,color-mix(in srgb, var(--ink) 3%, transparent) 18px);}
.pel .bslot b{display:block;font-size:13px;color:var(--ink);font-weight:650;margin-bottom:3px;}
`;
