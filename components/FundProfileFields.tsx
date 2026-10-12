"use client";

/* Die Punkteverteilung des Fondsprofils: eine Zeile je Fähigkeit mit fünf
   Punkten, darunter der Stand. Gemeinsam für den Beitritt im Dashboard
   (app/dashboard/LobbyOverview.tsx) und den Lobby-Raum
   (app/season/[id]/LobbyRoom.tsx), wo das Profil bis zum Start änderbar
   bleibt. Gespeichert wird hier nichts — das tut der Aufrufer. */

import type { Attrs } from "@/lib/engine/constants";
import { ATTR_FIELDS, FUND_PROFILE_POINTS } from "@/components/pel/ui";

export function pointsOf(attrs: Attrs): number {
  return Object.values(attrs).reduce((a, b) => a + b, 0);
}

export default function FundProfileFields({ attrs, onChange, state }: {
  attrs: Attrs;
  onChange: (next: Attrs) => void;
  /* Zusatz rechts in der Statuszeile, sobald alle Punkte verteilt sind
     (etwa "gespeichert"). Ohne Angabe steht dort nichts. */
  state?: string;
}) {
  const usedPoints = pointsOf(attrs);
  const pointsLeft = FUND_PROFILE_POINTS - usedPoints;
  const pointsComplete = pointsLeft === 0;
  return (
    <>
      {ATTR_FIELDS.map(([k, n, d]) => (
        <div className="fprow" key={k}>
          <div className="fplabel">
            <span className="fpname">{n}</span>
            <span className="fpdesc">{d}</span>
          </div>
          <div className="fpdots" role="group" aria-label={n}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`${n} auf ${i}`}
                aria-pressed={attrs[k as keyof Attrs] >= i}
                className={"fpdot" + (attrs[k as keyof Attrs] >= i ? " on" : "")}
                onClick={() => {
                  const key = k as keyof Attrs;
                  const v = attrs[key] === i ? i - 1 : i;
                  if (usedPoints - attrs[key] + v <= FUND_PROFILE_POINTS) onChange({ ...attrs, [key]: v });
                }}
              />
            ))}
          </div>
        </div>
      ))}
      {/* Statuszeile statt Schaltflächenzeile: Die Punktezahl sagt, wo man
          steht, die Schaltfläche darunter, was als Nächstes zu tun ist.
          Vorher standen beide nebeneinander — die wichtigste Aktion der
          Karte war damit halb so breit wie jede andere und saß rechts in
          einer Zeile, die wie eine Beschriftung aussieht. */}
      <div className="fpfoot">
        <span className={"fppoints" + (pointsComplete ? " ok" : "")}>
          {usedPoints} / {FUND_PROFILE_POINTS} Punkte
        </span>
        <span className="fpstate">
          {!pointsComplete ? `noch ${pointsLeft} zu verteilen` : state ?? ""}
        </span>
      </div>
    </>
  );
}
