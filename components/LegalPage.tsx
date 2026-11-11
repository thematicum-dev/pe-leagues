import Link from "next/link";
import Logo from "@/components/Logo";
import SiteFooter from "@/components/SiteFooter";

/* Rahmen der Rechtstexte. `draft` blendet den Hinweis ein, dass die Angaben
   des Betreibers noch fehlen — er verschwindet, sobald NEXT_PUBLIC_LEGAL_READY
   gesetzt ist, also erst, wenn jemand die markierten Stellen ausgefüllt und
   die Texte hat prüfen lassen. */
export const LEGAL_READY = process.env.NEXT_PUBLIC_LEGAL_READY === "1";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legalwrap">
      <article className="legal">
        <Link href="/" aria-label="Zur Startseite"><Logo /></Link>
        <h1>{title}</h1>
        {!LEGAL_READY && (
          <p className="legaldraft">
            <strong>Entwurf.</strong> Die <mark>markierten</mark> Stellen sind Platzhalter für die Angaben des
            Betreibers. Dieser Text ist eine Vorlage und ersetzt keine rechtliche Prüfung — vor dem
            öffentlichen Start ausfüllen, prüfen lassen und danach <code>NEXT_PUBLIC_LEGAL_READY=1</code> setzen.
          </p>
        )}
        {children}
      </article>
      <SiteFooter />
    </div>
  );
}
