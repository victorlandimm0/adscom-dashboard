import { getOrganizationContext } from "@/lib/organizations/context";

export async function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  // A página também valida sessão/contexto; o layout não é a barreira de autorização.
  await getOrganizationContext();
  return (
    <section aria-labelledby="page-title">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">ADSCOM Dashboard</p>
      <h1 id="page-title" className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="font-medium text-slate-800">Em breve</p>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">{description}</p>
      </div>
    </section>
  );
}
