import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="authwrap">
      <div className="authcard">
        <h1>Link ungültig oder abgelaufen</h1>
        <p>
          Dieser Bestätigungs- oder Reset-Link funktioniert nicht mehr. Fordere ihn bitte
          erneut an.
        </p>
        <div className="authlinks">
          <Link href="/login">Zur Anmeldung</Link>
          <Link href="/forgot-password">Passwort vergessen</Link>
        </div>
      </div>
    </main>
  );
}
