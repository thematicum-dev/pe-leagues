import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <mark>Firma / Name des Betreibers</mark><br />
        <mark>Straße und Hausnummer</mark><br />
        <mark>PLZ Ort, Land</mark>
      </p>
      <h2>Vertreten durch</h2>
      <p><mark>Vertretungsberechtigte Person(en)</mark></p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <mark>kontakt@…</mark><br />
        Telefon: <mark>+49 …</mark>
      </p>
      <h2>Registereintrag und Umsatzsteuer</h2>
      <p>
        Registergericht und -nummer: <mark>falls vorhanden</mark><br />
        Umsatzsteuer-Identifikationsnummer nach § 27a UStG: <mark>falls vorhanden</mark>
      </p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p><mark>Name und Anschrift (§ 18 Abs. 2 MStV)</mark></p>
      <h2>Hinweis zum Spiel</h2>
      <p>
        PE Leagues ist eine Simulation zu Lern- und Unterhaltungszwecken. Alle Unternehmen, Personen,
        Fonds und Kennzahlen im Spiel sind erfunden. Nichts davon ist Anlageberatung oder ein Angebot
        zum Erwerb von Finanzinstrumenten; es wird kein echtes Geld eingesetzt oder gewonnen.
      </p>
    </LegalPage>
  );
}
