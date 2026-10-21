"use client";

/* Manager-Draft: die Shortlist als Deck aus Battle Cards, die Führung einer
   Beteiligung als Mini-Karten und der Top-Team-Fit als Chemie aus gleich
   ausgerichteten Charakteren (siehe chemOf in lib/engine).

   Zwei Eigenschaften tragen die Gestaltung, beide ohne Beschriftung:
   - Seltenheit (Bronze, Silber, Gold nach Assessment-Score): Metall für
     Rahmen, Score und Schild. Gold trägt einen seltenen Glanz über die Karte.
   - Haltung: die Oberfläche der Karte, Elfenbein oder fast schwarz, dazu eine
     weiße oder schwarze Scheibe. "Hell" und "dunkel" stehen nirgends als Text.

   Gerechnet wird ausschließlich mit den Engine-Funktionen, mit denen auch die
   Auswertung rechnet (effSkill, initSuccess, initDurationOf, mgmtFx, chemOf).
   Die Draft-Karte zeigt das Profil aus dem Assessment (shownProf), eine
   Schätzung; mit der Verpflichtung steht das wahre Profil auf der Karte.  */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CHEM, CHEM_LABEL, COMPETENCIES, INITS, MANAGER_ARCHES, MANAGER_TRAITS, POACH, PROGRAM_COMP, ROLE3, TIERS,
  cappedSkill, chemOf, clamp, compOf, ebitdaOf, effSkill, eur, fitOf, initDurationOf, initSuccess,
  isCapped, mgmtFx, payOf, PORTRAIT_POOL, portraitPool, portraitUrl, retainerOf, seatFromCand, severanceOf,
  signBonusOf, teamScoreOf, tierOf,
} from "@/lib/engine";
import { seedOf } from "./battle";
import { haptic } from "./haptics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const SEATS = ["ceo", "cfo", "r3"];
const fmt = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
const signed = (v: number, d = 1) => (v >= 0 ? "+" : "−") + fmt(Math.abs(v), d);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const seatName = (seat: string, sector?: string) =>
  seat === "ceo" ? "CEO" : seat === "cfo" ? "CFO" : (ROLE3[sector || "Software"] || ROLE3.Software).n;

/* ---------- Porträt ----------
   Das Foto der Person in der Fassung ihrer Haltung: vor hellem Büro für
   helle, vor nächtlicher Skyline für dunkle Charaktere (PORTRAIT_POOL).
   `crop` zeigt den Kopf für die Mini-Karte. Fehlt ein Bild, zeichnet die
   Karte eine Büste, deterministisch aus Name, Porträtnummer, Geschlecht und
   Alter, mit demselben hellen oder dunklen Grund.                        */
const SKIN = ["#F1D1B5", "#E3B68F", "#C99067", "#9C6744", "#6E4630"];
const HAIR = ["#1E1B1A", "#4A3326", "#7A4E2D", "#B08A5A"];
const SUIT = ["#24313A", "#3A2E4A", "#1F3B39", "#40362C", "#2C3550"];
const STYLE = { f: ["bob", "long", "bun", "pixie"], m: ["crop", "side", "recede", "crop"] };
export function Bust({ k, side, crop = false }: { k: Any; side?: string; crop?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (k.portrait && !failed) {
    // Fertig skalierte WebP-Dateien aus public/manager, Größe kommt aus dem Kartenlayout
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={"dphoto" + (crop ? " crop" : "")} src={portraitUrl(k.portrait, side)} alt=""
      loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />;
  }
  const s = seedOf((k.name || k.label || "") + ":" + (k.pic ?? 0));
  const g = k.g === "f" ? "f" : "m";
  const skin = SKIN[(k.pic ?? s) % SKIN.length];
  const grey = (k.age || 45) >= 56;
  const hc = grey ? "#9AA0A6" : HAIR[(s >>> 3) % HAIR.length];
  const suit = SUIT[(s >>> 6) % SUIT.length];
  const style = STYLE[g][(s >>> 9) % 4];
  const glasses = (s >>> 12) % 3 === 0;
  const u = "b" + s.toString(36) + (side === "hell" ? "h" : "d");
  const hair = {
    crop: <path d="M126 92c0-30 22-46 44-46s44 16 44 46c-6-14-22-20-44-20s-38 6-44 20z" fill={hc} />,
    side: <path d="M124 98c-2-32 20-52 48-52s44 20 42 50c-10-18-30-26-56-22-14 2-26 10-34 24z" fill={hc} />,
    recede: <path d="M128 100c-2-26 14-48 42-48s44 22 42 48c-4-12-8-20-14-24-10 4-46 4-56 0-6 4-10 12-14 24z" fill={hc} />,
    bun: <><circle cx="170" cy="42" r="17" fill={hc} /><path d="M124 104c-4-36 18-58 46-58s50 22 46 58c-8-22-24-34-46-34s-38 12-46 34z" fill={hc} /></>,
    pixie: <path d="M124 100c-4-34 18-54 46-54s50 20 46 54c-6-10-14-18-24-22-14 6-38 6-56 0-6 6-10 14-12 22z" fill={hc} />,
    bob: <path d="M120 150c-10-60 8-104 50-104s60 44 50 104c-6 4-14 4-18 0 4-30-2-60-32-74-30 14-36 44-32 74-4 4-12 4-18 0z" fill={hc} />,
    long: <path d="M116 200c-14-80 0-154 54-154s68 74 54 154c-10 6-22 6-28-2 6-50 4-96-26-114-30 18-32 64-26 114-6 8-18 8-28 2z" fill={hc} />,
  }[style];
  const behind = style === "long" || style === "bob";
  const light = side === "hell";
  return (
    <svg className="dbust" viewBox={crop ? "96 34 148 116" : "0 0 340 230"} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={u} cx="74%" cy="16%" r="90%">
          <stop offset="0" stopColor={light ? "#FFFFFF" : "var(--tier)"} stopOpacity={light ? 1 : 0.5} />
          <stop offset=".6" stopColor={light ? "#EEF1F2" : "#1C282B"} />
          <stop offset="1" stopColor={light ? "#D9DEDF" : "#0C1214"} />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="340" height="230" fill={`url(#${u})`} />
      <g transform="translate(0,8)">
        {behind && hair}
        <path d="M70 230c6-48 40-70 100-70s94 22 100 70z" fill={suit} />
        <path d="M150 160l20 34 20-34z" fill="#E9EDEA" />
        <rect x="156" y="128" width="28" height="36" rx="10" fill={skin} />
        <ellipse cx="170" cy="104" rx="38" ry="46" fill={skin} />
        {!behind && hair}
        {glasses && (
          <g fill="none" stroke="#12201F" strokeWidth="3" opacity=".75">
            <rect x="141" y="98" width="24" height="16" rx="6" /><rect x="175" y="98" width="24" height="16" rx="6" />
            <path d="M165 105h10" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* Haltung als Zeichen: weiße oder schwarze Scheibe, ohne Text. */
export function SideDot({ side, big = false }: { side?: string; big?: boolean }) {
  if (!side) return null;
  return <i className={"dside " + side + (big ? " big" : "")} aria-hidden="true" />;
}

/* ---------- Rechnung für eine Karte ---------- */

// Die Beteiligung mit dieser Karte auf der Position, gerechnet mit dem Assessment
const withCard = (h: Any, seat: string, k: Any) =>
  ({ ...h, [seat]: { ...seatFromCand(k), prof: [...k.shownProf], skill: k.shown }, onboard: 0 });
// Dieselbe Beteiligung mit vakanter Position: Interim
const vacant = (h: Any, seat: string) => ({ ...h, [seat]: { skill: 0 }, onboard: 0 });

// Programme, auf die eine Position wirkt: der CEO auf alle, die anderen auf ihre Werkbank
function programsOf(seat: string) {
  const plat = INITS.plat.map((p: Any) => ({ p, dim: "plat", s: "cfo" }));
  const acc = INITS.acc.filter((p: Any) => !p.ma).map((p: Any) => ({ p, dim: "acc", s: "r3" }));
  return seat === "ceo" ? [...plat, ...acc] : seat === "cfo" ? plat : acc;
}
function progRate(c: Any, { p, dim, s }: Any) {
  if (p.req && !p.req(c)) return null;
  const E = effSkill(c, s, p.id);
  const risk = c[s].skill > 0 && c[s].trait === "risk" && p.cls === "hard";
  return {
    q: clamp(initSuccess(E, p.cls) + (p.sm || 0) + (risk ? 0.05 : 0), 0.1, 0.97),
    d: initDurationOf({ ...c, onboard: 0 }, dim, p.id),
  };
}
// Kurznamen der Programme für die Fit-Hinweise
const SHORT = { opex: "Cost-out", nwc: "NWC", erp: "ERP", ai: "KI", pen: "Pricing", exp: "Expansion", ma: "Add-on" };
// Deckel der Fachpositionen: Leadership des CEO + 1,5, ein vakanter CEO führt kommissarisch auf 2,0
const capOf = (h: Any) => (h && h.ceo ? (h.ceo.skill > 0 ? compOf(h.ceo, 2) : h.mx ? 2.0 : 0) + 1.5 : 5);

/* Fit zum Case: höchstens drei Hinweise, die eine Wahl begründen. Die Eignung
   eines Programms (fitOf) ist dieselbe Zahl, die der Maßnahmenpicker zeigt. */
function fitChips(k: Any, seat: string, h: Any) {
  const out: [string, string][] = [];
  const names = COMPETENCIES[seat];
  const v = k.shownProf;
  if (h) {
    if (seat === "ceo") {
      const need = [INITS.plat, INITS.acc.filter((p: Any) => !p.ma)].map((ps) => Math.max(...ps.map((p: Any) => fitOf(p.id, h))));
      [0, 1].forEach((i) => {
        if (v[i] >= 4 && need[i] >= 1.1) out.push(["hi", `${names[i]}: passt zum Case`]);
        else if (v[i] < 2.2 && need[i] >= 1.1) out.push(["lo", `Lücke bei ${names[i]}`]);
      });
      if (v[2] >= 3.6) out.push(["hi", "Hebt den Deckel fürs Team"]);
    } else {
      const dim = seat === "cfo" ? "plat" : "acc";
      [0, 1, 2].forEach((i) => {
        const ps = INITS[dim].filter((p: Any) => PROGRAM_COMP[p.id] === i && !p.ma);
        if (!ps.length) return;
        const best = ps.reduce((a: Any, b: Any) => (fitOf(b.id, h) > fitOf(a.id, h) ? b : a));
        const f = fitOf(best.id, h);
        if (v[i] >= 4 && f >= 1.1) out.push(["hi", `${SHORT[best.id] || best.n}: passt zum Case`]);
        else if (v[i] < 2.2 && f >= 1.1) out.push(["lo", `Lücke bei ${names[i]}`]);
      });
      if (seat === "r3" && v[2] >= 4) out.push(["hi", "Senkt das Add-on-Risiko"]);
      if (seat === "cfo") {
        const ai = INITS.plat.find((p: Any) => p.id === "ai");
        if (ai && ai.req && ai.req(withCard(h, seat, k)) && !ai.req(vacant(h, seat))) out.push(["hi", "Schaltet KI frei"]);
      }
      if (Math.max(...v) > capOf(h)) out.push(["lo", "Über dem Leadership-Deckel"]);
    }
  }
  if (k.dev) out.push(["", "Wächst +0,25 je Halbjahr"]);
  return out.slice(0, 3);
}

/* Laufende Wirkung gegen einen Vergleich, in den Einheiten, in denen mgmtFx rechnet. */
function runDeltas(base: Any, sim: Any) {
  if (!base || !base.mx) return null;
  const a = mgmtFx(base), b = mgmtFx(sim);
  return [
    { k: "Marge", v: b.margin - a.margin, u: " pp", good: 1 },
    { k: "Wachstum p. a.", v: b.growth - a.growth, u: " pp", good: 1 },
    { k: "Kapitalbindung", v: b.nwc - a.nwc, u: " pp", good: -1 },
    { k: "Zinsmarge", v: (b.rate - a.rate) * 100, u: " bp", good: -1, d: 0 },
    { k: "Capex", v: b.capex - a.capex, u: " pp", good: -1 },
  ].filter((r) => Math.abs(r.v) >= (r.d === 0 ? 0.5 : 0.05));
}

/* Porträt eines Amtsinhabers, fest aus Firma und Position. Die drei
   Positionen ziehen nacheinander aus dem ganzen Pool ihres Geschlechts, jede
   ohne die Gesichter der vorigen: Zwei Amtsinhaber derselben Firma sehen
   nie gleich aus. Gezogen wird für alle drei Positionen, auch für besetzte
   oder vakante, damit ein Wechsel auf einer Position die anderen Gesichter
   nicht verschiebt. */
const SEAT_KEYS = ["ceo", "cfo", "r3"];
export function incumbentPortrait(name: string, seat: string, sector?: string, side?: string) {
  // Die Fachfunktion zieht aus dem Satz ihres Sektors, dort gibt es keine Überschneidung mit CEO und CFO
  if (seat === "r3" && sector) {
    const g = seedOf(name + seat) % 2 ? "f" : "m";
    const pool = portraitPool(g, seat, sector, side);
    const [id, age] = pool[seedOf(name + ":" + seat) % pool.length];
    return { g, id, age };
  }
  const taken = new Set<string>();
  for (const k of SEAT_KEYS) {
    const g = seedOf(name + k) % 2 ? "f" : "m";
    const pool = PORTRAIT_POOL[g].filter(([id]) => !taken.has(id));
    const [id, age] = pool[seedOf(name + ":" + k) % pool.length];
    taken.add(id);
    if (k === seat) return { g, id, age };
  }
  return { g: "m", id: PORTRAIT_POOL.m[0][0], age: PORTRAIT_POOL.m[0][1] };
}

/* Die Karte einer Person, die schon auf der Position sitzt. Eine verpflichtete
   Karte trägt ihr wahres Profil. Ein Amtsinhaber aus der Zeit vor dem Kauf
   hat nur ein Rating und keine Karte. */
export function seatCardOf(c: Any, seat: string) {
  const s = c[seat];
  if (!(s.skill > 0)) return null;
  if (!s.prof || !s.name) {
    const { g, id, age } = incumbentPortrait(c.name, seat, c.sector, s.side);
    return {
      label: "Seit dem Kauf im Amt", name: g === "f" ? "Amtsinhaberin" : "Amtsinhaber", incumbent: true,
      g, portrait: id, pic: seedOf(c.name + ":" + seat) % 16, age, origin: "Mittelstand",
      shown: s.skill, shownProf: [s.skill, s.skill, s.skill], span: 0, side: s.side, poach: s.poach ?? 1, dev: !!s.dev,
      note: "Saß schon vor dem Kauf in der Geschäftsführung. Das Rating stammt aus der Management-Due-Diligence.",
    };
  }
  const arch = (MANAGER_ARCHES[seat] || []).find((a: Any) => a.key === s.arch);
  return { ...s, shown: mean(s.prof), shownProf: s.prof, span: 0, note: arch ? arch.note : "" };
}

/* ---------- Battle Card ----------
   mode "draft": eine Kandidatin auf der Shortlist, verglichen mit heute.
   mode "seat":  die Person auf der Position, verglichen mit einer Vakanz —
                 genau das kostet es, sie ziehen zu lassen.                */
function CompBars({ names, vals, span, cap }: Any) {
  const pos = (v: number) => ((clamp(v, 1, 5) - 1) / 4) * 100 + "%";
  return (
    <div className="dstats">
      {names.map((n: string, i: number) => {
        const v = vals[i];
        const lo = clamp(v - span, 1, 5), hi = clamp(v + span, 1, 5);
        return (
          <div className="dstat" key={n}>
            <span className="k">{n}</span>
            <span className="bar">
              {span > 0 && <span className="rng" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />}
              <span className="pt" style={{ left: `calc(${pos(v)} - 1.5px)` }} />
              {cap < 5 && <span className="cap" style={{ left: pos(cap) }} title="Deckel durch die Leadership des CEO" />}
            </span>
            <span className="v mono">{span > 0 ? `${fmt(lo)}–${fmt(hi)}` : fmt(v)}{v > cap ? " ▲" : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BattleCard({ k, seat, h, sector, precise = false, flipped, onFlip, mode = "draft" }: Any) {
  const span = mode === "seat" ? k.span : precise ? 0.5 : k.span;
  const tier = tierOf(k.shown);
  const eb = h ? ebitdaOf(h) : 10;
  const sim = h ? (mode === "seat" ? { ...h, onboard: 0 } : withCard(h, seat, k)) : null;
  const base = h ? (mode === "seat" ? vacant(h, seat) : { ...h, onboard: 0 }) : null;
  const tr = MANAGER_TRAITS[k.trait];
  const cap = seat === "ceo" ? 5 : capOf(h);
  const chem = sim && sim.mx ? chemOf(sim) : null;
  const chips = mode === "seat" ? (k.dev ? [["", "Wächst +0,25 je Halbjahr"]] : []) : fitChips(k, seat, h);
  // Team-Score vor und nach der Verpflichtung, mit dem Assessment gerechnet
  const tmA = mode === "draft" && base ? teamScoreOf(base) : null;
  const tmB = mode === "draft" && sim ? teamScoreOf(sim) : null;
  const tmCls = tmA == null ? "" : tmB - tmA > 0.05 ? "hi" : tmB - tmA < -0.05 ? "lo" : "";
  const progs = h ? programsOf(seat).map((x) => ({ ...x, now: progRate(base, x), new: progRate(sim, x) })) : [];
  const run = h ? runDeltas(base, sim) : null;
  const pay = payOf(seat, k.shown, eb);
  const had = mode === "draft" && h && h[seat] && h[seat].skill > 0;
  const last = k.incumbent ? "dieser Besetzung" : (k.name || "").split(" ").slice(-1)[0];
  const side = k.side || "dunkel";
  return (
    <div className={"dcard" + (flipped ? " flip" : "")} data-tier={tier} data-side={side}>
      <div className="dface front">
        <button type="button" className="dtap" onClick={onFlip} aria-label="Karte umdrehen" />
        <div className="din">
          <div className="dportrait">
            <Bust k={k} side={side} />
            <div className="dovr"><span className="v mono">{fmt(k.shown)}</span><span className="l">{mode === "seat" ? "Score" : "Assessment"}</span></div>
            <div className="dbadges">
              <span className="dtier"><span>{TIERS[tier]}</span></span>
              <SideDot side={k.side} big />
            </div>
            <div className="did">
              <div className="darch">{k.label}</div>
              <div className="dname">{k.name}</div>
              <div className="dmeta">{seatName(seat, sector)}{k.origin ? ` · Herkunft ${k.origin}` : ""}</div>
            </div>
          </div>
          <CompBars names={COMPETENCIES[seat]} vals={k.shownProf} span={span} cap={cap} />
          {tr && <div className="dtrait"><b>{tr.n}</b> · {tr.t}</div>}
          <div className="dchips">
            {/* Ein Chip fürs Team: Farbe, Team-Score vorher → nachher, eingespielt */}
            {tmA != null ? (
              <span className={"dchip " + tmCls}>
                {k.side && <SideDot side={k.side} />} Team-Score {fmt(tmA)} → {fmt(tmB)}{chem > 0 ? " · eingespielt" : ""}
              </span>
            ) : k.side && chem != null && (
              <span className={"dchip " + (chem > 0 ? "hi" : "")}><SideDot side={k.side} /> Team: {CHEM_LABEL(chem)}</span>
            )}
            {chips.slice(0, tmA != null ? 2 : 3).map(([t, x2]) => <span key={x2} className={"dchip " + t}>{x2}</span>)}
          </div>
          <div className="dfoot">
            <span>Fixum <b className="mono">{eur(pay)}</b> p. a.</span>
            <span className="dflip">Wirkung ›</span>
          </div>
        </div>
        {tier === "gold" && <i className="dfoil" />}
      </div>
      <div className="dface back">
        <button type="button" className="dtap" onClick={onFlip} aria-label="Zurück zur Vorderseite" />
        <div className="din pad">
          {h ? (
            <>
              <h4>{seat === "ceo" ? "Wirkung auf die Programme" : "Programme"} bei {h.name}</h4>
              <div className="dnote">
                {seat === "ceo" ? "Der CEO wirkt halb auf alle Programme mit; die Leadership deckelt die Fachpositionen. " : ""}
                Erfolgsquote mit {last}, Strich = {mode === "seat" ? "ohne Besetzung (Interim)" : "heute"}.{mode === "draft" ? " Gerechnet mit dem Assessment." : ""}
              </div>
              <div className="dprog">
                {progs.map(({ p, now, new: nw }) => {
                  if (!nw) return (
                    <React.Fragment key={p.id}><span className="n">{p.n}</span><span className="p dn">gesperrt</span><span className="d" /></React.Fragment>
                  );
                  const dl = now ? Math.round((nw.q - now.q) * 100) : null;
                  return (
                    <React.Fragment key={p.id}>
                      <span className="n">{p.n} · {nw.d} HJ</span>
                      <span className="p mono">{Math.round(nw.q * 100)} %{" "}
                        {dl == null ? <span className="up">neu</span> : dl !== 0 && <span className={dl > 0 ? "up" : "dn"}>{dl > 0 ? "+" : "−"}{Math.abs(dl)}</span>}
                      </span>
                      <span className="d"><i style={{ width: `${Math.round(nw.q * 100)}%` }} />
                        {now && <s style={{ left: `${Math.round(now.q * 100)}%` }} />}</span>
                    </React.Fragment>
                  );
                })}
              </div>
              <h4>Laufende Wirkung gegen {mode === "seat" ? "Vakanz" : "heute"}</h4>
              <div className="dnote">
                {run == null ? "Diese Beteiligung wurde vor dem 19.10.2026 gekauft; das Management wirkt hier nur über Programme."
                  : run.length === 0 ? "Kaum Unterschied."
                    : run.map((r, i) => (
                      <span key={r.k}>{i > 0 && " · "}{r.k}{" "}
                        <b className={r.v * r.good > 0 ? "up" : "dn"}>{signed(r.v, r.d ?? 1)}{r.u}</b></span>
                    ))}
              </div>
              {sim && sim.mx && (
                <>
                  <h4>{mode === "seat" ? "Top-Team" : "Top-Team nach der Verpflichtung"}</h4>
                  <TeamStrip c={sim} sector={sector} hi={seat} compact />
                </>
              )}
            </>
          ) : null}
          <h4>Werdegang</h4>
          <div className="dnote">{k.note}</div>
          <div className="dnote">
            {mode === "draft" ? `Sign-on ${eur(signBonusOf(seat, k.shown, eb))} · ` : ""}
            Retention-Risiko {fmt(POACH * k.shown * k.shown * (k.poach ?? 1) * 100)} % je HJ ·{" "}
            {k.dev ? "+0,25 je Halbjahr bis 4,5" : "Profil stabil"}
            {had ? ` · Abfindung Vorgänger ${eur(severanceOf(seat, h[seat].skill, eb))}` : ""}
          </div>
          <span className="dflip">‹ Vorderseite</span>
        </div>
        {tier === "gold" && <i className="dfoil" />}
      </div>
    </div>
  );
}

/* ---------- Teamstufe ----------
   Die drei Positionen mit ihrer Farbe und darunter die Chemie, die sich
   daraus ergibt. Dieselbe Zeile im Draft und auf der Rückseite der Karte. */
export function TeamStrip({ c, sector, hi = null, compact = false }: Any) {
  const v = chemOf(c);
  return (
    <div className="dteam">
      <div className="dteamrow">
        {SEATS.map((s) => (
          <span key={s} className={"dteamseat" + (s === hi ? " on" : "")}>
            {c[s].skill > 0 ? <SideDot side={c[s].side} /> : <i className="dside vac" aria-hidden="true" />}
            {seatName(s, sector)}
            {!compact && c[s].skill <= 0 && <small>vakant</small>}
          </span>
        ))}
      </div>
      <div className={"dteamlvl " + (v > 0 ? "hi" : "")}>
        {v > 0 ? `Eingespielt · jede Kompetenz +${fmt(v, 2)}` : "Neutral · eingespielt erst mit drei Positionen gleicher Farbe"}
      </div>
    </div>
  );
}

/* ---------- Draft-Ansicht ----------
   Wischen über natives Scroll-Snapping, eine Raste je Karte. Antippen
   irgendwo auf der Karte dreht sie um, in beide Richtungen. "Draften"
   verpflichtet die Karte in der Mitte.                                    */
export function Draft({ item, holding, analysis, hire, reject }: Any) {
  const seat = item.seat;
  const sector = holding ? holding.sector : undefined;
  const precise = analysis >= 4;
  const deck = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  const cards = item.cands;
  const onScroll = () => {
    const el = deck.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, bd = 1e9;
    Array.from(el.children).forEach((s: Any, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== cur) { setCur(best); haptic("select"); }
  };
  const go = (i: number) => {
    const el = deck.current, s = el && (el.children[i] as HTMLElement);
    if (el && s) el.scrollTo({ left: s.offsetLeft - (el.clientWidth - s.offsetWidth) / 2, behavior: "smooth" });
  };
  const k = cards[cur];
  const team = useMemo(() => (holding && holding.mx ? holding : null), [holding]);
  return (
    <div className="modal">
      <div className="sheet ddraft">
        <div className="dhead">
          <div className="sub">Shortlist · {seatName(seat, sector)}</div>
          <div className="dtitle">{item.name}</div>
          {team && <TeamStrip c={team} sector={sector} hi={seat} />}
        </div>
        <div className="ddeck" ref={deck} onScroll={onScroll}>
          {cards.map((c: Any, i: number) => (
            <div className="dslot" key={i}>
              <BattleCard k={c} seat={seat} h={holding} sector={sector} precise={precise}
                flipped={!!flip[i]} onFlip={() => { haptic("tap"); setFlip((f) => ({ ...f, [i]: !f[i] })); }} />
            </div>
          ))}
        </div>
        <div className="ddots">
          {cards.map((_: Any, i: number) => (
            <button key={i} className={i === cur ? "on" : ""} aria-label={`Karte ${i + 1}`} onClick={() => go(i)} />
          ))}
        </div>
        <div className="dbar">
          <button onClick={() => reject(item)}>Alle ablehnen</button>
          <button className="solid" onClick={() => { haptic("confirm"); hire(item, k); }}>
            {k && k.name ? `${k.name.split(" ")[0]} draften` : "Draften"}
          </button>
        </div>
        <p className="dhint">
          {precise ? "Due Diligence 4+: enge Assessment-Bandbreite. " : "Ohne Referenzen ist die Bandbreite breit. "}
          Mit der Verpflichtung steht das wahre Profil fest, es kann von der Schätzung abweichen. Eine Fachposition wirkt höchstens bis Leadership des CEO +1,5 (gestrichelte Linie).
          {holding && holding.mx ? ` Haben alle drei Positionen dieselbe Farbe, ist das Team eingespielt: jede Kompetenz wirkt um ${fmt(CHEM, 2)} besser.` : ""}
          {" "}Ablehnen kostet den halben Retainer und ein weiteres Halbjahr Suche.
        </p>
      </div>
    </div>
  );
}

/* ---------- Mini-Karte im Führungsbereich ----------
   Metallrahmen nach Seltenheit, Oberfläche nach Haltung, Porträt als
   Ausschnitt, darunter Position, Score und Name.                         */
export function SeatCard({ c, seat, nm, searching, se, onClick, className = "" }: Any) {
  const s = c[seat];
  const k = seatCardOf(c, seat);
  if (searching || !k) {
    return (
      <button className={("bseat dseat" + (searching ? " busy" : " vac pulse") + " " + className).trim()} disabled={searching} onClick={onClick}>
        <span className={"dmini empty" + (searching ? "" : " vac")}>
          {searching && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>}
        </span>
        <div className="rn">{nm}</div>
        <div className="sk">{searching ? (se.waiting ? "Shortlist" : "Suche") : "—"}</div>
        <div className="rn2">{searching ? (se.waiting ? "liegt vor" : "läuft") : "vakant · besetzen"}</div>
      </button>
    );
  }
  const tier = tierOf(s.skill);
  const label = s.name ? s.name.split(" ").slice(-1)[0]
    : isCapped(c, seat) ? `wirkt ${cappedSkill(c, seat).toFixed(1)}` : "Amtsinhaber";
  return (
    <button className={("dmc " + className).trim()} data-tier={tier} data-side={s.side || "dunkel"}
      onClick={onClick} aria-label={`${nm}${s.name ? " " + s.name : ""}, Karte öffnen`}>
      <span className="dmcin">
        <span className="dmcpic">
          {/* Seltenheit zeigt der Rahmen, die Farbe Oberfläche und Foto: keine Schilder */}
          <Bust k={k} side={s.side} crop />
        </span>
        <span className="dmcrole">{nm}</span>
        <span className="dmcsk mono">{fmt(s.skill)}</span>
        <span className="dmcsub">{label}</span>
      </span>
      {tier === "gold" && <i className="dfoil" />}
    </button>
  );
}

/* ---------- Karte einer besetzten Position ----------
   Antippen einer Mini-Karte öffnet die Battle Card der Person. Von hier aus
   lässt sich ein Ersatz suchen: Die Person geht dann sofort, die Abfindung
   fällt an, und die Position ist bis zur Verpflichtung vakant
   (vacateForSearch in lib/engine).                                       */
export function SeatSheet({ c, seat, close, search }: Any) {
  const [flipped, setFlipped] = useState(false);
  const [ask, setAsk] = useState(false);
  /* Per Portal in die .pel-Wurzel, wie Info(): Die Beteiligungskarte trägt
     durch ihre Einblend-Animation einen transform-Wert und würde das Sheet
     sonst in sich einsperren. */
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });
  useEffect(() => {
    setHost(anchor.current?.closest(".pel") ?? document.body);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const k = seatCardOf(c, seat);
  if (!k) return null;
  const nm = seatName(seat, c.sector);
  const eb = ebitdaOf(c);
  const who = k.incumbent ? `den ${nm}` : k.name;
  const leaving = k.incumbent ? "Die bisherige Besetzung" : k.name.split(" ").slice(-1)[0];
  const sheet = (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`${nm} · ${c.name}`} onClick={close}>
      <div className="sheet ddraft dseatsheet" onClick={(e) => e.stopPropagation()}>
        <div className="dhead">
          <div className="sub">{nm} · {c.name}</div>
        </div>
        <div className="dsolo">
          <BattleCard k={k} seat={seat} h={c} sector={c.sector} mode="seat" flipped={flipped}
            onFlip={() => { haptic("tap"); setFlipped((f) => !f); }} />
        </div>
        {!ask ? (
          <div className="dbar">
            <button onClick={close}>Schließen</button>
            <button className="ox" onClick={() => { haptic("tap"); setAsk(true); }}>Ersatz suchen</button>
          </div>
        ) : (
          <div className="dask">
            <div className="dasktitle">Ersatz für {who} suchen?</div>
            <p>
              Mit dem Suchmandat beginnt die Suche. {leaving} verlässt das Unternehmen.
              Bis zur Verpflichtung ist die Position vakant: Programme und laufende Wirkung rechnen mit einem Interim auf 2,0.
              Die Shortlist kommt im Halbjahr danach.
            </p>
            <div className="daskrows">
              <span>Team-Score bis zur Neubesetzung</span>
              <span className="mono">{fmt(teamScoreOf(c))} → {fmt(teamScoreOf({ ...c, [seat]: { skill: 0 } }))}</span>
              <span>Abfindung (zwölf Monatsgehälter)</span><span className="mono">{eur(severanceOf(seat, c[seat].skill, eb))}</span>
              <span>Retainer Headhunter</span><span className="mono">{eur(retainerOf(seat, eb))}</span>
            </div>
            <div className="dbar">
              <button onClick={() => setAsk(false)}>Abbrechen</button>
              <button className="solid oxs" onClick={() => { haptic("confirm"); search(seat); close(); }}>Suche starten</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  return <><span ref={anchor} hidden />{host && createPortal(sheet, host)}</>;
}

export const DRAFT_CSS = `
/* ============================================================
   MANAGER-DRAFT — Deck, Battle Cards, Mini-Karten
   Seltenheit = Metall (data-tier), Haltung = Oberfläche (data-side).
   ============================================================ */
.pel [data-tier="bronze"]{--metal:linear-gradient(135deg,#5E3A20 0%,#A8693F 24%,#F0C49A 46%,#C98D5E 60%,#6E4426 100%);
  --tglow:rgba(168,105,63,.6);--tondark:#E2B48C;--tier:#C48F66;}
.pel [data-tier="silber"]{--metal:linear-gradient(135deg,#5F6A6F 0%,#9AA6AB 24%,#F5F8F9 46%,#C9D3D7 60%,#6F7B80 100%);
  --tglow:rgba(150,165,170,.6);--tondark:#DCE3E5;--tier:#A9B6B8;}
.pel [data-tier="gold"]{--metal:linear-gradient(135deg,#7A5512 0%,#C0912F 24%,#FBE7A6 46%,#D9AE4E 60%,#8A6416 100%);
  --tglow:rgba(214,170,70,.8);--tondark:#F6D98E;--tier:#DCB264;}
.pel [data-side="hell"]{--cs-surf:#F7F3E8;--cs-ink:#14201F;--cs-ink2:#56645F;--cs-track:#E3DCCB;--cs-trait:#EEE8D9;
  --cs-hair:rgba(20,32,31,.10);--cs-good:#17695C;--cs-goodbg:rgba(23,105,92,.12);--cs-bad:#A33A32;--cs-chip:#ECE6D6;
  --cs-chipink:#3E4B49;--cs-cap:#B4443C;--cs-ring:rgba(20,32,31,.30);
  --cs-foil:linear-gradient(105deg,transparent 30%,rgba(233,198,106,.20) 42%,rgba(255,247,214,.62) 50%,rgba(233,198,106,.20) 58%,transparent 70%);
  --cs-foilmix:normal;}
.pel [data-side="dunkel"]{--cs-surf:#10171A;--cs-ink:#EDF1EE;--cs-ink2:#9AA8A6;--cs-track:#243033;--cs-trait:#182226;
  --cs-hair:rgba(255,255,255,.08);--cs-good:#5FC4B1;--cs-goodbg:rgba(95,196,177,.16);--cs-bad:#EC9F95;--cs-chip:#1C282B;
  --cs-chipink:#C9D2D0;--cs-cap:#E3897F;--cs-ring:rgba(255,255,255,.70);
  --cs-foil:linear-gradient(105deg,transparent 30%,rgba(255,236,170,.22) 42%,rgba(255,255,255,.34) 50%,rgba(255,236,170,.22) 58%,transparent 70%);
  --cs-foilmix:screen;}
.pel [data-tier="bronze"][data-side="hell"]{--tink:#8A5530;} .pel [data-tier="bronze"][data-side="dunkel"]{--tink:#D9A77D;}
.pel [data-tier="silber"][data-side="hell"]{--tink:#56646A;} .pel [data-tier="silber"][data-side="dunkel"]{--tink:#BCC7CB;}
.pel [data-tier="gold"][data-side="hell"]{--tink:#86641A;}   .pel [data-tier="gold"][data-side="dunkel"]{--tink:#E6BE62;}

.pel .ddraft{background:var(--panel);color:var(--onpanel);padding-bottom:max(14px, env(safe-area-inset-bottom, 0px));}
.pel .dhead{padding:16px 16px 4px;}
.pel .dhead .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);}
.pel .dtitle{font-size:22px;font-weight:700;letter-spacing:-.03em;margin:4px 0 8px;}

.pel .ddeck{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px 8% 6px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;}
.pel .ddeck::-webkit-scrollbar{display:none;}
.pel .dslot{flex:0 0 84%;max-width:340px;scroll-snap-align:center;perspective:1400px;}
.pel .dsolo{display:flex;justify-content:center;padding:12px 16px 0;perspective:1400px;}
.pel .dsolo .dcard{width:min(340px, 100%);}
.pel .ddots{display:flex;justify-content:center;gap:6px;padding-top:6px;}
.pel .ddots button{width:6px;height:6px;padding:0;border:0;border-radius:9px;background:#2E3C3F;transition:width .2s,background .2s;}
.pel .ddots button.on{width:18px;background:var(--gold);}
.pel .ddots button:hover:not(:disabled){background:var(--gold);}
.pel .dbar{display:flex;gap:10px;padding:14px 16px 0;}
.pel .dbar button{background:transparent;color:var(--onpanel);border-color:#2E3C3F;min-height:46px;}
.pel .dbar button.solid{flex:1;background:var(--gold);color:#12201F;border-color:var(--gold);font-weight:650;}
.pel .dbar button.solid:hover:not(:disabled){background:var(--gold);border-color:var(--gold);filter:brightness(1.08);}
.pel .dbar button.ox{flex:1;color:#E3897F;border-color:#E3897F;font-weight:650;}
.pel .dbar button.ox:hover:not(:disabled){background:#E3897F;color:#12201F;}
.pel .dbar button.solid.oxs{background:#E3897F;border-color:#E3897F;}
.pel .dhint{font-size:11.5px;line-height:1.5;color:#8E9C9B;margin:10px 16px 0;}
.pel .dask{margin:14px 0 0;padding:16px 0 0;border-top:1px solid #2E3C3F;}
.pel .dasktitle{font-size:17px;font-weight:700;letter-spacing:-.02em;padding:0 16px;}
.pel .dask p{font-size:13px;line-height:1.5;color:#C9D2D0;margin:8px 16px 0;}
.pel .daskrows{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;margin:12px 16px 0;font-size:13px;}
.pel .daskrows span:nth-child(odd){color:#8E9C9B;}

/* Battle Card: Vorder- und Rückseite, Metallrahmen, Oberfläche nach Haltung */
.pel .dcard{position:relative;height:min(552px, 68vh);min-height:480px;transform-style:preserve-3d;
  transition:transform .6s cubic-bezier(.2,.8,.2,1);}
.pel .dcard.flip{transform:rotateY(180deg);}
.pel .dface{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:20px;
  padding:2px;overflow:hidden;background:var(--metal);box-shadow:0 22px 46px -26px var(--tglow),0 2px 6px rgba(0,0,0,.18);}
.pel .dface.back{transform:rotateY(180deg);}
/* Die verdeckte Seite nimmt keine Eingaben an: Ihre Tippfläche läge sonst über der sichtbaren. */
.pel .dcard.flip .dface.front,.pel .dcard:not(.flip) .dface.back{pointer-events:none;}
.pel .dcard.flip .dface.front .dtap,.pel .dcard:not(.flip) .dface.back .dtap{visibility:hidden;}
.pel .dtap{position:absolute;inset:0;z-index:5;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:20px;
  background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.pel .dtap:hover:not(:disabled){background:transparent;}
.pel .din{position:relative;height:100%;box-sizing:border-box;border-radius:18px;overflow:hidden;background:var(--cs-surf);
  color:var(--cs-ink);display:flex;flex-direction:column;}
.pel .din.pad{padding:14px 15px;gap:8px;overflow-y:auto;}
.pel .dfoil{position:absolute;inset:0;z-index:3;border-radius:20px;pointer-events:none;background:var(--cs-foil);
  mix-blend-mode:var(--cs-foilmix);transform:translateX(-110%);animation:dfoil 12s ease-in-out 1.5s infinite;}
@keyframes dfoil{0%{transform:translateX(-110%);}20%,100%{transform:translateX(110%);}}
.pel .dportrait{position:relative;height:262px;max-height:48%;flex:none;overflow:hidden;}
.pel .dbust{position:absolute;inset:0;width:100%;height:100%;display:block;}
.pel .dphoto{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;object-position:50% 14%;
  user-select:none;-webkit-user-drag:none;}
.pel .dphoto.crop{object-position:50% 10%;transform:scale(1.35);transform-origin:50% 12%;}
.pel .dportrait:after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to bottom,transparent 38%,color-mix(in srgb, var(--cs-surf) 78%, transparent) 70%,var(--cs-surf) 96%);}
.pel .dovr{position:absolute;top:12px;left:12px;z-index:2;padding:8px 10px 7px;border-radius:12px;background:rgba(8,13,15,.52);
  text-align:center;line-height:1;}
.pel [data-side="hell"] .dovr{background:rgba(8,13,15,.8);}
.pel .dovr .v{font-size:34px;font-weight:700;display:block;background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;}
.pel .dovr .l{display:block;margin-top:4px;font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#D3DBD9;}
.pel .dbadges{position:absolute;top:14px;right:12px;z-index:2;display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
.pel .dtier{padding:2px;border-radius:99px;background:var(--metal);}
.pel .dtier span{display:block;padding:3px 10px;border-radius:99px;background:rgba(8,13,15,.78);font-size:10px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;color:var(--tondark);}
.pel .did{position:absolute;left:16px;right:16px;bottom:10px;z-index:2;}
.pel .darch{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--tink);font-weight:700;}
.pel .dname{font-size:22px;font-weight:800;letter-spacing:-.025em;line-height:1.15;margin-top:2px;}
.pel .dmeta{font-size:12px;color:var(--cs-ink2);margin-top:1px;}
.pel .dstats{flex:none;padding:10px 16px 0;display:flex;flex-direction:column;gap:6px;}
.pel .dstat{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:3px 8px;font-size:11.5px;}
.pel .dstat .k{grid-row:1;grid-column:1;color:var(--cs-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .dstat .v{grid-row:1;grid-column:2;font-size:11.5px;text-align:right;white-space:nowrap;}
.pel .dstat .bar{grid-row:2;grid-column:1 / -1;position:relative;height:7px;border-radius:9px;background:var(--cs-track);}
.pel .dstat .rng{position:absolute;top:0;bottom:0;border-radius:9px;background:color-mix(in srgb, var(--tink) 34%, transparent);}
.pel .dstat .pt{position:absolute;top:-2px;width:3px;height:11px;border-radius:2px;background:var(--tink);}
.pel .dstat .cap{position:absolute;top:-4px;bottom:-4px;width:0;border-left:1.5px dashed var(--cs-cap);}
.pel .dtrait{flex:none;margin:10px 16px 0;padding:8px 10px;border-radius:10px;background:var(--cs-trait);font-size:12px;line-height:1.4;color:var(--cs-ink2);}
.pel .dtrait b{color:var(--tink);font-weight:700;}
/* Die Chips geben als Erste nach, wenn die Karte voll ist: Die Fußzeile mit dem Fixum bleibt immer sichtbar. */
.pel .dchips{margin:8px 16px 0;display:flex;gap:6px;flex-wrap:wrap;flex:0 1 auto;min-height:24px;overflow:hidden;align-content:flex-start;}
.pel .dchip{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:4px 9px;border-radius:99px;
  background:var(--cs-chip);color:var(--cs-chipink);white-space:nowrap;}
.pel .dchip.hi{background:var(--cs-goodbg);color:var(--cs-good);}
.pel .dchip.lo{background:color-mix(in srgb, var(--cs-bad) 14%, transparent);color:var(--cs-bad);}
.pel .dfoot{flex:none;margin-top:auto;padding:10px 16px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;
  border-top:1px solid var(--cs-hair);font-size:11.5px;color:var(--cs-ink2);}
.pel .dfoot b{color:var(--cs-ink);font-weight:600;}
.pel .dflip{font-size:12px;font-weight:650;color:var(--tink);white-space:nowrap;}
.pel .din.pad .dflip{margin-top:auto;padding-top:6px;}
.pel .din.pad h4{margin:4px 0 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--tink);font-weight:700;}
.pel .dnote{font-size:12px;color:var(--cs-ink2);line-height:1.5;}
.pel .dprog{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;font-size:12px;align-items:baseline;}
.pel .dprog .n{color:var(--cs-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pel .dprog .p{text-align:right;white-space:nowrap;}
.pel .dprog .d{grid-column:1 / -1;height:5px;border-radius:9px;background:var(--cs-track);position:relative;margin-bottom:5px;}
.pel .dprog .d i{position:absolute;left:0;top:0;bottom:0;border-radius:9px;background:var(--cs-good);}
.pel .dprog .d s{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--cs-ink2);text-decoration:none;}
.pel .din .up{color:var(--cs-good);}
.pel .din .dn{color:var(--cs-bad);}

/* Haltung und Teamstufe: nur Farbe */
.pel .dside{display:inline-block;width:9px;height:9px;border-radius:9px;vertical-align:middle;flex:none;}
.pel .dside.hell{background:#FFFFFF;box-shadow:0 0 0 1px #8E9C9B;}
.pel .dside.dunkel{background:#000000;box-shadow:0 0 0 1px #9AA8A6;}
.pel .dside.vac{background:transparent;box-shadow:0 0 0 1px #E3897F;}
.pel .dside.big{width:22px;height:22px;box-shadow:0 0 0 2px var(--cs-ring),0 2px 6px rgba(0,0,0,.35);}
.pel .dteam{background:#1C282B;border-radius:10px;padding:8px 10px;margin:4px 0 2px;color:#EDF1EE;}
.pel .din .dteam{background:var(--cs-trait);color:var(--cs-ink);}
.pel .dteamrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
.pel .dteamseat{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;min-width:0;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.pel .dteamseat.on{color:var(--gold);}
.pel .din .dteamseat.on{color:var(--tink);}
.pel .dteamseat small{font-weight:400;color:#8E9C9B;overflow:hidden;text-overflow:ellipsis;}
.pel .dteamlvl{margin-top:6px;font-size:11.5px;color:#C9D2D0;}
.pel .din .dteamlvl{color:var(--cs-ink2);}
.pel .dteamlvl.hi,.pel .din .dteamlvl.hi{color:#5FC4B1;font-weight:600;}
.pel .din .dteamlvl.hi{color:var(--cs-good);}

/* Mini-Karten im Führungsbereich */
.pel .dmc{position:relative;display:block;width:100%;margin:0;padding:2px;border:0;border-radius:14px;background:var(--metal);
  cursor:pointer;text-align:center;font:inherit;color:inherit;overflow:hidden;box-shadow:0 10px 22px -14px var(--tglow);}
.pel .dmc:hover:not(:disabled){background:var(--metal);border-color:transparent;filter:brightness(1.05);}
.pel .dmcin{position:relative;display:flex;flex-direction:column;align-items:center;border-radius:12px;overflow:hidden;
  background:var(--cs-surf);color:var(--cs-ink);padding-bottom:8px;}
.pel .dmcpic{position:relative;display:block;width:100%;height:78px;overflow:hidden;}
.pel .dmcpic:after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,var(--cs-surf) 100%);}
.pel .dmcrole{margin-top:2px;font-size:8.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--cs-ink2);}
.pel .dmcsk{font-size:19px;font-weight:700;line-height:1.2;color:var(--tink);}
.pel .dmcsub{font-size:10px;color:var(--cs-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;padding:0 4px;}
.pel .dmc .dfoil{border-radius:14px;}
.pel .dseat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:134px;}
.pel .dmini{display:flex;align-items:center;justify-content:center;width:36px;height:36px;margin:0 auto 4px;border-radius:99px;}
.pel .dmini.empty{box-shadow:0 0 0 1.5px var(--rule);color:var(--gold);background:color-mix(in srgb, var(--gold) 10%, transparent);}
.pel .dmini.empty.vac{box-shadow:none;border:1.5px dashed var(--ox);background:transparent;}
@media (prefers-reduced-motion:reduce){
  .pel .dcard{transition:none;}
  .pel .dfoil{animation:none;opacity:0;}
}
`;
