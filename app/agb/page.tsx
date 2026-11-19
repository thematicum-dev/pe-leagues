import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Nutzungsbedingungen" };

export default function AgbPage() {
  return (
    <LegalPage title="Nutzungsbedingungen">
      <h2>1. Gegenstand</h2>
      <p>
        PE Leagues ist ein browserbasiertes Simulationsspiel. Betreiber ist Dr. Marcel Maier, München (siehe{" "}
        <a href="/impressum">Impressum</a>). Diese Bedingungen regeln die Nutzung des Spiels.
      </p>

      <h2>2. Zugang und Konto</h2>
      <p>
        Die Nutzung setzt ein Konto und eine Freigabe voraus — durch einen Zugangscode oder durch einen
        Administrator. Ein Anspruch auf Freigabe besteht nicht. Du bist für die Geheimhaltung deiner
        Zugangsdaten verantwortlich und nutzt genau ein Konto.
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


      <h2>6. Haftung</h2>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der Verletzung von Leben,
        Körper oder Gesundheit sowie nach den Vorschriften des Produkthaftungsgesetzes.
      </p>
      <p>
        Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten,
        also solcher Pflichten, deren Erfüllung die ordnungsgemäße Nutzung des Spiels überhaupt erst
        ermöglicht und auf deren Einhaltung du regelmäßig vertrauen darfst. In diesem Fall ist die
        Haftung auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt.
      </p>
      <p>
        Im Übrigen ist die Haftung ausgeschlossen. Das gilt insbesondere für den Verlust von
        Spielständen, Ranglistenplätzen oder Ergebnissen sowie für Entscheidungen, die du außerhalb
        des Spiels auf Grundlage von Spielinhalten triffst. Die vorstehenden Beschränkungen gelten auch
        zugunsten unserer Erfüllungsgehilfen.
      </p>

      <h2>7. Beendigung</h2>
      <p>
        Du kannst dein Konto jederzeit im <a href="/profile">Profil</a> löschen. Wir können den Zugang aus
        wichtigem Grund sperren, insbesondere bei Verstößen gegen Ziffer 4.
      </p>

      <h2>8. Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bist du
        Verbraucher, gilt diese Rechtswahl nur, soweit dir dadurch nicht der Schutz zwingender
        Bestimmungen des Rechts deines gewöhnlichen Aufenthalts entzogen wird.
      </p>
      <p>
        Bist du Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches
        Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag
        München.
      </p>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
      <p>
        Wir können diese Bedingungen mit Wirkung für die Zukunft ändern. Über Änderungen informieren
        wir dich rechtzeitig vorher in der App oder per E-Mail. Widersprichst du nicht innerhalb von
        sechs Wochen, gelten die Änderungen als angenommen; auf diese Folge weisen wir in der
        Mitteilung gesondert hin. Widersprichst du, können beide Seiten den Nutzungsvertrag beenden.
      </p>
      <p>
        Sollte eine Bestimmung dieser Bedingungen unwirksam sein, bleibt die Wirksamkeit der übrigen
        Bestimmungen unberührt.
      </p>

      <p className="dashsub">Stand: 01.11.2026</p>
    </LegalPage>
  );
}
