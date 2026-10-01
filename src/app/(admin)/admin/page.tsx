import Link from "next/link";
import { requireAdmin } from "@/lib/admin/access";

export default async function AdminPage() {
  await requireAdmin();
  return (
    <section>
      <h1 className="text-3xl font-semibold text-slate-900">Visão geral</h1>
      <p className="mt-4 text-slate-600">Cadastre empresas e gerencie os vínculos de usuários Auth já existentes.</p>
      <Link href="/admin/empresas" className="mt-6 inline-block rounded-lg bg-teal-800 px-4 py-3 font-medium text-white hover:bg-teal-900">Gerenciar empresas</Link>
    </section>
  );
}
