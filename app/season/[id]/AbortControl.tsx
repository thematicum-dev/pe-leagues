"use client";

/* Partie abbrechen, mitten im Spiel.

   Allein unter KI-Fonds bricht der Spieler sofort ab. Sitzen weitere Menschen
   in der Partie, wird daraus eine Anfrage: Alle übrigen müssen zustimmen,
   eine einzige Ablehnung lässt weiterspielen. Die Regeln und die Sperren
   liegen vollständig in der Datenbank (request_season_abort,
   respond_season_abort, Migration 20261022090100) — diese Komponente zeigt
   nur den Stand und reicht die Antworten durch.

   Der Abbruch selbst setzt die Partie auf 'cancelled'. Das bemerkt die
   Spielansicht über ihre eigene Realtime-Subscription auf seasons und lädt
   neu; danach zeigt die Seite den Abbruch-Hinweis statt des Spiels. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/components/pel/haptics";

interface AbortRequest {
  id: string;
  status: "pending" | "accepted" | "rejected";
  requestedByMe: boolean;
  requestedByName: string | null;
  decidedByMe: boolean;
  decidedByName: string | null;
  decidedAt: string | null;
  acceptedCount: number;
  acceptedByMe: boolean;
}

interface AbortStatus {
  humanCount: number;
  request: AbortRequest | null;
}

const ERRORS: Record<string, string> = {
  abort_already_pending: "Es läuft bereits eine Anfrage zum Abbruch.",
  no_pending_abort: "Die Anfrage ist inzwischen entschieden.",
  season_not_running: "Die Partie läuft nicht mehr.",
  not_a_member: "Du spielst in dieser Partie nicht mit.",
  not_authenticated: "Bitte melde dich erneut an.",
};

function friendlyError(message: string): string {
  for (const [key, text] of Object.entries(ERRORS)) {
    if (message.includes(key)) return text;
  }
  return "Das hat nicht geklappt — bitte versuch es erneut.";
}

// Hinweise auf eine abgelehnte Anfrage zeigen wir nur eine Weile und nur,
// bis der Spieler sie weggeklickt hat.
const REJECTION_NOTICE_MS = 3 * 24 * 60 * 60 * 1000;
const seenKey = (requestId: string) => `pel-abort-seen-${requestId}`;

function readSeen(requestId: string): boolean {
  try {
    return window.localStorage.getItem(seenKey(requestId)) === "1";
  } catch {
    return false;
  }
}

export default function AbortControl({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<AbortStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Die abgelehnte Anfrage, auf die gerade hingewiesen wird. Beim Laden
  // bestimmt statt beim Rendern: Ob sie noch frisch und ungelesen ist, hängt
  // an der Uhr und an localStorage.
  const [rejectionId, setRejectionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc("season_abort_status", { p_season_id: seasonId });
    if (rpcError || !data) return;
    const next = data as AbortStatus;
    const r = next.request;
    setStatus(next);
    setRejectionId(
      r?.status === "rejected"
        && !r.decidedByMe
        && r.decidedAt != null
        && Date.now() - new Date(r.decidedAt).getTime() < REJECTION_NOTICE_MS
        && !readSeen(r.id)
        ? r.id
        : null,
    );
  }, [supabase, seasonId]);

  useEffect(() => {
    /* Erstabruf nach dem Mounten. Die Regel sieht ein setState im Effekt;
       tatsächlich setzt load() den Zustand erst mit der Antwort des Servers —
       genau das Abgleichen mit einem externen System, für das Effekte da
       sind. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const channel = supabase
      .channel(`season-abort-${seasonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "season_abort_requests", filter: `season_id=eq.${seasonId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "season_abort_votes", filter: `season_id=eq.${seasonId}` },
        () => load(),
      )
      .subscribe();
    // Rückfall für mobile Browser, die Websockets im Hintergrund pausieren —
    // dieselbe Begründung wie beim Halbjahreswechsel in MultiplayerGame.
    const id = setInterval(load, 30_000);
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [supabase, seasonId, load]);

  async function afterRpc(result: unknown) {
    if (result === "aborted") {
      haptic("success");
      router.refresh();
      return;
    }
    await load();
  }

  async function requestAbort() {
    setError(null);
    setPending(true);
    const { data, error: rpcError } = await supabase.rpc("request_season_abort", { p_season_id: seasonId });
    setPending(false);
    setConfirming(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
      await load();
      return;
    }
    await afterRpc(data);
  }

  async function respond(accept: boolean) {
    setError(null);
    setPending(true);
    const { data, error: rpcError } = await supabase.rpc("respond_season_abort", {
      p_season_id: seasonId,
      p_accept: accept,
    });
    setPending(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
      await load();
      return;
    }
    await afterRpc(data);
  }

  function dismissRejection(requestId: string) {
    try {
      window.localStorage.setItem(seenKey(requestId), "1");
    } catch { /* Speicher nicht verfügbar — dann eben nur für diese Sitzung */ }
    setRejectionId(null);
  }

  if (!status) return null;

  const { humanCount, request } = status;
  const solo = humanCount <= 1;
  const open = request?.status === "pending" ? request : null;
  const mustAnswer = open != null && !open.requestedByMe && !open.acceptedByMe;
  const rejection = request != null && request.id === rejectionId ? request : null;

  return (
    <>
      <div className="card">
        <div className="pad" style={{ paddingTop: 16 }}>
          {error && <p className="autherror" style={{ marginBottom: 10 }}>{error}</p>}

          {rejection && (
            <div style={{ marginBottom: 12 }}>
              <p className="hint">
                {rejection.requestedByMe
                  ? <><b>{rejection.decidedByName ?? "Ein Mitspieler"}</b> hat deinen Abbruch abgelehnt — die Partie läuft weiter.</>
                  : rejection.decidedByName && rejection.decidedByName === rejection.requestedByName
                    ? <><b>{rejection.requestedByName}</b> hat die Anfrage zum Abbruch zurückgezogen.</>
                    : <><b>{rejection.decidedByName ?? "Ein Mitspieler"}</b> hat den Abbruch abgelehnt — die Partie läuft weiter.</>}
              </p>
              <button style={{ marginTop: 8, padding: "6px 12px", fontSize: 12.5 }} onClick={() => dismissRejection(rejection.id)}>
                Verstanden
              </button>
            </div>
          )}

          {open ? (
            <>
              <p className="hint">
                {open.requestedByMe
                  ? <>Du hast vorgeschlagen, die Partie abzubrechen.</>
                  : <><b>{open.requestedByName ?? "Ein Mitspieler"}</b> möchte die Partie abbrechen.</>}{" "}
                {open.acceptedCount} von {humanCount} sind dafür. Abgebrochen wird erst, wenn alle zustimmen;
                bis dahin läuft die Partie normal weiter.
              </p>
              {open.requestedByMe && (
                <button style={{ width: "100%", marginTop: 10 }} disabled={pending} onClick={() => respond(false)}>
                  {pending ? "Einen Moment …" : "Anfrage zurückziehen"}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="hint">
                {solo
                  ? "Du spielst als einziger Mensch gegen KI-Fonds und kannst die Partie jederzeit beenden. Sie wird dann nicht gewertet."
                  : humanCount === 2
                    ? "Abbrechen geht nur gemeinsam: Dein Mitspieler wird gefragt; bei einer Ablehnung wird weitergespielt."
                    : `Abbrechen geht nur gemeinsam: Die ${humanCount - 1} anderen Mitspieler werden gefragt; lehnt einer ab, wird weitergespielt.`}
              </p>
              <button className="ox" style={{ width: "100%", marginTop: 10 }} disabled={pending}
                onClick={() => { setError(null); setConfirming(true); }}>
                {solo ? "Partie abbrechen" : "Abbruch vorschlagen"}
              </button>
            </>
          )}
        </div>
      </div>

      {confirming && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Partie abbrechen"
          onClick={() => !pending && setConfirming(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="infgrip" />
            <div className="infsheet">
              <h4 className="it disp">{solo ? "Partie wirklich abbrechen?" : "Abbruch vorschlagen?"}</h4>
              <div className="ib">
                {solo
                  ? "Die Partie endet sofort und wird nicht gewertet. Das lässt sich nicht rückgängig machen."
                  : "Deine Mitspieler werden gefragt. Stimmen alle zu, endet die Partie ohne Wertung; lehnt einer ab, geht sie weiter."}
              </div>
              <button className="ox ic" style={{ width: "100%" }} disabled={pending} onClick={requestAbort}>
                {pending ? "Einen Moment …" : solo ? "Ja, abbrechen" : "Ja, Abbruch vorschlagen"}
              </button>
              <button className="ic" style={{ width: "100%", marginTop: 10 }} disabled={pending} onClick={() => setConfirming(false)}>
                Weiterspielen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Die Nachfrage an die übrigen Mitspieler. Kein Wegklicken über den
          Hintergrund: Sie verlangt eine Antwort. */}
      {mustAnswer && open && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-label="Abbruch der Partie">
          <div className="sheet">
            <div className="infgrip" />
            <div className="infsheet">
              <h4 className="it disp">Partie abbrechen?</h4>
              <div className="ib">
                <b>{open.requestedByName ?? "Ein Mitspieler"}</b> möchte die Partie abbrechen.
                Stimmen alle zu, endet sie sofort und wird nicht gewertet. Lehnst du ab, wird weitergespielt.
                {" "}{open.acceptedCount} von {humanCount} sind bisher dafür.
              </div>
              {error && <p className="autherror" style={{ marginTop: 10 }}>{error}</p>}
              <button className="ox ic" style={{ width: "100%" }} disabled={pending} onClick={() => respond(true)}>
                {pending ? "Einen Moment …" : "Zustimmen"}
              </button>
              <button className="solid ic" style={{ width: "100%", marginTop: 10 }} disabled={pending} onClick={() => respond(false)}>
                Ablehnen und weiterspielen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
