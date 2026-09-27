# ADSCOM Dashboard — instruções para agentes

## Contexto e estado

SaaS B2B multiempresa da ADSCOM para acompanhar a evolução da presença digital dos clientes. ENTRAR, ESTRUTURAR e CRESCER são estágios; SOLUTIONS é uma vertical de tecnologia, não uma etapa obrigatória.

O projeto está na Etapa 03: clientes Supabase, migration multi-tenant e testes preparados. A migration foi aplicada somente no Supabase local. As 48 asserções pgTAP e a suíte HTTP (cenários A–I) passaram em 27/09/2026; fixtures removidas. Nenhuma migration foi aplicada ao remoto. Há um projeto remoto informado pelo desenvolvedor, ainda não vinculado à CLI. Não há login, dashboard de negócio ou integrações implementadas. Leia README.md, docs/arquitetura.md, docs/plano-mvp.md e docs/supabase.md antes de alterar o projeto.

## Stack definida

Next.js com App Router, TypeScript em modo estrito e Tailwind CSS; PostgreSQL, Supabase e Supabase Auth; GitHub; produção planejada em Hostinger com suporte Node.js/Next.js. Não depender de recursos exclusivos da Vercel. Versões diretas estão fixadas em package.json, com package-lock.json. Node 24.14.1 é a versão de referência, registrada em .nvmrc; consulte README.md para comandos e validação.

## Princípios e convenções

- Manter uma aplicação e um banco: sem microsserviços, ORM, framework de permissões ou camadas genéricas sem necessidade demonstrada.
- Usar npm inicialmente; adicionar dependências apenas com propósito claro.
- Código e nomes SQL em inglês; documentação e interface em português. Tabelas/colunas em snake_case; TypeScript em camelCase e componentes em PascalCase.
- Preferir Server Components; usar componentes de cliente apenas para interação que exija navegador.
- Validar entradas no servidor. Agrupar código por responsabilidade concreta; extrair abstrações somente quando houver repetição real.
- Registrar evolução do banco em migrações SQL versionadas; não alterar produção manualmente como fluxo normal.
- Não apresentar dados fictícios como integrações reais. Estados vazios devem explicar a ausência de dados.

## Segurança e multi-tenancy

- Supabase Auth é a fonte de identidade. Nunca armazenar senhas em tabelas próprias.
- ADMIN_ADSCOM é um papel global confiável; CLIENTE é um papel de vínculo com empresa. Nunca conceder papel global a partir de formulário, user_metadata ou parâmetro do cliente.
- Toda tabela de negócio pertencente a uma empresa deve ter organization_id obrigatório, FK e índice apropriado. Exceções globais devem ser explícitas e justificadas.
- Ativar RLS e definir grants mínimos na mesma migração que cria qualquer tabela acessível pela API. Sem política aplicável, negar acesso.
- Verificar sessão e autorização em cada operação de servidor; RLS é uma segunda barreira obrigatória, inclusive para acesso direto à API Supabase.
- IDs da URL, cookies de empresa selecionada e filtros do frontend não provam autorização.
- Aplicar USING e WITH CHECK conforme a operação, impedindo mover registros para outra empresa. FKs compostas devem impedir referências entre empresas em relações futuras.
- Usuários clientes não podem criar vínculos, conceder papéis nem se promover. Revogações devem ser consultadas no banco, sem depender de papéis desatualizados em JWT.
- Não usar chave privilegiada em consultas comuns. service_role/secret contorna RLS: restringir a módulos exclusivos do servidor e operações explicitamente autorizadas.
- Nunca colocar segredos em NEXT_PUBLIC_*, repositório, logs ou exemplos. A chave publicável não substitui RLS.
- Não compartilhar cache de dados privados entre usuários/empresas. Começar sem cache compartilhado para consultas autenticadas.
- Testar isolamento com JWTs de usuários comuns e acesso direto à API, não somente com proprietário do banco ou service_role.
- Funções SECURITY DEFINER, se necessárias para RLS, exigem revisão: schema privado não exposto, search_path fixo, nomes qualificados, grants mínimos e identidade obtida de auth.uid(). Evitar recursão nas políticas de membros/papéis.

## Forma de trabalho

Inspecionar arquivos, git status, histórico e instruções existentes antes de modificar. Explicar achados, plano e riscos antes de alterações grandes. Perguntar quando faltar uma decisão de negócio indispensável; não inventar funcionalidades.

Implementar uma etapa pequena por vez. Relatar arquivos alterados, comandos realmente disponíveis, configurações externas, testes executados e limitações. Não declarar segurança validada sem testes reais. Não criar commits, publicar, provisionar serviços ou alterar produção sem escopo autorizado.

Não implementar por antecipação Google Business Profile, avaliações completas, pagamentos/assinaturas, Meta, tráfego pago, analytics avançado, IA, CRM, automações complexas, mobile ou sistema NFC completo.

## Regras específicas da Etapa 03

- Não declarar a etapa validada antes de executar pgTAP e a suíte HTTP local com sucesso. A validação local passou em 27/09/2026; alterações posteriores em policies exigem nova validação.
- npm run test:db e npm run test:rls:api são exclusivos de ambiente local descartável. Não usar --linked nem adaptar fixtures para produção.
- O grafo RLS depende de user_global_roles retornar apenas concessões próprias; ampliar essa policy exige revisar todas as policies dependentes. Não há funções SECURITY DEFINER nesta migration.
- Clientes Supabase usam somente URL e Publishable Key de .env.local. O cliente servidor exige contexto que grave cookies; não há renovação de sessão em Server Components ainda.
- Antes de aplicar migrations remotamente, explicar o destino e as mudanças; revisar histórico e dry-run. Nunca resetar o remoto.
- A Etapa 04 depende de revisão humana; não implementar login, callbacks ou proxy de autenticação por antecipação.
