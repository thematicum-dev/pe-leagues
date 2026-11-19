import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/access/context";
import type { RuntimeState, TurnDecisions } from "@/lib/engine/turnTypes";
import type { Attrs } from "@/lib/engine/constants";
import MultiplayerGame from "./MultiplayerGame";
import { rosterFromRows, type SubmissionRosterEntry } from "./submissionRoster";
import LobbyRoom from "./LobbyRoom";
import SeasonReportView from "./SeasonReportView";
import { loadSeasonReport } from "./seasonReport";

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby offen",
  running: "Läuft",
  finished: "Beendet",
  cancelled: "Geschlossen",
};

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Dieselbe Schranke wie auf dem Dashboard. Partien fremder Universen sind
  // darüber hinaus schon durch RLS unsichtbar (seasons_select) und landen
  // deshalb unten in notFound().
  const { supabase, user } = await requireAccess(`/season/${id}`);

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
    .select("id, slot, profile_id, is_ai, ai_archetype, fund_attrs, profiles(display_name)")
    .eq("season_id", id)
    .order("slot", { ascending: true });

  const humanSlot = (players ?? []).find((p) => p.profile_id === user.id)?.slot ?? null;
  const ownFundAttrs = ((players ?? []).find((p) => p.profile_id === user.id)?.fund_attrs ?? null) as Attrs | null;

  const { data: initialState } = await supabase
    .from("season_state")
    .select("state")
    .eq("season_id", id)
    .eq("half_year", 0)
    .maybeSingle();

  const funds = (initialState?.state as { funds?: RuntimeState["funds"] } | null)?.funds ?? null;

  let latestState: RuntimeState | null = null;
  let history: { halfYear: number; market: RuntimeState["market"]; funds: RuntimeState["funds"] }[] = [];
  let submissionStatus = { humanCount: 0, submittedCount: 0, missingCount: 0 };
  let alreadySubmitted = false;
  /* Die eigene Abgabe des laufenden Halbjahres, falls es sie schon gibt. Die
     Spielansicht zeigt sie in der Wartezeit an (Gebote auf den Deal-Karten,
     Vormerkungen an den Beteiligungen) und braucht sie als Ausgangspunkt,
     wenn die Abgabe bis zur Frist noch einmal bearbeitet wird. Lesbar ist
     ausschließlich die eigene Zeile (Policy turn_submissions_select_own). */
  let submittedPayload: TurnDecisions | null = null;
  /* Wer von den Mitspielern schon abgegeben hat (Namen für die Warteleiste). */
  let submissionRoster: SubmissionRosterEntry[] = [];

  if (season.status === "running" && humanSlot != null) {
    const { data: stateRows } = await supabase
      .from("season_state")
      .select("half_year, state")
      .eq("season_id", id)
      .lte("half_year", season.current_half_year - 1)
      .order("half_year", { ascending: true });

    history = (stateRows ?? []).map((row) => {
      const s = row.state as RuntimeState;
      return { halfYear: row.half_year as number, market: s.market, funds: s.funds };
    });
    latestState = (stateRows?.length ? (stateRows[stateRows.length - 1].state as RuntimeState) : null);

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
    const { data: rosterData } = await supabase.rpc("season_submission_roster", { p_season_id: id });
    submissionRoster = rosterFromRows(rosterData);
    if (alreadySubmitted) {
      const { data: own } = await supabase
        .from("turn_submissions")
        .select("payload")
        .eq("season_id", id)
        .eq("half_year", season.current_half_year)
        .eq("profile_id", user.id)
        .maybeSingle();
      submittedPayload = (own?.payload as TurnDecisions | null) ?? null;
    }
  }

  /* Abschlussauswertung: bei beendeten Partien der Endstand, bei
     abgebrochenen der Stand nach dem letzten ausgewerteten Halbjahr. Beide
     sind über das Profil (/profile) jederzeit wieder aufrufbar. */
  const aborted = season.status === "cancelled" && season.cancelled_reason === "aborted";
  const report = season.status === "finished" || aborted
    ? await loadSeasonReport(supabase, id, aborted ? "aborted" : "final", season.final_ranking, humanSlot)
    : null;

  return (
    <main className="dashwrap">
      <div className="dashinner">
        {season.status !== "running" && (
          <div className="dashheader">
            <div>
              <h1>Partie {season.id.slice(0, 8)}</h1>
              <div className="dashsub">
                {season.cancelled_reason === "aborted" ? "Abgebrochen" : STATUS_LABEL[season.status] ?? season.status}
              </div>
            </div>
            <Link href={report ? "/profile" : "/dashboard"} className="btn-secondary">
              {report ? "Deine Partien" : "Zum Dashboard"}
            </Link>
          </div>
        )}

        {(season.status === "lobby" || (season.status === "cancelled" && !report)) && (
          <LobbyRoom
            seasonId={season.id}
            currentUserId={user.id}
            lobbyOpenedAt={season.lobby_opened_at}
            initialStatus={season.status}
            initialCancelledReason={season.cancelled_reason}
            initialCreatedBy={season.created_by}
            initialFundAttrs={ownFundAttrs}
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

        {season.status === "running" && humanSlot != null && latestState && (
          <MultiplayerGame
            // Erzwingt einen kompletten Neu-Mount, sobald der Server ein
            // neues Halbjahr liefert: MultiplayerGame hält lokalen State
            // (u. a. "submitted", vorgemerkte Gebote/Maßnahmen), der sich
            // sonst über router.refresh() hinweg hält, weil React ohne
            // wechselnden key dieselbe Komponenteninstanz weiterverwendet.
            // Ohne diesen Reset blieb die Ansicht nach einem abgeschlossenen
            // Halbjahr auf dem Wartebildschirm hängen, bis man manuell zum
            // Dashboard und zurück navigiert hat.
            key={season.current_half_year}
            seasonId={season.id}
            humanSlot={humanSlot}
            currentHalfYear={season.current_half_year}
            deadline={season.current_half_year_deadline}
            /* Erstabgleich der Uhr ohne eigene Anfrage: Diese Seite wird
               serverseitig gerendert, ihre Uhrzeit ist damit schon da. Der
               Countdown rechnet den Versatz zur Uhr des Browsers daraus aus
               und gleicht danach stündlich über /api/time nach.

               Die Regel react-hooks/purity gilt hier bewusst nicht: Sie
               bewacht wiederholbare Renderdurchläufe im Browser. Dies ist eine
               Server-Komponente, die je Anfrage genau einmal läuft und deren
               Aufgabe unter anderem darin besteht, den Zustand des Servers --
               hier seine Uhr -- an den Browser zu übergeben. Ein Zwischen-
               speichern findet nicht statt, die Seite ist dynamisch. */
            // eslint-disable-next-line react-hooks/purity
            serverNow={Date.now()}
            state={latestState}
            history={history}
            submissionStatus={submissionStatus}
            alreadySubmitted={alreadySubmitted}
            submittedPayload={submittedPayload}
            submissionRoster={submissionRoster}
          />
        )}

        {report && <SeasonReportView report={report} />}

        {season.status === "finished" && !report && (
          <div className="dashcard">
            <h2>Auswertung nicht verfügbar</h2>
            <p className="dashsub">Für diese Partie liegt kein Endstand vor.</p>
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
