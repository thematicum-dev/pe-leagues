/// <reference types="react/canary" />
import { ViewTransition } from "react";

/* Seitenübergänge.

   Ein Template wird – anders als ein Layout – bei jeder Navigation neu
   eingehängt. Damit hat jede Seite ein Erscheinen und ein Verschwinden, und
   <ViewTransition> blendet beides über die View Transitions API des Browsers
   ineinander: vom Dashboard ins Spiel und zurück, und beim Wechsel ins
   nächste Halbjahr (router.refresh() ist ebenfalls ein Übergang). Die
   Animation selbst steht in app/globals.css unter "Seitenübergänge".

   Navigationen, die eine ganze Seite neu laden, übernimmt @view-transition
   im selben Stylesheet. Browser ohne View Transitions (iOS vor 18) zeigen
   den Wechsel ohne Überblendung; dort blendet wenigstens jede neu geladene
   Seite ein. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <ViewTransition default="pel-page">{children}</ViewTransition>;
}
