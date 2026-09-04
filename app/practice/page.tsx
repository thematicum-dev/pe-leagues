import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PeLeagues from "@/components/PeLeagues";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  // Zweite Schranke neben der Middleware: der Übungsmodus ist nur
  // angemeldeten Nutzern zugänglich.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/practice");
  }

  return <PeLeagues />;
}
