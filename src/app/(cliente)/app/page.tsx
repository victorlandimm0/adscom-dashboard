import { ModulePlaceholder } from "./module-placeholder";

export default async function AppPage({ searchParams }: {
  searchParams: Promise<{ logout?: string; selection?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      {params.logout === "failed" && <p role="alert" className="mb-6 text-sm text-red-700">Não foi possível sair. Tente novamente.</p>}
      {params.selection === "failed" && <p role="alert" className="mb-6 text-sm text-red-700">Não foi possível selecionar a empresa. Escolha uma empresa disponível e tente novamente.</p>}
      <ModulePlaceholder title="Visão geral" description="A visão geral da empresa será implementada em uma etapa futura." />
    </>
  );
}
