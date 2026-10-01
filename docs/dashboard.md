# Shell do dashboard — Etapa 06

Evolução da Etapa 07: administradores recebem o link Administração e podem abrir uma empresa no Dashboard pela mesma action de seleção. O contexto e o cookie não foram substituídos. `npm run test:dashboard` agora inclui também o fluxo administrativo; consulte [administração](administracao.md). Os limites e resultados da Etapa 06 abaixo são históricos.

Implementado em 30/09/2026. O usuário confirmou na revisão da Etapa 07 seleção, persistência após refresh e revogação de acesso; veja [administração](administracao.md). A interface possui sidebar, cabeçalho com usuário e empresa atual, seleção simples, logout e conteúdo placeholder. Tailwind existente; nenhuma dependência, migration, policy ou funcionalidade de negócio adicionada.

## Rotas

| Rota | Título |
| --- | --- |
| `/app` | Visão geral |
| `/app/presenca` | Presença |
| `/app/avaliacoes` | Avaliações |
| `/app/nfc` | NFC |
| `/app/relatorios` | Relatórios |
| `/app/configuracoes` | Configurações |

Todas mostram somente título e mensagem de implementação futura. Não há métricas, integrações ou dados fictícios. No desktop, navegação lateral; em telas menores, navegação acima do conteúdo, sem menu complexo. Há indicação da página ativa, rótulos nos campos, foco visível e atalho para o conteúdo.

## Empresa atual e autorização

`src/lib/organizations/context.ts` concentra as leituras que antes estavam em `/app`: `getUser()` confirma a identidade, `user_global_roles` consulta a concessão própria, `organization_members` lê vínculos próprios e `organizations` retorna somente empresas acessíveis pela sessão/RLS. Não usa service_role, metadata ou papel enviado pelo cliente.

A preferência é um cookie de sessão `adscom_organization`, no formato `userId:organizationId`. É HTTP-only, SameSite=Lax, Path=/app e Secure em produção. O UUID do usuário no cookie apenas impede reutilização acidental entre contas; não prova identidade. Cookie adulterado é tratado como qualquer entrada não confiável. Não contém credenciais nem substitui a sessão Auth.

- CLIENTE com uma empresa: resolução automática, sem seletor.
- CLIENTE com múltiplos vínculos: seletor somente com suas empresas; nenhuma escolha arbitrária.
- ADMIN_ADSCOM: mesmas regras de quantidade, com empresas acessíveis globalmente, sem membership artificial.
- Sem acesso: empresa atual nula e mensagem de ausência de empresa; não cria registros.
- Cookie inválido, de outra conta, inacessível ou revogado: aviso genérico; usa a única empresa permitida, se houver, ou exige nova seleção. Nunca exibe nome/UUID da empresa inacessível.
- Falha nas consultas: não resolve empresa nem mostra lista parcial; apresenta erro e mantém Sair disponível.

`selectOrganization` valida sessão, formato do UUID e presença na lista autorizada antes de gravar o cookie. Rejeição preserva a preferência anterior e volta para `/app?selection=failed`. Sucesso volta para `/app` e a renderização consulta novamente o banco. A seleção não modifica tabelas. Logout bem-sucedido apaga também esse cookie. Navegação e refresh mantêm a preferência enquanto ela continuar autorizada; reiniciar o navegador pode encerrar o cookie de sessão.

## Organização do código

O layout autenticado protege a área. O shell fica em `template.tsx`, para atualizar cabeçalho/contexto também nas navegações entre páginas. Cada página chama a verificação pelo componente servidor `ModulePlaceholder`; a action também verifica por conta própria. Portanto, o layout não é a única barreira. Apenas a navegação usa Client Component, para indicar o caminho ativo.

`React.cache` deduplica consultas dentro da renderização de uma requisição; não existe cache compartilhado entre usuários ou empresas. O proxy existente preserva headers privados/no-store. Links não fazem prefetch. Futuros módulos devem consultar dados no servidor usando o contexto verificado e RLS própria; não podem confiar em nomes ou IDs do cabeçalho.

## Testes e execução

Histórico da entrega da Etapa 06 (30/09/2026); a suíte atual tem 13 testes unitários e inclui administração. Reexecução da Etapa 08 em [consolidação](consolidacao.md):

- `npm run lint`, `npm run typecheck`, `npm test` (11 testes) e `npm run build`.
- `npm run test:db`: 52 asserções pgTAP, com rollback.
- `npm run test:dashboard`: build/servidor de produção locais, teste HTTP do shell e todos os cenários da suíte `test:rls:api`. Fixtures temporárias removidas e servidor de teste encerrado.
- `git diff --check`.

`test:dashboard` reutiliza usuários/empresas e limpeza de `scripts/test-rls-api.mjs`. Só aceita Supabase em 127.0.0.1:54321 e Docker local. Cria um build com ambiente local injetado no processo e inicia a aplicação em 127.0.0.1:3106, sem alterar `.env.local`. Requer essa porta livre e nenhuma execução de dev/build concorrente. Como gera `.next` para Supabase local, execute `npm run build` novamente antes de `npm start` com outro ambiente.

O teste usa fetch nativo, cookies em memória e formulários reais das Server Actions. Verifica anônimo nas seis rotas, login, clientes A/B automáticos, adulteração de cookie e POST de seleção cruzada, seleção A/B pelo admin, refresh e navegação HTTP em todas as páginas, seleção inválida, ausência/múltiplos vínculos, revogação e logout. Confere os atributos do cookie e respostas privadas/no-store. Não substitui teste de JavaScript/hidratação ou comportamento visual de navegador.

O Docker Desktop estava inicialmente desligado; foi iniciado usando a instalação existente, sem executar migrations. A primeira tentativa de banco falhou por conexão recusada. A revisão automática inicialmente bloqueou a suíte HTTP por dúvida sobre o destino; após conferir suas travas locais, a execução foi permitida e passou. Nenhuma operação remota ocorreu nesta etapa. A validação manual remota da Etapa 05 foi informada pelo desenvolvedor e não foi repetida pelo agente.

## Conferência visual manual e limites

1. Com contas de desenvolvimento já configuradas, entrar como cliente de empresa única: conferir nome, ausência de seletor e Sair.
2. Entrar como admin/múltiplos vínculos: selecionar A, clicar Aplicar, navegar pelos links, recarregar e repetir com B. Confirmar cabeçalho atualizado e item ativo, inclusive ao voltar/avançar no navegador.
3. Conferir telas de ausência de empresa, seleção inválida e falha de carregamento; o roteiro de fixtures locais está em autenticacao.md.
4. Conferir larguras de aproximadamente 1440 e 390 px, nomes/e-mails longos, zoom e navegação por teclado; verificar ausência de rolagem horizontal e foco visível.
5. Conferir logout pelo navegador e novo login com outra conta. Em produção, usar HTTPS para os cookies Secure.

O agente não repetiu inspeção visual/hidratação nesta consolidação. A revisão funcional de navegador foi informada pelo usuário; dimensões de tela, zoom e acessibilidade acima continuam como roteiro de regressão, sem confirmação específica. A lista mantém o limite de resposta do Supabase, como na Etapa 05; paginação não foi implementada. Trocar de empresa retorna à Visão geral. A Etapa 07 adicionou painel administrativo e cadastro de empresas. Cadastro Auth, convites e módulos de negócio continuam futuros.
