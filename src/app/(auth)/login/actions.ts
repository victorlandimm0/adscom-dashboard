"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readCredentials } from "@/lib/auth/credentials";

export async function login(_previousState: string, formData: FormData): Promise<string> {
  const credentials = readCredentials(formData);
  if (!credentials) return "Informe um e-mail válido e sua senha.";

  const supabase = await createClient({ writeCookies: true });
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return "Não foi possível entrar. Confira os dados e tente novamente.";

  redirect("/app");
}
