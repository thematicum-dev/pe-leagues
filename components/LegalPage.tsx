import Link from "next/link";
import Logo from "@/components/Logo";
import SiteFooter from "@/components/SiteFooter";

/* Rahmen der Rechtstexte. Die Angaben des Betreibers sind seit dem
   19.11.2026 eingetragen; `NEXT_PUBLIC_LEGAL_READY` blendet den Hinweis aus,
   dass die Texte noch nicht rechtlich geprüft sind. */
export const LEGAL_READY = process.env.NEXT_PUBLIC_LEGAL_READY === "1";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legalwrap">
      <article className="legal">
        <Link href="/" aria-label="Zur Startseite"><Logo /></Link>
        <h1>{title}</h1>
        {!LEGAL_READY && (
          <p className="legaldraft">
            <strong>Hinweis:</strong> Diese Texte sind noch nicht abschließend rechtlich geprüft. Nach der
            Prüfung <code>NEXT_PUBLIC_LEGAL_READY=1</code> setzen, dann verschwindet dieser Hinweis.
          </p>
        )}
        {children}
      </article>
      <SiteFooter />
    </div>
  );
}
