import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/access/context";
import type { RuntimeState } from "@/lib/engine/turnTypes";
import type { Attrs } from "@/lib/engine/constants";
import MultiplayerGame from "./MultiplayerGame";
import LobbyRoom from "./LobbyRoom";
import { SeasonDrivers } from "@/components/pel/ui";

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
  }

  /* Endstand: der eigene Fonds im Schlusszustand. Der Abschlussbildschirm
     rechnet daraus die Value Bridge — sie braucht nicht nur die realisierten
     Deals, sondern auch abgerufenes Kapital, Ausschüttungen und Markt, weil
     sie auf dieselbe Größe schließt wie TVPI und Wertung. */
  let myFund: RuntimeState["funds"][number] | null = null;
  let finalMarket: RuntimeState["market"] | null = null;
  let finalHalfYear = 0;
  if (season.status === "finished" && humanSlot != null) {
    const { data: finalRow } = await supabase
      .from("season_state")
      .select("state, half_year")
      .eq("season_id", id)
      .order("half_year", { ascending: false })
      .limit(1)
      .maybeSingle();
    const fin = finalRow?.state as RuntimeState | undefined;
    myFund = fin?.funds?.find((f) => f.slot === humanSlot) ?? null;
    finalMarket = fin?.market ?? null;
    finalHalfYear = finalRow?.half_year ?? 0;
  }

  return (
    <main className="dashwrap">
      <div className="dashinner">
        {season.status !== "running" && (
          <div className="dashheader">
            <div>
              <h1>Partie {season.id.slice(0, 8)}</h1>
              <div className="dashsub">
                {STATUS_LABEL[season.status] ?? season.status}
              </div>
            </div>
            <Link href="/dashboard" className="btn-secondary">
              Zum Dashboard
            </Link>
          </div>
        )}

        {(season.status === "lobby" || season.status === "cancelled") && (
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
            state={latestState}
            history={history}
            submissionStatus={submissionStatus}
            alreadySubmitted={alreadySubmitted}
          />
        )}

        {season.status === "finished" && Array.isArray(season.final_ranking) && (
          <div className="pel dark">
            <style dangerouslySetInnerHTML={{ __html: FINISHED_CSS }} />
            <div className="wrap" style={{ maxWidth: 520, margin: "0 auto" }}>
              <div className="tomb" style={{ margin: "24px 16px" }}>
                <div className="sub">Fondslaufzeit beendet</div>
                <div className="amt">
                  {(season.final_ranking as { score: number }[])[0]?.score.toFixed(2) ?? "—"}
                </div>
                <div className="sub">Höchste Wertung der Kohorte</div>
              </div>
              <div className="card">
                <h3 className="disp">Endstand</h3>
                {(season.final_ranking as { slot: number; name: string; score: number; tvpi: number; irr: number }[]).map(
                  (r, i) => (
                    <div className="lb" key={r.slot}>
                      <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                      <span className="nm">{r.name}</span>
                      <span className="mo" style={{ color: r.score >= 1 ? "var(--teal)" : "var(--ox)" }}>
                        {r.score.toFixed(2)}
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="card">
                <div className="pad" style={{ paddingTop: 16 }}>
                  {(season.final_ranking as { slot: number; name: string; score: number; tvpi: number; irr: number }[]).map((r) => (
                    <p key={r.slot} className="hint" style={{ marginBottom: 6 }}>
                      <b>{r.name}</b> — TVPI {r.tvpi.toFixed(2)}× · IRR {(r.irr * 100).toFixed(1).replace(".", ",")} %
                    </p>
                  ))}
                </div>
              </div>
              <SeasonDrivers fund={myFund} market={finalMarket} quarter={finalHalfYear} title="Woher deine Rendite kam" />
              <div style={{ margin: "18px 16px 40px" }}>
                <Link href="/dashboard" className="btn-primary" style={{ display: "block", textAlign: "center" }}>
                  Zum Dashboard
                </Link>
              </div>
            </div>
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

// Minimaler Ausschnitt aus dem .pel-Stylesheet, nur für die statischen Klassen
// (tomb/card/lb), die der Endstand-Bildschirm braucht — der volle Satz lebt
// in components/pel/ui.tsx und wird dort geladen, sobald die Partie läuft.
const FINISHED_CSS = `
.pel{--paper:#0C1214;--card:#161F22;--ink:#EDF1EE;--ink2:#8E9C9B;--rule:#243033;--ox:#E3897F;--teal:#5FC4B1;--gold:#DCB264;--panel:#080D0F;--onpanel:#EDF1EE;--glow:rgba(0,0,0,.4);font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--paper);min-height:100%;}
.pel *{box-sizing:border-box;}
.pel .disp{font-weight:600;letter-spacing:-.025em;}
.pel .card{background:var(--card);border:1px solid var(--rule);margin:14px 16px;border-radius:10px;}
.pel .card h3{margin:0;padding:18px 16px 10px;font-size:17px;}
.pel .pad{padding:0 16px 16px;}
.pel .hint{font-size:13px;line-height:1.55;color:var(--ink2);}
.pel .tomb{background:var(--panel);color:var(--onpanel);padding:20px 16px;text-align:center;border:1px solid var(--panel);position:relative;}
.pel .tomb .amt{font-size:40px;font-weight:600;letter-spacing:-.035em;margin:8px 0 5px;}
.pel .tomb .sub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);}
.pel .lb{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--rule);}
.pel .lb .rk{font-size:16px;width:20px;}
.pel .lb .nm{flex:1;font-size:13px;}
.pel .lb .mo{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;}
.pel .btn-primary{display:inline-block;text-decoration:none;}
.pel .mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;}
.pel .eyebrow{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);font-weight:600;}
/* Treiberbalken und Erklär-Punkte für die Value Bridge auf dem Endstand —
   Ausschnitt aus dem vollen Stylesheet in components/pel/ui.tsx. */
.pel .drv{display:flex;flex-direction:column;gap:7px;}
.pel .drvrow{display:flex;align-items:center;gap:8px;}
.pel .drvlab{font-size:11.5px;color:var(--ink2);width:88px;flex:none;}
.pel .drvtrack{position:relative;flex:1;height:12px;min-width:0;background:#1C282B;}
.pel .drvzero{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--rule);}
.pel .drvbar{position:absolute;top:1px;bottom:1px;min-width:1px;}
.pel .drvbar.pos{background:var(--teal);}
.pel .drvbar.neg{background:var(--ox);}
.pel .drvval{font-size:11.5px;width:78px;flex:none;text-align:right;}
.pel .infb{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;
  border-radius:50%;border:1px solid var(--rule);background:transparent;color:var(--ink2);
  font-size:9.5px;font-weight:700;font-family:inherit;line-height:1;padding:0;margin-left:5px;
  vertical-align:middle;cursor:pointer;flex:none;}
.pel .infb.on{background:var(--gold);border-color:var(--gold);color:var(--panel);}
.pel .modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:40;display:flex;
  align-items:flex-end;justify-content:center;}
.pel .sheet{background:var(--paper);width:100%;max-width:520px;max-height:92vh;overflow:auto;
  border-radius:16px 16px 0 0;}
.pel .infgrip{width:34px;height:4px;border-radius:2px;background:var(--rule);margin:10px auto 4px;}
.pel .infsheet{padding:20px 18px 26px;}
.pel .infsheet .it{font-size:15px;font-weight:600;letter-spacing:-.015em;margin:0 0 10px;}
.pel .infsheet .ib{font-size:13.5px;line-height:1.65;color:var(--ink2);}
.pel .infsheet .ib b{color:var(--ink);font-weight:600;}
.pel .infsheet .ic{width:100%;margin-top:18px;font-family:inherit;font-size:13px;cursor:pointer;
  padding:11px 18px;border:1px solid var(--rule);background:var(--card);color:var(--ink);border-radius:8px;}
`;
