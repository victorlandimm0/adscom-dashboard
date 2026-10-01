"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationContext } from "@/lib/organizations/context";
import { isOrganizationId, organizationCookieName } from "@/lib/organizations/selection";

export async function selectOrganization(formData: FormData): Promise<void> {
  const context = await getOrganizationContext();
  const organizationId = formData.get("organization_id");
  if (context.loadFailed || !isOrganizationId(organizationId) ||
      !context.organizations.some((organization) => organization.id === organizationId)) {
    redirect("/app?selection=failed");
  }
  (await cookies()).set(organizationCookieName, `${context.user.id}:${organizationId}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/app",
  });
  // Destino interno fixo; nenhuma URL de retorno fornecida pelo navegador.
  redirect("/app");
}

export async function logout(): Promise<void> {
  const supabase = await createClient({ writeCookies: true });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/app?logout=failed");
  (await cookies()).set(organizationCookieName, "", { path: "/app", maxAge: 0 });
  redirect("/login");
}
