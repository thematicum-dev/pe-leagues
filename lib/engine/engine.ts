/* Spiellogik: Stammdaten, Parameter und reine Rechenfunktionen des
   PE-Leagues-Spiels. Kein React-Bezug — läuft im Browser wie in Node.
   Extrahiert 1:1 aus components/PeLeagues.tsx; die einzige inhaltliche
   Änderung ist, dass Funktionen mit Zufallsbedarf ihre Zufallsinstanz
   (siehe rng.ts) als Parameter bekommen, statt einen globalen
   Modul-Zustand zu teilen.                                            */
import type { Rng } from "./rng.ts";

/* g = Marktwachstum des Sektors in Prozent p. a., m = typisches Einstiegs-
   multiple. Jeder Sektor wurde um einen Prozentpunkt angehoben: Die alten
   Werte lagen am unteren Rand dessen, was der europäische Mittelstand in den
   Erhebungen zeigt, und drückten das erreichbare EBITDA-Wachstum über eine
   Halteperiode entsprechend. Die Rangfolge der Sektoren bleibt unverändert —
   angehoben wird das Niveau, nicht die Struktur. Wer die Zahl hier ändert,
   muss GROWTH_MEAN mitziehen: Der Drift misst den Abstand des bisherigen
   Wachstums zum Sektor, und dieser Abstand verschiebt sich sonst.           */
export const SECTORS = {
  Industrials: { g: 4.0, m: 8.5 },
  Healthcare:  { g: 6.0, m: 11.0 },
  Software:    { g: 9.0, m: 13.0 },
  Services:    { g: 4.5, m: 9.0 },
  Consumer:    { g: 3.0, m: 8.0 },
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
/* Jeder Sektor trägt eine eigene Farbe — sie ist die Grundfarbe seiner Karten,
   seines Wappens und seiner Fläche in jedem Diagramm. Die fünf Töne liegen im
   Farbkreis bewusst weit auseinander (Gold 42°, Smaragd 160°, Blau 217°,
   Violett 280°, Rosé 330°), damit sich zwei Sektoren auch als kleiner Punkt in
   einer Tabellenzeile noch unterscheiden. Die Helligkeit ist so gewählt, dass
   derselbe Wert auf hellem wie auf dunklem Grund trägt: als Fläche, als Linie
   und als Rahmen.                                                            */
export const SECCOLOR = {
  Industrials: "#D2A03F", Healthcare: "#12B886", Software: "#3B82F6",
  Services: "#D9538E", Consumer: "#A855F7",
};

export const P1 = ["Bren", "Aur", "Kalt", "Hoch", "Stein", "Wald", "Rhein", "Nord", "Vel", "Mark", "Trave", "Isar", "Ober", "Sal", "Ferr", "Lind", "Grün", "Alt"];
export const P2 = ["ner", "avit", "mann", "burg", "feld", "tec", "mont", "sys", "werk", "thal", "stedt", "gau", "rath", "born", "eck", "hoff", "seil"];

/* Geschäftsmodell-Katalog: DACH-Mittelstandsarchetypen.
   m = EBITDA-Marge, g = Wachstum p.a., rb = Umsatzband, lev = Leverage-Kapazität,
   q = Qualitätsscore, fl = typische Risikoflaggen */
type Band = [number, number];
export interface Archetype {
  s: string[]; cx: number; nw: number; m: Band; g: Band; rb: Band; lev: Band; q: Band; fl: string[]; d: string;
}
export const BOOK: Record<string, Archetype[]> = {
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

export function newDeal(rng: Rng, type: string, market: Record<string, number>, sourcing = 2, compat: EngineCompat = {}) {
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
  const d = {
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
  // Die Kappung zieht keine Zufallszahl, der Strom bleibt derselbe.
  return compat.legacyDealSize ? d : fitTicket(d);
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
  + (c.marginDrift || 0) + mgmtFx(c).margin
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
/* Wachstumsbeitrag je effektiver Reifegradstufe über dem Branchenniveau, in pp
   p. a., vor dem Operations-Multiplikator. Von 1,5 auf 1,7 angehoben: Ein
   vollständig durchgezogenes Wachstumsprogramm hebt den effektiven Reifegrad
   in der Messung um rund 1,4 Stufen, trug damit aber nur 2,7 pp zum Wachstum
   bei — gegen eine Streuung von 3,5 pp Standardabweichung war die eigene
   Entscheidung im Ergebnis kaum sichtbar. Bewusst moderat: Der Deckel
   accEff = min(acc, People+1, Performance+1) soll die Bindung bleiben, nicht
   die Höhe des Beitrags.                                                    */
export const ACC_GROWTH_PP = 1.7;
export const MARGIN_NOISE = 0.6;    // Streubreite auf die Marge, in pp
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
  legacyHistMark?: boolean;
  /* Bis 11.09.2026 war der Zinsaufwand unbegrenzt steuerlich abzugsfähig —
     die Zinsschranke (INT_BARRIER) gab es nicht.                            */
  legacyNoIntBarrier?: boolean;
  /* Bis 11.09.2026 kam das EBITDA eines integrierten Add-ons über die
     Branchenmarge statt über die Ist-Marge der Plattform herein (siehe
     maturePeople).                                                          */
  legacyAddonBenchMargin?: boolean;
  /* Bis 15.09.2026 wurde die Akquisitionsschuld eines Zukaufs beim START der
     Maßnahme gebucht, das zugekaufte EBITDA aber erst beim Abschluss. Die
     Plattform trug die volle Schuld über das ganze Integrationsfenster gegen
     ihr altes Ergebnis — siehe buildInit/maturePeople.                      */
  addonDebtAtStart?: boolean;
  /* Bis 15.09.2026 war ein Zukauf ein fertiges Angebot: Zielgröße aus
     `addonSize` der Plattform, Preis aus addonMultiple(), Risiko aus
     addonRisk(). Seitdem erteilt der Spieler ein Mandat (Zielgröße und
     Höchstgebot), und beides bestimmt das Scheiterungsrisiko — siehe
     addonCheck/addonFailRisk.

     Dieselbe Marke hält auch die Laufzeit: Bis dahin lief ein Zukauf
     initDur(E) + 1 Halbjahre zwischen Signing und Closing, seit dem
     16.09.2026 fallen beide in dasselbe Halbjahr (buildInit).               */
  legacyAddonMandate?: boolean;
  /* Bis 18.10.2026 sperrte ein abgebrochener Verkaufsprozess für zwei
     Halbjahre jeden Exit der Beteiligung, auch den bilateralen — obwohl die
     Karte "Bilateral bleibt möglich" sagte (siehe runQuarter, Exits).       */
  legacyBlockAllExits?: boolean;
  /* Bis 18.10.2026 durfte ein Exiterlös nur innerhalb der
     Investitionsperiode (bis Halbjahr INVEST_PERIOD) einbehalten werden,
     danach wurde zwingend voll ausgeschüttet (siehe recycleRoom). Und am
     Laufzeitende blieben einbehaltene, nicht reinvestierte Erlöse stehen,
     statt ausgeschüttet zu werden (siehe releaseRecycled).                 */
  legacyRecycleInvestPeriod?: boolean;
  /* Bis 19.10.2026 wurde ein Ziel nicht am Equity Ticket gekappt (siehe
     TICKET_MAX/fitTicket); einzelne Ziele banden über 80 % des Fonds. Das
     Trophy Asset behielt bei der Ankündigung seinen Rohumsatz.             */
  legacyDealSize?: boolean;
  /* Bis 19.10.2026 bestand die Shortlist aus drei festen Schablonen mit einem
     Rating (siehe makeCandidates), und die KI-Fonds besetzten Positionen mit
     einem gewürfelten Rating statt aus einem Deck.                         */
  legacyCandidates?: boolean;
  /* Bis 19.10.2026 wirkte das Management nur über Programme. Seither setzt
     das Closing `mx` auf der Beteiligung, und die Kompetenzen wirken laufend
     (siehe mgmtFx).                                                        */
  legacyMgmt?: boolean;
  /* Bis 21.10.2026 blieb bei einer Suche auf einer besetzten Position der
     Amtsinhaber im Amt, bis die neue Person unterschrieb; die Abfindung fiel
     erst dann an. Seither geht die Person mit dem Suchmandat, die Abfindung
     fällt sofort an, und die Position ist bis zur Verpflichtung vakant
     (siehe vacateForSearch).                                               */
  legacyReplaceSearch?: boolean;
}
/* Ereigniswahrscheinlichkeit im jeweiligen Regelstand. */
export const eventPOf = (compat: EngineCompat = {}) => (compat.legacyEventP ? 0.15 : EVENT_P);
export const LEGACY_COMPAT: EngineCompat = {
  addonWithoutDebt: true, nwcOnIncrementOnly: true, legacyEventP: true, legacyHistMark: true,
  legacyNoIntBarrier: true, legacyAddonBenchMargin: true, addonDebtAtStart: true,
  legacyAddonMandate: true, legacyBlockAllExits: true, legacyRecycleInvestPeriod: true,
  legacyDealSize: true, legacyCandidates: true, legacyMgmt: true, legacyReplaceSearch: true,
};

/* `inj` ist die Gegenrichtung von `dist`: Kapital, das der Fonds in die
   Beteiligung gibt (Equity Cure, Eigenkapitalanteil an einem Zukauf). Wie alle
   Einmaleffekte mit dem Vorzeichen gebucht, in dem es die Nettoverschuldung
   bewegt — eine Einlage senkt sie, steht also negativ. */
export const OFF_KEYS = ["restr", "mgmt", "capexOff", "nwcRel", "addon", "dist", "inj"];
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
  - (c.sector === "Industrials" && c.r3.skill >= 3 ? 0.5 : 0) + mgmtFx(c).capex);
export const nwcPctOf = (c) => Math.max(-10, (c.benchNwc ?? 15) - (c.plat - PLAT_BENCH) * 2.5
  + accEff(c) * 2 + sumInit(c, "nwcRun") + (c.nwcFix || 0) + mgmtFx(c).nwc);
/* Gebundenes Working Capital in Mio. €. Für eine Beteiligung, die den Bestand
   noch nicht mitführt (Partie vor dem 30.08.2026), ergibt sich er aus Quote
   und Umsatz — genau der Wert, mit dem sie gestartet wäre.                 */
export const nwcBalanceOf = (c) => c.nwcBal != null ? c.nwcBal : (nwcPctOf(c) / 100) * c.revenue;

export function stepCompany(rng: Rng, c, market, ops, compat: EngineCompat = {}) {
  const A = accEff(c), OS = overstretch(c);
  const opsMult = 1 + 0.1 * ops;
  // Wachstum relativ zum Sektorniveau: Stufe 2 = branchenüblich
  const gAnn = SECTORS[c.sector].g + (c.drift || 0) + (A - ACC_BENCH) * ACC_GROWTH_PP * opsMult + mgmtFx(c).growth
    + rng.nrm(GROWTH_NOISE);
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
  const tax = taxOf(ebH, interest, capex, compat);
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
  /* Covenant-Test auf dem BEREINIGTEN EBITDA. `eb` ist ebitdaOf(c) = Umsatz ×
     Marge und damit frei von Einmaleffekten: Programm-, Restrukturierungs- und
     Personalwechselkosten bucht die Engine unterhalb des EBITDA gegen die
     Nettoverschuldung (siehe bookOff). Das berichtete EBITDA liegt in genau
     diesen Perioden darunter — würde der Covenant darauf testen, löste jede
     Wertsteigerungsmaßnahme den Bruch mit aus, den sie verhindern soll. Ein
     Kreditvertrag rechnet aus demselben Grund auf Adjusted EBITDA.

     Zwei Konventionen dazu, bewusst gewählt: Getestet wird die Laufrate der
     Periode (annualisiert), nicht ein LTM-Durchschnitt — dieselbe Größe, auf
     der auch Bewertung und Anzeige stehen, sodass der angezeigte Leverage
     immer der getestete ist. Und die Add-backs sind unbegrenzt, weil die
     Engine gar kein berichtetes EBITDA führt, aus dem sie zu begrenzen wären. */
  const covLev = c.netDebt / Math.max(0.5, eb);
  c.breach = covLev > (c.covLimit ?? COV_DEFAULT) ? (c.breach || 0) + 1 : 0;
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
    ok: (c) => c.netDebt / Math.max(0.5, ebitdaOf(c)) < (c.covLimit ?? COV_DEFAULT) - 1.5,
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
/* GROWTH_MEAN ist der durchschnittliche Abstand der historischen Wachstums-
   bänder des Dealbuchs (BOOK) zum Sektorwachstum. Mit der Anhebung der
   Sektorraten um einen Punkt schrumpft dieser Abstand von 1,6 auf 0,6; die
   Konstante zieht das exakt nach, damit der Drift im Mittel weiterhin null
   ist. Ohne diese Anpassung hätte die Anhebung sich zu 45 % selbst wieder
   aufgehoben, weil jeder Deal einen entsprechend negativen Drift bekäme.   */
export const DRIFT_LOAD = 0.45, GROWTH_MEAN = 0.6;
/* Schätzgüte des Datenraums: Analyse verkleinert den Fehler, beseitigt ihn nie.
   Ohne Due Diligence gibt es überhaupt keine Schätzung.                       */
export const driftErrSd = (analysis) => clamp(4.6 - 0.90 * analysis, 0.3, 4.6);
export const driftEstOf = (d, analysis) => d.drift + d.dnoise * driftErrSd(analysis);
export const driftBandOf = (analysis) => 1.3 * 0.577 * driftErrSd(analysis);
export const MULT_CAP = 1.85;      // Obergrenze: Vielfaches des Sektormultiples.
// Von 1,60 angehoben. Gemessen band die Grenze nur bei 1 % der Beteiligungen, war
// also nie die eigentliche Bremse -- sie kappte aber genau die besten Assets, bei
// denen Qualität und Wachstumsprämie zusammenkommen.

export const CAPITAL = 500;
/* Voreingestellte Punkteverteilung des menschlichen Fonds. Der Spieler darf
   sie umverteilen; sie ist der Startwert, nicht die Obergrenze.          */
export const DEFAULT_HUMAN_ATTRS = { sourcing: 2, analysis: 3, negotiation: 2, operations: 3, financing: 2 };
export const PERIODS = 20;         // 10 Jahre in Halbjahresschritten
export const MIN_HOLD = 6;         // Mindesthaltedauer: 3 Jahre
/* Zielgrößen skalieren mit dem Fondsvolumen. Ein 500-Mio.-Fonds, der dieselben
   Unternehmen kauft wie ein 300-Mio.-Fonds, bekommt sein Kapital nicht investiert:
   Bei fünf Slots und im Schnitt 69 Mio. € Eigenkapital je Deal sind höchstens
   347 Mio. € gleichzeitig gebunden — der Rest liegt herum und verwässert die
   Rendite. SIZE_SCALE hebt die Umsatzbänder entsprechend an.                  */
export const SIZE_SCALE = 1.25;
/* Die Umsatzbänder allein hielten die Tickets aber nach oben nicht im Zaum.
   Gemessen band ein Ziel zum Angebotspreis im neutralen Markt in 17 % der
   Fälle mehr als ein Viertel des Fonds, die größten über 400 Mio. € — zwei
   solche Deals und der Fonds war ausinvestiert. Im heißen Markt traf es fast
   jedes zweite Ziel, denn das Ticket wächst mit dem Multiple, das Band nicht.

   Ein Fonds sieht in der Praxis nur Ziele, die zu seiner Ticketgröße passen.
   Deshalb wird die Größe am Equity Ticket gekappt, nicht am Umsatz: Liegt das
   Ticket zum Angebotspreis mit dem Leverage, den die Karte vorschlägt
   (LEV_CARD), über TICKET_MAX, wird das Unternehmen kleiner gezogen. Die
   Kappung ist weich — t / (1 + (t/TICKET_MAX)^n)^(1/n) —, damit kleine Ziele
   praktisch unverändert bleiben, die Reihenfolge erhalten bleibt und sich im
   heißen Markt nicht alles auf derselben Größe stapelt. TICKET_MAX liegt mit
   18 % bewusst unter einem Viertel: Ein Gebot 20 % über dem Angebot mit
   weniger Leverage bindet bis zu einem Drittel mehr Eigenkapital als die
   Karte zeigt und bleibt trotzdem unter 125 Mio. €. Ausinvestieren braucht
   damit mindestens vier Transaktionen. Gemessen über 200 Fonds in ganzen
   Partien: Median-Ticket unverändert 67 Mio. €, Maximum 112 statt 426, der
   Kapitalabruf bleibt bei rund 485 Mio. €, kein Fonds kommt mit weniger als
   fünf Deals aus (vorher genügte einem einer).                              */
export const TICKET_MAX = CAPITAL * 0.18;
export const TICKET_SHAPE = 3;
export const LEV_CARD = 3.5;       // Leverage, mit dem die Deal-Karte ein Gebot vorschlägt
export const cardTicket = (d) =>
  ebitdaOf(d) * (d.askMult * (1 + ENTRY_FEE) - Math.min(d.levCap, LEV_CARD));
export function fitTicket<T extends { revenue: number }>(d: T): T {
  const t = cardTicket(d);
  if (!(t > 0)) return d;
  const fit = t / Math.pow(1 + Math.pow(t / TICKET_MAX, TICKET_SHAPE), 1 / TICKET_SHAPE);
  return { ...d, revenue: d.revenue * (fit / t) };
}
export const MAX_SLOTS = 6;        // gleichzeitige Beteiligungen
export const COV_HEADROOM = 1.2;   // Covenant-Spielraum über der Einstiegsverschuldung
export const RESERVE_PROC = 0.85;  // Reservationspreis in der Auktion, Anteil der Preiserwartung
export const RESERVE_PROP = 0.90;  // Reservationspreis des Gesellschafters beim Off-Market-Deal
export const COV_FLOOR = 4.0;      // Untergrenze des Covenants
/* Covenant einer Beteiligung, falls keiner gesetzt ist. Der Wert stand bis
   jetzt als blanke 6,5 an dreizehn Stellen in vier Dateien — und traf sich
   dort zufällig mit BASE_RATE, was den Eindruck erweckte, beide hingen
   zusammen. Sie tun es nicht.                                            */
export const COV_DEFAULT = 6.5;    // Covenant-Vorgabe ohne eigene Vereinbarung
export const BASE_RATE = 6.5;      // Basismarge auf die Akquisitionsfinanzierung (Euribor + Marge)
/* Ertragsteuersatz. Bemessungsgrundlage im Modell ist EBITDA abzüglich Zins und
   Capex — Capex steht dabei stellvertretend für die Abschreibung. Genau diese
   Konvention bildet die Berichtsansicht ab (D&A = Capex), sonst ließe sich der
   Steueraufwand der Engine in keiner GuV wiederfinden.                       */
export const TAX_RATE = 0.30;
/* Zinsschranke (§ 4h EStG / ATAD Art. 4). Zinsaufwand ist nur bis zu 30 % des
   steuerlichen EBITDA abzugsfähig; was darüber liegt, mindert die Steuerlast
   nicht. Für einen Buyout im DACH-Raum ist das keine Randnotiz, sondern die
   Grenze, ab der zusätzlicher Leverage seinen Steuerschild verliert: Bei einem
   Zinssatz um 6,5 % greift sie etwa ab 4,6× Nettoverschuldung, mit dem
   Margin-Grid-Aufschlag (LEV_STEP) entsprechend früher. Vorher war der
   Steuerschild unbegrenzt, und Fremdkapital verbilligte sich mit jedem Turn
   weiter — genau die Verzerrung, gegen die der Gesetzgeber die Schranke
   gesetzt hat.

   Der EBITDA-Bezug ist der der Engine: bereinigtes EBITDA der Periode. Ein
   Zinsvortrag wird nicht geführt — nicht abgezogener Aufwand ist verloren,
   nicht aufgeschoben. Das ist die konservative Seite der Vereinfachung und
   steht als Fußnote unter der Berichtsansicht.                              */
export const INT_BARRIER = 0.30;
/* Steueraufwand einer Halbjahresperiode. Bemessungsgrundlage ist EBITDA
   abzüglich abzugsfähigem Zins und Capex (Capex steht stellvertretend für die
   Abschreibung, siehe TAX_RATE). Steht als eigene Funktion, weil außer
   stepCompany() auch die Base-Case-Projektion und die Berichtsansicht exakt
   dieselbe Rechnung brauchen.                                               */
export function taxOf(ebH: number, interest: number, capex: number, compat: EngineCompat = {}) {
  const ded = compat.legacyNoIntBarrier ? interest : Math.min(interest, INT_BARRIER * Math.max(0, ebH));
  return TAX_RATE * Math.max(0, ebH - ded - capex);
}
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
  return c.rate + Math.max(0, lev - LEV_FREE) * LEV_STEP + mgmtFx(c).rate
    // Lender-erfahrene CFO: bessere Konditionen, solange sie im Amt ist
    - (c.cfo && c.cfo.skill > 0 && c.cfo.trait === "lender" ? 0.25 : 0);
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
export const RETAINER_PCT = 0.225; // Headhunter, gesenkt von 30 % auf 22,5 % eines Jahresgehalts
export const SIGN_PCT = 0.30;      // Signing Bonus: 0,3 Jahresgehälter, unabhängig vom Rating
// (vorher 0,10 + 0,05 x Rating, also 0,20 bei Rating 2 und 0,35 bei Rating 5)
export const SEVER_YEARS = 1.0;    // Abfindung: zwölf Monatsgehälter des Amtsinhabers
// Der Retainer wird bei Mandatserteilung fällig, also auf Marktniveau, nicht
// auf dem erst später bekannten Rating des Kandidaten.
export const retainerOf = (seat, eb) => payOf(seat, PAY_ANCHOR, eb) * RETAINER_PCT;
export const signBonusOf = (seat, sk, eb) => payOf(seat, sk, eb) * SIGN_PCT;
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
export const seatPay = (s, seat, eb) => s.skill > 0 ? payOf(seat, s.skill, eb) * (s.payF ?? 1)
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
// Ein vakanter CEO führt mit `mx` kommissarisch auf Interim-Niveau (siehe ceoIn)
const ceoLeadFlat = (c) => (c.mx && !(c.ceo.skill > 0) ? 2.0 : c.ceo.skill);
export const cappedSkill = (c, seat) => seat === "ceo" ? c.ceo.skill : Math.min(c[seat].skill, ceoLeadFlat(c) + 1.5);
export const isCapped = (c, seat) => seat !== "ceo" && c[seat].skill > ceoLeadFlat(c) + 1.5;
/* ---------- Kompetenzprofile ----------
   Bis zum 19.10.2026 trug jede Position eine einzige Zahl, und jedes Programm
   einer Position rechnete mit ihr. Damit gab es bei der Besetzung nur eine
   Frage — gut gegen teuer —, und welches Profil eine Beteiligung braucht,
   spielte keine Rolle.

   Jetzt trägt eine Position drei Kompetenzen, in dem Vokabular, in dem
   Executive Search und Management Due Diligence im PE-Umfeld sprechen. Jedes
   Programm hängt an genau einer davon; der CEO wirkt über die Kompetenz der
   Programmfamilie mit (Operational Excellence auf Performance, Growth auf
   Growth), seine Leadership deckelt die Fachpositionen. `skill` bleibt als
   Assessment-Score stehen — der Durchschnitt der drei — und trägt Gehalt,
   Abwerbung, People-Reifegrad und alles, was nicht nach Programm fragt.

   Eine Position ohne `prof` rechnet mit `skill` für alle drei Kompetenzen und
   damit exakt wie vorher. So bleiben Amtsinhaber, ältere Beteiligungen und
   bereits ausgewertete Halbjahre unverändert.                             */
export const COMPETENCIES = {
  ceo: ["Operational Excellence", "Growth", "Leadership"],
  cfo: ["Performance Improvement", "Cash & Working Capital", "Finance Transformation"],
  r3: ["Commercial Excellence", "Market Expansion", "M&A Integration"],
};
// Welche Kompetenz der Fachposition ein Programm braucht
export const PROGRAM_COMP = { opex: 0, nwc: 1, erp: 2, ai: 2, pen: 0, exp: 1, ma: 2 };
export const compOf = (s, i) => (s.skill > 0 ? (s.prof ? s.prof[i] : s.skill) : 0);

/* ---------- Chemie im Top-Team ----------
   Jede Führungskraft hat eine Haltung, im Spiel nur als Farbe zu sehen
   (weiß oder schwarz): hell baut auf, hält Leute, spielt fair; dunkel führt
   mit harter Hand und holt Kosten und Cash heraus. Keine ist besser; es zählt
   allein, ob das Team gleich tickt.
   - Alle drei Positionen besetzt und gleich ausgerichtet: eingespielt, jede
     Kompetenz wirkt um CHEM besser.
   - Sonst: neutral. Gemischte Farben kosten nichts — bis zum 21.10.2026
     brachten sie Reibung (−0,25 auf jede Kompetenz), und weil sich die Farbe
     der Altmannschaft nicht aussuchen lässt, war die Chemie damit vor allem
     eine Strafe fürs Besetzen.
   Der Bonus gilt in beiden Kanälen: für die Erfolgsquote der Programme
   (effSkill), dort auch für die Leadership des CEO und damit für den Deckel,
   und für die laufende Wirkung (mgmtFx), dort nach dem Deckel MGMT_UP, damit
   er bei den Stärken einer Spezialistin nicht verpufft. Die Haltung hängt
   nicht am Archetyp: Gerade die Spezialistin, die der Case braucht, hat oft
   die andere Farbe.

   Gemessen in 30 ganzen Partien: Wer auf Fit und Farbe achtet, ist in rund
   einem Drittel der Beteiligungs-Halbjahre eingespielt, wer nur auf Fit
   achtet in rund einem Fünftel, passiv in 5 %. Erst ab etwa 0,4 lohnt es
   sich messbar, für die Farbe auf etwas Fit zu verzichten; die passende
   Besetzung bleibt die erste Frage.

   Gilt nur für Beteiligungen mit `mx`. Eine besetzte Position ohne Haltung
   (Karten der alten Shortlist) zählt nicht als gleich ausgerichtet.      */
export const CHEM = 0.4;
export function chemOf(c): number {
  if (!c || !c.mx || !c.ceo) return 0;
  const on = ["ceo", "cfo", "r3"].map((k) => c[k]).filter((s) => s && s.skill > 0);
  if (on.length < 3 || on.some((s) => !s.side)) return 0;
  return new Set(on.map((s) => s.side)).size === 1 ? CHEM : 0;
}
export const CHEM_LABEL = (v: number) => (v > 0 ? "Eingespielt" : "Neutral");
/* Haltung der Amtsinhaber beim Closing: aus dem Namen der Beteiligung und der
   Position abgeleitet statt gewürfelt, damit das Closing keine Zufallszahl
   mehr zieht und alle Wege (Mehrspieler, Übungsmodus) dieselbe Haltung
   sehen.

   Das unterste Bit eines FNV-1a-Hashs ist nur die Parität der Zeichen: Bis
   zum 21.10.2026 hatten CEO und CFO derselben Firma dadurch immer die
   entgegengesetzte Farbe (":ceo" und ":cfo" unterscheiden sich in genau einem
   ungeraden Zeichen), keine Altmannschaft war je gleich ausgerichtet. Die
   oberen Bits mischen; ein Finalizer streut zusätzlich.                 */
export function sideOf(key: string): "hell" | "dunkel" {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 31) ? "dunkel" : "hell";
}
export function seatSides(c, key: string) {
  for (const k of ["ceo", "cfo", "r3"]) {
    if (c[k] && c[k].skill > 0 && !c[k].side) c[k] = { ...c[k], side: sideOf(key + ":" + k) };
  }
  return c;
}
// Kompetenz einer Position im Team, mit Chemie
const compIn = (c, seat, i) => compOf(c[seat], i) + (c[seat].skill > 0 ? chemOf(c) : 0);
/* Ein vakanter CEO wird kommissarisch geführt: Leadership und
   Kompetenzfamilie wirken wie ein Interim auf MGMT_INTERIM, so wie bei der
   laufenden Wirkung. Vorher zählte die Vakanz als 0 und deckelte CFO und
   Fachfunktion auf 1,5 — ein CEO-Wechsel lähmte das ganze Team. Nur mit
   `mx`, ältere Halbjahre rechnen wie bisher.                              */
const ceoIn = (c, i) => (c.mx && !(c.ceo.skill > 0) ? MGMT_INTERIM : compIn(c, "ceo", i));
const leadOf = (c) => ceoIn(c, 2);
// Ein Co-Investor wirkt wie ein laufendes MEP: eigenes Geld im Unternehmen
const mepOf = (c, seat) => !!(c.ltip || c.ceo.trait === "coinvest" || (seat !== "ceo" && c[seat].trait === "coinvest"));
// Effektives Rating: gedeckelte Fachposition plus halber CEO, plus MEP-Bonus
const legacyEff = (c, seat) => cappedSkill(c, seat) + 0.5 * c.ceo.skill + (c.ltip ? 0.5 : 0)
  + (seat === "cfo" && c.sector === "Software" ? 0.5 * cappedSkill(c, "r3") : 0);
/* Mit Programm: die Kompetenz, die das Programm braucht, gedeckelt durch die
   Leadership des CEO, plus die halbe CEO-Kompetenz der Programmfamilie. Ohne
   Programm (Anzeige, Altpfade) das bisherige effektive Rating.            */
export const effSkill = (c, seat, id?: string) => {
  if (!id || PROGRAM_COMP[id] == null || seat === "ceo") return legacyEff(c, seat);
  const fam = ceoIn(c, INITS.plat.some((k) => k.id === id) ? 0 : 1);
  const own = Math.min(compIn(c, seat, PROGRAM_COMP[id]), leadOf(c) + 1.5);
  return own + 0.5 * fam + (mepOf(c, seat) ? 0.5 : 0)
    + (seat === "cfo" && c.sector === "Software" ? 0.5 * cappedSkill(c, "r3") : 0);
};

/* ---------- Laufende Wirkung des Managements ----------
   Bis hierhin wirkte das Management ausschließlich über die Erfolgsquote der
   Programme. Gemessen hatte das zwei Folgen: Ein Durchschnittsteam erzeugte
   mit Programmen kaum mehr als passives Halten, und wer nicht aktiv wurde,
   hatte vom besten Team gar nichts. In der Praxis ist es umgekehrt — ein
   Turnaround-CEO verbessert die Marge auch ohne eigenes Programm, eine
   Treasury-CFO senkt die Kapitalbindung im Tagesgeschäft.

   Jede Kompetenz bewegt deshalb laufend ihren Werttreiber, solange die Person
   im Amt ist. Drei Regeln halten das im Rahmen:
   - Gewichtet mit dem Bedarf des Cases, über dieselbe Eignung (fitOf), die
     der Maßnahmenpicker zeigt. Wer Marge verbessern soll, wo sie schon über
     Branchenniveau liegt, bewegt wenig.
   - Um MGMT_CENTER zentriert und nach oben bei +MGMT_UP gedeckelt. Eine
     Lücke an der falschen Stelle kostet Wert, ein Star bringt laufend nicht
     mehr als ein sehr guter Profi.
   - Eine vakante Position wirkt wie ein Interim auf MGMT_INTERIM.

   Kalibriert über 500 Cases, gleicher Kaufpreis, fünf Jahre: Zwischen
   passender und falscher Besetzung bei gleichem Assessment-Score liegen
   0,65x MOIC statt 0,26x — etwa so viel wie 2,5 Turns Kaufpreis.

   Gilt nur für Beteiligungen mit `mx`. Das Feld setzt das Closing seit dem
   19.10.2026; ältere Beteiligungen und die Wiederholung alter Halbjahre
   (EngineCompat.legacyMgmt) rechnen ohne.                                 */
export const MGMT_K = 1.5, MGMT_CENTER = 2.5, MGMT_UP = 1.5, MGMT_INTERIM = 2.0;
const NO_FX = { margin: 0, growth: 0, nwc: 0, rate: 0, capex: 0 };
export function mgmtFx(c) {
  if (!c || !c.mx || !c.ceo) return NO_FX;
  const chem = chemOf(c);
  const up = (k, i) => c[k].skill > 0
    ? Math.min(MGMT_UP, compOf(c[k], i) - MGMT_CENTER) + chem
    : MGMT_INTERIM - MGMT_CENTER;
  const f = (id) => fitOf(id, c);
  const growthNeed = clamp((SECTORS[c.sector].g + (c.drift || 0)) / 6, 0.2, 1.6);
  return {
    margin: MGMT_K * (0.45 * up("ceo", 0) * f("opex") + 0.35 * up("cfo", 0) * f("opex") + 0.30 * up("r3", 0) * f("pen")),
    growth: MGMT_K * (0.55 * up("ceo", 1) * growthNeed + 0.55 * up("r3", 1) * f("exp")),
    nwc: -MGMT_K * 1.0 * up("cfo", 1) * f("nwc"),
    rate: -MGMT_K * 0.10 * up("cfo", 1),
    capex: -MGMT_K * 0.25 * up("cfo", 2) * f("erp"),
  };
}
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
// Ein starkes Team liefert schneller: vier Halbjahre unter Rating 1,6, drei ab 1,6,
// zwei ab 3,2 und eines ab 4,8.
export const initDur = (E) => Math.max(1, 4 - Math.floor(E / 1.6));
/* Der Gewinn einer Auflage hängt deutlich am Team: effektives Rating 2 bringt
   1,90, Rating 6 bringt 2,86. Gebremst werden Wiederholungen nicht über eine
   Obergrenze je Maßnahme, sondern wirtschaftlich -- siehe repeatMalus und
   ceilingFactor.                                                              */
export const initGain = (E) => 0.70 + 3.60 * E / (E + 4);
/* Je weiter über Branchenniveau, desto weniger bringt die nächste Maßnahme.
   Eine von drei Bremsen gegen unbegrenztes Aufstocken: dazu kommen der Rückfall
   zur Benchmark (DECAY in stepCompany, solange in der Dimension kein Programm
   läuft) und repeatMalus je weiterer Auflage. Bewusst mild, damit Ausbauen sich
   lohnt.                                                                      */
export const ceilingFactor = (lvl) => Math.max(0.15, 1 - 0.13 * Math.max(0, lvl - 2));
export const ACC_SPREAD = [0.3, 1.3];   // Streubreite des Ergebnisses bei Acceleration

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
      sm: 0.02, dm: -1, gm: 0.8, oneOff: 0.06, cx: 0 },
    /* Der Ertrag steckt jetzt in der Quote selbst: nwcFix senkt die
       Kapitalbindung dauerhaft, und weil die Quote auf dem Bestand rechnet,
       fließt der Unterschied sofort als Liquidität zu. legacyRelease ist der
       pauschale Einmaleffekt von früher und wird nur noch bei der
       Wiederholung alter Halbjahre angewandt (siehe EngineCompat).         */
    { id: "nwc", n: "NWC-Programm (Cash Release)", cls: "rel", d: "Forderungslaufzeiten, Bestände und Zahlungsziele. Senkt die Kapitalbindung dauerhaft und setzt den Unterschied sofort frei.",
      sm: 0.05, dm: 0, gm: 0.5, oneOff: 0.036, cx: 0, nwcFix: -3, legacyRelease: 0.35 },
    { id: "erp", n: "ERP & Digitalisierung", cls: "tr", d: "Systemlandschaft ersetzen. Großer Hebel, langer Atem — und ein Fehlschlag bringt gar nichts.",
      sm: 0.03, dm: 1, gm: 1.7, oneOff: 0.18, cx: 2.0, capexFix: -0.5, nwcFix: -1.5, failCost: 0.35 },
    { id: "ai", n: "KI-gestützte Prozessautomatisierung", cls: "tr", d: "Angebotserstellung, Planung und Service automatisieren. Größter Hebel im Katalog, dafür der anspruchsvollste.",
      sm: -0.02, dm: 0, gm: 2.2, oneOff: 0.15, cx: 1.0, capexFix: -0.9, failCost: 0.30,
      req: (c) => effSkill(c, "cfo", "ai") >= 4, reqT: "Effektive Finance Transformation mindestens 4" },
  ],
  acc: [
    { id: "pen", n: "Pricing & Cross-Selling", cls: "rel", d: "Bestandskunden ausbauen, Preise durchsetzen. Kurzer Payback, begrenzte Höhe.",
      sm: 0.07, dm: -1, gm: 0.8, drag: 0.5, cx: 0, spread: [0.7, 1.1] },
    { id: "exp", n: "Markt- und Segmentexpansion", cls: "hard", d: "Neue Regionen oder Segmente. Breite Streuung, teurer Fehlschlag.",
      sm: 0.16, dm: 1, gm: 1.3, drag: 1.0, cx: 0, nwcRun: 2, spread: [0.3, 1.4],
      failCost: 0.25, failMargin: -0.8 },
    { id: "ma", n: "Add-on M&A", cls: "tr", d: "Erwerb eines Wettbewerbers, überwiegend fremdfinanziert. Signing und Closing im selben Halbjahr.",
      sm: -0.05, dm: 0, gm: 0, drag: 0.4, cx: 0, ma: true },
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
    exp: SECTORS[c.sector].g >= 6 ? "wachsender Markt trägt die Expansion"
      : SECTORS[c.sector].g <= 4 ? "stagnierender Markt — Expansion kostet Marge ohne Gegenwert" : "Markt wächst moderat",
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

/* ---------- Zukauf als Mandat ----------
   Bis zum 15.09.2026 war ein Add-on ein fertiges Angebot: Die Zielgröße lag
   als `addonSize` beim Kauf der Plattform fest (20–35 %), der Preis stand, und
   die einzige Entscheidung war ja oder nein. Der Zukauf hatte damit keinen
   Preis, über den sich verhandeln ließ, und keine Größe, über die sich
   nachdenken ließ — nur ein Risiko, das aus Zahlen kam, die der Spieler nicht
   gesetzt hatte.

   Jetzt erteilt der Spieler ein Mandat, wie in der Praxis: Bis zu welchem
   EBITDA soll gesucht werden, und bis zu welchem Multiple darf gezahlt werden?
   Beides bewegt dasselbe Risiko in dieselbe Richtung, aus dem gleichen Grund,
   aus dem Buy-&-Build in der Praxis scheitert:

   - Ein größerer Bissen ist schwerer zu verdauen. Ein Zukauf von 10 % des
     Konzern-EBITDA läuft nebenher; einer von 50 % ist eine Fusion, für die
     dieselbe Organisation und dasselbe Managementteam zuständig sind.
   - Wer unter der Preisvorstellung des Verkäufers bleibt, bekommt nicht
     denselben Zukauf billiger, sondern einen anderen. Zu dem Preis ist nur
     zu haben, was sonst niemand will: Nachfolge ohne Nachfolger, Kunden-
     konzentration, ein Buch voller Altlasten. Adverse Selektion, und sie
     zeigt sich in der Integration.

   Kalibriert ist die Skala auf den Referenzfall — Zielgröße ADDON_REF_SHARE
   des Plattform-EBITDA, voller Preis, Plattform auf Branchenniveau: dort
   scheitert die Integration in ADDON_FAIL_BASE der Fälle. Das ist bewusst
   deutlich weniger als unter der alten Logik (dort knapp die Hälfte); der
   Preis für ein hohes Risiko soll aus der Entscheidung des Spielers kommen,
   nicht aus dem Grundrauschen.                                             */
/* Das Mandat, wie es von der Ansicht in die Auswertung geht: Zielgröße in
   Mio. € EBITDA, Höchstgebot als Multiple, Eigenkapitalanteil aus dem Fonds.
   `legacy` schaltet auf das Verhalten vor dem 15.09.2026 zurück (siehe
   EngineCompat.legacyAddonMandate), `ask`/`runs` sind interne Durchreichungen. */
export interface AddonOpts {
  addEb?: number; mult?: number; equity?: number;
  ask?: number; runs?: number; legacy?: boolean;
}

export const ADDON_MAX_SHARE = 0.50;   // Obergrenze des Mandats: Anteil am Plattform-EBITDA
export const ADDON_REF_SHARE = 0.25;   // Referenzgröße, auf die kalibriert ist
export const ADDON_FAIL_BASE = 0.10;   // Scheiterungsrisiko im Referenzfall
export const ADDON_SIZE_SLOPE = 1.00;  // je Anteilspunkt über der Referenzgröße
export const ADDON_PRICE_SLOPE = 0.18; // je Turn unter der Preisvorstellung
/* Referenzplattform der Kalibrierung. Keine Wunschwerte, sondern die
   gemessene Mitte: Über 60 Partien lag eine Beteiligung im Moment eines
   Zukaufs bei Prozessreife 2,0 (Branchenniveau), effektivem Rating der
   Fachrolle 1,9 und 2,5× Leverage. Genau dort liegt das Risiko bei
   ADDON_FAIL_BASE — wer sein Team und seine Prozesse aufgebaut hat, kommt
   darunter, wer beides vernachlässigt, darüber. Die Leverage-Referenz ist
   LEV_FREE: Erst darüber kostet Fremdkapital Handlungsfähigkeit.          */
export const ADDON_REF_PLAT = 2.0, ADDON_REF_SKILL = 2.0, ADDON_REF_LEV = LEV_FREE;

/* Preisvorstellung des Verkäufers für ein Ziel dieser Größe.

   Der Größenabschlag hängt jetzt am EBITDA des ZIELS, nicht mehr an dem der
   Plattform: Ein 3-Mio.-Unternehmen wird strukturell niedriger bewertet als
   ein 15-Mio.-Unternehmen, und genau daraus entsteht die Multiple-Arbitrage
   eines Buy-&-Build. Wer groß zukauft, zahlt fast das eigene Multiple und
   verdient an der Arbitrage nichts mehr — die zweite Hälfte des Trade-offs
   neben dem Integrationsrisiko.                                            */
export const addonSizeDisc = (addEb) => clamp(2.4 - Math.max(0, addEb - 3) * 0.16, 0.4, 2.4);
export function addonAsk(c, market, addEb) {
  const heat = market ? clamp((market[c.sector] / SECTORS[c.sector].m - 1) * 3.0, -0.6, 1.6) : 0;
  const arb = clamp(addonSizeDisc(addEb) - heat - (c.addonComp || 0), -1.2, 2.4);
  return Math.max(3, markMultiple(c, market) - arb);
}

/* Das Mandat, das die Ansicht voreinstellt und die KI-Fonds benutzen:
   Referenzgröße, voller Preis. Damit steht der kalibrierte Fall als Vorgabe
   da, und jede Abweichung ist eine bewusste Entscheidung.                  */
export function addonMandate(c, market) {
  const addEb = ebitdaOf(c) * ADDON_REF_SHARE;
  return { addEb, mult: addonAsk(c, market, addEb) };
}
export const addonMaxEb = (c) => ebitdaOf(c) * ADDON_MAX_SHARE;

/* Scheiterungsrisiko der Integration. Die beiden Terme, die der Spieler
   steuert, stehen oben; darunter das, was die Plattform mitbringt.        */
export const ADDON_LEV_SLOPE = 0.06;    // je Turn Leverage über der Referenz
export const ADDON_PLAT_SLOPE = 0.05;   // je Stufe Prozessreife über der Referenz
export const ADDON_TEAM_SLOPE = 0.045;  // je Ratingpunkt der Fachrolle darüber
export const ADDON_REPEAT_SLOPE = 0.05; // je weiterer Auflage

/* Die Summanden des Scheiterungsrisikos, einzeln benannt und mit Vorzeichen.

   Die Ansicht zeigt sie als Begründung neben der Prozentzahl. Sie stand dort
   bis zum 16.09.2026 als kommaseparierte Liste aus eigenen Schwellwerten —
   "kleiner Bissen, Prozesse noch unreif" nebeneinander, ohne zu sagen, dass
   das erste die Zahl senkt und das zweite sie hebt. Zwei richtige Angaben,
   die zusammen in die Irre führten.

   Jetzt kommt die Begründung aus derselben Liste, die addonFailRisk()
   aufaddiert: Sie kann gar nicht mehr von der Zahl abweichen, und jeder
   Posten trägt sein eigenes Vorzeichen.                                     */
export function addonFailParts(c, opts = {} as AddonOpts) {
  const eb = ebitdaOf(c);
  const addEb = opts.addEb ?? eb * ADDON_REF_SHARE;
  const ask = opts.ask ?? 0;
  // Geboten wird höchstens die Preisvorstellung — mehr zu zahlen kauft nichts.
  const mult = Math.min(opts.mult ?? ask, ask);
  const skill = effSkill(c, "r3", "ma") * (c.onboard > 0 ? 0.7 : 1);
  return [
    { k: "size", t: "Zielgröße", v: ADDON_SIZE_SLOPE * (addEb / Math.max(0.5, eb) - ADDON_REF_SHARE) },
    { k: "price", t: "Gebot unter Preisvorstellung", v: ADDON_PRICE_SLOPE * Math.max(0, ask - mult) },
    { k: "lev", t: "Verschuldung", v: ADDON_LEV_SLOPE * Math.max(0, c.netDebt / Math.max(0.5, eb) - ADDON_REF_LEV) },
    { k: "plat", t: "Prozessreife", v: -ADDON_PLAT_SLOPE * (c.plat - ADDON_REF_PLAT) },
    { k: "team", t: "Team", v: -ADDON_TEAM_SLOPE * (skill - ADDON_REF_SKILL) },
    { k: "runs", t: "weitere Auflage", v: ADDON_REPEAT_SLOPE * (opts.runs || 0) },
  ];
}
export function addonFailRisk(c, opts = {} as AddonOpts) {
  return clamp(ADDON_FAIL_BASE + addonFailParts(c, opts).reduce((s, p) => s + p.v, 0), 0.02, 0.95);
}

/* Das alte Integrationsrisiko. Steht nur noch für die Wiederholung bereits
   ausgewerteter Halbjahre (EngineCompat.legacyAddonMandate) — dort gab es
   weder Zielgröße noch Gebot als Entscheidung.                            */
export function addonRisk(c) {
  const lev = c.netDebt / Math.max(0.5, ebitdaOf(c));
  return clamp(
    0.09 * (c.plat - 2.5)                      // reife Prozesse tragen die Integration
    - 0.07 * Math.max(0, lev - 3.0)            // jeder Turn über 3,0× kostet Handlungsfähigkeit
    - 0.55 * Math.max(0, (c.addonSize ?? 0.275) - 0.22),  // je größer der Bissen, desto riskanter
    -0.32, 0.12);
}

export const ADDON_HEADROOM = 0.6;   // Mindestpuffer zum Covenant nach dem Zukauf
/* Der Zukauf in Zahlen: Mandat hinein, Preis, Finanzierung und Risiko heraus.
   Eine Stelle für alles, was die Karte zeigt und die Auswertung rechnet.

   Die Finanzierung prüft die Pro-forma-Verschuldung nach dem Abschluss —
   (Nettoverschuldung + Kaufpreis) / (EBITDA + EBITDA des Ziels) — gegen den
   Covenant abzüglich ADDON_HEADROOM. Die Banken finanzieren nicht bis auf den
   letzten Zentimeter an den Covenant heran; sie verlangen Puffer für den Fall,
   dass die Integration schiefgeht. Reißt die Pro-forma-Zahl die Grenze, kommt
   die Finanzierung nicht zustande.                                         */
export function addonCheck(c, market, opts = {} as AddonOpts) {
  const eb = ebitdaOf(c);
  const legacy = !!opts.legacy;
  const addEb = legacy ? addonEbitda(c)
    : clamp(opts.addEb ?? ebitdaOf(c) * ADDON_REF_SHARE, 0, addonMaxEb(c));
  const ask = legacy ? addonMultiple(c, market) : addonAsk(c, market, addEb);
  // "Maximales Multiple" ist eine Obergrenze: Über der Preisvorstellung des
  // Verkäufers zahlt niemand, darunter steigt das Risiko.
  const mult = legacy ? ask : Math.max(1, Math.min(opts.mult ?? ask, ask));
  const price = addEb * mult;
  /* Ein Zukauf muss nicht vollständig fremdfinanziert sein. Der Fonds kann
     Eigenkapital nachschießen — genau das tut ein Sponsor, wenn die Plattform
     die Akquisitionsschuld nicht mehr trägt, der Zukauf aber strategisch
     richtig ist. Der Eigenkapitalanteil mindert die Schuld und damit die
     Pro-forma-Verschuldung; die Kostenbasis des Deals steigt entsprechend,
     der Zukauf wird also nicht billiger, sondern nur finanzierbar.         */
  const eqIn = clamp(opts.equity ?? 0, 0, price);
  const debt = price - eqIn;
  const lev = (c.netDebt + debt) / Math.max(0.5, eb + addEb);
  const limit = (c.covLimit ?? COV_DEFAULT) - ADDON_HEADROOM;
  const failOpts = { addEb, mult, ask, runs: opts.runs || 0 };
  const fail = legacy ? null : addonFailRisk(c, failOpts);
  return {
    addEb, ask, mult, price, equity: eqIn, debt, lev, limit, fail,
    failParts: legacy ? [] : addonFailParts(c, failOpts),
    share: addEb / Math.max(0.5, eb), gap: Math.max(0, ask - mult),
    ok: lev <= limit && addEb > 0.05,
  };
}
/* Wie viel Eigenkapital ein Zukauf mindestens braucht, damit die Pro-forma-
   Verschuldung die Finanzierungsgrenze hält. Null, wenn er ohnehin trägt;
   der volle Kaufpreis, wenn auch das nicht reicht (dann steht die Plattform
   schon über der Grenze und der Zukauf ist unabhängig vom Preis nicht
   finanzierbar).                                                           */
export function addonEquityNeeded(c, market, opts = {} as AddonOpts) {
  const k = addonCheck(c, market, { ...opts, equity: 0 });
  const room = k.limit * Math.max(0.5, ebitdaOf(c) + k.addEb) - c.netDebt;
  return clamp(k.price - room, 0, k.price);
}

/* Wie viel Growth-Reifegrad die Beteiligung tragen kann: People und Platform
   setzen die Grenze, alles darüber ist Überdehnung. Steht als eigene Zeile,
   weil außer accEff und overstretch auch der Maßnahmenkatalog sie braucht —
   er sagt vor dem Start, wie viel des Reifegradgewinns überhaupt wirkt. Eine
   Zahl, ein Ort: Vorher stand derselbe Ausdruck dreimal da.                 */
export const accCap = (c) => Math.min(peopleLvl(c) + 1, c.plat + 1);
// Acceleration wirkt nur, soweit People und Platform sie tragen
export const accEff = (c) => Math.min(c.acc, accCap(c));
export const overstretch = (c) => Math.max(0, c.acc - accCap(c));

/* Wie lange eine Maßnahme läuft, ohne sie zu starten. buildInit() rechnet
   genau diese Zeile; der Katalog (InitPicker) und die Vormerkung einer
   Mehrspielerpartie (patchHolding) brauchen sie, bevor gewürfelt wird.

   Bis zum 15.09.2026 rechnete die Vormerkung stattdessen `initDur(E)` allein
   — ohne den Zuschlag der Maßnahme (`dm`) und ohne den Wiederholungsmalus.
   Die Karte zeigte direkt nach dem Klick eine kürzere Restlaufzeit an als
   nach der Auswertung. Eine Zahl, ein Ort.

   Der Zukauf läuft mit Dauer 0: Signing und Closing fallen in dasselbe
   Halbjahr. maturePeople() wird im selben Durchlauf nach der Entscheidung
   aufgerufen und prüft `q < doneQ` — bei doneQ = q schließt der Zukauf noch
   in derselben Periode ab, Akquisitionsschuld und erworbenes EBITDA kommen
   zusammen an. Die Margenbelastung (drag) trägt die Periode des Erwerbs.
   Bereits ausgewertete Halbjahre behalten ihre alte Laufzeit von zwei bis
   drei Halbjahren — siehe buildInit (EngineCompat.legacyAddonMandate).      */
export function initDurationOf(c, dim, id) {
  const spec = initById(dim, id);
  if (!spec) return null;
  if (spec.ma) return 0;
  const seat = dim === "plat" ? "cfo" : "r3";
  const E = effSkill(c, seat, id) * (c.onboard > 0 ? 0.7 : 1);
  return Math.max(1, initDur(E) + (spec.dm || 0) + repeatMalus(initRuns(c, id)).dm);
}

/* Gemeinsamer Baustein für den Start einer Maßnahme. Spieler und KI benutzen
   dieselbe Funktion — vorher war die KI mit einem pauschalen Reifegradgewinn
   von 0,85 unterwegs, während der Spieler über initGain das Drei- bis Vierfache
   holte. Das war der eigentliche Grund, warum die Kohorte nie mithalten konnte. */
export function buildInit(
  rng: Rng, c, dim, id, market, quarter,
  compat: EngineCompat = {}, mandate: AddonOpts = {},
) {
  const spec = initById(dim, id);
  if (!spec) return null;
  const runs = initRuns(c, id);
  if (runs >= REPEAT_MAX) return null;
  const rep = repeatMalus(runs);
  if (spec.req && !spec.req(c)) return null;
  const seat = dim === "plat" ? "cfo" : "r3";
  const E = effSkill(c, seat, id) * (c.onboard > 0 ? 0.7 : 1);
  // Risk-Taker: mehr Mut bei marktabhängigen Programmen, teurere Fehlschläge
  const risk = c[seat].skill > 0 && c[seat].trait === "risk" && spec.cls === "hard";
  /* Der Zukauf rechnet sein Risiko aus dem Mandat des Spielers (Zielgröße und
     Höchstgebot), jede andere Maßnahme aus Rating und Risikoklasse. Beides
     ohne Ziehung — die Reihenfolge des Zufallsstroms bleibt damit dieselbe
     wie vor der Umstellung, und bereits ausgewertete Halbjahre lassen sich
     weiter nachrechnen.                                                     */
  const legacy = !!compat.legacyAddonMandate;
  /* Seit dem 16.09.2026 schließt ein Zukauf im Halbjahr der Entscheidung ab
     (initDurationOf gibt 0). Vor der Umstellung gestartete Zukäufe liefen
     initDur(E) + 1 Halbjahre — diese Zeile hält sie nachrechenbar.          */
  const dur = spec.ma && legacy
    ? Math.max(1, initDur(E) + 1 + rep.dm)
    : initDurationOf(c, dim, id);
  const chk = spec.ma ? addonCheck(c, market, { ...mandate, runs, legacy }) : null;
  const p = spec.ma && !legacy
    ? clamp(1 - chk.fail, 0.05, 0.98)
    : clamp(initSuccess(E, spec.cls) + (spec.sm || 0) + rep.sm + (spec.ma ? addonRisk(c) : 0) + (risk ? 0.05 : 0), 0.1, 0.97);
  const ok = rng.rnd() < p;
  const sp = spec.spread ? spec.spread[0] + rng.rnd() * (spec.spread[1] - spec.spread[0])
    : dim === "acc" ? ACC_SPREAD[0] + rng.rnd() * (ACC_SPREAD[1] - ACC_SPREAD[0]) : 1;
  /* Was die Maßnahme in die laufende Initiative mitnimmt: Zukäufe die Daten
     des Signings (ma … ok), alle übrigen ihren Ergebnisbeitrag (gain). */
  let patch: {
    drag: number; cx: number; nwcRun: number;
    ma?: boolean; addEb?: number; mult?: number; price?: number; equity?: number; addDebt?: number;
    fail?: number; gain?: number; ok?: boolean;
  } = { drag: spec.drag || 0, cx: spec.cx || 0, nwcRun: spec.nwcRun || 0 };
  let debt = ebitdaOf(c) * (spec.oneOff || 0);
  if (spec.ma) {
    if (!chk.ok) return { blocked: chk };
    /* Ein Zukauf wird bezahlt. Bis 30.08.2026 fehlte diese Buchung ganz —
       im Mehrspieler- und KI-Pfad kam das EBITDA des Add-ons an, ohne dass
       die Akquisitionsschuld je gebucht wurde, während der Übungsmodus sie
       (in seiner eigenen Kopie der Mechanik) korrekt buchte.

       Nur der fremdfinanzierte Teil des Kaufpreises erhöht die Schuld; den
       Rest schießt der Fonds als Eigenkapital nach (siehe fundEquityIn beim
       Aufrufer). Das Eigenkapital fließt beim Signing an den Verkäufer, senkt
       die Nettoverschuldung aber nicht (toDebt: false) — der Leverage bleibt
       davon unberührt.

       Gezogen wird die Akquisitionsschuld beim ABSCHLUSS, nicht beim Start.
       Bis 15.09.2026 stand sie ab dem Start in der Bilanz, während das
       gekaufte EBITDA erst mit der Integration ankam. Das war keine
       Vorsichtsannahme, sondern eine falsche Bilanz: Die Karte prüft die
       Finanzierbarkeit pro forma, also (Schuld + Kaufpreis) / (EBITDA +
       EBITDA des Ziels), und genehmigt den Zukauf nur unterhalb der
       Finanzierungsgrenze. Der Covenant wird aber jede Periode auf dem
       tatsächlichen Leverage getestet — und der lief im Integrationsfenster
       gegen das ALTE EBITDA. Gemessen über 121 Zukäufe: Karte im Schnitt
       3,6×, tatsächlich 4,3×, Spitze 8,3× gegen einen Covenant von 6,5 — in
       54 Halbjahren stand die Plattform über ihrem Covenant, auf einer Zahl,
       die nirgends stand.

       Jetzt kommen Schuld und EBITDA zusammen an (maturePeople). Damit ist
       der Leverage nach dem Abschluss genau die Pro-forma-Zahl, auf der
       entschieden wurde — und das Integrationsrisiko trägt weiter, was es
       tragen soll: Scheitert sie, steht die Schuld trotzdem voll.

       Seit dem 16.09.2026 ist das Integrationsfenster ohnehin null: Signing
       und Closing fallen in dasselbe Halbjahr (initDurationOf gibt beim
       Zukauf 0). Die Buchung beim Abschluss bleibt trotzdem die richtige
       Stelle — sie hält Schuld und EBITDA aneinander, auch für Zukäufe aus
       Partien mit altem Regelstand.                                        */
    if (compat.addonDebtAtStart && !compat.addonWithoutDebt) debt += chk.debt;
    const addDebt = compat.addonDebtAtStart || compat.addonWithoutDebt ? 0 : chk.debt;
    /* `gain` stand hier bis zum 15.09.2026 auf 0,35 und wurde nie gelesen:
       maturePeople() gibt einem gelungenen Zukauf fest +1,0 Reifegrad. Eine
       Zahl, die nirgends hinführt, ist schlimmer als keine. */
    patch = { ...patch, ma: true, addEb: chk.addEb, mult: chk.mult, price: chk.price,
      equity: chk.equity, addDebt, fail: chk.fail, ok };
  } else {
    patch = { ...patch, gain: initGain(E) * sp * (spec.gm || 1) * rep.gm * fitOf(id, c)
      * ceilingFactor(dim === "plat" ? c.plat : c.acc), ok };
  }
  return { spec, dur, p, ok, debt, chk, slot: dim === "plat" ? "initP" : "initA",
    init: { dim, id, name: spec.n, doneQ: quarter + dur, ...patch, ...(risk ? { failMult: 1.5 } : {}) } };
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
  // Haltung der Amtsinhaber ohne Zufallszahl (siehe sideOf); wirkt erst mit `mx`
  return seatSides({
    ceo: { skill: retiring ? r(3, 4) : r(1, 4), retiring },
    cfo: { skill: rng.rnd() < 0.35 ? 0 : r(1, 3) },
    r3: { skill: rng.rnd() < 0.45 ? 0 : r(1, 3) },
  }, d.name);
}
/* Die Shortlist bis zum 19.10.2026: immer dieselben drei Schablonen mit einem
   Rating. Steht für die Wiederholung alter Halbjahre (EngineCompat.
   legacyCandidates) — die neue Shortlist zieht andere Zufallszahlen.      */
export interface ManagerCard {
  label: string; shown: number; span: number; skill: number; dev: boolean; poach: number; note: string;
  arch?: string; name?: string; g?: "f" | "m"; age?: number; origin?: string; pic?: number; trait?: string;
  prof?: number[]; shownProf?: number[]; side?: "hell" | "dunkel"; portrait?: string;
}
function legacyCandidates(rng: Rng): ManagerCard[] {
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

/* ---------- Archetypen der Shortlist ----------
   Je Position sechs Suchprofile, wie sie ein PE-Headhunter vorstellt: drei
   Spezialisten mit klarer Stärke und klarer Lücke, dazu Branchen-Insider,
   Serial PE und Step-up. Die drei Spezialisten liegen beim Assessment-Score
   um 3,0 und kosten damit gleich viel; welcher sich lohnt, entscheidet allein
   der Case. `p` sind die drei Kompetenzen in der Reihenfolge von
   COMPETENCIES, `span` die Assessment-Bandbreite vor Referenzen.

   Die CFO-Profile lehnen sich an die vier PE-CFO-Archetypen von BDO an
   (Turnaround Specialist, Exit Strategist, Buy-and-Builder, Standard-Setter),
   die CEO-Profile an die gängigen Suchprofile für Portfolio-CEOs.          */
export const MANAGER_ARCHES: Record<string, ManagerArch[]> = {
  ceo: [
    { key: "turnaround", n: ["Turnaround-CEO", "Turnaround-CEO"], p: [4.5, 1.8, 3.0], span: 0.5,
      note: "Hat zwei Restrukturierungen im Mittelstand geführt. Holt Marge, Wachstum ist nicht das Thema." },
    { key: "scaleup", n: ["Scale-up-CEO", "Scale-up-CEO"], p: [1.8, 4.5, 3.0], span: 0.5,
      note: "Hat ein Unternehmen in neue Märkte und auf die doppelte Größe geführt. Kosten laufen nebenher." },
    { key: "buildup", n: ["Buy-&-Build-CEO", "Buy-&-Build-CEO"], p: [2.6, 3.6, 3.6], span: 0.5,
      note: "Führt durch Zukäufe und hält das Top-Team zusammen. Hebt den Deckel für alle." },
    { key: "insider", n: ["Branchen-Insider", "Branchen-Insiderin"], p: [2.6, 2.5, 2.4], span: 0.5,
      note: "Zwanzig Jahre im Segment. Marktgehalt, keine Überraschungen, kein Sprung." },
    { key: "serial", n: ["Serial PE-CEO", "Serial PE-CEO"], p: [4.6, 4.5, 4.6], span: 0.5, poach: 2,
      note: "Mehrere Sponsor-Zyklen und Exits. Sofort auf Topniveau, teuer, wird selbst abgeworben." },
    { key: "stepup", n: ["Step-up-Kandidat", "Step-up-Kandidatin"], p: [2.0, 2.0, 2.2], span: 1.5, dev: true,
      note: "Erste CEO-Rolle, aus der zweiten Reihe. +0,25 je Halbjahr bis 4,5." },
  ],
  cfo: [
    { key: "turnaround", n: ["Turnaround-CFO", "Turnaround-CFO"], p: [4.6, 2.8, 1.6], span: 0.5,
      note: "Kostenprogramme in drei Familienunternehmen. Hält von Systemprojekten wenig." },
    { key: "treasury", n: ["Treasury-CFO", "Treasury-CFO"], p: [2.8, 4.6, 1.6], span: 0.5,
      note: "Working Capital, Banken, Covenants. Setzt Liquidität frei, wo andere sie suchen." },
    { key: "standard", n: ["Standard-Setter", "Standard-Setterin"], p: [2.2, 2.2, 4.6], span: 0.5,
      note: "Baut Reporting, Controlling und Systeme auf. ERP und KI sind das eigene Terrain." },
    { key: "insider", n: ["Branchen-Insider", "Branchen-Insiderin"], p: [2.6, 2.5, 2.4], span: 0.5,
      note: "Kennt jeden Lieferanten im Umkreis. Marktgehalt, keine Überraschungen." },
    { key: "serial", n: ["PE-erfahrener CFO", "PE-erfahrene CFO"], p: [4.5, 4.6, 4.5], span: 0.5, poach: 2,
      note: "Exit-erprobt, kennt Lender und Sponsor. Teuer, wird selbst abgeworben." },
    { key: "stepup", n: ["Step-up-Kandidat", "Step-up-Kandidatin"], p: [2.0, 2.2, 2.4], span: 1.5, dev: true,
      note: "Head of Controlling, erste CFO-Rolle. +0,25 je Halbjahr bis 4,5." },
  ],
  r3: [
    { key: "commercial", n: ["Commercial Leader", "Commercial Leader"], p: [4.6, 2.6, 1.8], span: 0.5,
      note: "Pricing, Key Accounts, Cross-Selling. Kurzer Payback, hält wenig von großen Sprüngen." },
    { key: "builder", n: ["Market Builder", "Market Builder"], p: [2.4, 4.6, 2.0], span: 0.5,
      note: "Hat zwei Auslandsmärkte aufgebaut. Go-to-Market ist das eigene Handwerk, Integration nicht." },
    { key: "integration", n: ["Integration Lead", "Integration Lead"], p: [2.0, 2.4, 4.6], span: 0.5,
      note: "Hat sechs Zukäufe integriert. Senkt das Scheiterungsrisiko von Add-ons deutlich." },
    { key: "insider", n: ["Branchen-Insider", "Branchen-Insiderin"], p: [2.6, 2.5, 2.4], span: 0.5,
      note: "Solide überall, keine Lücke, kein Sprung." },
    { key: "serial", n: ["Serial PE-Executive", "Serial PE-Executive"], p: [4.5, 4.6, 4.5], span: 0.5, poach: 2,
      note: "Stark in allem, teuer, wird selbst abgeworben." },
    { key: "stepup", n: ["Step-up-Kandidat", "Step-up-Kandidatin"], p: [2.5, 2.4, 2.0], span: 1.5, dev: true,
      note: "Zweite Reihe, erste eigene Führungsrolle. +0,25 je Halbjahr bis 4,5." },
  ],
};

/* Eigenschaften: je Karte eine, mit Vor- und Nachteil, wie sie in einem
   Referenzgespräch auftaucht. `w` ist das Ziehungsgewicht, `seat` schränkt
   auf eine Position ein. Die Wirkung steht jeweils an der Stelle, an der sie
   greift (Verweis in `fx`).                                               */
export const MANAGER_TRAITS: Record<string, { n: string; w: number; t: string; seat?: string }> = {
  bind:     { n: "Hohe Bindung", w: 3, t: "Abwerbungsrisiko halbiert" },
  day1:     { n: "Day-1-ready", w: 3, t: "Keine Einarbeitung: volles Tempo ab dem ersten Halbjahr" },
  flight:   { n: "Flight Risk", w: 2, t: "+0,3 auf alle Kompetenzen, doppeltes Abwerbungsrisiko" },
  sponsor:  { n: "Sponsor-erfahren", w: 2, t: "Kennt Equity Story und Vendor DD: Exit-Multiple +3 % (als CEO oder CFO)" },
  mentor:   { n: "Talentförderer", w: 2, seat: "ceo", t: "Step-up-Kandidaten im Team wachsen +0,1 je Halbjahr schneller" },
  coinvest: { n: "Co-Investor", w: 1, t: "Investiert eigenes Geld: wirkt wie ein MEP, Fixum 10 % niedriger" },
  risk:     { n: "Risk-Taker", w: 1, t: "+5 pp bei marktabhängigen Programmen, Fehlschläge kosten 1,5 × Sunk Cost" },
  lender:   { n: "Lender-erfahren", w: 1, seat: "cfo", t: "Bessere Bankkonditionen: Zinsmarge −25 bp" },
  network:  { n: "Starkes Netzwerk", w: 1, t: "Search-Mandate in dieser Beteiligung liefern ein Halbjahr schneller" },
};
export const ORIGINS = ["Konzern", "Mittelstand", "Beratung", "Scale-up", "Private Equity"];
const FIRST = {
  f: ["Katrin", "Mira", "Lea", "Sabine", "Julia", "Anna", "Nadine", "Claudia", "Elif", "Sophie", "Hanna", "Petra", "Ayşe", "Laura", "Miriam", "Franziska"],
  m: ["Jonas", "Thomas", "Markus", "Stefan", "Daniel", "Florian", "Mehmet", "Andreas", "Tobias", "Christian", "Felix", "Matthias", "Lukas", "Ralf", "Kemal", "Sebastian"],
};
const LAST = ["Albers", "Okafor", "Hoffmann", "Brandl", "Wieland", "Keller", "Richter", "Yilmaz", "Bauer", "Lorenz", "Vogt", "Sommer",
  "Haas", "Schuster", "Kaya", "Winter", "Berger", "Frank", "Lehmann", "Krüger", "Seidel", "Novak", "Arslan", "Hartmann"];
/* ---------- Porträts ----------
   21 Personen, jede in zwei Fassungen: vor hellem Büro für helle Charaktere
   und vor nächtlicher Skyline für dunkle (public/manager/<id>-hell.webp,
   <id>-dunkel.webp, 720 × 1080). IDs und Alter wie im Bildbriefing;
   f11 ist eine zweite Person im Stil von f05 und trägt deren Alter. Für
   CEO und CFO; die Fachfunktion hat je Sektor einen eigenen Satz
   (SPEC_PORTRAITS).                                                       */
export const PORTRAIT_POOL: Record<"f" | "m", [string, number][]> = {
  f: [["f01", 31], ["f02", 34], ["f03", 36], ["f04", 30], ["f05", 38], ["f06", 42], ["f07", 33], ["f08", 40],
    ["f09", 35], ["f10", 44], ["f11", 38]],
  m: [["m01", 30], ["m02", 33], ["m03", 35], ["m04", 31], ["m05", 38], ["m06", 42], ["m07", 34], ["m08", 40],
    ["m09", 36], ["m10", 44]],
};
/* Die Fachfunktion trägt das Gesicht ihrer Branche: CTO im Maschinenbau vor
   der Fertigung, CTO Medizintechnik im Laborkittel, Head of BD im Anzug.
   Je Sektor vier Frauen und vier Männer, IDs `<präfix>-f1` … `-m4` und Alter
   wie im Bildbriefing (manager-raw/fachfunktionen/README.md). */
const SPEC_PORTRAITS: Record<string, { pre: string; f: number[]; m: number[] }> = {
  Industrials: { pre: "ind", f: [34, 39, 42, 31], m: [36, 44, 33, 40] },
  Healthcare:  { pre: "hc",  f: [37, 32, 44, 35], m: [41, 34, 45, 30] },
  Software:    { pre: "sw",  f: [31, 36, 40, 33], m: [32, 38, 35, 43] },
  Services:    { pre: "bd",  f: [35, 41, 32, 44], m: [37, 42, 31, 45] },
  Consumer:    { pre: "cmo", f: [34, 38, 30, 43], m: [33, 39, 44, 31] },
};
/* Porträts, die es nur in einer Fassung gibt. Sie kommen nur auf Karten
   dieser Farbe. */
const PORTRAIT_ONLY: Record<string, "hell" | "dunkel"> = { "ind-f3": "dunkel" };
const fitsSide = (id: string, side?: string) => !side || !PORTRAIT_ONLY[id] || PORTRAIT_ONLY[id] === side;
/* Der Pool zu Geschlecht und Position: die Fachfunktion (r3) aus dem Satz
   ihres Sektors, CEO und CFO aus dem allgemeinen. */
export function portraitPool(g, seat?: string, sector?: string, side?: string): [string, number][] {
  const k = g === "f" ? "f" : "m";
  const sp = seat === "r3" && sector ? SPEC_PORTRAITS[sector] : null;
  const pool: [string, number][] = sp ? sp[k].map((a, i) => [`${sp.pre}-${k}${i + 1}`, a]) : PORTRAIT_POOL[k];
  return pool.filter(([id]) => fitsSide(id, side));
}
/* Ein Porträt zu Geschlecht und Wunschalter: unter den drei mit dem
   nächsten Alter, `r` in [0, 1) wählt eines davon. Das Alter steht nicht
   auf der Karte; es sorgt nur dafür, dass ein Step-up eher ein junges
   Gesicht bekommt. Die Karte trägt das Alter des Porträts. */
export function pickPortrait(g, age: number, r: number, seat?: string, sector?: string, side?: string) {
  const pool = [...portraitPool(g, seat, sector, side)]
    .sort((a, b) => Math.abs(a[1] - age) - Math.abs(b[1] - age) || (a[0] < b[0] ? -1 : 1));
  const [id, a] = pool[Math.min(pool.length - 1, Math.floor(r * 3))];
  return { id, age: a };
}
export const portraitUrl = (id: string, side?: string) =>
  `/manager/${id}-${(PORTRAIT_ONLY[id] || side) === "hell" ? "hell" : "dunkel"}.webp`;

/* Derselbe FNV-1a-Hash wie seedOf in der Oberfläche (battle.tsx): Die
   Gesichter der Amtsinhaber bleiben, wie sie bisher auf den Karten standen. */
function nameSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
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
    const g = nameSeed(name + seat) % 2 ? "f" : "m";
    const pool = portraitPool(g, seat, sector, side);
    const [id, age] = pool[nameSeed(name + ":" + seat) % pool.length];
    return { g, id, age };
  }
  const taken = new Set<string>();
  for (const k of SEAT_KEYS) {
    const g = nameSeed(name + k) % 2 ? "f" : "m";
    const pool = PORTRAIT_POOL[g].filter(([id]) => !taken.has(id));
    const [id, age] = pool[nameSeed(name + ":" + k) % pool.length];
    taken.add(id);
    if (k === seat) return { g, id, age };
  }
  return { g: "m", id: PORTRAIT_POOL.m[0][0], age: PORTRAIT_POOL.m[0][1] };
}

/* Das Gesicht auf einer Position: bei einer Verpflichtung das Porträt der
   Karte, bei einem Amtsinhaber das feste aus Firma und Position. */
export function faceOf(c, seat: string): string | null {
  const s = c[seat];
  if (!s || !(s.skill > 0)) return null;
  if (s.prof && s.name) return s.portrait || null;
  return incumbentPortrait(c.name, seat, c.sector, s.side).id;
}
/* Gesichter, die ein neues Deck für diese Position nicht tragen soll: das
   übrige Team und wer zuletzt auf ihr gegangen ist (c.gone, gesetzt von
   vacateForSearch). Sonst stünde die eben ersetzte Person mit neuem Namen
   wieder auf der Shortlist. */
export function avoidFaces(c, seat: string): string[] {
  return [...["ceo", "cfo", "r3"].map((k) => faceOf(c, k)), c.gone?.[seat]].filter(Boolean);
}


/* Eine Kandidatenkarte. Die gezeigten Kompetenzen streuen um den Archetyp,
   die wahren um die gezeigten — so weit, wie die Assessment-Bandbreite
   reicht. Mit der Verpflichtung steht das wahre Profil auf der Karte.   */
interface ManagerArch { key: string; n: string[]; p: number[]; span: number; note: string; dev?: boolean; poach?: number }
function managerCard(rng: Rng, seat, a: ManagerArch, sector?: string): ManagerCard {
  const g: "f" | "m" = rng.rnd() < 0.5 ? "f" : "m";
  const pool = Object.entries(MANAGER_TRAITS).filter(([, t]) => !t.seat || t.seat === seat);
  let r = rng.rnd() * pool.reduce((sum, [, t]) => sum + t.w, 0);
  const trait = (pool.find(([, t]) => (r -= t.w) < 0) || pool[0])[0];
  const lift = trait === "flight" ? 0.3 : 0;
  const shownProf = a.p.map((v) => Math.round(clamp(v + (rng.rnd() * 2 - 1) * 0.3 + lift, 1, 5) * 10) / 10);
  const prof = shownProf.map((v) => clamp(v + (rng.rnd() * 2 - 1) * a.span, 1, 5));
  const mean = (xs) => xs.reduce((x, y) => x + y, 0) / xs.length;
  /* Wunschalter im Bereich des Porträt-Pools (30–44): Step-up jung, Branchen-
     Insider am oberen Ende. Bis 21.10.2026 reichte es bis 62 — dafür gibt es
     keine Gesichter, und die ältesten drei hätten fast jede Karte getragen. */
  const age = a.key === "stepup" ? 30 + Math.floor(rng.rnd() * 6)
    : a.key === "insider" ? 40 + Math.floor(rng.rnd() * 5) : 33 + Math.floor(rng.rnd() * 12);
  const origin = a.key === "serial" ? (rng.rnd() < 0.7 ? "Private Equity" : "Konzern") : rng.pick(ORIGINS.slice(0, 4));
  const poach = (a.poach || 1) * (trait === "flight" ? 2 : trait === "bind" ? 0.5 : 1);
  const side = rng.rnd() < 0.5 ? "hell" : "dunkel";
  // Dieselbe Reihenfolge der Zufallszahlen wie vorher: Name, dann Porträt
  const name = rng.pick(FIRST[g]) + " " + rng.pick(LAST);
  const pic = rng.rnd();
  const portrait = pickPortrait(g, age, pic, seat, sector, side);
  return {
    label: a.n[g === "f" ? 1 : 0], arch: a.key,
    name, g, age: portrait.age, origin, pic: Math.floor(pic * 16), portrait: portrait.id,
    shown: Math.round(mean(shownProf) * 10) / 10, span: a.span, shownProf,
    skill: mean(prof), prof, dev: !!a.dev, poach, trait, side, note: a.note,
  };
}

/* Die Shortlist als Deck: alle drei Spezialisten der Position — damit liegt
   immer mindestens ein Profil für den größten Bedarf des Cases auf dem
   Tisch —, dazu zwei aus Branchen-Insider, Serial PE und Step-up. Serial PE
   ist die seltene Karte. Reihenfolge gemischt.                            */
export function makeCandidates(rng: Rng, seat = "cfo", compat: EngineCompat = {}, sector?: string, avoid: string[] = []): ManagerCard[] {
  if (compat.legacyCandidates) return legacyCandidates(rng);
  const A = MANAGER_ARCHES[seat] || MANAGER_ARCHES.cfo;
  const spec = A.slice(0, 3);
  const pick = [...spec];
  const rest = [A[3], A[5]];
  if (rng.rnd() < 0.4) pick.push(A[4], rng.pick(rest));
  else pick.push(...rest);
  for (let i = pick.length - 1; i > 0; i--) {
    const j = Math.floor(rng.rnd() * (i + 1));
    [pick[i], pick[j]] = [pick[j], pick[i]];
  }
  // Der Sektor wählt nur die Porträts der Fachfunktion, er zieht keine Zufallszahl
  const cards = pick.map((a) => managerCard(rng, seat, a, sector));
  /* Ein Gesicht je Deck: Trägt eine Karte ein Porträt, das schon im Deck
     liegt, bekommt sie das freie mit dem nächsten Alter. Die Fachfunktion
     hat nur vier Gesichter je Geschlecht, ohne das läge dieselbe Person mit
     zwei Namen nebeneinander. Ohne Zufallszahl, die Folge bleibt gleich.
     `avoid` (avoidFaces) ist von vornherein vergeben. */
  const used = new Set<string>(avoid), banned = new Set<string>(avoid);
  for (const k of cards) {
    if (used.has(k.portrait!)) {
      const pool = portraitPool(k.g, seat, sector, k.side);
      const near = (xs: [string, number][]) =>
        xs.sort((a, b) => Math.abs(a[1] - k.age!) - Math.abs(b[1] - k.age!) || (a[0] < b[0] ? -1 : 1))[0];
      // Reicht der Pool nicht, lieber ein Gesicht zweimal im Deck als eines aus `avoid`
      const alt = near(pool.filter(([id]) => !used.has(id))) || near(pool.filter(([id]) => !banned.has(id)));
      if (alt) { k.portrait = alt[0]; k.age = alt[1]; }
    }
    used.add(k.portrait!);
  }
  return cards;
}

/* Aus einer Kandidatenkarte wird ein Amtsinhaber. Eine Stelle für alle
   Wege — Mehrspieler, Übungsmodus, Erklärmodus, KI-Fonds —, damit keiner ein
   Feld vergisst. Karten der alten Shortlist tragen kein Profil und werden
   wie bisher zu einem Rating.                                             */
export function seatFromCand(cand, q?: number) {
  const base = { skill: cand.skill, dev: !!cand.dev, poach: cand.poach ?? 1 };
  if (!cand.prof) return base;
  return {
    ...base, prof: [...cand.prof], shownProf: [...(cand.shownProf || cand.prof)],
    arch: cand.arch, label: cand.label, name: cand.name, g: cand.g, age: cand.age, origin: cand.origin,
    pic: cand.pic, portrait: cand.portrait, trait: cand.trait, side: cand.side, ...(cand.trait === "coinvest" ? { payF: 0.9 } : {}),
    // Halbjahr der Verpflichtung, wie runQuarter es zählt
    ...(q != null ? { hiredQ: q } : {}),
  };
}
/* Seltenheit nach Assessment-Score, in derselben Rahmensprache wie die
   Zielunternehmen: Bronze unter 2,5, Silber bis 3,5, darüber Gold. Gold
   trägt den seltenen Glanz; eine vierte Stufe (Legende ab 4,5) gab es bis
   zum 21.10.2026. */
export const TIERS = { bronze: "Bronze", silber: "Silber", gold: "Gold" };
export const tierOf = (score: number) => (score < 2.5 ? "bronze" : score < 3.5 ? "silber" : "gold");

/* Wie ein KI-Fonds aus dem Deck draftet: Nähe des Assessment-Scores zu
   seinem Anspruch (teurer als nötig ist auch schlecht) plus die Kompetenz,
   auf die sein Stil setzt — der operative Fonds die Kostenseite, der
   Leverage-Fonds Cash und Integration, der Origination-Fonds das Wachstum.
   Gerechnet auf dem gezeigten Profil: Die KI sieht nicht mehr als der
   Spieler. Ohne Deck hätte die Kohorte nie eine Spezialistin im Team und
   fiele zurück, sobald Profile laufend wirken. Mit Beteiligung achtet die
   KI auch auf die Chemie: Eine Karte, die das Team eingespielt macht, zählt
   mehr, eine, die Reibung bringt, weniger.                               */
const BOT_PREF: Record<string, Record<string, number>> = {
  ops: { ceo: 0, cfo: 0, r3: 0 }, fin: { ceo: 2, cfo: 1, r3: 2 },
  sourcing: { ceo: 1, cfo: 0, r3: 1 }, all: { ceo: 2, cfo: 0, r3: 0 },
};
export function botDraft(rng: Rng, key: string, seat: string, amb: number, c?) {
  const pref = (BOT_PREF[key] || BOT_PREF.all)[seat] ?? 0;
  const chem = (k: ManagerCard) => (c ? 1.2 * chemOf({ ...c, [seat]: { skill: k.shown, side: k.side } }) : 0);
  const score = (k: ManagerCard) => 0.6 * (k.shownProf ? k.shownProf[pref] : k.shown) - Math.abs(k.shown - amb) * 0.5 + 0.2 * k.shown + chem(k);
  return makeCandidates(rng, seat, {}, c?.sector, c ? avoidFaces(c, seat) : []).reduce((best, k) => (score(k) > score(best) ? k : best));
}
/* Ersatz suchen: Die bisherige Person geht mit dem Suchmandat. Gibt die
   Abfindung zurück (zwölf Monatsgehälter) und lässt die Position vakant; bis
   zur Verpflichtung rechnet sie mit einem Interim. Eine vakante Position
   kostet nichts. Mutiert `c`, wie die Auswertung es mit Beteiligungen tut;
   der Übungsmodus übergibt eine Kopie.                                    */
export function vacateForSearch(c, seat) {
  if (!(c[seat] && c[seat].skill > 0)) return 0;
  const sev = severanceOf(seat, c[seat].skill, ebitdaOf(c));
  // Das Gesicht geht mit: Das neue Deck für diese Position trägt es nicht (avoidFaces)
  const face = faceOf(c, seat);
  if (face) c.gone = { ...(c.gone || {}), [seat]: face };
  c[seat] = { skill: 0 };
  return sev;
}
/* ---------- Team-Score ----------
   Eine Zahl für das Top-Team auf der Skala des Assessments: Wie gut passt
   die Führung zu diesem Case, und wird sie mit einem Wechsel besser oder
   schlechter? Je Position die drei Kompetenzen, gewichtet mit dem Bedarf des
   Cases (fitOf, dieselbe Eignung wie im Maßnahmenpicker); die Fachpositionen
   gedeckelt durch Leadership + 1,5, eine Vakanz als Interim auf
   MGMT_INTERIM, dazu die Chemie. Das Team ist der Durchschnitt der drei
   Positionen. So steigt die Zahl auch, wenn eine passende Spezialistin einen
   gleich teuren Generalisten ersetzt — der Assessment-Score allein sähe
   keinen Unterschied. Reine Anzeige, die Rechnung bleibt bei effSkill und
   mgmtFx.                                                                 */
export function teamScoreOf(c) {
  if (!c || !c.ceo) return 0;
  const chem = chemOf(c);
  const val = (k, i) => (c[k] && c[k].skill > 0 ? compOf(c[k], i) + chem : MGMT_INTERIM);
  const cap = val("ceo", 2) + 1.5;
  const f = (id) => fitOf(id, c);
  const W = {
    ceo: [Math.max(f("opex"), f("nwc"), f("erp")), Math.max(f("pen"), f("exp")), 1],
    cfo: [f("opex"), f("nwc"), Math.max(f("erp"), f("ai"))],
    r3: [f("pen"), f("exp"), 1],
  };
  const seat = (k) => {
    let num = 0, den = 0;
    for (let i = 0; i < 3; i++) {
      const v = k === "ceo" ? val(k, i) : Math.min(val(k, i), cap);
      num += W[k][i] * v; den += W[k][i];
    }
    return num / den;
  };
  return (seat("ceo") + seat("cfo") + seat("r3")) / 3;
}
// Für Meldungen: "Team-Score 2,8 → 3,3"
export const teamMove = (a: number, b: number) => `Team-Score ${a.toFixed(1).replace(".", ",")} → ${b.toFixed(1).replace(".", ",")}`;

// Einarbeitung nach der Verpflichtung: Day-1-ready braucht keine
/* Die Kandidatin hinter einer Hire-Entscheidung. Plätze 0 bis 2 tragen ihre
   alten Namen (veteran, aplayer, development), ab Platz 3 heißen sie c3, c4.
   Auswertung und Ansicht lesen dieselbe Zuordnung. */
export function candOfChoice(item, choice) {
  const idx = choice === "veteran" ? 0 : choice === "aplayer" ? 1 : choice === "development" ? 2
    : /^c[0-9]$/.test(String(choice)) ? Number(String(choice).slice(1)) : -1;
  return idx >= 0 ? item.candidates[idx] ?? null : null;
}
export const onboardOf = (cand) => (cand && cand.trait === "day1" ? 0 : 1);
// Starkes Netzwerk: Search-Mandate dieser Beteiligung liefern ein Halbjahr schneller
export const searchLagOf = (c) => (["ceo", "cfo", "r3"].some((k) => c[k] && c[k].skill > 0 && c[k].trait === "network") ? 0 : 1);

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
export function makeOffers(rng: Rng, c, market, funds: { name: string; cash: number; holdings: unknown[] }[], neg, q) {
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

/* Preis des Trophy Assets, wenn es in den Dealflow kommt. Steht als eigene
   Funktion, weil die Ankündigung (LM_ANNOUNCE) mit demselben Preis die Größe
   festlegt, die der Teaser zeigt — sonst stünde dort ein anderer Umsatz als
   zwei Halbjahre später auf der Deal-Karte.                                */
export const landmarkAsk = (lm, market: Record<string, number>) =>
  clamp(market[lm.sector] * (0.7 + 0.006 * lm.quality) * 1.06, 5, 19);
/* Das Trophy Asset bleibt das größte Ziel der Partie, aber auch es muss in
   ein Viertel des Fonds passen. Gekappt wird bei der Ankündigung zum dann
   gültigen Preis; bis zum Markteintritt bewegt sich das Multiple nur noch
   zwei Halbjahre. Mit dem Rohumsatz aus newLandmark (180–290 Mio. €) läge das
   Ticket im neutralen Markt im Median bei rund 365 Mio. € — ein einziger Deal
   und der Fonds wäre praktisch voll.                                       */
export const announceLandmark = (lm, market: Record<string, number>) =>
  fitTicket({ ...lm, askMult: landmarkAsk(lm, market) });

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
  /* Aufschlag je Prozentpunkt Umsatz-CAGR über dem Sektor. Von 0,050 auf 0,070
     angehoben und die Obergrenze von 0,45 auf 0,55: Der Multiple-Kanal trug in
     der Messung nur 11 % des abgerufenen Kapitals bei, weil die Prämie im Median
     bei exakt 0,000 lag -- ein Betrieb, der mit seinem Sektor wächst, bekam gar
     nichts. Der Boden bleibt bei -0,20, damit Unterperformance nicht härter
     bestraft wird als zuvor. */
  return clamp(cagrPrem(c) * 0.070, -0.20, 0.55);
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

/* Sponsor-erfahrene CEOs und CFOs kennen den Verkaufsprozess von der anderen
   Seite: Equity Story, Management-Präsentation, Vendor Due Diligence. Das
   wirkt im Exit wie anderthalb Punkte Verhandlungsgeschick mehr.          */
export const sponsorNegOf = (c) =>
  (c && ((c.ceo && c.ceo.skill > 0 && c.ceo.trait === "sponsor") || (c.cfo && c.cfo.skill > 0 && c.cfo.trait === "sponsor")) ? 1.5 : 0);
export function dealMultiple(c, market, neg, q?) {
  return Math.max(2, markMultiple(c, market) * (1 + 0.02 * (neg + sponsorNegOf(c))) - endPressure(q));
}
export const evOf = (c, mult) => ebitdaOf(c) * mult;
export const eqvOf = (c, mult) => (evOf(c, mult) - c.netDebt) * (c.st ?? 1);

export const navValueOf = (c, market) => Math.max(0, eqvOf(c, markMultiple(c, market)));
export const fairOf = (c, market, neg, q?) => Math.max(0, eqvOf(c, dealMultiple(c, market, neg, q)));

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
     Investoren zurückfließt und wie viel im Fonds bleibt. Einbehalten geht über
     die ganze Laufzeit, kumuliert höchstens bis zur Höhe des Commitments;
     danach wird zwingend voll ausgeschüttet.
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
  /* Die Reserve ist der Barbetrag künftiger Gebühren, unabhängig davon, aus
     welchem Topf sie bezahlt werden. Bis zum 11.09.2026 stand hier
     `res − f.recyc`: Einbehaltene Erlöse senkten die Reserve, obwohl
     investableOf() sie zugleich als verfügbares Kapital dazuzählt. Derselbe
     Euro war damit zweimal da — das investierbare Kapital lag um genau die
     einbehaltenen Erlöse zu hoch, und ein Fonds, der recycelt hatte, konnte
     mehr zusagen, als er je aufbringen konnte.                              */
  return Math.max(0, res);
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
export function spendFund(f, amt, quarter, accrue?) {
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

/* ---------- Kapitalzuführung in eine Beteiligung ----------
   Der Gegenweg zur Ausschüttung: Der Fonds ruft Kapital ab und gibt es in eine
   Beteiligung. Zwei Anlässe, beide aus der Praxis:

   - Equity Cure. Steht der Leverage über dem Covenant, heilt frisches
     Eigenkapital den Bruch, bevor die Kreditgeber vollstrecken. Ohne diese
     Möglichkeit war der einzige Ausweg aus einem Bruch der Notverkauf — eine
     Wahl, die es in einem Kreditvertrag so nicht gibt.
   - Eigenkapitalanteil an einem Zukauf. Trägt die Plattform die
     Akquisitionsschuld nicht mehr, finanziert der Sponsor den Zukauf teilweise
     selbst (`toDebt: false` — das Geld fließt unmittelbar an den Verkäufer und
     senkt die Nettoverschuldung deshalb nicht).

   In beiden Fällen steigt die Kostenbasis des Deals um genau den Betrag. Eine
   Zuführung schafft damit keinen Wert: Sie verschiebt Geld vom Fonds in die
   Beteiligung, und der MOIC misst danach gegen einen höheren Einstand. Genau
   deshalb zählt sie auch in der Value Bridge nicht als Entschuldung (siehe
   makeBridge/bridgeStep) — sie ist Kapital, nicht Leistung.                 */
/* Eigenkapital in eine Beteiligung. `amt` ist der Betrag, der BEI DER
   BETEILIGUNG ankommt; der Fonds trägt davon seinen Anteil, die
   Mitgesellschafter den Rest — eine Kapitalerhöhung pro rata.

   Solange der Fonds allein hält (st = 1, der Normalfall), ist das dieselbe
   Zahl wie vorher. Nach einem Teilexit war es das nicht: Bis zum 18.09.2026
   zahlte der Fonds den ganzen Betrag, die gesenkte Verschuldung kam aber allen
   Gesellschaftern zugute. Wer nach einem Börsengang (40 % platziert) 10 Mio. €
   nachschoss, verschenkte 4 Mio. € an die Publikumsaktionäre; nach einem
   Continuation Vehicle (60 % platziert) 6 Mio. € an dessen Erwerber. Gemessen
   war die Lücke auf den Cent genau `Betrag × (1 − Anteil)`, und sie stand in
   keiner Zeile: Die Fondsaufstellung buchte sie als Restposten unter
   "Transaktionskosten", weil abgerufenes Kapital und NAV auseinanderliefen.

   Zurückgegeben wird, was der Fonds tatsächlich aufgebracht hat.           */
export function fundEquityIn(f, c, amt: number, quarter: number, opts: { toDebt?: boolean } = {}) {
  if (!(amt > 0)) return 0;
  const st = c.st ?? 1;
  const ausFonds = amt * st;                     // der Anteil des Fonds
  if (!(ausFonds > 0)) return 0;
  if (!spendFund(f, ausFonds, quarter, undefined)) return 0;
  if (opts.toDebt !== false) c.netDebt -= amt;
  /* `equityIn` ist eine Größe der Beteiligung und trägt deshalb den vollen
     Betrag — die Value Bridge skaliert ihn mit dem Anteil (siehe bridgeStep).
     Kostenbasis und investiertes Kapital sind Größen des Fonds und tragen
     seinen Anteil.

     Reihenfolge zählt: costLeft fällt ersatzweise auf entryEquity zurück, das
     hier gerade selbst erhöht wird — der Rückfallwert muss der alte sein.   */
  const costLeft0 = c.costLeft ?? c.entryEquity ?? 0;
  c.equityIn = (c.equityIn || 0) + amt;
  /* Was der FONDS beigesteuert hat, kumuliert. Die Kette braucht diese Zahl
     getrennt: Sie kann den Anteil nicht aus dem Periodenende zurückrechnen,
     wenn im selben Halbjahr auch ein Teilexit lag — dann stünde die Zuführung
     mit dem Anteil NACH dem Teilexit in der Zerlegung, während der Fonds sie
     mit dem Anteil DAVOR bezahlt hat. Gemessen fehlten so 4 von 10 Mio. €. */
  c.equityInFund = (c.equityInFund || 0) + ausFonds;
  c.entryEquity = (c.entryEquity || 0) + ausFonds;
  c.costTotal = (c.costTotal || 0) + ausFonds;
  c.costLeft = costLeft0 + ausFonds;
  f.investedTotal = (f.investedTotal || 0) + ausFonds;
  bookOff(c, "inj", -amt);
  return ausFonds;
}

/* Wie viel eines Exiterlöses überhaupt einbehalten werden darf: kumuliert
   höchstens bis zur Höhe des Commitments, darüber hinaus wird zwingend voll
   ausgeschüttet.

   Bis zum 18.10.2026 galt zusätzlich, dass nur innerhalb der
   Investitionsperiode (bis Halbjahr INVEST_PERIOD) einbehalten werden durfte.
   Die Grenze ist gefallen: Wer spät verkauft, soll den Erlös ebenso in einen
   Zukauf oder einen neuen Deal stecken können. Die Wiederholung alter
   Halbjahre rechnet über compat.legacyRecycleInvestPeriod nach der alten
   Regel.                                                                    */
export function recycleRoom(f, net, quarter, compat: EngineCompat = {}) {
  if (compat.legacyRecycleInvestPeriod && quarter > INVEST_PERIOD) return 0;
  return Math.min(net, Math.max(0, CAPITAL * RECYCLE_CAP - (f.recycled || 0)));
}

/* Verwendung eines Erlöses. `keep` ist die Entscheidung des GP in Prozent des
   Erlöses — Einbehalten bringt TVPI (mehr Kapital arbeitet je abgerufenem Euro)
   und kostet IRR (der Rückfluss an die Investoren verschiebt sich). Fehlt die
   Angabe, wird voll ausgeschüttet: das ist die Vorgabe, nicht der Automatismus
   von vorher.                                                                 */
export function applyProceeds(f, net, costBasis, quarter, keep = 0, compat: EngineCompat = {}) {
  if (!(net > 0)) return;
  f.proceeds = (f.proceeds || 0) + net;
  const rec = Math.min(recycleRoom(f, net, quarter, compat), net * clamp(keep, 0, 1));
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
  if (!(gain > 0)) return 0;
  const pref = (f.calls || []).reduce(
    (s, c) => s + c.amt * (Math.pow(1 + HURDLE, Math.max(0, quarter - c.q) / 2) - 1), 0);
  /* Catch-up statt Sprungstelle. Bis zum 11.09.2026 stand hier
     `gain > pref ? CARRY * gain : 0` — ein Fonds, der die Hurdle um einen Euro
     überschritt, verlor schlagartig 20 % seines gesamten Gewinns an den GP.
     Der Wert in der Hand der Investoren fiel damit über der Hurdle unter den
     eines Fonds knapp darunter: Ein Fonds IN Carry konnte einen niedrigeren
     Netto-TVPI haben als einer ohne. Das ist kein Wasserfall, das ist eine
     Klippe.

     Der übliche europäische Wasserfall mit 100 % Catch-up kennt die Klippe
     nicht. Er hat drei Stufen:
       gain <= pref                       kein Carry — die Investoren haben die
                                          Vorzugsrendite noch nicht verdient;
       pref < gain < pref / (1 - CARRY)   Catch-up — jeder weitere Euro geht an
                                          den GP, bis er auf seinen Anteil am
                                          Gesamtgewinn aufgeschlossen hat;
       gain >= pref / (1 - CARRY)         Carry auf den vollen Gewinn.
     Genau das ist min(gain − pref, CARRY · gain): stetig, monoton, und der
     Netto-TVPI steigt nie, wenn der Bruttogewinn fällt. */
  return clamp(gain - pref, 0, CARRY * gain);
}
export function tvpiOf(f, market, quarter) {
  return (totalValueOf(f, market) - carryOf(f, market, quarter)) / drawnOf(f);
}
/* TVCC (Total Value to Committed Capital): derselbe Wert nach Carry wie im
   TVPI, aber je zugesagtem statt je abgerufenem Euro. Der Unterschied ist
   Kapital, das nie abgerufen wurde: Der TVPI sieht es nicht, der TVCC zählt
   es als ungenutzte Zusage. Ein Fonds, der ein Drittel seines Commitments in
   einen guten Deal steckt und den Rest liegen lässt, hat einen glänzenden
   TVPI und einen mäßigen TVCC — und für die Investoren, die das ganze
   Commitment vorgehalten haben, ist der TVCC die ehrlichere Zahl. Auch
   Recycling verbessert den TVCC nur über den Wert, den das wieder eingesetzte
   Geld schafft, nicht über einen kleineren Nenner.                         */
export function tvccOf(f, market, quarter) {
  return (totalValueOf(f, market) - carryOf(f, market, quarter)) / CAPITAL;
}
// DPI: was tatsächlich an die Investoren zurückgeflossen ist, je abgerufenem Euro
export function dpiOf(f, market, quarter) {
  const tv = totalValueOf(f, market);
  const drag = tv > 0 ? carryOf(f, market, quarter) / tv : 0;
  return ((f.distTotal || 0) * (1 - drag)) / drawnOf(f);
}

/* ---------- IRR ----------
   Ja, die Reihe mischt Realisiertes und Unrealisiertes — und zwar mit Absicht.
   Sie ist der Since-Inception-Netto-IRR, wie ihn jedes LP-Reporting ausweist:
   tatsächliche Abrufe und tatsächliche Ausschüttungen bis zum Stichtag, und
   der verbleibende NAV als fiktive Schlusszahlung zum Stichtag. Solange der
   Fonds läuft, gibt es keine andere Möglichkeit, ihn zu messen; erst nach der
   Liquidation (Halbjahr 20, alle Beteiligungen verwertet) ist der NAV null und
   der IRR vollständig realisiert. Die Endwertung einer Partie steht also auf
   einer reinen Zahlungsreihe, die Zwischenstände nicht.

   Was daraus folgt und in der Ansicht steht: Ein hoher Zwischen-IRR bei
   niedrigem DPI ist eine Bewertung, keine Rendite. Die Trennung leisten DPI
   (nur Ausschüttungen) und RVPI (nur NAV) — beide je abgerufenem Euro, beide
   neben dem TVPI ausgewiesen.

   Zahlungsreihe aus Sicht der Investoren: Abrufe negativ zum Zeitpunkt des
   Abrufs, Ausschüttungen positiv, der verbleibende NAV plus nicht reinvestierte
   Liquidität als Schlusszahlung zum Stichtag. Je Halbjahr saldiert, wie es auch
   ein Reporting täte: Ein Kapitalabruf und eine Ausschüttung im selben Halbjahr
   sind für den Investor eine Zahlung, nicht zwei.                             */
export function cashflowsOf(f, market, quarter) {
  const drag = 1 - carryDrag(f, market, quarter);
  const byQ = new Map<number, number>();
  const add = (q: number, v: number) => byQ.set(q, (byQ.get(q) || 0) + v);
  (f.calls || []).forEach((c) => add(c.q, -c.amt));
  (f.dists || []).forEach((d) => add(d.q, d.amt * drag));
  const terminal = (navOf(f, market) + (f.recyc || 0)) * drag;
  if (terminal > 0) add(quarter, terminal);
  /* Ein Halbjahr, in dem sich Abruf und Ausschüttung genau aufheben, ist keine
     Zahlung und gehört nicht in die Reihe — sonst bestünde die Reihe eines
     Fonds, der genau sein Kapital zurückbekommen hat, aus einer einzigen Null,
     und die Nullstellensuche fände nirgends einen Vorzeichenwechsel. */
  return [...byQ.entries()]
    .filter(([, v]) => Math.abs(v) > 1e-9)
    .sort((a, b) => a[0] - b[0])
    .map(([q, v]) => ({ t: q / 2, v }));
}
export function carryDrag(f, market, quarter) {
  const tv = totalValueOf(f, market);
  return tv > 0 ? Math.min(0.5, carryOf(f, market, quarter) / tv) : 0;
}

export const IRR_FLOOR = -0.95, IRR_CAP = 3.0;
const IRR_SCAN_STEPS = 240;

/* Die Nullstelle wird von oben gesucht, nicht von unten. Der Grund ist der
   Zahlungsverlauf eines Fonds: Abrufe und Ausschüttungen wechseln sich über
   zehn Jahre ab, die Reihe hat also mehrere Vorzeichenwechsel und damit
   mehrere mathematische Nullstellen. Nur eine davon ist die Rendite, die ein
   Investor meint — die obere.

   Vorher stand hier eine Bisektion mit der Abkürzung "npv(−0,95) < 0, also
   liegt der Zins am Boden". Diese Abkürzung setzt voraus, dass der Barwert mit
   steigendem Zins fällt. Nahe −100 % gilt das Gegenteil: Der Diskontfaktor
   1/(1+r)^t explodiert, und der Barwert wird allein vom Vorzeichen der
   SPÄTESTEN Zahlung bestimmt. Eine Management Fee im letzten Halbjahr, auf die
   keine Ausschüttung mehr folgt, genügte deshalb, um einen Fonds mit 1,44×
   Rückfluss auf −95 % IRR zu setzen — in Testpartien traf das jeden siebten
   Fonds, und über scoreOf() kostete es je einen halben Wertungspunkt.

   Es gilt npv(0) = drawn · (TVPI − 1). Ein Fonds über 1,00× hat damit zwingend
   einen positiven IRR, einer darunter einen negativen; der Test hält das fest. */
export function irrOf(f, market, quarter) {
  const cf = cashflowsOf(f, market, quarter);
  /* Ohne jede Zahlung und im ersten Halbjahr gibt es keine Rendite. Eine
     einzelne Zahlung ist dagegen sehr wohl eine Aussage: Ein Fonds, der
     abgerufen und nie etwas zurückgezahlt hat, steht am Boden und nicht bei
     null — vorher lieferte genau dieser Fall 0 % und damit einen Totalverlust
     als Nullrendite. */
  if (!cf.length || quarter < 2) return 0;
  const npv = (r) => cf.reduce((s, p) => s + p.v / Math.pow(1 + r, p.t), 0);
  if (npv(IRR_CAP) > 0) return IRR_CAP;

  const step = (IRR_CAP - IRR_FLOOR) / IRR_SCAN_STEPS;
  let hi = IRR_CAP;
  for (let i = 1; i <= IRR_SCAN_STEPS; i++) {
    const r = IRR_CAP - i * step;
    if (npv(r) > 0) {
      // Vorzeichenwechsel gefunden: [r, hi] klammert die oberste Nullstelle
      let lo = r;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (npv(mid) > 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    hi = r;
  }
  // Nirgends im Suchbereich positiv: Totalverlust, der Boden ist die Aussage
  return IRR_FLOOR;
}

/* ---------- Wertung ----------
   Je zur Hälfte Multiple und Verzinsung, beide gegen die Marke eines guten
   Buyout-Fonds normiert: 1,6x TVCC und 18 % IRR ergeben je 1,00 Punkt.

   Seit dem 18.10.2026 zählt als Multiple der TVCC (tvccOf), nicht mehr der
   TVPI. Der TVPI belohnte, Kapital gar nicht erst abzurufen: Wer wenig
   investierte und damit gut lag, stand vor einem Fonds, der sein ganzes
   Commitment ordentlich eingesetzt hat. Der TVPI wird weiter angezeigt, geht
   aber nicht mehr in die Wertung ein. Die Geschichte der Marken unten
   bezieht sich bis zur dritten Fassung auf den TVPI.

   Die Marken sind an der Engine gemessen, nicht aus der Praxis übernommen,
   und werden nach zwei Bedingungen gesetzt:
     1. Die Wertung 1,00 soll das obere Viertel der Kohorte treffen -- das ist
        die Aussage "1,00 = Benchmarkniveau".
     2. Die beiden Marken müssen denselben Fonds beschreiben. Der Median-IRR
        der Fonds, die um die Multiple-Marke herum liegen, muss also IRR_BENCH sein;
        sonst verlangt eine Hälfte der Wertung etwas anderes als die andere.

   Erste Fassung 2,0x und 15 %: verfehlte beide Bedingungen. Keiner von 600
   Fonds erreichte die 2,0x, der Median der Wertung lag bei 0,57, und die
   beiden Marken passten auch rechnerisch nicht zueinander.

   Zweite Fassung 1,5x und 14 %: gemessen auf der damaligen Renditekurve.

   Dritte Fassung, hier, nach der Anhebung des Wachstumsniveaus (Sektorraten
   +1 pp, ACC_GROWTH_PP 1,5 -> 1,7): Dieselbe Messung über 120 Partien mit je
   fünf Fonds ergibt jetzt TVPI p25 1,11, Median 1,42, p75 1,69, und die Fonds
   um TVPI 1,7 herum erreichen einen Median-IRR von 18,8 %. Mit den alten
   Marken war die Wertung entsprechend nach oben verrutscht -- p75 stieg von
   1,15 auf 1,21, der Median von 0,76 auf 0,85. 1,7x und 18 % stellen beide
   Bedingungen wieder her: Wertung p25 0,41, Median 0,71, p75 1,00, p90 1,20.

   Zur Einordnung der absoluten Höhe: Die Messung läuft über eine
   nachgebildete Partie (ein menschlicher Fondsplatz nach festem Regelwerk,
   vier KI-Archetypen). Dieselbe Messung reproduziert die zweite Fassung mit
   p75 1,15 statt der damals notierten 1,01 -- der Zuschnitt des menschlichen
   Fondsplatzes verschiebt das Niveau also um gut einen Zehntelpunkt. Die
   Rangfolge und der Abstand der Quartile sind davon nicht betroffen, die
   absolute Lage der Marke trägt diese Unschärfe.

   Vierte Fassung, hier, mit dem Wechsel auf den TVCC: 240 Partien mit je
   fünf Fonds nach demselben Aufbau, unter der Regel, dass Recycling über die
   ganze Laufzeit geht. Die KI-Fonds rufen ihr Commitment fast vollständig ab
   (Median 98 %), TVCC und TVPI liegen deshalb nah beieinander: TVCC p25
   1,20, Median 1,47, p75 1,73. Der Median-IRR der Fonds um TVCC 1,6 liegt
   bei 17,5 % (um 1,65 bei 18,8 %), 1,6x passt damit zur IRR-Marke von 18 %.
   Die Wertung verteilt sich praktisch wie mit der dritten Fassung auf
   derselben Messung (p75 1,14 statt 1,12, Median 0,85 statt 0,84). Dass
   beide über den 1,00 der dritten Fassung liegen, ist die Unschärfe des
   nachgebildeten menschlichen Fondsplatzes, siehe oben; neu kalibriert ist
   hier nur die Multiple-Marke.

   Bewusst nicht nachgezogen: Die globale Rangliste liest die Wertung aus den
   gespeicherten Endständen abgeschlossener Partien (global_leaderboard.sql).
   Partien, die vor dieser Umstellung endeten, behalten deshalb ihre nach der
   alten Marke gerechnete Wertung und fallen gegenüber neuen Partien etwas
   niedriger aus. Das ist so entschieden, kein Versehen.

   Der Punkt der Zweiteilung: der Multiple allein belohnt Sitzenbleiben, IRR allein
   belohnt schnelles Drehen kleiner Deals. Erst zusammen bilden sie die
   Entscheidung ab, um die es in diesem Geschäft wirklich geht — wann verkauft
   man ein Asset, das noch weiterläuft.                                       */
export const TVCC_BENCH = 1.6, IRR_BENCH = 0.18;
export function scoreOf(f, market, quarter) {
  const t = tvccOf(f, market, quarter) / TVCC_BENCH;
  const i = irrOf(f, market, quarter) / IRR_BENCH;
  return 0.5 * clamp(t, -1, 4) + 0.5 * clamp(i, -1, 4);
}

/* ---------- Managementbeteiligung ----------
   Zwei Wirkungen, und beide hingen bisher an einem Schalter statt am Wert des
   Pakets.

   mepCut — das Sweet Equity am Rückfluss. Es galt nur beim Schlussverkauf
   durch den Spieler. Teilexit ins Continuation Vehicle, Börsengang,
   Restbeteiligung nach dem Lock-up, Cash Sweep, Tail-End-Verwertung und jeder
   Exit eines KI-Fonds gingen ohne Abzug durch — sechs von sieben Wegen, auf
   denen Geld an den Fonds zurückfließt. Für den Spieler war der MEP damit
   teurer als für die KI, und der Cash Sweep war der offene Weg, Wert am
   Management vorbeizuführen: erst ausschütten, dann verkaufen. Jeder Rückfluss
   läuft jetzt durch dieselbe Funktion.

   retentionFactor — die Bindungswirkung. Sie war ein pauschaler halber
   Risikofaktor, unabhängig davon, ob das Paket etwas wert ist. Das ist
   genau verkehrt herum: Ein MEP bindet, weil er im Geld steht. Wer auf einem
   Paket sitzt, das beim Exit ein Vielfaches bringt, lässt sich nicht abwerben;
   wer unter Einstand sitzt, hat nichts zu verlieren und geht eher als ohne
   MEP. Der Faktor läuft deshalb am Gesamtwert je Euro Einstand: 1,0× lässt es
   bei der Halbierung, ab gut 2,2× bindet der MEP praktisch vollständig,
   deutlich unter dem Einstand verpufft er.                                  */
export const mepCut = (c, amt: number) => amt * (c && c.ltip ? 1 - LTIP_SHARE : 1);
/* Nettoerlös eines Exits an den Fonds: erst die Transaktionskosten, dann das
   Sweet Equity. Jeder Exitweg benutzt diese eine Zeile. */
export const exitNetOf = (c, gross: number, feeRate: number) => mepCut(c, gross * (1 - feeRate));
export const MEP_RET_BASE = 0.5, MEP_RET_SLOPE = 0.35;
export const mepMoic = (c, market) =>
  (navValueOf(c, market) + (c.cashOut || 0)) / Math.max(0.01, c.costTotal || c.entryEquity || 0.01);
export function retentionFactor(c, market) {
  if (!c || !c.ltip) return 1;
  return clamp(MEP_RET_BASE - MEP_RET_SLOPE * (mepMoic(c, market) - 1), 0.08, 1);
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
        if (!se.waiting) shortlists.push({ uid: c.uid, name: c.name, seat: se.seat, cands: makeCandidates(rng, se.seat, compat, c.sector, avoidFaces(c, se.seat)) });
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
      /* Abschluss des Zukaufs: Jetzt wird die Akquisitionsschuld gezogen, und
         zwar in beiden Fällen. Scheitert die Integration, steht sie voll und
         das EBITDA kommt nicht — genau der Weg in den Covenant Breach, den
         die Karte ankündigt.

         `addDebt` fehlt in Beteiligungen, deren Zukauf vor dem 15.09.2026
         gestartet wurde: Dort steckt die Schuld bereits seit dem Start in
         netDebt, und sie darf hier nicht ein zweites Mal gebucht werden. */
      if (IN.addDebt) { c.netDebt += IN.addDebt; bookOff(c, "addon", IN.addDebt); }
      /* Gekauft wird EBITDA, geliefert wird im Modell Umsatz — die Umrechnung
         muss deshalb über die Marge laufen, mit der die Plattform das EBITDA
         tatsächlich verdient. Bis zum 11.09.2026 stand hier die Branchenmarge:
         Eine Plattform mit 22 % Ist-Marge und 15 % Branchenmarge bekam für
         denselben Kaufpreis rund die Hälfte mehr EBITDA, als sie bezahlt hatte
         — ein Gewinn aus einer Rechenkonvention, nicht aus dem Zukauf. Bei
         einer Plattform unter Branchenniveau lief es umgekehrt.            */
      const mgBase = compat.legacyAddonBenchMargin ? (c.benchMargin ?? 12) : c.margin;
      const addRev = IN.addEb / Math.max(4, mgBase) * 100;
      if (IN.ok) { c.revenue += addRev; c.acc = Math.min(5, c.acc + 1.0); }
      else {
        // Gescheiterte Integration: die Akquisitionsschuld steht voll, das EBITDA
        // kommt nicht an. Der klassische Weg in den Covenant Breach.
        c.revenue += addRev * 0.35; c.margin -= 1.8;
        c.marginDrift = (c.marginDrift || 0) - 1.0; c.quality -= 7;
      }
      /* Zukaufshistorie mitschreiben. Ein Add-on ist die einzige Maßnahme, die
         die Beteiligung dauerhaft umbaut. Ohne diese Zeile ließ sich nach
         der Integration nirgends mehr ablesen, wann zugekauft wurde und wie
         oft — `done` zählt nur die Kennung mit, nicht den Zeitpunkt.       */
      c.addons = [...(c.addons || []), { q, eb: IN.addEb, mult: IN.mult, ok: !!IN.ok }];
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
        const sunk = ebitdaOf(c) * (spec && spec.failCost != null ? spec.failCost : FAIL_SUNK) * (IN.failMult || 1);
        c.netDebt += sunk; bookOff(c, "restr", sunk);
        if (spec && spec.failMargin) c.marginDrift = (c.marginDrift || 0) + spec.failMargin;
      }
    }
    if (me) news.push({
      q, e: IN.ok ? "🛠️" : (spec && spec.cls === "rel" ? "➖" : "❌"),
      tone: IN.ok ? "pos" : "neg",
      t: IN.ma
        ? (IN.ok
          ? `<b>${c.name}</b>: Add-on abgeschlossen und integriert — ${eur(IN.addEb)} EBITDA zu ${x(IN.mult)} gekauft`
            + `${IN.addDebt ? `, ${eur(IN.addDebt)} Akquisitionsschuld gezogen` : ""}.`
            + ` Leverage jetzt ${x(c.netDebt / Math.max(0.5, ebitdaOf(c)))}, Bewertung der Plattform ${x(markMultiple(c, mk))}.`
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
    if (c[k].dev && c[k].skill < 4.5) {
      // Talentförderer im CEO-Sessel beschleunigen die Entwicklung der übrigen Positionen
      const step = 0.25 + (k !== "ceo" && c.ceo.skill > 0 && c.ceo.trait === "mentor" ? 0.1 : 0);
      c[k] = c[k].prof
        ? { ...c[k], prof: c[k].prof.map((v) => Math.min(4.5, v + step)) }
        : { ...c[k], skill: Math.min(4.5, c[k].skill + step) };
      if (c[k].prof) c[k].skill = c[k].prof.reduce((x, y) => x + y, 0) / 3;
    }
    if (rng.rnd() < POACH * c[k].skill * c[k].skill * (c[k].poach || 1) * retentionFactor(c, mk)) {
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
  const head = (c.covLimit ?? COV_DEFAULT) - lev;
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
export function makeBridge(c, gross, net, opts: { stake?: number; cost?: number; recap?: number } = {}) {
  /* Ohne Angaben beschreibt die Brücke den vollständigen Verkauf des noch
     gehaltenen Anteils. Ein Teilexit (Continuation Vehicle, Börsengang) gibt
     den verkauften Anteil und die dabei freigesetzte Kostenbasis mit — sonst
     ließe sich eine Zerlegung nur für den Schlussverkauf schreiben, und alles,
     was vorher realisiert wurde, fiele aus der Brücke heraus.               */
  const st = opts.stake ?? (c.st ?? 1);
  /* Rekapitalisierungen während der Halteperiode gehören in die Brücke — sonst
     zeigt sie beim Exit nur den letzten Erlös und unterschlägt jeden Euro, der
     vorher schon an den Fonds zurückgeflossen ist. Sie hängen an der Beteiligung
     als Ganzes und werden deshalb nur einmal gebucht, beim Schlussverkauf; ein
     Teilexit gibt recap: 0 mit.                                             */
  const recap = opts.recap ?? (c.recapOut || 0);
  const base = opts.cost ?? (c.costLeft ?? c.entryEquity);
  const exitMult = ebitdaOf(c) > 0 ? (gross / st + c.netDebt) / ebitdaOf(c) : c.entryMult;
  const bEbitda = (ebitdaOf(c) - c.entryEbitda) * c.entryMult * st;
  const bMult = ebitdaOf(c) * (exitMult - c.entryMult) * st;
  /* Nachgeschossenes Eigenkapital senkt die Nettoverschuldung, ist aber keine
     Entschuldung aus eigener Kraft — es steckt zugleich in der erhöhten
     Kostenbasis (`base`). Bliebe es in dieser Zeile, zeigte die Brücke jeden
     Equity Cure als Wertbeitrag und rechnete ihn über den höheren Einstand
     gleich wieder heraus: zweimal dieselbe Zahl, einmal als Leistung
     ausgewiesen, die keine war.                                            */
  const bDelev = (c.entryDebt - c.netDebt - (c.equityIn || 0)) * st;
  return {
    entry: base, ebitda: bEbitda, mult: bMult, delev: bDelev, dist: recap,
    cost: net - base - bEbitda - bMult - bDelev,
    exit: net + recap,
  };
}
/* Zerlegung über mehrere Perioden: die Kette der einzelnen Halbjahre statt
   einer Spanne von Einstieg bis heute.

   Der Unterschied ist nicht kosmetisch. Eine Spanne bewertet das gesamte
   EBITDA-Wachstum mit dem Einstiegsmultiple, eine Kette jedes Halbjahr mit dem
   Multiple, das zu Beginn dieses Halbjahres galt — Letzteres ist die übliche
   Mehrperiodenzerlegung, und nur sie hat die Eigenschaft, die man von einer
   Aufstellung erwartet: Die Halbjahre addieren sich auf die Gesamtperiode.
   Vorher rechnete die Fondsansicht ihre Halbjahresspalte als Differenz zweier
   Spannen (Basis: Einstiegsmultiple), die Beteiligungsansicht dagegen als
   echte Periode (Basis: Multiple des Vorhalbjahres) — bei einer einzigen
   Beteiligung hätten beide gleich sein müssen und waren es nicht.          */
export function bridgeChain(hist, last) {
  const pts = [...(hist || []), last].filter(Boolean);
  const out = { ebitda: 0, mult: 0, delev: 0, dist: 0, inj: 0, rest: 0, nav: 0, total: 0 };
  for (let i = 1; i < pts.length; i++) {
    const s = bridgeStep(pts[i - 1], pts[i]);
    if (!s) continue;
    out.ebitda += s.ebitda; out.mult += s.mult; out.delev += s.delev;
    out.dist += s.dist; out.inj += s.inj; out.rest += s.rest; out.nav += s.nav; out.total += s.total;
  }
  return out;
}

/* Der heutige Stand einer Beteiligung in der Form eines Periodenstands.
   Gebraucht, weil der zuletzt mitgeschriebene Eintrag dem tatsächlichen Wert
   um eine Periode hinterherhinkt: runQuarter schreibt ihn, bevor er selbst zur
   Historie zählt, und markMultiple() bezieht über growthPrem() eine
   Wachstumsprämie ein, die erst ab drei Einträgen greift. Beim Übergang von
   zwei auf drei Einträge springt das Multiple deshalb, ohne dass der
   gespeicherte Stand es sähe — in einer Testpartie um bis zu 29 %.

   Für die Aufstellung zählt der Wert, mit dem das Spiel tatsächlich rechnet
   (navOf, Exiterlöse, TVPI). Sonst liefe die Zerlegung gegen einen anderen
   Wert als die Summe, die sie erklären soll, und die Differenz verschwände
   still im Restposten.                                                      */
export function liveHist(c, market) {
  return {
    rev: c.revenue, eb: ebitdaOf(c), nd: c.netDebt, mg: c.margin, ql: c.quality,
    eq: navValueOf(c, market) + (c.cashOut || 0), mult: markMultiple(c, market),
    st: c.st ?? 1, out: c.cashOut || 0, ei: c.equityIn || 0, eiF: c.equityInFund || 0,
  };
}

/* ---------- Value Bridge zwischen zwei Periodenständen ----------
   Dieselbe Zerlegung wie makeBridge() beim Exit, nur zwischen zwei Einträgen
   der hist-Reihe statt zwischen Einstieg und Verkauf. Damit lässt sich sie für
   jeden Zeitraum einer Halteperiode bilden — das letzte Halbjahr ebenso wie
   die Zeit seit Einstieg:

     EBITDA       (EBITDA_neu − EBITDA_alt) × Multiple_alt × Anteil
     Multiple     EBITDA_neu × (Multiple_neu − Multiple_alt) × Anteil
     Entschuldung (Schulden_alt − Schulden_neu) × Anteil
     Ausschüttung was im Zeitraum bereits entnommen wurde
     Sonstiges    Restposten der Zerlegung (Anteilsänderungen, Zukäufe)

   Die fünf Summanden ergeben exakt `total`, die Veränderung des Gesamtwerts
   (hist.eq = NAV plus Entnahmen). Beteiligungen aus älteren Partien haben noch
   kein mult/st im Periodenstand — dort wird das Multiple aus dem gespeicherten
   Eigenkapitalwert zurückgerechnet, damit auch laufende Partien die Aufteilung
   sehen.                                                                     */
export function bridgeStep(prev, now) {
  if (!prev || !now) return null;
  const stP = prev.st ?? 1, stN = now.st ?? 1;
  const outP = prev.out ?? 0, outN = now.out ?? 0;
  /* Kapitalzuführung der Periode: kumuliert mitgeschrieben, hier differenziert.
     Zwei Größen, weil sie auseinanderfallen können — `inj` ist, was bei der
     Beteiligung ankam (und die Nettoverschuldung gesenkt hat), `injF` der
     Anteil, den der Fonds dafür aufgebracht hat. Beteiligungen aus Partien vor
     dem 18.09.2026 führen `eiF` nicht mit; dort bleibt es beim alten Ansatz,
     den Anteil des Periodenendes anzusetzen.                                */
  const inj = (now.ei ?? 0) - (prev.ei ?? 0);
  const injF = now.eiF != null || prev.eiF != null
    ? (now.eiF ?? 0) - (prev.eiF ?? 0)
    : inj * stN;
  // Nur der NAV-Teil trägt die Zerlegung; bereits ausgeschüttete
  // Rekapitalisierungen stehen als eigene Position daneben.
  const navP = prev.eq - outP, navN = now.eq - outN;
  const mP = prev.mult ?? (prev.eb > 0 ? (navP / (stP || 1) + prev.nd) / prev.eb : null);
  const mN = now.mult ?? (now.eb > 0 ? (navN / (stN || 1) + now.nd) / now.eb : null);
  if (mP == null || mN == null) return null;
  const ebitda = (now.eb - prev.eb) * mP * stN;
  const mult = now.eb * (mN - mP) * stN;
  // Wie in makeBridge: Zugeführtes Eigenkapital steht als eigener Posten und
  // nicht in der Entschuldung.
  const delev = (prev.nd - now.nd - inj) * stN;
  const dist = outN - outP;
  const nav = navN - navP;
  return { ebitda, mult, delev, dist, inj: injF,
    rest: nav - ebitda - mult - delev - injF, nav, total: nav + dist };
}

/* ---------- Value Bridge des Fonds ----------
   Drei Gruppen, die eine andere Frage beantworten als die Treiber einer
   einzelnen Beteiligung — nämlich die des Investors: Was ist schon Geld, was
   steht noch auf dem Papier, und was hat der Fonds gekostet?

     Realisiert     Was die verkauften Beteiligungen erwirtschaftet haben,
                    zerlegt in EBITDA, Multiple und Entschuldung, dazu die
                    Kapitalrückführungen aus der Halteperiode.
     Unrealisiert   Derselbe Schnitt für die Beteiligungen, die noch stehen —
                    gegen ihren anteilig fortgeschriebenen Einstiegswert.
     Kosten         Management Fee, Transaktionskosten, Carry. Jede Gebühr
                    steht hier und in keinem der beiden Blöcke darüber, damit
                    "Realisiert" und "Unrealisiert" reine Wertentwicklung
                    zeigen und vergleichbar bleiben.

   Zusammen ergeben sie den Gewinn, und der führt über

       gain = Gesamtwert − Carry − abgerufenes Kapital = drawn · (TVPI − 1)

   auf die Kennzahl, nach der gewertet wird.

   Bis zum 02.09.2026 war die Aufstellung anders geschnitten: EBITDA, Multiple
   und Entschuldung kamen ausschließlich aus verkauften Beteiligungen, während
   alles noch Gehaltene als ein einziger Posten danebenstand. Zwei Schnitte in
   einer Spalte, und keiner davon vollständig. Kapitalrückführungen aus
   Beteiligungen, die noch im Portfolio stehen, hatten dabei gar keinen Platz —
   sie fielen in den Restposten, obwohl sie längst als Geld beim Investor
   angekommen waren.

   `txCost` bleibt der Restposten: Gebühren beim Kauf und Verkauf, Due
   Diligence, die Managementbeteiligung, und was die Zerlegung sonst nicht
   erklärt (Zukäufe, Anteilsänderungen). Was die Summe nicht erklärt, steht
   damit sichtbar dort, statt still zu verschwinden.                        */
/* Die Gliederung der Aufstellung steht hier und nicht in der Ansicht: Die
   Ansicht klappt die Gruppen auf und zu und zeigt zugeklappt deren Summe —
   fehlte dort ein Posten, wäre die Summe still falsch. Die Beschriftungen
   bleiben in der Ansicht, die Zugehörigkeit steht hier.                    */
export const FUND_BRIDGE_GROUPS = [
  { key: "r", parts: ["rEbitda", "rMult", "rDelev", "rRest", "rExit", "recaps"] },
  { key: "u", parts: ["uEbitda", "uMult", "uDelev", "uRest"] },
  { key: "k", parts: ["fees", "txCost", "carry"] },
];
export const FUND_BRIDGE_PARTS = FUND_BRIDGE_GROUPS.flatMap((g) => g.parts);

/* Der unrealisierte Beitrag, den eine Realisierung aus dem Block nimmt.

   Ohne diese Zahl liest sich jeder Abgang in der Halbjahresspalte falsch. Die
   Spalte ist die Differenz zweier kumulierter Stände: Solange eine
   Beteiligung im Portfolio steht, trägt sie ihre Zerlegung im unrealisierten
   Block; verlässt sie es, verschwindet der Beitrag dort und taucht — als
   Spanne gerechnet — im realisierten Block wieder auf. Die Differenz weist
   dann eine Umgliederung als Wertentwicklung aus.

   Bei einer Beteiligung, die im Covenant Breach an die Kreditgeber ging, stand
   in der Spalte "Unrealisiert +78, davon Entschuldung +127" — im selben
   Halbjahr, in dem die Kreditgeber das Unternehmen übernahmen. Die Summe war
   richtig (der Verlust stand daneben unter "Realisiert"), die Zerlegung
   behauptete das Gegenteil dessen, was passiert war.

   Deshalb schreibt jede Realisierung ihre stehende Kette mit, und der
   realisierte Block übernimmt sie unverändert: Was im unrealisierten Block
   verschwindet, taucht im realisierten in derselben Zerlegung wieder auf, und
   die Differenz der beiden Stände ist null. Übrig bleibt `exit` — der Erlös
   gegen die letzte Bewertung, und das ist das Einzige, was in diesem Halbjahr
   tatsächlich neu ist.

   Vorher rechnete der realisierte Block als SPANNE (alles Wachstum zum
   Einstiegsmultiple), der unrealisierte als KETTE (jedes Halbjahr zu seinem
   eigenen Multiple). Beide beschrieben dieselbe Beteiligung mit
   unterschiedlichen Zahlen; die Differenz landete still im Restposten
   "Transaktionskosten". Bei der im Covenant Breach verlorenen Beteiligung
   waren das 56,6 von 90 Mio. € Verlust — eine Zahl, die nirgends hingehörte
   und in keiner Zeile stand.

   `soldShare` ist der Anteil der Beteiligung, den diese Realisierung betrifft:
   1 beim vollständigen Verkauf, der platzierte Anteil bei einem Teilexit. Ein
   Teilexit ist der Grund, warum die Zahl mitgeschrieben und nicht später
   gerechnet wird — die Beteiligung steht danach weiter im Portfolio, und ihre
   Kette trägt die vergangenen Perioden unverändert mit dem damaligen Anteil.
   Ohne die Mitschrift stünde der verkaufte Teil zweimal da: im realisierten
   Block und weiter im unrealisierten.                                      */
export function unrealizedOut(c, market, net = 0, soldShare = 1) {
  const ch = bridgeChain(c.hist || [], liveHist(c, market));
  /* Was frühere Teilexits derselben Beteiligung schon entnommen haben, steht
     an ihr als `uSold`. Die Kette rechnet jede vergangene Periode weiter mit
     dem Anteil, der damals galt — ein Teilexit macht die Vergangenheit nicht
     kleiner. Ohne diesen Abzug stünde der bereits platzierte Teil zweimal da,
     und beim späteren Vollverkauf ein drittes Mal.                         */
  const sold = c.uSold || {};
  const offen = {
    ebitda: ch.ebitda - (sold.ebitda || 0),
    mult: ch.mult - (sold.mult || 0),
    delev: ch.delev - (sold.delev || 0),
    rest: ch.rest - (sold.rest || 0),
  };
  /* Dieselbe Rechnung auf dem letzten Periodenstand (`uClose`, festgehalten
     beim Periodenschluss). Das ist genau der Betrag, mit dem die Beteiligung
     im unrealisierten Block stand, als die Halbjahresspalte ihren
     Ausgangsstand nahm — und damit der Betrag, der aus diesem Block
     herausgerechnet werden muss.

     Der Unterschied zu `offen` ist, was sich in DIESEM Halbjahr noch bewegt
     hat, bevor die Beteiligung das Portfolio verließ. Bis zum 18.09.2026 blieb
     das unter "Unrealisiert" stehen. Bei einer Beteiligung, die im Covenant
     Breach an die Kreditgeber ging, stand dort +14,9 — obwohl das Portfolio
     leer war. Gemessen über mehrere Startwerte reichte es von −6 bis +126.
     Was eine Beteiligung in ihrem letzten Halbjahr noch erwirtschaftet, ist
     mit ihr realisiert worden und gehört in den realisierten Block.

     Ohne `uClose` (Beteiligungen aus älteren Partien) bleibt es beim alten
     Verhalten: Dann ist `atStart` der volle Stand, und die Spalte rechnet wie
     vorher.                                                                 */
  const close = c.uClose || ch;
  const offenClose = {
    ebitda: close.ebitda - (sold.ebitda || 0),
    mult: close.mult - (sold.mult || 0),
    delev: close.delev - (sold.delev || 0),
    rest: close.rest - (sold.rest || 0),
  };
  // Der Anteil des heutigen NAV, der mit dieser Realisierung den Besitzer wechselt
  const navShare = Math.max(0, navValueOf(c, market)) * soldShare;
  return {
    ebitda: offen.ebitda * soldShare, mult: offen.mult * soldShare, delev: offen.delev * soldShare,
    /* Der Restposten der Zerlegung gehört in den Block, nicht in die Kosten.
       Er trägt vor allem die beschränkte Haftung: Ist das Eigenkapital
       aufgezehrt, fällt der NAV nicht unter null, während Multiple und
       Verschuldung rechnerisch weiterlaufen. Bis zum 17.09.2026 fiel er aus
       der Fondsaufstellung heraus und landete im Restposten
       "Transaktionskosten" — bei einer total verlorenen Beteiligung stand der
       realisierte Block deshalb bei −96,7, obwohl der Deal 76,3 vernichtet
       hatte, und die Kostenzeile wies +20,4 aus. Ein Fonds, der alles verloren
       hat, hatte positive Transaktionskosten.                               */
    rest: offen.rest * soldShare,
    exit: net - navShare,
    // Was beim Abgang aus dem unrealisierten Block genommen wird
    atStart: {
      ebitda: offenClose.ebitda * soldShare, mult: offenClose.mult * soldShare,
      delev: offenClose.delev * soldShare, rest: offenClose.rest * soldShare,
    },
  };
}

/* Den Stand festhalten, mit dem eine Beteiligung in den unrealisierten Block
   eingeht. Aufgerufen beim Periodenschluss, nachdem der Eintrag zur Historie
   gehört — dieselbe Reihenfolge, in der auch bewertet wird.               */
export function closeUnrealized(c) {
  const ch = bridgeChain(c.hist || [], null);
  c.uClose = { ebitda: ch.ebitda, mult: ch.mult, delev: ch.delev, rest: ch.rest };
  return c.uClose;
}

/* Dasselbe, aber die Beteiligung merkt sich, was entnommen wurde. Jede
   Realisierung geht hierüber — so kann kein Aufrufer den Zähler vergessen und
   die Aufstellung eine Zahl doppelt führen. */
export function takeUnrealized(c, market, net = 0, soldShare = 1) {
  const u = unrealizedOut(c, market, net, soldShare);
  const sold = c.uSold || { ebitda: 0, mult: 0, delev: 0, rest: 0 };
  /* Ein Teilexit senkt den NAV der Beteiligung um den platzierten Anteil. Die
     Kette sieht diesen Rückgang in der Folgeperiode und legt ihn mangels
     Treiber in den Restposten — er sieht dort aus wie Wertvernichtung, ist
     aber ein Eigentümerwechsel, und sein Gegenwert steht bereits als Erlös in
     `exit`. Der Zähler nimmt ihn deshalb vorweg, damit er im unrealisierten
     Block wieder herausfällt. Ohne diese Zeile stand in einer Testpartie
     "Übriges −300" neben "Transaktionskosten +270".                        */
  const abgang = soldShare < 0.999 ? -Math.max(0, navValueOf(c, market)) * soldShare : 0;
  c.uSold = {
    ebitda: (sold.ebitda || 0) + u.ebitda,
    mult: (sold.mult || 0) + u.mult,
    delev: (sold.delev || 0) + u.delev,
    rest: (sold.rest || 0) + u.rest + abgang,
  };
  return u;
}

export function fundBridge(f, market, quarter) {
  /* Realisiert: die Zerlegungen der verkauften Beteiligungen, aufaddiert.
     Rekapitalisierungen stehen daneben — sie sind zurückgeflossenes Geld,
     aber keine Wertsteigerung eines der drei Treiber.                     */
  /* Der realisierte Block übernimmt die Kette, die beim Abgang im
     unrealisierten Block stand (uOut), zuzüglich des Erlöses gegen die letzte
     Bewertung. Damit beschreiben beide Blöcke dieselbe Beteiligung mit
     denselben Zahlen, und ein Abgang verschiebt nur, er erzeugt nichts.

     `p` trägt die Teilexits: Deren Beitrag steht noch in der Kette der weiter
     gehaltenen Beteiligung und wäre sonst doppelt gezählt.

     Partien, die vor dem 16.09.2026 gespielt wurden, haben kein `uOut` an
     ihren Realisierungen. Für sie bleibt es bei der Spanne aus makeBridge() —
     die Aufstellung rechnet dort weiter wie bisher.                        */
  let rEbitda = 0, rMult = 0, rDelev = 0, rRest = 0, rExit = 0, recaps = 0;
  // Die übernommene Kette für sich, für die Halbjahresspalte (fundBridgeStep)
  let xEbitda = 0, xMult = 0, xDelev = 0, xRest = 0;
  (f.realized || []).forEach((r) => {
    if (!r) return;
    recaps += (r.bridge && r.bridge.dist) || 0;
    const u = r.uOut;
    if (u) {
      rEbitda += u.ebitda || 0; rMult += u.mult || 0; rDelev += u.delev || 0; rRest += u.rest || 0;
      const a = u.atStart || u;
      xEbitda += a.ebitda || 0; xMult += a.mult || 0; xDelev += a.delev || 0; xRest += a.rest || 0;
      rExit += u.exit || 0;
      return;
    }
    if (!r.bridge) return;
    rEbitda += r.bridge.ebitda || 0;
    rMult += r.bridge.mult || 0;
    rDelev += r.bridge.delev || 0;
  });

  /* Unrealisiert: derselbe Schnitt für die Beteiligungen, die noch stehen.
     Die drei Treiber sind auf den heute gehaltenen Anteil gerechnet und
     ergeben zusammen genau NAV − Anteil · Einstiegswert; was ein Teilexit an
     Kostenbasis freigesetzt hat, steckt bereits im realisierten Block.     */
  const holdings = f.holdings || [];
  let uEbitda = 0, uMult = 0, uDelev = 0, uRest = 0;
  holdings.forEach((c) => {
    // Auch aus einer gehaltenen Beteiligung kann schon Geld zurückgeflossen sein
    recaps += c.recapOut || 0;
    const h = c.hist || [];
    if (!h.length) return;
    const st = bridgeChain(h, liveHist(c, market));
    /* Der bereits platzierte Teil einer noch gehaltenen Beteiligung steht im
       realisierten Block und darf hier nicht ein zweites Mal stehen. */
    const sold = c.uSold || {};
    uEbitda += st.ebitda - (sold.ebitda || 0);
    uMult += st.mult - (sold.mult || 0);
    uDelev += st.delev - (sold.delev || 0);
    uRest += st.rest - (sold.rest || 0);
  });

  /* Für den Gewinn zählt das tatsächlich abgerufene Kapital, nicht die
     Untergrenze von drawnOf() — die steht dort nur, damit der TVPI keine
     Division durch null wird. Ein Fonds, der noch nichts abgerufen hat, hat
     nichts verloren; mit drawnOf() wies die Brücke ihm 1 Mio. € Verlust aus. */
  const drawn = f.drawn || 0;
  const fees = -(f.fees || 0);                       // Management Fee, mitgeschrieben
  const carry = -carryOf(f, market, quarter);
  const value = totalValueOf(f, market) + carry;     // Gesamtwert nach Carry
  const gain = value - drawn;
  const named = rEbitda + rMult + rDelev + rRest + rExit + recaps
    + uEbitda + uMult + uDelev + uRest + fees + carry;
  return {
    rEbitda, rMult, rDelev, rRest, rExit, recaps, uEbitda, uMult, uDelev, uRest, fees, carry,
    xEbitda, xMult, xDelev, xRest,
    gain, drawn, value, tvpi: value / drawnOf(f),
    txCost: gain - named,
    realizedCount: (f.realized || []).length, openCount: holdings.length,
  };
}

/* Dieselbe Aufstellung für ein einzelnes Halbjahr: die Differenz zweier
   Stände. Jeder Posten von fundBridge() ist auf den Stichtag kumuliert, die
   Differenz also der Beitrag genau dieses Halbjahres — und weil die Posten an
   beiden Stichtagen exakt auf `gain` aufgehen, tun es ihre Differenzen auch.
   Der TVPI ist ein Verhältnis und wird deshalb als Veränderung geführt, nicht
   als Differenz von Summanden.                                              */
export function fundBridgeStep(now, was) {
  if (!now || !was) return null;
  const out: Record<string, number> = { tvpi: now.tvpi - was.tvpi };
  [...FUND_BRIDGE_PARTS, "gain", "drawn", "value"].forEach((k) => { out[k] = now[k] - was[k]; });
  /* Ein Abgang wandert von einem Block in den anderen. Beide tragen seit dem
     16.09.2026 dieselbe Zerlegung (der realisierte Block übernimmt die Kette,
     die im unrealisierten stand), aber sie stehen in verschiedenen Spalten —
     die Differenz zweier Stände weist die Umgliederung deshalb als
     Wertentwicklung aus: einmal negativ unter "Unrealisiert", einmal positiv
     unter "Realisiert". Beides ist in diesem Halbjahr nicht passiert.

     Sie wird deshalb zurückgeschoben. Was im realisierten Block stehen bleibt,
     ist `rExit`: der Erlös gegen die letzte Bewertung — das Einzige, was der
     Abgang an neuer Information bringt. Verschoben wird zwischen zwei Posten
     derselben Aufstellung, die Summe bleibt unberührt: Die Spalte geht weiter
     exakt auf `gain` auf.                                                   */
  (["Ebitda", "Mult", "Delev", "Rest"] as const).forEach((k) => {
    const d = (now["x" + k] || 0) - (was["x" + k] || 0);
    out["u" + k] += d;
    out["r" + k] -= d;
  });
  return out;
}

// Gesamter Rückfluss eines Deals und die zugehörige Kostenbasis
export const dealMoic = (c, net) => (net + (c.recapOut || 0)) / Math.max(0.01, c.costLeft ?? c.entryEquity);

/* ---------- Tail-End-Verwertung ----------
   Was am Laufzeitende mit allem passiert, was noch im Portfolio steht. Der
   Fonds hat keine Zeit mehr zu verhandeln: LIQ_DISC Turns unter dem
   Marktmultiple, zu bilateralen Kosten, und der MEP schneidet mit.

   Eine Stelle, drei Aufrufer — die Auswertung des letzten Halbjahres
   (runQuarter), der Übungsmodus (components/PeLeagues.tsx) und die Vorschau
   (tailEndOf). Bis zum 15.09.2026 stand die Rechnung zweimal ausgeschrieben,
   und die Kopie im Übungsmodus schrieb keine Value Bridge mit: Die
   Endabrechnung einer Übungspartie verlor damit jeden Tail-End-Deal in den
   Restposten "Transaktionskosten", obwohl dort die halbe Partie steckte.   */
export function liquidateHoldings(f, market, quarter, compat: EngineCompat = {}) {
  const out = [];
  (f.holdings || []).forEach((c) => {
    // Am Laufzeitende hat der Verkäufer keinen Verhandlungsspielraum
    const gross = Math.max(0, eqvOf(c, markMultiple(c, market) - LIQ_DISC));
    const net = exitNetOf(c, gross, BIL_FEE);
    applyProceeds(f, net, c.costLeft ?? c.entryEquity, quarter);
    const moic = dealMoic(c, net);
    f.realized = [...(f.realized || []), {
      name: c.name + " (Tail-End)", moic, bridge: makeBridge(c, gross, net),
      uOut: takeUnrealized(c, market, net),
    }];
    out.push({ c, gross, net, moic });
  });
  f.holdings = [];
  if (!compat.legacyRecycleInvestPeriod) releaseRecycled(f, quarter);
  return out;
}

/* Am Laufzeitende fließt auch zurück, was einbehalten und nicht mehr
   investiert wurde. TVPI und IRR zählen es ohnehin als Endwert im letzten
   Halbjahr (totalValueOf, cashflowsOf) — ausgeschüttet war es aber nicht, und
   der DPI blieb um genau diesen Betrag unter dem TVPI. Seit Recycling über die
   ganze Laufzeit geht (18.10.2026), ist das der Normalfall: Wer im letzten
   Halbjahr einbehält, kann nicht mehr investieren. Wie in applyProceeds
   werden aufgelaufene Gebühren vorher bedient.                             */
function releaseRecycled(f, quarter) {
  const amt = f.recyc || 0;
  if (!(amt > 1e-9)) return;
  f.recyc = 0;
  f.cash -= amt;
  let dist = amt;
  if ((f.accrued || 0) > 0) {
    const pay = Math.min(dist, f.accrued);
    f.accrued -= pay; dist -= pay;
  }
  if (dist > 1e-9) {
    f.dists = [...(f.dists || []), { q: quarter, amt: dist }];
    f.distTotal = (f.distTotal || 0) + dist;
  }
}

/* Dieselbe Verwertung als Vorschau, ohne den Fonds anzufassen: Was bliebe,
   wenn die Laufzeit heute endete?

   Der Grund, dass es sie gibt: NAV und TVPI laufen über markMultiple(), und
   markMultiple() kennt weder den Endfälligkeitsdruck (endPressure, nur in
   dealMultiple) noch den Zwangsabschlag der Tail-End-Verwertung. In den
   letzten Halbjahren einer Partie steht auf dem Bildschirm deshalb ein Wert,
   den niemand mehr bezahlt — in Testpartien 1,58× TVPI im Halbjahr 19 gegen
   1,13× in der Endabrechnung. Die Zahl war nie falsch (sie ist die Bewertung
   des Bestands), aber sie war die falsche Zahl für die Entscheidung, die in
   diesen Halbjahren ansteht: verkaufen oder liegen lassen.

   Die Vorschau rechnet nicht selbst, sondern lässt liquidateHoldings() auf
   einer Kopie laufen. Damit kann sie gar nicht von dem abweichen, was am Ende
   tatsächlich passiert — genau das sichert der Test in
   __tests__/tailEnd.test.ts.                                               */
export function tailEndOf(f, market, quarter) {
  const g = {
    ...f,
    holdings: (f.holdings || []).map((c) => ({ ...c })),
    realized: [...(f.realized || [])],
    calls: [...(f.calls || [])],
    dists: [...(f.dists || [])],
  };
  const deals = liquidateHoldings(g, market, quarter);
  return {
    fund: g, deals,
    tvpi: tvpiOf(g, market, quarter),
    irr: irrOf(g, market, quarter),
    score: scoreOf(g, market, quarter),
    value: totalValueOf(g, market) - carryOf(g, market, quarter),
    // Was die Zwangsverwertung gegenüber der Bewertung des Bestands kostet
    haircut: navOf(f, market) - deals.reduce((s, d) => s + d.net, 0),
  };
}

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
    const tax = taxOf(ebH, interest, capex);
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

export const impliedMoM = (d, mult, lev, financing, opts?: { years?: number; drift?: number }) => {
  const p = lboProjection(d, mult, lev, financing, opts);
  return p ? p.mom : null;
};
