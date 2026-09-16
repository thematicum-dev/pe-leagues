/* Wegwerf-Harness (siehe .claude/skills/live/SKILL.md). Rendert die echte
   Spielansicht auf einem echten, durchgespielten Zustand — ohne Supabase und
   ohne Zugangsschranke. teardown.sh entfernt diesen Ordner wieder. */
import MultiplayerGame from "@/app/season/[id]/MultiplayerGame";
import { buildFixture } from "./fixture";

export const dynamic = "force-dynamic";

export default async function LivePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const hy = Math.min(20, Math.max(1, Number(sp.hy) || 8));
  const { state, history } = buildFixture(hy, sp.hold === "1");
  return (
    <MultiplayerGame
      seasonId="00000000-0000-0000-0000-000000000000"
      humanSlot={0}
      currentHalfYear={hy}
      deadline={new Date(Date.now() + 27 * 3600e3).toISOString()}
      serverNow={Date.now()}
      state={state}
      history={history}
      submissionStatus={{ humanCount: 2, submittedCount: 0, missingCount: 2 }}
      alreadySubmitted={false}
    />
  );
}
