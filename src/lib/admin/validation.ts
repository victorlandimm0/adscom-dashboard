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
export const channelLabels = {
  SITE: "Site",
  WHATSAPP: "WhatsApp",
  GOOGLE_BUSINESS_PROFILE: "Perfil da Empresa no Google",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  YOUTUBE: "YouTube",
};

export function readChannelType(value: FormDataEntryValue | null) {
  return typeof value === "string" && Object.hasOwn(channelLabels, value)
    ? value as keyof typeof channelLabels : null;
}

export function readChannelLocation(value: FormDataEntryValue | null): string | null | undefined {
  if (value === "") return null;
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : undefined;
}

export function readChannelUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("https://") || [...value].length > 2048
    || /[\s\p{Cc}]/u.test(value) || !/^https:\/\/[^/?#@\\]+([/?#]|$)/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? value : null;
  } catch { return null; }
}
