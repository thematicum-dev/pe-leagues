// Kompaktes Markenzeichen: ein Badge mit einem ansteigenden Balkendiagramm
// (Wertsteigerung) plus Wortmarke. Reines Inline-SVG, keine externe Datei,
// dieselbe feste dunkle Palette wie der Rest der Login-/Landing-Seiten.
export default function Logo({ size = 34, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="brandmark">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="10" fill="#161f22" stroke="#dcb264" strokeWidth="1.5" />
        <rect x="9" y="21" width="5" height="10" rx="1.5" fill="#5fc4b1" />
        <rect x="17.5" y="14.5" width="5" height="16.5" rx="1.5" fill="#5fc4b1" />
        <rect x="26" y="8" width="5" height="23" rx="1.5" fill="#dcb264" />
      </svg>
      {withWordmark && <span className="brandword">PE Leagues</span>}
    </span>
  );
}
