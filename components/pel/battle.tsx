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

function Racks({ rnd, id }) {
  const n = 4 + Math.floor(rnd() * 3);
  const racks = Array.from({ length: n }, (_, i) => {
    const w = 26 + rnd() * 8, x = 16 + i * (172 / n), h = 96 + rnd() * 52;
    return { x, w, h, rows: 5 + Math.floor(rnd() * 4) };
  });
  return (
    <g>
      {/* Lichtstreifen im Hintergrund: die Gänge zwischen den Reihen */}
      {racks.map((r, i) => (
        <rect key={"g" + i} x={r.x + r.w} y={180 - r.h} width="4" height={r.h}
          fill={id.lit} opacity=".22" />
      ))}
      {racks.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={180 - r.h} width={r.w} height={r.h} rx="2"
            fill={id.shade} stroke={id.own} strokeWidth="1.2" />
          {Array.from({ length: r.rows }, (_, k) => {
            const y = 180 - r.h + 7 + k * ((r.h - 12) / r.rows);
            const on = (i * 7 + k * 3) % 5;
            return (
              <g key={k}>
                <rect x={r.x + 3} y={y} width={r.w - 6} height="3.4" rx="1.7"
                  fill={id.own} opacity=".45" />
                {/* Zwei helle Dioden je Einschub — das Licht macht das Bild */}
                <rect x={r.x + 3} y={y} width={5 + on * 2.5} height="3.4" rx="1.7"
                  fill={id.lit} opacity={on >= 3 ? 1 : 0.55} />
              </g>
            );
          })}
        </g>
      ))}
      {/* Spiegelung auf dem Boden */}
      <rect x="0" y="180" width="220" height="20" fill={id.own} opacity=".12" />
      {racks.map((r, i) => (
        <rect key={"m" + i} x={r.x} y="180" width={r.w} height="14" fill={id.lit} opacity=".10" />
      ))}
    </g>
  );
}

function Helix({ rnd, id }) {
  const turns = 2 + Math.floor(rnd() * 2);
  const amp = 26 + rnd() * 10, cx = 118, top = 12, bot = 190;
  const pt = (t, phase) => {
    const y = top + t * (bot - top);
    const x = cx + Math.sin(t * Math.PI * 2 * turns + phase) * amp;
    return [x, y];
  };
  const path = (phase) => Array.from({ length: 49 }, (_, i) => {
    const [x, y] = pt(i / 48, phase);
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const rungs = Array.from({ length: 14 }, (_, i) => {
    const t = (i + 0.5) / 14;
    return [pt(t, 0), pt(t, Math.PI)];
  });
  return (
    <g>
      {rungs.map(([a, z], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={z[0]} y2={z[1]}
          stroke={id.lit} strokeWidth="1.3" opacity=".38" />
      ))}
      <path d={path(0)} fill="none" stroke={id.lit} strokeWidth="3.6" strokeLinecap="round" />
      <path d={path(Math.PI)} fill="none" stroke={id.own} strokeWidth="3.6" strokeLinecap="round" opacity=".85" />
      {rungs.map(([a, z], i) => (
        <g key={"n" + i}>
          <circle cx={a[0]} cy={a[1]} r="2.6" fill={id.lit} opacity=".8" />
          <circle cx={z[0]} cy={z[1]} r="2.6" fill={id.own} opacity=".6" />
        </g>
      ))}
    </g>
  );
}

function Robot({ rnd, id }) {
  // Stellung des Arms variiert je Unternehmen, die Bauform bleibt
  const a1 = -52 - rnd() * 26, a2 = 46 + rnd() * 34;
  const bx = 60, by = 178, L1 = 74, L2 = 58;
  const r1 = (a1 * Math.PI) / 180, e = [bx + Math.cos(r1) * L1, by + Math.sin(r1) * L1];
  const r2 = r1 + (a2 * Math.PI) / 180, h = [e[0] + Math.cos(r2) * L2, e[1] + Math.sin(r2) * L2];
  /* Jedes Armstück wird zweimal gezeichnet: dunkles Gehäuse, darüber der
     schmalere helle Körper. Das gibt die Kante, an der eine Maschine als
     Maschine lesbar wird — eine einzelne Linie sieht aus wie ein Balken. */
  const seg = (p, q, w) => (
    <g>
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={id.shade} strokeWidth={w + 5} strokeLinecap="round" />
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={id.own} strokeWidth={w} strokeLinecap="round" />
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={id.lit} strokeWidth={Math.max(1, w * 0.22)}
        strokeLinecap="round" opacity=".8" />
    </g>
  );
  return (
    <g>
      {/* Werkhalle im Hintergrund */}
      <g opacity=".3">
        {Array.from({ length: 6 }, (_, i) => {
          const x = 8 + i * 36, hh = 30 + rnd() * 58;
          return <rect key={i} x={x} y={182 - hh} width="22" height={hh} fill={id.shade} />;
        })}
      </g>
      <rect x="0" y="182" width="220" height="18" fill={id.own} opacity=".14" />
      {/* Sockel */}
      <path d={`M${bx - 26} 190 L${bx - 15} 164 H${bx + 15} L${bx + 26} 190 Z`}
        fill={id.shade} stroke={id.own} strokeWidth="1.4" />
      {seg([bx, by - 8], e, 13)}
      {seg([bx, by - 8], e, 6.5)}
      {seg(e, h, 10)}
      <circle cx={bx} cy={by - 8} r="10" fill={id.shade} stroke={id.lit} strokeWidth="2" />
      <circle cx={e[0]} cy={e[1]} r="8.5" fill={id.shade} stroke={id.lit} strokeWidth="2" />
      {/* Greifer */}
      <g stroke={id.lit} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d={`M${h[0]} ${h[1]} l${Math.cos(r2 - 0.5) * 15} ${Math.sin(r2 - 0.5) * 15}`} />
        <path d={`M${h[0]} ${h[1]} l${Math.cos(r2 + 0.5) * 15} ${Math.sin(r2 + 0.5) * 15}`} />
      </g>
      {/* Funken */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={h[0] + (rnd() - 0.5) * 46} cy={h[1] + (rnd() - 0.2) * 40}
          r={0.8 + rnd() * 1.6} fill={id.lit} opacity={0.3 + rnd() * 0.5} />
      ))}
    </g>
  );
}

function Bottle({ rnd, id }) {
  const cx = 118, leaves = 5 + Math.floor(rnd() * 3);
  return (
    <g>
      {/* Botanik hinter der Flasche */}
      {Array.from({ length: leaves * 2 }, (_, i) => {
        const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
        const ang = side * (28 + k * 17 + rnd() * 8);
        const len = 46 + rnd() * 34;
        const bx = cx + side * 20, by = 150 - k * 12;
        const r = (ang - 90) * Math.PI / 180;
        const tx = bx + Math.cos(r) * len, ty = by + Math.sin(r) * len;
        // Blattform: zwei gespiegelte Bögen um die Achse Ansatz -> Spitze,
        // dazu die Mittelrippe. Eine einzelne Kurve zurück ergab eine Zacke.
        const mx = (bx + tx) / 2, my = (by + ty) / 2;
        /* Der Kontrollpunkt liegt doppelt so weit von der Sehne entfernt wie
           die spätere Blatthälfte breit ist. Mit dem früheren festen Abstand
           von rund zehn Einheiten wurde aus jedem Blatt eine Zacke. */
        const nx = -(ty - by) / len, ny = (tx - bx) / len, w = len * (0.36 + rnd() * 0.14);
        return (
          <g key={i} opacity={0.3 + rnd() * 0.34}>
            <path d={`M${bx} ${by} Q${mx + nx * w} ${my + ny * w} ${tx} ${ty}
                      Q${mx - nx * w} ${my - ny * w} ${bx} ${by} Z`} fill={id.own} />
            <path d={`M${bx} ${by} L${tx} ${ty}`} stroke={id.lit} strokeWidth=".9" opacity=".7" fill="none" />
          </g>
        );
      })}
      {/* Flasche */}
      <path d={`M${cx - 22} 186 V116 q0-10 7-14 l3-2 V84 h24 v16 l3 2 q7 4 7 14 v70 z`}
        fill={id.shade} stroke={id.lit} strokeWidth="1.8" />
      <rect x={cx - 13} y="72" width="26" height="14" rx="3" fill={id.own} />
      {/* Etikett */}
      <rect x={cx - 22} y="128" width="44" height="38" fill={id.lit} opacity=".22" />
      {Array.from({ length: 4 }, (_, i) => (
        <rect key={i} x={cx - 14} y={136 + i * 8} width={i === 0 ? 28 : 20 - i * 3} height="2.4"
          rx="1.2" fill={id.lit} opacity=".55" />
      ))}
      {/* Glanzkante */}
      <path d={`M${cx - 15} 182 V120 q0-6 4-9`} fill="none" stroke={id.lit} strokeWidth="2"
        opacity=".5" strokeLinecap="round" />
      <ellipse cx={cx} cy="190" rx="40" ry="7" fill={id.own} opacity=".2" />
    </g>
  );
}

function Network({ rnd, id }) {
  const n = 8 + Math.floor(rnd() * 4);
  const nodes = Array.from({ length: n }, () => [22 + rnd() * 176, 26 + rnd() * 150]);
  const hub = nodes[0];
  return (
    <g>
      {nodes.map((p, i) => nodes.slice(i + 1).map((q, j) => {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        return d < 78 ? (
          <line key={i + "-" + j} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]}
            stroke={id.own} strokeWidth="1" opacity={0.5 - d / 220} />
        ) : null;
      }))}
      {nodes.map((p, i) => (
        <line key={"h" + i} x1={hub[0]} y1={hub[1]} x2={p[0]} y2={p[1]}
          stroke={id.lit} strokeWidth="1" opacity=".2" />
      ))}
      {nodes.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={i === 0 ? 13 : 7} fill={id.shade}
            stroke={i === 0 ? id.lit : id.own} strokeWidth={i === 0 ? 2 : 1.4} />
          {/* Standort als Person: Kopf und Schulter */}
          <circle cx={p[0]} cy={p[1] - (i === 0 ? 3.4 : 1.8)} r={i === 0 ? 3.2 : 1.9} fill={id.lit} opacity=".85" />
          <path d={`M${p[0] - (i === 0 ? 5 : 3)} ${p[1] + (i === 0 ? 6 : 3.4)}
                    a${i === 0 ? 5 : 3} ${i === 0 ? 5 : 3} 0 0 1 ${i === 0 ? 10 : 6} 0`}
            fill="none" stroke={id.lit} strokeWidth={i === 0 ? 2 : 1.3} opacity=".85" />
        </g>
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
  const rnd = lcg(id.seed ^ 0x5bf03635);
  const u = id.uid;
  /* Zeichenfläche 300 x 200, an der rechten unteren Ecke verankert: Der
     Kartenkopf ist breiter als hoch, `slice` beschneidet also oben. Verankert
     man stattdessen mittig, verschwindet der Boden jeder Szene — die
     Serverreihe stünde ohne Stellfläche da. Die Szene selbst sitzt um 80
     nach rechts versetzt, damit links Platz für Name und Anspruch bleibt. */
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
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="300" height="200" fill={`url(#${u}sky)`} />
        <Pattern id={id} />
        <rect width="300" height="200" fill={`url(#${u}glow)`} />
        {/* Der Leuchtabdruck der Szene liegt unscharf darunter — das gibt dem
            Strich das Neon des Entwurfs, ohne jeden Pfad zu filtern. */}
        <g transform="translate(80 0)">
          <g filter={`url(#${u}bl)`} opacity=".38"><Scene rnd={lcg(id.seed)} id={id} /></g>
          <Scene rnd={rnd} id={id} />
        </g>
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
  return (
    <div className={"bhero tier-" + tier}>
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
        <div className="bsecclaim" style={{ color: id.lit }}>
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
  line-height:1.25;text-align:right;pointer-events:none;text-shadow:0 1px 10px var(--card);}
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
