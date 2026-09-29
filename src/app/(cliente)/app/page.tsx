import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppPage({ searchParams }: {
  searchParams: Promise<{ logout?: string }>;
}) {
  const supabase = await createClient();
  // Consulta o Auth no servidor; nunca confia apenas no conteúdo do cookie.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl items-center px-6 py-12">
      <section aria-labelledby="app-title" className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 id="app-title" className="text-3xl font-semibold">ADSCOM Dashboard</h1>
        <p className="mt-5 text-slate-700">Você está autenticado.</p>
        <p className="mt-2 break-words text-sm text-slate-600">{user.email}</p>
        {params.logout === "failed" && <p role="alert" className="mt-4 text-sm text-red-700">Não foi possível sair. Tente novamente.</p>}
        <form action={logout} className="mt-8">
          <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Sair</button>
        </form>
      </section>
    </main>
  );
}
