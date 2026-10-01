# Arquitetura — estado atual e evolução futura

## 1. Estado consolidado

As Etapas 01–07 implementam autenticação SSR, isolamento multiempresa, shell com contexto de empresa e administração mínima. A Etapa 08 consolida a fundação; consulte [plano](plano-mvp.md) e [resultados](consolidacao.md). A migration e as policies foram validadas localmente e permanecem inalteradas. O usuário informou revisões manuais; o agente não executou operações remotas. NFC e integrações abaixo são propostas futuras, não funcionalidades prontas.

## 2. Uma aplicação, um banco

Atualização da Etapa 07: `/admin` permite operações mínimas de empresas e vínculos. `requireAdmin` confirma sessão e papel global no banco em cada página/action; RLS continua aplicada na operação final. O modelo e as migrations permanecem intactos; memberships exibem UUID, sem consulta de e-mail Auth ou profiles. Consulte [administração](administracao.md).

Atualização da Etapa 06: `/app` e cinco subrotas usam shell autenticado e contexto de empresa resolvido no servidor. Empresa única é automática; múltiplas têm seleção explícita em cookie HTTP-only, revalidada contra empresas acessíveis sob RLS. ADMIN_ADSCOM mantém papel global, sem membership artificial. Layout, template e páginas reutilizam a consulta por requisição, sem cache privado compartilhado. O cadastro de empresas e painel administrativo estão descritos acima. Fluxo e validação em [dashboard](dashboard.md).

Usar Next.js App Router para páginas e operações de servidor, Supabase Auth para identidade e PostgreSQL/Supabase para dados. Não criar um backend separado agora: Route Handlers e Server Actions atendem às primeiras operações. Supabase fornece a API de dados; o acesso autenticado deve preservar o JWT do usuário para que RLS seja aplicada.

Usar SQL versionado e o cliente Supabase inicialmente. Um ORM adicionaria outra camada sem uma necessidade presente. Tailwind atende à estilização sem exigir uma biblioteca de componentes nesta etapa.

O Next.js será executado como servidor Node.js, com build e start convencionais. Não usar exportação estática para uma aplicação dependente de sessão no servidor. Não assumir funções, cron, storage ou serviços exclusivos da Vercel. O serviço Supabase continua externo à hospedagem da aplicação.

## 3. Estrutura atual

Next.js usa ESLint CLI separado, Tailwind via CSS/PostCSS e geração de tipos de rotas antes do TypeScript. `next.config.ts` preserva AGENTS.md com agentRules: false. Tipos gerados, `.next` e `.env.local` são ignorados; `.env.example` contém apenas nomes e valores vazios.

```text
src/
  app/
    page.tsx                           # página inicial
    (auth)/login/                      # login e action
    (cliente)/app/                     # shell, actions e Visão geral
      presenca/ avaliacoes/ nfc/       # placeholders
      relatorios/ configuracoes/      # placeholders
    (admin)/admin/                     # layout, visão geral e actions
      empresas/page.tsx                # lista e cadastro
      empresas/[id]/page.tsx           # detalhe e vínculos
    layout.tsx
    globals.css
  lib/
    auth/                             # validação de credenciais
    admin/                            # autorização e validação de entradas
    organizations/                    # contexto e seleção
    supabase/                         # configuração e clientes SSR
  proxy.ts                            # sessão em /login, /app e /admin
supabase/migrations/                   # migration única da fundação
supabase/tests/database/              # pgTAP
scripts/                              # HTTP/RLS, dashboard e administração
tests/                               # testes unitários Node
docs/                                # documentação
```

Não existem rotas de callback, redirecionamento NFC ou módulos de negócio implementados. O cliente de navegador Supabase está preparado, mas a aplicação atual usa operações no servidor.

Grupos entre parênteses organizam layouts sem alterar URLs. `/app` atende clientes e `/admin` atende ADSCOM. Layouts distintos melhoram a navegação, mas não garantem segurança: cada leitura e mutação precisa de autorização própria.

## 4. Modelo mínimo definido na migration (aplicado e validado localmente)

Banco compartilhado com linhas identificadas por empresa. É uma opção simples para o MVP; evita manter um banco ou schema por cliente. A responsabilidade de isolamento fica explícita em RLS, constraints e testes.

| Entidade | Campos e restrições implementados | Objetivo |
| --- | --- | --- |
| `auth.users` | ID e credenciais geridos pelo Supabase Auth | Fonte única de identidade; sem tabela pública de senhas |
| `organizations` | `id uuid PK`, `name text NOT NULL` não vazio, `created_at timestamptz NOT NULL` | Empresa cliente |
| `organization_members` | `organization_id uuid FK`, `user_id uuid FK auth.users(id)`, `role text NOT NULL DEFAULT 'CLIENTE'`, `created_at`; PK composta `(organization_id, user_id)` | Vínculo muitos-para-muitos entre usuário e empresa |
| `user_global_roles` | `user_id uuid FK auth.users(id)`, `role text NOT NULL`, `created_at`; PK `(user_id, role)` | Concessão explícita do papel global ADMIN_ADSCOM |

A migration ativa RLS nas três tabelas próprias. O índice de membros começa por `user_id` para consultas de acesso; a PK já atende buscas começando por empresa. Datas usam timezone e valores padrão no banco.

Papéis são textos com CHECK restritivo: inicialmente somente CLIENTE nos vínculos e ADMIN_ADSCOM nos papéis globais. Novos papéis exigem migração, políticas e testes explícitos, sem reestruturar vínculos. Não criar um motor genérico de permissões agora. ADMIN_ADSCOM não deve ser um papel de uma empresa comum.

Excluir usuário pode remover seus vínculos e concessões por cascata. Exclusão de empresa deve ser RESTRICT inicialmente; não oferecer exclusão definitiva de clientes até definir retenção e dependências. Não guardar o estágio de evolução ainda: acrescentar campo com valores ENTRAR/ESTRUTURAR/CRESCER quando seu fluxo de edição existir.

### Implementação das policies na Etapa 03

A migration 20260926000100_multi_tenant_foundation.sql implementa a matriz abaixo com oito policies. Não foi necessário criar funções privilegiadas: papéis consultam somente auth.uid(), membros consultam papéis, organizações consultam membros/papéis. Não há ciclos. As consultas de administrador enxergam apenas os próprios papéis por RLS. authenticated recebe grants mínimos, inclusive por coluna; anon e PUBLIC não recebem acesso às tabelas. IDs de empresas e timestamps não são editáveis pela API comum. Veja docs/supabase.md para o inventário completo e resultados dos testes locais.

### Entidades que podem esperar

| Entidade sugerida | Decisão |
| --- | --- |
| `users` / `profiles` | Usar auth.users agora. Criar profiles apenas se houver dados de perfil além da identidade, com políticas próprias; não expor auth.users à API pública |
| `locations` | Criar quando houver unidades/endereços ou associação real com presença local |
| `reviews` | Criar com a funcionalidade de avaliações e uma origem de dados definida |
| `nfc_devices`, `nfc_events` | Criar no incremento NFC; desenho antecipado abaixo |
| `recommendations` | Criar quando houver recomendações manuais e regras de visibilidade |
| `subscriptions` | Fora do primeiro MVP técnico; depende de modelo comercial e pagamentos |

## 5. Autenticação

Implementação atual: e-mail/senha em Server Action; getClaims no proxy para renovar/validar sessão; getUser no contexto servidor usado por layout, páginas, seleção de empresa e administração; signOut local para logout. Não há cadastro Auth, recuperação ou callback. Server Components não gravam cookies; o proxy os atualiza antes da renderização. Server Actions usam escrita explícita, sem ocultar falhas. Rotas dinâmicas e headers privados impedem cache compartilhado em produção. Consulte [autenticação](autenticacao.md), [dashboard](dashboard.md) e [administração](administracao.md).

Supabase Auth gerencia credenciais, login, recuperação e sessões. O login atual usa e-mail/senha de contas existentes. Convites pela ADSCOM são uma proposta futura que precisa de escopo próprio. A fundação não depende dessa escolha: um usuário autenticado sem vínculo e sem papel global terá zero acesso a empresas.

Na implementação SSR, usar os clientes de navegador e servidor de `@supabase/ssr`, seguindo a documentação da versão instalada. Cookies transportam a sessão; a atualização de tokens deve seguir o fluxo SSR suportado. Validar identidade no servidor com a API adequada (atualmente getClaims para validação de JWT; getUser quando precisar confirmar estado junto ao Auth). Não confiar apenas em getSession ou na existência de um cookie. Para ações sensíveis, considerar também sessão revogada/usuário desativado.

Se implementados futuramente, callbacks devem aceitar somente destinos internos permitidos para impedir redirecionamento aberto. Não armazenar tokens em logs. Cada cliente de servidor deve ser criado no contexto da requisição, sem sessão global compartilhada.

## 6. Autorização e RLS

Regra conceitual de leitura de empresa: usuário autenticado E (possui ADMIN_ADSCOM no banco OU possui vínculo com aquela empresa). O contexto da empresa selecionada é apenas uma preferência de navegação.

| Recurso/operação inicial | Cliente | ADMIN_ADSCOM |
| --- | --- | --- |
| Ler empresas | Somente empresas com vínculo próprio | Todas |
| Criar/editar empresa | Negado | Permitido |
| Ler vínculos | Somente seus próprios vínculos | Todos |
| Criar/editar/remover vínculos | Negado | Permitido |
| Ler papéis globais | Somente concessões próprias | Somente concessões próprias inicialmente |
| Conceder/remover papel global via aplicação | Negado | Negado inicialmente |
| Excluir empresa | Negado | Fora do fluxo inicial |
| Usuário anônimo | Nenhum acesso aos recursos acima | Não aplicável |

O primeiro administrador será concedido por operação privilegiada controlada no banco. Administrar clientes não implica poder promover novos administradores. Concessões globais futuras precisarão de fluxo específico, com rastreabilidade.

As migrações devem combinar RLS e grants mínimos para anon/authenticated. Policies de escrita validam estado anterior com USING e estado resultante com WITH CHECK, quando aplicável. Nenhuma escrita de cliente será liberada por antecipação.

As consultas de papéis e membros usadas em RLS não podem formar ciclos: por exemplo, uma policy de membros não deve chamar uma função que volta à mesma policy. Se necessário, usar funções pequenas SECURITY DEFINER em schema privado não exposto, com search_path fixo e grants estritos. Elas devem derivar o usuário de auth.uid(), retornar apenas booleanos e não aceitar identidade arbitrária. Esse desenho exige testes reais, não apenas inspeção do SQL.

Consultar vínculos/papéis no banco em cada autorização permite que revogações tenham efeito nas próximas consultas. Não usar user_metadata editável nem um papel fornecido pelo navegador. Um administrador usa sua sessão normal e políticas explícitas; a chave service_role não é a implementação da área administrativa.

Criação de convites via Auth Admin é uma exceção futura que pode exigir credencial privilegiada no servidor: primeiro validar o administrador, depois limitar a operação. Auth e inserção de vínculo não devem ser tratados como uma transação atômica única; prever repetição segura e recuperação se uma etapa falhar, sem conceder acesso parcial indevido.

Para futuras tabelas de negócio, exigir organization_id NOT NULL com FK e índice. Relações como evento → dispositivo devem garantir a mesma empresa via FK composta `(organization_id, device_id)` referenciando par único no dispositivo. Filtrar no frontend ou conferir somente a existência do dispositivo não basta.

Começar sem cache compartilhado para dados privados; qualquer cache posterior precisa considerar identidade, empresa e revogação. Responder a IDs inacessíveis sem revelar a existência de dados de outra empresa. Totais, exportações e buscas seguem as mesmas regras das telas.

## 7. Futuro NFC e QR Code

NFC e QR podem conter o mesmo endereço estável. O código público identifica um dispositivo, não autoriza acesso a dados da empresa. Uma interação com o link, por si só, não distingue leitura NFC, leitura QR, bot ou recarregamento e não equivale a uma pessoa única.

Fluxo proposto: `go.adscom.com.br/ABC123` → endpoint público → resolver dispositivo ativo → tentar registrar evento mínimo → redirecionar ao destino atual com HTTP 302 e `Cache-Control: no-store`. Evitar 301 porque o destino deve poder mudar sem trocar o dispositivo. No início, o mesmo serviço Next.js pode atender esse fluxo em `/r/[code]`; um mapeamento do domínio go para esse caminho dependerá da hospedagem. Não criar outro microsserviço agora.

Modelo futuro: nfc_devices com id, organization_id, code único/aleatório não sequencial, destination_url, active e timestamps; nfc_events com id, organization_id, device_id e occurred_at. Não criar essas tabelas nesta etapa. O servidor deriva empresa/dispositivo após resolver o código, nunca aceita esses IDs como prova de origem no endpoint público.

Não conceder SELECT anônimo em dispositivos nem INSERT anônimo irrestrito em eventos. O endpoint precisará de operação restrita (por exemplo RPC estreita ou credencial isolada no servidor), sem aceitar consultas arbitrárias. Código inexistente ou dispositivo inativo deve apresentar resposta neutra. Falhas de registro não devem impedir o redirecionamento se o destino já foi resolvido; falhas de resolução não devem inventar um destino.

Na etapa NFC, definir validação de destino HTTPS e política de domínios permitidos para impedir abuso. Não aceitar `javascript:`, `data:` ou destino vindo da query string. Não buscar a URL de destino no servidor sem controles específicos. Incluir limites de requisições e considerar bots antes de tratar eventos como métricas. Definir retenção e minimização antes de coletar IP, user-agent ou outros dados pessoais; esses campos não são necessários ao modelo inicial.

## 8. Referências oficiais

- [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security): policies e comportamento de chaves privilegiadas.
- [Auth SSR](https://supabase.com/docs/guides/auth/server-side) e [clientes SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client): sessão e validação no servidor.
- [Dados de usuários](https://supabase.com/docs/guides/auth/managing-user-data): relação com auth.users.
- [Instalação Next.js](https://nextjs.org/docs/app/getting-started/installation): scripts e pré-requisitos a verificar no bootstrap.
- [Deploy Next.js](https://nextjs.org/docs/app/getting-started/deploying): execução portátil em Node.js.

As referências sustentam os mecanismos técnicos; o modelo de papéis e as decisões de produto acima são propostas para ADSCOM, não prescrições dos fornecedores.
