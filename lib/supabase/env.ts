// Liest die Supabase-Umgebungsvariablen robust ein. Ein Tippfehler beim
// Einfügen auf dem Handy (Leerzeichen, Zeilenumbruch, ein Slash zu viel am
// Ende) reicht sonst aus, damit Supabase mit "Invalid path specified in
// request URL" antwortet, weil die Pfade dann falsch zusammengesetzt werden.
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt.");
  }
  return raw.trim().replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY ist nicht gesetzt.");
  }
  return raw.trim();
}
