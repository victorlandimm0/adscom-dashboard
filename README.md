# ADSCOM Dashboard

SaaS B2B multiempresa para acompanhar a presença e a evolução digital dos clientes da ADSCOM. ENTRAR, ESTRUTURAR e CRESCER são estágios; SOLUTIONS é uma vertical de tecnologia.

A fundação das Etapas 01–07 está implementada: login/logout, sessão SSR, isolamento por RLS, contexto de empresa, shell do dashboard e administração mínima. A Etapa 08 consolida documentação e validações; veja o [relatório](docs/consolidacao.md). Presença, Avaliações, NFC, Relatórios e Configurações continuam placeholders. Não há integrações ou métricas de negócio.

## Executar localmente

Requisitos: Node **24.14.1** (`.nvmrc`), npm **11.11.0** e, para banco/testes locais, Docker Desktop com contêineres Linux em execução. Dependências diretas têm versões exatas e lockfile.

```sh
npm ci
```

Copie `.env.example` para `.env.local` somente se o arquivo local ainda não existir. Preencha localmente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do mesmo ambiente. O exemplo versionado tem valores vazios; arquivos reais de ambiente são ignorados. Nunca use secret key, service_role ou senha de banco nessas variáveis.

Para Supabase local, execute `npm run db:start` e obtenha a URL e a Publishable Key locais no Studio/CLI. A inicialização pode baixar imagens e aplicar migrations no primeiro provisionamento; `npm run db:migrate` aplica apenas migrations locais pendentes. Detalhes em [Supabase](docs/supabase.md). Não é necessário login/link da CLI para o ambiente local.

```sh
npm run dev
```

Abra [localhost:3000](http://localhost:3000). `/` funciona sem Supabase; `/login`, `/app` e `/admin` exigem configuração e serviço acessível. Use uma conta Auth existente com e-mail/senha: não há cadastro de usuários na aplicação. Pare com Ctrl+C; `npm run db:stop` encerra a stack local.

## Papéis e navegação

- **CLIENTE:** acessa somente empresas às quais está vinculado. Empresa única é selecionada automaticamente; múltiplas exigem seleção. A preferência sobrevive ao refresh em cookie de sessão e é revalidada no servidor/RLS.
- **ADMIN_ADSCOM:** papel global concedido por procedimento administrativo controlado, nunca pelo formulário. Acessa `/admin`, cadastra empresas e vincula/remove usuários Auth existentes por UUID. Remover vínculo preserva a conta Auth e outros vínculos.

Sem vínculo nem papel global, a conta não acessa empresas. A aplicação usa a sessão normal do usuário e chave publicável nessas operações.

## Validar

| Comando | O que verifica |
| --- | --- |
| `npm run lint` | ESLint, sem warnings permitidos |
| `npm run typecheck` | Tipos de rotas e TypeScript estrito |
| `npm test` | Configuração, credenciais, seleção de empresa e entradas administrativas |
| `npm run test:db` | 52 asserções pgTAP no Supabase local |
| `npm run test:rls:api` | Isolamento pela API com JWTs de usuários locais |
| `npm run test:dashboard` | HTTP/RLS, login, shell, seleção, logout **e administração** |
| `npm run build` | Build de produção |
| `git diff --check` | Problemas de whitespace no diff rastreado |

Testes de banco/HTTP exigem Supabase local já iniciado e migration aplicada; criam e removem fixtures descartáveis. Nunca executá-los contra o remoto. `test:dashboard` requer a porta 3106 livre e gera `.next` com configuração local injetada no processo, sem modificar `.env.local`. **Não execute dev/build/test:dashboard simultaneamente.** Faça `npm run build` depois de `test:dashboard` para restaurar o build com a configuração habitual; `npm start` serve esse build. Testes HTTP não substituem revisão visual/hidratação no navegador.

## Stack e estrutura

Next.js 16.3.6 (App Router), React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, Supabase Auth/PostgreSQL e SDK SSR. Scripts, versões e dependências completas em [package.json](package.json).

```text
src/app/(auth)/login/       # login e Server Action
src/app/(cliente)/app/     # shell e seis páginas placeholder
src/app/(admin)/admin/     # empresas e vínculos
src/lib/                   # auth, Supabase, contexto de empresa, autorização admin
src/proxy.ts               # renovação de sessão nas áreas autenticadas
supabase/migrations/       # fundação SQL versionada
supabase/tests/            # pgTAP
scripts/                   # testes HTTP/RLS, dashboard e administração
tests/                    # testes unitários Node
docs/                     # decisões, operação, validações e limites
```

`.next`, `node_modules`, tipos gerados e estado temporário Supabase são ignorados. O projeto usa `next build`/`next start`, sem dependência de serviços exclusivos da Vercel. Hostinger é o destino planejado; plano, runtime e implantação ainda precisam de validação.

## Documentação

- [Arquitetura](docs/arquitetura.md) e [plano do MVP](docs/plano-mvp.md).
- [Autenticação](docs/autenticacao.md), [dashboard](docs/dashboard.md) e [administração](docs/administracao.md).
- [Supabase, migrations e RLS](docs/supabase.md).
- [Consolidação, testes, Git e dívidas técnicas](docs/consolidacao.md).
- [Histórico de validações](docs/historico-validacoes.md) e [instruções para agentes](AGENTS.md).
