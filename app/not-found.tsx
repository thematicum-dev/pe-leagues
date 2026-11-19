import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Nicht gefunden" };

export default function NotFound() {
  return (
    <main className="authwrap">
      <div className="authcard">
        <Logo />
        <h1>Diese Seite gibt es nicht</h1>
        <p>
          Der Link ist veraltet oder vertippt. Eine Partie, die aufgelöst oder abgebrochen wurde, ist unter
          ihrer alten Adresse nicht mehr erreichbar.
        </p>
        <div className="authlinks">
          <Link href="/dashboard">Zum Dashboard</Link>
          <Link href="/">Startseite</Link>
        </div>
      </div>
    </main>
  );
}
