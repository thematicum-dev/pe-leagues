import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ArchetypeKey } from "@/lib/engine/constants";
import { archetypeByKey } from "@/lib/engine/constants";
import type { FundState } from "@/lib/engine/types";

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby offen",
  running: "Läuft",
  finished: "Beendet",
  cancelled: "Geschlossen (zu wenige Spieler)",
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
    .select("id, status, current_half_year, lobby_opened_at")
    .eq("id", id)
    .maybeSingle();

  if (!season) {
    notFound();
  }

  const { data: players } = await supabase
    .from("season_players")
    .select("slot, is_ai, ai_archetype, profiles(display_name)")
    .eq("season_id", id)
    .order("slot", { ascending: true });

  const { data: initialState } = await supabase
    .from("season_state")
    .select("state")
    .eq("season_id", id)
    .eq("half_year", 0)
    .maybeSingle();

  const funds = (initialState?.state as { funds?: FundState[] } | null)?.funds ?? null;

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

        {season.status === "lobby" && (
          <p className="dashsub">
            Die Partie startet automatisch, sobald alle 5 Plätze belegt sind oder 12 Stunden nach
            Eröffnung — schau in der Zwischenzeit im Dashboard vorbei, dort läuft die Anzeige live.
          </p>
        )}

        {season.status === "cancelled" && (
          <p className="dashsub">
            Diese Lobby wurde geschlossen, weil kein menschlicher Spieler mehr übrig war.
          </p>
        )}

        {funds && (
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
