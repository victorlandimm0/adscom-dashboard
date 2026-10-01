import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Deduplicação apenas na renderização atual; cada página/action exige autorização.
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const roles = await supabase.from("user_global_roles").select("role")
    .eq("user_id", user.id).eq("role", "ADMIN_ADSCOM");
  if (roles.error || !roles.data.length) redirect("/app");
  return { supabase, user };
});
