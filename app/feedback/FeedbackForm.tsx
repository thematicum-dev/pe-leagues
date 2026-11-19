"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitFeedback, type FeedbackState } from "./actions";

const MAX_COMMENT = 4000;
const LABELS = ["", "Schwach", "Ausbaufähig", "Okay", "Gut", "Sehr gut"];
const INITIAL: FeedbackState = { status: "idle" };

export default function FeedbackForm() {
  const [state, action, pending] = useActionState(submitFeedback, INITIAL);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  if (state.status === "sent") {
    return (
      <div className="dashcard">
        <h2>Danke für dein Feedback!</h2>
        <p className="dashsub">
          Deine Rückmeldung ist angekommen und fließt in die Weiterentwicklung von PE Leagues ein.
        </p>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form action={action} className="dashcard feedbackform">
      <h2>Gesamtbewertung</h2>
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="starrow" role="radiogroup" aria-label="Gesamtbewertung" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} von 5 Sternen`}
            className={"starbtn" + (n <= shown ? " on" : "")}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
          >
            <Star size={32} strokeWidth={1.6} fill={n <= shown ? "currentColor" : "none"} />
          </button>
        ))}
        <span className="dashsub starlabel">{shown ? LABELS[shown] : "Bitte wählen"}</span>
      </div>

      <h2>Was können wir besser machen?</h2>
      <p className="dashsub">
        Spielerlebnis, Simulation und Realismus, Bedienung, Verständlichkeit, Fehler — alles ist
        willkommen.
      </p>
      <textarea
        name="comment"
        rows={7}
        maxLength={MAX_COMMENT}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="z. B. Was hat dir gefallen, was war unklar, wo wirkte die Simulation unrealistisch?"
        aria-label="Verbesserungsvorschläge"
      />
      <div className="dashsub feedbackcount">
        {comment.length} / {MAX_COMMENT}
      </div>

      {state.status === "error" && <p className="autherror">{state.error}</p>}

      <button type="submit" className="btn-primary" disabled={pending || rating === 0}>
        {pending ? "Wird gesendet …" : "Feedback senden"}
      </button>
    </form>
  );
}
