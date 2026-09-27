# ADSCOM Dashboard

Plataforma de presença e evolução digital da ADSCOM.

**Estado atual: Etapa 03 — fundação de dados validada localmente.** A aplicação Next.js mantém somente a página inicial. Foram adicionados clientes Supabase, migration das três tabelas multi-tenant e testes. A migration foi aplicada somente no Supabase local. As duas suítes de RLS passaram em 27/09/2026; nenhuma operação remota foi executada. Não há login, dashboard de negócio, métricas ou integrações.

## Executar localmente

Use Node.js **24.14.1** (referência em `.nvmrc`) e npm **11.11.0**, versões utilizadas nesta etapa. O projeto declara suporte à linha Node 24 a partir de 24.14.1. Se usar um gerenciador de versões compatível, selecione a versão de `.nvmrc` antes de instalar.

```sh
npm ci
npm run dev
```

Acesse [localhost:3000](http://localhost:3000). Encerre com Ctrl+C. A página inicial continua funcionando sem variáveis. Para utilizar os clientes Supabase, copie `.env.example` para `.env.local` e preencha URL e Publishable Key localmente. Veja [configuração e migrations](docs/supabase.md).

## Verificações e produção local

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

- `lint`: ESLint CLI com regras Next.js Core Web Vitals e TypeScript; warnings fazem o comando falhar.
- `typecheck`: gera os tipos de rotas com `next typegen` e executa `tsc --noEmit`; funciona antes do primeiro build.
- `build`: gera a aplicação de produção em `.next`.
- `start`: executa o build em servidor Node.js. Para outra porta: `npm start -- --port 3001`.

Execute desenvolvimento e build separadamente. O selo da página exibe “Ambiente de desenvolvimento” em `npm run dev` e “Versão inicial” em produção. Não há dados demonstrativos ou chamadas a serviços externos.

## Estrutura atual

```text
src/app/
  layout.tsx       # HTML pt-BR, metadados e CSS global
  page.tsx         # única página inicial, Server Component
  globals.css      # Tailwind e estilos globais mínimos
eslint.config.mjs # ESLint flat config
postcss.config.mjs
next.config.ts    # preserva AGENTS.md contra geração automática
tsconfig.json
package.json
package-lock.json
.nvmrc
.gitignore
AGENTS.md
docs/
```

`next-env.d.ts`, `.next/` e arquivos incrementais são gerados e ignorados no Git. `next.config.ts` define somente `agentRules: false`, opção do Next.js 16.3.6 que evita alterações automáticas em AGENTS.md ao iniciar o desenvolvimento. Tailwind 4 usa CSS e PostCSS; não precisa de `tailwind.config.js` neste bootstrap. `.env.example` contém NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY vazias. Valores reais ficam somente em `.env.local`. `.env*` reais já estão ignorados.

## Dependências

Dependências diretas têm versões exatas em [package.json](package.json), e a árvore instalada está fixada em [package-lock.json](package-lock.json).

- Execução: Next.js 16.3.6, React 19.3.0 e React DOM 19.3.0.
- Desenvolvimento: TypeScript 5.9.3, tipos de Node/React/React DOM, ESLint 9 e eslint-config-next 16.3.6, Tailwind CSS 4.3.3, plugin PostCSS do Tailwind 4.3.3 e PostCSS 8.

A Etapa 03 adicionou @supabase/supabase-js 2.117.2 e @supabase/ssr 0.12.7 em execução, e Supabase CLI 2.118.0 em desenvolvimento. Não há bibliotecas de UI ou fontes remotas. O projeto declara ES Modules em package.json, evitando ambiguidade ao executar os testes TypeScript nativos do Node 24. A configuração de TypeScript permanece na linha estável 5.9, suficiente para esta stack; não é necessário adotar a versão principal mais recente para este bootstrap.

### Aviso de compatibilidade do ESLint

A instalação informa que ESLint 9.39.5 está fora de suporte. A configuração oficial do Next.js 16.3.6 depende de eslint-plugin-react 7.37.5, cujo peerDependency aceita ESLint somente até a linha 9. O bootstrap mantém essa combinação compatível, sem `--force` ou `--legacy-peer-deps`. Reavaliar a atualização para ESLint 10 quando a configuração oficial e seus plugins declararem suporte. Esse aviso não significa falha de lint e não foi ocultado.

## Portabilidade e Hostinger

O projeto usa `next build` e `next start`, sem serviços exclusivos da Vercel e sem exportação estática. A pré-renderização da página inicial é uma otimização do Next.js; a forma de execução documentada continua sendo Node.js.

O plano Hostinger ainda não foi verificado. Antes de implantar, confirmar suporte à linha Node 24 usada pelo projeto, instalação de dependências de desenvolvimento durante o build, processo Node persistente, configuração de porta, HTTPS e comandos de build/start. Hospedagem que aceite somente arquivos estáticos não atende à arquitetura futura. Não houve deploy nesta etapa.

## Documentação e próximas etapas

- [Arquitetura](docs/arquitetura.md): estrutura atual e desenho futuro de banco, autenticação, isolamento e NFC.
- [Plano do MVP](docs/plano-mvp.md): incrementos e critérios de aceite.
- [AGENTS.md](AGENTS.md): convenções e regras de segurança.

A migration define organizations, organization_members e user_global_roles, com oito policies e grants mínimos, sem funções SQL privilegiadas. O desenvolvedor informou a criação de um projeto Supabase remoto em São Paulo; ele não foi inspecionado nem vinculado à CLI. GitHub/remoto e primeiro administrador continuam sem configuração. Login, telas de clientes/admin, avaliações, NFC, pagamentos e integrações continuam futuros. A Etapa 04 não foi iniciada.

## Histórico de validação da Etapa 02

- `npm ci`: passou, com 0 vulnerabilidades reportadas pela auditoria npm naquele momento.
- `npm run lint`: passou sem warnings de lint.
- `npm run typecheck`: passou.
- `npm run build`: passou, gerando `/` e a página interna de não encontrado.
- `npm start`: iniciou; HTTP 200, título, idioma pt-BR, selo de produção e CSS Tailwind verificados.
- `npm run dev`: iniciou; HTTP 200, título e selo de desenvolvimento verificados.
- `.gitignore`: confirmado para dependências, build, tipos gerados e `.env.local`.

As primeiras tentativas de build e desenvolvimento falharam com `spawn EPERM` no ambiente restrito do agente; ambas funcionaram ao permitir a criação de processos Node. Não foi necessário contornar verificações do framework. O aviso de fim de suporte do ESLint está descrito acima. Não foi realizada inspeção visual em navegador nem implantação na Hostinger. Na conferência final, `npm ls --depth=0` marcou auxiliares WASM como `extraneous` (@emnapi/core, @emnapi/runtime, @emnapi/wasi-threads, @img/sharp-wasm32, @napi-rs/wasm-runtime e @tybys/wasm-util), mesmo após npm ci bem-sucedido. Eles não são dependências diretas declaradas; o aviso permanece registrado, sem impacto observado em lint, tipos, build e execução. Os servidores de validação foram encerrados. Não existem testes de funcionalidades de negócio, pois elas ainda não foram implementadas.


## Arquivos e comandos da Etapa 03

- `src/lib/supabase/{client,server,env}.ts`: clientes com chave publicável e validação de configuração.
- `.env.example`: nomes das duas variáveis, sem valores reais.
- `supabase/config.toml` e `supabase/.gitignore`: configuração local da CLI.
- `supabase/migrations/20260926000100_multi_tenant_foundation.sql`: tabelas, constraints, grants e RLS.
- `supabase/tests/database/001_multi_tenant.test.sql`: testes pgTAP com rollback.
- `scripts/test-rls-api.mjs`: testes locais pela API com JWTs reais e limpeza de fixtures.
- `tests/supabase-env.test.mjs`: testes da configuração, sem chamadas externas.
- [Guia Supabase](docs/supabase.md): aplicação local/remota de migrations, permissões, conceitos e resultados A–I.

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

O provisionamento inicial precisou baixar as imagens Docker. Nenhuma migration foi aplicada ao remoto, não houve login/link da CLI ou concessão de administrador real. A validação é do ambiente local, não do projeto hospedado. Resultados individuais e detalhes em [Supabase](docs/supabase.md).

A Etapa 03 está validada localmente e aguarda revisão humana. A Etapa 04 não foi iniciada. Aplicação remota continua fora do escopo desta execução.
