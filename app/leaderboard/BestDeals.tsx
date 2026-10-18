/* Die zweite Tabelle der Rangliste: bester Deal je abgeschlossener Partie
   (best_deals(), Migration 39), nach MOIC gerankt. Der IRR ist aus MOIC und
   Haltedauer annualisiert und fehlt, wenn sich die Haltedauer aus den
   Halbjahresständen nicht ablesen lässt. Eigene Komponente, damit sie sich
   ohne Datenbank ansehen lässt. */
export interface BestDealRow {
  season_id: string;
  finished_at: string;
  profile_id: string;
  display_name: string;
  deal_name: string;
  moic: number;
  hold_half_years: number | null;
  irr: number | null;
}

function fmtMoic(v: number): string {
  return v.toFixed(2) + "×";
}
function fmtIrr(v: number | null): string {
  return v == null ? "—" : (v * 100).toFixed(1).replace(".", ",") + " %";
}

export default function BestDeals({ deals, error }: { deals: BestDealRow[]; error: string | null }) {
  return (
    <div className="dashcard">
      <h2>Beste Einzeldeals</h2>
      <div className="dashsub" style={{ marginBottom: 8 }}>
        Je abgeschlossener Partie der Deal mit dem höchsten MOIC, nach MOIC gerankt. IRR aus MOIC und
        Haltedauer annualisiert.
      </div>
      {error && <p className="autherror">{error}</p>}
      {deals.length === 0 && !error && (
        <div className="quiet">Noch kein realisierter Deal in einer abgeschlossenen Partie.</div>
      )}
      {deals.map((d, i) => (
        /* Kennzahlen immer rechts daneben: .seasonrow bricht sonst um, sobald
           Spieler- und Firmenname zusammen länger werden. */
        <div className="seasonrow" key={d.season_id} style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <div>
              <span className="mono" style={{ marginRight: 8, opacity: 0.6 }}>
                {["🥇", "🥈", "🥉"][i] ?? i + 1}
              </span>
              {d.display_name}
            </div>
            <div className="dashsub">
              {d.deal_name}
              {d.hold_half_years != null ? ` · ${d.hold_half_years} Halbjahre gehalten` : ""}
            </div>
          </div>
          <div className="mono" style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
            <div>{fmtMoic(Number(d.moic))}</div>
            <div className="dashsub">IRR {fmtIrr(d.irr == null ? null : Number(d.irr))}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
