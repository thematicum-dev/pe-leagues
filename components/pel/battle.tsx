"use client";

/* ============================================================================
   Battle Cards — die grafische Grundausstattung für Dealflow und Portfolio.

   Diese Datei enthält ausschließlich Darstellung: Rahmen, Wappen, Artwork,
   Kennzahlenkacheln, Messbalken, Notenplakette, Netzdiagramm. Keine Spiellogik,
   keine Kennzahlenrechnung — die Werte kommen fertig aus `lib/engine` und
   werden hier nur noch in Form gebracht. Dadurch bleibt `ui.tsx` für die
   Feldlogik zuständig (was ist verdeckt, was kostet was, welcher Knopf ist
   aktiv) und diese Datei für das Aussehen.

   Warum überhaupt Karten im Stil eines Sammelkartenspiels: Ein Zielunternehmen
   ist im Spiel ein Gegenstand, den man bewertet, erwirbt, aufbaut und wieder
   abgibt — genau die Rolle, die eine Karte in einem Kartenspiel hat. Die
   Kennzahlen sind ihre Werte, der Sektor ihr Typ, die Flagge ihre Fähigkeit,
   die Bewertung ihr Preis. Vorher stand dasselbe als Kontenblatt da: korrekt,
   aber ohne Silhouette — zwei Karten sahen im Vorbeiscrollen gleich aus.

   Alles ist aus einem Namen deterministisch abgeleitet (Hash → Zufallsfolge),
   damit dasselbe Unternehmen über die ganze Partie dasselbe Bild behält, ohne
   dass ein Bild irgendwo gespeichert werden müsste.
   ========================================================================== */

import React from "react";

/* ---------------------------------------------------------------- Zufall --
   FNV-1a über den Namen, danach ein linearer Kongruenzgenerator. Reicht
   vollkommen für Bildrauschen und ist in jedem Browser gleich.              */
export function seedOf(str: string) {
  let h = 2166136261;
  for (let i = 0; i < (str || "").length; i++) {
    h ^= (str || "").charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function lcg(seed: number) {
  let s = (seed || 1) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const cl = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/* ---------------------------------------------------------------- Wappen --
   Ein Sektor ist der „Typ" der Karte. Jeder bekommt ein eigenes Zeichen, das
   sowohl klein in der Typzeile als auch groß als Wasserzeichen im Artwork
   funktioniert — deshalb reine Pfade ohne Füllfarbe, die Farbe kommt über
   `currentColor` von außen.                                                 */
export function SectorEmblem({ sector, style = undefined, className = "" }) {
  const P = {
    Industrials: (
      <>
        <path d="M4 21h17M6 21V11l5 3V11l5 3V8l3-1v14" />
        <path d="M9.5 17.5h1.5M14 17.5h1.5" />
      </>
    ),
    Healthcare: (
      <>
        <path d="M3 13h3l2-4 2.5 8L14 7l2 6h5" />
        <path d="M12 3v3M10.5 4.5h3" />
      </>
    ),
    Software: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
      </>
    ),
    Services: (
      <>
        <path d="M12 5.5 8 9l4 3.5L16 9z" />
        <path d="M12 12.5 8 16l4 3.5L16 16z" />
        <path d="M6.5 12.5 4 12l2.5-.5M17.5 12.5 20 12l-2.5-.5" />
      </>
    ),
    Consumer: (
      <>
        <path d="M6 8h12l-1.2 11.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={"bemb " + className} style={style} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {P[sector] || P.Services}
    </svg>
  );
}

/* --------------------------------------------------------------- Artwork --
   Ein „Bild" ohne Bilddatei: geschichtete Silhouetten in der Sektorfarbe,
   darüber ein sektortypisches Motiv und das Wappen als Wasserzeichen. Die
   Form der Silhouette hängt am Namen, das Motiv am Sektor — zwei Karten
   desselben Sektors haben damit dieselbe Handschrift, aber nicht dasselbe
   Bild.                                                                     */
function Ridge({ rnd, y, amp, fill, op }) {
  const W = 320, seg = 7;
  const pts: string[] = [];
  for (let i = 0; i <= seg; i++) {
    const x = (i / seg) * W;
    const yy = y - amp * (0.35 + rnd() * 0.65);
    pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  }
  return <polygon points={`0,140 ${pts.join(" ")} ${W},140`} fill={fill} opacity={op} />;
}

function Motif({ sector, rnd, col }) {
  if (sector === "Software") {
    // Leiterbahnen: rechte Winkel, Knotenpunkte an den Enden
    const lines = Array.from({ length: 7 }, (_, i) => {
      const y = 24 + i * 15, x1 = 10 + rnd() * 60, x2 = x1 + 50 + rnd() * 150;
      return <g key={i}>
        <path d={`M${x1.toFixed(0)} ${y} H${(x2 - 12).toFixed(0)} l12 -12`} fill="none"
          stroke={col} strokeWidth="1" opacity={0.3 + rnd() * 0.3} />
        <circle cx={x1.toFixed(0)} cy={y} r="2" fill={col} opacity=".6" />
      </g>;
    });
    return <g>{lines}</g>;
  }
  if (sector === "Healthcare") {
    // Pulslinie über die ganze Breite
    const d = "M0 96 H60 l10 -34 l12 62 l10 -28 H150 l8 -18 l10 40 l8 -22 H320";
    return <path d={d} fill="none" stroke={col} strokeWidth="1.6" opacity=".55" strokeLinejoin="round" />;
  }
  if (sector === "Consumer") {
    // Bogenreihe wie eine Ladenfront
    return <g opacity=".4">
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${18 + i * 52} 118 v-20 a13 13 0 0 1 26 0 v20`} fill="none" stroke={col} strokeWidth="1.2" />
      ))}
    </g>;
  }
  if (sector === "Services") {
    // Netz aus Knoten — verteilte Standorte
    const nodes = Array.from({ length: 9 }, () => [20 + rnd() * 280, 30 + rnd() * 80]);
    return <g>
      {nodes.map((n, i) => nodes.slice(i + 1).map((m, j) => {
        const dist = Math.hypot(n[0] - m[0], n[1] - m[1]);
        return dist < 95
          ? <line key={i + "-" + j} x1={n[0]} y1={n[1]} x2={m[0]} y2={m[1]} stroke={col} strokeWidth=".8" opacity=".3" />
          : null;
      }))}
      {nodes.map((n, i) => <circle key={i} cx={n[0]} cy={n[1]} r="2.4" fill={col} opacity=".55" />)}
    </g>;
  }
  // Industrials: Schlote und Sheddach
  return <g opacity=".45">
    {Array.from({ length: 5 }, (_, i) => {
      const x = 22 + i * 60, h = 26 + rnd() * 42;
      return <g key={i}>
        <rect x={x} y={118 - h} width="11" height={h} fill={col} opacity=".55" />
        <path d={`M${x - 13} 118 v-14 l13 -9 v9 l13 -9 v23 z`} fill={col} opacity=".3" />
      </g>;
    })}
  </g>;
}

export function CardArt({ sector, color, name, tier = "common", children = null }) {
  const rnd = lcg(seedOf(name || sector));
  const gid = "g" + (seedOf(name || sector) % 100000);
  return (
    <div className={"bart tier-" + tier}>
      <svg viewBox="0 0 320 140" preserveAspectRatio="none" className="bartsvg" aria-hidden="true">
        <defs>
          <linearGradient id={gid + "sky"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".38" />
            <stop offset="62%" stopColor={color} stopOpacity=".10" />
            <stop offset="100%" stopColor={color} stopOpacity=".02" />
          </linearGradient>
          <radialGradient id={gid + "glow"} cx="72%" cy="18%" r="62%">
            <stop offset="0%" stopColor={color} stopOpacity=".52" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="320" height="140" fill={`url(#${gid}sky)`} />
        <rect x="0" y="0" width="320" height="140" fill={`url(#${gid}glow)`} />
        {/* Horizontlinien: geben dem Feld Tiefe, ohne vom Motiv abzulenken */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="0" y1={18 + i * 16} x2="320" y2={18 + i * 16}
            stroke={color} strokeWidth=".5" opacity=".07" />
        ))}
        <Ridge rnd={rnd} y={118} amp={42} fill={color} op={0.16} />
        <Ridge rnd={rnd} y={126} amp={30} fill={color} op={0.24} />
        <Motif sector={sector} rnd={rnd} col={color} />
      </svg>
      <SectorEmblem sector={sector} className="bwatermark" style={{ color }} />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- Plakette --
   Note und Punktzahl wie auf einer Spielerkarte: ein Sechseck mit dem
   Buchstaben, daneben der Rohwert und ein Balken. Der Buchstabe ist eine
   Lesehilfe für den Rohwert, keine neue Kennzahl — die Schwellen stehen hier,
   damit sie an einer Stelle liegen.                                         */
export function gradeOf(score: number) {
  if (score >= 85) return { g: "S", tone: "gold" };
  if (score >= 70) return { g: "A", tone: "teal" };
  if (score >= 55) return { g: "B", tone: "teal" };
  if (score >= 40) return { g: "C", tone: "neutral" };
  return { g: "D", tone: "ox" };
}

export function GradeBadge({ score, label = "Asset Grade", sub = null, extra = null }) {
  const val = score == null || !Number.isFinite(score) ? null : Math.round(score);
  const { g, tone } = val == null ? { g: "?", tone: "neutral" } : gradeOf(val);
  return (
    <div className="bgrade">
      <span className={"bhex " + tone}>{g}</span>
      <div className="bgradebody">
        <div className="eyebrow">{label}{extra}</div>
        <div className="bgradeval mono">
          {val == null ? "—" : val}<small>/100</small>
        </div>
        <div className="bmeter"><i className={tone} style={{ width: `${cl((val || 0) / 100) * 100}%` }} /></div>
        {sub && <div className="bgradesub">{sub}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Kennzahlfeld --
   Eine Kachel trägt genau eine Zahl, ihre Bezeichnung und optional die
   Einordnung (Delta gegen Benchmark, Zusatz). Die Zahl steht groß und in der
   Ziffernschrift, alles andere klein — sonst konkurriert die Erklärung mit
   dem Wert.                                                                 */
export function StatTile({ label, value, tone = "", sub = null, icon = null, wide = false, info = null }) {
  return (
    <div className={"btile" + (wide ? " wide" : "")}>
      <div className="btilelab">{icon}{label}{info}</div>
      <div className={"btileval mono " + tone}>{value}</div>
      {sub != null && <div className="btilesub">{sub}</div>}
    </div>
  );
}

/* Messbalken für eine Größe mit natürlicher Ober- und Untergrenze. `mark`
   setzt eine Referenzmarke (Benchmark, Covenant) auf dieselbe Skala — die
   Zahl allein sagt nicht, ob 12 % Marge viel ist.                          */
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

/* ------------------------------------------------------------ Netzdiagramm --
   Fünf Achsen, eine Fläche: das Profil eines Unternehmens auf einen Blick.
   Der Sinn ist der Vergleich zweier Karten im Vorbeiscrollen — ein schmales
   Dreieck und ein volles Fünfeck unterscheiden sich, bevor man eine Zahl
   gelesen hat. Die Achsen sind normiert, die Rohwerte stehen unverändert in
   den Kacheln daneben; das Diagramm ersetzt keine Zahl.                    */
export function StatRadar({ axes, color, redacted = false, note = null }) {
  const R = 42, CX = 70, CY = 58;
  const n = axes.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  };
  const ring = (f: number) => axes.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
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
   nicht mit der eigenen Beteiligung vergleichbar.                          */
export const AX = {
  margin: (v) => cl((v ?? 0) / 28),
  growth: (v) => cl(((v ?? 0) + 3) / 16),
  quality: (v) => cl((v ?? 0) / 100),
  conv: (v) => cl((v ?? 0) / 95),
  size: (v) => cl((v ?? 0) / 32),
  headroom: (v) => cl((v ?? 0) / 2.2),
};

/* ------------------------------------------------------------- Fähigkeit --
   Flaggen sind im Spiel das, was auf einer Sammelkarte die Fähigkeit ist:
   eine Eigenschaft, die den Wert der Karte verschiebt. `kind` unterscheidet
   die These (Buy-&-Build) vom Risiko.                                      */
export function Ability({ kind = "risk", children }) {
  return (
    <span className={"babil " + kind}>
      <span className="babicon">{kind === "angle" ? "◆" : kind === "hidden" ? "?" : "⚑"}</span>
      <span>{children}</span>
    </span>
  );
}

/* Sechseckplakette oben rechts: der Preis der Karte. Auf einer Spielkarte
   stehen die Kosten immer an derselben Stelle — hier ebenso, damit sich
   Karten ohne Lesen vergleichen lassen.                                    */
export function CostBadge({ label, value, tone = "", sub = null }) {
  return (
    <div className={"bcost " + tone}>
      <div className="bcostlab">{label}</div>
      <div className="bcostval mono">{value}</div>
      {sub && <div className="bcostsub">{sub}</div>}
    </div>
  );
}

/* Abschnittsüberschrift innerhalb einer Karte. Ersetzt die frühere
   Trennlinienlogik der Kontenblatt-Tabelle: Geschäft, Ertrag, Bewertung
   waren dort nur durch einen größeren Zeilenabstand getrennt.              */
export function Band({ children, right = null }) {
  return (
    <div className="bband">
      <span>{children}</span>
      {right && <span className="bbandright">{right}</span>}
    </div>
  );
}

/* ----------------------------------------------------------------- CSS -- */
export const BATTLE_CSS = `
/* ============================================================
   BATTLE CARDS — Dealflow und Portfolio
   ============================================================ */

.pel .bcard{position:relative;margin:16px;border-radius:16px;overflow:hidden;
  background:linear-gradient(180deg,color-mix(in srgb, var(--sec) 13%, var(--card)) 0%,
    var(--card) 44%,var(--card) 100%);
  border:1px solid color-mix(in srgb, var(--sec) 34%, var(--rule));
  box-shadow:0 14px 34px -22px color-mix(in srgb, var(--sec) 85%, transparent),0 1px 2px var(--glow);
  animation:rise .32s cubic-bezier(.22,.9,.34,1) both;}
.pel .bcard:nth-of-type(2){animation-delay:.03s;}
.pel .bcard:nth-of-type(3){animation-delay:.06s;}
@media (prefers-reduced-motion:reduce){.pel .bcard{animation:none;}}
/* Oberkante in Sektorfarbe als eigenes Element statt als :before — die
   Pseudoklasse ist für das NEU-Band reserviert. */
.pel .bcard .bedge{position:absolute;top:0;left:0;right:0;height:3px;z-index:3;
  background:linear-gradient(90deg,transparent,var(--sec) 22%,var(--sec) 78%,transparent);}

/* Seltenheitsstufen: Trophy Asset in Gold, proprietärer Zugang abgesetzt.
   Auf einer Sammelkarte erkennt man die Stufe am Rahmen, nicht am Text. */
.pel .bcard.tier-myth{border-color:var(--gold);
  box-shadow:0 0 38px -12px var(--gold),0 14px 34px -22px rgba(0,0,0,.55);}
.pel .bcard.tier-myth .bedge{background:linear-gradient(90deg,transparent,var(--gold),transparent);height:4px;}
.pel .bcard.tier-rare{border-color:color-mix(in srgb, var(--gold) 45%, var(--rule));}

/* ---------- Kopf: Wappen, Name, Kosten ---------- */
.pel .bcrown{position:relative;z-index:2;display:flex;align-items:center;gap:11px;
  padding:14px 14px 12px;}
.pel .bcrest{flex:none;width:38px;height:38px;border-radius:11px;display:flex;
  align-items:center;justify-content:center;color:var(--sec);
  background:color-mix(in srgb, var(--sec) 15%, transparent);
  border:1px solid color-mix(in srgb, var(--sec) 40%, transparent);}
.pel .bcrest .bemb{width:21px;height:21px;}
.pel .bcard.tier-myth .bcrest{color:var(--gold);border-color:color-mix(in srgb, var(--gold) 55%, transparent);
  background:color-mix(in srgb, var(--gold) 15%, transparent);}
.pel .bnamewrap{flex:1;min-width:0;}
/* Firmennamen sind lang und zusammengesetzt ("Präzisionstechnik"). Neben
   Wappen und Preisschild bleibt auf einem Telefon eine schmale Spalte; ohne
   Trennung stünde ein solches Wort über den Kartenrand hinaus. hyphens:auto
   trennt nach den deutschen Regeln (die Seite ist als lang="de" ausgezeichnet),
   overflow-wrap ist der Notnagel für das, was das Wörterbuch nicht kennt. */
.pel .bname{font-size:17px;font-weight:650;letter-spacing:-.025em;line-height:1.2;
  hyphens:auto;overflow-wrap:break-word;}
.pel .bsub{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);
  font-weight:600;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.pel .bsub .bdot{width:6px;height:6px;border-radius:50%;background:var(--sec);flex:none;}

.pel .bcost{flex:none;min-width:76px;text-align:right;padding:6px 10px;border-radius:10px;
  background:color-mix(in srgb, var(--ink) 6%, transparent);
  border:1px solid var(--rule);}
.pel .bcost.ox{border-color:color-mix(in srgb, var(--ox) 55%, transparent);
  background:color-mix(in srgb, var(--ox) 10%, transparent);}
.pel .bcost.gold{border-color:color-mix(in srgb, var(--gold) 55%, transparent);
  background:color-mix(in srgb, var(--gold) 12%, transparent);}
.pel .bcost.teal{border-color:color-mix(in srgb, var(--teal) 50%, transparent);
  background:color-mix(in srgb, var(--teal) 11%, transparent);}
.pel .bcostlab{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);
  font-weight:600;white-space:nowrap;}
.pel .bcostval{font-size:15px;font-weight:600;line-height:1.25;white-space:nowrap;}
.pel .bcost.ox .bcostval{color:var(--ox);}
.pel .bcost.gold .bcostval{color:var(--gold);}
.pel .bcost.teal .bcostval{color:var(--teal);}
.pel .bcostsub{font-size:9.5px;color:var(--ink2);white-space:nowrap;margin-top:1px;}

/* Auf sehr schmalen Geräten (320 px) bleibt neben Wappen und Preisschild so
   wenig für den Namen, dass er mitten im Wort umbricht. Das Preisschild rückt
   dann unter den Namen und wird zur Zeile: Bezeichnung links, Wert rechts. */
@media (max-width:379px){
  .pel .bcrown{flex-wrap:wrap;}
  .pel .bcost{order:3;width:100%;min-width:0;display:flex;align-items:baseline;gap:8px;
    text-align:left;}
  .pel .bcostlab{flex:1;}
  .pel .bcostsub{margin-top:0;}
}

/* ---------- Artwork ---------- */
.pel .bart{position:relative;height:132px;overflow:hidden;
  border-top:1px solid color-mix(in srgb, var(--sec) 26%, var(--rule));
  border-bottom:1px solid color-mix(in srgb, var(--sec) 26%, var(--rule));
  background:color-mix(in srgb, var(--sec) 7%, var(--card));}
.pel .bartsvg{position:absolute;inset:0;width:100%;height:100%;display:block;}
.pel .bwatermark{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  width:92px;height:92px;opacity:.13;stroke-width:1.1;}
/* Der Foliengang über Trophy Assets: einmal quer, dann Pause. Er soll auffallen,
   nicht flackern. */
.pel .bart.tier-myth:after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);
  transform:translateX(-100%);animation:foil 4.5s ease-in-out 1s infinite;}
@keyframes foil{0%{transform:translateX(-100%);}45%,100%{transform:translateX(100%);}}
@media (prefers-reduced-motion:reduce){.pel .bart.tier-myth:after{animation:none;opacity:0;}}
/* Leiste am unteren Rand des Artworks: Typzeile links, Zustand rechts. Sie
   liegt im Bild, damit der Block darunter mit Zahlen beginnen kann. */
.pel .bartfoot{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;
  justify-content:space-between;gap:8px;padding:7px 12px;
  background:linear-gradient(180deg,transparent,color-mix(in srgb, var(--card) 88%, transparent) 55%,var(--card));}
/* Die Typzeile bleibt einzeilig: Ein langer Sektorname ("Consumer & Retail")
   brach sonst um und machte die Leiste im Bild doppelt so hoch. Kürzen darf
   nur der Zusatz dahinter. */
.pel .btype{display:flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;font-weight:650;color:var(--ink);min-width:0;
  white-space:nowrap;overflow:hidden;}
.pel .btype .bemb{width:13px;height:13px;color:var(--sec);flex:none;}
.pel .btype s{text-decoration:none;color:var(--ink2);font-weight:500;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;min-width:0;}

/* Zustandsmarke: On track / Needs attention, oder der laufende Prozess. */
.pel .bstate{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:9.5px;
  letter-spacing:.1em;text-transform:uppercase;font-weight:700;border-radius:99px;
  padding:4px 9px;color:var(--teal);background:color-mix(in srgb, var(--teal) 15%, var(--card));
  border:1px solid color-mix(in srgb, var(--teal) 42%, transparent);white-space:nowrap;}
.pel .bstate.att{color:var(--ox);background:color-mix(in srgb, var(--ox) 15%, var(--card));
  border-color:color-mix(in srgb, var(--ox) 45%, transparent);}
.pel .bstate.gold{color:var(--gold);background:color-mix(in srgb, var(--gold) 15%, var(--card));
  border-color:color-mix(in srgb, var(--gold) 45%, transparent);}
.pel .bstate.dim{color:var(--ink2);background:color-mix(in srgb, var(--ink) 7%, var(--card));
  border-color:var(--rule);}

/* ---------- Fähigkeiten (Flaggen) ---------- */
.pel .babils{display:flex;flex-wrap:wrap;gap:6px;padding:11px 14px 0;}
.pel .babil{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;
  border-radius:8px;padding:5px 9px;line-height:1.25;
  color:var(--ox);background:color-mix(in srgb, var(--ox) 11%, transparent);
  border:1px solid color-mix(in srgb, var(--ox) 32%, transparent);}
.pel .babil.angle{color:var(--gold);background:color-mix(in srgb, var(--gold) 12%, transparent);
  border-color:color-mix(in srgb, var(--gold) 38%, transparent);}
.pel .babil.hidden{color:var(--ink2);background:transparent;border-style:dashed;
  border-color:var(--rule);}
.pel .babil.good{color:var(--teal);background:color-mix(in srgb, var(--teal) 12%, transparent);
  border-color:color-mix(in srgb, var(--teal) 35%, transparent);}
.pel .babicon{font-size:11px;line-height:1;opacity:.85;}

/* ---------- Aromatext (Geschäftsmodell) ---------- */
.pel .bflavor{margin:12px 14px 0;padding:10px 12px;border-radius:10px;font-size:12.5px;
  line-height:1.55;color:var(--ink2);font-style:italic;
  background:color-mix(in srgb, var(--sec) 6%, transparent);
  border-left:2px solid color-mix(in srgb, var(--sec) 60%, transparent);}

/* ---------- Abschnittsband ---------- */
.pel .bband{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin:16px 14px 9px;font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;
  font-weight:700;color:var(--ink2);}
.pel .bband:before{content:"";flex:none;width:12px;height:2px;border-radius:2px;background:var(--sec);
  margin-right:-4px;}
.pel .bband > span:first-of-type{flex:1;}
.pel .bbandright{flex:none;letter-spacing:.04em;text-transform:none;font-weight:600;
  font-family:'JetBrains Mono',ui-monospace,monospace;color:var(--ink2);}

/* ---------- Kennzahlenkacheln ---------- */
.pel .bstats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:0 14px;}
.pel .bstats.two{grid-template-columns:1fr 1fr;}
.pel .btile{border:1px solid var(--rule);border-radius:10px;padding:9px 9px 10px;min-width:0;
  background:color-mix(in srgb, var(--ink) 3%, transparent);display:flex;flex-direction:column;}
.pel .btile.wide{grid-column:span 3;}
.pel .bstats.two .btile.wide{grid-column:span 2;}
/* Feste Mindesthöhe für Bezeichnung und Zusatz: zwei Kacheln nebeneinander
   haben unterschiedlich lange Beschriftungen, und ohne die Mindesthöhe stehen
   ihre Werte auf verschiedenen Linien — die Zeile liest sich dann nicht mehr
   als Zeile. Der Erklär-Punkt läuft im Text mit, statt eine eigene Zeile zu
   erzwingen (deshalb kein Flex-Container). */
.pel .btilelab{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);
  font-weight:600;line-height:1.35;min-height:23px;}
/* Geldbeträge sind hier bis zu elf Zeichen lang ("105,0 Mio. €"). In der
   Ziffernschrift passen sie bei 14,5 px in eine Drittelspalte auf 390 px —
   bei 16 px liefen sie über den Rand der Kachel hinaus. */
.pel .btileval{font-size:14.5px;font-weight:600;line-height:1.3;margin-top:5px;white-space:nowrap;
  letter-spacing:-.03em;overflow:hidden;text-overflow:ellipsis;}
.pel .btileval.teal{color:var(--teal);} .pel .btileval.ox{color:var(--ox);}
.pel .btileval.gold{color:var(--gold);} .pel .btileval.dim{color:var(--ink2);}
.pel .btilesub{font-size:9.5px;line-height:1.35;color:var(--ink2);margin-top:4px;min-height:26px;
  overflow:hidden;}
.pel .btilesub.teal{color:var(--teal);} .pel .btilesub.ox{color:var(--ox);}
/* Drei Spalten auf einem 390-px-Gerät lassen der Zahl rund 96 px. Ein
   Geldbetrag ("105,0 Mio. €") braucht in der Ziffernschrift bei 14,5 px etwa
   100 px und wurde dort abgeschnitten. */
@media (max-width:405px){
  .pel .btileval{font-size:13px;}
}
/* Unter 380 px reichen drei Spalten auch bei 13 px nicht mehr für einen
   Geldbetrag. Ab dort stehen nur noch zwei Kacheln nebeneinander, und in denen
   ist wieder Platz für die volle Schriftgröße. */
@media (max-width:379px){
  .pel .bstats{grid-template-columns:1fr 1fr;}
  .pel .bstats .btile.wide{grid-column:span 2;}
  .pel .btileval{font-size:14.5px;}
}

/* ---------- Messbalken ---------- */
.pel .bmeters{padding:11px 14px 0;display:flex;flex-direction:column;gap:9px;}
.pel .bmhead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:4px;}
.pel .bmlab{font-size:10.5px;color:var(--ink2);display:flex;align-items:center;gap:2px;}
.pel .bmval{font-size:12px;font-weight:600;white-space:nowrap;}
.pel .bmval.teal{color:var(--teal);} .pel .bmval.ox{color:var(--ox);} .pel .bmval.gold{color:var(--gold);}
.pel .bmeter{position:relative;height:6px;border-radius:99px;background:var(--rule);overflow:visible;}
.pel .bmeter i{display:block;height:100%;border-radius:99px;background:var(--sec);
  transition:width .45s cubic-bezier(.22,.9,.34,1);}
.pel .bmeter i.teal{background:var(--teal);} .pel .bmeter i.ox{background:var(--ox);}
.pel .bmeter i.gold{background:var(--gold);} .pel .bmeter i.neutral{background:var(--ink2);}
.pel .bmeter b{position:absolute;top:-3px;width:2px;height:12px;border-radius:1px;
  background:var(--ink);opacity:.55;transform:translateX(-1px);}
@media (prefers-reduced-motion:reduce){.pel .bmeter i{transition:none;}}

/* ---------- Notenplakette ---------- */
.pel .bgrade{display:flex;align-items:center;gap:12px;margin:12px 14px 0;padding:11px 12px;
  border:1px solid var(--rule);border-radius:12px;
  background:color-mix(in srgb, var(--ink) 3%, transparent);}
.pel .bhex{flex:none;width:44px;height:49px;display:flex;align-items:center;justify-content:center;
  font-size:21px;font-weight:800;letter-spacing:-.02em;color:var(--card);
  clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:var(--ink2);}
.pel .bhex.gold{background:var(--gold);color:#1A1508;}
.pel .bhex.teal{background:var(--teal);color:#06201B;}
.pel .bhex.ox{background:var(--ox);color:#2A0C09;}
.pel .bhex.neutral{background:var(--ink2);}
.pel .bgradebody{flex:1;min-width:0;}
.pel .bgradeval{font-size:19px;font-weight:650;line-height:1.15;margin:3px 0 6px;letter-spacing:-.02em;}
.pel .bgradeval small{font-size:11px;font-weight:400;color:var(--ink2);margin-left:2px;}
.pel .bgradesub{font-size:10.5px;color:var(--ink2);margin-top:6px;line-height:1.4;}

/* ---------- Netzdiagramm ---------- */
.pel .bprofile{display:flex;align-items:center;gap:6px;padding:8px 14px 0;}
.pel .bradar{flex:none;width:132px;}
.pel .bradar svg{width:100%;display:block;}
.pel .bradarnote{font-size:9.5px;color:var(--ink2);text-align:center;margin-top:-2px;}
.pel .bprofile .bmeters{flex:1;min-width:0;padding:0;}
.pel .bprofile .bgrade{margin:0;flex:1;min-width:0;}
.pel .bmsub{font-size:9.5px;color:var(--ink2);margin-top:4px;line-height:1.35;}
/* Unter 340 px stehen Netzdiagramm und Plakette nebeneinander zu eng — sie
   stapeln dann, statt beide unleserlich zu werden. */
@media (max-width:339px){
  .pel .bprofile{flex-direction:column;align-items:stretch;}
  .pel .bradar{width:100%;max-width:170px;margin:0 auto;}
}

/* ---------- Fuß: Preisschild und Handlungsfläche ---------- */
.pel .bfoot{margin:14px 14px 14px;padding:12px 13px;border-radius:12px;
  background:color-mix(in srgb, var(--sec) 8%, transparent);
  border:1px solid color-mix(in srgb, var(--sec) 26%, var(--rule));}
.pel .bfoot .bfrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  font-size:12px;padding:5px 0;}
.pel .bfoot .bfrow + .bfrow{border-top:1px dashed color-mix(in srgb, var(--sec) 22%, var(--rule));}
.pel .bfoot .bflab{color:var(--ink2);display:flex;align-items:center;gap:2px;}
.pel .bfoot .bfval{font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;
  font-weight:600;white-space:nowrap;}
/* Die Rechnung unter den Reglern: abgesetzt, weil sie sich mit ihnen bewegt. */
.pel .bfoot .bfnums{margin-top:14px;padding-top:4px;
  border-top:1px dashed color-mix(in srgb, var(--sec) 26%, var(--rule));}
/* Die Schlagkraft der Karte: Implied MoM beziehungsweise Total Value. Steht wie
   auf einer Spielkarte unten rechts und ist die größte Zahl im Fuß. */
.pel .bpower{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-top:10px;padding-top:10px;border-top:1px solid color-mix(in srgb, var(--sec) 26%, var(--rule));}
.pel .bpowerlab{font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink2);
  font-weight:700;line-height:1.4;display:flex;align-items:center;gap:3px;flex-wrap:wrap;}
.pel .bpowerval{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:27px;font-weight:700;
  letter-spacing:-.03em;line-height:1;white-space:nowrap;}
.pel .bpowerval.teal{color:var(--teal);} .pel .bpowerval.ox{color:var(--ox);}
.pel .bpowerval.gold{color:var(--gold);} .pel .bpowerval.dim{color:var(--ink2);}

/* Regler im Kartenfuß. Der Systemregler übernimmt im dunklen Theme die
   Fahrbahn des Betriebssystems — hell und flächig — und stand damit als
   hellster Balken der Karte über allem anderen. Hier bekommt er die Form, die
   zur Karte gehört: schmale Fahrbahn in der Trennfarbe, Griff in der
   Sektorfarbe. Beide Herstellerpräfixe sind nötig, WebKit und Gecko teilen
   sich keinen Selektor dafür. */
.pel .bcard input[type=range]{-webkit-appearance:none;appearance:none;width:100%;
  background:transparent;margin:8px 0 2px;height:20px;cursor:pointer;}
.pel .bcard input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:99px;
  background:var(--rule);}
.pel .bcard input[type=range]::-moz-range-track{height:6px;border-radius:99px;background:var(--rule);}
.pel .bcard input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
  width:19px;height:19px;border-radius:50%;margin-top:-6.5px;background:var(--sec);
  border:2px solid var(--card);box-shadow:0 0 0 1px color-mix(in srgb, var(--sec) 70%, transparent),
  0 2px 6px rgba(0,0,0,.35);}
.pel .bcard input[type=range]::-moz-range-thumb{width:19px;height:19px;border-radius:50%;
  background:var(--sec);border:2px solid var(--card);
  box-shadow:0 0 0 1px color-mix(in srgb, var(--sec) 70%, transparent),0 2px 6px rgba(0,0,0,.35);}
.pel .bcard input[type=range]:focus-visible{outline:2px solid var(--gold);outline-offset:3px;
  border-radius:99px;}
.pel .bdial{margin-top:12px;}
.pel .bdial + .bdial{margin-top:14px;}
.pel .bfoot > .bdial:first-child{margin-top:0;}

/* ---------- Regalkarte (kompakte Portfolio-Übersicht) ---------- */
.pel .bshelf{display:flex;gap:11px;align-items:center;margin:9px 16px;padding:11px 12px;
  border-radius:13px;cursor:pointer;text-align:left;width:calc(100% - 32px);
  background:linear-gradient(100deg,color-mix(in srgb, var(--sec) 16%, var(--card)),var(--card) 62%);
  border:1px solid color-mix(in srgb, var(--sec) 30%, var(--rule));
  transition:transform .14s cubic-bezier(.34,1.56,.64,1),border-color .15s ease,box-shadow .15s ease;}
.pel .bshelf:hover{border-color:color-mix(in srgb, var(--sec) 65%, var(--rule));
  box-shadow:0 10px 22px -16px color-mix(in srgb, var(--sec) 90%, transparent);background:
  linear-gradient(100deg,color-mix(in srgb, var(--sec) 16%, var(--card)),var(--card) 62%);color:var(--ink);}
.pel .bshelf:active{transform:scale(.985);}
.pel .bshelfcrest{flex:none;width:32px;height:32px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;color:var(--sec);background:color-mix(in srgb, var(--sec) 16%, transparent);
  border:1px solid color-mix(in srgb, var(--sec) 38%, transparent);}
.pel .bshelfcrest .bemb{width:17px;height:17px;}
/* Die Kinder sind <span>, weil die ganze Kachel ein <button> ist — ohne
   display:block flössen sie als Fließtext um die Sparkline herum und
   überlagerten sie. */
.pel .bshelfmain{flex:1;min-width:0;display:block;}
.pel .bshelfname{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:650;
  letter-spacing:-.015em;white-space:nowrap;overflow:hidden;}
.pel .bshelfname i{flex:none;}
.pel .bshelfname span{overflow:hidden;text-overflow:ellipsis;}
.pel .bshelfmeta{display:block;font-size:10.5px;color:var(--ink2);margin-top:3px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.pel .bshelfspark{width:56px;height:24px;flex:none;display:block;}
.pel .bshelfmoic{flex:none;text-align:right;min-width:56px;display:block;}
.pel .bshelfmoic .v{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:16px;
  font-weight:700;line-height:1.15;letter-spacing:-.02em;}
.pel .bshelfmoic .l{display:block;font-size:8.5px;letter-spacing:.11em;text-transform:uppercase;
  color:var(--ink2);font-weight:600;margin-top:1px;}
.pel .bslot{margin:9px 16px;padding:16px 12px;border-radius:13px;border:1px dashed var(--rule);
  text-align:center;font-size:12px;color:var(--ink2);
  background:repeating-linear-gradient(135deg,transparent,transparent 9px,
    color-mix(in srgb, var(--ink) 3%, transparent) 9px,color-mix(in srgb, var(--ink) 3%, transparent) 18px);}
.pel .bslot b{display:block;font-size:13px;color:var(--ink);font-weight:650;margin-bottom:3px;}

/* ---------- Reifegrade als Fähigkeitsbalken ---------- */
.pel .bability{padding:11px 14px 0;display:flex;flex-direction:column;gap:8px;}
.pel .babrow{display:flex;align-items:center;gap:9px;}
/* Spaltenbreite nach dem längsten Wort ("Performance"): mit 78 px und dem
   weiteren Sperrsatz lief es über die Fähigkeitsbalken daneben. */
.pel .bablab{width:92px;flex:none;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink2);font-weight:650;white-space:nowrap;}
.pel .babpips{display:flex;gap:3px;flex:1;min-width:0;}
.pel .babpip{flex:1;height:8px;border-radius:2px;background:var(--rule);
  transform:skewX(-16deg);opacity:.55;}
.pel .babpip.on{opacity:1;}
.pel .babpip.half{opacity:.6;}
.pel .babpip.p{background:var(--gold);} .pel .babpip.l{background:var(--teal);}
.pel .babpip.a{background:#8478BE;}
.pel .babst{flex:none;min-width:74px;text-align:right;font-size:9.5px;color:var(--ink2);
  font-weight:600;letter-spacing:.02em;}
.pel .babst.warn{color:var(--ox);} .pel .babst.run{color:var(--gold);}

/* ---------- Handlungsflächen ---------- */
.pel .bacts{padding:12px 14px 0;}
.pel .bactgrid{display:flex;gap:8px;}
.pel .bactgrid > *{flex:1;min-width:0;}
.pel .bcard .hint{padding:0;}
.pel .bnote{margin:12px 14px 0;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.5;
  border:1px solid var(--rule);color:var(--ink2);}
.pel .bnote.gold{border-color:color-mix(in srgb, var(--gold) 45%, transparent);color:var(--gold);
  background:color-mix(in srgb, var(--gold) 8%, transparent);}
.pel .bnote.ox{border-color:color-mix(in srgb, var(--ox) 45%, transparent);color:var(--ox);
  background:color-mix(in srgb, var(--ox) 8%, transparent);}
.pel .bnote b{color:var(--ink);font-weight:650;}
.pel .bnote.gold b{color:var(--gold);}

/* Positionsreihe im Kartenlook */
.pel .bseats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:0 14px;}
.pel .bseat{border:1px solid var(--rule);border-radius:10px;padding:9px 5px;text-align:center;
  background:color-mix(in srgb, var(--ink) 3%, transparent);}
.pel .bseat .rn{font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink2);
  font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bseat .sk{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:17px;font-weight:700;
  line-height:1.45;letter-spacing:-.02em;}
.pel .bseat .rn2{font-size:9px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .bseat.vac{border-color:var(--ox);border-style:dashed;}
.pel .bseat.vac .sk{color:var(--ox);}
.pel .bseat.busy{border-color:var(--gold);}
.pel .bseat.busy .sk{color:var(--gold);}
.pel .bseat:hover:not(:disabled){background:color-mix(in srgb, var(--sec) 12%, transparent);
  border-color:color-mix(in srgb, var(--sec) 55%, var(--rule));color:var(--ink);}
`;
