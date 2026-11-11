import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Datenschutz" };

/* Die Abschnitte folgen dem, was die Anwendung tatsächlich tut — wer hier
   etwas ändert, weil sich die Technik geändert hat, findet die Stelle im Code
   jeweils genannt. */
export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>
        <mark>Firma / Name, Anschrift, E-Mail des Verantwortlichen</mark> (siehe <a href="/impressum">Impressum</a>).
        <mark> Falls bestellt: Kontaktdaten des Datenschutzbeauftragten.</mark>
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>
          <strong>Konto:</strong> E-Mail-Adresse und Passwort (nur als Hash gespeichert), Zeitpunkt der
          Registrierung und der letzten Anmeldung.
        </li>
        <li>
          <strong>Profil:</strong> der von dir gewählte Anzeigename, eine optionale Nachricht an den
          Administrator bei der Zugangsanfrage, der Stand deiner Freigabe und gegebenenfalls der
          Zugangscode, über den du freigeschaltet wurdest.
        </li>
        <li>
          <strong>Spieldaten:</strong> die Partien, an denen du teilnimmst, deine Entscheidungen je Halbjahr
          und die daraus berechneten Ergebnisse und Platzierungen.
        </li>
        <li>
          <strong>Aktivität:</strong> wann du zuletzt in der App warst, und — sofern du es nicht abgeschaltet
          hast — welche Bereiche du aufrufst (z. B. „Übungsmodus geöffnet“), jeweils mit Zeitpunkt.
        </li>
        <li>
          <strong>Technische Daten:</strong> beim Aufruf der Seiten verarbeitet der Hosting-Anbieter
          IP-Adresse, Zeitpunkt und Browserkennung in Server-Logs.
        </li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Bereitstellung des Spiels, deines Kontos und der Ranglisten — Art. 6 Abs. 1 lit. b DSGVO (Vertrag).</li>
        <li>
          Auswertung der Nutzung in eigener Datenbank, um das Spiel zu verbessern und inaktive Konten zu
          erkennen — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Du kannst dem jederzeit im{" "}
          <a href="/profile">Profil</a> widersprechen; bereits aufgezeichnete Ereignisse werden dann gelöscht.
        </li>
        <li>Sicherheit und Missbrauchsabwehr (Server-Logs, Protokoll der Administrator-Eingriffe) — Art. 6 Abs. 1 lit. f DSGVO.</li>
      </ul>

      <h2>4. Was andere Spieler sehen</h2>
      <p>
        Dein Anzeigename, der Name deines Fonds und deine Ergebnisse sind für die Mitspieler deiner Partien
        und in der Rangliste deiner Spielwelt sichtbar. Deine E-Mail-Adresse, deine Entscheidungen im
        laufenden Halbjahr und deine Aktivitätsdaten sehen andere Spieler nicht.
      </p>

      <h2>5. Cookies und lokale Speicherung</h2>
      <p>
        Wir setzen ausschließlich technisch notwendige Cookies: die Sitzungs-Cookies der Anmeldung und,
        wenn du über einen Einladungslink kommst, für höchstens 14 Tage den darin enthaltenen Zugangscode.
        Es gibt keine Werbe- oder Tracking-Cookies und keine Analysedienste Dritter; eine Einwilligung
        nach § 25 Abs. 1 TDDDG ist dafür nicht erforderlich. Entwürfe deiner Spielzüge werden lokal in
        deinem Browser zwischengespeichert.
      </p>

      <h2>6. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li><strong>Supabase</strong> (Datenbank, Anmeldung, E-Mail-Versand der Bestätigungs- und Passwort-Mails): <mark>Anbieter, Region des Projekts, Hinweis auf AVV</mark></li>
        <li><strong>Vercel</strong> (Hosting der Anwendung): <mark>Anbieter, Region, Hinweis auf AVV</mark></li>
        <li><strong>Google Fonts</strong>: Die Schriften werden derzeit von Servern von Google geladen; dabei wird deine IP-Adresse an Google übertragen. <mark>Vor dem Start entscheiden: Schriften selbst hosten (empfohlen) oder hier Rechtsgrundlage und Drittlandübermittlung beschreiben.</mark></li>
      </ul>
      <p><mark>Angaben zu Übermittlungen in Drittländer und den Garantien dafür (z. B. Standardvertragsklauseln, EU-US Data Privacy Framework).</mark></p>

      <h2>7. Speicherdauer</h2>
      <ul>
        <li>Konto, Profil und Spieldaten: bis du dein Konto löschst.</li>
        <li>Nutzungsereignisse: höchstens 13 Monate, danach automatische Löschung.</li>
        <li>Fehlversuche bei Zugangscodes: zwei Tage.</li>
        <li>Protokoll der Administrator-Eingriffe: <mark>Frist festlegen</mark>.</li>
      </ul>

      <h2>8. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, dich bei einer
        Aufsichtsbehörde zu beschweren. Dein Konto mit allen zugehörigen Daten kannst du jederzeit selbst
        im <a href="/profile">Profil</a> löschen; den Anzeigenamen kannst du dort ändern. Für alles andere
        genügt eine Nachricht an die oben genannte Adresse.
      </p>

      <p className="dashsub">Stand: <mark>Datum</mark></p>
    </LegalPage>
  );
}
