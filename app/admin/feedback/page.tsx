import { requireAdmin } from "../adminAuth";

interface FeedbackRow {
  id: string;
  created_at: string;
  rating: number;
  comment: string | null;
  profile_id: string;
  display_name: string | null;
  email: string | null;
}

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
});

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function AdminFeedbackPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_feedback");
  const rows = (data ?? []) as FeedbackRow[];

  const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : null;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: rows.filter((r) => r.rating === n).length }));

  return (
    <>
      <div className="dashsection">
        <h2>Feedback</h2>
        <span className="dashsub">
          {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"}
          {avg != null ? ` · Ø ${avg.toFixed(2).replace(".", ",")} Sterne` : ""}
        </span>
      </div>

      {error && <p className="autherror">Feedback konnte nicht geladen werden: {error.message}</p>}

      {rows.length > 0 && (
        <div className="dashcard">
          <h2>Verteilung</h2>
          {dist.map(({ n, count }) => (
            <div className="feedbackdist" key={n}>
              <span className="feedbackstars">{stars(n)}</span>
              <span className="feedbackbar">
                <span style={{ width: `${(count / rows.length) * 100}%` }} />
              </span>
              <span className="mono">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dashcard">
        {rows.length === 0 && !error && (
          <p className="dashsub" style={{ paddingTop: 16 }}>Noch kein Feedback eingegangen.</p>
        )}
        {rows.map((r) => (
          <div className="feedbackentry" key={r.id}>
            <div className="feedbackhead">
              <span className="feedbackstars" aria-label={`${r.rating} von 5 Sternen`}>{stars(r.rating)}</span>
              <span className="dashsub">
                {r.display_name ?? "—"}{r.email ? ` · ${r.email}` : ""} · {dateFmt.format(new Date(r.created_at))}
              </span>
            </div>
            {r.comment ? (
              <p className="feedbacktext">{r.comment}</p>
            ) : (
              <p className="dashsub">Ohne Kommentar</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
