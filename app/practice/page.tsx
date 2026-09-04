import { requireAccess } from "@/lib/access/context";
import PeLeagues from "@/components/PeLeagues";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  // Dieselbe Schranke wie für den restlichen Spielbereich: angemeldet,
  // Profil vorhanden, vom Admin freigegeben, mindestens ein Universum
  // zugeteilt. Die Middleware fängt nur den fehlenden Login ab.
  //
  // Ohne next-Ziel: nach der Anmeldung geht es aufs Dashboard, nicht zurück
  // in den Übungsmodus.
  await requireAccess();

  return <PeLeagues />;
}
