# Administração mínima — Etapa 07

Área para ADMIN_ADSCOM cadastrar empresas e gerenciar vínculos de usuários Auth existentes. Implementação sem dependências novas, migrations, alterações de grants/policies ou chave privilegiada. Não inclui edição/exclusão de empresas, cadastro/exclusão de usuários Auth, convites, e-mails, senhas ou módulos de negócio.

## Fluxo e rotas

- `/app`: o administrador encontra o link “Administração”; clientes não recebem esse link.
- `/admin`: visão geral administrativa, com navegação para Empresas.
- `/admin/empresas`: lista nome, UUID e data de criação; formulário “Nova empresa” aceita somente nome.
- `/admin/empresas/[id]`: detalhe, vínculos, formulário por UUID e remoção com confirmação.

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

## Informações e limitações

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
