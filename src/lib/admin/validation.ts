export function readCompanyName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 && name.length <= 160 ? name : null;
}

export function readMembership(formData: FormData) {
  const organizationId = formData.get("organization_id");
  const userId = formData.get("user_id");
  const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  if (typeof organizationId !== "string" || typeof userId !== "string" || !uuid.test(organizationId) || !uuid.test(userId)) return null;
  return { organizationId: organizationId.toLowerCase(), userId: userId.toLowerCase() };
}
