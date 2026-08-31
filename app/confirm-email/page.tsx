import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import ResendForm from "./ResendForm";

export const dynamic = "force-dynamic";

// Hilfeseite für den Fall, dass der Bestätigungslink aus der E-Mail nicht
// mehr greift (siehe die Erklärung in app/auth/callback/route.ts). Wichtig
// ist die Reihenfolge der Aussagen: In den allermeisten Fällen ist das Konto
// trotz der Fehlermeldung bereits bestätigt, die Anmeldung funktioniert also
// ganz normal. Ein neuer Link ist nur der zweite Weg.
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(next && next.startsWith("/") ? next : "/dashboard");
  }

  return (
    <main className="authwrap">
      <div className="authcard">
        <Logo />
        <h1>Der Bestätigungslink hat nicht funktioniert</h1>
        <p>
          Das ist meist halb so wild: Ein Bestätigungslink gilt nur einmal, und manche
          Mail-Programme öffnen ihn schon beim Anzeigen der Nachricht. Dein Konto ist dann
          trotzdem bereits bestätigt.
        </p>
        <p>
          <strong>Melde dich deshalb zuerst ganz normal an</strong> — mit der E-Mail-Adresse und
          dem Passwort aus der Registrierung.
        </p>
        <Link href="/login" className="btn-primary">
          Zur Anmeldung
        </Link>

        <h2 className="confirmsub">Klappt die Anmeldung nicht?</h2>
        <p className="authhint">
          Dann ist die Bestätigung tatsächlich nicht durchgelaufen. Hier bekommst du einen neuen
          Link.
        </p>
        <ResendForm defaultEmail={email} />

        <div className="authlinks">
          <Link href="/forgot-password">Passwort vergessen</Link>
          <Link href="/practice">Übungsmodus</Link>
        </div>
      </div>
    </main>
  );
}
