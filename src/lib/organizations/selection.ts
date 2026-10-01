export type Organization = { id: string; name: string };

export const organizationCookieName = "adscom_organization";

export function isOrganizationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

// Recebe somente empresas já consultadas sob a sessão/RLS. Cookie é preferência.
export function resolveOrganization(organizations: Organization[], preference: string | undefined, userId: string) {
  const parts = (preference ?? "").split(":");
  const [ownerId, organizationId] = parts;
  const selected = parts.length === 2 && ownerId === userId && isOrganizationId(organizationId)
    ? organizations.find((organization) => organization.id === organizationId)
    : undefined;
  return {
    currentOrganization: selected ?? (organizations.length === 1 ? organizations[0] : null),
    invalidSelection: Boolean(preference) && !selected,
  };
}
