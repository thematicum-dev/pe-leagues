"use client";

/* ---------------- Halbjahresbericht ----------------

   Zu Beginn jedes Halbjahres ein Fenster, das zusammenfasst, was das gerade
   ausgewertete Halbjahr gebracht hat: wie der Fonds dasteht, welche Deals
   gewonnen oder verloren wurden, was in den Beteiligungen passiert ist
   (Management, Maßnahmen, Ereignisse) und was am Markt los war.

   Die Meldungen selbst sind dieselben wie im Feed — der Bericht ordnet sie
   nur. Eingeteilt wird nach dem Emoji, das jede Meldung trägt: Es ist im
   Feed seit jeher die Kategorie (🏆 Zuschlag, 🥈 überboten, 🛠️ Maßnahme
   abgeschlossen, 🚪 Abgang …), in beiden Spielmodi gleich vergeben.

   Gemeinsam für Übungsmodus und Mehrspielerpartie; die Kennzahlen rechnet
   der Aufrufer, hier wird nur dargestellt. */

import React, { useEffect, useId, useMemo, useRef } from "react";
import { eur } from "@/lib/engine";
import { haptic } from "./haptics";

export interface BriefItem {
  e: string;
  tone?: "pos" | "neg" | "neu" | string;
  t: string;
  /* Öffentliche Meldung (Mehrspielerpartie: ohne Fondsplatz) — Marktbericht,
     nicht das eigene Portfolio. Im Übungsmodus nie gesetzt. */
  pub?: boolean;
}

export interface BriefPerf {
  score: number;
  rank: number;
  funds: number;
  tvpi: number;
  irr: number;
  dpi: number;
  dry: number;
}

export type BriefKey = "deals" | "exits" | "people" | "value" | "market" | "other";

export const BRIEF_SECTIONS: { key: BriefKey; title: string }[] = [
  { key: "deals", title: "Deals" },
  { key: "exits", title: "Exits & Ausschüttungen" },
  { key: "people", title: "Management" },
  { key: "value", title: "Value Creation & Portfolio" },
  { key: "market", title: "Markt & Wettbewerb" },
  { key: "other", title: "Weitere Meldungen" },
];

/* Ohne Variantenselektor (U+FE0F) verglichen: "🛠️" und "🛠" sind dasselbe
   Zeichen, und welche Form im Quelltext steht, ist Zufall. */
const bare = (e: string) => (e || "").replace(/️/g, "");
const set = (...xs: string[]) => new Set(xs.map(bare));

const DEAL = set("🏆", "🏛️", "🥈", "🏦", "⚔️", "🚷");
const EXIT = set("🚀", "💰", "💀", "🔔", "🔄", "⏳", "🚫", "⚖️", "🏷️", "💵");
const PEOPLE = set("🚪", "👋", "🤝", "🔍", "📜");
const VALUE = set("🛠️", "❌", "➖", "🏢", "💶", "📊", "🔺", "🔻", "⚠️", "☠️");
const MARKET = set("📈", "📉", "📣");

export function sectionOf(f: BriefItem): BriefKey {
  const e = bare(f.e);
  if (f.pub) return "market";
  // 📉/📈 meldet sowohl Sektorbewegungen als auch eine ausgelaufene Lock-up-Frist
  if (e === bare("📉") || e === bare("📈")) return /Lock-up|Restbeteiligung/.test(f.t) ? "exits" : "market";
  // 📣 ist der eigene Verkaufsprozess — oder die Ankündigung des Trophy Assets
  if (e === bare("📣")) return /Verkaufsprozess/.test(f.t) ? "exits" : "market";
  if (DEAL.has(e)) return "deals";
  if (EXIT.has(e)) return "exits";
  if (PEOPLE.has(e)) return "people";
  if (VALUE.has(e)) return "value";
  if (MARKET.has(e)) return "market";
  return "other";
}

export function groupBriefing(items: BriefItem[]): { key: BriefKey; title: string; items: BriefItem[] }[] {
  const by: Record<string, BriefItem[]> = {};
  items.forEach((f) => { (by[sectionOf(f)] ??= []).push(f); });
  return BRIEF_SECTIONS
    .map((s) => ({ ...s, items: by[s.key] ?? [] }))
    .filter((s) => s.items.length > 0);
}

/* Die Kopfzeile des Berichts: was ist passiert, in Stückzahlen. */
export interface BriefChip { e: string; n: number; label: string; tone: "pos" | "neg" | "neu" }

export function briefSummary(items: BriefItem[]): BriefChip[] {
  const own = items.filter((f) => !f.pub);
  const count = (pred: (f: BriefItem, e: string) => boolean) => own.filter((f) => pred(f, bare(f.e))).length;
  const n = (k: number, one: string, many: string) => (k === 1 ? one : many);
  const out: BriefChip[] = [];
  const won = count((f, e) => DEAL.has(e) && f.tone === "pos");
  const lost = count((f, e) => DEAL.has(e) && f.tone === "neg");
  const exits = count((f, e) => (e === bare("🚀") || e === bare("💰") || e === bare("🔔") || e === bare("⏳") || e === bare("🔄")) && f.tone !== "neg");
  const badExits = count((f, e) => e === bare("💀"));
  const initOk = count((f, e) => e === bare("🛠️") && f.tone === "pos");
  const initFail = count((f, e) => e === bare("❌") || e === bare("➖"));
  const leavers = count((f, e) => e === bare("🚪") || e === bare("👋"));
  const hires = count((f, e) => e === bare("🤝") && f.tone === "pos");
  const risks = count((f, e) => e === bare("⚠️") || e === bare("☠️"));
  if (won) out.push({ e: "🏆", n: won, label: n(won, "Zuschlag", "Zuschläge"), tone: "pos" });
  if (lost) out.push({ e: "🥈", n: lost, label: "ohne Zuschlag", tone: "neg" });
  if (exits) out.push({ e: "💰", n: exits, label: n(exits, "Exit", "Exits"), tone: "pos" });
  if (badExits) out.push({ e: "💀", n: badExits, label: "unter Einstand", tone: "neg" });
  if (initOk) out.push({ e: "🛠️", n: initOk, label: n(initOk, "Maßnahme geglückt", "Maßnahmen geglückt"), tone: "pos" });
  if (initFail) out.push({ e: "❌", n: initFail, label: n(initFail, "Maßnahme verfehlt", "Maßnahmen verfehlt"), tone: "neg" });
  if (hires) out.push({ e: "🤝", n: hires, label: n(hires, "Neubesetzung", "Neubesetzungen"), tone: "pos" });
  if (leavers) out.push({ e: "🚪", n: leavers, label: n(leavers, "Abgang", "Abgänge"), tone: "neg" });
  if (risks) out.push({ e: "⚠️", n: risks, label: n(risks, "Warnung", "Warnungen"), tone: "neg" });
  return out;
}

/* Grundstimmung des Halbjahres — bestimmt Farbe der Kopfzeile und das
   haptische Muster beim Öffnen. */
export function briefMood(items: BriefItem[], perf: BriefPerf, prev: BriefPerf | null): "pos" | "neg" | "neu" {
  const own = items.filter((f) => !f.pub);
  if (own.some((f) => bare(f.e) === bare("☠️"))) return "neg";
  const pos = own.filter((f) => f.tone === "pos").length;
  const neg = own.filter((f) => f.tone === "neg").length;
  const ds = prev ? perf.score - prev.score : 0;
  const s = (pos - neg) + (ds > 0.005 ? 1 : ds < -0.005 ? -1 : 0);
  return s > 0 ? "pos" : s < 0 ? "neg" : "neu";
}

// Deutsches Komma und ein echtes Minuszeichen statt des Bindestrichs
const de = (v: number, dg: number) => v.toFixed(dg).replace(".", ",").replace("-", "−");

function lede(perf: BriefPerf, prev: BriefPerf | null): string {
  if (!prev) return `Wertung ${de(perf.score, 2)} · Platz ${perf.rank} von ${perf.funds}.`;
  const ds = perf.score - prev.score;
  const a = ds > 0.005 ? `Die Wertung steigt um ${de(ds, 2)} auf ${de(perf.score, 2)}`
    : ds < -0.005 ? `Die Wertung fällt um ${de(-ds, 2)} auf ${de(perf.score, 2)}`
      : `Die Wertung hält sich bei ${de(perf.score, 2)}`;
  const b = perf.rank < prev.rank ? `du rückst auf Platz ${perf.rank} von ${perf.funds} vor`
    : perf.rank > prev.rank ? `du fällst auf Platz ${perf.rank} von ${perf.funds} zurück`
      : `Platz ${perf.rank} von ${perf.funds}`;
  return `${a}, ${b}.`;
}

function Tile({ label, value, delta, eps, fmt, invert, neutral }: {
  label: string; value: string; delta: number | null; eps: number; fmt: (v: number) => string;
  invert?: boolean; neutral?: boolean;
}) {
  const show = delta != null && Math.abs(delta) >= eps;
  const up = show && (invert ? delta! < 0 : delta! > 0);
  const cls = !show ? "" : neutral ? "" : up ? " up" : " dn";
  return (
    <div className="brtile">
      <div className="brtl">{label}</div>
      <div className="brtv mono">{value}</div>
      <div className={"brtd mono" + cls}>{show ? `${up ? "▲" : "▼"} ${fmt(Math.abs(delta!))}` : "—"}</div>
    </div>
  );
}

export function HalfYearBriefing({
  quarter, items, perf, prev, todo, footer, onClose, nextLabel,
}: {
  /* Das ausgewertete Halbjahr, über das berichtet wird. */
  quarter: number;
  items: BriefItem[];
  perf: BriefPerf;
  prev: BriefPerf | null;
  todo?: { shortlists: number; offers: number };
  footer?: React.ReactNode;
  onClose: () => void;
  nextLabel?: string;
}) {
  const titleId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const groups = useMemo(() => groupBriefing(items), [items]);
  const chips = useMemo(() => briefSummary(items), [items]);
  const mood = briefMood(items, perf, prev);
  const d = (a: number, b: number | undefined) => (prev == null || b == null ? null : a - b);

  /* Beim Öffnen: Stimmung spürbar machen und den Fokus auf die Schaltfläche
     legen, damit Enter/Leertaste den Bericht schließen. */
  useEffect(() => {
    haptic(mood === "pos" ? "success" : mood === "neg" ? "warning" : "tap");
    btnRef.current?.focus({ preventScroll: true });
    // Nur beim Öffnen, nicht bei jedem Neurendern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() { haptic("tap"); onClose(); }

  const todoCount = (todo?.shortlists || 0) + (todo?.offers || 0);
  let delay = 0;
  const next = () => { delay += 60; return { animationDelay: `${delay}ms` }; };

  return (
    <div className="modal brov" onClick={close}>
      <div className="sheet brief" role="dialog" aria-modal="true" aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
        <div className={"brhead " + mood}>
          {/* Der Bericht ist der Inhalt, die Begrüßung nur der Anlass — deshalb
              steht er groß und sie klein darüber. */}
          <div className="sub">{nextLabel ?? `Willkommen im neuen Halbjahr · HJ ${quarter + 1}`}</div>
          <h2 id={titleId} className="disp">Halbjahresbericht HJ {quarter}</h2>
          <p className="brlede">{lede(perf, prev)}</p>
          {chips.length > 0 && (
            <div className="brchips">
              {chips.map((c) => (
                <span key={c.label} className={"brchip " + c.tone}>
                  <span aria-hidden="true">{c.e}</span> <b className="mono">{c.n}</b> {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <section className="brsec" style={next()}>
          <h3 className="eyebrow">Fonds-Performance</h3>
          <div className="brgrid">
            <Tile label="Wertung" value={de(perf.score, 2)} delta={d(perf.score, prev?.score)} eps={0.005}
              fmt={(v) => de(v, 2)} />
            <Tile label="Platz" value={`${perf.rank}/${perf.funds}`} delta={d(perf.rank, prev?.rank)} eps={0.5}
              invert fmt={(v) => String(Math.round(v))} />
            <Tile label="TVPI" value={`${de(perf.tvpi, 2)}×`} delta={d(perf.tvpi, prev?.tvpi)} eps={0.005}
              fmt={(v) => `${de(v, 2)}×`} />
            <Tile label="IRR" value={`${de(perf.irr * 100, 1)} %`} delta={d(perf.irr, prev?.irr)} eps={0.0005}
              fmt={(v) => `${de(v * 100, 1)} pp`} />
            <Tile label="DPI" value={`${de(perf.dpi, 2)}×`} delta={d(perf.dpi, prev?.dpi)} eps={0.005}
              fmt={(v) => `${de(v, 2)}×`} />
            {/* Ohne "€": Mit Einheit lief der Wert bei 390 px aus seiner Kachel */}
            <Tile label="Dry Powder" value={eur(perf.dry).replace(" €", "")} delta={d(perf.dry, prev?.dry)} eps={0.5}
              neutral fmt={(v) => eur(v).replace(" €", "")} />
          </div>
        </section>

        {todoCount > 0 && (
          <section className="brsec brtodo" style={next()}>
            <span aria-hidden="true">📋</span>
            <span>
              <b>{todoCount === 1 ? "Eine Entscheidung wartet" : `${todoCount} Entscheidungen warten`}</b>
              {" — "}
              {[todo!.shortlists ? `${todo!.shortlists} Shortlist${todo!.shortlists > 1 ? "s" : ""}` : "",
                todo!.offers ? `${todo!.offers} Kaufangebot${todo!.offers > 1 ? "e" : ""}` : ""].filter(Boolean).join(", ")}
              . Sie öffnen sich nach diesem Bericht.
            </span>
          </section>
        )}

        {groups.length === 0 ? (
          <section className="brsec" style={next()}>
            <div className="quiet" style={{ padding: "4px 0" }}>
              Ein ruhiges Halbjahr — keine Deals, keine Ereignisse in den Beteiligungen.
            </div>
          </section>
        ) : groups.map((g) => (
          <section className="brsec" key={g.key} style={next()}>
            <h3 className="eyebrow">{g.title}<span className="mono brn">{g.items.length}</span></h3>
            <div className="brlist">
              {g.items.map((f, i) => (
                <div className={"item " + (f.tone || "neu")} key={i}>
                  <span className="em">{f.e || "·"}</span>
                  <span dangerouslySetInnerHTML={{ __html: f.t }} />
                </div>
              ))}
            </div>
          </section>
        ))}

        {footer && <div className="brsec brfoot" style={next()}>{footer}</div>}

        <div className="bract">
          <button ref={btnRef} className="solid cta-big" style={{ width: "100%", padding: 14 }} onClick={close}>
            Weiter zu Halbjahr {quarter + 1}
          </button>
        </div>
      </div>
    </div>
  );
}

export const BRIEFING_CSS = `
/* ---------- Halbjahresbericht ---------- */
.pel .brov{z-index:46;animation:fadeIn .22s ease-out both;}
@media (min-width:600px){.pel .brov{align-items:center;padding:24px;}
  .pel .brief{border-radius:16px;max-height:88vh;}}
.pel .brief{animation:brIn .34s cubic-bezier(.22,.9,.34,1) both;padding-bottom:0;}
@keyframes brIn{from{opacity:0;transform:translateY(26px) scale(.985);}to{opacity:1;transform:none;}}
.pel .brhead{background:var(--panel);color:var(--onpanel);padding:22px 18px 18px;position:relative;
  border-bottom:3px solid var(--pgold);}
.pel .brhead.pos{border-bottom-color:var(--pteal);}
.pel .brhead.neg{border-bottom-color:var(--pox);}
.pel .brhead .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--pgold);}
.pel .brhead h2{font-size:26px;font-weight:600;letter-spacing:-.03em;line-height:1.1;margin:8px 0 6px;}
.pel .brlede{margin:0;font-size:13.5px;line-height:1.5;color:color-mix(in srgb, var(--onpanel) 78%, transparent);}
.pel .brchips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}
.pel .brchip{font-size:11.5px;padding:4px 9px;border-radius:999px;border:1px solid rgba(237,241,238,.18);
  background:rgba(237,241,238,.06);white-space:nowrap;}
.pel .brchip.pos{border-color:color-mix(in srgb, var(--pteal) 55%, transparent);}
.pel .brchip.neg{border-color:color-mix(in srgb, var(--pox) 55%, transparent);}
.pel .brchip b{font-weight:600;}
.pel .brsec{padding:16px 16px 4px;animation:rise .32s cubic-bezier(.22,.9,.34,1) both;}
.pel .brsec h3.eyebrow{margin:0 0 10px;display:flex;justify-content:space-between;align-items:center;}
.pel .brn{font-size:11px;color:var(--ink2);letter-spacing:0;}
.pel .brgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--rule);
  border:1px solid var(--rule);}
.pel .brtile{background:var(--card);padding:10px 10px 9px;min-width:0;}
.pel .brtl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);}
.pel .brtv{font-size:17px;font-weight:500;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pel .brtd{font-size:11px;color:var(--ink2);margin-top:2px;white-space:nowrap;}
.pel .brtd.up{color:var(--teal);} .pel .brtd.dn{color:var(--ox);}
.pel .brlist{border:1px solid var(--rule);background:var(--card);}
.pel .brtodo{display:flex;gap:10px;font-size:13px;line-height:1.45;margin:14px 16px 0;padding:12px 14px;
  border:1px solid var(--rule);border-left:3px solid var(--gold);background:var(--card);}
.pel .brfoot{font-size:12.5px;color:var(--ink2);line-height:1.5;}
.pel .bract{position:sticky;bottom:0;padding:14px 16px calc(16px + env(safe-area-inset-bottom));margin-top:12px;
  background:linear-gradient(to bottom, transparent, var(--paper) 30%);}
@media (prefers-reduced-motion:reduce){.pel .brov,.pel .brief,.pel .brsec{animation:none;}}
`;
