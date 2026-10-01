# Consolidação da fundação — Etapa 08

Auditoria em 30/09/2026, no projeto `C:\Projetos\ADSCOM\adscom-dashboard`. Este relatório separa as mudanças desta etapa do trabalho acumulado das Etapas 05–07. Nenhuma etapa de negócio foi iniciada.

## Diagnóstico e problemas encontrados

A fundação possui autenticação SSR, autorização no servidor e RLS nas três tabelas atuais. CLIENTE depende de vínculo; ADMIN_ADSCOM é global, consultado no banco. Seleção de empresa é preferência de sessão revalidada, não permissão. Administração usa a sessão normal, sem chave privilegiada. A suíte cobre revogação e acesso direto à API com JWTs comuns.

A revisão encontrou contradições documentais: referências a Etapas 06/07 não iniciadas, revisão manual ainda pendente, árvore com rotas futuras misturadas às atuais e descrição incompleta dos testes. O README acumulava histórico extenso e afirmava ausência de chamadas externas apesar do login Supabase. Esses pontos foram corrigidos. Não foi identificado problema objetivo de código que justificasse alteração nesta etapa. Lint verifica imports/variáveis não usados; não foram encontrados arquivos-fonte integralmente duplicados na inspeção.

O usuário confirmou revisão manual da Etapa 07: acesso administrativo, cadastro de empresa, abertura no Dashboard, vínculo de Auth existente, visibilidade para cliente, seleção múltipla após refresh, remoção preservando Auth/outros vínculos, revogação com cookie antigo e seleção automática para empresa única. O ambiente dessa revisão não foi especificado. A validação manual remota da Etapa 05 também foi informada pelo usuário. Nenhuma dessas evidências é um teste remoto executado pelo agente.

## Alterações desta etapa

Somente documentação foi alterada:

- `README.md`: onboarding conciso, requisitos, ambiente, papéis, estrutura e scripts reais.
- `AGENTS.md`: estado atual e escopo autorizado, preservando regras de segurança.
- `docs/arquitetura.md`: árvore real, administração e separação das propostas futuras.
- `docs/plano-mvp.md`: Etapas 01–08 e evidências, próximos incrementos separados.
- `docs/autenticacao.md`: contagens históricas identificadas e referências atuais.
- `docs/dashboard.md`: evolução administrativa, cookie de sessão e revisão informada.
- `docs/administracao.md`: revisão manual confirmada e roteiro de regressão mantido.
- `docs/supabase.md`: testes atuais e distinção entre evidência local e relato remoto.

Criados: este `docs/consolidacao.md` e `docs/historico-validacoes.md`. O segundo preserva o histórico das Etapas 02–04 retirado do README, sem apagar resultados anteriores. `docs/dashboard.md` e `docs/administracao.md` já existiam sem rastreamento antes desta etapa.

## Validações desta execução

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Passou, sem warnings |
| `npm run typecheck` | Passou, tipos de rotas e TypeScript |
| `npm test` | 13/13 passaram |
| `npm run test:db` | 52/52 asserções pgTAP passaram, rollback |
| `npm run test:rls:api` | Passou; cenários A–I, perfis múltiplos/sem vínculo, escritas proibidas e revogação; fixtures removidas |
| `npm run test:dashboard` | Passou; HTTP/RLS, dashboard e administração; fixtures removidas e servidor encerrado |
| `npm run build` | Passou após test:dashboard; configuração habitual restaurada no build |
| `git diff --check` | Passou, sem erros de whitespace |
| `npm ls --depth=0` | Exit 0; dependências diretas válidas; auxiliares extraneous descritos abaixo |

Testes SQL/HTTP exigem Docker Desktop e Supabase local com a migration já aplicada. A API é fixa em 127.0.0.1:54321 e o contêiner é `supabase_db_adscom-dashboard`. Dashboard/admin usam servidor de produção em 127.0.0.1:3106, com ambiente injetado somente no processo. Não há script `test:admin`: `scripts/test-admin-http.mjs` é chamado por `test:dashboard`. Não houve instalação, reset ou aplicação de migration nesta auditoria.

O NOTICE de pgTAP já instalado é informativo. Subprocessos Node e Docker exigiram execução fora da restrição inicial do sandbox. Uma tentativa de inventário via Node falhou com spawnSync git EPERM; a leitura foi refeita em PowerShell. Não houve falha de teste de produto ocultada. Testes HTTP não demonstram layout/hidratação; a revisão visual desta etapa não foi repetida pelo agente.

## Migrations e arquivos sensíveis

Existe somente `supabase/migrations/20260926000100_multi_tenant_foundation.sql`, sem diff contra HEAD e sem alteração nesta etapa. Não foram modificados schema, RLS, grants, configuração Supabase ou histórico de migrations. Testes validam o banco local; o schema/histórico remoto não foi consultado. Não foi encontrado `supabase/.temp/project-ref` neste checkout.

Foram revisados arquivos rastreados e não rastreados candidatos ao Git, `.env.example`, regras de ignore e o único commit existente. A busca por padrões de chaves privadas, secret keys, JWTs literais, tokens e credenciais não encontrou segredo real. Uma ocorrência era senha fictícia de teste unitário. `.env.example` contém somente os dois nomes esperados com valores vazios. Referências a tokens/service_role na documentação e testes não são credenciais reais.

`.env`, `.env.local` e variantes estão cobertas por `.env*`; apenas `.env.example` é exceção. Estão ignorados `.next/`, `node_modules/`, `next-env.d.ts`, `*.tsbuildinfo`, logs, coverage e estado local `supabase/.temp/`/`.branches/`. Cookies e senhas das fixtures HTTP ficam em memória; a suíte remove seus registros em finally. Não foi encontrado arquivo de sessão/cookie ou fixture persistida entre os candidatos ao Git. Nenhum segredo foi copiado, exibido, alterado ou rotacionado. A inspeção por padrões e revisão de arquivos não substitui uma garantia universal de ausência de segredos.

## Dívidas técnicas e limites

- Listagens sem paginação dependem do limite de resposta Supabase; planejar paginação antes de aumentar o volume.
- Cadastro de empresa sem idempotência pode duplicar nomes em duplo envio. Membership tem PK contra duplicidade.
- `src/lib/supabase/client.ts` está preparado, mas sem consumidor na aplicação atual. Preservado para não remover trabalho sem necessidade; reavaliar antes de uso futuro.
- Validação pequena de UUID aparece em administração e seleção. Não foi criada abstração apenas por estética.
- A suíte HTTP não cobre renderização/hidratação e acessibilidade de navegador. Manter roteiro manual; testes visuais podem ser incremento próprio.
- Scripts ocultam saídas brutas de subprocessos para evitar exposição; diagnósticos sanitizados mais específicos podem melhorar falhas futuras.
- `npm ls` aponta seis auxiliares WASM extraneous preexistentes: @emnapi/core, @emnapi/runtime, @emnapi/wasi-threads, @img/sharp-wasm32, @napi-rs/wasm-runtime e @tybys/wasm-util. Não há dependência direta faltante/inválida; não foi feita reinstalação ou remoção.
- O aviso de suporte do ESLint 9 foi registrado na instalação anterior. A combinação fixada foi mantida; revisar compatibilidade dos plugins antes de atualizar a versão principal. Esta etapa não consultou registro remoto nem repetiu auditoria de vulnerabilidades npm.
- Hostinger, homologação, configuração operacional de Auth, backups/restauração e deploy continuam pendentes de escopo/validação próprios.

## O que foi preservado

Código de aplicação, autenticação/cookies, autorização, logout, RLS, migration, scripts/testes, dependências, lockfile e regras de ignore não foram alterados nesta etapa. As mudanças acumuladas das etapas anteriores permanecem. Não houve commit, stage, push, mudança de branch, conexão GitHub, provisionamento, operação remota ou início da Etapa 09.

## Git e prontidão

Branch `main`; working tree já estava sujo ao iniciar: 12 arquivos rastreados modificados e 25 novos. Nada estava staged. Há um commit prévio (`24043bc`); o checkpoint futuro não será o primeiro commit do repositório. Inventário final abaixo inclui o trabalho acumulado, não somente a documentação da Etapa 08.

Com todas as validações aprovadas, a fundação está pronta para receber a definição da próxima etapa dentro dos limites documentados. A revisão humana precede qualquer checkpoint e definição da próxima etapa; não representa certificação de produção.

### Arquivos rastreados modificados (12)

- `AGENTS.md`
- `README.md`
- `docs/arquitetura.md`
- `docs/autenticacao.md`
- `docs/plano-mvp.md`
- `docs/supabase.md`
- `package.json`
- `scripts/test-rls-api.mjs`
- `src/app/(cliente)/app/actions.ts`
- `src/app/(cliente)/app/page.tsx`
- `src/proxy.ts`
- `supabase/tests/database/001_multi_tenant.test.sql`

### Arquivos novos (27)

- `docs/administracao.md`
- `docs/consolidacao.md`
- `docs/dashboard.md`
- `docs/historico-validacoes.md`
- `scripts/test-admin-http.mjs`
- `scripts/test-dashboard-http.mjs`
- `src/app/(admin)/admin/actions.ts`
- `src/app/(admin)/admin/empresas/[id]/page.tsx`
- `src/app/(admin)/admin/empresas/page.tsx`
- `src/app/(admin)/admin/feedback.tsx`
- `src/app/(admin)/admin/layout.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/app/(cliente)/app/avaliacoes/page.tsx`
- `src/app/(cliente)/app/configuracoes/page.tsx`
- `src/app/(cliente)/app/layout.tsx`
- `src/app/(cliente)/app/module-placeholder.tsx`
- `src/app/(cliente)/app/navigation.tsx`
- `src/app/(cliente)/app/nfc/page.tsx`
- `src/app/(cliente)/app/presenca/page.tsx`
- `src/app/(cliente)/app/relatorios/page.tsx`
- `src/app/(cliente)/app/template.tsx`
- `src/lib/admin/access.ts`
- `src/lib/admin/validation.ts`
- `src/lib/organizations/context.ts`
- `src/lib/organizations/selection.ts`
- `tests/admin-validation.test.mjs`
- `tests/organization-selection.test.mjs`

Resumo: 12 arquivos rastreados modificados e 27 novos (39 no total), nenhum staged. O diff rastreado consolida contexto/seleção de empresa, proxy administrativo, ampliação dos testes e documentação. Arquivos novos incluem shell, área administrativa, helpers e testes das etapas anteriores, além dos dois documentos desta etapa. Git diff --stat não inclui arquivos não rastreados. Os avisos LF→CRLF decorrem da configuração de finais de linha e não são erros de whitespace.
