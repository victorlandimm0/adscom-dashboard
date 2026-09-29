"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout(): Promise<void> {
  const supabase = await createClient({ writeCookies: true });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/app?logout=failed");
  redirect("/login");
}
