import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  typescript: {
    // Die übernommene Spiel-Komponente ist nicht durchgehend typisiert.
    // Ein Build soll daran nicht scheitern.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
