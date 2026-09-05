"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

// Von Universen ist in diesen Meldungen nur die Rede, wenn der Spieler
// überhaupt in mehreren unterwegs ist (showUniverse) -- sonst wäre es ein
// Begriff, den er nirgends sonst zu sehen bekommt.
function rpcErrorMessages(showUniverse: boolean): Record<string, string> {
  return {
    already_in_active_season: showUniverse
      ? "Du bist in diesem Universum bereits in einer aktiven Partie."
      : "Du bist bereits in einer aktiven Partie.",
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
  initialMySeason,
  initialOpenLobbies,
  universeId,
  universeName,
  universeActive,
  showUniverse,
}: {
  initialMySeason: MySeasonSummary | null;
  initialOpenLobbies: LobbySummary[];
  universeId: string;
  universeName: string;
  universeActive: boolean;
  showUniverse: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mySeason, setMySeason] = useState(initialMySeason);
  const [openLobbies, setOpenLobbies] = useState(initialOpenLobbies);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sobald sich der eigene Partie-Status auf "running" ändert (5 Spieler
  // erreicht oder 12-Stunden-Frist abgelaufen), direkt zur Partie
  // weiterleiten -- aber nur bei diesem Übergang selbst (lobby -> running),
  // während man auf dem Dashboard sitzt. Ohne den Vergleich mit dem vorigen
  // Status würde das auch dann feuern, wenn man das Dashboard einfach nur
  // besucht, während die eigene Partie schon länger läuft (z. B. über den
  // "Zum Dashboard"-Button aus dem Spiel) -- und einen Sekunden später
  // ungefragt zurück ins Spiel schicken.
  const prevStatusRef = useRef(initialMySeason?.status ?? null);
  useEffect(() => {
    if (prevStatusRef.current === "lobby" && mySeason?.status === "running") {
      router.push(`/season/${mySeason.id}`);
    }
    prevStatusRef.current = mySeason?.status ?? null;
  }, [mySeason, router]);

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
          setMySeason((s) => (s && s.id === seasonId ? { ...s, occupancy: s.occupancy + delta } : s));
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
            setMySeason((s) =>
              s && s.id === row.id ? { ...s, status: row.status as "lobby" | "running" } : s,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, universeId]);

  async function handleJoin(seasonId: string) {
    setError(null);
    setPending(true);
    const { error: rpcError } = await supabase.rpc("join_season", { p_season_id: seasonId });
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
    });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message, showUniverse));
      return;
    }
    if (data) router.push(`/season/${data}`);
  }

  if (mySeason) {
    return (
      <div className="dashcard dashcard-accent">
        <h2>Deine Partie{showUniverse ? ` · ${universeName}` : ""}</h2>
        <div className="seasonrow">
          <span>Partie {mySeason.id.slice(0, 8)}</span>
          <span className="seasonstatus">
            {mySeason.status === "running" ? "Läuft" : "Lobby offen"}
          </span>
        </div>
        <p className="dashsub">
          {mySeason.occupancy} / 5 Plätzen belegt
          {mySeason.status === "lobby" && (
            <>
              {" "}
              · Start spätestens in <Countdown lobbyOpenedAt={mySeason.lobbyOpenedAt} />
            </>
          )}
        </p>
        <a className="btn-primary" href={`/season/${mySeason.id}`}>
          Zur Partie
        </a>
      </div>
    );
  }

  return (
    <div className="dashcard dashcard-accent">
      <h2>Offene Partien{showUniverse ? ` · ${universeName}` : ""}</h2>
      {error && <p className="autherror">{error}</p>}
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
            <button className="btn-primary" onClick={handleCreate} disabled={pending}>
              {pending ? "Einen Moment …" : "Neue Partie eröffnen"}
            </button>
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
          <button className="btn-secondary" onClick={() => handleJoin(lobby.id)} disabled={pending}>
            {pending ? "Einen Moment …" : "Beitreten"}
          </button>
        </div>
      ))}
    </div>
  );
}
