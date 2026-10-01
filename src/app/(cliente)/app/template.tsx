import { getOrganizationContext } from "@/lib/organizations/context";
import Link from "next/link";
import { DashboardNavigation } from "./navigation";
import { logout, selectOrganization } from "./actions";

// O template renova o cabeçalho/contexto também nas navegações entre módulos.
export default async function AppTemplate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loadFailed, organizations, currentOrganization, invalidSelection } = await getOrganizationContext();

  return (
    <div className="min-h-svh bg-slate-50 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-4">Pular para o conteúdo</a>
      <aside className="flex flex-col border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0">
        <div className="border-b border-slate-100 px-6 py-7">
          <p className="text-xl font-bold tracking-tight text-teal-900">ADSCOM</p>
          <p className="mt-1 text-sm text-slate-500">Dashboard</p>
        </div>
        <DashboardNavigation />
        {isAdmin && <Link prefetch={false} href="/admin" className="mx-4 mb-4 rounded-lg px-4 py-3 text-sm font-medium text-teal-800 hover:bg-teal-50">Administração</Link>}
        <form action={logout} className="border-t border-slate-100 p-4 lg:mt-auto">
          <button type="submit" className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Sair</button>
        </form>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-col gap-6 border-b border-slate-200 bg-white px-6 py-6 sm:px-10 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-slate-500">Empresa atual</p>
            <p data-testid="current-organization" className="mt-1 break-words text-lg font-semibold text-slate-900">{currentOrganization?.name ?? "Nenhuma empresa selecionada"}</p>
            {!loadFailed && organizations.length > 1 && (
              <form action={selectOrganization} className="mt-3 flex max-w-full flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor="organization" className="block text-sm text-slate-600">Selecionar empresa</label>
                  <select key={currentOrganization?.id ?? "none"} id="organization" name="organization_id" required defaultValue={currentOrganization?.id ?? ""}
                    className="mt-1 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-teal-700">
                    <option value="" disabled>Escolha uma empresa</option>
                    {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Aplicar</button>
              </form>
            )}
          </div>
          <div className="min-w-0 text-sm xl:max-w-xs xl:text-right">
            <p className="font-medium text-slate-700">{isAdmin ? "Administrador ADSCOM" : "Conta autenticada"}</p>
            <p className="mt-1 break-words text-slate-500">{user.email}</p>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-6xl px-6 py-10 sm:px-10" tabIndex={-1}>
          {loadFailed ? (
            <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">Não foi possível carregar as empresas. Tente novamente.</p>
          ) : (
            <>
              {invalidSelection && <p role="status" className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">A seleção anterior não está disponível. Confira a empresa atual ou selecione uma empresa permitida.</p>}
              {organizations.length === 0 && <p className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-slate-600">{isAdmin ? "Nenhuma empresa disponível." : "Nenhuma empresa vinculada à sua conta."}</p>}
              {organizations.length > 1 && !currentOrganization && <p className="mb-6 text-sm text-slate-600">Selecione uma empresa no cabeçalho para definir o contexto do dashboard.</p>}
            </>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
