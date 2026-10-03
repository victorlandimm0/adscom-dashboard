# Administração mínima — Etapas 07 e 10A

Área para ADMIN_ADSCOM cadastrar empresas e gerenciar vínculos de usuários Auth existentes. Implementação sem dependências novas, migrations, alterações de grants/policies ou chave privilegiada. Não inclui edição/exclusão de empresas, cadastro/exclusão de usuários Auth, convites, e-mails, senhas ou módulos de negócio.

## Fluxo e rotas

- `/app`: o administrador encontra o link “Administração”; clientes não recebem esse link.
- `/admin`: visão geral administrativa, com navegação para Empresas.
- `/admin/empresas`: lista nome, UUID e data de criação; formulário “Nova empresa” aceita somente nome.
- `/admin/empresas/[id]`: detalhe, unidades (listagem/cadastro/renomeação), vínculos, formulário por UUID e remoção de vínculo com confirmação.

O shell mostra ADSCOM Admin, usuário autenticado, Visão geral, Empresas, Voltar ao Dashboard e Sair. O logout reutiliza a action existente e limpa também o cookie de empresa. O proxy foi estendido para `/admin/:path*`, preservando renovação de sessão e headers privados/no-store.

“Abrir no Dashboard” reutiliza `selectOrganization` da Etapa 06. Não cria outra preferência: a mesma action valida a empresa acessível, grava o mesmo cookie HTTP-only com Path=/app e redireciona para `/app`. Não é necessário ler esse cookie na área administrativa, que opera sobre a empresa da URL, sempre validada no servidor.

## Autorização e banco

`src/lib/admin/access.ts` valida `getUser()` e lê a própria concessão ADMIN_ADSCOM em `user_global_roles`. Cada página e cada Server Action executa essa verificação; a proteção não depende só do layout. Anônimo vai para `/login`; cliente, administrador revogado ou falha na leitura do papel vai para `/app`. `React.cache` apenas deduplica dentro da renderização da requisição, sem cache de autorização compartilhado.

Todas as operações usam o cliente Supabase com a sessão normal do usuário e chave publicável. A leitura/alteração final passa novamente por RLS, inclusive se ocorrer revogação entre a verificação inicial e a query. Não há autorização por cookie, metadata, papel enviado no formulário ou visibilidade de botão.

A migration existente já oferece tudo que este fluxo exige:

- `organizations_insert_admin` e grant INSERT em name permitem cadastrar empresa.
- `members_insert_admin` e os grants existentes permitem vincular com role CLIENTE.
- PK `(organization_id, user_id)` impede duplicidade; FK para `auth.users(id)` exige conta existente; CHECK aceita somente CLIENTE.
- `members_delete_admin` permite remover vínculo. DELETE filtra empresa, usuário e role CLIENTE; não escreve em `auth.users` nem `user_global_roles`.

Nenhuma migration ou função privilegiada foi necessária. ADMIN_ADSCOM continua global e não ganha membership automaticamente.

## Validação e feedback

Nome: texto obrigatório, trim e 1–160 caracteres no servidor. O cadastro grava somente name; ID e data vêm do banco. Sucesso redireciona ao detalhe com feedback. Nomes iguais são permitidos pelo modelo; não foi acrescentada restrição de unicidade.

Vínculo: organization_id e user_id precisam ser UUIDs; o servidor fixa role=CLIENTE, ignorando qualquer papel enviado. A empresa precisa estar acessível. FK não satisfeita gera mensagem para conferir usuário/empresa; conflito de PK informa vínculo já existente. Não é necessário consultar ou expor `auth.users`.

Remoção: checkbox explícito em cada vínculo, sem marcação prévia, informa que conta Auth e demais vínculos serão preservados. A action também exige `confirmation=confirm`; HTML não é a única validação. A operação afeta só a chave composta informada. Se zero linhas forem removidas, informa registro indisponível; não afirma sucesso indevidamente.

IDs de detalhe malformados, inexistentes ou inacessíveis usam `notFound()` sem revelar dados. Erros de consulta exibem mensagem genérica; lista vazia só é exibida se a consulta tiver sucesso. Erros brutos do SDK não são mostrados. Feedback por query string é somente apresentação, nunca prova de autorização ou de estado atual.

## Unidades — Etapa 10A

A seção “Unidades” da empresa lista somente suas locations, ordenadas por nome e ID, com o nome como identificação principal. Zero unidades é válido e mostra “Nenhuma unidade cadastrada.”; erro de consulta tem mensagem própria. O cadastro pede somente nome e a renomeação usa um formulário simples por unidade, sem rotas adicionais.

`createLocation` e `renameLocation` reutilizam `requireAdmin`, o validador administrativo de nomes (`readCompanyName`), a checagem de UUID e `AdminFeedback`. O ID da empresa é vinculado à action na página renderizada; não existe campo editável de empresa. Esse argumento continua sendo entrada não confiável: o servidor valida UUID, sessão, papel global e existência/acesso à empresa a cada mutation. Campos adicionais enviados no formulário são ignorados. O cookie de seleção do Dashboard não participa dessa autorização.

A criação grava somente organization_id validado e name com trim (1–160 caracteres). A renomeação valida também location_id e executa UPDATE somente de name, filtrando simultaneamente id e organization_id. Zero linhas atualizadas retorna “Registro indisponível ou sem acesso”, igualmente para unidade inexistente e unidade de outra empresa, sem revelar seu nome. Empresa inválida/inexistente no detalhe usa notFound; nas actions gera feedback de ID inválido/registro indisponível. Falhas do banco têm mensagem genérica.

As queries usam sessão normal e RLS existente. ADMIN_ADSCOM administra unidades globalmente, mas a edição deve corresponder ao par empresa/unidade da página. CLIENTE e administrador revogado são redirecionados para `/app`; anônimo, para `/login`, inclusive em POST direto. CLIENTE mantém apenas o SELECT autorizado pela RLS, sem nova interface no Dashboard.

Não há exclusão, arquivamento, transferência, novos campos, permissão por unidade ou unicidade de nome. ID, organization_id e created_at não são editados. Nenhuma migration, policy ou grant foi criada/alterada. A Etapa 10A não conclui toda a Etapa 10; 10B e módulos de negócio não foram iniciados.

`LocationSubmit` usa `useFormStatus` apenas nos dois formulários de unidades: desabilita o botão e mostra “Salvando…” durante o envio. Isso reduz cliques repetidos com JavaScript, mas não é idempotência: múltiplas requisições independentes podem criar nomes repetidos, permitidos pelo modelo. Idempotência global e paginação continuam pendentes.

`scripts/test-admin-locations-http.mjs` integra `test:dashboard` pelo teste administrativo existente. Exercita formulários SSR reais, persistência, nomes vazios/longos/limite 160, UUIDs e empresas/unidades inexistentes, argumento de empresa adulterado, contexto A com unidade B, campos imutáveis, bloqueio de clientes/anônimo e revogação de admin. Usa exclusivamente as fixtures locais do harness, com limpeza em finally; não acessa o Supabase remoto.

### Validação da Etapa 10A em 03/10/2026

- Lint, TypeScript, 13 testes unitários, build e `git diff --check`: passaram.
- `test:db`: 90/90 asserções pgTAP passaram nas duas execuções da retomada.
- `test:rls:api`: passou nas duas execuções, incluindo isolamento, grants, revogações e locations com JWTs comuns.
- `test:dashboard`: passou nas duas execuções, incluindo shell/login/seleção/logout, administração anterior e novos testes HTTP de unidades. Foram confirmados cadastro/renomeação persistidos, listagem A/B isolada, contexto A com unidade B recusado, campos imutáveis, nomes/UUIDs inválidos, registros inexistentes, nomes repetidos permitidos e bloqueio de clientes/anônimo/admin revogado.
- As fixtures temporárias foram removidas pelo harness em cada execução. A conferência final por SELECT no banco local retornou zero empresas TESTE API/ADMIN, zero unidades TESTE e zero usuários Auth rls-…@example.test. pgTAP preservou sua execução transacional.
- O bloqueio inicial era ambiental: o Docker Desktop falhou no socket local `docker-secrets-engine/engine.sock`. Após o usuário restabelecer Docker/Supabase local, a regressão passou sem correção de código ou testes. Nenhum reset, mudança de migration/policy/grant ou operação remota foi realizado.
- A rodada final repetiu lint, TypeScript, unitários, pgTAP, HTTP/RLS, dashboard/administração/unidades e build. O build habitual foi regenerado depois do build local do harness. Nenhum teste foi reduzido, removido ou ignorado.

A validação automatizada local está concluída. A Etapa 10A continua aguardando revisão humana e teste manual no navegador para aprovação. Na retomada, somente este registro documental foi atualizado; não houve commit/push e o HEAD aprovado permanece em `1b7f3f4`.

### Roteiro manual da Etapa 10A — pendente de revisão

1. No ambiente de teste escolhido, entre como ADMIN_ADSCOM, abra `/admin` → Empresas → Ver empresa na Empresa A.
2. Confira a seção Unidades; em empresa sem unidades deve aparecer “Nenhuma unidade cadastrada.”.
3. Cadastre uma unidade de teste com nome identificável. Confira “Unidade cadastrada.” e o nome na lista; atualize o navegador e confira persistência.
4. Altere o nome no formulário da unidade e clique “Salvar nome”. Confira “Unidade atualizada.”; recarregue e confira o novo nome. Abra a Empresa B e confirme que a unidade de A não aparece.
5. Confira labels, navegação por teclado, foco, largura mobile e estado “Salvando…” em envio pendente. Campos vazios não devem ser aceitos.
6. Saia e entre como CLIENTE. Abra `/admin` e o detalhe de A diretamente: deve retornar a `/app`. Confira que o Dashboard não ganhou gestão de unidades.

O agente não executa esse roteiro no navegador. Não há botão de exclusão; para ensaios descartáveis, prefira o ambiente local com limpeza controlada das fixtures.

## Limitações administrativas existentes

Memberships exibem apenas user_id, role e created_at. E-mail de outro usuário e perfil Auth não são consultados, e não existe tabela profiles. O administrador precisa obter o UUID correto no gerenciamento do Supabase Auth. Datas são exibidas em português no fuso America/Sao_Paulo.

As listagens mantêm o limite de resposta configurado no Supabase, sem paginação nesta etapa. A aplicação não oferece exclusão de empresa, concessão de ADMIN_ADSCOM ou gestão de credenciais. Confirmação de remoção é feita por checkbox; não há modal ou biblioteca de UI. Não há controle de idempotência para duplo envio do cadastro de empresa; memberships são protegidas por PK.

## Validação local em 30/09/2026

- `npm test`: 13 testes, incluindo nome e UUIDs administrativos.
- `npm run test:db`: 52 asserções pgTAP existentes, sem mudanças de policies.
- `npm run test:dashboard`: regressão do shell/login/seleção/logout, novo fluxo administrativo e suíte HTTP/RLS anterior.
- `npm run lint`, `npm run typecheck`, `npm run build` e `git diff --check`: passaram. O build final foi regenerado com a configuração habitual após o teste local.

O teste administrativo (`scripts/test-admin-http.mjs`) usa o servidor e as fixtures locais da suíte existente. Testa anônimo e clientes A/B em quatro URLs e POSTs de criação/vínculo/remoção; também chama a API Supabase com JWTs de A/B. Verifica criação com trim, listagem, detalhe, ausência de membership artificial, UUIDs adulterados/inexistentes, duplicidade, papel fixo, confirmação obrigatória, preservação de Auth e demais vínculos, notFound, seleção pelo mecanismo existente, revogação de admin e logout em `/admin`.

O banco de teste é exclusivamente local, API fixa 127.0.0.1:54321 e contêiner `supabase_db_adscom-dashboard`. A nova empresa tem nome único TESTE ADMIN + UUID e é removida em finally; as fixtures anteriores também são removidas pelo harness. O teste restaura a concessão temporariamente revogada antes da limpeza. Não acessa contas/empresas remotas nem modifica `.env.local`. Requer Docker/Supabase local em execução, porta 3106 livre e ausência de dev/build concorrente. Após `test:dashboard`, refazer `npm run build` antes de usar `npm start` com a configuração habitual, pois o teste gera `.next` com configuração local.

## Revisão manual e roteiro de regressão

O usuário confirmou a revisão manual no navegador: acesso ADMIN_ADSCOM, cadastro, abertura no Dashboard, vínculo de Auth existente, acesso do cliente à nova empresa, seleção múltipla persistente após refresh e remoção do vínculo preservando Auth/outros vínculos. Confirmou também perda de acesso com cookie antigo, seleção automática quando resta uma empresa e desaparecimento da empresa de teste para o cliente após a remoção. O ambiente dessa revisão não foi especificado. O agente não executou teste remoto nem inspeção visual nesta consolidação.

O roteiro abaixo permanece para regressão; layout mobile, teclado e casos de erro não foram individualmente confirmados pelo relato:

1. Entre como ADMIN_ADSCOM e siga Dashboard → Administração → Empresas → Ver empresa. Confira UUID, data e vínculos.
2. Cadastre uma empresa de teste com nome identificável. Confira feedback e o detalhe; não use dados reais para testar.
3. Vincule um UUID Auth de desenvolvimento existente. Repita para conferir duplicidade; confira também UUID inválido/inexistente.
4. Marque a confirmação e remova apenas o vínculo de teste. Confirme que a conta Auth e outros vínculos permanecem. A interface não exclui a empresa de teste; combine sua limpeza controlada no ambiente local ao terminar.
5. Use Abrir no Dashboard, navegue, recarregue e confira a empresa selecionada. Teste Voltar ao Dashboard e Sair.
6. Como clientes A/B, tente abrir `/admin` e detalhes diretamente: deve voltar ao Dashboard; empresas permitidas e logout devem continuar corretos.
7. Confira desktop/mobile, teclado, foco, nomes/UUIDs longos e mensagens de confirmação. Nenhuma action de remoção é executada por GET.

A Etapa 08 consolidou a documentação; resultados da reexecução da suíte em [consolidação](consolidacao.md). Nenhum módulo placeholder foi transformado em funcionalidade de negócio.
