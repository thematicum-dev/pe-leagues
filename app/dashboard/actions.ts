"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSeason() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({ created_by: user.id })
    .select("id")
    .single();

  if (error || !season) {
    return { error: "Partie konnte nicht erstellt werden." };
  }

  const { error: joinError } = await supabase
    .from("season_players")
    .insert({ season_id: season.id, slot: 1, profile_id: user.id, is_ai: false });

  if (joinError) {
    return { error: "Partie wurde erstellt, aber der Beitritt ist fehlgeschlagen." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function joinSeason(seasonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const { data: taken } = await supabase
    .from("season_players")
    .select("slot")
    .eq("season_id", seasonId);

  const usedSlots = new Set((taken ?? []).map((row) => row.slot));
  const freeSlot = [1, 2, 3, 4, 5].find((slot) => !usedSlots.has(slot));

  if (!freeSlot) {
    return { error: "Diese Lobby ist bereits voll." };
  }

  const { error } = await supabase
    .from("season_players")
    .insert({ season_id: seasonId, slot: freeSlot, profile_id: user.id, is_ai: false });

  if (error) {
    return { error: "Beitritt fehlgeschlagen. Vielleicht bist du schon dabei?" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
