import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Dr. Marcel Maier<br />
        Hubertusstraße 5<br />
        80639 München<br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:marcelmaierhsg@gmail.com">marcelmaierhsg@gmail.com</a>
      </p>
      <h2>Registereintrag</h2>
      <p>Es besteht kein Eintrag im Handelsregister.</p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Marcel Maier<br />
        Hubertusstraße 5<br />
        80639 München
      </p>
      <h2>Hinweis zum Spiel</h2>
      <p>
        PE Leagues ist eine Simulation zu Lern- und Unterhaltungszwecken. Alle Unternehmen, Personen,
        Fonds und Kennzahlen im Spiel sind erfunden. Nichts davon ist Anlageberatung oder ein Angebot
        zum Erwerb von Finanzinstrumenten; es wird kein echtes Geld eingesetzt oder gewonnen.
      </p>
    </LegalPage>
  );
}
