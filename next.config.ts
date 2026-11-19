import type { NextConfig } from "next";

/* Sicherheits-Header für jede Antwort. Bewusst ohne Content-Security-Policy:
   Das Spiel lädt Schriften von Google Fonts und spricht mit Supabase (REST
   und Realtime über WebSocket) — eine CSP dafür gehört mit der echten
   Projektadresse getestet, nicht geraten. Was hier steht, bricht nichts:

   - frame-ancestors/X-Frame-Options: keine Einbettung in fremde Seiten
     (Clickjacking auf "Halbjahr abschließen" oder "Konto löschen")
   - nosniff, Referrer nur als Herkunft, keine Gerätefunktionen
   - HSTS: nur noch über HTTPS */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  agentRules: false,
  /* Der Build prüft die Typen. Bis Oktober 2026 stand hier
     typescript.ignoreBuildErrors, weil die übernommene Spiel-Komponente nicht
     durchgehend typisiert war -- dadurch sammelten sich unbemerkt über hundert
     Typfehler an. Jetzt bricht ein Build mit Typfehlern ab. */
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
