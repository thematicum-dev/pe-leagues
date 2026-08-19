import { requireAdmin } from "../adminAuth";
import { SECTOR_NAMES } from "@/lib/engine/constants";
import RegenerateTargetsForm from "./RegenerateTargetsForm";

export default async function AdminTargetsPage() {
  const { supabase } = await requireAdmin();

  const { data: rows } = await supabase.from("target_templates").select("sector, created_at");
  const total = rows?.length ?? 0;
  const bySector = new Map<string, number>();
  let lastGeneratedAt: string | null = null;
  for (const r of rows ?? []) {
    bySector.set(r.sector, (bySector.get(r.sector) ?? 0) + 1);
    if (!lastGeneratedAt || r.created_at > lastGeneratedAt) lastGeneratedAt = r.created_at;
  }

  return (
    <div className="dashcard">
      <h2>Zielunternehmen-Pool</h2>
      <p className="authhint">
        Aus diesem Pool zieht der Dealflow neuer Partien zufällig. Ist er für einen Sektor leer, greift
        automatisch der fest im Code hinterlegte Standard-Katalog — das Spiel bleibt also auch ohne
        Generierung uneingeschränkt spielbar.
      </p>
      <div className="dashsub" style={{ marginBottom: 14 }}>
        {total === 0 ? (
          <span>Noch nicht generiert — es gilt der Standard-Katalog.</span>
        ) : (
          <span>
            {total} aktive Zielunternehmen · zuletzt generiert am{" "}
            {lastGeneratedAt ? new Date(lastGeneratedAt).toLocaleString("de-DE") : "—"}
            <br />
            {(SECTOR_NAMES as readonly string[]).map((s) => `${s}: ${bySector.get(s) ?? 0}`).join(" · ")}
          </span>
        )}
      </div>
      <RegenerateTargetsForm />
    </div>
  );
}
