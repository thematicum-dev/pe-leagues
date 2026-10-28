/* Eigene Konfiguration für den Serverpfad gegen Postgres: Die Edge Function
   importiert "npm:@supabase/supabase-js", das unter Node nicht auflösbar ist
   — der Alias setzt dafür den Postgres-Client aus pgClient.ts ein. Aufruf
   siehe supabase/tests/README.md. */
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^npm:@supabase\/supabase-js@.*$/, replacement: fileURLToPath(new URL("./pgClient.ts", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("../../", import.meta.url)) },
    ],
  },
  test: {
    include: ["supabase/tests/**/*.pg.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
});
