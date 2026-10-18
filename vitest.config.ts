import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/* Derselbe Pfadalias wie in tsconfig.json ("@/*" → Projektwurzel), damit auch
   Module unter components/ testbar sind, die ihre Abhängigkeiten über "@/"
   beziehen. Als regulärer Ausdruck, damit Paketnamen wie "@supabase/…"
   unberührt bleiben. */
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }],
  },
});
