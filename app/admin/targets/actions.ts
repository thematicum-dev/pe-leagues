"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../adminAuth";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { SECTOR_NAMES } from "@/lib/engine/constants";

const MODEL = "claude-sonnet-5";
const BATCH_SIZE = 20;
const MAX_TOTAL = 1000;
const MAX_FAILED_BATCHES = 3;

// Dieselbe Risikoflaggen-Vokabel wie im fest codierten BOOK-Katalog (lib/
// engine/engine.ts) -- ANGLES/isAngle() dort kennt "Buy-&-Build-Plattform"
// als Sonderfall, alles andere ist reines Risiko. Generierte Flaggen, die
// nicht in dieser Liste stehen, werden verworfen statt ungeprüft gespeichert.
const ALLOWED_FLAGS = [
  "Kundenkonzentration",
  "Margendruck",
  "Nachfolgesituation",
  "Investitionsstau",
  "Buy-&-Build-Plattform",
];

interface GeneratedTemplate {
  sector: string;
  name_parts: string[];
  description: string;
  capex_pct: number;
  nwc_pct: number;
  margin_min: number;
  margin_max: number;
  growth_min: number;
  growth_max: number;
  revenue_min: number;
  revenue_max: number;
  leverage_min: number;
  leverage_max: number;
  quality_min: number;
  quality_max: number;
  flags: string[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidTemplate(t: unknown): t is GeneratedTemplate {
  if (!t || typeof t !== "object") return false;
  const r = t as Record<string, unknown>;
  if (typeof r.sector !== "string" || !(SECTOR_NAMES as string[]).includes(r.sector)) return false;
  if (!Array.isArray(r.name_parts) || r.name_parts.length < 1 || !r.name_parts.every((s) => typeof s === "string")) return false;
  if (typeof r.description !== "string" || r.description.length < 10) return false;
  const nums = [
    r.capex_pct, r.nwc_pct, r.margin_min, r.margin_max, r.growth_min, r.growth_max,
    r.revenue_min, r.revenue_max, r.leverage_min, r.leverage_max, r.quality_min, r.quality_max,
  ];
  if (!nums.every(isFiniteNumber)) return false;
  if ((r.margin_max as number) < (r.margin_min as number)) return false;
  if ((r.growth_max as number) < (r.growth_min as number)) return false;
  if ((r.revenue_max as number) < (r.revenue_min as number)) return false;
  if ((r.leverage_max as number) < (r.leverage_min as number)) return false;
  if ((r.quality_max as number) < (r.quality_min as number)) return false;
  if (!Array.isArray(r.flags)) return false;
  return true;
}

function sanitize(t: GeneratedTemplate): GeneratedTemplate {
  return { ...t, flags: t.flags.filter((f) => ALLOWED_FLAGS.includes(f)).slice(0, 2) };
}

async function generateBatch(apiKey: string, count: number): Promise<GeneratedTemplate[]> {
  const prompt = `Du erstellst Spieldaten für ein Private-Equity-Simulationsspiel (DACH-Mittelstand-Buyouts). ` +
    `Erzeuge genau ${count} fiktive, plausible Zielunternehmen-Archetypen als JSON-Array, gleichmäßig über diese ` +
    `Sektoren verteilt: ${(SECTOR_NAMES as readonly string[]).join(", ")}.\n\n` +
    `Jedes Element hat exakt diese Felder:\n` +
    `- sector: einer der obigen Sektornamen\n` +
    `- name_parts: 1-2 kurze deutsche Branchenbegriffe (Array von Strings), z. B. ["Dichtungstechnik", "Polymertechnik"]\n` +
    `- description: 1-2 Sätze deutsche Geschäftsmodell-Beschreibung im Stil eines Investment-Memos\n` +
    `- capex_pct: Investitionsquote in % vom Umsatz (Zahl, typisch 1-12)\n` +
    `- nwc_pct: Working-Capital-Quote in % vom Umsatz (Zahl, kann negativ sein, typisch -5 bis 35)\n` +
    `- margin_min / margin_max: EBITDA-Marge in % (Zahlen, typisch zwischen 4 und 40)\n` +
    `- growth_min / growth_max: Umsatzwachstum p.a. in % (Zahlen, typisch zwischen -2 und 22)\n` +
    `- revenue_min / revenue_max: Umsatzband in Mio. EUR (Zahlen, typisch zwischen 10 und 200)\n` +
    `- leverage_min / leverage_max: Verschuldungskapazität als Vielfaches EBITDA (Zahlen, typisch 2.5-5.5)\n` +
    `- quality_min / quality_max: Qualitätsscore 0-100 (Zahlen)\n` +
    `- flags: 0-2 Einträge ausschließlich aus dieser Liste: ${ALLOWED_FLAGS.map((f) => `"${f}"`).join(", ")}\n\n` +
    `Antworte AUSSCHLIESSLICH mit dem JSON-Array, ohne Erklärtext, ohne Markdown-Codeblock.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API antwortete mit Status ${res.status}`);
  }
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Antwort enthielt keine erkennbare JSON-Liste.");
  }
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  return parsed.filter(isValidTemplate).map(sanitize);
}

export interface RegenerateResult {
  error: string | null;
  inserted: number;
  requested: number;
  warnings: string[];
}

export async function regenerateTargetsAction(_prev: unknown, formData: FormData): Promise<RegenerateResult> {
  await requireAdmin();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      error:
        "ANTHROPIC_API_KEY ist nicht gesetzt. Im Hosting (z. B. Vercel-Projekteinstellungen) unter Umgebungsvariablen eintragen und neu deployen.",
      inserted: 0, requested: 0, warnings: [],
    };
  }

  const requested = Math.min(MAX_TOTAL, Math.max(20, Number(formData.get("count")) || 200));
  const batchId = randomUUID();
  const db = createAdminClient();

  let inserted = 0;
  const warnings: string[] = [];
  let failedBatches = 0;

  while (inserted < requested && failedBatches < MAX_FAILED_BATCHES) {
    const size = Math.min(BATCH_SIZE, requested - inserted);
    try {
      const templates = await generateBatch(apiKey, size);
      if (templates.length === 0) {
        warnings.push("Ein Batch lieferte keine gültigen Einträge und wurde übersprungen.");
        failedBatches++;
        continue;
      }
      const rows = templates.map((t) => ({ ...t, batch_id: batchId }));
      const { error: insertError } = await db.from("target_templates").insert(rows);
      if (insertError) throw insertError;
      inserted += templates.length;
    } catch (err) {
      warnings.push(err instanceof Error ? err.message : String(err));
      failedBatches++;
    }
  }

  if (inserted > 0) {
    // Alten Bestand erst jetzt löschen, nachdem der neue vollständig
    // geschrieben ist -- eine abgebrochene Generierung lässt den bisherigen
    // Pool unangetastet, das Spiel bleibt jederzeit spielbar.
    await db.from("target_templates").delete().neq("batch_id", batchId);
  }

  revalidatePath("/admin/targets");
  return {
    error: inserted === 0 ? "Es konnten keine Zielunternehmen generiert werden." : null,
    inserted, requested, warnings,
  };
}
