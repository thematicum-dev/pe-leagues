"use client";

/* Sanftes Einblenden, wenn innerhalb derselben Ansicht der Inhalt wechselt —
   etwa nach dem Abschluss eines Halbjahres im Übungsmodus oder nach der
   Abgabe in einer Mehrspielerpartie. Das sind gewöhnliche Zustandswechsel,
   keine Navigation; die Seitenübergänge (app/template.tsx) greifen dort
   nicht.

   Über die Web Animations API statt über eine CSS-Klasse: Das Element muss
   dafür nicht neu eingehängt werden, und aufgeklappte Karten, Reglerstände
   und Scrollposition bleiben, wie sie sind. Beim ersten Rendern passiert
   nichts — das Erscheinen der Seite ist Sache des Seitenübergangs. */

import { useEffect, useRef, type RefObject } from "react";

export function fadeIn(el: HTMLElement | null, { duration = 380, lift = 6 } = {}) {
  if (!el || typeof el.animate !== "function") return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  /* lift = 0 heißt reine Deckkraft. Das braucht jedes Element, in dem fixierte
     Leisten stecken: Ein transform, und sei es translateY(0), macht es für
     die Dauer der Animation zum Bezugsrahmen von position: fixed — die
     Tableiste spränge vom unteren Bildschirmrand ans Ende der Seite. */
  el.animate(
    lift
      ? [{ opacity: 0, transform: `translateY(${lift}px)` }, { opacity: 1, transform: "none" }]
      : [{ opacity: 0 }, { opacity: 1 }],
    { duration, easing: "cubic-bezier(.22,.9,.34,1)" },
  );
}

export function useFadeOnChange(ref: RefObject<HTMLElement | null>, key: unknown, opts?: { duration?: number; lift?: number }) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    fadeIn(ref.current, opts);
    // Nur am Schlüssel hängend: Ein Wechsel blendet ein, ein Neurendern nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
