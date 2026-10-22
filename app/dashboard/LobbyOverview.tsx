"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_HUMAN_ATTRS, type Attrs } from "@/lib/engine/constants";
import { FUND_PROFILE_POINTS } from "@/components/pel/ui";
import FundProfileFields, { pointsOf } from "@/components/FundProfileFields";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export interface LobbySummary {
  id: string;
  lobbyOpenedAt: string;
  occupancy: number;
}

export interface MySeasonSummary {
  id: string;
  status: "lobby" | "running";
  lobbyOpenedAt: string;
  occupancy: number;
}

/* Grenzen je Universum, durchgesetzt in join_season() und
   create_and_join_season() (Migration 20261022090000). Die Zahl der aktiven
   Partien kommt nicht von hier, sondern aus der live gehaltenen Liste. */
export interface SeasonLimits {
  activeMax: number;
  openedToday: number;
  openedMax: number;
}

// Von Universen ist in diesen Meldungen nur die Rede, wenn der Spieler
// überhaupt in mehreren unterwegs ist (showUniverse) -- sonst wäre es ein
// Begriff, den er nirgends sonst zu sehen bekommt.
function rpcErrorMessages(showUniverse: boolean): Record<string, string> {
  return {
    active_season_limit_reached: showUniverse
      ? "Du bist in diesem Universum bereits in drei aktiven Partien — mehr gehen nicht gleichzeitig."
      : "Du bist bereits in drei aktiven Partien — mehr gehen nicht gleichzeitig.",
    daily_season_limit_reached: "Du hast heute schon drei Partien eröffnet. Morgen geht es wieder.",
    already_member: "In dieser Partie bist du schon dabei.",
    profile_missing: "Bitte lege zuerst deinen Anzeigenamen fest.",
    access_not_approved: "Dein Zugang ist noch nicht freigegeben.",
    universe_not_granted: "Für diese Partie fehlt dir die Freigabe.",
    universe_inactive: showUniverse
      ? "In diesem Universum werden keine neuen Partien mehr eröffnet."
      : "Zurzeit können keine neuen Partien eröffnet werden.",
    season_not_joinable: "Diese Lobby ist nicht mehr offen — bitte versuch es erneut.",
    season_full: "Diese Lobby ist bereits voll.",
    season_not_found: "Diese Partie gibt es nicht mehr.",
    not_authenticated: "Bitte melde dich erneut an.",
    invalid_fund_attrs: "Die Punkteverteilung ist ungültig.",
  };
}

function friendlyError(message: string, showUniverse: boolean): string {
  for (const [key, text] of Object.entries(rpcErrorMessages(showUniverse))) {
    if (message.includes(key)) return text;
  }
  return "Das hat nicht geklappt. Bitte versuch es erneut.";
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Start läuft …";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Countdown({ lobbyOpenedAt }: { lobbyOpenedAt: string }) {
  const deadline = useMemo(() => new Date(lobbyOpenedAt).getTime() + TWELVE_HOURS_MS, [lobbyOpenedAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="mono">{formatRemaining(deadline - now)}</span>;
}

export default function LobbyOverview({
  initialMySeasons,
  initialOpenLobbies,
  limits,
  universeId,
  universeName,
  universeActive,
  showUniverse,
}: {
  initialMySeasons: MySeasonSummary[];
  initialOpenLobbies: LobbySummary[];
  limits: SeasonLimits;
  universeId: string;
  universeName: string;
  universeActive: boolean;
  showUniverse: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mySeasons, setMySeasons] = useState(initialMySeasons);
  const [openLobbies, setOpenLobbies] = useState(initialOpenLobbies);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sobald eine eigene Partie von "lobby" auf "running" wechselt (5 Spieler
  // erreicht oder 12-Stunden-Frist abgelaufen), direkt zu ihr weiterleiten --
  // aber nur bei diesem Übergang selbst, während man auf dem Dashboard sitzt.
  // Ohne den Vergleich mit dem vorigen Status würde das auch dann feuern, wenn
  // man das Dashboard einfach nur besucht, während eine eigene Partie schon
  // länger läuft (z. B. über den "Zum Dashboard"-Button aus dem Spiel) -- und
  // einen Sekunden später ungefragt zurück ins Spiel schicken.
  const prevStatusRef = useRef(new Map(initialMySeasons.map((s) => [s.id, s.status])));
  useEffect(() => {
    const prev = prevStatusRef.current;
    const started = mySeasons.find((s) => prev.get(s.id) === "lobby" && s.status === "running");
    prevStatusRef.current = new Map(mySeasons.map((s) => [s.id, s.status]));
    if (started) router.push(`/season/${started.id}`);
  }, [mySeasons, router]);

  useEffect(() => {
    const channel = supabase
      .channel("lobby-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "season_players" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { season_id?: string } | null;
          const seasonId = row?.season_id;
          if (!seasonId) return;

          const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
          if (delta === 0) return;

          setOpenLobbies((list) =>
            list.map((l) => (l.id === seasonId ? { ...l, occupancy: l.occupancy + delta } : l)),
          );
          setMySeasons((list) =>
            list.map((s) => (s.id === seasonId ? { ...s, occupancy: s.occupancy + delta } : s)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seasons" },
        (payload) => {
          const row = payload.new as
            | { id: string; status: string; lobby_opened_at: string; universe_id?: string }
            | undefined;

          // Partien fremder Universen gehen diese Übersicht nichts an. Die
          // Datenbank liefert sie ohnehin nicht aus (seasons_select), der
          // Vergleich hier ist die zweite, sichtbare Grenze.
          if (row?.universe_id && row.universe_id !== universeId) return;

          if (payload.eventType === "INSERT" && row?.status === "lobby") {
            setOpenLobbies((list) =>
              list.some((l) => l.id === row.id)
                ? list
                : [...list, { id: row.id, lobbyOpenedAt: row.lobby_opened_at, occupancy: 0 }],
            );
          }

          if (payload.eventType === "UPDATE" && row) {
            if (row.status !== "lobby") {
              setOpenLobbies((list) => list.filter((l) => l.id !== row.id));
            }
            // Beendete, abgebrochene oder aufgelöste Partien fallen aus der
            // Liste -- und geben damit einen der aktiven Plätze wieder frei.
            setMySeasons((list) =>
              row.status === "lobby" || row.status === "running"
                ? list.map((s) => (s.id === row.id ? { ...s, status: row.status as "lobby" | "running" } : s))
                : list.filter((s) => s.id !== row.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, universeId]);

  /* Beitritt in zwei Schritten: erst das Fondsprofil, dann der Beitritt mit
     diesem Profil. Vorher wurde das Profil erst im Lobby-Raum gewählt — der
     Beitritt, der die Lobby füllt, startet die Partie aber sofort, und der
     fünfte Spieler kam nie dazu. Siehe Migration 20261012090000. */
  const [joining, setJoining] = useState<{ kind: "join"; seasonId: string } | { kind: "create" } | null>(null);
  const [attrs, setAttrs] = useState<Attrs>({ ...DEFAULT_HUMAN_ATTRS });
  const pointsComplete = pointsOf(attrs) === FUND_PROFILE_POINTS;

  async function handleJoin(seasonId: string) {
    setError(null);
    setPending(true);
    const { error: rpcError } = await supabase.rpc("join_season", { p_season_id: seasonId, p_attrs: attrs });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message, showUniverse));
      return;
    }
    router.push(`/season/${seasonId}`);
  }

  async function handleCreate() {
    setError(null);
    setPending(true);
    const { data, error: rpcError } = await supabase.rpc("create_and_join_season", {
      p_universe_id: universeId,
      p_attrs: attrs,
    });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message, showUniverse));
      return;
    }
    if (data) router.push(`/season/${data}`);
  }

  if (joining) {
    const lobby = joining.kind === "join" ? openLobbies.find((l) => l.id === joining.seasonId) : null;
    return (
      <div className="dashcard dashcard-accent">
        <h2>{joining.kind === "create" ? "Neue Partie eröffnen" : `Partie ${joining.seasonId.slice(0, 8)} beitreten`}</h2>
        {error && <p className="autherror">{error}</p>}
        <div className="fundprofile">
          <h3>Fondsprofil</h3>
          <p className="dashsub">
            Verteile {FUND_PROFILE_POINTS} Punkte auf die Fähigkeiten deines Fonds. Die Entscheidung gilt
            für die gesamte Fondslaufzeit.
            {lobby && lobby.occupancy >= 4
              ? " Du bist der fünfte Spieler — mit deinem Beitritt startet die Partie sofort."
              : " Bis zum Start lässt sie sich in der Lobby noch ändern; sobald fünf Spieler beigetreten sind, startet die Partie."}
          </p>
          <FundProfileFields attrs={attrs} onChange={setAttrs} />
          <button
            className="btn-primary"
            disabled={!pointsComplete || pending}
            onClick={() => (joining.kind === "join" ? handleJoin(joining.seasonId) : handleCreate())}
          >
            {pending ? "Einen Moment …" : joining.kind === "join" ? "Mit diesem Profil beitreten" : "Mit diesem Profil eröffnen"}
          </button>
          {!pointsComplete && (
            <p className="dashsub fpnote">Erst wenn alle {FUND_PROFILE_POINTS} Punkte verteilt sind, geht es weiter.</p>
          )}
        </div>
        <div className="lobbyactions">
          <button className="btn-secondary" onClick={() => { setJoining(null); setError(null); }} disabled={pending}>
            Zurück
          </button>
        </div>
      </div>
    );
  }

  const atActiveLimit = mySeasons.length >= limits.activeMax;
  const openingsLeft = Math.max(0, limits.openedMax - limits.openedToday);

  return (
    <>
      {mySeasons.length > 0 && (
        <div className="dashcard dashcard-accent">
          <h2>
            {mySeasons.length === 1 ? "Deine Partie" : "Deine Partien"}
            {showUniverse ? ` · ${universeName}` : ""}
          </h2>
          {mySeasons.map((season) => (
            <div className="seasonrow" key={season.id}>
              <span>
                Partie {season.id.slice(0, 8)} · {season.occupancy} / 5
                {season.status === "lobby" && (
                  <>
                    {" · Start spätestens in "}
                    <Countdown lobbyOpenedAt={season.lobbyOpenedAt} />
                  </>
                )}
              </span>
              <span className="seasonstatus">{season.status === "running" ? "Läuft" : "Lobby offen"}</span>
              {/* Link statt <a>: Der Wechsel ins Spiel läuft dann innerhalb der
                  App und blendet über (app/template.tsx), statt die Seite neu
                  zu laden. */}
              <Link className="btn-secondary" href={`/season/${season.id}`}>
                Zur Partie
              </Link>
            </div>
          ))}
          <p className="dashsub">
            {mySeasons.length} von {limits.activeMax} Partien gleichzeitig belegt
          </p>
        </div>
      )}

      <div className={"dashcard" + (mySeasons.length === 0 ? " dashcard-accent" : "")}>
        <h2>Offene Partien{showUniverse ? ` · ${universeName}` : ""}</h2>
        {error && <p className="autherror">{error}</p>}
        {atActiveLimit ? (
          <p className="dashsub">
            Du spielst bereits {limits.activeMax} Partien gleichzeitig. Sobald eine davon endet, kannst du
            einer weiteren beitreten oder eine eröffnen.
          </p>
        ) : (
          <>
            {openLobbies.length === 0 && (
              <>
                <p className="dashsub">
                  {universeActive
                    ? showUniverse
                      ? "Aktuell ist in diesem Universum keine Lobby offen."
                      : "Aktuell ist keine Lobby offen."
                    : showUniverse
                      ? "Dieses Universum ist stillgelegt — hier werden keine neuen Partien mehr eröffnet."
                      : "Zurzeit können keine neuen Partien eröffnet werden."}
                </p>
                {universeActive && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={() => { setError(null); setJoining({ kind: "create" }); }}
                      disabled={pending || openingsLeft === 0}
                    >
                      {pending ? "Einen Moment …" : "Neue Partie eröffnen"}
                    </button>
                    <p className="dashsub">
                      {openingsLeft === 0
                        ? `Du hast heute schon ${limits.openedMax} Partien eröffnet. Morgen geht es wieder.`
                        : `Heute noch ${openingsLeft} von ${limits.openedMax} Eröffnungen frei.`}
                    </p>
                  </>
                )}
              </>
            )}
            {openLobbies.map((lobby) => (
              <div className="seasonrow" key={lobby.id}>
                <span>
                  Partie {lobby.id.slice(0, 8)} · {lobby.occupancy} / 5
                  {" · Start spätestens in "}
                  <Countdown lobbyOpenedAt={lobby.lobbyOpenedAt} />
                </span>
                <button className="btn-secondary" onClick={() => { setError(null); setJoining({ kind: "join", seasonId: lobby.id }); }} disabled={pending}>
                  {pending ? "Einen Moment …" : "Beitreten"}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
