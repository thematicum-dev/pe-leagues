import type { MetadataRoute } from "next";

/* Web-App-Manifest: Die Partie läuft über Tage, ein Halbjahr je Zug — das
   Spiel gehört auf den Startbildschirm des Telefons, nicht in einen Tab, den
   man wiederfinden muss. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PE Leagues",
    short_name: "PE Leagues",
    description: "Private-Equity-Simulation: ein Fonds, zwanzig Halbjahre, vier Wettbewerber.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0B1416",
    theme_color: "#0B1416",
    lang: "de",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      /* Android legt Startbildschirm-Symbole als PNG an und schneidet sie in
         seine eigene Form; das Zeichen steht deshalb in der sicheren Zone. */
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
