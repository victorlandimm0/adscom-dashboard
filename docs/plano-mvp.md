# Plano do MVP — incrementos verificáveis

## Fundação concluída até a Etapa 08

| Etapa | Entrega implementada | Evidência e limites |
| --- | --- | --- |
| 01 — arquitetura | Uma aplicação/banco, papéis, isolamento e roteiro | [Arquitetura](arquitetura.md) distingue implementação e futuro |
| 02 — bootstrap | Next.js, TypeScript estrito, Tailwind, versões fixas e lockfile | Instalação e execução validadas no [histórico](historico-validacoes.md) |
| 03 — banco/RLS | organizations, organization_members, user_global_roles; oito policies e grants mínimos | Migration aplicada localmente; 48 asserções originais, ampliadas para 52 na Etapa 05; SQL e API com usuários comuns |
| 04 — autenticação | E-mail/senha, sessão SSR, proteção no servidor, login/logout | Testes locais de navegador na entrega e regressão HTTP posterior; [autenticação](autenticacao.md) |
| 05 — multiempresa | Empresas autorizadas por sessão, vínculo/papel e RLS | 52 asserções e HTTP; usuário informou revisão manual remota de admin/clientes A/B |
| 06 — dashboard | Shell, seis placeholders, seleção e contexto de empresa | Cookie de sessão revalidado; empresa única automática; [dashboard](dashboard.md) |
| 07 — administração | Criar/listar empresas, vincular Auth existente por UUID, remover vínculo confirmado, abrir Dashboard | Testes HTTP administrativos e revisão manual confirmada pelo usuário; [administração](administracao.md) |
| 08 — consolidação | Auditoria do código/Git, documentação atualizada e repetição da suíte disponível | Resultados desta execução e prontidão no [relatório](consolidacao.md); sem commit/push |

A revisão manual informada pelo usuário cobre acesso administrativo, cadastro, abertura no Dashboard, vínculo, visibilidade para cliente, seleção múltipla e refresh, remoção preservando Auth/outros vínculos, revogação com cookie antigo e seleção automática para empresa única. O ambiente dessa revisão da Etapa 07 não foi especificado. Não confundir com testes remotos do agente: suas execuções foram exclusivamente locais.

Isolamento validado para as tabelas atuais não autoriza futuras tabelas sem RLS/testes próprios. Os critérios permanecem: A não vê B mesmo por UUID/API, anônimo sem acesso, cliente não escreve vínculos/papéis, admin usa sessão normal e revogações valem na próxima consulta. A preferência de empresa não prova autorização.

## Próximos incrementos — não iniciados

A Etapa 09 exige definição e autorização próprias. Escolher o primeiro módulo de valor com o responsável pelo produto (por exemplo recomendações manuais ou piloto NFC); não implementar ambos automaticamente. Presença, Avaliações, NFC, Relatórios e Configurações continuam apenas páginas placeholder. Google, Meta, pagamentos, IA, CRM e demais integrações permanecem futuros.

Cadastro de usuários Auth, convites, recuperação de senha, perfis, edição/exclusão de empresas e concessão de papel global pela aplicação também não estão implementados. Devem receber escopo e testes próprios quando necessários.

## Preparação de produção — futura

Validar plano Hostinger, Node 24, instalação/build/start, processo persistente, porta, HTTPS, domínio e variáveis. Separar ambientes, confirmar histórico/schema remoto antes de migrations e definir backups/restauração e recuperação de falhas. O agente não realizou deploy, provisionamento ou alteração remota.

Aceite futuro: smoke test de login e isolamento em homologação, ausência de segredos no bundle, deploy reproduzível e recuperação verificada antes de dados reais. Não presumir suporte ou backups do plano contratado.

## Decisões pendentes

| Momento | Decisão necessária |
| --- | --- |
| Próxima etapa | Prioridade e critérios de aceite do primeiro módulo |
| Gestão de identidades ampliada | Convites, recuperação e responsabilidade operacional; hoje as contas Auth já devem existir |
| NFC público | Domínio, destinos permitidos, significado dos eventos e retenção |
| Produção | Hostinger, domínio, ambientes, e-mail, backups e responsáveis |
| Checkpoint Git | Revisão humana do diff acumulado antes de autorizar commit/push |

Não há bloqueio documental para planejar a próxima etapa; executar somente o escopo posteriormente aprovado.
