import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ArchetypeKey } from "@/lib/engine/constants";
import { archetypeByKey } from "@/lib/engine/constants";
import type { FundState } from "@/lib/engine/types";
import TurnPanel from "./TurnPanel";
import LobbyRoom from "./LobbyRoom";

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby offen",
  running: "Läuft",
  finished: "Beendet",
  cancelled: "Geschlossen",
};

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: season } = await supabase
    .from("seasons")
    .select(
      "id, status, current_half_year, current_half_year_deadline, lobby_opened_at, final_ranking, created_by, cancelled_reason",
    )
    .eq("id", id)
    .maybeSingle();

  if (!season) {
    notFound();
  }

  const { data: players } = await supabase
    .from("season_players")
    .select("id, slot, profile_id, is_ai, ai_archetype, profiles(display_name)")
    .eq("season_id", id)
    .order("slot", { ascending: true });

  const humanSlot = (players ?? []).find((p) => p.profile_id === user.id)?.slot ?? null;

  const { data: initialState } = await supabase
    .from("season_state")
    .select("state")
    .eq("season_id", id)
    .eq("half_year", 0)
    .maybeSingle();

  const funds = (initialState?.state as { funds?: FundState[] } | null)?.funds ?? null;

  let currentDeals: unknown[] = [];
  let submissionStatus = { humanCount: 0, submittedCount: 0, missingCount: 0 };
  let alreadySubmitted = false;

  if (season.status === "running" && humanSlot != null) {
    const { data: latestState } = await supabase
      .from("season_state")
      .select("state")
      .eq("season_id", id)
      .eq("half_year", season.current_half_year - 1)
      .maybeSingle();
    currentDeals = ((latestState?.state as { deals?: unknown[] } | null)?.deals ?? []) as unknown[];

    const { data: statusData } = await supabase
      .rpc("season_submission_status", { p_season_id: id })
      .maybeSingle();
    const statusRow = statusData as {
      human_count: number; submitted_count: number; missing_count: number; i_have_submitted: boolean;
    } | null;
    if (statusRow) {
      submissionStatus = {
        humanCount: statusRow.human_count,
        submittedCount: statusRow.submitted_count,
        missingCount: statusRow.missing_count,
      };
      alreadySubmitted = statusRow.i_have_submitted;
    }
  }

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Partie {season.id.slice(0, 8)}</h1>
            <div className="dashsub">
              {STATUS_LABEL[season.status] ?? season.status}
              {season.status === "running" && ` · Halbjahr ${season.current_half_year}`}
            </div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>

        {(season.status === "lobby" || season.status === "cancelled") && (
          <LobbyRoom
            seasonId={season.id}
            currentUserId={user.id}
            lobbyOpenedAt={season.lobby_opened_at}
            initialStatus={season.status}
            initialCancelledReason={season.cancelled_reason}
            initialCreatedBy={season.created_by}
            initialPlayers={(players ?? [])
              .filter((p) => !p.is_ai && p.profile_id)
              .map((p) => {
                const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                return {
                  id: p.id,
                  slot: p.slot,
                  profileId: p.profile_id as string,
                  displayName: profile?.display_name ?? "Spieler",
                };
              })}
          />
        )}

        {(season.status === "running" || season.status === "finished") && (
          <div className="dashcard">
            <h2>Fondsplätze</h2>
            {(players ?? []).map((p) => {
              const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
              const archetype = p.is_ai ? archetypeByKey(p.ai_archetype as ArchetypeKey) : null;
              return (
                <div className="seasonrow" key={p.slot}>
                  <span>Platz {p.slot}</span>
                  <span>
                    {p.is_ai
                      ? `${archetype?.name ?? p.ai_archetype} (KI, ${archetype?.style ?? ""})`
                      : (profile?.display_name ?? "Spieler")}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {season.status === "running" && (
          <TurnPanel
            seasonId={season.id}
            humanSlot={humanSlot}
            currentHalfYear={season.current_half_year}
            deadline={season.current_half_year_deadline}
            deals={currentDeals as never[]}
            initialSubmitted={alreadySubmitted}
            initialStatus={submissionStatus}
          />
        )}

        {season.status === "finished" && Array.isArray(season.final_ranking) && (
          <div className="dashcard">
            <h2>Endstand</h2>
            {(season.final_ranking as { slot: number; name: string; score: number; tvpi: number; irr: number }[]).map(
              (r, i) => (
                <div className="seasonrow" key={r.slot}>
                  <span>
                    {i + 1}. {r.name}
                  </span>
                  <span className="mono">
                    Score {r.score.toFixed(2)} · TVPI {r.tvpi.toFixed(2)}× · IRR {(r.irr * 100).toFixed(1)} %
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        {season.status === "lobby" && funds && (
          <div className="dashcard">
            <h2>Ausgangszustand (Halbjahr 0)</h2>
            {funds.map((f) => (
              <div className="seasonrow" key={f.slot}>
                <span>
                  Platz {f.slot} · {f.name}
                </span>
                <span className="mono">{f.cash} Mio. € Kapital</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
