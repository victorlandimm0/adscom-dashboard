# Histórico de validações — Etapas 02–04

Registros preservados do README durante a Etapa 08. Descrevem cada entrega na época; não são o estado atual nem uma nova execução dos comandos. Para resultados atuais, consulte [consolidação](consolidacao.md).

## Histórico de validação da Etapa 02

- `npm ci`: passou, com 0 vulnerabilidades reportadas pela auditoria npm naquele momento.
- `npm run lint`: passou sem warnings de lint.
- `npm run typecheck`: passou.
- `npm run build`: passou, gerando `/` e a página interna de não encontrado.
- `npm start`: iniciou; HTTP 200, título, idioma pt-BR, selo de produção e CSS Tailwind verificados.
- `npm run dev`: iniciou; HTTP 200, título e selo de desenvolvimento verificados.
- `.gitignore`: confirmado para dependências, build, tipos gerados e `.env.local`.

As primeiras tentativas de build e desenvolvimento falharam com `spawn EPERM` no ambiente restrito do agente; ambas funcionaram ao permitir a criação de processos Node. Não foi necessário contornar verificações do framework. O aviso de fim de suporte do ESLint está registrado em consolidacao.md. Não foi realizada inspeção visual em navegador nem implantação na Hostinger. Na conferência final, `npm ls --depth=0` marcou auxiliares WASM como `extraneous` (@emnapi/core, @emnapi/runtime, @emnapi/wasi-threads, @img/sharp-wasm32, @napi-rs/wasm-runtime e @tybys/wasm-util), mesmo após npm ci bem-sucedido. Eles não são dependências diretas declaradas; o aviso permanece registrado, sem impacto observado em lint, tipos, build e execução. Os servidores de validação foram encerrados. Não existem testes de funcionalidades de negócio, pois elas ainda não foram implementadas.


## Arquivos e comandos da Etapa 03

- `src/lib/supabase/{client,server,env}.ts`: clientes com chave publicável e validação de configuração.
- `.env.example`: nomes das duas variáveis, sem valores reais.
- `supabase/config.toml` e `supabase/.gitignore`: configuração local da CLI.
- `supabase/migrations/20260926000100_multi_tenant_foundation.sql`: tabelas, constraints, grants e RLS.
- `supabase/tests/database/001_multi_tenant.test.sql`: testes pgTAP com rollback.
- `scripts/test-rls-api.mjs`: testes locais pela API com JWTs reais e limpeza de fixtures.
- `tests/supabase-env.test.mjs`: testes da configuração, sem chamadas externas.
- [Guia Supabase](supabase.md): aplicação local/remota de migrations, permissões, conceitos e resultados A–I.

```sh
npm test
npm run db:start
npm run db:migrate
npm run test:db
npm run test:rls:api
npm run db:stop
```

Os comandos de banco exigem Docker Desktop em execução. A CLI é local ao projeto; não é necessário login para o ambiente local. Não executar testes no remoto. Não há script de reset nem migrations aplicadas remotamente nesta entrega.

## Validação da Etapa 03

Em 27/09/2026, Docker Desktop em execução e migration aplicada ao Supabase local (PostgreSQL 17). `npm run db:migrate` confirmou ausência de migrations locais pendentes.

- `npm run test:db`: **48/48 asserções pgTAP passaram**.
- `npm run test:rls:api`: **cenários A–I passaram**, além dos casos de múltiplos vínculos, usuário sem vínculo, escritas proibidas e revogação de administrador.
- Limpeza confirmada por consulta local: zero organizações, vínculos, papéis globais e usuários de teste restantes.
- Uma primeira execução do pgTAP revelou sintaxe inválida em seis asserções com CTE de escrita aninhada. As CTEs foram movidas ao nível superior; a suíte completa passou na repetição. A migration e as policies não precisaram mudar.
- O aviso `extension pgtap already exists, skipping` é informativo e não impediu os testes.

Instalação limpa, lint, typecheck, build e quatro testes de configuração já passaram na implementação anterior. Nesta retomada foi alterado somente o teste SQL e a documentação; não houve mudanças na aplicação nem nas dependências. Restrições locais de acesso ao Docker/CLI foram resolvidas usando a permissão de execução apropriada.

O provisionamento inicial precisou baixar as imagens Docker. Nenhuma migration foi aplicada ao remoto, não houve login/link da CLI ou concessão de administrador real. A validação é do ambiente local, não do projeto hospedado. Resultados individuais e detalhes em [Supabase](supabase.md).

A Etapa 03 foi validada localmente. A Etapa 04 mínima foi posteriormente autorizada; aplicação remota continua fora do escopo desta execução.


## Autenticação mínima — Etapa 04

Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY somente em `.env.local`, conforme `.env.example` (sem valores reais). Não há novas variáveis ou dependências. A página `/` funciona sem configuração; `/login` e `/app` exigem um Supabase acessível e configurado. Use um usuário Auth existente com e-mail e senha. Não há cadastro na aplicação.

- `/login` envia credenciais para uma Server Action. O Supabase valida a senha e a sessão é persistida em cookies; sucesso redireciona para `/app`.
- `src/proxy.ts` renova a sessão antes de renderizar essas rotas e preserva cookies/headers de cache privados.
- `/app` consulta `auth.getUser()` no servidor antes de exibir e-mail e confirmação de autenticação. Anônimo vai para `/login`; autenticado em `/login` vai para `/app`.
- `Sair` executa signOut com scope local em Server Action, remove cookies e redireciona ao login. Não encerra sessões de outros dispositivos.
- Não há callback porque o fluxo é e-mail/senha. Na Etapa 05, `/app` também consulta vínculos, empresas e papel global sob RLS.

Detalhes de ambiente, configuração de usuários, limites e roteiro manual: [Autenticação](autenticacao.md).

### Validação da Etapa 04

- Lint, typecheck e build de produção: passaram. `/login` e `/app` são dinâmicas.
- `npm test`: sete testes passaram (quatro de ambiente e três de validação das credenciais).
- Navegador headless contra build de produção e Supabase local: anônimo redirecionado; senha incorreta recusada com erro genérico; login válido; e-mail correto; sessão persistente após reload; autenticado em /login redirecionado; renovação com expiração simulada no cookie; headers private/no-store; logout; cookies removidos; acesso negado após logout e com cookie adulterado. Usuário temporário removido ao final.
- A primeira verificação adicional de cache falhou em modo de desenvolvimento. O token já era renovado corretamente; a resposta de produção confirmou private/no-store. Nenhuma política RLS precisou mudar.
- Os testes de navegador foram executados com ferramenta já disponível no ambiente, sem adicionar Playwright ao projeto. O roteiro manual está documentado. A suíte RLS anterior não foi alterada nem repetida, pois não houve mudanças no banco.

Permanece o aviso anterior sobre suporte do ESLint 9. Nenhum teste foi executado no remoto e nenhum `.env.local` com valores reais foi criado nesta etapa. Configuração remota e usuários de acesso continuam sob responsabilidade do desenvolvedor. A Etapa 05 foi autorizada posteriormente e está descrita em autenticacao.md.
