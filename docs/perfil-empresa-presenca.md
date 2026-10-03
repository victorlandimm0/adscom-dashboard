# Perfil da empresa, perfil da unidade e presença digital — Etapas 11A e 11A.1

Data: 03/10/2026. Direção arquitetural aprovada e decisões humanas incorporadas na 11A.1; documento pronto para revisão final, sem implementação. Base conferida: branch `main`, HEAD `adf27da` (`feat: add admin location management`). Na 11A o working tree estava limpo; no início da 11A.1 continha somente este documento não rastreado. Somente ele é atualizado.

## 1. Objetivo e limites

Separar identidade institucional, operação local e canais digitais para iniciar Presença sem transformar as tabelas centrais em cadastros de plataformas. Organization continua sendo o tenant; uma empresa pode ter zero, uma ou várias locations. Negócio digital não precisa de unidade artificial.

Todos os nomes de novas entidades e campos abaixo são propostas, não schema existente nem autorização para implementá-los. Nenhuma migration, tabela, policy, grant, página, componente, integração ou fixture foi criada. Não houve consulta ou operação no Supabase local/remoto. O estado observado é o código e SQL versionados; não uma nova auditoria do banco em execução.

## 2. Estado atual relevante

Foram consultados AGENTS.md, README, arquitetura, plano do MVP, modelo empresa/unidades, Supabase, autenticação, dashboard e administração, além das migrations e do código de contexto/administração. Referências principais:

- [Modelo empresa/unidades](modelo-empresa-unidades.md): tenant, cardinalidade 0..N, recursos locais, NFC e histórico.
- [Administração](administracao.md): fluxo da Etapa 10A e validações automatizadas.
- [Contexto](../src/lib/organizations/context.ts), [seleção](../src/lib/organizations/selection.ts) e [autorização administrativa](../src/lib/admin/access.ts).
- Migrations [20260926000100](../supabase/migrations/20260926000100_multi_tenant_foundation.sql) e [20261001000100](../supabase/migrations/20261001000100_locations_foundation.sql), lidas integralmente.

Alguns documentos preservam o estado de etapas antigas: ausência de locations, migration única e revisão manual pendente não descrevem o checkpoint atual. O usuário aprovou a Etapa 10A após testes automatizados e manuais, incluindo persistência e isolamento A/B. Nenhum desses documentos é reescrito aqui. As contagens aprovadas de 90 pgTAP e 13 unitários são históricas desta fundação, não testes reexecutados na 11A.

| Tabela existente | Responsabilidade e restrições relevantes |
| --- | --- |
| `organizations` | `id`, `name`, `created_at`; nome não vazio. Identidade do tenant. O limite 160 é aplicado pela aplicação, não pelo CHECK desta tabela |
| `locations` | `id`, `organization_id`, `name`, `created_at`; nome não vazio e até 160 no banco; FK para organization com ON DELETE RESTRICT; UNIQUE `(organization_id, id)` |
| `organization_members` | PK `(organization_id, user_id)`; papel CLIENTE; FK para organization RESTRICT e para Auth CASCADE; índice começando por user_id |
| `user_global_roles` | PK `(user_id, role)`; somente ADMIN_ADSCOM; FK para Auth CASCADE; SELECT apenas das concessões próprias |

RLS está habilitada nas quatro tabelas. São oito policies da fundação e três de locations. Authenticated recebe grants limitados, sujeitos às policies; anon/PUBLIC não recebem acesso. Cliente lê empresas/unidades vinculadas e seus vínculos; admin opera globalmente com sessão normal. Locations admite INSERT de organization_id/name e UPDATE somente de name para admin, sem DELETE ou transferência. Não existem helpers SECURITY DEFINER.

`/app` resolve identidade com getUser, papel global e memberships no banco, então consulta empresas sob RLS. O cookie HTTP-only `adscom_organization` guarda preferência `userId:organizationId`, revalidada no servidor: uma empresa acessível é automática; várias exigem escolha. Cache apenas por requisição. O layout não substitui a verificação de cada página/action.

`/admin` exige `requireAdmin` em páginas/actions. O detalhe `/admin/empresas/[id]` lista, cria e renomeia unidades; a edição filtra id e organization_id. O cookie do Dashboard não autoriza ações administrativas. CLIENTE não possui interface administrativa. `/app/presenca` permanece placeholder; não há contexto de unidade, perfis complementares, canais, credenciais externas ou dados de maturidade implementados.

## 3. Conceitos e responsabilidades

**Organization:** empresa cliente da ADSCOM, proprietária dos dados e fronteira de acesso. Não equivale obrigatoriamente a uma única pessoa jurídica, filial ou perfil Google. `organizations.name` continua sendo o nome comercial exibido, sem segundo campo concorrente.

**Location:** operação identificável da empresa. Pode representar uma loja ou base de atendimento sem exigir endereço publicável. Pertence a exatamente uma organization. `locations.name` identifica a unidade; não é uma duplicação do nome institucional.

**Perfil:** conjunto de informações descritivas e de contato do seu titular. Perfil institucional descreve a organização; perfil local descreve uma unidade. Não é conta Auth e não contém credenciais. É um conceito de domínio antes de ser uma tabela.

**Presença digital:** visão dos canais e evidências de uma empresa/unidade, considerando escopo, origem e atualidade. Um link cadastrado é uma declaração, não prova de funcionamento, titularidade, integração ou maturidade. Avaliações e NFC podem contribuir para essa visão no futuro, mas não são apenas campos do perfil.

```text
Organization (tenant, existente)
  +-- 0..N Locations (existentes)
  |     +-- 0..1 perfil local complementar (futuro, sob demanda)
  |     +-- 0..N canais locais (proposta)
  +-- 0..1 perfil institucional complementar (futuro, sob demanda)
  +-- 0..N canais institucionais (proposta)

Visão Presença (futura leitura)
  +-- declarações manuais de canais
  +-- evidências de integrações (futuro)
  +-- diagnósticos derivados e datados (futuro)
```

O desenho não exige relação sequencial Empresa → Unidade → Presença para todos os casos: presença institucional existe diretamente na empresa, inclusive com zero unidades.

## 4. Matriz Empresa × Unidade × Presença e campos candidatos

“Perfil” na matriz indica responsabilidade lógica; a criação física de extensões é adiada até um fluxo precisar dos campos. Nenhum dado é copiado automaticamente entre empresa e unidade.

| Informação | Onde deve morar e escopo | Motivo e risco de simplificação | Momento recomendado |
| --- | --- | --- | --- |
| Nome jurídico/razão social | Cadastro jurídico/fiscal próprio quando necessário; associação à empresa ou operação jurídica correspondente | Tenant não prova pessoa jurídica única; uma coluna obrigatória poderia impor estrutura fiscal indevida | Fora do MVP de Presença |
| Nome comercial | `organizations.name`; nome operacional em `locations.name` | Fonte única de exibição por entidade; evitar trade_name concorrente ou renomear ambas automaticamente | Reutilizar existente |
| CNPJ | Estrutura jurídica/fiscal futura, sem transformar CNPJ em PK ou tenant | Pode haver mais de um documento associado à organização; não exigir para negócio digital nem presumir documento diferente por unidade | Fora do MVP |
| Segmento/categoria | Perfil institucional; categoria local somente se houver diferença real | Segmento de negócio ADSCOM não é código de categoria de plataforma. Evitar enum extenso e mapeamento Google implícito | Futuro próximo, após definir uso |
| Descrição | Perfil institucional ou local, textos independentes e opcionais | Descrição da marca difere da operação; texto manual não substitui descrição importada | Futuro próximo |
| E-mail | Perfil institucional para contato corporativo; perfil local para atendimento específico | Não usar e-mail Auth nem replicar contatos sem finalidade; não incluir contato privado em futura publicação automaticamente | Futuro próximo |
| Telefone | Perfil do titular do contato, institucional ou local | Atendimento local não vira institucional só por existir uma unidade; armazenar como texto normalizado, nunca número matemático | Futuro próximo |
| WhatsApp | Canal próprio com escopo institucional ou local; inicialmente URL de contato | Número telefônico não comprova WhatsApp. Evitar número no perfil e link editável divergente no canal; futura edição por número deve gerar uma única representação canônica | MVP como link declarado |
| Site | Canal institucional ou local | Uma marca pode ter site central e páginas locais; não copiar o site da marca para todas as unidades | MVP |
| Endereço/logradouro/número/complemento/bairro | Perfil local opcional, campos explícitos; endereço jurídico separado se necessário | Uma empresa com duas unidades não cabe em endereço único. Não divulgar residência/base privada por inferência; número pode ser textual | Futuro próximo |
| CEP | Parte do endereço local, texto opcional; país explícito quando o endereço entrar | Preservar zeros; não assumir formato brasileiro universal nem preencher dado ausente | Futuro próximo |
| Cidade | Parte do endereço local, sem duplicação institucional | Sede não descreve todas as operações; cidade não é necessariamente toda a área atendida | Futuro próximo |
| Estado/UF | Parte do endereço local com país | UF brasileira não é formato universal; não deduzir por configuração do servidor | Futuro próximo |
| Instagram | Canal institucional ou local, declarado manualmente | Pode ser compartilhado pela marca ou específico por unidade; URL não comprova acesso à conta | Adiado; fora do MVP inicial |
| Facebook | Canal institucional ou local | Mesma separação de escopos; não misturar página pública e conexão autenticada | Adiado; fora do MVP inicial |
| GOOGLE_BUSINESS_PROFILE | Canal Perfil da Empresa no Google, pertencente à organization e associado a location quando local; URL é atributo inicial | Canal, URL pública, identificador externo e conexão OAuth são conceitos diferentes. Preservar identidade do canal ao evoluir para integração | MVP como canal manual, sem verificação externa |
| Horário de funcionamento | Estrutura local própria quando houver fluxo; atendimento institucional distinto só se requerido | Texto único perde turnos, feriados, exceções e timezone; horário físico não é disponibilidade de todos os canais | Futuro próximo, fora do primeiro corte |

Não introduzir campos porque aparecem em cadastros genéricos. Telefone e WhatsApp podem usar o mesmo número, mas representam finalidades distintas; não converter um no outro sem declaração explícita. Dados corporativos e locais podem coexistir sem “herança” implícita.

## 5. Alternativas de modelagem

| Alternativa | Vantagens | Limites e decisão |
| --- | --- | --- |
| A. URLs e dados diretamente em organizations/locations | Leitura simples; poucas relações | Cada plataforma gera colunas, nulos e duplicações; difícil admitir múltiplos canais, origem e histórico. Não recomendada para presença |
| B. Uma entidade universal de atributos/presença | Muito flexível para qualquer campo | EAV, owner_type/owner_id e JSON livre enfraquecem FKs, validação e compreensão; exige motor genérico. Rejeitada |
| C. Núcleo estável + perfis tipados sob demanda + canais concretos | Mantém identidade enxuta; canal tem escopo explícito; integrações evoluem separadamente | Algumas relações adicionais, mas pequenas e específicas. Recomendada |
| D. Tabelas de canais distintas para empresa e unidade | FKs diretas e regras separadas | Duplica quase todo o CRUD e consultas; não necessário com um vínculo local opcional bem definido |
| E. Uma tabela por plataforma desde o cadastro manual | Regras específicas fáceis no início | Estruturas repetidas sem integração real; URL não exige tabela Google completa. Reservar entidades específicas para integrações reais |

## 6. Recomendação arquitetural

Adotar C em incrementos, sem criar todos os blocos de uma vez. Manter organizations/locations e seus nomes atuais. Não construir CRM completo, framework universal de canais, motor de integrações, event sourcing, sistema completo de histórico/proveniência, catálogo dinâmico de plataformas, permission engine ou herança de perfis. Não introduzir abstrações sem caso de uso atual.

### Perfis complementares quando necessários

Se descrição, segmento e contatos ganharem fluxo próprio, considerar `organization_profiles` com organization_id como PK/FK (0..1 por empresa). Para dados locais, `location_profiles` com organization_id obrigatório, location_id como identidade do perfil e FK composta para locations (0..1 por unidade). Campos tipados e opcionais, sem duplicar os nomes já existentes. Ausência do perfil significa dados ainda não cadastrados; não criar linhas vazias obrigatórias.

Uma expansão minúscula em uma tabela central seria tecnicamente possível. A direção proposta de extensões evita acumular cadastro institucional/local no núcleo; não justifica criar duas tabelas sem campos ou consumidor. O primeiro corte abaixo não precisa delas. Endereço único local pode começar como campos explícitos do perfil; múltiplos endereços e horários justificam entidades próprias somente quando requeridos.

### Canais digitais como entidade concreta

Proposta de `digital_channels`, inicialmente registros manuais. O canal tem identidade própria: URL é um atributo mutável, não o próprio conceito do canal. Campos conceituais iniciais: id, organization_id obrigatório, location_id opcional, tipo de canal, URL e datas de criação/última alteração. Nomes físicos, tipos SQL, limites e constraints devem ser fechados na etapa de dados; isto não é DDL.

- location_id ausente significa **canal institucional desta organização**, nunca “todas as unidades”, erro de seleção ou recurso órfão.
- location_id presente significa **canal daquela unidade**, validado pelo par organization/location no banco e na aplicação.
- Escopo e titular são imutáveis na edição comum: corrigir URL não move canal entre unidades ou empresas. Uma mudança de atribuição precisará de fluxo específico futuro.
- Tipos conceituais iniciais aprovados: `SITE`, `WHATSAPP` e `GOOGLE_BUSINESS_PROFILE` (na interface: “Perfil da Empresa no Google”). Instagram/Facebook estão fora do MVP. Novos tipos poderão ser adicionados por incremento explícito, sem redesenhar titularidade, identidade ou origem; não criar enum, tabela de tipos ou código nesta etapa.
- Admitir 0..N canais por titular, inclusive vários do mesmo tipo por organization ou location. Não recomendar UNIQUE(organization_id, type), UNIQUE(organization_id, location_id, type) ou unicidade global de URL como limitação artificial. A interface deve listar todos, sem escolher silenciosamente um “principal”. Rótulos só serão considerados se necessários para distinguir canais semelhantes.
- Não duplicar link institucional em todas as locations. A futura leitura apresenta “Institucional” e “Desta unidade” separadamente, sem afirmar que canal institucional foi verificado para cada unidade.
- URL é um dado, não uma credencial: validar formato e esquemas permitidos, rejeitar credenciais embutidas e links com tokens secretos. Não buscar URLs no servidor nem validar disponibilidade por requisição externa no MVP.
- MVP sem DELETE, arquivamento, transferência ou status de canal. Correção de URL é permitida; retirada completa de um canal exige decisão de ciclo de vida antes de liberar esse fluxo.

Todo canal pertence a uma organization e pode ter escopo institucional ou local. A sugestão anterior de exigir location para todo cadastro manual Google deixa de ser uma restrição geral neste fechamento: o modelo aprovado admite location opcional. A associação local deve representar uma operação real e ser validada; não criar unidade fictícia. Isso não afirma elegibilidade Google nem impede regras específicas de futura integração. Exemplo válido: Academia Alpha com SITE institucional e GOOGLE_BUSINESS_PROFILE da unidade Águas Claras. Exemplo inválido: canal da organization A associado à location da organization B.

## 7. Origem, confiabilidade e atualidade

Separar três eixos: quem declarou, que evidência existe e quando ela foi obtida. Uma URL válida sintaticamente não significa canal encontrado, configurado, conectado ou verificado. Tampouco existe escala universal em que qualquer informação sincronizada é sempre melhor que informação manual.

| Classe | Significado e apresentação futura | Persistência recomendada |
| --- | --- | --- |
| MANUAL | Informação cadastrada pela ADSCOM/usuário; neste MVP, apenas ADMIN escreve. “Perfil da Empresa no Google cadastrado — informado manualmente” não significa verificado, integrado, sincronizado ou confirmado pelo Google | Registro de canal, timestamps e autoria da alteração quando o fluxo de auditoria for definido. No MVP todos são manuais por contrato do domínio |
| EXTERNAL | Informação obtida, confirmada ou sincronizada por integração externa; indicar data e exatamente o que foi observado | Extensão/vínculo de integração, identificador externo, origem, instante e resultado; não escrever em um campo comum “verified=true” |
| DERIVED | Informação calculada ou inferida pelo ADSCOM com evidências, critérios e período | Diagnóstico próprio com versão dos critérios, data e referências às evidências; não sobrescrever o cadastro manual |

Não criar tabela universal de evidências nem proveniência por célula. A alternativa mais simples, recomendada para o primeiro schema, é origem MANUAL por contrato e identificação explícita na UI, sem coluna de origem: não há importações/cálculos coexistindo a distinguir. Uma indicação persistida mínima só se justificará quando fontes diferentes precisarem ser distinguidas; não é necessária agora. Antes de receber importações, introduzir estruturas que preservem as origens sem misturá-las silenciosamente. Eventual origem futura será controlada pelo servidor/banco, nunca um campo que permita declarar “integrado” pelo navegador. Estes nomes são conceitos, não enum ou infraestrutura implementada.

`updated_at` mede edição, não verificação. Uma integração futura deve manter `observed_at`/última sincronização bem-sucedida separados da última tentativa/erro. Alterar URL deve invalidar eventual evidência dependente do valor anterior. Evidência deve referenciar o valor/versão observado; não transferir selo de verificação para um novo destino.

Conflitos futuros devem ser explícitos: telefone manual diferente do provedor não autoriza sobrescrita automática. Definir fonte de verdade por campo e ação de reconciliação no incremento de integração. Histórico completo de cada edição não é necessário agora, mas qualquer módulo que afirme evolução temporal precisa armazenar observações históricas antes de fazer essa promessa.

## 8. Multi-tenancy, autorização e RLS futuro

Toda nova linha de negócio terá organization_id obrigatório com FK e índice adequado. A relação opcional de canal com location exige FK composta `(organization_id, location_id)` para o par único já existente em locations, além da FK direta de organization. Quando location_id for nulo, a FK direta mantém a propriedade do canal. Duas FKs independentes não impedem empresa A + unidade B.

| Operação proposta em perfis/canais | ADMIN_ADSCOM | CLIENTE | Anônimo |
| --- | --- | --- | --- |
| Ler | Global, com sessão normal | Somente organizations vinculadas | Negado |
| Cadastrar/editar dados manuais | Permitido quando o fluxo for autorizado | Negado no primeiro MVP | Negado |
| Trocar titular, excluir, declarar verificação externa | Fora do CRUD proposto | Negado | Negado |

Para canais, esta matriz incorpora a decisão de MVP: ADMIN cadastra/corrige/atualiza e CLIENTE apenas consulta, sem criar, editar ou remover. Não é concessão implementada nem decisão permanente: futura edição pelo cliente exige autorização, RLS/grants e testes próprios, sem redesenhar a identidade dos canais. Perfis complementares continuam adiados. Definir RLS e grants mínimos na mesma futura migration; SELECT e INSERT/UPDATE não se autorizam apenas pela FK. Para UPDATE usar USING e WITH CHECK conforme operação e grants por coluna, preservando tenant, escopo e campos controlados pelo sistema. FK composta no banco, RLS e validação na aplicação deverão proteger a integridade organization/location, inclusive em pedidos de admin com pares cruzados.

Reutilizar o grafo sem ciclos: dados novos consultam memberships/papéis; memberships e papéis não passam a consultar canais. `global_roles_select_own` continua essencial. Não criar helper privilegiado sem necessidade demonstrada. Cliente com acesso à organização terá acesso a suas unidades; não oferecer privacidade por unidade sem nova arquitetura de autorização.

Cada página/action valida sessão e permissão; UUID, cookie, formulário e metadata não são autorização. Consultas de recurso local usam organization_id + id e, quando aplicável, location_id. Contexto selecionado permanece preferência. Revogação deve surtir efeito na próxima operação, mesmo com JWT/cookie anteriores. Sem service_role em operações normais, sem cache privado compartilhado e sem SELECT público de contatos apenas por parecerem públicos na origem.

O futuro módulo `/app/presenca` precisa recusar consultas sem empresa autorizada; o placeholder atual não é implementação dessa leitura. Estados “sem empresa”, “falha de consulta”, “sem canais” e “sem unidades” devem ser distintos. Listagem limitada/paginada não prova que existe somente uma unidade. Não alterar cookie global para introduzir filtro local de Presença.

Aceite futuro obrigatório: pgTAP e HTTP com JWTs A/B, multiempresa, sem vínculo, admin sem membership, anônimo; pares cruzados inclusive com admin; canal institucional nulo; 0/1/N unidades; escrita indevida; tenant/escopo imutáveis; revogação com mesma sessão; dados inválidos e falha sem vazamento. Preservar os 90 testes atuais e ampliar conforme a implementação.

## 9. Compatibilidade com Google

O conceito é GOOGLE_BUSINESS_PROFILE, não “link Google”. O mesmo canal cadastrado manualmente poderá evoluir para possuir external_id, estado de integração, última sincronização, metadados externos e avaliações relacionadas, diretamente ou por extensão específica vinculada à sua identidade. A distribuição física desses dados será definida no incremento de integração; nenhum desses campos entra agora. Preservar a separação da 09A entre identidade interna, recurso externo e conexão autenticada, sem impor a todo canal manual a cardinalidade do conector futuro. Uma URL manual não vincula automaticamente conta externa, comprova posse ou habilita importação.

Cardinalidade de perfis conectados, elegibilidade do negócio, permissões, recursos disponíveis e regras de uso serão verificadas na documentação oficial vigente antes de especificar integração. Esta etapa não pesquisa nem afirma requisitos atuais das APIs. Não promete que todo canal manual poderá ser conectado. O primeiro MVP não precisa guardar ID externo, OAuth, resultado de sincronização ou payload de plataforma.

Link de perfil e destino para solicitar avaliações são finalidades distintas: não inferir um do outro por manipulação de URL. Quando esse destino for necessário, será configurado/validado com semântica própria. Credenciais externas futuras ficam exclusivamente em armazenamento de servidor restrito, fora de perfis e canais consultáveis pelo cliente.

## 10. Compatibilidade com avaliações

Para o caso Google local, preservar a cadeia conceitual organization → location → perfil externo → avaliações. Avaliações guardam tenant e vínculo com a origem, não apenas uma URL mutável do canal. A unidade pode ser derivada de um vínculo estável; se for materializada, exigir consistência por constraints e preservar a atribuição histórica.

Outras fontes podem representar a empresa digital sem unidade. O desenho futuro pode permitir origem institucional explicitamente, sem inventar location e sem forçar todas as plataformas a usar o modelo Google. Não construir um modelo universal de reviews antes de conhecer a primeira origem.

Renomear unidade ou corrigir link não deve apagar avaliações nem reatribuir seu passado. Evitar cascatas destrutivas e mudanças de tenant. Deduplicação depende de identificador externo no escopo correto do provedor/recurso; URL ou texto não bastam. Relatórios futuros devem definir período, universo e contagens antes de consolidar: média simples de médias de unidades pode produzir resultado incorreto.

## 11. Compatibilidade com NFC e preservação histórica

```text
Placa/cartão
   -> URL estável ADSCOM: go.adscom.com.br/<code> (direção futura)
   -> dispositivo da organization [location opcional validada]
   -> destino configurável validado
   -> registro de interação, quando autorizado e projetado
```

NFC institucional funciona sem location; placa de avaliações de uma operação deve apontar à unidade correspondente. O código público identifica o dispositivo, não autoriza leitura do tenant. Futuras relações dispositivo/unidade, dispositivo/evento e destino/canal devem impedir mistura entre organizações por FKs compostas quando referenciadas.

O canal pode ser candidato a destino, mas não deve ser seguido automaticamente ao editar sua URL. Recomenda-se mudança explícita da configuração do dispositivo; ao introduzir eventos, registrar a versão/atribuição/destino efetivos da interação. Assim, alterar destino ou futura associação local não reinterpreta eventos antigos. Não criar eventos, snapshots ou tabelas de versões agora.

Destinos futuros podem incluir Perfil da Empresa no Google, WhatsApp, site, Instagram, agendamento e outros. Essa lista de compatibilidade não amplia os três tipos aprovados para o primeiro MVP de Presença.

O endpoint público exigirá desenho restrito próprio; não liberar tabelas privadas para anônimo nem aceitar destino arbitrário da requisição. Disponibilidade, abuso, privacidade, retenção e significado de interação versus pessoa única são decisões da etapa NFC, sem implementação aqui.

Arquivar/desativar locations é decisão futura. Não implementar DELETE, soft delete ou coluna active agora. Quando houver ciclo de vida, definir separadamente efeito sobre novos cadastros, links públicos e leitura histórica; manter referências e não fazer desaparecimento em cascata de reviews, NFC ou relatórios.

Relatórios históricos não devem depender da existência física atual de todos os recursos operacionais. Quando implementados, precisarão preservar fatos e atribuições suficientes por referências históricas estáveis ou snapshots definidos naquele escopo. Manter RESTRICT hoje evita perda prematura, mas não substitui esse desenho futuro. Não construir sistema completo de histórico ou event sourcing agora.

## 12. Relação com ENTRAR, ESTRUTURAR e CRESCER

Presença oferece evidências para uma evolução futura, não classificação automática do cliente. ENTRAR pode usar inventário de canais e dados locais; ESTRUTURAR/CRESCER poderão considerar outros módulos e períodos. SOLUTIONS continua vertical tecnológica, não quarto estágio obrigatório.

No primeiro módulo, usar “Canal cadastrado — informado manualmente” e “Nenhum canal cadastrado”; para Google, “Perfil da Empresa no Google cadastrado”. A URL é apresentada como atributo. Não apresentar “não identificado” como se uma busca tivesse sido feita, “configurado” como se integração existisse, ou “inexistente” por falta de registro. Se uma leitura falhar, mostrar erro, não ausência.

No futuro, disponibilidade de avaliações virá do módulo correspondente; NFC configurado virá de configuração real de dispositivo; evidência Google virá do vínculo/observação externa. Uma visão pode compor essas fontes sem gravar booleans redundantes em organizations. Diagnóstico calculado deve distinguir desconhecido, não aplicável e ausência comprovada; seus critérios serão datados/versionados. Nenhum score, estágio automático, recomendação ou algoritmo é proposto para implementação agora.

## 13. MVP aprovado e itens adiados

### MVP próximo: inventário manual mínimo

Reutilizar nomes e identidades existentes. O MVP conceitual aprovado é inventário manual de canais digitais: SITE, WHATSAPP e GOOGLE_BUSINESS_PROFILE. Criar futuramente somente o necessário para identidade do canal, tipo, URL como atributo, tenant, escopo institucional/local e timestamps. Nenhum canal ou perfil é obrigatório; empresa sem unidade pode ter canais institucionais e usar Presença. Admitir múltiplos canais do mesmo tipo sem unicidade artificial por empresa/unidade.

ADMIN_ADSCOM cadastra/corrige/atualiza canais dentro do contexto da empresa e, quando local, da unidade validada. CLIENTE futuramente consulta, sem criar, editar ou remover, com origem manual explícita. Institucional e local ficam separados; não há agregação de métricas nem cópia automática de valores. A primeira leitura pode agrupar por unidade sem criar preferência global de unidade ou implementar a Etapa 10B. Se o volume exigir navegação/paginação, fechar isso como escopo explícito dessa tela.

Perfis complementares completos não são pré-requisito para um inventário útil. Descrição, segmento e contatos são candidatos posteriores, não campos essenciais inseridos por antecipação. Esta escolha reduz a primeira migration e permite validar a semântica de presença com usuários antes de ampliar cadastro.

### Futuro próximo

Descrição/segmento, contatos adicionais, endereço completo, Instagram/Facebook, rótulos e eventual canal principal somente quando houver caso de uso concreto; horários com timezone/exceções em incremento próprio. Perfis completos, CNPJ, razão social e demais dados fiscais permanecem adiados para não construir CRM nem inflar o núcleo. A retirada de canais também fica adiada: não há exclusão física ou arquivamento no MVP. Quando necessária, estudar explicitamente arquivar, desativar ou substituir preservando histórico/dependências, sem escolher mecanismo agora. O ciclo de vida de unidades permanece igualmente separado.

### Futuro distante ou com escopo independente

Integrações Google/Meta, OAuth e sincronização, importação de avaliações, dispositivos/eventos NFC, métricas, relatórios históricos, score/maturidade, recomendações, automações, CRM e dados jurídicos/fiscais. Não preparar tabelas vazias, schedulers, filas ou frameworks para esses recursos. Endereço não implica geocodificação; WhatsApp cadastrado não implica API de mensagens.

## 14. Riscos e mitigação

| Risco | Mitigação arquitetural |
| --- | --- |
| Confundir link com canal verificado | Origem manual explícita; integração/evidência separadas; timestamps com semântica definida |
| Transformar tenant em unidade ou CNPJ | Preservar organization; identidade jurídica e operação local distintas |
| Duplicar contato ou herdar dado incorreto | Uma fonte por finalidade; institucional/local visíveis e independentes |
| Nulo significar tanto institucional quanto “todas” | Semântica única no dado; estados de navegação explícitos |
| RLS global de admin permitir par A/B incoerente | FK composta e filtro de contexto, também testados como admin |
| URL perigosa, privada ou com credencial | Validação por tipo/finalidade, sem fetch no servidor no MVP, sem dados secretos nos canais |
| Histórico mudar ao editar link/reassociar recurso | Identidades internas estáveis; versões/observações antes dos módulos históricos; sem cascatas destrutivas |
| Tabela central crescer indefinidamente | Canais concretos separados e extensões de perfil somente quando necessárias |
| Modelo genérico crescer antes do produto | Tipos fechados iniciais; nenhuma EAV ou engine de integração |
| Listagem truncada gerar seleção/ausência falsa | Paginação/contagem completas quando exigidas; estados de erro separados |
| Cadastro repetido por duplo envio | Controle local de pendência pode ser reutilizado; não equivale a idempotência ou unicidade por tipo |
| Canal errado sem retirada no primeiro CRUD | Limitação aprovada: corrigir/atualizar, sem exclusão física ou arquivamento. Quando retirada for necessária, projetar seu ciclo explicitamente, sem DELETE improvisado |

## 15. Perguntas para decisão humana

Fechadas na 11A.1: inventário manual como primeiro valor, três tipos iniciais, Instagram/Facebook fora do MVP, ADMIN como editor e CLIENTE como leitor, organization obrigatória/location opcional, múltiplos canais do mesmo tipo, ausência de exclusão física/arquivamento e adiamento dos perfis completos. Origem MANUAL não significa EXTERNAL ou DERIVED. Essas decisões não permanecem pendentes.

Permanecem apenas perguntas para escopos futuros, sem bloquear o inventário aprovado:

1. Quando contatos/endereço entrarem, serão internos ou publicáveis? Manter privados por padrão até decisão específica.
2. Quando perfis complementares tiverem caso de uso, quais campos, classificação de segmento e cobertura geográfica serão necessários?
3. Quando houver necessidade de retirada de canal, qual mecanismo preservará dependências e histórico: arquivar, desativar ou substituir? Nenhuma escolha antecipada.

Detalhes técnicos de schema/validação serão especificados na 11B; isso não reabre os tipos, atores ou escopo de produto aprovados. Nenhuma implementação está autorizada por este documento.

## 16. Proposta de próximas etapas

Não iniciar automaticamente nenhum incremento. Cada autorização deve fechar dados, atores, limites e critérios de aceite; números abaixo são proposta de organização do trabalho.

| Etapa proposta | Escopo fechado | Aceite e limite de reversibilidade |
| --- | --- | --- |
| 11A — arquitetura | Alternativas e direção geral, já revisada | Somente documento; nenhuma alteração funcional |
| 11A.1 — fechamento arquitetural | Incorporar decisões humanas aprovadas; esta revisão documental | Revisão final do documento; nenhuma implementação |
| 11B — fundação mínima de dados de Presença | Especificar e validar localmente schema mínimo de canais com tipos aprovados, constraints, índices, RLS/grants e testes; sem UI/perfis vazios | Testar tenant, escopo institucional/local, pares cruzados, múltiplos do mesmo tipo e permissões; preservar regressão. Reversível no ambiente local descartável, sem apagar dados reais |
| 11C — administração de Presença | Cadastro/listagem/correção/atualização de canais em empresa/unidade por ADMIN; sem integração, edição pelo cliente, exclusão ou arquivamento | HTTP das actions, validações e isolamento; revisão manual; retirar UI não exige apagar registros |
| 12 — primeiro módulo funcional de Presença para consulta/uso | Consumir canais sob contexto autorizado; distinguir institucional/local e origem manual; tratar zero/uma/várias unidades | Clientes A/B, revogação, estados vazios/erros, privacidade e revisão manual. Pode ser desativado preservando dados |
| Incremento posterior autorizado | Perfis complementares ou primeiro conector, conforme prioridade real | Escolher um domínio por vez, sem exigir NFC/Avaliações ou maturidade para fechar Presença manual |

A aplicação remota da futura migration será um ponto de aprovação separado após validação local da 11B e antes de usar a funcionalidade no remoto: confirmar projeto/histórico, dry-run, aplicar somente o aprovado e auditar schema/grants sem fixtures permanentes. Não está autorizada agora nem implícita na 11C. Após dados reais, reverter código difere de remover schema: usar correção aditiva planejada, nunca reset automático. A Etapa 12 fica limitada ao primeiro inventário de consulta; não abrange integrações, NFC, avaliações ou maturidade. Não é necessário implementar seletor global de unidade ou ciclo de vida da Etapa 10B como pré-requisito.

## 17. Validação desta entrega documental

Revisar coerência com as duas migrations, contexto e autorização existentes; conferir matriz de campos, origem dos dados, FKs propostas e limites de escopo. Executar git status e git diff --check, incluindo conferência do arquivo novo ainda não rastreado. Testes de aplicação/banco não são necessários para um documento e não serão executados, evitando criação de fixtures ou operações no Supabase.

Somente `docs/perfil-empresa-presenca.md` deve aparecer como novo. HEAD permanece `adf27da`; sem staging, commit, push, tag ou alteração de remote. As propostas de RLS e integrações acima não constituem garantias implementadas/testadas. A entrega termina na revisão arquitetural.
