# Etapa 03 — operação e validação da fundação de dados

## Etapa 09B — fundação de unidades (01/10/2026)

Migration aditiva: `supabase/migrations/20261001000100_locations_foundation.sql`. Aplicada **somente no Supabase local** por `npm run db:migrate` (`migration up --local`), após conferir o histórico local. A migration de 20260926000100 permanece intacta. Não houve SQL, aplicação ou inspeção remota. Os registros de migration única e resultados das etapas anteriores abaixo são históricos.

Organization continua sendo tenant, com 0..N locations. A migration não insere dados, não exige unidade para empresas existentes e não cria unidade fictícia para empresas digitais. Segue a [arquitetura aprovada na 09A](modelo-empresa-unidades.md), preservada sem reescrita.

| Coluna de public.locations | Definição |
| --- | --- |
| id | uuid PRIMARY KEY DEFAULT gen_random_uuid() |
| organization_id | uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT |
| name | text NOT NULL CHECK (length(btrim(name)) > 0 AND length(name) <= 160) |
| created_at | timestamptz NOT NULL DEFAULT now() |

Não há normalização automática do nome nem unicidade por nome. Foram criados somente os índices das constraints: `locations_pkey` sobre id e `locations_organization_id_id_key` UNIQUE sobre (organization_id, id). O segundo atende consultas começando pela empresa e oferece alvo para futuras FKs compostas; não há índice redundante isolado de organization_id. Nenhuma tabela de recurso futuro foi criada pela migration.

A FK RESTRICT impede excluir organization com locations, inclusive em operação privilegiada. A API comum continua sem DELETE de organizations. Também não recebe DELETE de locations nesta fase, coerente com a decisão da 09A de adiar exclusão física; admin pode criar e editar nome, não remover ou transferir unidade. Não há cascade, soft delete ou status acrescentado.

### Grants e policies

RLS habilitada em locations; privilégios anteriores de PUBLIC, anon e authenticated revogados somente nessa nova tabela. Authenticated recebe SELECT, INSERT apenas em (organization_id, name) e UPDATE apenas em name. Os grants não concedem autorização por si: policies restringem as linhas. IDs, tenant e data não podem ser alterados pela API comum; id/data também não podem ser fornecidos no INSERT. Sem DELETE, TRUNCATE ou escrita do CLIENTE.

- `locations_select_member_or_admin`: lê quando existe membership próprio da organization, identificado por auth.uid(), ou concessão própria ADMIN_ADSCOM.
- `locations_insert_admin`: WITH CHECK de ADMIN_ADSCOM consultado no banco.
- `locations_update_admin`: USING e WITH CHECK de ADMIN_ADSCOM consultado no banco.

O grafo segue sem ciclos: locations consulta memberships/papéis; esses não passam a consultar locations. Não há funções SECURITY DEFINER, service_role, location_members ou papéis por unidade. Revogação de membership/papel retira acesso na consulta seguinte, sem depender de atualização de papel no JWT. CLIENTE lê todas as unidades de suas empresas e não escreve; admin usa sessão normal com acesso global de leitura/criação/edição de nome; anônimo não lê nem escreve.

### Testes e validação da 09B

`002_locations.test.sql` acrescenta 38 asserções pgTAP, com fixtures em transação e rollback. As 52 anteriores em `001_multi_tenant.test.sql` permanecem intactas (90 no total). Cobrem organização com zero unidades, criação e defaults, A/B por UUID, sem vínculo, admin sem membership, anônimo, escrita proibida, edição administrativa, FK, campos obrigatórios, limites do nome, ID/data/tenant protegidos, DELETE bloqueado, RESTRICT e revogações.

Uma sonda de FK composta é criada somente no schema de teste `locations_test`, dentro da transação, e removida pelo rollback. Verifica par correto e INSERT/UPDATE cross-organization recusados; não é uma tabela de negócio implantada. A primeira execução parou após 27 novas asserções porque a sonda usava TEMP TABLE referenciando tabela permanente, combinação não aceita pelo PostgreSQL. O teste foi corrigido para schema transacional não exposto; a repetição passou sem alteração da migration.

`scripts/test-locations-api.mjs` é chamado pelo harness existente `test:rls:api`, também incluído em `test:dashboard`. Usa as mesmas fixtures locais e JWTs normais: duas unidades por A/B, leitura própria e UUID alheio, multiempresa/sem vínculo, anônimo, admin criando/editando, FK/CHECK e grants bloqueando escrita indevida. A revogação de cliente/admin no harness também verifica locations. A limpeza remove primeiro as unidades apenas das organizações desta execução, depois vínculos/empresas/usuários. Não lê .env.local nem aceita URL remota.

| Validação | Resultado desta etapa |
| --- | --- |
| npm run lint | Passou |
| npm run typecheck | Passou |
| npm test | 13/13 passaram |
| npm run test:db | 90/90 passaram após correção da sonda de teste |
| npm run test:rls:api | Passou; fixtures locais removidas |
| npm run test:dashboard | Passou; administração, dashboard e HTTP/RLS; fixtures removidas |
| npm run build | Passou após dashboard; build habitual restaurado |
| git diff --check | Passou; arquivos novos também conferidos sem staging |

Consulta local final confirmou locations=0, schema locations_test ausente e zero usuários das fixtures HTTP. Docker/Supabase local já estavam em execução; não houve reset nem instalação. A CLI informou atualização disponível, mas não foi atualizada. Nenhuma mudança em src/, tipos da aplicação, cookies ou interface foi necessária. Não há tela/cadastro/seletor de unidade no produto. Endereço, contatos, dados fiscais, geolocalização, timezone, status, is_primary, slug, updated_at, horários, Google, avaliações e NFC seguem adiados. Etapa 10 não iniciada. Sem staging, commit ou push; checkpoint ddad923 preservado.

## Estado real

Etapa 08: a migration única permanece intacta. A suíte atual inclui 52 asserções pgTAP, HTTP/RLS e administração/dashboard; resultados da reexecução em [consolidação](consolidacao.md). O usuário informou validação manual remota na Etapa 05 e revisão funcional na Etapa 07. O agente não inspecionou nem alterou o remoto; não se infere o histórico remoto a partir do checkout. Os parágrafos seguintes registram as execuções locais anteriores.

**Etapa 05, 29/09/2026:** repetição local aprovada com 52 asserções pgTAP e suíte HTTP ampliada. As quatro novas asserções SQL cobrem nome de B por UUID, vínculos de A invisíveis a B, ausência de memberships e UUID conhecido para usuário sem vínculo. A suíte HTTP também exercita as leituras de `/app` para cinco perfis e UUID direto de A como B/sem vínculo. Fixtures HTTP removidas; SQL usa rollback. Nenhuma migration, policy ou configuração remota alterada. Os resultados abaixo de 27/09 são o histórico da Etapa 03.

**Validação local concluída em 27/09/2026.** A inicialização do Supabase local aplicou a migration. `npm run db:migrate` confirmou que não havia migrations pendentes. As 48 asserções pgTAP e os cenários A–I da suíte HTTP passaram. Não houve alteração nas policies ou na migration.

Na primeira execução, pgTAP parou após oito asserções por erro de sintaxe do teste: CTEs com UPDATE/DELETE estavam aninhadas em argumentos de função. Seis asserções foram corrigidas colocando a CTE no nível superior, mantendo os mesmos resultados esperados. A repetição completa passou. O NOTICE sobre pgTAP já instalado é informativo.

A limpeza foi confirmada por consulta local: organizations=0, organization_members=0, user_global_roles=0 e usuários de teste=0. Os testes SQL usam rollback; a suíte HTTP removeu suas fixtures. A indisponibilidade de Docker registrada na entrega anterior foi resolvida pelo desenvolvedor.

O projeto remoto ADSCOM Dashboard, região São Paulo, foi informado pelo desenvolvedor. Na execução original da Etapa 03, o agente não autenticou nem vinculou a CLI a ele. Na auditoria da Etapa 08, supabase/.temp/project-ref não foi encontrado neste checkout. Nenhuma operação remota foi executada; o schema remoto não foi inspecionado. Não foram criadas contas ou empresas de teste remotas.

## Configurar a aplicação

Copie `.env.example` para `.env.local`, sem sobrescrever um arquivo local já configurado. Preencha localmente:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use a URL HTTPS do projeto e sua Publishable Key (`sb_publishable_...`), obtidas nas configurações do Supabase. Não cole valores reais na documentação, código ou arquivos versionados. `.env.local` está ignorado pelo Git. Não foi criado um arquivo com credenciais reais nesta entrega.

Esses dois valores podem estar no navegador; a chave publicável identifica a aplicação, não concede privilégios administrativos. JWTs de sessão identificam usuários e também devem ser protegidos contra exposição em logs. service_role, secret keys, senha PostgreSQL e token pessoal da CLI nunca podem entrar no bundle nem em variáveis NEXT_PUBLIC_. Nenhuma dessas credenciais privilegiadas é usada nos clientes implementados.

As fábricas em `src/lib/supabase/client.ts` e `server.ts` leem a configuração somente quando chamadas. A página inicial não as chama; build e página inicial continuam funcionando sem `.env.local`. Isso **não comprova conexão com o projeto real**. `env.ts` rejeita chave secret/JWT em lugar da Publishable Key e URL remota sem HTTPS. Essa validação de formato não prova que a chave existe ou pertence ao projeto.

`@supabase/ssr` fornece os clientes com cookies adequados ao Next.js, e `@supabase/supabase-js` fornece o SDK exigido por ele. O cliente servidor é criado por requisição e usa `next/headers`, que não pode ser importado por Client Components. Na Etapa 04, Server Components usam leitura de cookies e o proxy persiste a renovação antes da renderização. Server Actions passam writeCookies=true para login/logout; erros de gravação nesses contextos não são silenciados. Há login mínimo e-mail/senha e logout, sem callbacks. Consulte autenticacao.md.

## Migration e permissões

Arquivo: `supabase/migrations/20260926000100_multi_tenant_foundation.sql`. Cria as três tabelas em transação, com constraints, índices, RLS e grants na mesma entrega. Não insere usuários, empresas ou administradores. O nome e a ordem da migration devem permanecer estáveis depois que ela for aplicada a um ambiente compartilhado.

| Tabela definida | Integridade | Policies |
| --- | --- | --- |
| organizations | UUID automático; nome não vazio; data automática | organizations_select_member_or_admin, organizations_insert_admin, organizations_update_admin |
| organization_members | PK empresa/usuário; FKs; CLIENTE por CHECK; índice user_id/organization_id | members_select_own_or_admin, members_insert_admin, members_update_admin, members_delete_admin |
| user_global_roles | PK usuário/papel; FK; ADMIN_ADSCOM por CHECK | global_roles_select_own |

Usuário excluído remove vínculos/papéis por CASCADE. A FK de empresa usa RESTRICT. Não há grant/policy para excluir organizações pela API comum, mesmo para administrador.

Grants anteriores de PUBLIC, anon e authenticated são removidos **apenas dessas três tabelas novas**. authenticated recebe SELECT nas três, INSERT/UPDATE apenas da coluna name em organizations, INSERT/UPDATE de organization_id/user_id/role e DELETE em organization_members. Não recebe escrita de user_global_roles, alteração de IDs de empresas, timestamps, TRUNCATE ou outros privilégios. Os grants permitem a operação ao papel PostgreSQL; as policies decidem qual usuário pode realizá-la. service_role não é usado como caminho administrativo da aplicação.

**Não há funções SQL auxiliares nem SECURITY DEFINER.** O grafo de leitura é acíclico: papéis globais → auth.uid(); membros → papéis globais; empresas → membros/papéis globais. A subconsulta de administrador também sofre RLS, portanto vê somente a concessão do próprio usuário. Não ampliar global_roles_select_own sem revisar todas as policies dependentes. Revogações são lidas no banco na próxima consulta, sem depender de um papel guardado no JWT. As policies de UPDATE possuem USING e WITH CHECK.

## Ambiente local e migrations

Pré-requisitos: Node conforme README e Docker Desktop com contêineres Linux instalado/em execução. A CLI já está nas dependências de desenvolvimento; `npm ci` a instala. Não precisa fazer login no Supabase para testes locais. Os comandos abaixo criam/iniciam contêineres e podem baixar imagens; não são comandos de implantação remota.

```sh
npm run db:start
npm run db:migrate
npm run test:db
npm run test:rls:api
npm run db:stop
```

`db:start` inicia a stack local e aplica migrations no primeiro provisionamento. `db:migrate` aplica somente migrations locais pendentes, sem reset. `db:stop` encerra a stack sem a opção de apagar volumes. Não há script de reset remoto. Para provar criação desde banco vazio, use uma instalação local nova e descartável; não apague um ambiente com dados sem revisar e autorizar essa ação.

`supabase/config.toml` identifica o projeto local como adscom-dashboard, PostgreSQL 17 (padrão gerado pela CLI), API 54321 e banco 54322. Confirmar a versão principal do PostgreSQL remoto antes de homologar a migration. A API expõe somente public. Não há seed. Cadastro habilitado e confirmação de e-mail desabilitada são configurações **somente do Auth local**, necessárias aos testes descartáveis; não aplicar essas opções ao remoto nem confundir com cadastro público implementado na aplicação.

## Testes de isolamento

`npm run test:db` executa os dois arquivos SQL e soma 90 asserções após a Etapa 09B. A suíte original contém 52 asserções (48 originais e quatro da Etapa 05) em `supabase/tests/database/001_multi_tenant.test.sql` via pgTAP. A preparação de fixtures ocorre com o proprietário local; as verificações de acesso fazem SET LOCAL ROLE authenticated/anon e definem request.jwt.claims para simular o contexto do Auth. Somente preparação, integridade e limpeza usam o proprietário. O arquivo termina em ROLLBACK; fixtures não persistem. Ele não deve ser executado em produção nem com `--linked`.

`npm run test:rls:api` usa Supabase Auth local para criar seis usuários temporários `rls-<UUID>-<papel>@example.test` com senhas aleatórias apenas em memória. As requisições usam chave pública local e JWTs emitidos pelo Auth, sem service_role. O script não lê `.env.local`, fixa a API em 127.0.0.1:54321, exige contexto Docker local e usa somente o contêiner supabase_db_adscom-dashboard. Obtém a chave pública via status da CLI em memória, sem exibir sua saída.

Para preparar vínculos/concessões e limpar fixtures, o teste usa `docker exec ... psql` no contêiner local como postgres. Isso serve exclusivamente à preparação/limpeza do teste e não é o mecanismo de acesso da aplicação. Organizações são marcadas TESTE API e UUID da execução. A limpeza ocorre em finally e reporta o identificador da execução se falhar. Uma interrupção forçada pode deixar resíduos; revise somente os registros identificados daquela execução no banco local. Não adaptar esse teste para receber URL remota.

| Cenário solicitado | Resultado esperado | Resultado nesta entrega |
| --- | --- | --- |
| A | Cliente A vê somente A | Passou — pgTAP e HTTP local |
| B | UUID direto de B não retorna dados para A | Passou — pgTAP e HTTP local |
| C | Cliente não cria organization | Passou — pgTAP e HTTP local |
| D | Cliente não cria vínculo com B | Passou — pgTAP e HTTP local |
| E | Cliente não se promove a ADMIN_ADSCOM | Passou — pgTAP e HTTP local |
| F | Administrador vê A e B | Passou — pgTAP e HTTP local |
| G | Administrador cria organization | Passou — pgTAP e HTTP local |
| H | Anônimo sem acesso | Passou — pgTAP e HTTP local |
| I | Revogação de vínculo retira acesso com mesmo JWT | Passou — pgTAP e HTTP local |

A suíte SQL também cobre cliente B, múltiplos vínculos, usuário sem vínculo, leitura de concessões próprias, edição/remoção de vínculos, proibição de escrita de papéis globais por admin, revogação de admin, troca de organization_id por cliente, grants de colunas, CHECKs, RESTRICT, CASCADE e ativação de RLS. A suíte HTTP complementa os cenários A–I e parte dessas verificações. Uma atualização/deleção bloqueada por RLS pode retornar zero linhas em vez de erro; os testes consideram esse comportamento. Infraestrutura indisponível resulta em código de saída diferente de zero, nunca em aprovação silenciosa.

`npm test` contém 13 testes de configuração do SDK, credenciais, seleção de empresa e entradas administrativas. Ele não substitui testes de RLS nem demonstra conexão com Supabase.

## Aplicar ao projeto remoto — procedimento não executado pelo agente

Primeiro concluir testes locais e revisar o SQL. A Publishable Key não tem permissão para migrations. A CLI pode precisar autenticar a conta Supabase e de acesso administrativo ao banco; esses dados ficam no armazenamento local da CLI ou no prompt seguro, nunca em arquivos versionados ou argumentos contendo senhas.

1. `npm run supabase -- login`: autentica a CLI na conta de gestão, não um usuário cliente do SaaS. Realizar interativamente; não compartilhar token no chat.
2. `npm run supabase -- link --project-ref SEU_PROJECT_REF`: vincula este checkout ao projeto escolhido. Conferir nome, região, referência e versão PostgreSQL; se pedir senha do banco, informar apenas no prompt seguro.
3. `npm run supabase -- migration list --linked`: conferir histórico remoto. Se aparecerem migrations ou tabelas inesperadas, parar e reconciliar antes de aplicar; não usar repair/reset para esconder divergências.
4. `npm run supabase -- db push --dry-run`: revisar migrations pendentes. Dry-run lista o que seria aplicado; não valida todo o SQL ou a segurança das policies.
5. Após revisão do destino e do resultado, `npm run supabase -- db push`: aplica a migration pendente, criando somente as três tabelas, índice, constraints, grants e policies. Não executado nesta entrega.

Não resetar o remoto. Se já existirem tabelas de mesmo nome, a migration falhará em vez de sobrescrevê-las. Não criar tabelas manualmente no Dashboard. A concessão do primeiro ADMIN_ADSCOM fica para uma operação privilegiada controlada separada, após identificar o usuário Auth correto; nenhum administrador é concedido por esta migration.

## Conceitos para continuar o projeto

- **Migration:** arquivo SQL ordenado que registra uma mudança de estrutura e permite repetir a mesma mudança em ambientes diferentes.
- **RLS:** regras aplicadas pelo PostgreSQL a cada linha lida ou modificada, conforme o usuário da requisição.
- **Empresa e vínculo separados:** uma empresa pode ter vários usuários e um usuário pode acessar várias empresas sem duplicar cadastros.
- **Administrador global separado:** administrar a plataforma não é um cargo dentro de uma empresa cliente.
- **Isolamento:** auth.uid() identifica o usuário; o banco cruza esse ID com seus vínculos/papéis. Alterar um UUID na requisição não cria um vínculo. Esse comportamento foi comprovado pelos testes locais desta etapa; o ambiente remoto não foi testado.
- **Frontend não basta:** uma pessoa pode chamar a API diretamente sem abrir a página; por isso grants e RLS precisam proteger os dados no banco.

Referências: [clientes SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [desenvolvimento local](https://supabase.com/docs/guides/local-development), [testes de banco](https://supabase.com/docs/guides/local-development/cli/testing-and-linting), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
