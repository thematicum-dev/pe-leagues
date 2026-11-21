/* PE-Leagues-Logo (November 2026): das Stufen-Delta neben der Wortmarke
   "PE LEAGUES" in Archivo Black.

   Das Zeichen ist das Ticker-Dreieck, in drei gleich hohe Stufen geteilt, die
   Spitze in Gold: steigender Kurs, Gipfel, Ligatabelle. Reinzeichnung und
   Maße in der Figma-Datei "PE-Leagues – Ist-Stand", Seite "Logo", Rahmen
   "Final · PE Leagues Logo".

   Die Stufen folgen der Textfarbe (currentColor), die Spitze ist immer Gold.
   `size` ist die Schriftgröße der Wortmarke; Zeichen und Abstand skalieren
   mit (0,96 em hoch, 0,32 em Abstand). */
export const LOGO_GOLD = "#D4B26A";

export function LogoMark({ height = 24, gold = LOGO_GOLD }: { height?: number; gold?: string }) {
  return (
    <svg className="logomark" height={height} width={(height * 84) / 78} viewBox="8 10 84 78"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M50 10 L61.85 32 H38.15 Z" fill={gold} />
      <path d="M34.92 38 H65.08 L76.92 60 H23.08 Z" fill="currentColor" />
      <path d="M19.85 66 H80.15 L92 88 H8 Z" fill="currentColor" />
    </svg>
  );
}

export default function Logo({ size = 22, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="brandmark" style={{ fontSize: size }} role="img" aria-label="PE Leagues">
      <LogoMark height={Math.round(size * 0.96)} />
      {withWordmark && <span className="brandword" aria-hidden="true">PE LEAGUES</span>}
    </span>
  );
}
