/* PE-Leagues-Logo (November 2026): das Stufen-Delta mit der Wortmarke
   "PE LEAGUES".

   Das Zeichen ist das Ticker-Dreieck, in drei gleich hohe Stufen geteilt, die
   Spitze in Gold: steigender Kurs, Gipfel, Ligatabelle. Reinzeichnungen in der
   Figma-Datei "PE-Leagues – Ist-Stand", Seite "Logo":
   - "Logo in der App-Schrift", I1: Fassung "ticker", Versalien in Inter
     ExtraBold
   - "Logo in der App-Schrift", I2: Fassung "bank", weit gesperrte Versalien
     in Inter SemiBold hinter einer feinen Goldlinie

   Beide Wortmarken sind aus Inter gesetzt, der Schrift der ganzen App. Bis
   zum 21.11.2026 standen sie in Archivo Black bzw. Cormorant Garamond und
   wirkten neben der übrigen Oberfläche fremd.

   Welche Fassung die App zeigt, entscheidet LOGO_VARIANT. Die Stufen folgen
   der Textfarbe (currentColor), die Spitze ist immer Gold. `size` ist die
   Grundgröße der Wortmarke; Zeichen und Abstände skalieren in em mit.

   Das Zeichen ist genau so hoch wie die Versalien von Inter (0,727 em) und
   steht auf der Grundlinie der Schrift: unten bündig mit der Schriftlinie,
   oben mit den Großbuchstaben. */
const CAP = 0.727;
export type LogoVariant = "ticker" | "bank";
export const LOGO_VARIANT: LogoVariant = "ticker";
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

export default function Logo({ size = 22, withWordmark = true, variant = LOGO_VARIANT }: {
  size?: number; withWordmark?: boolean; variant?: LogoVariant;
}) {
  if (variant === "bank") {
    /* Gesperrte Versalien brauchen einen kleineren Grad, damit die Wortmarke
       nicht breiter wird als die Ticker-Fassung. */
    const fs = Math.round(size * 0.82);
    return (
      <span className="brandmark brandmark-bank" style={{ fontSize: fs }} role="img" aria-label="PE Leagues">
        <LogoMark height={Math.round(fs * CAP)} />
        {withWordmark && <>
          <i className="brandrule" aria-hidden="true" />
          <span className="brandword" aria-hidden="true">PE LEAGUES</span>
        </>}
      </span>
    );
  }
  return (
    <span className="brandmark" style={{ fontSize: size }} role="img" aria-label="PE Leagues">
      <LogoMark height={Math.round(size * CAP)} />
      {withWordmark && <span className="brandword" aria-hidden="true">PE LEAGUES</span>}
    </span>
  );
}
