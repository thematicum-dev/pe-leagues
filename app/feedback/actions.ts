"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { status: "idle" | "sent" | "error"; error?: string };

const MAX_COMMENT = 4000;

/**
 * Speichert eine Feedback-Abgabe. Ob der Nutzer schreiben darf, entscheidet
 * die Datenbank (Policy feedback_insert_own: nur eigene profile_id und nur
 * mit Spielzugang, siehe supabase/migrations/20261119090000_feedback.sql).
 */
export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "error", error: "Bitte vergib eine Bewertung von 1 bis 5 Sternen." };
  }
  if (comment.length > MAX_COMMENT) {
    return { status: "error", error: `Der Text ist zu lang (höchstens ${MAX_COMMENT} Zeichen).` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/feedback");
  }

  const { error } = await supabase
    .from("feedback")
    .insert({ profile_id: user.id, rating, comment: comment || null });

  if (error) {
    return { status: "error", error: "Das Feedback konnte nicht gespeichert werden. Bitte versuch es erneut." };
  }
  return { status: "sent" };
}
