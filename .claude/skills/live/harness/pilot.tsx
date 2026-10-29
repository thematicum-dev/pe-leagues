/* Wegwerf-Harness (siehe .claude/skills/live/SKILL.md): die Mehrspieleransicht
   auf einem Stand wie in einer echten Partie (Plätze 1 bis 5). Parameter:
   hy (Halbjahr), slot (wessen Sicht, 1 bis 3), seed, idle=1 (der Platz gibt
   ab Halbjahr hy−3 nichts mehr ab, damit Gebote und Shortlists offen sind). */
import MultiplayerGame from "@/app/season/[id]/MultiplayerGame";
import { buildPilotFixture } from "../pilotFixture";

export const dynamic = "force-dynamic";

export default async function PilotPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const hy = Math.min(20, Math.max(1, Number(sp.hy) || 8));
  const slot = [1, 2, 3].includes(Number(sp.slot)) ? Number(sp.slot) : 1;
  const idle = sp.idle === "1" ? { slot, from: Math.max(1, hy - 3) } : null;
  const { state, history } = buildPilotFixture(hy, Number(sp.seed) || undefined, idle);
  return (
    <MultiplayerGame
      seasonId={"11111111-1111-1111-1111-11111111111" + slot}
      humanSlot={slot}
      currentHalfYear={hy}
      deadline={new Date(Date.now() + 27 * 3600e3).toISOString()}
      serverNow={Date.now()}
      state={state}
      history={history}
      submissionStatus={{ humanCount: 3, submittedCount: 0, missingCount: 3 }}
      alreadySubmitted={false}
    />
  );
}
