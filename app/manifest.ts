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
    background_color: "#0c1214",
    theme_color: "#0c1214",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
