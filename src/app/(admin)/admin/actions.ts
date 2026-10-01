"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/access";
import { readCompanyName, readMembership } from "@/lib/admin/validation";
import { isOrganizationId } from "@/lib/organizations/selection";

export async function createOrganization(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const name = readCompanyName(formData.get("name"));
  if (!name) redirect("/admin/empresas?status=invalid-name");
  const result = await supabase.from("organizations").insert({ name }).select("id").single();
  if (result.error) redirect("/admin/empresas?status=failed");
  revalidatePath("/admin/empresas");
  revalidatePath("/app", "layout");
  redirect(`/admin/empresas/${result.data.id}?status=created`);
}

export async function linkMember(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const membership = readMembership(formData);
  const rawOrganizationId = formData.get("organization_id");
  if (!membership) {
    const path = isOrganizationId(rawOrganizationId) ? `/admin/empresas/${rawOrganizationId}` : "/admin/empresas";
    redirect(`${path}?status=invalid-id`);
  }
  const path = `/admin/empresas/${membership.organizationId}`;
  const organization = await supabase.from("organizations").select("id").eq("id", membership.organizationId).maybeSingle();
  if (organization.error || !organization.data) redirect("/admin/empresas?status=unavailable");
  // A FK valida o usuário Auth; não é preciso expor auth.users ou usar Auth Admin.
  const result = await supabase.from("organization_members").insert({
    organization_id: membership.organizationId, user_id: membership.userId, role: "CLIENTE",
  }).select("user_id").single();
  if (result.error) {
    const status = result.error.code === "23505" ? "duplicate" : result.error.code === "23503" ? "not-found" : "failed";
    redirect(`${path}?status=${status}`);
  }
  revalidatePath(path);
  revalidatePath("/app", "layout");
  redirect(`${path}?status=linked`);
}

export async function removeMember(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const membership = readMembership(formData);
  if (!membership) redirect("/admin/empresas?status=invalid-id");
  const path = `/admin/empresas/${membership.organizationId}`;
  if (formData.get("confirmation") !== "confirm") redirect(`${path}?status=confirmation-required`);
  // Filtros da chave composta: não exclui outros vínculos, usuário Auth ou papel global.
  const result = await supabase.from("organization_members").delete()
    .eq("organization_id", membership.organizationId).eq("user_id", membership.userId)
    .eq("role", "CLIENTE").select("user_id");
  if (result.error) redirect(`${path}?status=failed`);
  if (!result.data.length) redirect(`${path}?status=unavailable`);
  revalidatePath(path);
  revalidatePath("/app", "layout");
  redirect(`${path}?status=removed`);
}
