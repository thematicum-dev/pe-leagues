import Link from "next/link";

/* Feedback in zwei Ebenen: oben verdichtet (Kennzahlen, Verteilung,
   Verlauf, je Spieler), darunter die einzelnen Abgaben. Jede Zahl oben ist
   ein Link, der die Liste darunter filtert; jede Abgabe öffnet ihre
   Einzelansicht. Alles über Query-Parameter, damit sich ein Drilldown als
   Link weitergeben lässt und die Seite ohne Client-JavaScript auskommt. */

export interface FeedbackRow {
  id: string;
  created_at: string;
  rating: number;
  comment: string | null;
  profile_id: string;
  display_name: string | null;
  email: string | null;
}

type Period = "7" | "30" | "90" | "all";
interface Filters {
  period: Period;
  rating?: number;
  player?: string;
  text?: boolean;
  id?: string;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "7", label: "7 Tage" },
  { key: "30", label: "30 Tage" },
  { key: "90", label: "90 Tage" },
  { key: "all", label: "Gesamt" },
];

const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
});
const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
const monthFmt = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric", timeZone: "Europe/Berlin" });
const monthKeyFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Berlin" });

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const de = (v: number, d = 1) => v.toFixed(d).replace(".", ",");
const avgOf = (rows: FeedbackRow[]) => (rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : null);
const playerName = (r: FeedbackRow) => r.display_name ?? r.email ?? "Unbekannt";

function href(f: Filters, change: Partial<Filters>): string {
  const n = { ...f, ...change };
  const q = new URLSearchParams();
  if (n.period !== "all") q.set("period", n.period);
  if (n.rating) q.set("rating", String(n.rating));
  if (n.player) q.set("player", n.player);
  if (n.text) q.set("text", "1");
  if (n.id) q.set("id", n.id);
  const s = q.toString();
  return `/admin/feedback${s ? `?${s}` : ""}`;
}

// Server-Komponente: pro Anfrage einmal gerendert, Date.now() ist hier gewollt.
function filterPeriod(rows: FeedbackRow[], period: Period): FeedbackRow[] {
  if (period === "all") return rows;
  const since = Date.now() - Number(period) * 86_400_000;
  return rows.filter((r) => new Date(r.created_at).getTime() >= since);
}

function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const period = one("period");
  const rating = Number(one("rating"));
  return {
    period: period === "7" || period === "30" || period === "90" ? period : "all",
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    player: one("player") || undefined,
    text: one("text") === "1" || undefined,
    id: one("id") || undefined,
  };
}

export default function FeedbackOverview({
  rows: all,
  searchParams,
  error,
}: {
  rows: FeedbackRow[];
  searchParams: Record<string, string | string[] | undefined>;
  error?: string;
}) {
  const f = parseFilters(searchParams);
  // Zeitraum gilt für die gesamte Seite, die übrigen Filter nur für die Liste.
  const inPeriod = filterPeriod(all, f.period);

  const avg = avgOf(inPeriod);
  const withText = inPeriod.filter((r) => r.comment);
  const players = new Set(inPeriod.map((r) => r.profile_id));
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: inPeriod.filter((r) => r.rating === n).length }));
  const maxDist = Math.max(1, ...dist.map((d) => d.count));

  // Verlauf je Kalendermonat (neueste zuerst)
  const months = new Map<string, FeedbackRow[]>();
  for (const r of inPeriod) {
    const k = monthKeyFmt.format(new Date(r.created_at));
    months.set(k, [...(months.get(k) ?? []), r]);
  }
  const monthRows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  // Je Spieler
  const byPlayer = new Map<string, FeedbackRow[]>();
  for (const r of inPeriod) byPlayer.set(r.profile_id, [...(byPlayer.get(r.profile_id) ?? []), r]);
  const playerRows = [...byPlayer.entries()]
    .map(([id, rows]) => ({ id, name: playerName(rows[0]), email: rows[0].email, count: rows.length, avg: avgOf(rows)!, last: rows[0].created_at }))
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));

  const list = inPeriod.filter(
    (r) => (!f.rating || r.rating === f.rating) && (!f.player || r.profile_id === f.player) && (!f.text || r.comment),
  );

  const selected = f.id ? all.find((r) => r.id === f.id) : undefined;
  const selectedOthers = selected ? all.filter((r) => r.profile_id === selected.profile_id && r.id !== selected.id) : [];
  const filterPlayerName = f.player ? (all.find((r) => r.profile_id === f.player) ?? null) : null;
  const hasListFilter = Boolean(f.rating || f.player || f.text);

  return (
    <>
      <div className="dashsection">
        <h2>Feedback</h2>
        <span className="dashsub">Verdichtet und je Abgabe</span>
      </div>

      {error && <p className="autherror">Feedback konnte nicht geladen werden: {error}</p>}

      <nav className="fbchips" aria-label="Zeitraum">
        {PERIODS.map((p) => (
          <Link key={p.key} href={href(f, { period: p.key, id: undefined })} className={"fbchip" + (f.period === p.key ? " on" : "")}>
            {p.label}
          </Link>
        ))}
      </nav>

      {/* ---------- Einzelansicht ---------- */}
      {selected && (
        <div className="dashcard fbdetail" id="detail">
          <div className="fbdetailhead">
            <h2>Abgabe vom {dateTimeFmt.format(new Date(selected.created_at))}</h2>
            <Link href={href(f, { id: undefined })} className="fbclose" aria-label="Einzelansicht schließen">✕</Link>
          </div>
          <div className="fbbigstars" aria-label={`${selected.rating} von 5 Sternen`}>{stars(selected.rating)}</div>
          <div className="dashsub">
            <Link href={href(f, { player: selected.profile_id, id: undefined })}>{playerName(selected)}</Link>
            {selected.email && selected.display_name ? ` · ${selected.email}` : ""}
          </div>
          {selected.comment ? (
            <p className="feedbacktext fbfull">{selected.comment}</p>
          ) : (
            <p className="dashsub">Ohne Kommentar</p>
          )}
          {selectedOthers.length > 0 && (
            <>
              <h3 className="fbsub">Weitere Abgaben dieses Spielers ({selectedOthers.length})</h3>
              {selectedOthers.map((r) => (
                <Link key={r.id} href={href(f, { id: r.id })} className="fbrow">
                  <span className="feedbackstars">{stars(r.rating)}</span>
                  <span className="fbrowtext">{r.comment ?? <em className="dashsub">Ohne Kommentar</em>}</span>
                  <span className="dashsub">{dateFmt.format(new Date(r.created_at))}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
      {f.id && !selected && !error && <p className="autherror">Diese Abgabe gibt es nicht (mehr).</p>}

      {/* ---------- Aggregiert ---------- */}
      <div className="profstats fbstats">
        <div className="profstat">
          <span className="profstatv">{inPeriod.length}</span>
          <span className="profstatl">Abgaben</span>
        </div>
        <div className="profstat">
          <span className="profstatv">{avg != null ? de(avg, 2) : "—"}</span>
          <span className="profstatl">Ø Sterne</span>
        </div>
        <div className="profstat">
          <span className="profstatv">{players.size}</span>
          <span className="profstatl">Spieler</span>
        </div>
        <Link href={href(f, { text: true, id: undefined })} className="profstat fbstatlink">
          <span className="profstatv">{inPeriod.length ? `${Math.round((withText.length / inPeriod.length) * 100)} %` : "—"}</span>
          <span className="profstatl">Mit Text</span>
        </Link>
      </div>

      {inPeriod.length > 0 && (
        <>
          <div className="dashcard">
            <h2>Verteilung</h2>
            {dist.map(({ n, count }) => (
              <Link
                href={href(f, { rating: f.rating === n ? undefined : n, id: undefined })}
                className={"feedbackdist fbdistlink" + (f.rating === n ? " on" : "")}
                key={n}
                title={`Nur ${n}-Sterne-Abgaben zeigen`}
              >
                <span className="feedbackstars">{stars(n)}</span>
                <span className="feedbackbar">
                  <span style={{ width: `${(count / maxDist) * 100}%` }} />
                </span>
                <span className="mono fbnum">
                  {count} <span className="dashsub">· {Math.round((count / inPeriod.length) * 100)} %</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="dashcard">
            <h2>Verlauf je Monat</h2>
            <div className="fbtable">
              <div className="fbthead"><span>Monat</span><span>Abgaben</span><span>Ø Sterne</span></div>
              {monthRows.map(([k, rows]) => (
                <div className="fbtr" key={k}>
                  <span>{monthFmt.format(new Date(`${k}-15T12:00:00Z`))}</span>
                  <span className="mono">{rows.length}</span>
                  <span className="mono">{de(avgOf(rows)!, 2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dashcard">
            <h2>Je Spieler</h2>
            <div className="fbtable">
              <div className="fbthead"><span>Spieler</span><span>Abgaben</span><span>Ø Sterne</span></div>
              {playerRows.map((p) => (
                <Link
                  key={p.id}
                  href={href(f, { player: f.player === p.id ? undefined : p.id, id: undefined })}
                  className={"fbtr fbtrlink" + (f.player === p.id ? " on" : "")}
                >
                  <span className="fbplayer">
                    {p.name}
                    <span className="dashsub">zuletzt {dateFmt.format(new Date(p.last))}</span>
                  </span>
                  <span className="mono">{p.count}</span>
                  <span className="mono">{de(p.avg, 2)}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------- Einzelne Abgaben ---------- */}
      <div className="dashsection">
        <h2>Abgaben</h2>
        <span className="dashsub">{list.length} von {inPeriod.length}</span>
      </div>

      <div className="fbchips">
        {f.rating && (
          <Link href={href(f, { rating: undefined })} className="fbchip on">{f.rating} ★ ✕</Link>
        )}
        {f.player && (
          <Link href={href(f, { player: undefined })} className="fbchip on">
            {filterPlayerName ? playerName(filterPlayerName) : "Spieler"} ✕
          </Link>
        )}
        <Link href={href(f, { text: f.text ? undefined : true })} className={"fbchip" + (f.text ? " on" : "")}>
          Nur mit Text{f.text ? " ✕" : ""}
        </Link>
        {hasListFilter && (
          <Link href={href(f, { rating: undefined, player: undefined, text: undefined })} className="fbchip">
            Filter zurücksetzen
          </Link>
        )}
      </div>

      <div className="dashcard">
        {list.length === 0 && !error && (
          <p className="dashsub" style={{ paddingTop: 16 }}>
            {all.length === 0 ? "Noch kein Feedback eingegangen." : "Keine Abgaben für diese Auswahl."}
          </p>
        )}
        {list.map((r) => (
          <Link key={r.id} href={`${href(f, { id: r.id })}#detail`} className={"feedbackentry fbentrylink" + (r.id === f.id ? " on" : "")}>
            <div className="feedbackhead">
              <span className="feedbackstars" aria-label={`${r.rating} von 5 Sternen`}>{stars(r.rating)}</span>
              <span className="dashsub">{playerName(r)} · {dateTimeFmt.format(new Date(r.created_at))}</span>
            </div>
            {r.comment ? (
              <p className="feedbacktext fbclamp">{r.comment}</p>
            ) : (
              <p className="dashsub">Ohne Kommentar</p>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
