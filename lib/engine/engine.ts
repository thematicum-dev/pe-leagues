/* Spiellogik: Stammdaten, Parameter und reine Rechenfunktionen des
   PE-Leagues-Spiels. Kein React-Bezug — läuft im Browser wie in Node.
   Extrahiert 1:1 aus components/PeLeagues.tsx; die einzige inhaltliche
   Änderung ist, dass Funktionen mit Zufallsbedarf ihre Zufallsinstanz
   (siehe rng.ts) als Parameter bekommen, statt einen globalen
   Modul-Zustand zu teilen.                                            */
import type { Rng } from "./rng.ts";

export const SECTORS = {
  Industrials: { g: 3.0, m: 8.5 },
  Healthcare:  { g: 5.0, m: 11.0 },
  Software:    { g: 8.0, m: 13.0 },
  Services:    { g: 3.5, m: 9.0 },
  Consumer:    { g: 2.0, m: 8.0 },
};
export const SECNAMES = Object.keys(SECTORS);
// Nicht jede Flagge ist ein Risiko: die Buy-&-Build-Plattform ist die These,
// nicht der Preisdrücker. Wird deshalb getrennt ausgezeichnet.
export const ANGLES = ["Buy-&-Build-Plattform"];
export const isAngle = (fl) => ANGLES.indexOf(fl) >= 0;
// Anzeigenamen nach gängiger PE-Sektortaxonomie
export const SECLABEL = {
  Industrials: "Industrials", Healthcare: "Healthcare", Software: "Software & IT Services",
  Services: "Business Services", Consumer: "Consumer & Retail",
};
export const SECCOLOR = {
  Industrials: "#7C8B96", Healthcare: "#3E9B8F", Software: "#8478BE",
  Services: "#B4894C", Consumer: "#C4635C",
};

export const P1 = ["Bren", "Aur", "Kalt", "Hoch", "Stein", "Wald", "Rhein", "Nord", "Vel", "Mark", "Trave", "Isar", "Ober", "Sal", "Ferr", "Lind", "Grün", "Alt"];
export const P2 = ["ner", "avit", "mann", "burg", "feld", "tec", "mont", "sys", "werk", "thal", "stedt", "gau", "rath", "born", "eck", "hoff", "seil"];

/* Geschäftsmodell-Katalog: DACH-Mittelstandsarchetypen.
   m = EBITDA-Marge, g = Wachstum p.a., rb = Umsatzband, lev = Leverage-Kapazität,
   q = Qualitätsscore, fl = typische Risikoflaggen */
export const BOOK = {
  Industrials: [
    { s: ["Dichtungstechnik", "Polymertechnik"], cx: 5, nw: 20, m: [11, 17], g: [0, 3], rb: [30, 120], lev: [3.2, 4.2], q: [35, 60], fl: ["Kundenkonzentration", "Margendruck"],
      d: "Hersteller von Präzisionsdichtungen für Hydraulik- und Pneumatikanwendungen. Serienfertigung an zwei deutschen Standorten, rund 60 % des Umsatzes mit Tier-1-Zulieferern der Nutzfahrzeugindustrie, Rest Bau- und Landmaschinen." },
    { s: ["Systemtechnik", "Anlagenbau"], cx: 3, nw: 30, m: [8, 13], g: [2, 6], rb: [45, 180], lev: [2.8, 3.6], q: [40, 65], fl: ["Nachfolgesituation", "Kundenkonzentration"],
      d: "Sondermaschinenbau für Verpackungslinien in der Lebensmittelindustrie. Projektgeschäft mit Vorauszahlungen, 25 % des Umsatzes aus Service und Ersatzteilen, Auftragsbestand von neun Monaten." },
    { s: ["Oberflächentechnik", "Galvanik"], cx: 9, nw: 10, m: [14, 20], g: [0, 2], rb: [25, 80], lev: [3.0, 3.8], q: [30, 50], fl: ["Investitionsstau", "Margendruck"],
      d: "Lohnbeschichter für Elektro- und Automobilzulieferer. Standortgebundenes Geschäft mit hoher Anlagenintensität und energiepreisabhängiger Kostenbasis, Kunden im Umkreis von 200 Kilometern." },
    { s: ["Brandschutz", "Lufttechnik"], cx: 4, nw: 20, m: [15, 22], g: [3, 7], rb: [40, 150], lev: [3.8, 5.0], q: [60, 85], fl: ["Buy-&-Build-Plattform"],
      d: "Hersteller von Brandschutzklappen und Lüftungskomponenten. Bauaufsichtliche Zulassungen als Eintrittsbarriere, Vertrieb über den technischen Großhandel, Nachfrage getrieben von Sanierungszyklen im Gewerbebau." },
    { s: ["Elektrotechnik", "Schaltanlagen"], cx: 3, nw: 25, m: [7, 11], g: [2, 5], rb: [35, 140], lev: [2.6, 3.4], q: [25, 45], fl: ["Margendruck", "Kundenkonzentration"],
      d: "Kabelkonfektionierung und Schaltschrankbau für Maschinenbauer. Lohnintensives Geschäft mit Fertigung in Deutschland und Tschechien, geringe Wechselkosten auf Kundenseite." },
    { s: ["Messtechnik", "Prüftechnik"], cx: 4, nw: 22, m: [17, 24], g: [3, 6], rb: [30, 110], lev: [4.0, 5.2], q: [65, 88], fl: ["Nachfolgesituation"],
      d: "Anbieter von Werkstoffprüfmaschinen mit rund 40 % Aftersales-Anteil. Installierte Basis von über 6.000 Geräten weltweit, Kalibrierung und Wartung binden Kunden über Jahrzehnte." },
    { s: ["Zerspanung", "Feinwerktechnik"], cx: 8, nw: 18, m: [13, 18], g: [4, 9], rb: [20, 70], lev: [3.0, 4.0], q: [50, 75], fl: ["Kundenkonzentration", "Investitionsstau"],
      d: "Zerspanungsdienstleister für Luftfahrt- und Medizintechnikkomponenten. Nadcap- und ISO-13485-zertifiziert, drei Kunden stehen für zwei Drittel des Umsatzes, langfristige Rahmenverträge." },
  ],
  Healthcare: [
    { s: ["Medical", "Surgical"], cx: 6, nw: 20, m: [18, 26], g: [4, 9], rb: [30, 120], lev: [4.0, 5.2], q: [60, 88], fl: ["Investitionsstau"],
      d: "Hersteller von Einmalinstrumenten für die minimalinvasive Chirurgie. MDR-Zulassung erneuert, Vertrieb über Klinikeinkaufsverbünde, Produktion mit eigener Reinraumfertigung." },
    { s: ["Dentaltechnik", "Dentallabore"], cx: 5, nw: 12, m: [14, 20], g: [3, 7], rb: [25, 90], lev: [3.6, 4.6], q: [45, 70], fl: ["Buy-&-Build-Plattform"],
      d: "Dentallabor-Gruppe mit zentraler CAD/CAM-Fertigung und angeschlossenen Regionallaboren. Wachstum über Zukäufe von Nachfolgekandidaten, Abrechnung über Zahnarztpraxen." },
    { s: ["Homecare", "Versorgung"], cx: 2, nw: 25, m: [11, 16], g: [4, 8], rb: [40, 160], lev: [3.4, 4.4], q: [40, 62], fl: ["Margendruck"],
      d: "Homecare-Versorger für Stoma-, Wund- und enterale Ernährungstherapie. Umsatz über Kassenverträge und Ausschreibungen, damit erlösseitig unmittelbar von Erstattungsentscheidungen abhängig." },
    { s: ["Orthopädie", "Orthetik"], cx: 4, nw: 22, m: [16, 22], g: [2, 6], rb: [25, 95], lev: [3.8, 4.8], q: [50, 75], fl: ["Kundenkonzentration"],
      d: "Hersteller orthopädischer Bandagen und Orthesen. Eigenmarke im Rezeptgeschäft plus OEM-Fertigung für zwei internationale Konzerne, Vertrieb über Sanitätshäuser." },
    { s: ["Clinical", "Research"], cx: 3, nw: 15, m: [13, 19], g: [7, 14], rb: [30, 130], lev: [3.2, 4.2], q: [55, 82], fl: ["Kundenkonzentration", "Nachfolgesituation"],
      d: "Auftragsforschungsinstitut für klinische Studien der Phasen II und III mit Schwerpunkt Onkologie. Auftragsbestand von 18 Monaten, Kunden sind mittelgroße Biotechs ohne eigene Studieninfrastruktur." },
    { s: ["Radiologie", "Diagnostik"], cx: 12, nw: 5, m: [20, 28], g: [3, 6], rb: [35, 140], lev: [4.2, 5.5], q: [55, 80], fl: ["Investitionsstau", "Buy-&-Build-Plattform"],
      d: "Betreiber radiologischer Versorgungszentren an sieben Standorten. Kassenzulassungen als Eintrittsbarriere, hoher Investitionsbedarf für MRT- und CT-Erneuerung im kommenden Zyklus." },
    { s: ["Cleanroom", "Reinraumtechnik"], cx: 5, nw: 18, m: [17, 23], g: [5, 10], rb: [20, 85], lev: [4.0, 5.0], q: [62, 86], fl: [],
      d: "Zulieferer von Reinraum-Verbrauchsmaterialien für die Pharma- und Biotechproduktion. Nahezu vollständig wiederkehrende Umsätze, qualifizierungspflichtige Produkte mit langen Requalifizierungszyklen." },
  ],
  Software: [
    { s: ["Software", "Systems"], cx: 2, nw: 5, m: [16, 24], g: [4, 9], rb: [15, 70], lev: [4.0, 5.2], q: [50, 75], fl: ["Investitionsstau"],
      d: "ERP-Speziallösung für Handwerks- und Baubetriebe. Rund 70 % Wartungserlöse aus der On-Premise-Basis, Migration der Bestandskunden in die eigene Cloud läuft seit zwei Jahren." },
    { s: ["Digital", "Cloud"], cx: 1.5, nw: -5, m: [18, 28], g: [12, 22], rb: [12, 55], lev: [4.2, 5.5], q: [65, 92], fl: [],
      d: "SaaS für Instandhaltungs- und Einsatzplanung bei Energieversorgern. Reines Abomodell mit Nettoumsatzretention von 108 %, durchschnittliche Vertragslaufzeit drei Jahre." },
    { s: ["Health IT", "Praxissysteme"], cx: 2, nw: 0, m: [22, 30], g: [3, 7], rb: [18, 75], lev: [4.4, 5.5], q: [60, 88], fl: ["Margendruck"],
      d: "Abrechnungs- und Praxisverwaltungssoftware für niedergelassene Ärzte. Hohe Wechselkosten und Marktanteil in der Nische, Produktzyklen von Regulierung und Telematikinfrastruktur getrieben." },
    { s: ["Retail Systems", "Warenwirtschaft"], cx: 2, nw: 5, m: [15, 22], g: [4, 8], rb: [20, 90], lev: [3.8, 4.8], q: [50, 72], fl: ["Kundenkonzentration"],
      d: "Warenwirtschaft für Apotheken mit angeschlossener Zahlungsabwicklung. Umsatzmix aus Lizenz, Wartung und Transaktionsgebühren, Nachfrage regulatorisch getrieben." },
    { s: ["Mobility", "Fleet"], cx: 2, nw: 0, m: [12, 20], g: [10, 18], rb: [10, 50], lev: [3.6, 4.6], q: [55, 80], fl: [],
      d: "Plattform für Fuhrpark- und Schadenmanagement. Erlös je Fahrzeug und Monat plus Provisionen aus Werkstattvermittlung, Wachstum über Flottenkunden ab 200 Fahrzeugen." },
    { s: ["IT Services", "Consulting"], cx: 1.5, nw: 18, m: [9, 14], g: [3, 8], rb: [30, 130], lev: [3.0, 3.8], q: [35, 55], fl: ["Margendruck", "Nachfolgesituation"],
      d: "IT-Dienstleister mit SAP-Beratung und Managed Services. Personalintensives Geschäft mit 45 % wiederkehrenden Umsätzen, Auslastung und Fluktuation sind die entscheidenden Stellgrößen." },
    { s: ["Bau Software", "Aufmaß"], cx: 2, nw: 8, m: [17, 25], g: [5, 10], rb: [12, 45], lev: [4.0, 5.0], q: [55, 78], fl: ["Investitionsstau"],
      d: "Software für Bauabrechnung, Aufmaß und Nachtragsmanagement. Umstellung vom Einmallizenz- auf das Abomodell begonnen, mobile Erfassung auf der Baustelle als Differenzierung." },
  ],
  Services: [
    { s: ["Gebäudetechnik", "Facility"], cx: 3, nw: 18, m: [10, 15], g: [3, 7], rb: [35, 150], lev: [3.4, 4.4], q: [45, 68], fl: ["Buy-&-Build-Plattform"],
      d: "Technischer Gebäudeservice für Heizung, Lüftung und Klima. Wartungsverträge mit Laufzeiten von drei bis fünf Jahren, regionale Verdichtung um vier Ballungsräume." },
    { s: ["Logistik", "Kontraktlogistik"], cx: 6, nw: 12, m: [6, 10], g: [4, 9], rb: [50, 200], lev: [2.6, 3.4], q: [25, 45], fl: ["Kundenkonzentration", "Margendruck"],
      d: "Kontraktlogistik für Retourenabwicklung im Onlinehandel. Volumengetriebenes Geschäft mit geringer Marge, zwei Großkunden stellen mehr als die Hälfte des Umsatzes." },
    { s: ["Prüfdienste", "Zertifizierung"], cx: 5, nw: 12, m: [18, 25], g: [4, 8], rb: [25, 95], lev: [4.0, 5.2], q: [60, 85], fl: [],
      d: "Akkreditierter Prüf- und Zertifizierungsdienstleister für Elektrogeräte und Maschinen. Wiederkehrende Prüfzyklen und normative Pflichten sichern planbare Auslastung." },
    { s: ["Personal", "Pflegedienste"], cx: 1, nw: 20, m: [7, 12], g: [5, 11], rb: [30, 120], lev: [2.8, 3.6], q: [25, 45], fl: ["Margendruck", "Kundenkonzentration"],
      d: "Personaldienstleister für Pflege- und Medizinberufe. Arbeitnehmerüberlassung mit tariflicher Bindung, Ergebnis hängt an der Rekrutierungsquote und an Einsatzstunden pro Mitarbeiter." },
    { s: ["Kalibrierung", "Servicetechnik"], cx: 5, nw: 12, m: [16, 22], g: [3, 6], rb: [15, 60], lev: [3.8, 4.8], q: [55, 78], fl: ["Nachfolgesituation"],
      d: "Kalibrierdienstleister für Industriemesstechnik. Gesetzlich vorgeschriebene Intervalle erzeugen wiederkehrende Aufträge, Kundenbindung über Gerätehistorie und Prüfmitteldatenbank." },
    { s: ["Waschanlagen", "Autoservice"], cx: 11, nw: 0, m: [22, 30], g: [2, 6], rb: [20, 80], lev: [4.2, 5.5], q: [40, 65], fl: ["Investitionsstau", "Buy-&-Build-Plattform"],
      d: "Betreiber von Portal- und Waschstraßenanlagen an 30 Standorten. Hohe Fixkostenbasis und Standortqualität als Werttreiber, Zukäufe einzelner Betreiber als Wachstumspfad." },
    { s: ["Ingenieurbüro", "Planung"], cx: 1.5, nw: 25, m: [11, 16], g: [2, 6], rb: [20, 75], lev: [3.0, 4.0], q: [40, 62], fl: ["Nachfolgesituation", "Kundenkonzentration"],
      d: "Ingenieurbüro für Tragwerksplanung und Bauüberwachung. Überwiegend öffentliche Auftraggeber mit HOAI-Vergütung, Schlüsselpersonenrisiko bei den drei Gesellschaftern." },
  ],
  Consumer: [
    { s: ["Petfood", "Tiernahrung"], cx: 5, nw: 20, m: [10, 15], g: [3, 8], rb: [40, 160], lev: [3.4, 4.4], q: [35, 58], fl: ["Kundenkonzentration", "Margendruck"],
      d: "Hersteller von Nass- und Trockenfutter als Handelsmarke für den Lebensmitteleinzelhandel. Rohstoffpreise werden mit Verzögerung weitergegeben, drei Handelsketten dominieren den Absatz." },
    { s: ["Outdoor", "Ausrüstung"], cx: 3, nw: 35, m: [12, 18], g: [5, 11], rb: [25, 100], lev: [3.2, 4.2], q: [50, 78], fl: ["Investitionsstau"],
      d: "Premiummarke für Outdoor- und Bergsportausrüstung. 35 % Direktvertrieb über den eigenen Onlineshop, Rest über Fachhandel, saisonal stark schwankende Working-Capital-Bindung." },
    { s: ["Backwaren", "Manufaktur"], cx: 6, nw: 3, m: [9, 14], g: [2, 6], rb: [25, 90], lev: [3.0, 4.0], q: [30, 52], fl: ["Investitionsstau", "Margendruck"],
      d: "Regionale Bäckereikette mit 60 Filialen und zentraler Produktion. Ergebnis getrieben von Standortqualität, Personalkostenquote und Energiepreisen im Backprozess." },
    { s: ["Nutrition", "Vitalstoffe"], cx: 3, nw: 25, m: [14, 21], g: [6, 13], rb: [15, 70], lev: [3.6, 4.6], q: [45, 70], fl: ["Margendruck"],
      d: "Anbieter von Nahrungsergänzungsmitteln mit Eigenmarke und Lohnfertigung für Dritte. Wachstum über Onlinekanäle und Apothekenlistung, Werbedruck bestimmt die Marge." },
    { s: ["Objekteinrichtung", "Möbelwerke"], cx: 4, nw: 28, m: [8, 13], g: [1, 5], rb: [30, 120], lev: [2.8, 3.6], q: [30, 52], fl: ["Kundenkonzentration", "Nachfolgesituation"],
      d: "Möbelhersteller für die Objektausstattung von Hotels, Büros und Pflegeeinrichtungen. Projektgeschäft mit langen Vorlaufzeiten und hoher Abhängigkeit von der Bauzyklik." },
    { s: ["Hausgeräte", "Küchenzubehör"], cx: 2.5, nw: 30, m: [11, 17], g: [3, 7], rb: [20, 85], lev: [3.4, 4.4], q: [40, 62], fl: ["Margendruck"],
      d: "Anbieter von Küchen- und Haushaltszubehör unter eigener Handelsmarke. Absatz über Fachhandel und Marktplätze, Beschaffung überwiegend aus Fernost mit entsprechendem Frachtkostenrisiko." },
    { s: ["Mineralbrunnen", "Getränke"], cx: 8, nw: 12, m: [15, 22], g: [0, 4], rb: [25, 95], lev: [3.8, 4.8], q: [40, 65], fl: ["Investitionsstau"],
      d: "Regionaler Mineralbrunnen mit eigener Quelle und Mehrweg-Abfüllung. Wirtschaftlicher Lieferradius von rund 150 Kilometern, Investitionsstau bei Abfülllinie und Kastenpark." },
  ],
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const eur = (v) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString("de-DE") + " Mio. €";
export const x = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1 }) + "×";
export const hj = (n) => (Math.round(n) === 1 ? "1 Halbjahr" : Math.round(n) + " Halbjahre");
export const gebote = (n) => (n === 1 ? "1 Gebot" : n + " Gebote");
export const pct = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1 }) + " %";
export const pctS = (v) => (Math.abs(v) < 0.05 ? "" : v > 0 ? "+" : "−") + pct(Math.abs(v));

export function newDeal(rng: Rng, type: string, market: Record<string, number>, sourcing = 2) {
  const sector = rng.pick(SECNAMES);
  const a = rng.pick(BOOK[sector]);
  const quality = clamp(rng.band(a.q) + rng.nrm(4), 10, 97);
  const revenue = rng.band(a.rb) * SIZE_SCALE;
  const margin = clamp(rng.band(a.m) + rng.nrm(1), 4, 40);
  /* Preis orientiert sich am Bewertungsmultiple des Ziels, nicht am rohen
     Sektormultiple — und benutzt exakt denselben Qualitätsfaktor wie die
     Bewertung (QUAL_COEF). Sonst entstünde beim Closing ein systematischer
     Aufwertungsgewinn: jeder Deal wäre am Tag des Vollzugs mehr wert als der
     gezahlte Preis, ganz ohne unternehmerische Leistung.                    */
  const navF = 0.7 + QUAL_COEF * quality;
  /* Der Abschlag beim proprietären Deal ist der Ertrag der eigenen Origination:
     Wer besser sourct, spricht früher mit dem Gesellschafter und zahlt weniger. */
  const disc = type === "prop" ? 0.5 + rng.rnd() * 0.5 + 0.12 * sourcing : 0;
  const askMult = clamp(market[sector] * navF * (0.96 + rng.rnd() * 0.08) - disc, 4, 18);
  /* Bisheriges Wachstum und künftige Performance gegenüber dem Markt hängen
     zusammen — der Drift ist genau dieser dauerhafte Vorsprung oder Rückstand
     zum Sektor. Vorher wurde er erst beim Closing gewürfelt und `growth` nach
     dem Kauf nie wieder benutzt: die einzige Zahl auf der Karte, die nach
     Prognose aussah, sagte nichts vorher. Jetzt erklärt sie rund die Hälfte der
     Varianz, der Rest bleibt echte Unsicherheit. GROWTH_MEAN zentriert die
     Differenz, damit der Drift im Mittel null bleibt und die Bewertung nicht
     verrutscht.                                                              */
  const growth = rng.band(a.g) + rng.nrm(1);
  const drift = clamp(DRIFT_LOAD * (growth - SECTORS[sector].g - GROWTH_MEAN) + rng.nrm(2.6), -6, 6);
  return {
    id: "d" + Math.floor(rng.rnd() * 1e9),
    type, sector, revenue, margin, quality,
    growth, drift,
    // fester Schätzfehler des Datenraums; die Analysefähigkeit skaliert ihn nur
    dnoise: rng.nrm(1),
    askMult,
    levCap: clamp(rng.band(a.lev), 2.5, 5.5),
    capexPct: a.cx, nwcPct: a.nw,
    // Branchentypische Niveaus des Geschäftsmodells — Referenz für jede Entwicklung
    benchMargin: (a.m[0] + a.m[1]) / 2, benchCapex: a.cx, benchNwc: a.nw,
    flag: a.fl.length && rng.rnd() < 0.55 ? rng.pick(a.fl) : null,
    desc: a.d,
    name: rng.pick(P1) + rng.pick(P2) + " " + rng.pick(a.s),
  };
}

export function ebitdaOf(c) { return (c.revenue * c.margin) / 100; }

/* Entwicklung relativ zum Branchenniveau des Geschäftsmodells.
   Reifegrad 2 einer Dimension = branchentypisch. Darunter holt man schnell auf,
   darüber muss man dauerhaft nachlegen — sonst Rückfall zum Mittelwert.      */
export const PLAT_BENCH = 2, ACC_BENCH = 2;
/* Operating Leverage: Umsatz wächst schneller als die Kostenbasis. Empirisch
   korrelieren Wachstum und Margenexpansion positiv (Gain.pro 2025: 58 % der
   wachsenden Unternehmen weiten die Marge aus, Median +130 bps, gegenüber
   44 % der schrumpfenden). Der früher pauschale Malus auf Wachstum ist raus —
   die Kosten des Wachstums stecken in drag, Capex und NWC während der Laufzeit. */
export const opLeverage = (c) => {
  const base = c.hist && c.hist[0] ? c.hist[0].rev : c.revenue;
  return clamp((c.revenue / Math.max(1, base) - 1) * 1.5, 0, 1.5);
};
export const targetMargin = (c) => (c.benchMargin ?? c.margin) + (c.plat - PLAT_BENCH) * 1.0
  + opLeverage(c) - overstretch(c) * 1.4
  // Gehälter stecken bereits in der ausgewiesenen Marge — nur die Veränderung seit Einstieg zählt
  - (seatLoad(c) - (c.baseLoad ?? seatLoad(c)))
  /* Nur Growth-Programme belasten die Marge: zusätzliche Vertriebsleute, Marketing
     und Anlaufverluste in neuen Märkten sind Run-Rate und stehen im EBITDA.
     Performance-Programme kosten Berater, Abfindungen und Parallelbetrieb — das
     sind Einmalaufwendungen unterhalb des EBITDA. Sie werden deshalb als
     Cash-Effekt gegen die Nettoverschuldung gebucht, nicht gegen die Marge.  */
  - (c.initA ? (c.initA.drag || 0) * (c.vcRun ? 0.5 : 1) : 0)
  + (c.marginDrift || 0)
  + (c.sector === "Industrials" && c.r3.skill >= 3 ? 0.3 : 0);
/* Verfall oberhalb des Branchenniveaus. Bis zur Benchmark ist ein Reifegrad ein
   Bestandskonto — eine konsolidierte Beschaffung verschwindet nicht wieder.
   Darüber schon: Preisdisziplin, Vertriebsschlagzahl und Prozessgüte über dem
   Marktniveau sind Zustände, die aktiv gehalten werden müssen. Ohne laufendes
   Programm zieht die Organisation zum Mittel zurück. Das ist zugleich der Preis
   der Zeit: Halten ist nicht mehr kostenlos.                                  */
export const DECAY = 0.08;
export function decayOf(lvl) { return DECAY * Math.max(0, lvl - 2); }

/* ---------- Streuung eines Halbjahres ----------
   Wie stark Wachstum und Marge einer Beteiligung um ihren Erwartungswert
   schwanken. Beide stehen als benannte Konstanten, weil außer stepCompany()
   auch die historischen Zahlen eines Zielunternehmens sie brauchen (siehe
   lib/engine/financials.ts): Die Historie einer Deal-Karte soll mit genau der
   Volatilität schwanken, mit der die Beteiligung später tatsächlich läuft.
   Eine zweite, frei gewählte Zahl dort würde eine Schwankung behaupten, die
   das Spiel gar nicht hat.

   rng.nrm(x) summiert vier Gleichverteilungen und zentriert sie; die
   Standardabweichung ist damit x·√(4/12) = 0,577·x.                       */
export const GROWTH_NOISE = 6;      // Streubreite auf das annualisierte Wachstum, in pp
export const MARGIN_NOISE = 0.6;    // Streubreite auf die Marge, in pp
export const NRM_SD = Math.sqrt(1 / 3);
/* Wahrscheinlichkeit eines Sonderereignisses je Beteiligung und Halbjahr
   (siehe EVENTS). Verlorener Schlüsselkunde, Großauftrag, abgesprungener CEO
   — Dinge, auf die der Spieler reagieren, die er aber nicht steuern kann.

   Bewusst niedrig gehalten: Bei 0,15 traf über eine Halteperiode von zehn
   Halbjahren im Schnitt anderthalb Mal ein Ereignis, und nur jede fünfte
   Beteiligung blieb ganz verschont. Das Ergebnis hing dadurch spürbarer am
   Würfel als an den Entscheidungen. Bei 0,10 bleibt das Risiko real — gut ein
   Drittel der Beteiligungen läuft ohne Zwischenfall —, ohne die Wertsteigerung
   zu überlagern. Die Marktereignisse (Multiple-Expansion, Sektorabschwung in
   runQuarter) sind davon unberührt: Sie treffen den ganzen Sektor und gehören
   zum Zyklus, nicht zum Zufall einer einzelnen Beteiligung.                */
export const EVENT_P = 0.10;
/* Wie oft ein Geschäftsjahr Einmalaufwendungen ausweist — Restrukturierung,
   ein Managementwechsel, ein abgebrochenes Programm. Betrifft die Historie
   eines Zielunternehmens (lib/engine/financials.ts): Während der
   Halteperiode entstehen Einmalaufwendungen nicht nach Wahrscheinlichkeit,
   sondern weil der Spieler ein Programm auflegt oder eine Position neu
   besetzt. Für die Zeit davor gibt es diese Entscheidung nicht, also steht
   hier eine Quote — rund jedes vierte Jahr, wie sie ein Vendor-Due-
   Diligence-Bericht typischerweise ausweist. Die Höhe stammt dagegen aus dem
   Maßnahmenkatalog (INITS): dieselben Beträge, die auch eine Beteiligung für
   ihre Programme zahlt.                                                    */
export const ONEOFF_P = 0.25;

/* ---------- Periodenerfassung für die Finanzberichte ----------
   Die Berichtsansicht (siehe lib/engine/financials.ts) rechnet nicht selbst,
   sie liest ab. Damit das geht, hält jede Beteiligung zwei Mitschriften:

   c.per — was stepCompany() für das laufende Halbjahr tatsächlich gerechnet
           hat. Ausnahmslos Halbjahresbeträge, keine hochgerechneten
           Jahreswerte (anders als c.cf, das für die Karte annualisiert).
   c.off — Einmaleffekte, die unterhalb des EBITDA direkt gegen die
           Nettoverschuldung gebucht werden und deshalb in keiner Formel von
           stepCompany() vorkommen: Programmkosten, Personalwechsel,
           nachgeholte Investitionen, Cash Release, Zukäufe, Ausschüttungen.
           Vorzeichen wie gebucht — positiv erhöht die Nettoverschuldung.

   Genau daraus entsteht die Unterscheidung von bereinigtem und berichtetem
   EBITDA: Die Engine rechnet mit Umsatz × Marge, also mit einem um alle
   Einmaleffekte bereinigten Ergebnis. Was sie zusätzlich gegen die
   Verschuldung bucht, ist der Unterschied zum berichteten Ergebnis.       */
/* ---------- Verhaltensstand für die Wiederholung ----------
   Ein bereits ausgewertetes Halbjahr muss sich exakt so nachrechnen lassen,
   wie es gespielt wurde — auch wenn die Engine seither korrigiert wurde. Nur
   so lassen sich laufende Partien nachträglich mit der Periodenmitschrift
   versehen (siehe lib/engine/replay.ts). Jeder Eintrag hier ist eine
   Korrektur, die das Spielverhalten verändert hat; die Wiederholung schaltet
   sie ab und rechnet nach dem Stand, unter dem tatsächlich gespielt wurde.

   Die Liste ist bewusst kurz zu halten. Wächst sie über eine Handvoll
   Einträge, ist das das Zeichen, laufende Partien bei Regeländerungen
   zurückzusetzen, statt zwei Regelstände dauerhaft parallel zu pflegen.    */
export interface EngineCompat {
  /* Bis 30.08.2026 buchte buildInit() den Kaufpreis eines Add-ons nicht gegen
     die Nettoverschuldung: Der Zukauf war im Mehrspieler- und KI-Pfad
     geschenkt, während der Übungsmodus ihn bezahlte.                       */
  addonWithoutDebt?: boolean;
  /* Bis 30.08.2026 wurde die Veränderung des Working Capital nur auf den
     Umsatzzuwachs gerechnet, nie auf den Bestand — eine verbesserte
     Kapitalbindungsquote setzte deshalb nichts frei. Ersatzweise gab es beim
     NWC-Programm einen pauschalen Einmaleffekt (legacyRelease).            */
  nwcOnIncrementOnly?: boolean;
  /* Bis 31.08.2026 traf ein Sonderereignis eine Beteiligung mit 15 % je
     Halbjahr statt mit EVENT_P. Ob ein Ereignis eintritt, verschiebt den
     ganzen weiteren Zufallsstrom — ohne diesen Schalter ließe sich kein
     Halbjahr von davor mehr nachrechnen.                                   */
  legacyEventP?: boolean;
}
/* Ereigniswahrscheinlichkeit im jeweiligen Regelstand. */
export const eventPOf = (compat: EngineCompat = {}) => (compat.legacyEventP ? 0.15 : EVENT_P);
export const LEGACY_COMPAT: EngineCompat = {
  addonWithoutDebt: true, nwcOnIncrementOnly: true, legacyEventP: true,
};

export const OFF_KEYS = ["restr", "mgmt", "capexOff", "nwcRel", "addon", "dist"];
/* Welche Einmaleffekte im berichteten EBITDA stehen und beim bereinigten
   wieder hinzugerechnet werden: Programm- und Personalkosten. Nachgeholte
   Investitionen, Cash Release, Zukäufe und Ausschüttungen sind keine
   Ergebnisgrößen — sie stehen unterhalb des EBITDA.                        */
export const OFF_EBITDA_KEYS = ["restr", "mgmt"];

export function bookOff(c, key: string, amt: number) {
  if (!c || !(Math.abs(amt) > 1e-12)) return;
  c.off = { ...(c.off || {}), [key]: (((c.off || {})[key]) || 0) + amt };
}
export function offOf(c) {
  const o = (c && c.off) || {};
  const out = {};
  OFF_KEYS.forEach((k) => { out[k] = o[k] || 0; });
  return out;
}
/* Der Finanzteil einer hist-Zeile: die Halbjahresbeträge aus stepCompany plus
   die Einmaleffekte derselben Periode. Wird beim Periodenschluss geschrieben,
   danach setzt resetPeriod() den Einmaleffekt-Zähler zurück.               */
export function periodFin(c) {
  if (!c || !c.per) return null;
  return { ...c.per, ...offOf(c) };
}
export function resetPeriod(c) { if (c) c.off = null; }
/* Unveränderliche Variante für die React-Pfade in components/PeLeagues.tsx:
   dort werden Beteiligungen per map() ersetzt statt mutiert. Bucht den Betrag
   in einem Zug auf Nettoverschuldung und Einmaleffekt-Konto, damit beide nie
   auseinanderlaufen können.                                                 */
export function chargeOff(h, key: string, amt: number) {
  if (!(Math.abs(amt) > 1e-12)) return h;
  return { ...h, netDebt: h.netDebt + amt, off: { ...(h.off || {}), [key]: (((h.off || {})[key]) || 0) + amt } };
}

/* Investitions- und Kapitalbindungsquote einer Beteiligung, beide in Prozent
   vom Jahresumsatz. Stehen als eigene Funktionen, weil außer stepCompany()
   auch die Eröffnungsbilanz und die Berichtsansicht sie brauchen — zwei
   Abschriften derselben Formel würden früher oder später auseinanderlaufen. */
export const capexPctOf = (c) => Math.max(0.5, (c.benchCapex ?? 4) * (1 - 0.07 * (c.plat - PLAT_BENCH))
  + accEff(c) * 0.6 + sumInit(c, "cx")
  - (c.sector === "Industrials" && c.r3.skill >= 3 ? 0.5 : 0));
export const nwcPctOf = (c) => Math.max(-10, (c.benchNwc ?? 15) - (c.plat - PLAT_BENCH) * 2.5
  + accEff(c) * 2 + sumInit(c, "nwcRun") + (c.nwcFix || 0));
/* Gebundenes Working Capital in Mio. €. Für eine Beteiligung, die den Bestand
   noch nicht mitführt (Partie vor dem 30.08.2026), ergibt sich er aus Quote
   und Umsatz — genau der Wert, mit dem sie gestartet wäre.                 */
export const nwcBalanceOf = (c) => c.nwcBal != null ? c.nwcBal : (nwcPctOf(c) / 100) * c.revenue;

export function stepCompany(rng: Rng, c, market, ops, compat: EngineCompat = {}) {
  const A = accEff(c), OS = overstretch(c);
  const opsMult = 1 + 0.1 * ops;
  // Wachstum relativ zum Sektorniveau: Stufe 2 = branchenüblich
  const gAnn = SECTORS[c.sector].g + (c.drift || 0) + (A - ACC_BENCH) * 1.5 * opsMult + rng.nrm(GROWTH_NOISE);
  const rev0 = c.revenue;
  c.revenue = Math.max(4, c.revenue * (1 + gAnn / 200));

  // Marge läuft auf das erreichbare Niveau zu: Aufholen schneller als Halten
  const target = targetMargin(c);
  c.vcRun = anyInit(c) ? (c.vcRun || 0) + 1 : 0;
  const pull = c.margin < target ? 0.30 * opsMult : 0.40;
  c.margin = clamp(c.margin + (target - c.margin) * pull + rng.nrm(MARGIN_NOISE), 3, 45);

  const eb = ebitdaOf(c);
  // Capex und Working Capital relativ zum Branchenniveau verbessern
  const cxPct = capexPctOf(c);
  const capex = (c.revenue * cxPct) / 200;
  const nwcPct = nwcPctOf(c);
  /* Working Capital ist ein Bestand, keine Bewegung: Gebunden ist die Quote
     mal Umsatz, und was in der Periode zu- oder abfließt, ist die Veränderung
     dieses Bestands. Genau daran hängt die Wirkung eines NWC-Programms — eine
     um zwei Punkte bessere Quote setzt zwei Prozent des ganzen Umsatzes frei,
     nicht nur zwei Prozent des Zuwachses. Vorher lief die Quote nur auf den
     Zuwachs, ein besseres Working Capital blieb damit im Bestand gefangen und
     die Maßnahme wirkte fast nur über ihren pauschalen Einmaleffekt.       */
  const nwcBase = nwcBalanceOf({ ...c, revenue: rev0 });
  const nwcTarget = (nwcPct / 100) * c.revenue;
  const nwc = compat.nwcOnIncrementOnly ? (nwcPct / 100) * (c.revenue - rev0) : nwcTarget - nwcBase;
  c.nwcBal = nwcBase + nwc;

  /* ebitdaOf liefert einen Jahreswert — er ist die Basis für Bewertung und
     Leverage. Der Periodenschritt ist aber ein Halbjahr, deshalb geht nur die
     Hälfte in die Cash-Rechnung ein. Zins, Capex und NWC sind bereits
     Halbjahresgrößen.                                                        */
  const ebH = eb / 2;
  const rate = rateOf(c, eb);
  const interest = (c.netDebt >= 0 ? c.netDebt * rate : c.netDebt * c.rate * 0.4) / 200;
  const tax = TAX_RATE * Math.max(0, ebH - interest - capex);
  const fcf = ebH - interest - capex - nwc - tax;
  const nd0 = c.netDebt;
  c.netDebt = c.netDebt - fcf;
  /* Mitschrift für die Berichtsansicht: exakt die Beträge dieser Zeile, in
     Halbjahresgröße. cxPct und nwcPct kommen mit, weil Bilanz und Anhang
     sonst die Investitions- und Kapitalbindungsquote der Periode nicht
     kennen -- beide bewegen sich mit Reifegrad und laufenden Maßnahmen. */
  c.per = { revH: c.revenue / 2, ebH, interest, capex, nwc, tax, fcf, rate, cxPct, nwcPct, nd0,
    nwcBal: c.nwcBal };

  // Rückfall zum Mittel, solange in dieser Dimension keine Initiative läuft
  if (!c.initP) c.plat = Math.max(PLAT_BENCH, c.plat - decayOf(c.plat));
  if (!c.initA) c.acc = Math.max(ACC_BENCH, c.acc - decayOf(c.acc));

  c.holdQ += 1;
  /* Assetqualität folgt der realisierten Umsatz-CAGR seit Einstieg, nicht dem
     Wachstum einer einzelnen Periode. Vorher entschied das Wachstumsrauschen
     über das Vorzeichen, wodurch der Qualitätskanal für Growth praktisch tot war. */
  const relMargin = c.margin - (c.benchMargin ?? c.margin);
  const gPrem = cagrPrem(c);
  c.quality = clamp(
    c.quality + clamp(gPrem * 0.30, -1.2, 1.8)
    // stetig statt binär: wer sich der Benchmark nähert, wird dafür bezahlt,
    // statt bis zum Überschreiten die volle Strafe zu tragen
    + clamp(relMargin * 0.35, -0.8, 0.8) + 0.35 * (peopleLvl(c) - 2) - 1.8 * OS
    - (c.netDebt / eb > 5 ? 0.8 : 0) - Math.min(2.5, Math.max(0, 0.35 * (c.holdQ - 8))),
    5, 99
  );
  const covLev = c.netDebt / Math.max(0.5, eb);
  c.breach = covLev > (c.covLimit ?? 6.5) ? (c.breach || 0) + 1 : 0;
  // Für die Anzeige festhalten: die Karte zeigt die tatsächlichen Werte der Periode
  // Für die Anzeige auf Jahresbasis hochgerechnet, damit Karte und Dealflow
  // dieselbe Einheit sprechen wie EBITDA und Multiple.
  c.cf = { eb, interest: interest * 2, capex: capex * 2, nwc: nwc * 2, tax: tax * 2, fcf: fcf * 2, rate };
  return { fcf, eb, covLev };
}

export const EVENTS = [
  { t: "Schlüsselkunde kündigt", m: "analysis", bad: 1,
    f: (c) => { c.revenue *= 0.80; c.drift = (c.drift || 0) - 0.8; } },
  // Wirkt tatsächlich auf den Sitz — feuert nur, wenn er besetzt ist
  { t: "CEO verlässt das Unternehmen", m: "operations", bad: 1,
    ok: (c) => c.ceo.skill > 0,
    f: (c) => { c.ceo = vacate(c.ceo); c.quality -= 6; c.margin -= 0.5; } },
  { t: "CFO wirft hin", m: "operations", bad: 1,
    ok: (c) => c.cfo.skill > 0,
    f: (c) => { c.cfo = vacate(c.cfo); c.quality -= 3; } },
  { t: "Wettbewerber senkt Preise", m: "operations", bad: 1,
    f: (c) => { c.margin -= 2.5; c.marginDrift = (c.marginDrift || 0) - 1.5; } },
  { t: "Add-on-Gelegenheit genutzt", m: null, bad: 0,
    ok: (c) => c.netDebt / Math.max(0.5, ebitdaOf(c)) < (c.covLimit ?? 6.5) - 1.5,
    f: (c) => { c.revenue *= 1.25; const p = ebitdaOf(c) * 1.6; c.netDebt += p; bookOff(c, "addon", p); } },
  { t: "Investitionsstau aufgedeckt", m: "analysis", bad: 1,
    f: (c) => { const p = ebitdaOf(c) * 0.8; c.netDebt += p; bookOff(c, "capexOff", p); c.capexPct = (c.capexPct ?? 4) + 1.5; } },
  { t: "Regulatorische Auflage", m: "operations", bad: 1,
    // Der Healthcare-Sitz 3 halbiert regulatorische Ereignisse
    ok: (c, rng: Rng) => !(c.sector === "Healthcare" && c.r3.skill >= 3 && rng.rnd() < 0.5),
    f: (c) => { c.margin -= 1.2; c.marginDrift = (c.marginDrift || 0) - 0.8; } },
  { t: "Großauftrag gewonnen", m: null, bad: 0,
    f: (c) => { c.revenue *= 1.14; c.quality += 3; } },
  { t: "Managementteam zieht ein Großprojekt vor", m: null, bad: 0,
    ok: (c) => anyInit(c),
    f: (c) => {
      const k = c.initP ? "initP" : "initA";
      c[k] = { ...c[k], doneQ: Math.max(1, c[k].doneQ - 1) };
    } },
];

export const ARCHES = [
  { key: "sourcing", name: "Nordkap Capital",   attrs: { sourcing: 5, analysis: 2, negotiation: 2, operations: 2, financing: 1 }, aggr: 0.06, lev: 0.75, style: "Origination-getrieben" },
  { key: "ops",      name: "Hansabruck Partners", attrs: { sourcing: 2, analysis: 3, negotiation: 1, operations: 5, financing: 1 }, aggr: 0.02, lev: 0.6,  style: "Operativer Wertschöpfer" },
  { key: "fin",      name: "Aurum Partners",   attrs: { sourcing: 1, analysis: 2, negotiation: 3, operations: 1, financing: 5 }, aggr: 0.10, lev: 0.95, style: "Leverage-getrieben" },
  { key: "all",      name: "Vierturm Beteiligungen", attrs: { sourcing: 3, analysis: 3, negotiation: 2, operations: 2, financing: 2 }, aggr: 0.04, lev: 0.7,  style: "Generalist" },
];

/* ---------- Bewertungsparameter ----------
   QUAL_COEF steht bewusst an einer einzigen Stelle: Kaufpreis (newDeal) und
   Bewertung (markMultiple) müssen denselben Wert benutzen, sonst entsteht ein
   Aufwertungsgewinn allein durch den Vollzug.                                */
export const QUAL_COEF = 0.006;    // Qualitätsaufschlag je Punkt auf das Sektormultiple
/* Kopplung zwischen bisherigem Wachstum und erwarteter Performance vs. Markt.
   DRIFT_LOAD 0,30 auf eine Streuung von 3,2 pp ergibt ein Signal mit sd 0,96 pp
   gegen ein Residuum von 0,98 pp — die Karte erklärt rund die Hälfte.        */
export const DRIFT_LOAD = 0.45, GROWTH_MEAN = 1.6;
/* Schätzgüte des Datenraums: Analyse verkleinert den Fehler, beseitigt ihn nie.
   Ohne Due Diligence gibt es überhaupt keine Schätzung.                       */
export const driftErrSd = (analysis) => clamp(4.6 - 0.90 * analysis, 0.3, 4.6);
export const driftEstOf = (d, analysis) => d.drift + d.dnoise * driftErrSd(analysis);
export const driftBandOf = (analysis) => 1.3 * 0.577 * driftErrSd(analysis);
export const MULT_CAP = 1.60;      // Obergrenze: Vielfaches des Sektormultiples

export const CAPITAL = 500;
export const PERIODS = 20;         // 10 Jahre in Halbjahresschritten
export const MIN_HOLD = 6;         // Mindesthaltedauer: 3 Jahre
/* Zielgrößen skalieren mit dem Fondsvolumen. Ein 500-Mio.-Fonds, der dieselben
   Unternehmen kauft wie ein 300-Mio.-Fonds, bekommt sein Kapital nicht investiert:
   Bei fünf Slots und im Schnitt 69 Mio. € Eigenkapital je Deal sind höchstens
   347 Mio. € gleichzeitig gebunden — der Rest liegt herum und verwässert die
   Rendite. SIZE_SCALE hebt die Umsatzbänder entsprechend an.                  */
export const SIZE_SCALE = 1.25;
export const MAX_SLOTS = 6;        // gleichzeitige Beteiligungen
export const COV_HEADROOM = 1.2;   // Covenant-Spielraum über der Einstiegsverschuldung
export const RESERVE_PROC = 0.85;  // Reservationspreis in der Auktion, Anteil der Preiserwartung
export const RESERVE_PROP = 0.90;  // Reservationspreis des Gesellschafters beim Off-Market-Deal
export const COV_FLOOR = 4.0;      // Untergrenze des Covenants
export const BASE_RATE = 6.5;      // Basismarge auf die Akquisitionsfinanzierung (Euribor + Marge)
/* Ertragsteuersatz. Bemessungsgrundlage im Modell ist EBITDA abzüglich Zins und
   Capex — Capex steht dabei stellvertretend für die Abschreibung. Genau diese
   Konvention bildet die Berichtsansicht ab (D&A = Capex), sonst ließe sich der
   Steueraufwand der Engine in keiner GuV wiederfinden.                       */
export const TAX_RATE = 0.30;
/* Kreditmarge staffelt sich mit der Verschuldung. Bis 3,0× gilt die Basismarge,
   darüber kostet jeder weitere Turn 75 bp — so wie ein Kreditvertrag über ein
   Margin Grid funktioniert. Vorher war Leverage bis zum Covenant gratis und die
   einzige Bremse der Bruch; jetzt zahlt man für ihn, bevor es weh tut.       */
export const LEV_FREE = 3.0;       // Verschuldungsgrad, bis zu dem die Basismarge gilt
/* Der Aufschlag war auf 0,55 gesenkt worden, als die Verschuldung noch über den
   Covenant gebremst werden sollte. Gemessen war maximaler Leverage danach die
   dominante Strategie: 1,18 Wertung gegen 1,06 bei vorsichtiger Finanzierung,
   bei praktisch gleichem p10. Fremdkapital muss wieder kosten, was es kostet. */
export const LEV_STEP = 0.85;      // Aufschlag in Prozentpunkten je Turn darüber
export const rateOf = (c, eb) => {
  const lev = c.netDebt / Math.max(0.5, eb != null ? eb : ebitdaOf(c));
  return c.rate + Math.max(0, lev - LEV_FREE) * LEV_STEP;
};
/* Vergütung in Mio. € p.a. Marktanker ist der Branchenveteran auf Rating 2,5:
   bei 10 Mio. € EBITDA verdient der CEO 0,50, der CFO 0,30 und die Fachrolle 0,30.
   Die Unternehmensgröße geht mit der Wurzel ein — Gehälter wachsen deutlich
   langsamer als das EBITDA. Über dem Anker steigt die Kurve konvex: A-Player sind
   knapp und kosten überproportional, ein Entwicklungsprofil liegt darunter und
   wird mit wachsendem Rating automatisch teurer.                             */
export const SEAT_PAY = { ceo: 0.50, cfo: 0.30, r3: 0.30 };
export const PAY_ANCHOR = 2.5;     // Ratingniveau, auf dem SEAT_PAY gilt
export const sizeFactor = (eb) => Math.sqrt(clamp(eb, 2, 60) / 10);
export const ratingFactor = (sk) => 0.30 + 0.70 * Math.pow(Math.max(sk, 0.5) / PAY_ANCHOR, 1.35);
export const payOf = (seat, sk, eb) => SEAT_PAY[seat] * sizeFactor(eb) * ratingFactor(sk);
export const RETAINER_PCT = 0.30;  // Headhunter: 30 % eines Jahresgehalts, Marktstandard
export const signPct = (sk) => 0.10 + 0.05 * sk;   // Signing Bonus als Anteil eines Jahresgehalts
export const SEVER_YEARS = 1.0;    // Abfindung: zwölf Monatsgehälter des Amtsinhabers
// Der Retainer wird bei Mandatserteilung fällig, also auf Marktniveau, nicht
// auf dem erst später bekannten Rating des Kandidaten.
export const retainerOf = (seat, eb) => payOf(seat, PAY_ANCHOR, eb) * RETAINER_PCT;
export const signBonusOf = (seat, sk, eb) => payOf(seat, sk, eb) * signPct(sk);
export const severanceOf = (seat, sk, eb) => payOf(seat, sk, eb) * SEVER_YEARS;
export const INIT_SLOTS = 4;       // Initiativ-Slots pro Halbjahr fürs ganze Portfolio
export const LTIP_SHARE = 0.06;    // Sweet Equity des MEP am Exiterlös

// Position 3 je Sektor, treibt Growth; jede Rolle hat einen eigenen Sondereffekt
export const ROLE3 = {
  Industrials: { n: "CTO", fx: "−0,5 pp Capex durch Design-to-Cost" },
  Healthcare:  { n: "CTO", fx: "halbiert regulatorische Ereignisse" },
  Software:    { n: "CTO", fx: "zusätzlich halber Performance-Bonus" },
  Services:    { n: "Head of BD", fx: "senkt Kundenkonzentrationsrisiko" },
  Consumer:    { n: "CMO", fx: "+0,4× Multiple beim Exit an Strategen" },
};

/* Eine vakante Position spart kein Gehalt — sie wird interimistisch besetzt,
   und Interim ist teurer als der Vorgänger. Ohne diesen Boden hätte der Abgang
   des CEO die Marge verbessert und Nichtbesetzen wäre dominant gewesen.      */
export const INTERIM = 2.2;             // Budgetlinie einer von Anfang an offenen Position
export const INTERIM_PREMIUM = 1.25;    // Interim ist teurer als der Vorgänger
export const vacate = (s) => ({ skill: 0, was: Math.max(s.skill, INTERIM) });
export const seatPay = (s, seat, eb) => s.skill > 0 ? payOf(seat, s.skill, eb)
  : payOf(seat, s.was ?? INTERIM, eb) * INTERIM_PREMIUM;

export const POACH = 0.0008;                        // Abwerbung: seltenes Randrisiko
/* Personalkosten in Prozentpunkten der Marge, damit sie sich in targetMargin
   einreihen: Summe der Jahresgehälter geteilt durch den Umsatz.             */
export const seatLoad = (c) => {
  const eb = ebitdaOf(c);
  return (seatPay(c.ceo, "ceo", eb) + seatPay(c.cfo, "cfo", eb) + seatPay(c.r3, "r3", eb))
    / Math.max(4, c.revenue) * 100;
};
export const peopleLvl = (c) => (c.ceo.skill + c.cfo.skill + c.r3.skill) / 3;
// Eine Fachposition kann den CEO nicht überholen — A-Player berichten nicht an C-Player
export const cappedSkill = (c, seat) => seat === "ceo" ? c.ceo.skill : Math.min(c[seat].skill, c.ceo.skill + 1.5);
export const isCapped = (c, seat) => seat !== "ceo" && c[seat].skill > c.ceo.skill + 1.5;
// Effektives Rating: gedeckelte Fachposition plus halber CEO, plus MEP-Bonus
export const effSkill = (c, seat) => cappedSkill(c, seat) + 0.5 * c.ceo.skill + (c.ltip ? 0.5 : 0)
  + (seat === "cfo" && c.sector === "Software" ? 0.5 * cappedSkill(c, "r3") : 0);
/* Risiko hängt nicht an der Dimension, sondern daran, ob eine Maßnahme im
   Zugriff des Managements liegt oder auf Adoption durch Dritte angewiesen ist.
   "rel"  — Kosten, Working Capital, Pricing. Liefern zuverlässig (80–90 %) und
            scheitern nicht binär, sondern unterliefern.
   "tr"   — ERP, KI. Große interne Transformationsprogramme: aufwendig und
            binär im Ausgang, aber unter einem starken CFO durchaus beherrschbar.
            Liegen spürbar unter den verlässlichen Maßnahmen, aber im brauchbaren
            Bereich — ein Fehlschlag kostet dafür den vollen Sunk Cost.
   "hard" — Markteintritt. Der Erfolg hängt an Dritten: neuen Kunden in einem Markt,
            den man noch nicht kennt. Bleibt die schwächste Klasse.             */
export const PARTIAL_DELIVERY = 0.35;   // Teillieferung, wenn eine "rel"-Maßnahme das Ziel verfehlt
export const FAIL_SUNK = 0.15;          // Sunk Cost jedes Fehlschlags in EBITDA-Vielfachen
export const initSuccess = (E, cls = "hard") => cls === "rel"
  ? clamp(0.60 + 0.055 * E, 0.55, 0.97)
  : cls === "tr"
    ? clamp(0.56 + 0.048 * E, 0.50, 0.92)
    : clamp(0.20 + 0.072 * E, 0.20, 0.82);
export const CLS_LABEL = { rel: "verlässlich", tr: "Transformation", hard: "marktabhängig" };
// Ein starkes Team liefert schneller: ab effektivem Rating 3,2 in einem Halbjahr.
export const initDur = (E) => Math.max(1, 4 - Math.floor(E / 1.6));
/* Jede Maßnahme steht je Beteiligung nur einmal zur Verfügung, deshalb wiegt der
   einzelne Gewinn schwerer als früher. Er hängt weiterhin deutlich am Team:
   effektives Rating 2 bringt 1,07, Rating 6 bringt 1,68.                       */
export const initGain = (E) => 0.70 + 3.60 * E / (E + 4);
/* Je weiter über Branchenniveau, desto weniger bringt die nächste Maßnahme. Da
   erreichte Stufen nicht mehr verfallen, ist das die einzige Bremse gegen
   unbegrenztes Aufstocken — bewusst mild, damit Ausbauen sich lohnt.          */
export const ceilingFactor = (lvl) => Math.max(0.15, 1 - 0.13 * Math.max(0, lvl - 2));
export const ACC_SPREAD = [0.3, 1.3];   // Streubreite des Ergebnisses bei Acceleration

// Jede Maßnahme steht je Beteiligung genau einmal zur Verfügung.
/* Wie oft wurde diese Maßnahme in dieser Halteperiode schon aufgelegt?
   Vorher war jede genau einmal verfügbar. Das machte aus der Value Creation eine
   Abarbeitungsliste: sieben Maßnahmen, zwei Werkbänke, fertig — und ab der Mitte
   der Halteperiode gab es nichts mehr zu entscheiden. Jetzt lässt sich jede
   wiederholen; die Bremse ist wirtschaftlich statt formal. Zwei greifen
   zusammen: ceilingFactor macht jede weitere Stufe kleiner, und fitOf misst,
   ob überhaupt noch ein Defizit da ist, an dem die Maßnahme ansetzen kann.
   Ein zweites Cost-out auf einer Marge, die schon über Branchenniveau liegt,
   bringt nichts mehr — nicht weil eine Regel es verbietet, sondern weil nichts
   mehr zu holen ist.                                                          */
export const initRuns = (c, id) => ((c && c.done) || []).filter((x) => x === id).length;
export const initDone = (c, id) => initRuns(c, id) > 0;
/* Die zweite Auflage ist schwerer als die erste: die naheliegenden Hebel sind
   gezogen, was bleibt, sitzt tiefer in der Organisation.                      */
export const REPEAT_MAX = 4;
export const repeatMalus = (n) => ({ sm: -0.06 * n, dm: n >= 2 ? 1 : 0, gm: Math.pow(0.82, n) });
/* Performance und Growth sind zwei Werkbänke, nicht eine: das Cost-out treibt
   der CFO, die Expansion die Fachrolle. Sie liefen bisher hintereinander, was
   ein Wertsteigerungsprogramm über sieben Maßnahmen auf sieben Jahre streckte —
   der Grund, warum kurze Halteperioden im Spiel nichts einbrachten. Jetzt läuft
   je Beteiligung ein Programm pro Dimension parallel.                         */
export const initIn = (c, dim) => (dim === "plat" ? c.initP : c.initA);
export const initsOf = (c) => [c.initP, c.initA].filter(Boolean);
export const anyInit = (c) => !!(c.initP || c.initA);
export const sumInit = (c, key) => (c.initP && c.initP[key] || 0) + (c.initA && c.initA[key] || 0);

/* Maßnahmenkatalog. cls = Risikoklasse (rel / hard), sm = Modifikator Erfolgsquote,
   dm = Dauer, gm = Reifegradgewinn, cx = zusätzlicher Investitionsbedarf (pp vom
   Umsatz), oneOff = Einmalaufwand in EBITDA-Vielfachen (Cash, unterhalb des EBITDA),
   drag = laufende Margenbelastung (nur Growth), failCost = Sunk Cost bei Fehlschlag,
   failMargin = dauerhafter Margenschaden                                            */
export const INITS = {
  plat: [
    { id: "opex", n: "Cost-out-Programm", cls: "rel", d: "Einkauf bündeln, Gemeinkosten straffen, Standorte verdichten.",
      sm: 0.02, dm: -1, gm: 0.8, oneOff: 0.10, cx: 0 },
    /* Der Ertrag steckt jetzt in der Quote selbst: nwcFix senkt die
       Kapitalbindung dauerhaft, und weil die Quote auf dem Bestand rechnet,
       fließt der Unterschied sofort als Liquidität zu. legacyRelease ist der
       pauschale Einmaleffekt von früher und wird nur noch bei der
       Wiederholung alter Halbjahre angewandt (siehe EngineCompat).         */
    { id: "nwc", n: "NWC-Programm (Cash Release)", cls: "rel", d: "Forderungslaufzeiten, Bestände und Zahlungsziele. Senkt die Kapitalbindung dauerhaft und setzt den Unterschied sofort frei.",
      sm: 0.05, dm: 0, gm: 0.5, oneOff: 0.06, cx: 0, nwcFix: -3, legacyRelease: 0.35 },
    { id: "erp", n: "ERP & Digitalisierung", cls: "tr", d: "Systemlandschaft ersetzen. Großer Hebel, langer Atem — und ein Fehlschlag bringt gar nichts.",
      sm: 0.03, dm: 1, gm: 1.7, oneOff: 0.30, cx: 2.0, capexFix: -0.5, nwcFix: -1.5, failCost: 0.35 },
    { id: "ai", n: "KI-gestützte Prozessautomatisierung", cls: "tr", d: "Angebotserstellung, Planung und Service automatisieren. Größter Hebel im Katalog, dafür der anspruchsvollste.",
      sm: -0.02, dm: 0, gm: 2.2, oneOff: 0.25, cx: 1.0, capexFix: -0.9, failCost: 0.30,
      req: (c) => effSkill(c, "cfo") >= 4, reqT: "Effektives CFO-Rating mindestens 4" },
  ],
  acc: [
    { id: "pen", n: "Pricing & Cross-Selling", cls: "rel", d: "Bestandskunden ausbauen, Preise durchsetzen. Kurzer Payback, begrenzte Höhe.",
      sm: 0.07, dm: -1, gm: 0.8, drag: 0.5, cx: 0, spread: [0.7, 1.1] },
    { id: "exp", n: "Markt- und Segmentexpansion", cls: "hard", d: "Neue Regionen oder Segmente. Breite Streuung, teurer Fehlschlag.",
      sm: 0.16, dm: 1, gm: 1.3, drag: 1.0, cx: 0, nwcRun: 2, spread: [0.3, 1.4],
      failCost: 0.25, failMargin: -0.8 },
    { id: "ma", n: "Add-on M&A", cls: "tr", d: "Zukauf eines Wettbewerbers, fremdfinanziert. Multiple-Arbitrage — und Covenant-Risiko.",
      sm: -0.05, dm: 1, gm: 0, drag: 0.4, cx: 0, ma: true },
  ],
};
export const initById = (dim, id) => INITS[dim].find((i) => i.id === id);

/* ---------- Eignung einer Maßnahme ----------
   Bisher hatte jede Maßnahme einen festen Ertragsfaktor (gm). Damit war die
   Antwort auf jede Beteiligung dieselbe: alles machen, so schnell wie möglich.
   Keine Maßnahme war je falsch, nur unterschiedlich gut — und wo nichts falsch
   ist, gibt es keine Entscheidung.

   Jetzt hängt der Ertrag am konkreten Defizit des Unternehmens. Cost-out zahlt,
   wo Marge fehlt, und läuft leer, wo sie schon über dem Branchenniveau liegt.
   Ein NWC-Programm setzt nur frei, was gebunden ist. ERP und KI sind
   Fixkostenprogramme und rechnen sich erst ab einer gewissen Größe. Preissetzung
   braucht ein Asset, dem der Kunde etwas zutraut. Und Expansion lohnt in
   wachsenden Märkten — in einem stagnierenden verbrennt sie Marge.           */
export function fitOf(id, c) {
  const eb = ebitdaOf(c);
  switch (id) {
    case "opex":  return clamp(0.55 + 0.28 * ((c.benchMargin ?? 12) - c.margin), 0.10, 1.70);
    case "nwc":   return clamp(0.30 + 0.055 * (c.nwcPct ?? 12), 0.15, 1.60);
    case "erp":   return clamp(0.30 + 0.050 * eb, 0.25, 1.60);
    case "ai":    return clamp(0.25 + 0.045 * eb, 0.25, 1.60) * clamp(0.5 + 0.25 * c.plat, 0.5, 1.3);
    case "pen":   return clamp(0.30 + 0.014 * c.quality, 0.30, 1.70);
    case "exp":   return clamp(0.15 + 0.16 * (SECTORS[c.sector].g + (c.drift || 0)), 0.05, 1.70);
    default:      return 1;
  }
}
/* Klartext für den Maßnahmenpicker — der Spieler muss die Eignung sehen können,
   sonst ist sie verstecktes Wissen statt einer Entscheidungsgrundlage.       */
export function fitLabel(id, c) {
  const f = fitOf(id, c);
  const t = f >= 1.25 ? ["hoch", "var(--teal)"] : f >= 0.75 ? ["mittel", "var(--ink2)"]
    : f >= 0.45 ? ["gering", "var(--ox)"] : ["kaum", "var(--ox)"];
  const why = {
    opex: c.margin > (c.benchMargin ?? 12) + 0.5 ? "Marge liegt bereits über dem Branchenniveau"
      : c.margin < (c.benchMargin ?? 12) - 1 ? "Marge liegt deutlich unter dem Branchenniveau" : "Marge etwa auf Branchenniveau",
    nwc: (c.nwcPct ?? 12) >= 16 ? "hohe Kapitalbindung, entsprechend viel freisetzbar"
      : (c.nwcPct ?? 12) <= 8 ? "wenig gebundenes Kapital, wenig zu holen" : "durchschnittliche Kapitalbindung",
    erp: ebitdaOf(c) >= 18 ? "Größe trägt die Fixkosten des Programms"
      : ebitdaOf(c) <= 8 ? "für diese Größe ein teures Programm" : "Größe im mittleren Bereich",
    ai: ebitdaOf(c) >= 18 && c.plat >= 3 ? "Größe und Prozessreife tragen das Programm"
      : c.plat < 2.5 ? "Prozesse noch zu unreif für Automatisierung" : "Größe im mittleren Bereich",
    pen: c.quality >= 70 ? "starke Marktstellung, Preise sind durchsetzbar"
      : c.quality <= 45 ? "schwache Marktstellung, kaum Preissetzungsmacht" : "durchschnittliche Marktstellung",
    exp: SECTORS[c.sector].g >= 5 ? "wachsender Markt trägt die Expansion"
      : SECTORS[c.sector].g <= 3 ? "stagnierender Markt — Expansion kostet Marge ohne Gegenwert" : "Markt wächst moderat",
  }[id] || "";
  return { f, t: t[0], color: t[1], why };
}

/* Add-on-Preis: Branchenmultiple und Einstiegsmultiple der Plattform gemittelt,
   abzüglich der Größenarbitrage. Die Arbitrage schrumpft mit der Plattform —
   BCG/HHL finden, dass Buy-&-Build bei kleinen Plattformen deutlich outperformt
   und bei grossen Plattformen hinter Standalone-Deals zurückfällt.            */
/* Die Größenarbitrage schrumpft nicht nur mit der Plattform, sondern auch mit
   dem Marktumfeld: In einem heißgelaufenen Sektor sind auch kleine Ziele teuer.
   Und der Zukauf ist keine Einbahnstraße — sitzt ein Wettbewerber mit am Tisch,
   verschwindet die Arbitrage ganz. Vorher war jedes Add-on garantiert
   wertsteigernd, weil der Kaufpreis strukturell unter dem Plattformmultiple lag. */
export const addonArb = (c, market) => {
  const size = clamp(2.4 - Math.max(0, ebitdaOf(c) - 10) * 0.05, 0.4, 2.4);
  const heat = market ? clamp((market[c.sector] / SECTORS[c.sector].m - 1) * 3.0, -0.6, 1.6) : 0;
  return clamp(size - heat - (c.addonComp || 0), -1.2, 2.4);
};
/* Der Preis eines Zukaufs bemisst sich am heutigen Bewertungsmultiple der
   Plattform, nicht an einer Formel aus Sektor und Einstiegspreis. Das war der
   eigentliche Konstruktionsfehler: Die Plattform wurde nach jeder Maßnahme höher
   bewertet, der Zukauf blieb bei einer am Einstieg verankerten Zahl — die
   Arbitrage wuchs also mit der eigenen Arbeit und erreichte am Ende sechs Turns.
   Jetzt ist sie genau das, was sie sein soll: ein Größenabschlag von bis zu
   2,4 Turns, der mit der Plattform schrumpft und in heißen Märkten verschwindet. */
export const addonMultiple = (c, market) => Math.max(3, markMultiple(c, market) - addonArb(c, market));
export const addonEbitda = (c) => ebitdaOf(c) * (c.addonSize ?? 0.275);
export const ADDON_HEADROOM = 0.6;   // Mindestpuffer zum Covenant nach dem Zukauf
/* Pro-forma-Verschuldung nach dem Zukauf:
   (Nettoverschuldung PortCo + Kaufpreis) / (EBITDA PortCo + EBITDA Add-on)
   Reißt sie den Covenant, kommt die Finanzierung nicht zustande.              */
export function addonCheck(c, market) {
  const addEb = addonEbitda(c);
  const mult = addonMultiple(c, market);
  const price = addEb * mult;
  const lev = (c.netDebt + price) / Math.max(0.5, ebitdaOf(c) + addEb);
  /* Die Banken finanzieren einen Zukauf nicht bis auf den letzten Zentimeter an
     den Covenant heran — sie verlangen Puffer für den Fall, dass die Integration
     schiefgeht. ADDON_HEADROOM ist genau dieser Puffer. Vorher genügte formale
     Einhaltung, und die Plattform stand nach dem Zukauf regelmäßig mit 0,4×
     Restluft da: Ein einziger Nachfrageeinbruch reichte für den Breach.       */
  const limit = (c.covLimit ?? 6.5) - ADDON_HEADROOM;
  return { addEb, mult, price, lev, limit, ok: lev <= limit };
}
/* Integrationsrisiko. Vorher hing der Erfolg allein am Rating der Fachrolle —
   eine Plattform mit unreifen Prozessen und 4,5× Verschuldung integrierte einen
   Zukauf genauso zuverlässig wie eine durchsanierte. Genau dort scheitert
   Buy-&-Build in der Praxis: zu früh, zu groß, zu fremdfinanziert.           */
export function addonRisk(c) {
  const lev = c.netDebt / Math.max(0.5, ebitdaOf(c));
  return clamp(
    0.09 * (c.plat - 2.5)                      // reife Prozesse tragen die Integration
    - 0.07 * Math.max(0, lev - 3.0)            // jeder Turn über 3,0× kostet Handlungsfähigkeit
    - 0.55 * Math.max(0, (c.addonSize ?? 0.275) - 0.22),  // je größer der Bissen, desto riskanter
    -0.32, 0.12);
}

// Acceleration wirkt nur, soweit People und Platform sie tragen
export const accEff = (c) => Math.min(c.acc, peopleLvl(c) + 1, c.plat + 1);
export const overstretch = (c) => Math.max(0, c.acc - Math.min(peopleLvl(c) + 1, c.plat + 1));


/* Gemeinsamer Baustein für den Start einer Maßnahme. Spieler und KI benutzen
   dieselbe Funktion — vorher war die KI mit einem pauschalen Reifegradgewinn
   von 0,85 unterwegs, während der Spieler über initGain das Drei- bis Vierfache
   holte. Das war der eigentliche Grund, warum die Kohorte nie mithalten konnte. */
export function buildInit(rng: Rng, c, dim, id, market, quarter, compat: EngineCompat = {}) {
  const spec = initById(dim, id);
  if (!spec) return null;
  const runs = initRuns(c, id);
  if (runs >= REPEAT_MAX) return null;
  const rep = repeatMalus(runs);
  if (spec.req && !spec.req(c)) return null;
  const seat = dim === "plat" ? "cfo" : "r3";
  const E = effSkill(c, seat) * (c.onboard > 0 ? 0.7 : 1);
  const dur = Math.max(1, initDur(E) + (spec.dm || 0) + rep.dm);
  const p = clamp(initSuccess(E, spec.cls) + (spec.sm || 0) + rep.sm + (spec.ma ? addonRisk(c) : 0), 0.1, 0.97);
  const ok = rng.rnd() < p;
  const sp = spec.spread ? spec.spread[0] + rng.rnd() * (spec.spread[1] - spec.spread[0])
    : dim === "acc" ? ACC_SPREAD[0] + rng.rnd() * (ACC_SPREAD[1] - ACC_SPREAD[0]) : 1;
  let patch = { drag: spec.drag || 0, cx: spec.cx || 0, nwcRun: spec.nwcRun || 0 };
  let debt = ebitdaOf(c) * (spec.oneOff || 0);
  let chk = null;
  if (spec.ma) {
    chk = addonCheck(c, market);
    if (!chk.ok) return { blocked: chk };
    /* Ein Zukauf wird bezahlt. Bis 30.08.2026 fehlte diese Buchung hier —
       im Mehrspieler- und KI-Pfad kam das EBITDA des Add-ons an, ohne dass
       die Akquisitionsschuld je gebucht wurde, während der Übungsmodus sie
       (in seiner eigenen Kopie der Mechanik) korrekt buchte.               */
    if (!compat.addonWithoutDebt) debt += chk.price;
    /* Der Reifegradgewinn ist bewusst klein: Der Wert eines Zukaufs steckt im
       zugekauften EBITDA, nicht in einer dauerhaft schnelleren Organik. Vorher
       gab es hier eine volle Stufe obendrauf — rund zwei Drittel des gemessenen
       Vorteils kamen aus dieser Doppelzählung.                               */
    patch = { ...patch, ma: true, addEb: chk.addEb, mult: chk.mult, price: chk.price, gain: 0.35, ok };
  } else {
    patch = { ...patch, gain: initGain(E) * sp * (spec.gm || 1) * rep.gm * fitOf(id, c)
      * ceilingFactor(dim === "plat" ? c.plat : c.acc), ok };
  }
  return { spec, dur, p, ok, debt, chk, slot: dim === "plat" ? "initP" : "initA",
    init: { dim, id, name: spec.n, doneQ: quarter + dur, ...patch } };
}

/* Maßnahmenpräferenz der KI-Fonds. Jeder Archetyp arbeitet seine eigene Liste
   ab — der Operator zuerst die Kostenseite, der Leverage-Fonds zuerst den
   Zukauf. Getroffen wird immer die erste noch offene Maßnahme der Dimension. */
export const AI_PLAN = {
  ops:      { plat: ["opex", "erp", "nwc", "ai"], acc: ["pen", "exp"] },
  fin:      { plat: ["nwc", "opex"], acc: ["ma", "pen"] },
  sourcing: { plat: ["opex", "nwc", "erp"], acc: ["ma", "pen", "exp"] },
  all:      { plat: ["opex", "nwc", "erp", "ai"], acc: ["pen", "ma", "exp"] },
};

export function makeSeats(rng: Rng, d) {
  const r = (lo, hi) => lo + Math.floor(rng.rnd() * (hi - lo + 1));
  const retiring = d.flag === "Nachfolgesituation";
  return {
    ceo: { skill: retiring ? r(3, 4) : r(1, 4), retiring },
    cfo: { skill: rng.rnd() < 0.35 ? 0 : r(1, 3) },
    r3: { skill: rng.rnd() < 0.45 ? 0 : r(1, 3) },
  };
}
export function makeCandidates(rng: Rng) {
  const draw = (mid, sp) => clamp(mid + (rng.rnd() * 2 - 1) * sp, 1, 5);
  return [
    { label: "Der Branchenveteran", shown: 2.5, span: 0.5, skill: draw(2.5, 0.5), dev: false, poach: 1,
      note: "Zwanzig Jahre im Segment. Marktgehalt, keine Überraschungen, kein Sprung." },
    { label: "Der A-Player aus dem Konzern", shown: 5, span: 0.5, skill: draw(5, 0.5), dev: false, poach: 2,
      note: "Sofort auf Topniveau — doppeltes Gehalt, wird selbst abgeworben." },
    { label: "Das Entwicklungsprofil", shown: 2, span: 1.5, skill: draw(2, 1.5), dev: true, poach: 1,
      note: "Zweite Reihe, erste eigene Führungsrolle. +0,25 Rating je Halbjahr bis 4,5." },
  ];
}
/* ---------- Due Diligence ----------
   Kosten fallen an, sobald der Auftrag erteilt ist — ob der Deal zustande kommt
   oder nicht. Alles andere wäre keine Entscheidung: Wenn Prüfung beim Zuschlag
   gratis ist, prüft man immer alles, und der Datenraum könnte gleich offen
   danebenliegen. Der Preis skaliert mit der Transaktionsgröße, weil ein
   Berateraufwand von 2 Mio. € auf ein Ziel mit 5 Mio. € EBITDA absurd wäre und
   auf eines mit 40 Mio. € geschenkt.                                         */
export const DD_COST = 2;          // Referenzgröße für die Benchmarkstudie
export const ddCostOf = (d) => clamp(0.006 * ebitdaOf(d) * d.askMult, 0.6, 3.5);
/* Die eigentliche Knappheit ist nicht Geld, sondern das Deal-Team. Wer parallel
   an drei Datenräumen sitzt, macht keinen davon gut. Die Analysefähigkeit
   bestimmt, wie viele Prozesse gleichzeitig laufen können — damit bekommt das
   Attribut neben der Schätzgüte eine zweite, greifbare Wirkung.              */
export const ddCapOf = (analysis) => 1 + Math.floor(analysis / 2);
export const ENTRY_FEE = 0.02;     // Transaktionskosten beim Kauf, in % des EV
export const MGMT_FEE = 0.02;      // Management Fee p.a.
export const HURDLE = 0.08;        // Hurdle (Preferred Return) p.a.
export const CARRY = 0.20;         // Carried Interest
export const INVEST_PERIOD = 10;   // Ende der Investitionsperiode (Halbjahr 10 = Jahr 5)
export const BIL_DISC = 0.5;       // Multiple-Abschlag beim bilateralen Verkauf
/* Wer am Ende der Fondslaufzeit noch Beteiligungen hält, verkauft unter Zeitdruck
   an einen Markt, der das weiß. Der Abschlag war mit 1,5 Turns zu milde: "nie
   verkaufen" war damit genauso gut wie aktive Exitsteuerung, obwohl es keinerlei
   Können verlangt.                                                            */
export const LIQ_DISC = 2.6;       // Abschlag bei Zwangsabwicklung am Laufzeitende
export const PROC_FEE = 0.03;      // Transaktionskosten bei einer Auktion
export const BIL_FEE = 0.02;       // Transaktionskosten beim bilateralen Verkauf
export const CV_STAKE = 0.6;       // Anteil, der ins Continuation Vehicle verkauft wird
export const CV_DISC = 0.95;       // Abschlag auf den NAV im Secondary-Markt
export const CV_FEE = 0.015;
export const IPO_PLACE = 0.4;      // platzierter Anteil
export const IPO_DISC = 0.90;      // Emissionsabschlag
export const IPO_FEE = 0.04;
export const MAX_PROC = 3;         // gleichzeitig laufende Verkaufsprozesse
export const PROC_Q = 2;           // Dauer eines Verkaufsprozesses in Halbjahren
export const IPO_EBITDA = 25;      // Mindest-EBITDA für ein Börsenfenster

// Gebote am Ende eines Verkaufsprozesses
export function makeOffers(rng: Rng, c, market, funds, neg, q) {
  const fair = fairOf(c, market, neg, q);
  const out = [];
  const fit = rng.rnd() < 0.6;
  out.push({
    buyer: "Strategischer Käufer", kind: "strat",
    price: fair * (fit ? 1.00 + rng.rnd() * 0.08 : 0.92 + rng.rnd() * 0.08),
    risk: 0.12,
    note: fit ? "Synergien im Kerngeschäft, aber Fusionskontrolle offen" : "Fremder Sektor, rein finanzgetriebenes Interesse",
  });
  const sponsors = funds.filter((f, i) => i > 0 && f.cash > fair * 0.9 && f.holdings.length < MAX_SLOTS);
  if (sponsors.length) {
    const s = rng.pick(sponsors);
    out.push({
      buyer: s.name, kind: "sponsor", price: fair * (0.90 + rng.rnd() * 0.12), risk: 0,
      note: "Secondary Buyout — sieht nur die veröffentlichten Kennzahlen",
    });
  }
  out.push({
    buyer: "Family Office", kind: "family",
    price: fair * (0.86 + rng.rnd() * 0.06), risk: 0,
    note: "Zahlt am wenigsten, vollzieht aber sicher",
  });
  return out.sort((a, b) => b.price - a.price);
}
export const LM_ANNOUNCE = 8;      // Ankündigung des Trophy Assets
export const LM_DEAL = 10;         // Halbjahr, in dem es in den Dealflow kommt

export function newLandmark(rng: Rng, market: Record<string, number>) {
  const sector = rng.pick(SECNAMES);
  const cands = BOOK[sector].filter((a) => a.q[1] >= 70);
  const a = cands.length ? rng.pick(cands) : rng.pick(BOOK[sector]);
  const revenue = 180 + rng.rnd() * 110;
  const margin = clamp(rng.band(a.m) + 3, 10, 38);
  const quality = clamp(rng.band(a.q) + 14, 55, 97);
  return {
    id: "lm" + Math.floor(rng.rnd() * 1e9),
    type: "landmark", sector, revenue, margin, quality,
    growth: rng.band(a.g) + 1, drift: clamp(rng.nrm(1.5) + 0.4, -6, 6), dnoise: rng.nrm(1),
    askMult: clamp(market[sector] * (0.7 + 0.006 * quality) * (1.04 + rng.rnd() * 0.06), 5, 19),
    levCap: clamp(a.lev[1] + 0.3, 3, 5.5),
    capexPct: a.cx, nwcPct: a.nw,
    benchMargin: (a.m[0] + a.m[1]) / 2, benchCapex: a.cx, benchNwc: a.nw,
    flag: null,
    desc: a.d,
    name: rng.pick(P1) + rng.pick(P2) + " " + rng.pick(a.s) + " Gruppe",
  };
}

/* ---------- Bewertung ----------
   Kette: EBITDA × Multiple = Enterprise Value
          EV − Nettoverschuldung = Equity Value (100 %)
          × Anteilsquote = Wert des gehaltenen Anteils
          − Abschläge − Transaktionskosten = Erlös an den Fonds
   Der NAV kennt keinen Verhandlungsaufschlag: Verhandlungsgeschick wirkt
   erst in einer tatsächlichen Transaktion, nicht in der Bewertung.            */

/* Realisierte Umsatz-CAGR seit Einstieg, relativ zum Sektorwachstum (in pp). */
// Gibt null zurück, solange keine Halteperiode vorliegt — sonst stünde dort das
// Sektorwachstum, das ohne Due Diligence gar nicht bekannt sein darf.
export function cagrOf(c) {
  const base = c.hist && c.hist[0] ? c.hist[0].rev : 0;
  if (!base || !c.holdQ) return null;
  const yrs = Math.max(0.5, c.holdQ / 2);
  return (Math.pow(Math.max(0.05, c.revenue / base), 1 / yrs) - 1) * 100;
}
export function cagrPrem(c) {
  const g = cagrOf(c);
  return g == null ? 0 : g - SECTORS[c.sector].g;
}
/* Wachstum treibt das Exit-Multiple. Empirisch der stärkste Zusammenhang der
   Assetklasse: schnell wachsende Unternehmen werden mit 30–50 % höheren
   Multiples gehandelt. Greift erst nach einem vollen Jahr Halteperiode, damit
   beim Closing kein Bewertungssprung entsteht.                                */
export function growthPrem(c) {
  if (!c.hist || c.hist.length < 3) return 0;
  return clamp(cagrPrem(c) * 0.050, -0.20, 0.45);
}
/* Die Assetqualität trägt das Exit-Multiple stärker als früher: seit der
   Cashflow-Korrektur liefert die Entschuldung nur noch die Hälfte, der Wert muss
   aus EBITDA-Wachstum und Multiple-Aufwertung kommen — was der empirischen
   Zerlegung ohnehin näher liegt als ein Leverage-getriebenes Ergebnis.      */
/* Altbestandsabschlag. Ein Asset, das seit Jahren im Portfolio liegt, verkauft
   sich schlechter: Die Käufer wissen, dass die naheliegenden Maßnahmen gehoben
   sind, der Verkäufer unter Zeitdruck steht und andere Fonds das Objekt bereits
   angesehen und abgelehnt haben. Ab vier Jahren Haltedauer 2 % je Halbjahr,
   gedeckelt bei 20 %. Das ist der zweite Preis der Zeit, neben dem IRR.       */
export const STALE_FROM = 8, STALE_STEP = 0.02, STALE_MAX = 0.20;
export const staleDisc = (c) => 1 - Math.min(STALE_MAX, STALE_STEP * Math.max(0, (c.holdQ || 0) - STALE_FROM));

export function markMultiple(c, market) {
  /* Derselbe Qualitätsfaktor wie im Kaufpreis (QUAL_COEF) — ein Deal steht am
     Tag des Vollzugs zu Anschaffungskosten im Buch. Jede Aufwertung muss danach
     verdient werden: über EBITDA, über realisiertes Wachstum, über den Markt.
     MULT_CAP verhindert, dass sich Marktband, Qualität und Wachstumsprämie
     multiplikativ zu Multiples aufschaukeln, die es im Mittelstand nicht gibt. */
  const raw = market[c.sector] * (0.7 + QUAL_COEF * c.quality) * (1 + growthPrem(c));
  return Math.min(raw, market[c.sector] * MULT_CAP) * staleDisc(c);
}
/* Endfälligkeitsdruck. Käufer kennen die Laufzeit eines Fonds. Wer in den letzten
   zwei Jahren verkauft, verhandelt gegen jemanden, der weiß, dass verkauft werden
   muss — und preist das ein. Ohne diesen Effekt war "alles am Ende abstoßen"
   genauso gut wie aktive Exitsteuerung, obwohl es kein Können verlangt.      */
export const END_PRESSURE_FROM = 4;   // Halbjahre vor Laufzeitende, ab denen es beginnt
export function endPressure(q) {
  if (q == null) return 0;
  const left = PERIODS - q;
  if (left >= END_PRESSURE_FROM) return 0;
  return LIQ_DISC * (END_PRESSURE_FROM - left) / END_PRESSURE_FROM;
}

export function dealMultiple(c, market, neg, q) {
  return Math.max(2, markMultiple(c, market) * (1 + 0.02 * neg) - endPressure(q));
}
export const evOf = (c, mult) => ebitdaOf(c) * mult;
export const eqvOf = (c, mult) => (evOf(c, mult) - c.netDebt) * (c.st ?? 1);

export const navValueOf = (c, market) => Math.max(0, eqvOf(c, markMultiple(c, market)));
export const fairOf = (c, market, neg, q) => Math.max(0, eqvOf(c, dealMultiple(c, market, neg, q)));

export function navOf(f, market) {
  return f.holdings.reduce((s, c) => s + navValueOf(c, market), 0);
}

/* ---------- Fondsrenditen ----------
   Der Fonds ist nicht mehr am ersten Tag voll eingezahlt. Kapital wird abgerufen,
   wenn es gebraucht wird, und fließt zurück, sobald es realisiert ist. Genau
   daraus entsteht die Zeitdimension, die vorher fehlte:

   - Kapitalabruf (Call): jeder Mittelabfluss des Fonds — Eigenkapital, Fees,
     Due Diligence — wird zuerst aus recycelbaren Erlösen gedeckt, der Rest bei
     den Investoren abgerufen.
   - Verwendung der Erlöse: Bei jedem Exit entscheidest du, wie viel an die
     Investoren zurückfließt und wie viel im Fonds bleibt. Einbehalten geht nur
     innerhalb der Investitionsperiode und kumuliert höchstens bis zur Höhe des
     Commitments; danach wird zwingend voll ausgeschüttet.
   - Damit misst der TVPI den Gesamtwert je abgerufenem Euro, und der IRR misst,
     wann dieses Geld zurückkam. Ein Asset zehn Jahre zu halten ist jetzt teuer.  */
export const RECYCLE_CAP = 1.0;    // kumuliert höchstens 100 % des Commitments

/* Gebührenreserve. Die Management Fee liegt innerhalb des Commitments — über die
   Laufzeit sind das rund 12–15 % davon. Investierbar sind also nie die vollen
   das volle Commitment, sondern das, was nach Reserve übrig bleibt. Genau das tut jedes
   Investment Committee, und es beseitigt die Überziehung an der Wurzel, statt
   sie hinterher zu verrechnen: Vorher rief der Fonds in vier von fünf Partien
   mehr ab, als überhaupt zugesagt war.                                        */
export function feeReserveOf(f, quarter) {
  let res = 0;
  const cost = f.holdings.reduce((s, c) => s + (c.entryEquity || 0), 0);
  for (let t = quarter + 1; t <= PERIODS; t++) {
    // Nach der Investitionsperiode bemisst sich die Gebühr am Einstand des
    // Restportfolios. Konservativ gerechnet mit dem heutigen Bestand.
    const base = t <= INVEST_PERIOD ? CAPITAL : cost;
    res += (base * MGMT_FEE) / 2;
  }
  return Math.max(0, res - (f.recyc || 0));
}
// Was der Spieler tatsächlich einsetzen kann: offenes Commitment plus einbehaltene
// Erlöse, abzüglich der Gebühren, die bis zum Laufzeitende noch fällig werden.
export const investableOf = (f, quarter) =>
  Math.max(0, (f.undrawn ?? CAPITAL) + (f.recyc || 0) - feeReserveOf(f, quarter));

/* Mittelabfluss. Reihenfolge: zuerst einbehaltene Erlöse, dann offenes
   Commitment. Das Commitment ist eine harte Grenze — reicht es nicht, kommt der
   Abruf nicht zustande. Für Gebühren, die dann ungedeckt bleiben (nach
   Totalverlusten möglich), läuft eine Verbindlichkeit auf, die mit der nächsten
   Ausschüttung verrechnet wird. Kein Abruf über das Commitment hinaus.       */
export function spendFund(f, amt, quarter, accrue) {
  if (!(amt > 0)) return false;
  const fromRecyc = Math.min(amt, f.recyc || 0);
  let call = amt - fromRecyc;
  const room = Math.max(0, f.undrawn ?? CAPITAL);
  if (call > room + 1e-9) {
    if (!accrue) return false;               // Kauf scheitert, Commitment erschöpft
    f.accrued = (f.accrued || 0) + (call - room);
    call = room;
  }
  f.recyc = (f.recyc || 0) - fromRecyc;
  f.cash -= fromRecyc + call;
  if (call > 1e-9) {
    f.undrawn = (f.undrawn ?? CAPITAL) - call;
    f.calls = [...(f.calls || []), { q: quarter, amt: call }];
    f.drawn = (f.drawn || 0) + call;
  }
  return true;
}

/* Wie viel eines Exiterlöses überhaupt einbehalten werden darf. Zwei Schranken
   aus dem LPA: nur innerhalb der Investitionsperiode, und kumuliert höchstens
   bis zur Höhe des Commitments. Außerhalb wird zwingend voll ausgeschüttet.  */
export function recycleRoom(f, net, quarter) {
  if (quarter > INVEST_PERIOD) return 0;
  return Math.min(net, Math.max(0, CAPITAL * RECYCLE_CAP - (f.recycled || 0)));
}

/* Verwendung eines Erlöses. `keep` ist die Entscheidung des GP in Prozent des
   Erlöses — Einbehalten bringt TVPI (mehr Kapital arbeitet je abgerufenem Euro)
   und kostet IRR (der Rückfluss an die Investoren verschiebt sich). Fehlt die
   Angabe, wird voll ausgeschüttet: das ist die Vorgabe, nicht der Automatismus
   von vorher.                                                                 */
export function applyProceeds(f, net, costBasis, quarter, keep = 0) {
  if (!(net > 0)) return;
  f.proceeds = (f.proceeds || 0) + net;
  const rec = Math.min(recycleRoom(f, net, quarter), net * clamp(keep, 0, 1));
  if (rec > 0) {
    f.recycled = (f.recycled || 0) + rec;
    f.recyc = (f.recyc || 0) + rec;
    f.cash += rec;
  }
  let dist = net - rec;
  // Aufgelaufene Gebühren werden vor der Ausschüttung bedient
  if (dist > 0 && (f.accrued || 0) > 0) {
    const pay = Math.min(dist, f.accrued);
    f.accrued -= pay; dist -= pay; f.fees = (f.fees || 0);
  }
  if (dist > 1e-9) {
    f.dists = [...(f.dists || []), { q: quarter, amt: dist }];
    f.distTotal = (f.distTotal || 0) + dist;
  }
}

// Wert in den Händen der Investoren: ausgeschüttet + NAV + noch nicht reinvestierte Erlöse
export const totalValueOf = (f, market) => (f.distTotal || 0) + navOf(f, market) + (f.recyc || 0);
export const drawnOf = (f) => Math.max(1, f.drawn || 0);
export const rvpiOf = (f, market) => navOf(f, market) / drawnOf(f);
// Brutto-MOIC auf Dealebene: misst Auswahl und Wertsteigerung, nicht das Deployment
export const grossMoicOf = (f, market) => (f.investedTotal || 0) > 0
  ? ((f.proceeds || 0) + navOf(f, market)) / f.investedTotal : 0;

/* Europäischer Wasserfall über den ganzen Fonds, mit Catch-up. Die Hurdle läuft
   jetzt auf den tatsächlichen Abrufen und ab deren Zeitpunkt — nicht mehr auf
   das volle Commitment ab Tag null. Wer spät abruft, hat auch eine kleinere Vorzugsrendite
   zu überspringen; wer früh viel Kapital bindet, eine größere.                */
export function carryOf(f, market, quarter) {
  const gain = totalValueOf(f, market) - (f.drawn || 0);
  const pref = (f.calls || []).reduce(
    (s, c) => s + c.amt * (Math.pow(1 + HURDLE, Math.max(0, quarter - c.q) / 2) - 1), 0);
  return gain > pref ? CARRY * gain : 0;
}
export function tvpiOf(f, market, quarter) {
  return (totalValueOf(f, market) - carryOf(f, market, quarter)) / drawnOf(f);
}
// DPI: was tatsächlich an die Investoren zurückgeflossen ist, je abgerufenem Euro
export function dpiOf(f, market, quarter) {
  const tv = totalValueOf(f, market);
  const drag = tv > 0 ? carryOf(f, market, quarter) / tv : 0;
  return ((f.distTotal || 0) * (1 - drag)) / drawnOf(f);
}

/* ---------- IRR ----------
   Zahlungsreihe aus Sicht der Investoren: Abrufe negativ zum Zeitpunkt des
   Abrufs, Ausschüttungen positiv, der verbleibende NAV plus nicht reinvestierte
   Liquidität als Schlusszahlung zum Stichtag. Nullstelle über Bisektion, weil
   die Reihe mehrere Vorzeichenwechsel haben kann und Newton dort abhaut.     */
export function cashflowsOf(f, market, quarter) {
  const cf = [];
  (f.calls || []).forEach((c) => cf.push({ t: c.q / 2, v: -c.amt }));
  (f.dists || []).forEach((d) => cf.push({ t: d.q / 2, v: d.amt * (1 - carryDrag(f, market, quarter)) }));
  const terminal = (navOf(f, market) + (f.recyc || 0)) * (1 - carryDrag(f, market, quarter));
  if (terminal > 0) cf.push({ t: quarter / 2, v: terminal });
  return cf;
}
export function carryDrag(f, market, quarter) {
  const tv = totalValueOf(f, market);
  return tv > 0 ? Math.min(0.5, carryOf(f, market, quarter) / tv) : 0;
}
export function irrOf(f, market, quarter) {
  const cf = cashflowsOf(f, market, quarter);
  if (cf.length < 2 || quarter < 2) return 0;
  const npv = (r) => cf.reduce((s, p) => s + p.v / Math.pow(1 + r, p.t), 0);
  let lo = -0.95, hi = 3.0;
  if (npv(lo) < 0) return -0.95;
  if (npv(hi) > 0) return 3.0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ---------- Wertung ----------
   Je zur Hälfte Multiple und Verzinsung, beide gegen den Anspruch eines guten
   Buyout-Fonds normiert: 2,0× TVPI und 15 % IRR ergeben je 1,00 Punkt. Eine
   Wertung von 1,00 ist damit ein Fonds auf Benchmarkniveau, 1,50 ein sehr guter,
   unter 0,60 wird es für das nächste Fundraising schwierig.

   Der Punkt der Zweiteilung: TVPI allein belohnt Sitzenbleiben, IRR allein
   belohnt schnelles Drehen kleiner Deals. Erst zusammen bilden sie die
   Entscheidung ab, um die es in diesem Geschäft wirklich geht — wann verkauft
   man ein Asset, das noch weiterläuft.                                       */
export const TVPI_BENCH = 2.0, IRR_BENCH = 0.15;
export function scoreOf(f, market, quarter) {
  const t = tvpiOf(f, market, quarter) / TVPI_BENCH;
  const i = irrOf(f, market, quarter) / IRR_BENCH;
  return 0.5 * clamp(t, -1, 4) + 0.5 * clamp(i, -1, 4);
}

/* Reifung einer Beteiligung am Periodenende: Onboarding, Search-Mandate,
   Abschluss laufender Maßnahmen, Entwicklung und Abwerbung der Amtsinhaber.
   Hauptspiel und Übungsmodus rufen exakt diese Funktion auf — der Übungsmodus
   läuft dadurch nachweislich auf derselben Logik wie eine echte Partie.      */
export function maturePeople(rng: Rng, c, mk, q, me, news, shortlists, compat: EngineCompat = {}) {
  if (c.onboard > 0) c.onboard -= 1;
  /* Mehrere Positionen dürfen parallel besetzt werden — Headhunter arbeiten
     extern und binden keine Operating-Kapazität. Pro Position ein Mandat.   */
  if (c.searches && c.searches.length) {
    const still = [];
    c.searches.forEach((se) => {
      if (q < se.readyQ) { still.push(se); return; }
      if (me) {
        /* Nur einmal je Mandat eine Shortlist erzeugen. Vorher wurde bei jedem
           Periodenschluss eine neue gezogen, solange nicht entschieden war —
           man konnte die Kandidatenratings beliebig oft neu würfeln, indem man
           die Entscheidung vor sich her schob.                                */
        if (!se.waiting) shortlists.push({ uid: c.uid, name: c.name, seat: se.seat, cands: makeCandidates(rng) });
        still.push({ ...se, waiting: true });
      }
      else c[se.seat] = { skill: Math.max(c[se.seat].skill, 3) };
    });
    c.searches = still;
  }
  ["initP", "initA"].forEach((slot) => {
    const IN = c[slot];
    if (!IN || q < IN.doneQ) return;
    const spec = IN.id ? initById(IN.dim, IN.id) : null;
    if (IN.ma) {
      const addRev = IN.addEb / Math.max(4, c.benchMargin ?? 12) * 100;
      if (IN.ok) { c.revenue += addRev; c.acc = Math.min(5, c.acc + 1.0); }
      else {
        // Gescheiterte Integration: die Akquisitionsschuld steht voll, das EBITDA
        // kommt nicht an. Der klassische Weg in den Covenant Breach.
        c.revenue += addRev * 0.35; c.margin -= 1.8;
        c.marginDrift = (c.marginDrift || 0) - 1.0; c.quality -= 7;
      }
    } else {
      // Verlässliche Maßnahmen scheitern nicht binär, sie unterliefern.
      // Adoptionsabhängige Programme liefern gar nichts und kosten den Sunk Cost.
      const share = IN.ok ? 1 : (spec && spec.cls === "rel" ? PARTIAL_DELIVERY : 0);
      if (share > 0) {
        const g = IN.gain * share;
        if (IN.dim === "plat") c.plat = Math.min(5, c.plat + g);
        else c.acc = Math.min(5, c.acc + g);
      }
      if (IN.ok) {
        /* Der pauschale Einmaleffekt existiert nur noch im Altverhalten. Seit
           die Kapitalbindungsquote auf dem Bestand rechnet, entsteht die
           Freisetzung dort von selbst — beides zusammen wäre doppelt. */
        if (compat.nwcOnIncrementOnly && spec && spec.legacyRelease) {
          const rel = ebitdaOf(c) * spec.legacyRelease;
          c.netDebt -= rel; bookOff(c, "nwcRel", -rel);
        }
        if (spec && spec.nwcFix) c.nwcFix = (c.nwcFix || 0) + spec.nwcFix;
        if (spec && spec.capexFix) c.benchCapex = Math.max(0.5, (c.benchCapex ?? 4) + spec.capexFix);
      } else {
        const sunk = ebitdaOf(c) * (spec && spec.failCost != null ? spec.failCost : FAIL_SUNK);
        c.netDebt += sunk; bookOff(c, "restr", sunk);
        if (spec && spec.failMargin) c.marginDrift = (c.marginDrift || 0) + spec.failMargin;
      }
    }
    if (me) news.push({
      q, e: IN.ok ? "🛠️" : (spec && spec.cls === "rel" ? "➖" : "❌"),
      tone: IN.ok ? "pos" : "neg",
      t: IN.ma
        ? (IN.ok
          ? `<b>${c.name}</b>: Add-on integriert — ${eur(IN.addEb)} EBITDA zu ${x(IN.mult)} gekauft, Bewertung der Plattform liegt bei ${x(markMultiple(c, mk))}.`
          : `<b>${c.name}</b>: Integration des Add-ons gescheitert. Nur ein gutes Drittel des Umsatzes kommt an, die Akquisitionsschuld steht voll — Leverage jetzt ${x(c.netDebt / Math.max(0.5, ebitdaOf(c)))}.`)
        : IN.ok
          ? `<b>${c.name}</b>: ${IN.name || "Maßnahme"} abgeschlossen, Reifegrad +${IN.gain.toFixed(2)}${IN.dim === "acc" && IN.gain < 0.5 ? " — deutlich unter Erwartung." : IN.dim === "acc" && IN.gain > 1.1 ? " — weit über Erwartung." : "."}`
          : (spec && spec.cls === "rel"
            ? `<b>${c.name}</b>: ${IN.name || "Maßnahme"} verfehlt das Ziel — nur Reifegrad +${(IN.gain * PARTIAL_DELIVERY).toFixed(2)} statt +${IN.gain.toFixed(2)}.`
            : `<b>${c.name}</b>: ${IN.name || "Maßnahme"} gescheitert. Der Abbruch kostet ${eur(ebitdaOf(c) * (spec && spec.failCost != null ? spec.failCost : FAIL_SUNK))}.`),
    });
    c.done = [...(c.done || []), IN.id].filter(Boolean);
    c[slot] = null;
  });
  ["ceo", "cfo", "r3"].forEach((k) => {
    if (c[k].skill <= 0) return;
    if (c[k].retiring && c.holdQ >= 3) {
      c[k] = vacate(c[k]);
      if (me) news.push({ q, e: "👋", tone: "neg", t: `<b>${c.name}</b>: Der Gründer-CEO zieht sich zurück. Die Position ist vakant.` });
      return;
    }
    if (c[k].dev && c[k].skill < 4.5) c[k] = { ...c[k], skill: Math.min(4.5, c[k].skill + 0.25) };
    if (rng.rnd() < POACH * c[k].skill * c[k].skill * (c[k].poach || 1) * (c.ltip ? 0.5 : 1)) {
      const nm = k === "ceo" ? "CEO" : k === "cfo" ? "CFO" : ROLE3[c.sector].n;
      c[k] = vacate(c[k]);
      if (me) news.push({ q, e: "🚪", tone: "neg", t: `<b>${c.name}</b>: Der ${nm} wurde abgeworben. Die Position ist vakant.` });
    }
  });
}

/* Zustand einer Beteiligung. Bewertet dieselben Größen, die ein Portfolio-Review
   abfragt: Finanzierung, Besetzung, Tragfähigkeit des Wachstums, Wertentwicklung
   und ob überhaupt etwas läuft. Der Befund mit dem höchsten Gewicht wird gezeigt. */
export function healthOf(c, market) {
  const eb = ebitdaOf(c);
  const lev = c.netDebt / Math.max(0.5, eb);
  const head = (c.covLimit ?? 6.5) - lev;
  const searching = (c.searches || []).length;
  const vac = ["ceo", "cfo", "r3"].filter((k) => c[k].skill <= 0).length;
  const moic = (navValueOf(c, market) + (c.cashOut || 0)) / Math.max(0.01, c.costTotal);
  const fl = [];
  if (c.breach) fl.push({ w: 100, t: "Covenant gebrochen" });
  else if (head < 0.4) fl.push({ w: 88, t: `Covenant nur ${x(Math.max(0, head))} Luft` });
  if (vac > searching) fl.push({ w: 74, t: vac > 1 ? `${vac} Positionen vakant` : "Position vakant" });
  if (moic < 0.95) fl.push({ w: 66, t: `unter Einstand — ${moic.toFixed(2)}×` });
  if (overstretch(c) > 0.3) fl.push({ w: 58, t: "Wachstum überdehnt" });
  if (c.dd && c.margin < (c.benchMargin ?? c.margin) - 1.5) fl.push({ w: 44, t: "Marge unter Benchmark" });
  if (!anyInit(c) && !searching && c.holdQ >= 2) fl.push({ w: 38, t: "keine Maßnahme aktiv" });
  fl.sort((a, b) => b.w - a.w);
  const top = fl[0] || null;
  return { moic, attention: !!top && top.w >= 55, top, count: fl.length };
}

/* Value Bridge: eingesetztes Eigenkapital plus vier Effekte ergeben exakt den
   Nettoerlös. Wird vom Exit im Hauptspiel und vom Übungsmodus identisch genutzt. */
export function makeBridge(c, gross, net) {
  const st = c.st ?? 1;
  /* Rekapitalisierungen während der Halteperiode gehören in die Brücke — sonst
     zeigt sie beim Exit nur den letzten Erlös und unterschlägt jeden Euro, der
     vorher schon an den Fonds zurückgeflossen ist. Erlöse aus Teilexits stehen
     bewusst nicht hier: die sind im Track Record bereits eigenständig gebucht. */
  const recap = c.recapOut || 0;
  const base = c.costLeft ?? c.entryEquity;
  const exitMult = ebitdaOf(c) > 0 ? (gross / st + c.netDebt) / ebitdaOf(c) : c.entryMult;
  const bEbitda = (ebitdaOf(c) - c.entryEbitda) * c.entryMult * st;
  const bMult = ebitdaOf(c) * (exitMult - c.entryMult) * st;
  const bDelev = (c.entryDebt - c.netDebt) * st;
  return {
    entry: base, ebitda: bEbitda, mult: bMult, delev: bDelev, dist: recap,
    cost: net - base - bEbitda - bMult - bDelev,
    exit: net + recap,
  };
}
// Gesamter Rückfluss eines Deals und die zugehörige Kostenbasis
export const dealMoic = (c, net) => (net + (c.recapOut || 0)) / Math.max(0.01, c.costLeft ?? c.entryEquity);

/* ---------- Implied Money Multiple (Base Case) ----------
   Was das Zielunternehmen bei diesem Gebot und diesem Leverage über eine
   normale Halteperiode einbrächte, wenn man es einfach laufen lässt: kein
   Value-Creation-Programm, kein Multiple-Arbitrage, keine Zufallsereignisse.
   Genau das, was in der Praxis vor einem Gebot gerechnet wird — der Base Case
   des Underwritings, gegen den jede These sich beweisen muss.

   Die Projektion ist keine zweite Spielmechanik, sondern stepCompany() ohne
   Rauschen und ohne Maßnahmen: dieselben Formeln für Wachstum, Margenkonvergenz,
   Capex, Working Capital, Zins, Steuern und Schuldentilgung. Wer den Base Case
   schlägt, hat das über Portfolioarbeit verdient; wer ihn verfehlt, hat zu teuer
   gekauft oder zu viel Fremdkapital aufgenommen.

   Bewusste Annahmen, alle konservativ und im Hinweistext offengelegt:
   - Exit zum Einstiegsmultiple. Multiple Expansion ist Marktglück, kein Plan.
   - Reifegrade auf Branchenniveau (PLAT_BENCH/ACC_BENCH), keine Initiativen.
   - Drift nur, soweit der Datenraum ihn hergibt; ohne Due Diligence null.
   - Exitkosten wie bei einer Auktion (PROC_FEE).                              */
export const LBO_YEARS = 5;

export function lboProjection(
  d, mult: number, lev: number, financing: number,
  opts: { years?: number; drift?: number } = {},
) {
  const years = opts.years ?? LBO_YEARS;
  const drift = opts.drift ?? 0;          // pp p.a. gegenüber dem Sektor, 0 = wie der Markt
  const steps = Math.round(years * 2);    // Halbjahresschritte wie im Spiel

  const eb0 = (d.revenue * d.margin) / 100;
  if (!(eb0 > 0)) return null;
  const ev0 = eb0 * mult;
  const debt0 = eb0 * lev;
  // Identisch zum Equity Ticket der Karte und zu entryEquity beim Closing
  const equity0 = ev0 - debt0 + ev0 * ENTRY_FEE;
  if (!(equity0 > 0)) return null;

  // Zinssatz des Unternehmens bei Closing, wie in runQuarter gesetzt
  const baseRate = BASE_RATE - 0.25 * financing;
  const benchCapex = d.benchCapex ?? d.capexPct ?? 4;
  const benchNwc = d.benchNwc ?? d.nwcPct ?? 15;
  /* Reifegrade auf Branchenniveau: accEff = ACC_BENCH, plat = PLAT_BENCH.
     Damit fallen die Reifegrad-Terme aus stepCompany() auf ihre Basiswerte. */
  const cxPct = Math.max(0.5, benchCapex + ACC_BENCH * 0.6);
  const nwcPct = Math.max(-10, benchNwc + ACC_BENCH * 2);
  const gAnn = SECTORS[d.sector].g + drift;

  let revenue = d.revenue;
  let margin = d.margin;
  let netDebt = debt0;
  const rev0 = d.revenue;

  for (let i = 0; i < steps; i++) {
    const revPrev = revenue;
    revenue = Math.max(4, revenue * (1 + gAnn / 200));

    /* Margenkonvergenz auf das erreichbare Niveau. Ohne Maßnahmen ist das die
       Branchenmarge plus Operating Leverage aus dem eigenen Wachstum — genau
       targetMargin() mit plat = PLAT_BENCH und ohne initA/marginDrift. */
    const opLev = clamp((revenue / Math.max(1, rev0) - 1) * 1.5, 0, 1.5);
    const target = (d.benchMargin ?? margin) + opLev;
    const pull = margin < target ? 0.30 : 0.40;
    margin = clamp(margin + (target - margin) * pull, 3, 45);

    const eb = (revenue * margin) / 100;
    const ebH = eb / 2;
    const capex = (revenue * cxPct) / 200;
    const nwc = (nwcPct / 100) * (revenue - revPrev);
    const rate = baseRate + Math.max(0, netDebt / Math.max(0.5, eb) - LEV_FREE) * LEV_STEP;
    const interest = (netDebt >= 0 ? netDebt * rate : netDebt * baseRate * 0.4) / 200;
    const tax = TAX_RATE * Math.max(0, ebH - interest - capex);
    netDebt -= ebH - interest - capex - nwc - tax;
  }

  const ebExit = (revenue * margin) / 100;
  const evExit = ebExit * mult;                    // Exit zum Einstiegsmultiple
  const equityExit = Math.max(0, evExit - netDebt) * (1 - PROC_FEE);
  return {
    mom: equityExit / equity0,
    equity0, equityExit, ebExit, netDebtExit: netDebt, revenueExit: revenue, marginExit: margin,
    // Zerlegung wie die Value Bridge: woher der Zuwachs im Base Case käme
    fromEbitda: (ebExit - eb0) * mult,
    fromDelev: debt0 - netDebt,
  };
}

export const impliedMoM = (d, mult, lev, financing, opts) => {
  const p = lboProjection(d, mult, lev, financing, opts);
  return p ? p.mom : null;
};
