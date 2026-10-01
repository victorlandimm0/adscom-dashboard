import Link from "next/link";
import { requireAdmin } from "@/lib/admin/access";
import { createOrganization } from "../actions";
import { AdminFeedback } from "../feedback";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireAdmin();
  const { status } = await searchParams;
  const companies = await supabase.from("organizations").select("id, name, created_at").order("name").order("id");
  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold">Empresas</h1>
      <AdminFeedback status={status} />
      <section aria-labelledby="new-company" className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 id="new-company" className="text-xl font-semibold">Nova empresa</h2>
        <form action={createOrganization} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="company-name" className="block text-sm font-medium">Nome da empresa</label>
            <input id="company-name" name="name" required maxLength={160} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <button type="submit" className="rounded-lg bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900">Cadastrar</button>
        </form>
      </section>
      <section aria-labelledby="companies-list" className="mt-8">
        <h2 id="companies-list" className="text-xl font-semibold">Empresas cadastradas</h2>
        {companies.error ? <p role="alert" className="mt-4 text-red-700">Não foi possível carregar as empresas. Tente novamente.</p> : companies.data.length === 0 ? <p className="mt-4 text-slate-600">Nenhuma empresa cadastrada.</p> : (
          <ul className="mt-4 space-y-4">
            {companies.data.map((company) => (
              <li key={company.id} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="break-words font-semibold">{company.name}</h3>
                <p className="mt-2 break-all text-sm text-slate-600">ID: {company.id}</p>
                <p className="mt-1 text-sm text-slate-600">Criada em: <time dateTime={company.created_at}>{new Date(company.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></p>
                <Link prefetch={false} href={`/admin/empresas/${company.id}`} className="mt-4 inline-block font-medium text-teal-800 underline" aria-label={`Ver empresa ${company.name}`}>Ver empresa</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
