export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local.",
    );
  }

  // Esta etapa aceita somente a chave publicável, nunca uma chave privilegiada.
  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error("Use uma Publishable Key do Supabase (sb_publishable_).");
  }

  const parsedUrl = new URL(url);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== "https:" && !(isLocal && parsedUrl.protocol === "http:")) {
    throw new Error("A URL Supabase deve usar HTTPS (HTTP somente em localhost).");
  }

  return { url, publishableKey };
}
