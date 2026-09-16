import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /* Werkzeug, kein Anwendungscode: Die Vorlagen unter .claude/skills sind
       Bausteine für Durchläufe im Container (siehe .claude/skills/live), keine
       Dateien, die je ausgeliefert werden. Sie werden vom Skript nach app/
       kopiert und danach wieder entfernt — dort werden sie ganz normal
       mitgeprüft, solange ein Durchlauf läuft. */
    ".claude/**",
  ]),
]);

export default eslintConfig;
