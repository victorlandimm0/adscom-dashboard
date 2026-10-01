import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { organizationCookieName, resolveOrganization, type Organization } from "./selection";

// React cache deduplica somente nesta renderização; não compartilha dados entre sessões.
// Cada página e action chama esta função, independentemente do layout.
export const getOrganizationContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const roles = await supabase.from("user_global_roles")
    .select("role").eq("user_id", user.id).eq("role", "ADMIN_ADSCOM");
  const isAdmin = !roles.error && roles.data.length > 0;
  let loadFailed = Boolean(roles.error);
  let organizations: Organization[] = [];

  if (!loadFailed) {
    const memberships = await supabase.from("organization_members")
      .select("organization_id").eq("user_id", user.id);
    loadFailed = Boolean(memberships.error);
    const organizationIds = (memberships.data ?? []).map((member) => member.organization_id);
    if (!loadFailed && (isAdmin || organizationIds.length > 0)) {
      let query = supabase.from("organizations").select("id, name").order("name").order("id");
      if (!isAdmin) query = query.in("id", organizationIds);
      // RLS reaplica a autorização, inclusive se o vínculo/papel foi revogado.
      const result = await query;
      loadFailed = Boolean(result.error);
      if (!result.error) organizations = result.data;
    }
  }

  const preference = (await cookies()).get(organizationCookieName)?.value;
  return { user, isAdmin, loadFailed, organizations, ...resolveOrganization(organizations, preference, user.id) };
});
