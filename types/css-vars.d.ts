/* Eigene CSS-Variablen im style-Attribut, z. B. style={{ "--sec": farbe }}.
   Die Spielkomponenten färben so Karten und Kacheln je Sektor ein; ohne
   diese Erweiterung kennt React.CSSProperties nur Standardeigenschaften. */
import "react";

declare module "react" {
  interface CSSProperties {
    [variable: `--${string}`]: string | number | undefined;
  }
}
