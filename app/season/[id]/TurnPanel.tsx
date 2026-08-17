"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* Sammelt die Abgabe eines Spielers für das laufende Halbjahr und schickt
   sie mit "Halbjahr abschließen" auf einmal ab (turn_submissions). Danach
   ist der Spieler für dieses Halbjahr gesperrt und sieht nur noch den
   Wartezustand: wie viele Mitspieler noch fehlen und wie lange es bis zur
   Frist ist. Die eigentliche Auswertung (Auktion, Maßnahmen, Personal,
   Markt) läuft ausschließlich serverseitig (siehe
   supabase/functions/evaluate-seasons) — dieses Formular sendet
   ausdrücklich nur Absichten (welcher Deal, welches Multiple, welches
   Leverage, welche Due Diligence), niemals abgeleitete Werte.

   Bewusst außerhalb dieses Formulars: Maßnahmen, Personalsuche/-einstellung
   und aktive Exits. Der Server (lib/engine/runQuarter) unterstützt bereits
   den vollen Entscheidungsraum (siehe lib/engine/turnTypes.ts); dieses
   Formular deckt den Kernkreislauf "bieten, Halbjahr abschließen" ab. */

interface Deal {
  id: string;
  name: string;
  sector: string;
  type: string;
  askMult: number;
  levCap: number;
  revenue: number;
  margin: number;
  quality: number;
}

export interface TurnPanelProps {
  seasonId: string;
  humanSlot: number | null;
  currentHalfYear: number;
  deadline: string | null;
  deals: Deal[];
  initialSubmitted: boolean;
  initialStatus: {
    humanCount: number;
    submittedCount: number;
    missingCount: number;
  };
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Frist läuft ab …";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Countdown({ deadline }: { deadline: string }) {
  const target = useMemo(() => new Date(deadline).getTime(), [deadline]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="mono">{formatRemaining(target - now)}</span>;
}

export default function TurnPanel({
  seasonId, humanSlot, currentHalfYear, deadline, deals, initialSubmitted, initialStatus,
}: TurnPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [status, setStatus] = useState(initialStatus);
  const [bids, setBids] = useState<Record<string, { multiple: string; leverage: string; dd: boolean }>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const { data } = await supabase
      .rpc("season_submission_status", { p_season_id: seasonId })
      .maybeSingle();
    const row = data as {
      current_half_year: number; human_count: number; submitted_count: number; missing_count: number;
    } | null;
    if (!row) return;
    setStatus({
      humanCount: row.human_count, submittedCount: row.submitted_count, missingCount: row.missing_count,
    });
    // Ein neues Halbjahr (oder Partieende) ist am zuverlässigsten daran zu
    // erkennen, dass sich current_half_year gegenüber dem serverseitig
    // gerenderten Stand verändert hat -- dann die Seite neu laden.
    if (row.current_half_year !== currentHalfYear) {
      router.refresh();
    }
  }, [supabase, seasonId, currentHalfYear, router]);

  // Solange man selbst gesperrt ist (abgegeben, wartet auf die Mitspieler),
  // regelmäßig nachfragen -- turn_submissions ist bewusst nicht per Realtime
  // freigegeben (private Abgaben), der aggregierte Status schon.
  useEffect(() => {
    if (!submitted) return;
    const id = setInterval(refreshStatus, 15_000);
    return () => clearInterval(id);
  }, [submitted, refreshStatus]);

  useEffect(() => {
    const channel = supabase
      .channel(`season-${seasonId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seasons", filter: `id=eq.${seasonId}` },
        (payload) => {
          const row = payload.new as { current_half_year?: number } | undefined;
          if (row?.current_half_year != null && row.current_half_year !== currentHalfYear) {
            router.refresh();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, seasonId, currentHalfYear, router]);

  if (humanSlot == null) return null;

  if (deadline == null) {
    return (
      <div className="dashcard">
        <p className="dashsub">Halbjahr {currentHalfYear} wird vorbereitet …</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="dashcard">
        <h2>Halbjahr {currentHalfYear} abgeschlossen</h2>
        <p className="dashsub">
          {status.submittedCount} / {status.humanCount} Mitspieler:innen haben abgegeben
          {status.missingCount > 0 && ` · noch ${status.missingCount} offen`}
        </p>
        <p className="dashsub">
          Frist in <Countdown deadline={deadline} /> — ausgewertet wird, sobald alle abgegeben haben oder
          spätestens zur Frist.
        </p>
      </div>
    );
  }

  function updateBid(dealId: string, patch: Partial<{ multiple: string; leverage: string; dd: boolean }>) {
    setBids((b) => ({
      ...b,
      [dealId]: { multiple: "", leverage: "", dd: false, ...b[dealId], ...patch },
    }));
  }

  async function handleSubmit() {
    setError(null);
    setPending(true);

    const bidList = Object.entries(bids)
      .filter(([, v]) => v.multiple.trim() !== "")
      .map(([dealId, v]) => ({
        dealId,
        multiple: Number(v.multiple),
        leverage: Number(v.leverage || "0"),
      }))
      .filter((b) => Number.isFinite(b.multiple) && Number.isFinite(b.leverage));

    const dueDiligence = Object.entries(bids)
      .filter(([, v]) => v.dd)
      .map(([dealId]) => dealId);

    const payload = {
      ...(bidList.length ? { bids: bidList } : {}),
      ...(dueDiligence.length ? { dueDiligence } : {}),
    };

    const { error: insertError } = await supabase.from("turn_submissions").insert({
      season_id: seasonId,
      half_year: currentHalfYear,
      profile_id: (await supabase.auth.getUser()).data.user?.id,
      payload,
    });

    setPending(false);
    if (insertError) {
      // 23505 = unique_violation: turn_submissions_unique(season_id, half_year,
      // profile_id) hat einen Doppel-Klick abgefangen -- die Abgabe von vorhin
      // steht bereits, es ist nichts verlorengegangen.
      if (insertError.code === "23505") {
        setSubmitted(true);
        refreshStatus();
        return;
      }
      setError("Das hat nicht geklappt — bitte versuch es erneut.");
      return;
    }
    setSubmitted(true);
    refreshStatus();
  }

  return (
    <div className="dashcard">
      <h2>Halbjahr {currentHalfYear} · Dealflow</h2>
      <p className="dashsub">
        Frist in <Countdown deadline={deadline} /> — {status.submittedCount} / {status.humanCount} Mitspieler:innen
        haben bereits abgegeben.
      </p>
      {error && <p className="autherror">{error}</p>}

      {deals.length === 0 && <p className="dashsub">Kein Dealflow in diesem Halbjahr.</p>}

      {deals.map((d) => {
        const b = bids[d.id] ?? { multiple: "", leverage: "", dd: false };
        return (
          <div className="seasonrow dealrow" key={d.id}>
            <div>
              <div>
                <b>{d.name}</b> · {d.sector} {d.type === "prop" ? "· Off-Market" : ""}
              </div>
              <div className="dashsub mono">
                EBITDA-Marge {d.margin.toFixed(1)} % · Preiserwartung {d.askMult.toFixed(1)}× · Debt Capacity{" "}
                {d.levCap.toFixed(1)}×
              </div>
            </div>
            <div className="dashform">
              <label>
                Multiple
                <input
                  type="number" step="0.1" min="0" className="bidinput"
                  value={b.multiple}
                  onChange={(e) => updateBid(d.id, { multiple: e.target.value })}
                />
              </label>
              <label>
                Leverage
                <input
                  type="number" step="0.1" min="0" max={d.levCap} className="bidinput"
                  value={b.leverage}
                  onChange={(e) => updateBid(d.id, { leverage: e.target.value })}
                />
              </label>
              <label className="ddcheck">
                <input
                  type="checkbox" checked={b.dd}
                  onChange={(e) => updateBid(d.id, { dd: e.target.checked })}
                />
                Due Diligence
              </label>
            </div>
          </div>
        );
      })}

      <button className="btn-primary" onClick={handleSubmit} disabled={pending} style={{ marginTop: 12 }}>
        {pending ? "Wird abgeschickt …" : "Halbjahr abschließen"}
      </button>
    </div>
  );
}
