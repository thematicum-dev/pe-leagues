import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getAccessContext } from "@/lib/access/context";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const ctx = await getAccessContext();
  if (!ctx) {
    redirect("/login?next=/access");
  }
  if (!ctx.profile) {
    redirect("/onboarding");
  }
  if (ctx.profile.accessStatus === "approved" && ctx.activeUniverse) {
    redirect("/dashboard");
  }

  const rejected = ctx.profile.accessStatus === "rejected";
  // Freigegeben, aber (noch) ohne zugeteiltes Universum. Für den Nutzer ist
  // das schlicht "noch nicht ganz fertig" -- von Universen ist hier bewusst
  // nicht die Rede, solange er nicht selbst in mehreren spielt.
  const approvedButIncomplete = ctx.profile.accessStatus === "approved";

  return (
    <main className="authwrap">
      <div className="authcard">
        <Logo />
        <h1>
          {rejected
            ? "Zugang abgelehnt"
            : approvedButIncomplete
              ? "Fast freigeschaltet"
              : "Zugang beantragt"}
        </h1>
        {rejected ? (
          <p>
            Dein Zugang wurde nicht freigegeben. Wenn du das für einen Irrtum hältst, wende dich
            bitte an den Administrator.
          </p>
        ) : approvedButIncomplete ? (
          <p>
            Dein Zugang ist bestätigt, die Freischaltung ist aber noch nicht abgeschlossen.
            Sobald der Administrator das erledigt hat, geht es hier weiter.
          </p>
        ) : (
          <p>
            Danke, {ctx.profile.displayName}. Deine Anfrage liegt beim Administrator. Sobald er
            dich freigegeben hat, kannst du dich anmelden und loslegen — wir schicken dir keine
            Erinnerung, schau einfach später noch einmal vorbei.
          </p>
        )}
        {ctx.profile.accessNote && (
          <p className="authhint">Nachricht des Administrators: {ctx.profile.accessNote}</p>
        )}
        <form action={signOut}>
          <button type="submit">Abmelden</button>
        </form>
        <div className="authlinks">
          <Link href="/access">Status neu laden</Link>
          <Link href="/practice">Übungsmodus</Link>
        </div>
      </div>
    </main>
  );
}
