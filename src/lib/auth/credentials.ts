export function readCredentials(formData: FormData) {
  const rawEmail = formData.get("email");
  const password = formData.get("password");
  if (typeof rawEmail !== "string" || typeof password !== "string") return null;

  const email = rawEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  // Não aplicar regras de cadastro ou trim à senha de uma conta existente.
  if (password.length === 0 || password.length > 4096) return null;
  return { email, password };
}
