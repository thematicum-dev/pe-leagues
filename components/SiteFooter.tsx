import Link from "next/link";

/* Fußzeile mit den Pflichtangaben. Steht auf Startseite, Dashboard und den
   Rechtstexten selbst — Impressum und Datenschutz müssen von überall mit
   höchstens zwei Klicks erreichbar sein (§ 5 DDG, Art. 13 DSGVO). */
export default function SiteFooter() {
  return (
    <footer className="sitefooter">
      <span>© {new Date().getFullYear()} PE Leagues</span>
      <nav aria-label="Rechtliches">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/agb">Nutzungsbedingungen</Link>
      </nav>
    </footer>
  );
}
