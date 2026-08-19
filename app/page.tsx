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
        <p className="tagline">Zehn Jahre. Fünf Fonds. Eine Rangliste.</p>
        <h1>Führe deinen Buyout-Fonds gegen echte Mitspieler.</h1>
        <p>
          Zehn Jahre, getaktet in Halbjahren: bieten, Portfolios entwickeln, verkaufen. Melde
          dich an, um Mehrspieler-Partien zu erstellen und beizutreten — oder probiere zuerst den
          Übungsmodus, ganz ohne Konto.
        </p>
        <div className="landingactions">
          <Link href="/login" className="btn-primary">
            Anmelden
          </Link>
          <Link href="/signup" className="btn-secondary">
            Konto erstellen
          </Link>
        </div>
        <div className="landingpractice">
          <Link href="/practice">Ohne Anmeldung direkt in den Übungsmodus →</Link>
        </div>
      </div>
    </main>
  );
}
