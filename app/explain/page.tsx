import { requireAccess } from "@/lib/access/context";
import ExplainMode from "@/components/ExplainMode";

export const dynamic = "force-dynamic";

export default async function ExplainPage() {
  // Dieselbe Schranke wie für den restlichen Spielbereich: angemeldet,
  // Profil vorhanden, vom Admin freigegeben, mindestens ein Universum
  // zugeteilt. Die Middleware fängt nur den fehlenden Login ab.
  //
  // Ohne next-Ziel: nach der Anmeldung geht es aufs Dashboard, nicht zurück
  // in die Einführung.
  await requireAccess();

  return <ExplainMode />;
}
