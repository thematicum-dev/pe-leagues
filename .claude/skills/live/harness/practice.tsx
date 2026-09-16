/* Wegwerf-Harness (siehe .claude/skills/live/SKILL.md). Der Übungsmodus
   rechnet seine Halbjahre im Browser — anders als die Partie braucht er
   keinen Server, um weiterzuspielen. Genau dafür ist diese Route da: eine
   Maßnahme wirklich starten, Halbjahre abschließen und danach Berichte und
   Assetqualität ablesen. teardown.sh entfernt den Ordner wieder. */
import PeLeagues from "@/components/PeLeagues";

export const dynamic = "force-dynamic";

export default function LivePracticePage() {
  return <PeLeagues />;
}
