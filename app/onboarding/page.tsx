import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import OnboardingForm from "./OnboardingForm";
import { ACCESS_CODE_COOKIE } from "@/lib/access/code";

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

  // Aus dem Einladungslink (/signup?code=…) mitgebracht, siehe app/signup/actions.ts
  const code = (await cookies()).get(ACCESS_CODE_COOKIE)?.value ?? "";
  return <OnboardingForm initialCode={code} />;
}
