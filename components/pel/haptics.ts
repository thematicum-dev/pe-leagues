/* ---------------- Haptisches Feedback ----------------

   Zwei Wege, je nach Gerät:

   - Android (Chrome, Firefox, Samsung Internet): die Vibration API,
     navigator.vibrate(). Sie verlangt, dass auf der Seite schon einmal getippt
     wurde, und ist sonst ein stilles No-op.
   - iPhone (Safari ab iOS 18): Dort gibt es navigator.vibrate() nicht. Was es
     gibt, ist der native Umschalter <input type="checkbox" switch> — und der
     gibt beim Umlegen das System-Klicken des Taptic Engine. Ein unsichtbarer
     Umschalter, über sein Label angeklickt, ist der einzige Weg, aus einer
     Webseite heraus haptisches Feedback auf dem iPhone auszulösen. Ein Muster
     wird dort als Folge einzelner Klicks gespielt; die Länge eines Impulses
     lässt sich nicht steuern.

   Überall sonst (Desktop, ältere Geräte) passiert nichts.

   Benannte Muster statt Millisekunden an jeder Aufrufstelle: Was sich wie
   eine Raste anfühlen soll, fühlt sich überall gleich an, und eine Anpassung
   der Stärke passiert an einer Stelle. Zahlen und Felder werden weiter
   angenommen.                                                              */

export type HapticKind =
  | "select"    // Raste: Regler, Tabwechsel, kleine Umschalter
  | "tap"       // gewöhnliche Bestätigung: vormerken, öffnen, schließen
  | "confirm"   // gewichtige Entscheidung: Halbjahr abschließen, Gebot abgeben
  | "success"   // gutes Ergebnis: Zuschlag, gelungener Exit
  | "warning"   // durchwachsenes oder kritisches Ergebnis
  | "error";    // Fehlschlag: Abgabe abgelehnt, Covenant Breach

const PATTERNS: Record<HapticKind, number | number[]> = {
  select: 10,
  tap: 14,
  confirm: 26,
  success: [14, 70, 24],
  warning: [26, 90, 26],
  error: [40, 60, 40, 60, 40],
};

/* Unter etwa 10 ms ist ein Impuls auf den meisten Vibrationsmotoren nicht zu
   spüren. Ältere Aufrufstellen übergeben 5 bis 8 ms — die wären stumm. */
const MIN_PULSE = 10;

/* Ein Regler feuert beim Ziehen viele Ereignisse dicht hintereinander. Eine
   Raste je Schritt ist gewollt, ein Dauerbrummen nicht. */
const MIN_GAP_MS = 35;
let lastAt = 0;

function normalize(p: number | number[]): number[] {
  const arr = Array.isArray(p) ? p : [p];
  return arr.map((v, i) => (i % 2 === 0 ? Math.max(MIN_PULSE, v) : Math.max(0, v)));
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
}

let iosLabel: HTMLLabelElement | null = null;

function iosTick() {
  if (typeof document === "undefined" || !document.body) return;
  if (!iosLabel || !iosLabel.isConnected) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosLabel = label;
  }
  /* Das Anklicken des Labels darf den Fokus nicht verschieben — ein Regler,
     der gerade bedient wird, soll bedienbar bleiben. */
  const active = document.activeElement as HTMLElement | null;
  iosLabel.click();
  if (active && active !== document.activeElement) active.focus?.({ preventScroll: true });
}

export function haptic(p: HapticKind | number | number[] = "tap") {
  try {
    if (typeof window === "undefined") return;
    const now = Date.now();
    if (now - lastAt < MIN_GAP_MS) return;
    lastAt = now;
    const pattern = normalize(typeof p === "string" ? PATTERNS[p] ?? PATTERNS.tap : p);
    if (typeof navigator.vibrate === "function") {
      /* Vor dem ersten Tippen ist die Vibration ohnehin wirkungslos — Chrome
         schreibt dann aber bei jedem Aufruf einen Fehler in die Konsole
         (etwa wenn sich der Halbjahresbericht von selbst öffnet). */
      const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
      if (ua && !ua.hasBeenActive) return;
      navigator.vibrate(pattern);
      return;
    }
    if (!isIOS()) return;
    // Ein Klick am Anfang jedes Impulses; Pausen ergeben den Rhythmus.
    let at = 0;
    pattern.forEach((v, i) => {
      if (i % 2 === 0) {
        if (at === 0) iosTick(); else setTimeout(iosTick, at);
      }
      at += v;
    });
  } catch { /* Haptik ist Beiwerk — sie darf nie etwas kaputt machen */ }
}
