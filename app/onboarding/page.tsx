import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.rpc("my_access").maybeSingle();

  // Wer schon eine Anfrage gestellt hat, landet auf der Statusseite -- die
  // schickt Freigegebene ihrerseits weiter aufs Dashboard.
  if (profile) {
    redirect("/access");
  }

  return <OnboardingForm />;
}
