"use client";

/* Manager-Draft: die Shortlist als Deck aus Battle Cards (Schritt 2 des
   Konzepts) und der Top-Team-Fit als Teamstufe aus hellen und dunklen
   Charakteren (Schritt 3, vereinfacht — siehe chemOf in lib/engine).

   Gerechnet wird ausschließlich mit den Engine-Funktionen, mit denen auch die
   Auswertung rechnet (effSkill, initSuccess, initDurationOf, mgmtFx, chemOf).
   Die Karte zeigt das Profil aus dem Assessment (shownProf); das wahre Profil
   zeigt sich erst nach der Probezeit (viewOf, inProbation).               */

import React, { useMemo, useRef, useState } from "react";
import {
  CHEM_LABEL, COMPETENCIES, INITS, cappedSkill, isCapped, MANAGER_TRAITS, POACH, PROGRAM_COMP, ROLE3, SIDES, TIERS,
  chemOf, clamp, compOf, ebitdaOf, effSkill, eur, fitOf, inProbation, initDurationOf, initSuccess,
  mgmtFx, payOf, revealedNow, seatFromCand, severanceOf, signBonusOf, tierOf,
} from "@/lib/engine";
import { seedOf } from "./battle";
import { haptic } from "./haptics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const SEATS = ["ceo", "cfo", "r3"];
const fmt = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
const signed = (v: number, d = 1) => (v >= 0 ? "+" : "−") + fmt(Math.abs(v), d);
export const seatName = (seat: string, sector?: string) =>
  seat === "ceo" ? "CEO" : seat === "cfo" ? "CFO" : (ROLE3[sector || "Software"] || ROLE3.Software).n;

/* ---------- Gezeichnete Büste ----------
   Platzhalter für den Porträt-Pool (Schritt 4). Deterministisch aus Name,
   Porträtnummer, Geschlecht und Alter der Karte, damit dieselbe Person überall
   gleich aussieht. Das Licht kommt wie bei den Sektormotiven von oben rechts,
   in der Farbe der Seltenheit.                                            */
const SKIN = ["#F1D1B5", "#E3B68F", "#C99067", "#9C6744", "#6E4630"];
const HAIR = ["#1E1B1A", "#4A3326", "#7A4E2D", "#B08A5A"];
const SUIT = ["#24313A", "#3A2E4A", "#1F3B39", "#40362C", "#2C3550"];
const STYLE = { f: ["bob", "long", "bun", "pixie"], m: ["crop", "side", "recede", "crop"] };
// Die Lichtfarbe kommt aus --tier der umgebenden Karte
export function Bust({ k, round = false }: { k: Any; round?: boolean }) {
  const s = seedOf((k.name || k.label || "") + ":" + (k.pic ?? 0));
  const g = k.g === "f" ? "f" : "m";
  const skin = SKIN[(k.pic ?? s) % SKIN.length];
  const grey = (k.age || 45) >= 56;
  const hc = grey ? "#9AA0A6" : HAIR[(s >>> 3) % HAIR.length];
  const suit = SUIT[(s >>> 6) % SUIT.length];
  const style = STYLE[g][(s >>> 9) % 4];
  const glasses = (s >>> 12) % 3 === 0;
  const u = "b" + s.toString(36);
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
  return (
    <svg className={"dbust" + (round ? " round" : "")} viewBox={round ? "110 40 120 120" : "0 0 340 230"}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={u} cx="78%" cy="18%" r="85%">
          <stop offset="0" stopColor="var(--tier)" stopOpacity=".55" />
          <stop offset=".55" stopColor="#1C282B" />
          <stop offset="1" stopColor="#0C1214" />
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

/* Haltung als kleines Zeichen: heller Punkt, dunkler Punkt. */
export function SideDot({ side }: { side?: string }) {
  if (!side) return null;
  return <i className={"dside " + side} title={SIDES[side]} aria-label={"Haltung " + SIDES[side]} />;
}

/* ---------- Rechnung für eine Karte ---------- */

// Die Beteiligung mit dieser Karte auf der Position, gerechnet mit dem Assessment
const withCard = (h: Any, seat: string, k: Any) =>
  ({ ...h, [seat]: { ...seatFromCand(k), prof: [...k.shownProf], skill: k.shown }, onboard: 0 });

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
const capOf = (h: Any) => (h && h.ceo ? compOf(h.ceo, 2) + 1.5 : 5);

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
        if (ai && ai.req && ai.req(withCard(h, seat, k)) && !ai.req({ ...h, onboard: 0 })) out.push(["hi", "Schaltet KI frei"]);
      }
      if (Math.max(...v) > capOf(h)) out.push(["lo", "Über dem Leadership-Deckel"]);
    }
  }
  if (k.dev) out.push(["", "Wächst +0,25 je Halbjahr"]);
  return out.slice(0, 3);
}

/* Laufende Wirkung gegen heute, in den Einheiten, in denen mgmtFx rechnet. */
function runDeltas(h: Any, sim: Any) {
  if (!h || !h.mx) return null;
  const a = mgmtFx(h), b = mgmtFx(sim);
  return [
    { k: "Marge", v: b.margin - a.margin, u: " pp", good: 1 },
    { k: "Wachstum p. a.", v: b.growth - a.growth, u: " pp", good: 1 },
    { k: "Kapitalbindung", v: b.nwc - a.nwc, u: " pp", good: -1 },
    { k: "Zinsmarge", v: (b.rate - a.rate) * 100, u: " bp", good: -1, d: 0 },
    { k: "Capex", v: b.capex - a.capex, u: " pp", good: -1 },
  ].filter((r) => Math.abs(r.v) >= (r.d === 0 ? 0.5 : 0.05));
}

/* ---------- Kandidatenkarte ---------- */

function CompBars({ names, vals, span, cap, real = null }: Any) {
  const pos = (v: number) => ((clamp(v, 1, 5) - 1) / 4) * 100 + "%";
  return (
    <div className="dstats">
      {names.map((n: string, i: number) => {
        const v = real ? real[i] : vals[i];
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

function CandCard({ k, seat, h, sector, precise, flipped, onFlip }: Any) {
  const span = precise ? 0.5 : k.span;
  const tier = tierOf(k.shown);
  const eb = h ? ebitdaOf(h) : 10;
  const sim = h ? withCard(h, seat, k) : null;
  const tr = MANAGER_TRAITS[k.trait];
  const cap = seat === "ceo" ? 5 : capOf(h);
  const chem = sim && sim.mx ? chemOf(sim) : null;
  const chips = fitChips(k, seat, h);
  const progs = h ? programsOf(seat).map((x) => ({ ...x, now: progRate({ ...h, onboard: 0 }, x), new: progRate(sim, x) })) : [];
  const run = h ? runDeltas(h, sim) : null;
  const pay = payOf(seat, k.shown, eb);
  const had = h && h[seat] && h[seat].skill > 0;
  return (
    <div className={"dcard" + (flipped ? " flip" : "")} data-tier={tier}>
      <div className="dface front" onClick={onFlip}>
        <div className="dportrait">
          <Bust k={k} />
          <div className="dovr"><span className="v mono">{fmt(k.shown)}</span><span className="l">Assessment</span></div>
          <span className="dtier">{TIERS[tier]}</span>
        </div>
        <div className="did">
          <div className="darch">{k.label}</div>
          <div className="dname">{k.name}</div>
          <div className="dmeta">{k.age} · Herkunft {k.origin}</div>
        </div>
        <CompBars names={COMPETENCIES[seat]} vals={k.shownProf} span={span} cap={cap} />
        {tr && <div className="dtrait"><b>{tr.n}</b> · {tr.t}</div>}
        <div className="dchips">
          {k.side && (
            <span className={"dchip " + (chem == null ? "" : chem > 0 ? "hi" : chem < 0 ? "lo" : "")}>
              <SideDot side={k.side} /> {SIDES[k.side]}{chem != null ? ` · Team: ${CHEM_LABEL(chem)}` : ""}
            </span>
          )}
          {chips.map(([t, x2]) => <span key={x2} className={"dchip " + t}>{x2}</span>)}
        </div>
        <div className="dfoot">
          <span>Fixum <b className="mono">{eur(pay)}</b> p. a.</span>
          <span className="dflip">Wirkung ›</span>
        </div>
      </div>
      <div className="dface back" onClick={onFlip}>
        {h ? (
          <>
            <h4>Programme bei {h.name}</h4>
            <div className="dnote">Erfolgsquote mit {k.name.split(" ").slice(-1)[0]}, Strich = heute. Gerechnet mit dem Assessment.</div>
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
            <h4>Laufende Wirkung gegen heute</h4>
            <div className="dnote">
              {run == null ? "Diese Beteiligung wurde vor dem 19.10.2026 gekauft; das Management wirkt hier nur über Programme."
                : run.length === 0 ? "Kaum Unterschied zur heutigen Besetzung."
                  : run.map((r, i) => (
                    <span key={r.k}>{i > 0 && " · "}{r.k}{" "}
                      <b className={r.v * r.good > 0 ? "up" : "dn"}>{signed(r.v, r.d ?? 1)}{r.u}</b></span>
                  ))}
            </div>
            {sim && sim.mx && (
              <>
                <h4>Top-Team nach der Verpflichtung</h4>
                <TeamStrip c={sim} sector={sector} hi={seat} compact />
              </>
            )}
          </>
        ) : null}
        <h4>Werdegang</h4>
        <div className="dnote">{k.note}</div>
        <div className="dnote">
          Sign-on {eur(signBonusOf(seat, k.shown, eb))} · Retention-Risiko {fmt(POACH * k.shown * k.shown * k.poach * 100)} % je HJ ·{" "}
          {k.dev ? "+0,25 je Halbjahr bis 4,5" : "Profil stabil"}
          {had ? ` · Abfindung Vorgänger ${eur(severanceOf(seat, h[seat].skill, eb))}` : ""}
        </div>
        <span className="dflip">‹ Vorderseite</span>
      </div>
    </div>
  );
}

/* ---------- Teamstufe ----------
   Die drei Positionen mit ihrer Haltung und darunter die Chemie, die sich
   daraus ergibt. Dieselbe Zeile im Draft und auf der Rückseite der Karte. */
export function TeamStrip({ c, sector, hi = null, compact = false }: Any) {
  const v = chemOf(c);
  return (
    <div className="dteam">
      <div className="dteamrow">
        {SEATS.map((s) => (
          <span key={s} className={"dteamseat" + (s === hi ? " on" : "")}>
            {c[s].skill > 0 ? <SideDot side={c[s].side} /> : <i className="dside vac" />}
            {seatName(s, sector)}
            {!compact && <small>{c[s].skill > 0 ? (c[s].side ? SIDES[c[s].side] : "—") : "vakant"}</small>}
          </span>
        ))}
      </div>
      <div className={"dteamlvl " + (v > 0 ? "hi" : v < 0 ? "lo" : "")}>
        {CHEM_LABEL(v)}{v > 0 ? " · jede Kompetenz +" + fmt(v, 2) : v < 0 ? " · jede Kompetenz −" + fmt(-v, 2) : ""}
      </div>
    </div>
  );
}

/* ---------- Draft-Ansicht ----------
   Wischen über natives Scroll-Snapping, eine Raste je Karte. Antippen dreht
   die Karte um. "Draften" verpflichtet die Karte in der Mitte.          */
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
              <CandCard k={c} seat={seat} h={holding} sector={sector} precise={precise}
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
          Das wahre Profil zeigt sich nach der Probezeit. Eine Fachposition wirkt höchstens bis Leadership des CEO +1,5 (gestrichelte Linie).
          {holding && holding.mx ? " Die Haltung entscheidet über die Chemie: drei gleich ausgerichtete Positionen sind eingespielt, helle und dunkle Charaktere im selben Team bringen Reibung." : ""}
          {" "}Ablehnen kostet den halben Retainer und ein weiteres Halbjahr Suche.
        </p>
      </div>
    </div>
  );
}

/* ---------- Mini-Karte im Führungsbereich ----------
   Porträt, Position, Haltung und Score. Während der Probezeit steht das
   Assessment da; im Halbjahr danach deckt die Karte das wahre Profil auf. */
export function SeatCard({ c, view, seat, nm, quarter, searching, se, onClick, eb, className = "" }: Any) {
  const s = view[seat];
  const card = s.skill > 0 && s.prof && s.name;
  // Gezählt im Halbjahr der Entscheidung (quarter zählt die ausgewerteten)
  const probe = inProbation(c[seat], quarter + 1);
  const reveal = revealedNow(c[seat], quarter + 1);
  const shownMean = s.shownProf ? s.shownProf.reduce((a: number, b: number) => a + b, 0) / s.shownProf.length : s.skill;
  const delta = reveal ? c[seat].skill - shownMean : 0;
  const tier = tierOf(s.skill);
  const cls = "bseat dseat" + (s.skill <= 0 ? " vac pulse" : "") + (searching ? " busy" : "") + (reveal ? " reveal" : "") + " " + className;
  return (
    <button className={cls.trim()} data-tier={card ? tier : undefined} disabled={searching} onClick={onClick}>
      {/* Gleiche Höhe für alle drei: Amtsinhaber und Vakanzen bekommen einen leeren Kreis */}
      {card && !searching ? <span className="dmini"><Bust k={s} round /></span>
        : <span className={"dmini empty" + (s.skill <= 0 && !searching ? " vac" : "")} />}
      <div className="rn">{nm}{s.skill > 0 && s.side ? <> <SideDot side={s.side} /></> : null}</div>
      <div className="sk">{searching ? "🔍" : s.skill > 0 ? s.skill.toFixed(1) : "—"}</div>
      <div className="rn2">
        {searching ? (se.waiting ? "Shortlist" : "läuft")
          : s.skill <= 0 ? "vakant"
            : probe ? "Probezeit"
              : reveal ? <span className={delta >= 0 ? "up" : "dn"}>{delta >= 0 ? "▲" : "▼"} {fmt(Math.abs(delta))} vs. Assessment</span>
                : card ? s.name.split(" ").slice(-1)[0]
                  : isCapped(view, seat) ? `wirkt ${cappedSkill(view, seat).toFixed(1)}` : eur(payOf(seat, s.skill, eb))}
      </div>
    </button>
  );
}

export const DRAFT_CSS = `
/* ============================================================
   MANAGER-DRAFT — Deck, Battle Cards, Mini-Karten
   ============================================================ */
.pel{--bronze:#9A6A45;--silber:#7D8C8F;--legende:#7A4FB3;}
.pel.dark{--bronze:#C48F66;--silber:#A9B6B8;--legende:#B48CE8;}
.pel [data-tier="bronze"]{--tier:var(--bronze);}
.pel [data-tier="silber"]{--tier:var(--silber);}
.pel [data-tier="gold"]{--tier:var(--gold);}
.pel [data-tier="legende"]{--tier:var(--legende);}

.pel .ddraft{background:var(--panel);color:var(--onpanel);padding-bottom:max(14px, env(safe-area-inset-bottom, 0px));}
.pel .dhead{padding:16px 16px 4px;}
.pel .dhead .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);}
.pel .dtitle{font-size:22px;font-weight:700;letter-spacing:-.03em;margin:4px 0 8px;}

.pel .ddeck{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:12px 8% 6px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;}
.pel .ddeck::-webkit-scrollbar{display:none;}
.pel .dslot{flex:0 0 84%;max-width:340px;scroll-snap-align:center;perspective:1200px;}
.pel .ddots{display:flex;justify-content:center;gap:6px;padding-top:6px;}
.pel .ddots button{width:6px;height:6px;padding:0;border:0;border-radius:9px;background:#2E3C3F;transition:width .2s,background .2s;}
.pel .ddots button.on{width:18px;background:var(--gold);}
.pel .ddots button:hover:not(:disabled){background:var(--gold);}
.pel .dbar{display:flex;gap:10px;padding:14px 16px 0;}
.pel .dbar button{background:transparent;color:var(--onpanel);border-color:#2E3C3F;}
.pel .dbar button.solid{flex:1;background:var(--gold);color:#12201F;border-color:var(--gold);font-weight:650;}
.pel .dbar button.solid:hover:not(:disabled){background:var(--gold);border-color:var(--gold);filter:brightness(1.08);}
.pel .dhint{font-size:11.5px;line-height:1.5;color:#8E9C9B;margin:10px 16px 0;}

/* Karte mit Vorder- und Rückseite */
.pel .dcard{position:relative;height:min(540px, 66vh);min-height:480px;transform-style:preserve-3d;
  transition:transform .55s cubic-bezier(.2,.8,.2,1);}
.pel .dcard.flip{transform:rotateY(180deg);}
.pel .dface{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:18px;
  overflow:hidden;background:#161F22;border:1.5px solid var(--tier);display:flex;flex-direction:column;color:#EDF1EE;cursor:pointer;
  box-shadow:0 18px 40px -24px color-mix(in srgb, var(--tier) 70%, transparent);}
.pel .dface.back{transform:rotateY(180deg);padding:14px 15px;gap:8px;overflow-y:auto;}
.pel .dcard[data-tier="legende"] .dface.front:after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%);
  transform:translateX(-100%);animation:foil 4.8s ease-in-out 1s infinite;}
.pel .dportrait{position:relative;height:38%;min-height:170px;flex:none;overflow:hidden;}
.pel .dbust{position:absolute;inset:0;width:100%;height:100%;display:block;}
.pel .dportrait:after{content:"";position:absolute;inset:auto 0 0;height:80px;background:linear-gradient(to bottom,transparent,#161F22);}
.pel .dovr{position:absolute;top:12px;left:12px;z-index:2;text-align:center;line-height:1;}
.pel .dovr .v{font-size:34px;font-weight:700;color:var(--tier);display:block;}
.pel .dovr .l{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#C9D2D0;}
.pel .dtier{position:absolute;top:14px;right:12px;z-index:2;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  padding:4px 8px;border-radius:99px;border:1px solid var(--tier);color:var(--tier);background:rgba(8,13,15,.55);}
.pel .did{position:relative;z-index:2;margin-top:-50px;padding:0 15px;}
.pel .darch{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--tier);font-weight:650;}
.pel .dname{font-size:20px;font-weight:750;letter-spacing:-.02em;line-height:1.15;}
.pel .dmeta{font-size:12px;color:#8E9C9B;}
.pel .dstats{padding:10px 15px 0;display:flex;flex-direction:column;gap:6px;}
.pel .dstat{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:3px 8px;font-size:11.5px;}
.pel .dstat .k{grid-row:1;grid-column:1;color:#C9D2D0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .dstat .v{grid-row:1;grid-column:2;}
.pel .dstat .bar{grid-row:2;grid-column:1 / -1;position:relative;height:7px;border-radius:9px;background:#243033;}
.pel .dstat .rng{position:absolute;top:0;bottom:0;border-radius:9px;background:color-mix(in srgb, var(--tier) 38%, transparent);}
.pel .dstat .pt{position:absolute;top:-2px;width:3px;height:11px;border-radius:2px;background:var(--tier);}
.pel .dstat .cap{position:absolute;top:-4px;bottom:-4px;width:0;border-left:1.5px dashed #E3897F;}
.pel .dstat .v{font-size:11.5px;text-align:right;white-space:nowrap;}
.pel .dtrait{margin:10px 15px 0;padding:8px 10px;border-radius:9px;background:#1C282B;font-size:12px;line-height:1.4;color:#C9D2D0;}
.pel .dtrait b{color:var(--tier);font-weight:650;}
.pel .dchips{margin:8px 15px 0;display:flex;gap:6px;flex-wrap:wrap;}
.pel .dchip{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 8px;border-radius:99px;
  background:#1C282B;color:#C9D2D0;white-space:nowrap;}
.pel .dchip.hi{background:color-mix(in srgb, #5FC4B1 22%, #161F22);color:#5FC4B1;}
.pel .dchip.lo{background:color-mix(in srgb, #E3897F 20%, #161F22);color:#E3897F;}
.pel .dfoot{margin-top:auto;padding:10px 15px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;
  border-top:1px solid #243033;font-size:11.5px;color:#8E9C9B;}
.pel .dfoot b{color:#EDF1EE;font-weight:600;}
.pel .dflip{font-size:11.5px;color:var(--gold);white-space:nowrap;}
.pel .dface.back .dflip{margin-top:auto;padding-top:6px;}
.pel .dface.back h4{margin:4px 0 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--tier);font-weight:600;}
.pel .dnote{font-size:12px;color:#C9D2D0;line-height:1.5;}
.pel .dprog{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;font-size:12px;align-items:baseline;}
.pel .dprog .n{color:#C9D2D0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pel .dprog .p{text-align:right;white-space:nowrap;}
.pel .dprog .d{grid-column:1 / -1;height:5px;border-radius:9px;background:#243033;position:relative;margin-bottom:5px;}
.pel .dprog .d i{position:absolute;left:0;top:0;bottom:0;border-radius:9px;background:#5FC4B1;}
.pel .dprog .d s{position:absolute;top:-2px;bottom:-2px;width:2px;background:#8E9C9B;text-decoration:none;}
.pel .ddraft .up,.pel .dseat .up{color:var(--teal);}
.pel .ddraft .dn,.pel .dseat .dn{color:var(--ox);}
.pel .dface .up{color:#5FC4B1;}
.pel .dface .dn{color:#E3897F;}

/* Haltung und Teamstufe */
.pel .dside{display:inline-block;width:9px;height:9px;border-radius:9px;vertical-align:middle;flex:none;}
.pel .dside.hell{background:#F1E6C8;box-shadow:0 0 0 1px #B08430;}
.pel .dside.dunkel{background:#12201F;box-shadow:0 0 0 1px #8E9C9B;}
.pel .dside.vac{background:transparent;box-shadow:0 0 0 1px #E3897F;}
.pel .dteam{background:#1C282B;border-radius:10px;padding:8px 10px;margin:4px 0 2px;color:#EDF1EE;}
.pel .dteamrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
.pel .dteamseat{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;min-width:0;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;opacity:.75;}
.pel .dteamseat.on{opacity:1;color:var(--gold);}
.pel .dteamseat small{font-weight:400;color:#8E9C9B;overflow:hidden;text-overflow:ellipsis;}
.pel .dteamlvl{margin-top:6px;font-size:11.5px;color:#C9D2D0;}
.pel .dteamlvl.hi{color:#5FC4B1;}
.pel .dteamlvl.lo{color:#E3897F;}

/* Mini-Karten im Führungsbereich */
.pel .dseat{position:relative;padding-top:8px;}
.pel .dseat[data-tier]{border-color:color-mix(in srgb, var(--tier) 60%, var(--rule));}
.pel .dmini{display:block;width:34px;height:34px;margin:0 auto 4px;border-radius:99px;overflow:hidden;
  box-shadow:0 0 0 1.5px var(--tier);}
.pel .dbust.round{position:static;width:34px;height:34px;}
.pel .dmini.empty{box-shadow:0 0 0 1.5px var(--rule);background:color-mix(in srgb, var(--ink) 6%, var(--card));}
.pel .dmini.empty.vac{box-shadow:none;border:1.5px dashed var(--ox);background:transparent;}
.pel .dseat .rn .dside{width:7px;height:7px;margin-left:2px;}
.pel .dseat.reveal{animation:dreveal .9s cubic-bezier(.2,.8,.2,1) both;}
.pel .dseat.reveal .sk{animation:dpop .6s ease .25s both;}
@keyframes dreveal{0%{transform:rotateY(90deg);}100%{transform:none;}}
@keyframes dpop{0%{transform:scale(.6);opacity:.2;}60%{transform:scale(1.18);}100%{transform:none;opacity:1;}}
@media (prefers-reduced-motion:reduce){
  .pel .dcard{transition:none;}
  .pel .dseat.reveal,.pel .dseat.reveal .sk{animation:none;}
  .pel .dcard[data-tier="legende"] .dface.front:after{animation:none;opacity:0;}
}
`;
