import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import SiteFooter from "@/components/SiteFooter";
import { TAGLINE } from "@/lib/brand";

const FEATURES: [string, string][] = [
  ["Ein voller Fondszyklus", "500 Mio. € Commitment, zwanzig Halbjahre. Du sourcst Deals, bietest in Auktionen gegen vier andere Fonds, strukturierst das Leverage und lebst mit dem Covenant, den du dir eingehandelt hast."],
  ["Wertsteigerung, die man erklären kann", "Cost-out, Pricing, Buy-and-Build, Managementwechsel: Jede Maßnahme hat Kosten, Dauer und Risiko. Am Ende zerlegt die Value Bridge deine Rendite in EBITDA, Multiple und Entschuldung."],
  ["Gemessen wie die Branche", "TVCC und Netto-IRR nach Gebühren und Carry, gegen eine Benchmark. Jede beendete Partie geht in deinen Track Record, die Rangliste und deine Karrierestufe — vom Analysten zum Managing Partner."],
];

const FAQ: [string, string][] = [
  ["Wie läuft eine Partie ab?", "Fünf Fonds spielen gegeneinander — Menschen, freie Plätze übernimmt die KI. Ein Zug ist ein Halbjahr: Alle geben ihre Entscheidungen ab, dann wird ausgewertet. Sind alle schnell, geht es sofort weiter; sonst läuft eine Frist. Eine Partie lässt sich an einem Abend spielen oder über zwei Wochen nebenher."],
  ["Brauche ich Vorwissen?", "Nein. Die Einführung führt dich mit einem Coach durch eine komplette Beteiligung, und im Übungsmodus spielst du eine volle Partie allein gegen vier KI-Fonds, so oft du willst. Wer aus der Branche kommt, findet die Mechanik wieder: Covenant-Test, Zinsschranke, Management-Equity, Carry-Wasserfall."],
  ["Für wen ist das gedacht?", "Für Studierende und Lehrstühle (Corporate Finance, Entrepreneurial Finance), für Analysten-Trainings in Fonds und Beratungen, und für alle, die wissen wollen, wie Private Equity tatsächlich Geld verdient — und verliert. Kurse und Teams bekommen eine eigene, abgeschlossene Spielwelt mit eigener Rangliste."],
  ["Geht es um echtes Geld?", "Nein. PE Leagues ist eine Simulation; alle Unternehmen und Zahlen sind erfunden, es wird nichts eingesetzt und nichts ausgezahlt."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ geloescht?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }
  const { geloescht } = await searchParams;

  return (
    <main className="landing landing-long">
      <div className="landingcard">
        <Logo />
        <p className="tagline">{TAGLINE}</p>
        {geloescht && <p className="notice">Dein Konto und alle zugehörigen Daten wurden gelöscht.</p>}
        <h1>Manage deinen Private-Equity-Fonds durch einen vollen Zyklus.</h1>
        <p>
          Investment, Value Creation, Exit: Einstiegsmultiple und Kapitalstruktur, das
          Wertsteigerungsprogramm über die Halteperiode, der Realisierungszeitpunkt. Maximiere die
          Rendite, gemessen an TVCC und IRR. Jede Partie geht in deinen persönlichen Track Record
          ein — und in die globale Rangliste. Reicht es für Top Quartile der PE Leagues Community?
        </p>
        <div className="landingactions">
          <Link href="/signup" className="btn-primary">
            Konto erstellen
          </Link>
          <Link href="/login" className="btn-secondary">
            Anmelden
          </Link>
        </div>
      </div>

      <section className="landingfeatures" aria-label="Was dich erwartet">
        {FEATURES.map(([title, text]) => (
          <div className="landingfeature" key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <section className="landingsteps">
        <h2>So kommst du ins Spiel</h2>
        <ol>
          <li><strong>Konto erstellen</strong> und E-Mail bestätigen.</li>
          <li><strong>Zugang freischalten</strong> — mit dem Zugangscode deines Kurses oder Teams sofort, sonst per Anfrage.</li>
          <li><strong>Einführung oder Übungsmodus</strong>: allein, ohne Zeitdruck, mit Erklärungen zu jeder Kennzahl.</li>
          <li><strong>Partie eröffnen oder beitreten</strong>, Fondsprofil wählen, und das erste Halbjahr beginnt.</li>
        </ol>
      </section>

      <section className="landingsteps">
        <h2>Häufige Fragen</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
