import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Nutzungsbedingungen" };

export default function AgbPage() {
  return (
    <LegalPage title="Nutzungsbedingungen">
      <h2>1. Gegenstand</h2>
      <p>
        PE Leagues ist ein browserbasiertes Simulationsspiel. Betreiber ist <mark>Firma / Name</mark> (siehe{" "}
        <a href="/impressum">Impressum</a>). Diese Bedingungen regeln die Nutzung des Spiels.
      </p>

      <h2>2. Zugang und Konto</h2>
      <p>
        Die Nutzung setzt ein Konto und eine Freigabe voraus — durch einen Zugangscode oder durch einen
        Administrator. Ein Anspruch auf Freigabe besteht nicht. Du bist für die Geheimhaltung deiner
        Zugangsdaten verantwortlich und nutzt genau ein Konto. <mark>Mindestalter festlegen (z. B. 16 Jahre).</mark>
      </p>

      <h2>3. Simulation, keine Anlageberatung</h2>
      <p>
        Alle Unternehmen, Personen, Marktdaten und Ergebnisse im Spiel sind erfunden und vereinfacht.
        Das Spiel ist weder Anlage-, Rechts- noch Steuerberatung, und Ergebnisse im Spiel lassen keinen
        Schluss auf reale Investitionen zu. Es wird kein echtes Geld eingesetzt, gehandelt oder gewonnen.
      </p>

      <h2>4. Faires Spiel</h2>
      <ul>
        <li>Keine automatisierten Abgaben, keine Manipulation von Anfragen, kein Ausnutzen von Fehlern — gefundene Fehler bitte melden.</li>
        <li>Keine Absprachen, die darauf zielen, Ranglisten zu verfälschen (z. B. Partien mit Zweitkonten).</li>
        <li>Anzeigenamen dürfen niemanden beleidigen, täuschen oder Rechte Dritter verletzen.</li>
      </ul>
      <p>
        Bei Verstößen können wir Ergebnisse aus der Wertung nehmen, Partien zurücksetzen und Konten sperren.
      </p>

      <h2>5. Spielbetrieb</h2>
      <p>
        Spielregeln und Balance entwickeln sich weiter; laufende Partien werden nach Möglichkeit nach dem
        Regelstand zu Ende gespielt, unter dem sie begonnen haben. Wir bemühen uns um einen
        unterbrechungsfreien Betrieb, schulden aber keine bestimmte Verfügbarkeit. Partien können aus
        technischen Gründen zurückgesetzt oder beendet werden.
      </p>

      <h2>6. Preise</h2>
      <p>
        <mark>Entgeltmodell beschreiben (kostenlos / Lizenz je Kurs oder Organisation / Abonnement),
        bei Verbrauchern einschließlich Widerrufsbelehrung, Laufzeit und Kündigung.</mark>
      </p>

      <h2>7. Haftung</h2>
      <p>
        <mark>Haftungsregelung nach rechtlicher Prüfung einsetzen (unbeschränkt bei Vorsatz, grober
        Fahrlässigkeit und Personenschäden; im Übrigen beschränkt auf wesentliche Vertragspflichten
        und den vorhersehbaren Schaden).</mark>
      </p>

      <h2>8. Beendigung</h2>
      <p>
        Du kannst dein Konto jederzeit im <a href="/profile">Profil</a> löschen. Wir können den Zugang aus
        wichtigem Grund sperren, insbesondere bei Verstößen gegen Ziffer 4.
      </p>

      <h2>9. Schlussbestimmungen</h2>
      <p>
        <mark>Anwendbares Recht, Gerichtsstand (soweit zulässig), Hinweis zur
        Verbraucherstreitbeilegung (§ 36 VSBG), Regelung zu Änderungen dieser Bedingungen.</mark>
      </p>

      <p className="dashsub">Stand: <mark>Datum</mark></p>
    </LegalPage>
  );
}
