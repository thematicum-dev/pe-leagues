"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Bitte melde dich erneut an.",
  season_not_found: "Diese Partie gibt es nicht mehr.",
  not_a_member: "Du bist kein Teil dieser Lobby (mehr).",
  season_not_leavable: "Die Partie läuft schon — Austreten ist nicht mehr möglich.",
  not_creator: "Das darfst nur der Ersteller dieser Partie.",
  season_not_deletable: "Die Partie läuft schon und kann nicht mehr entfernt werden.",
  season_not_startable: "Die Partie läuft bereits.",
};

function friendlyError(message: string): string {
  for (const [key, text] of Object.entries(RPC_ERROR_MESSAGES)) {
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

interface LobbyPlayer {
  id: string;
  slot: number;
  profileId: string;
  displayName: string;
}

export interface LobbyRoomProps {
  seasonId: string;
  currentUserId: string;
  lobbyOpenedAt: string;
  initialStatus: "lobby" | "cancelled";
  initialCancelledReason: string | null;
  initialCreatedBy: string;
  initialPlayers: LobbyPlayer[];
}

export default function LobbyRoom({
  seasonId,
  currentUserId,
  lobbyOpenedAt,
  initialStatus,
  initialCancelledReason,
  initialCreatedBy,
  initialPlayers,
}: LobbyRoomProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"lobby" | "cancelled" | "running">(initialStatus);
  const [cancelledReason, setCancelledReason] = useState(initialCancelledReason);
  const [createdBy, setCreatedBy] = useState(initialCreatedBy);
  const [players, setPlayers] = useState<LobbyPlayer[]>(initialPlayers);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMember = players.some((p) => p.profileId === currentUserId);
  const isCreator = createdBy === currentUserId;
  const humanCount = players.length;
  const aiCount = Math.max(0, 5 - humanCount);

  useEffect(() => {
    if (status === "running") {
      router.refresh();
    }
  }, [status, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`lobby-room-${seasonId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "season_players", filter: `season_id=eq.${seasonId}` },
        async (payload) => {
          const row = payload.new as { id: string; slot: number; profile_id: string | null; is_ai: boolean };
          if (row.is_ai || !row.profile_id) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.profile_id)
            .maybeSingle();
          setPlayers((list) =>
            list.some((p) => p.id === row.id)
              ? list
              : [
                  ...list,
                  {
                    id: row.id,
                    slot: row.slot,
                    profileId: row.profile_id as string,
                    displayName: profile?.display_name ?? "Spieler",
                  },
                ],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "season_players", filter: `season_id=eq.${seasonId}` },
        (payload) => {
          const row = payload.old as { id: string };
          setPlayers((list) => list.filter((p) => p.id !== row.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seasons", filter: `id=eq.${seasonId}` },
        (payload) => {
          const row = payload.new as { status: string; created_by: string; cancelled_reason: string | null };
          setStatus(row.status as "lobby" | "cancelled" | "running");
          setCreatedBy(row.created_by);
          setCancelledReason(row.cancelled_reason);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, seasonId]);

  const handleLeave = useCallback(async () => {
    setError(null);
    setPending(true);
    const { error: rpcError } = await supabase.rpc("leave_season", { p_season_id: seasonId });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
      return;
    }
    router.push("/dashboard");
  }, [supabase, seasonId, router]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Wirklich entfernen? Alle Mitspieler verlieren ihren Platz in dieser Lobby.")) return;
    setError(null);
    setPending(true);
    const { error: rpcError } = await supabase.rpc("delete_season", { p_season_id: seasonId });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
    }
  }, [supabase, seasonId]);

  const handleForceStart = useCallback(async () => {
    const confirmText = `Sofort starten mit ${humanCount} Spieler${humanCount === 1 ? "" : "n"} und ${aiCount} KI-Fonds?`;
    if (!window.confirm(confirmText)) return;
    setError(null);
    setPending(true);
    const { error: rpcError } = await supabase.rpc("force_start_season", { p_season_id: seasonId });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
    }
  }, [supabase, seasonId, humanCount, aiCount]);

  if (status === "running") {
    return <p className="dashsub">Die Partie startet …</p>;
  }

  if (status === "cancelled") {
    return (
      <div className="dashcard">
        <h2>Lobby geschlossen</h2>
        <p className="dashsub">
          {cancelledReason === "creator_deleted"
            ? "Diese Partie wurde vom Ersteller aufgelöst."
            : "Diese Lobby wurde geschlossen, weil kein menschlicher Spieler mehr übrig war."}
        </p>
        <a className="btn-primary" href="/dashboard">
          Zurück zum Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="dashcard">
      <h2>Lobby</h2>
      {error && <p className="autherror">{error}</p>}
      {players.map((p) => (
        <div className="seasonrow" key={p.id}>
          <span>Platz {p.slot}</span>
          <span>
            {p.displayName}
            {p.profileId === createdBy && " · Ersteller"}
            {p.profileId === currentUserId && " · du"}
          </span>
        </div>
      ))}
      <p className="dashsub">
        {humanCount} / 5 Plätzen belegt · Start spätestens in <Countdown lobbyOpenedAt={lobbyOpenedAt} />
      </p>
      {isMember && (
        <button className="btn-secondary" onClick={handleLeave} disabled={pending}>
          {pending ? "Einen Moment …" : "Lobby verlassen"}
        </button>
      )}
      {isCreator && (
        <>
          <button className="btn-secondary" onClick={handleForceStart} disabled={pending}>
            {pending ? "Einen Moment …" : `Sofort starten (${humanCount} Spieler, ${aiCount} KI-Fonds)`}
          </button>
          <button className="btn-secondary" onClick={handleDelete} disabled={pending}>
            {pending ? "Einen Moment …" : "Season entfernen"}
          </button>
        </>
      )}
    </div>
  );
}
