import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) redirect("/app");

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section aria-labelledby="login-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-teal-800">ADSCOM Dashboard</p>
        <h1 id="login-title" className="mt-3 text-3xl font-semibold">Acesse sua conta</h1>
        <p className="mt-3 text-sm text-slate-600">Entre com seu e-mail e senha.</p>
        <LoginForm />
      </section>
    </main>
  );
}
