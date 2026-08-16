import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PE Leagues",
  description: "Private-Equity-Simulationsspiel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
