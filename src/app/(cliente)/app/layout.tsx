import { getOrganizationContext } from "@/lib/organizations/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getOrganizationContext();
  return children;
}
