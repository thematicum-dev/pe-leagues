import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="landing">
      <div className="landingcard">
        <Logo />
        <p className="tagline">500 Mio. € Commitment. Fünf Fonds. Ein Dealflow.</p>
        <h1>Manage deinen Private-Equity-Fonds durch einen vollen Zyklus.</h1>
        <p>
          Investment, Value Creation, Exit: Einstiegsmultiple und Kapitalstruktur, das
          Wertsteigerungsprogramm über die Halteperiode, der Realisierungszeitpunkt. Maximiere die
          Rendite, gemessen an TVPI und IRR. Jede Partie geht in deinen persönlichen Track Record
          ein — und in die globale Rangliste. Reicht es für Top Quartile der PE Leagues Community?
        </p>
        <div className="landingactions">
          <Link href="/login" className="btn-primary">
            Anmelden
          </Link>
          <Link href="/signup" className="btn-secondary">
            Konto erstellen
          </Link>
        </div>
      </div>
    </main>
  );
}
