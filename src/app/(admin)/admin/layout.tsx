import Link from "next/link";
import { requireAdmin } from "@/lib/admin/access";
import { logout } from "@/app/(cliente)/app/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="min-h-svh bg-slate-50 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-white focus:p-4">Pular para o conteúdo</a>
      <aside className="flex flex-col border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0">
        <p className="px-6 py-7 text-xl font-bold text-teal-900">ADSCOM Admin</p>
        <nav aria-label="Administração" className="space-y-1 p-4">
          <Link prefetch={false} href="/admin" className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Visão geral</Link>
          <Link prefetch={false} href="/admin/empresas" className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Empresas</Link>
        </nav>
        <div className="space-y-3 border-t border-slate-200 p-4 lg:mt-auto">
          <Link prefetch={false} href="/app" className="block rounded-lg px-4 py-3 text-sm font-medium text-teal-800 hover:bg-teal-50">Voltar ao Dashboard</Link>
          <form action={logout}>
            <button type="submit" className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700">Sair</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-6 sm:px-10">
          <p className="font-semibold text-slate-900">ADSCOM Admin</p>
          <p className="min-w-0 break-all text-sm text-slate-600">{user.email}</p>
        </header>
        <main id="admin-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-10 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
