import type { Metadata, Viewport } from "next";
import "./globals.css";
import Tracker from "@/components/Tracker";

const DESCRIPTION =
  "Die Private-Equity-Simulation: Führe einen 500-Mio.-€-Fonds durch einen vollen Zyklus — kaufen, entwickeln, verkaufen. Gegen vier Fonds, gemessen an TVCC und IRR.";

export const metadata: Metadata = {
  // Absolute Adressen für Vorschaubilder; auf Vercel aus der Umgebung
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: { default: "PE Leagues — Private-Equity-Simulation", template: "%s · PE Leagues" },
  description: DESCRIPTION,
  applicationName: "PE Leagues",
  openGraph: {
    type: "website",
    siteName: "PE Leagues",
    title: "PE Leagues — Private-Equity-Simulation",
    description: DESCRIPTION,
    locale: "de_DE",
  },
  twitter: { card: "summary", title: "PE Leagues", description: DESCRIPTION },
  appleWebApp: { capable: true, title: "PE Leagues", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0c1214",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
        <Tracker />
      </body>
    </html>
  );
}
