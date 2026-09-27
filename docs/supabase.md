# Etapa 03 — operação e validação da fundação de dados

## Estado real

**Validação local concluída em 27/09/2026.** A inicialização do Supabase local aplicou a migration. `npm run db:migrate` confirmou que não havia migrations pendentes. As 48 asserções pgTAP e os cenários A–I da suíte HTTP passaram. Não houve alteração nas policies ou na migration.

Na primeira execução, pgTAP parou após oito asserções por erro de sintaxe do teste: CTEs com UPDATE/DELETE estavam aninhadas em argumentos de função. Seis asserções foram corrigidas colocando a CTE no nível superior, mantendo os mesmos resultados esperados. A repetição completa passou. O NOTICE sobre pgTAP já instalado é informativo.

A limpeza foi confirmada por consulta local: organizations=0, organization_members=0, user_global_roles=0 e usuários de teste=0. Os testes SQL usam rollback; a suíte HTTP removeu suas fixtures. A indisponibilidade de Docker registrada na entrega anterior foi resolvida pelo desenvolvedor.

O projeto remoto ADSCOM Dashboard, região São Paulo, foi informado pelo desenvolvedor. A CLI não foi autenticada ou vinculada a ele. Nenhuma operação remota foi executada; o schema remoto não foi inspecionado. Não foram criadas contas ou empresas de teste remotas.

## Configurar a aplicação

Copie `.env.example` para `.env.local`, sem sobrescrever um arquivo local já configurado. Preencha localmente:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use a URL HTTPS do projeto e sua Publishable Key (`sb_publishable_...`), obtidas nas configurações do Supabase. Não cole valores reais na documentação, código ou arquivos versionados. `.env.local` está ignorado pelo Git. Não foi criado um arquivo com credenciais reais nesta entrega.

Esses dois valores podem estar no navegador; a chave publicável identifica a aplicação, não concede privilégios administrativos. JWTs de sessão identificam usuários e também devem ser protegidos contra exposição em logs. service_role, secret keys, senha PostgreSQL e token pessoal da CLI nunca podem entrar no bundle nem em variáveis NEXT_PUBLIC_. Nenhuma dessas credenciais privilegiadas é usada nos clientes implementados.

As fábricas em `src/lib/supabase/client.ts` e `server.ts` leem a configuração somente quando chamadas. A página inicial não as chama; build e página inicial continuam funcionando sem `.env.local`. Isso **não comprova conexão com o projeto real**. `env.ts` rejeita chave secret/JWT em lugar da Publishable Key e URL remota sem HTTPS. Essa validação de formato não prova que a chave existe ou pertence ao projeto.

`@supabase/ssr` fornece os clientes com cookies adequados ao Next.js, e `@supabase/supabase-js` fornece o SDK exigido por ele. O cliente servidor é criado por requisição e usa `next/headers`, que não pode ser importado por Client Components. Sua gravação de cookies exige Route Handler ou Server Action. Não há proxy, renovação de sessão em Server Components, callbacks ou login; não usar esse cliente para autenticação em produção antes da Etapa 04. Erros de gravação de cookies não são silenciados.

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

`npm run test:db` contém 48 asserções e executa `supabase/tests/database/001_multi_tenant.test.sql` via pgTAP. A preparação de fixtures ocorre com o proprietário local; as verificações de acesso fazem SET LOCAL ROLE authenticated/anon e definem request.jwt.claims para simular o contexto do Auth. Somente preparação, integridade e limpeza usam o proprietário. O arquivo termina em ROLLBACK; fixtures não persistem. Ele não deve ser executado em produção nem com `--linked`.

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

`npm test` testa somente validação de configuração do SDK. Ele não substitui testes de RLS nem demonstra conexão com Supabase.

## Aplicar ao projeto remoto — procedimento ainda não executado

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
