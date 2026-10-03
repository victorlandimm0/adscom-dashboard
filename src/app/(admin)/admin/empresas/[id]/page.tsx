import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/access";
import { isOrganizationId } from "@/lib/organizations/selection";
import { selectOrganization } from "@/app/(cliente)/app/actions";
import { createLocation, renameLocation, linkMember, removeMember } from "../../actions";
import { AdminFeedback } from "../../feedback";
import { LocationSubmit } from "../../location-submit";

export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isOrganizationId(id)) notFound();
  const { status } = await searchParams;
  const result = await supabase.from("organizations").select("id, name, created_at").eq("id", id).maybeSingle();
  if (result.error) return <p role="alert">Não foi possível carregar a empresa. Tente novamente.</p>;
  if (!result.data) notFound();
  const company = result.data;
  const members = await supabase.from("organization_members").select("user_id, role, created_at")
    .eq("organization_id", company.id).order("created_at").order("user_id");
  const locations = await supabase.from("locations").select("id, name")
    .eq("organization_id", company.id).order("name").order("id");
  return (
    <>
      <Link href="/admin/empresas" className="text-sm font-medium text-teal-800 underline">Voltar às empresas</Link>
      <h1 className="mt-4 mb-6 break-words text-3xl font-semibold">{company.name}</h1>
      <AdminFeedback status={status} />
      <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <div><dt className="font-medium">Identificador</dt><dd className="break-all text-slate-600">{company.id}</dd></div>
        <div><dt className="font-medium">Data de criação</dt><dd className="text-slate-600"><time dateTime={company.created_at}>{new Date(company.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></dd></div>
      </dl>
      <form action={selectOrganization} className="mt-4">
        <input type="hidden" name="organization_id" value={company.id} />
        <button type="submit" className="rounded-lg border border-teal-800 px-4 py-2 font-medium text-teal-800 hover:bg-teal-50">Abrir no Dashboard</button>
      </form>
      <section aria-labelledby="locations" className="mt-8">
        <h2 id="locations" className="text-xl font-semibold">Unidades</h2>
        {locations.error ? <p role="alert" className="mt-4 text-red-700">Não foi possível carregar as unidades. Tente novamente.</p> : locations.data.length === 0 ? <p className="mt-4 text-slate-600">Nenhuma unidade cadastrada.</p> : (
          <ul className="mt-4 space-y-4">
            {locations.data.map((location) => (
              <li key={location.id} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="break-words font-medium">{location.name}</h3>
                <form action={renameLocation.bind(null, company.id)} className="mt-4 space-y-3">
                  <input type="hidden" name="location_id" value={location.id} />
                  <label htmlFor={`location-${location.id}`} className="block text-sm font-medium">Novo nome da unidade {location.name}</label>
                  <input id={`location-${location.id}`} name="name" defaultValue={location.name} required maxLength={160} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  <LocationSubmit>Salvar nome</LocationSubmit>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={createLocation.bind(null, company.id)} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <label htmlFor="location-name" className="block text-sm font-medium">Nome da nova unidade</label>
          <input id="location-name" name="name" required maxLength={160} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <LocationSubmit>Cadastrar unidade</LocationSubmit>
        </form>
      </section>
      <section aria-labelledby="link-member" className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 id="link-member" className="text-xl font-semibold">Vincular usuário existente</h2>
        <p id="user-help" className="mt-2 text-sm text-slate-600">Informe o UUID de um usuário já cadastrado no Supabase Auth. O vínculo terá papel CLIENTE; nenhuma conta será criada.</p>
        <form action={linkMember} className="mt-4 space-y-3">
          <input type="hidden" name="organization_id" value={company.id} />
          <label htmlFor="user-id" className="block text-sm font-medium">UUID do usuário Auth</label>
          <input id="user-id" name="user_id" required maxLength={36} aria-describedby="user-help" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button type="submit" className="rounded-lg bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900">Vincular usuário</button>
        </form>
      </section>
      <section aria-labelledby="members" className="mt-8">
        <h2 id="members" className="text-xl font-semibold">Usuários vinculados</h2>
        <p className="mt-2 text-sm text-slate-600">Os vínculos são identificados pelo UUID. E-mails e perfis do Auth não são consultados nesta área.</p>
        {members.error ? <p role="alert" className="mt-4 text-red-700">Não foi possível carregar os vínculos. Tente novamente.</p> : members.data.length === 0 ? <p className="mt-4 text-slate-600">Nenhum usuário vinculado.</p> : (
          <ul className="mt-4 space-y-4">
            {members.data.map((member) => (
              <li key={member.user_id} className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="break-all font-medium">{member.user_id}</p>
                <p className="mt-2 text-sm text-slate-600">Papel: {member.role}</p>
                <p className="mt-1 text-sm text-slate-600">Vinculado em: <time dateTime={member.created_at}>{new Date(member.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></p>
                <form action={removeMember} className="mt-4 space-y-3">
                  <input type="hidden" name="organization_id" value={company.id} />
                  <input type="hidden" name="user_id" value={member.user_id} />
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="confirmation" value="confirm" required className="mt-1" />
                    <span>Confirmo remover o vínculo deste usuário com esta empresa. A conta Auth e os demais vínculos serão mantidos.</span>
                  </label>
                  <button type="submit" className="rounded-lg border border-red-300 px-4 py-2 font-medium text-red-800 hover:bg-red-50">Remover vínculo</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
