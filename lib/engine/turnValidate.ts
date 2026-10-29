/* Prüfung einer Abgabe, bevor die Auswertung sie anfasst.

   Die Abgabe kommt als beliebiges JSON aus dem Browser: Die Datenbank prüft
   per RLS nur, wer abgeben darf und bis wann, nicht was. Bis zum 29.10.2026
   ging sie ungeprüft in runQuarter() — und schon `{"bids": "x"}` oder ein
   `null` in einer Liste ließ die Auswertung werfen. Weil die Auswertung jede
   Minute neu ansetzt und jedes Mal an derselben Abgabe scheitert, hätte eine
   einzige kaputte Abgabe (ein veralteter Tab, ein von Hand gebauter Request)
   die ganze Partie für alle fünf Spieler angehalten.

   Hier wird deshalb nur die Form geprüft, nicht der Inhalt: Listen sind
   Listen, Einträge sind Objekte mit Zeichenketten und Zahlen an den Stellen,
   an denen runQuarter() sie erwartet. Was nicht passt, fällt still weg — wie
   jede andere unzulässige Referenz auch. Ob ein Gebot zu hoch, eine
   Beteiligung fremd oder eine Maßnahme belegt ist, prüft weiterhin
   runQuarter() gegen den Spielstand. Eine Abgabe in der richtigen Form kommt
   unverändert heraus, die Wiederholung alter Halbjahre bleibt also exakt. */
import type {
  Bid, EquityInjectionIntent, ExitStartIntent, HireIntent, InitiativeIntent, OfferDecisionIntent,
  SearchIntent, TurnDecisions,
} from "./turnTypes.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const SEATS = new Set(["ceo", "cfo", "r3"]);
const DIMS = new Set(["plat", "acc"]);
const EXITS = new Set(["process", "bilateral", "cv", "ipo"]);
const CHOICES = new Set(["accept", "reneg", "abort"]);

const isObj = (x: unknown): x is Record<string, Any> => !!x && typeof x === "object" && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length < 200;
const list = (x: unknown): Any[] => (Array.isArray(x) ? x : []);
// Zahl oder nichts. Eine Zahl als Zeichenkette ("9") ist keine Zahl.
const num = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
const ids = (x: unknown): string[] => list(x).filter(isStr);

/* Felder einer Liste übernehmen, die die Prüfung bestehen; der Rest des
   Eintrags fällt weg. Optionale Zahlen bleiben nur, wenn sie Zahlen sind. */
function entries<T>(x: unknown, make: (o: Record<string, Any>) => T | null): T[] {
  const out: T[] = [];
  list(x).forEach((o) => {
    if (!isObj(o)) return;
    const v = make(o);
    if (v) out.push(v);
  });
  return out;
}
const opt = (o: Record<string, Any>, k: string) => (num(o[k]) !== undefined ? { [k]: num(o[k]) } : {});

export function sanitizeDecisions(raw: unknown): TurnDecisions {
  if (!isObj(raw)) return {};
  const d: TurnDecisions = {};
  /* Gebote behalten auch ungültige Zahlen: runQuarter() meldet sie dem Bieter
     ("außerhalb des Zulässigen"), statt sie wortlos zu verwerfen. Als NaN
     kommen sie dort an und fallen durch dieselbe Prüfung. */
  const bids = entries<Bid>(raw.bids, (o) => (isStr(o.dealId)
    ? { dealId: o.dealId, multiple: num(o.multiple) ?? NaN, leverage: num(o.leverage) ?? NaN } : null));
  if (bids.length) d.bids = bids;
  if (Array.isArray(raw.dueDiligence)) d.dueDiligence = ids(raw.dueDiligence);
  if (Array.isArray(raw.studies)) d.studies = ids(raw.studies);
  if (Array.isArray(raw.ltip)) d.ltip = ids(raw.ltip);
  const inits = entries<InitiativeIntent>(raw.initiatives, (o) => (isStr(o.holdingUid) && DIMS.has(o.dim) && isStr(o.id)
    ? { holdingUid: o.holdingUid, dim: o.dim, id: o.id, ...opt(o, "equity"), ...opt(o, "addEb"), ...opt(o, "maxMult") } : null));
  if (inits.length) d.initiatives = inits;
  const inj = entries<EquityInjectionIntent>(raw.equityInjections, (o) => (isStr(o.holdingUid) && num(o.amount) !== undefined
    ? { holdingUid: o.holdingUid, amount: num(o.amount)! } : null));
  if (inj.length) d.equityInjections = inj;
  const searches = entries<SearchIntent>(raw.searches, (o) => (isStr(o.holdingUid) && SEATS.has(o.seat)
    ? { holdingUid: o.holdingUid, seat: o.seat } : null));
  if (searches.length) d.searches = searches;
  const hires = entries<HireIntent>(raw.hires, (o) => (isStr(o.holdingUid) && SEATS.has(o.seat) && isStr(o.choice)
    ? { holdingUid: o.holdingUid, seat: o.seat, choice: o.choice as HireIntent["choice"] } : null));
  if (hires.length) d.hires = hires;
  const exits = entries<ExitStartIntent>(raw.exitStarts, (o) => (isStr(o.holdingUid) && EXITS.has(o.action)
    ? { holdingUid: o.holdingUid, action: o.action, ...opt(o, "keepPct") } : null));
  if (exits.length) d.exitStarts = exits;
  /* Ein Gebot wird über seine Position angesprochen. Fehlt sie, gilt das erste
     (so schickt es die Ansicht seit jeher); ist sie da, aber keine ganze Zahl,
     fällt die Entscheidung weg — sonst würde stillschweigend ein anderes Gebot
     angenommen als das gemeinte. */
  const offers = entries<OfferDecisionIntent>(raw.offerDecisions, (o) => {
    if (!isStr(o.holdingUid) || !CHOICES.has(o.choice)) return null;
    if (o.offerIndex != null && !(Number.isInteger(o.offerIndex) && o.offerIndex >= 0)) return null;
    return { holdingUid: o.holdingUid, choice: o.choice, ...(o.offerIndex != null ? { offerIndex: o.offerIndex } : {}), ...opt(o, "keepPct") };
  });
  if (offers.length) d.offerDecisions = offers;
  return d;
}
