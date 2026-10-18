import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  /* Der Build prüft die Typen. Bis Oktober 2026 stand hier
     typescript.ignoreBuildErrors, weil die übernommene Spiel-Komponente nicht
     durchgehend typisiert war -- dadurch sammelten sich unbemerkt über hundert
     Typfehler an. Jetzt bricht ein Build mit Typfehlern ab. */
};

export default nextConfig;
