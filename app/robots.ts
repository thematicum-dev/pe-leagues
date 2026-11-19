import type { MetadataRoute } from "next";

// Öffentlich ist nur, was ohne Anmeldung Sinn ergibt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/$", "/impressum", "/datenschutz", "/agb"],
      disallow: ["/dashboard", "/admin", "/season", "/practice", "/explain", "/profile", "/leaderboard", "/access", "/onboarding", "/auth", "/api"],
    }],
  };
}
