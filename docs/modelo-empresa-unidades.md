# Modelo de empresa e unidades — Etapa 09A

Data: 01/10/2026. **Proposta arquitetural para revisão, sem implementação.** Base inspecionada: branch `main`, checkpoint `ddad923` (`feat: establish ADSCOM Dashboard foundation`), working tree inicialmente limpo. Nenhuma migration, SQL, alteração de RLS ou operação no Supabase foi executada nesta etapa.

## 1. Objetivo

Evoluir a fundação para representar uma empresa com uma ou várias unidades sem substituir o tenant atual. Distinguir informações institucionais, operações locais e dados de provedores externos. A proposta deve atender empresas pequenas, digitais e sem atendimento presencial sem exigir endereço fictício.

ENTRAR, ESTRUTURAR e CRESCER representam evolução da maturidade digital; SOLUTIONS é uma vertical de tecnologia. Esses conceitos orientam os módulos futuros, mas não são tenants, unidades ou permissões.

## 2. Estado atual confirmado

A auditoria leu AGENTS.md, README e os documentos de arquitetura, plano, autenticação, dashboard, administração, consolidação e Supabase. `docs/validacoes.md` não existe; os resultados anteriores estão em `docs/consolidacao.md` e nos documentos de cada etapa. Foram inspecionados migration, testes SQL/HTTP e código de contexto, seleção e administração. Não foi consultado o schema de um banco em execução: o estado estrutural confirmado é o versionado, não uma comprovação do remoto.

### Schema versionado

Há somente [20260926000100_multi_tenant_foundation.sql](../supabase/migrations/20260926000100_multi_tenant_foundation.sql):

| Tabela | Estrutura existente |
| --- | --- |
| `organizations` | `id uuid` PK com geração automática; `name text NOT NULL` com CHECK de nome não vazio após trim; `created_at timestamptz NOT NULL DEFAULT now()` |
| `organization_members` | `organization_id` obrigatório, FK para organizations com DELETE RESTRICT; `user_id` obrigatório, FK auth.users com DELETE CASCADE; `role` obrigatório, padrão e CHECK somente CLIENTE; `created_at`; PK `(organization_id, user_id)` |
| `user_global_roles` | `user_id` FK auth.users com DELETE CASCADE; `role` restrito a ADMIN_ADSCOM; `created_at`; PK `(user_id, role)` |

O índice de memberships começa por `(user_id, organization_id)`. Não existem locations, endereço, CNPJ, status, updated_at ou estágio de maturidade nas tabelas atuais. A action de cadastro limita o nome a 160 caracteres; a migration apenas exige texto não vazio.

### Autorização existente

RLS está habilitada nas três tabelas. As oito policies são:

- `organizations_select_member_or_admin`, `organizations_insert_admin`, `organizations_update_admin`;
- `members_select_own_or_admin`, `members_insert_admin`, `members_update_admin`, `members_delete_admin`;
- `global_roles_select_own`.

Authenticated tem SELECT nas três tabelas; escrita de nome de empresa e colunas de vínculo com grants mínimos, condicionada às policies de admin. Não há escrita de papéis globais nem DELETE de empresas pela API comum. Anon/PUBLIC não têm acesso. O grafo é acíclico: papéis próprios → identidade Auth; memberships → papéis; empresas → memberships/papéis. Não existem helpers SQL SECURITY DEFINER.

### Código e testes existentes

[context.ts](../src/lib/organizations/context.ts) confirma `getUser`, consulta papel próprio e memberships, lista empresas sob RLS e deduplica leituras somente na requisição. [selection.ts](../src/lib/organizations/selection.ts) resolve a preferência `adscom_organization` (`userId:organizationId`): única empresa é automática; várias exigem escolha. A action valida o UUID contra a lista autorizada e grava cookie de sessão HTTP-only, Path=/app, SameSite=Lax e Secure em produção. Logout remove a preferência. Cookie não é autorização.

[access.ts](../src/lib/admin/access.ts) exige ADMIN_ADSCOM consultado no banco. As páginas/actions administrativas repetem a verificação e usam sessão normal/RLS; não exigem membership artificial do administrador. Cadastro cria apenas organization com nome. Vínculos são por UUID Auth existente e sua remoção preserva Auth e outros vínculos.

Foram revisados `tests/organization-selection.test.mjs`, `tests/admin-validation.test.mjs`, `supabase/tests/database/001_multi_tenant.test.sql` e os scripts HTTP/RLS, dashboard e administração. Cobrem A/B, múltiplos vínculos, ausência de vínculo, admin, adulteração de IDs/cookies, revogação e integridade. O checkpoint registra 13 testes unitários, 52 asserções pgTAP e suítes HTTP aprovadas. **Não foram reexecutados nesta etapa documental e não validam locations ainda inexistentes.**

## 3. Problema arquitetural

Empresa e unidade não são sinônimos. Academia Alpha é a organização; Águas Claras, Taguatinga e Asa Norte são unidades da mesma organização. Um telefone local, endereço ou avaliação não deve ficar global apenas porque hoje existe uma única unidade.

Também não convém transformar cada filial em tenant: isso duplicaria identidade institucional e memberships e tornaria uma visão consolidada artificialmente difícil. A operação digital não deve receber endereço ou filial fictícia só para satisfazer o schema.

## 4. Modelo recomendado

Manter **organization como empresa cliente e fronteira do tenant**. Adicionar futuramente **location como unidade operacional subordinada**, sem hierarquia entre unidades e sem novo sistema de papéis. A unidade pode ser física ou uma operação de atendimento sem endereço público; não equivale automaticamente a estabelecimento fiscal nem a perfil Google.

```text
auth.users ── organization_members ── organizations (tenant)
     │                                    │
     └── user_global_roles                ├── locations (0..N)
         ADMIN_ADSCOM global              │     ├── google_business_profiles (futuro)
         sem membership artificial        │     │     └── reviews (futuro)
                                          │     └── recursos locais futuros
                                          ├── nfc_devices (futuro)
                                          │     └── location_id opcional
                                          │           └── nfc_events via dispositivo
                                          └── recursos institucionais futuros
```

O diagrama mostra responsabilidade, não permissões já concedidas. NFC sempre terá organization; a associação opcional à unidade não substitui essa propriedade.

| Questão | Recomendação |
| --- | --- |
| Toda empresa precisa de unidade? | Não: permitir 0..N; zero é válido no cadastro e para uso somente institucional |
| Empresa de unidade única tem location? | Sim, quando possui operação local a representar; usar o mesmo modelo das empresas com várias |
| Quando criar? | Depois do cadastro, por ação explícita; não gerar automaticamente uma unidade fictícia para todo tenant |
| Quem é membro? | Usuário pertence à organization por organization_members, não diretamente à location |
| Permissões por unidade agora? | Não; CLIENTE acessa todas as unidades da organização autorizada |
| ADMIN_ADSCOM? | Acesso global por papel confiável, com sessão/RLS e validação da relação empresa/unidade |
| Contexto futuro? | Empresa atual mais escopo explícito de unidade nas páginas que precisam dele |

## 5. Responsabilidade de organizations

Representar o cliente ADSCOM, sua identidade comercial e a propriedade dos dados. Não tratar organization como cadastro fiscal completo: uma organização pode envolver unidades com documentos diferentes, e isso ainda não foi especificado.

Manter `name` como nome comercial exibido, sem renomear para trade_name nem duplicar o campo. Informações institucionais opcionais só entram quando houver consumidor e fluxo de manutenção. Um site institucional não é necessariamente o site de uma unidade; não copiar valores entre as duas entidades automaticamente.

## 6. Responsabilidade de locations

Representar uma operação identificável: loja, clínica, academia ou base de atendimento. Guardar os dados locais quando seu módulo existir: nome da unidade, contato local, endereço aplicável, horários e localização. Não guardar credenciais de integração nem converter IDs Google em identidade interna.

Uma empresa digital pode permanecer sem locations. Se tiver operações distinguíveis que precisem de recursos próprios, pode cadastrá-las sem endereço físico. Uma empresa que presta serviço fora de sede também pode ter unidade sem atendimento presencial. O modelo não afirma elegibilidade para Google Business Profile; essa verificação pertence à futura integração e às regras vigentes do provedor.

## 7. Relação organization → locations e ciclo de vida

Cada location pertence a exatamente uma organization e não pode existir sem ela. Uma organization pode existir sem locations. Dados estritamente locais exigem uma location real; não usar organization_id como substituto de location_id para o caso de unidade única.

Não impor no banco “ao menos uma unidade” nem criar registro ao ler o dashboard. O cadastro atual permanece independente. Ao cadastrar a primeira unidade futuramente, o operador fornece um nome real; pode usar sugestão editável, nunca inferir endereço ou preencher dados fictícios. Não fazer backfill automático para todas as empresas.

Não permitir transferir uma location entre organizações pelo CRUD comum. Exclusão física e cascatas de dados ficam fora do primeiro incremento; preservar referências com RESTRICT. Arquivamento exige requisito de ciclo de vida antes de adicionar status. Zero unidades não impede login, administração ou acesso a recursos institucionais.

## 8. Campos recomendados para o MVP

“Essencial agora” abaixo significa o núcleo recomendado para a primeira implementação autorizada de unidades, **não criação de campos nesta Etapa 09A**. Recomenda-se começar apenas com identificação e vínculo; dados de presença serão acrescentados quando seu fluxo for definido.

### Organization

| Campo avaliado | Classificação | Decisão |
| --- | --- | --- |
| `id` | Essencial agora | Manter UUID/PK existente |
| `name` (nome comercial) | Essencial agora | Manter campo atual; não exigir unicidade por nome |
| `created_at` | Essencial agora | Manter timestamp existente |
| `legal_name` (razão social) | Útil depois | Só com necessidade institucional/legal definida |
| documento/CNPJ | Melhor em outra entidade | Cadastro fiscal futuro, se necessário; não usar como identidade do tenant nem exigir para conta digital |
| `segment` | Útil depois | Definir classificação e consumidor antes de criar catálogo ou enum |
| `website_url` institucional | Útil depois | Organização se representar a marca inteira; URL de unidade deve ter finalidade distinta |
| telefone principal | Melhor em outra entidade | Em location se for contato de atendimento; contato corporativo separado só com requisito explícito |
| WhatsApp principal | Melhor em outra entidade | Mesma regra do telefone, sem duplicar atendimento local |
| e-mail institucional | Útil depois | Contato da empresa; não copiar e-mail de login Auth nem criar cadastro de usuários paralelo |
| `status` | Útil depois | Definir estados e efeitos; status cadastral não deve virar autorização implícita |
| `updated_at` | Útil depois | Adicionar com fluxo de edição e manutenção consistente no banco; não afirmar que existe hoje |

Não adicionar campo institucional apenas porque consta em um formulário genérico. Nenhum campo de organization precisa mudar para introduzir locations.

### Location

| Campo avaliado | Classificação | Decisão |
| --- | --- | --- |
| `id` | Essencial agora | UUID PK estável gerado no servidor/banco |
| `organization_id` | Essencial agora | UUID obrigatório, FK para organization; identidade de tenant imutável no CRUD |
| `name` | Essencial agora | Texto obrigatório não vazio; proposta de limite 160 coerente com cadastro atual; nome não prova identidade |
| `created_at` | Essencial agora | timestamptz obrigatório com padrão do banco |
| `updated_at` | Útil depois | Incluir quando existir edição; atualizar por todas as vias autorizadas, inclusive API direta |
| slug/código amigável | Desnecessário no MVP | UUID basta; evitar regras de renomeação e unicidade sem uso |
| endereço/logradouro, número | Útil depois | Campos opcionais da location quando houver cadastro de presença; número textual |
| complemento, bairro | Útil depois | Opcionais; não exigir informações inexistentes |
| cidade, estado, CEP, país | Útil depois | Opcionais no modelo básico; CEP textual; validar completude por caso de uso, sem presumir BR silenciosamente |
| telefone, WhatsApp | Útil depois | Contatos locais opcionais; normalização quando o formulário existir |
| latitude, longitude | Útil depois | Opcionais; futuramente exigir par coerente e faixas válidas; não inferir sem origem confiável |
| `timezone` | Útil depois | Identificador IANA quando houver horários/métricas locais; não deduzir do fuso do servidor |
| `status` | Útil depois | Definir arquivamento/inativação e impacto nos recursos antes de acrescentar |
| `is_primary` | Desnecessário no MVP | Uma unidade é selecionada pela quantidade; várias por preferência, sem “principal” global |
| horários, áreas de atendimento | Melhor em outra entidade | Modelos próprios quando houver exceções/feriados/cobertura; não criar texto genérico obrigatório |
| IDs/perfil Google, sincronização | Melhor em outra entidade | Integração separada |

O núcleo mínimo futuro é `id`, `organization_id`, `name`, `created_at`, acompanhado de constraints, índices e RLS. Caso o escopo da implementação inclua edição ou cadastro de presença, promover apenas os campos necessários da lista adiada e rever os testes. A falta de endereço não deve ser erro de integridade da unidade.

## 9. Campos explicitamente adiados

Razão social, documento fiscal, segmento, site institucional, e-mail corporativo, contatos/endereço, coordenadas, horários, timezone, status e updated_at aguardam fluxos reais. Slug e is_primary não trazem valor ao MVP proposto. Não adicionar colunas para placares de avaliações, IDs externos, tokens, métricas, estágio ou score “para usar depois”.

Evitar JSON genérico de metadados como substituto do desenho dos módulos. Dados canônicos ficam em um lugar: se o telefone é local, sua fonte é a unidade mesmo para empresa de uma só unidade. Herança de contatos institucionais, caso necessária, deverá ser regra de leitura explícita, não cópia automática persistida em cada unidade.

## 10. Relação futura com Google Business Profile

Recomendar entidade separada `google_business_profiles`, ligada a uma location e com `organization_id` obrigatório. Location é identidade interna; o perfil representa um recurso externo e pode ter ciclo de vida e sincronização próprios.

Cada perfil interno aponta para uma unidade. A existência de location não obriga perfil. Para o primeiro fluxo de integração, considerar no máximo um perfil conectado ativo por unidade; confirmar cardinalidade, transferências, fusões e histórico com os requisitos e a API antes de escolher constraints. Isso é recomendação de produto, não afirmação sobre limites do Google.

Identificador externo, estado de sincronização, última sincronização e erros sanitizados pertencem ao vínculo de integração. Conexão OAuth/credenciais deve ficar em mecanismo separado e exclusivo do servidor, não em locations nem em campos comuns consultáveis pelos clientes. Uma conta externa pode administrar vários perfis; não confundir conta/conexão, perfil e unidade.

Dados locais editados e dados importados podem divergir. Definir fonte de verdade e regras de conflito por campo na etapa de integração; não sobrescrever automaticamente o cadastro local. Nenhuma API, credencial, sincronização ou tabela de integração é criada agora.

## 11. Relação futura com avaliações

Para avaliações Google, a cadeia é `organization → location → google_business_profile → reviews`. Reviews devem guardar referência ao perfil de origem e organization_id obrigatório; não ser registros globais ligados apenas à empresa.

O vínculo da review à location pode inicialmente ser derivado do perfil, evitando duplicação. Se houver motivo concreto para armazenar também location_id, exigir consistência do trio empresa/unidade/perfil por chave composta. IDs externos devem ser deduplicados no escopo correto do provedor/perfil, definido na integração.

Avaliações organizacionais consolidadas são resultado de consulta, não cópias de reviews em outra empresa ou unidade. Não calcular média simples de médias de unidades; definir universo, contagens e período antes da agregação. Dados importados do Google não devem virar um modelo universal de avaliações sem requisitos de outras origens. Retenção e reassociação histórica de perfil também ficam pendentes.

## 12. Relação futura com NFC

Recomendar `nfc_devices.organization_id` obrigatório e `location_id` opcional com significado explícito:

- Placa de avaliações da loja: empresa e unidade obrigatórias para esse caso de uso.
- Cartão institucional: empresa obrigatória, location_id ausente; não inventar “unidade geral”.

Isso permite os dois cenários sem owner_type/owner_id polimórficos nem duas tabelas idênticas. Dispositivo com unidade deve ser protegido por FK composta para impedir associar empresa A à unidade de B. Quando location_id for ausente, a FK direta da organização continua necessária. O destino do link é configuração validada, não prova de pertencimento.

Eventos devem pertencer à organization e ao dispositivo mediante FK composta. Antes de permitir mover dispositivos entre unidades, definir como preservar a atribuição histórica: não recalcular eventos antigos pela unidade atual do dispositivo. Pode-se impedir reassociação com histórico ou guardar atribuição validada no evento; a escolha fica para a etapa NFC. Não adicionar duplicações antecipadamente.

Leitura pública do código não dá acesso a locations/organizations. Registro/redirecionamento público exigirá desenho restrito próprio; não conceder leitura anônima de dados privados ou escrita anônima irrestrita.

## 13. Maturidade digital

Não criar score nem campo de estágio agora. A maturidade pode variar com o tempo e entre unidades; não confundir diagnóstico observado, pacote contratado e etapa comercial de relacionamento.

A [arquitetura anterior](arquitetura.md), seção 4, sugeria acrescentar uma coluna de estágio quando houvesse edição. Essa sugestão é prematura diante do requisito de evolução temporal. A divergência foi relatada antes da criação deste documento; o documento anterior permanece intacto para revisão, e esta proposta recomenda adiar a escolha.

| Alternativa | Avaliação |
| --- | --- |
| Coluna em organizations | Simples para uma classificação atual manual, mas perde histórico e pode misturar diagnóstico com contrato |
| Resultado calculado | Adequado se houver critérios/dados confiáveis; precisa versão da regra, período e tratamento de dados ausentes |
| Tabela de diagnósticos históricos | Direção preferível se for necessário acompanhar evolução, autoria, evidências e critérios ao longo do tempo |
| Coluna resumida mais histórico | Só se consultas justificarem redundância e houver regra única de atualização |

Quando houver requisitos, considerar avaliações datadas/versionadas por organization e, se necessário, location. A visão atual pode derivar do diagnóstico válido mais recente. Não definir pesos, thresholds, periodicidade, escopo local/global ou agregação agora. SOLUTIONS não entra como quarto estágio sequencial.

## 14. Multi-tenancy, RLS e integridade

Organization continua sendo o tenant. Location não herda RLS automaticamente por possuir uma FK: sua futura criação deve vir junto de RLS e grants mínimos, com verificação de sessão/autorização em cada leitura ou action.

### Matriz proposta, ainda não implementada

| Operação em locations | CLIENTE | ADMIN_ADSCOM | Anônimo |
| --- | --- | --- | --- |
| Ler | Todas as unidades das organizações vinculadas | Todas, sob sessão normal | Negado |
| Criar/editar, se autorizado no incremento | Negado no primeiro fluxo | Permitido sob validação e RLS | Negado |
| Transferir tenant/excluir definitivamente | Fora do CRUD inicial | Fora do CRUD inicial | Negado |

Membership somente por organization significa que não existe sigilo entre unidades do mesmo tenant. Se o produto precisar disso, será uma mudança explícita de autorização, não um filtro visual. Nenhum location_members ou permission engine agora.

### Relações e índices propostos

- Location: PK `id`, FK obrigatória `organization_id → organizations.id`, DELETE RESTRICT; par único `(organization_id, id)` para referências compostas. Esse índice começa pelo tenant e atende consultas básicas por empresa; não duplicar um índice idêntico sem necessidade.
- Recurso local: organization_id e location_id obrigatórios; FK `(organization_id, location_id) → locations(organization_id, id)`. Duas FKs independentes não garantem que os IDs pertençam à mesma empresa.
- Perfil Google: mesma FK composta para location; par único `(organization_id, id)` para receber reviews. Review: FK `(organization_id, google_business_profile_id)` para esse par. Se também armazenar location_id, usar referência composta que inclua esse campo no perfil, não três FKs independentes.
- NFC: mesma referência composta à location, mas opcional; manter organization_id obrigatório e FK própria à empresa. O comportamento padrão MATCH SIMPLE permite o caso de unidade nula; MATCH FULL não serve para esse par parcialmente nulo. Null significa institucional, nunca “qualquer unidade”.
- Indexar os pares de referência nas tabelas filhas conforme consultas por tenant e relacionamentos; FKs não criam automaticamente índices do lado referenciador. Escolher índices adicionais por consultas concretas.

Os mecanismos de unicidade, FKs compostas, nulidade e indexação acima seguem a [documentação PostgreSQL 17 sobre constraints](https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-FK). A aplicação desses mecanismos ao modelo ADSCOM é uma proposta deste documento; não há DDL executável aqui.

### Regras a preservar

Reusar conceitualmente a autorização por membership/papel lidos do banco, mantendo papéis globais restritos às concessões próprias. Não fazer organizations/memberships passarem a depender de locations, evitando ciclos no grafo. Não inventar SECURITY DEFINER para esse cadastro.

Futuras policies de UPDATE devem conferir linha anterior e resultante (USING/WITH CHECK); grants de coluna e validações devem impedir mudar organization_id, inclusive para admin que acessa A e B. Autorização em ambas as empresas não deve autorizar transportar recursos. Preferência, URL e hidden input nunca substituem a relação validada.

Falha de consulta é estado de erro, não lista vazia. Revogação de membership/admin deve negar a próxima consulta com o mesmo JWT. Não criar cache compartilhado privado. Um admin pode selecionar empresa B, mas continua impedido pela integridade de vincular um recurso de B a unidade de A.

### Testes exigidos antes de liberar implementação

Estender pgTAP e HTTP com JWTs comuns: A/B com mais de uma unidade cada; usuário multiempresa; sem vínculo; admin sem membership; anônimo; cliente tentando criar/editar; leitura por UUID alheio; INSERT/UPDATE com par empresa/unidade incompatível (também como admin); alteração de tenant; revogação usando JWT antigo; cookie de unidade de outra empresa; unidade inexistente; zero/uma/várias unidades e falha de consulta. Manter as 52 asserções e cenários atuais como regressão. Quando NFC existir, testar nulidade institucional e caso local obrigatório separadamente.

Nenhuma dessas garantias futuras está validada pela suíte atual; só poderá ser declarada após implementação e testes reais locais.

## 15. UX para uma unidade e para nenhuma

Com uma unidade cadastrada, resolver automaticamente a unidade nas páginas locais e mostrar seu nome sem seletor. Exemplo: Empresa: Academia Alpha; Unidade: Águas Claras. A consulta e o modelo são os mesmos usados com várias unidades.

Com zero unidades, permitir recursos institucionais e mostrar estado vazio nos locais: “Nenhuma unidade cadastrada”. Admin poderá receber ação de cadastro quando implementada; CLIENTE recebe orientação, sem ganhar permissão de escrita. Empresas digitais não devem ser obrigadas a preencher endereço para sair de um estado de erro artificial.

## 16. UX para múltiplas unidades e contexto futuro

Resolver primeiro empresa autorizada; só então consultar suas unidades sob RLS. Quando várias estiverem disponíveis, preservar escolha válida ou solicitar seleção explícita nas telas que exigem uma unidade. Nunca selecionar silenciosamente a primeira unidade.

Separar três conceitos: contexto organizacional, unidade específica e visão agregada. Não usar location_id nulo indistintamente para “todas”, “nenhuma”, “não selecionada” e “erro”. Um resolvedor servidor poderá expor estados explícitos: sem empresa, erro, sem unidades, seleção necessária, unidade válida e escopo agregado autorizado pela página. Centralizar a regra 0/1/N nesse resolvedor e no seletor; os módulos consomem o estado resolvido, não repetem contagens e fallbacks.

“Todas as unidades” só aparece quando o módulo implementar agregação correta. Não é uma location fictícia nem destino válido de criação de recurso local. Pode ser oferecido tanto a CLIENTE quanto a admin, pois ambos têm acesso a todas as unidades da empresa autorizada; não é privilégio global por si só. No primeiro CRUD/contexto, não precisa existir.

Ao trocar empresa, invalidar a seleção de unidade anterior e resolver novamente; não carregar location_id antigo para a nova empresa. Se houver preferência persistida, vinculá-la a usuário + organização + unidade e revalidar no servidor a cada requisição. O cookie atual de organização pode permanecer; eventual cookie separado de unidade deve ter as mesmas proteções e ser removido no logout. Não definir formato definitivo ou reescrever o cookie atual nesta etapa.

URLs de detalhes devem validar explicitamente a relação empresa/unidade e sua autorização, independentemente do cookie. Para mutações, unidade inválida deve causar recusa, nunca redirecionar a escrita para o fallback automático. Em leituras, seleção antiga pode gerar aviso e resolução da única unidade válida, como a empresa atual. “Abrir no Dashboard” continuará selecionando organização; abrir unidade exigirá ação própria futura com validação dos dois IDs.

## 17. Impacto sobre a arquitetura atual e riscos

| Área | O que permanece | Evolução futura |
| --- | --- | --- |
| organizations | IDs, name, created_at, tenant e cadastro atual | Nenhum campo precisa mudar para locations |
| organization_members | Vínculo/role/PK e revogação | Nenhuma migração de memberships |
| user_global_roles | ADMIN_ADSCOM global consultado no banco | Sem concessões automáticas nem membership artificial |
| Empresa atual | Resolução e cookie existentes | Acrescentar camada de unidade depois da empresa, somente onde necessário |
| Administração | Sessão normal, requireAdmin e RLS | Cadastro/lista de unidades dentro do detalhe da empresa, em escopo futuro |
| Migration existente | Checkpoint intacto | Nova migration aditiva em etapa autorizada, nunca editar a aplicada |
| Testes | Regressão de auth, RLS, empresa e admin | Fixtures e cenários de unidades adicionais, sem trocar a prova atual |

Riscos principais: duplicar contatos entre empresa/unidade; tratar tenant como pessoa jurídica; dar aparência de permissão por unidade sem implementá-la; usar FK simples que aceite combinação cross-organization; confundir nulo com agregado; perder histórico ao reassociar dispositivos/perfis; supor API/Google para toda unidade; seleção incorreta se uma listagem truncada parecer ter apenas um item. Antes de 0/1/N automático, a futura consulta deve distinguir lista completa de resposta limitada (paginação/contagem apropriada); não inferir unicidade de uma página parcial. Esse limite já existe nas listagens atuais e não é corrigido aqui.

Os documentos de consolidação/plano descrevem o estado antes do checkpoint e ainda citam ausência de commit/Etapa 09. São registros anteriores, não bloqueios para esta proposta autorizada. Permanecem sem edição. A recomendação de maturidade divergente foi destacada na seção 13 para revisão explícita.

## 18. Alternativas consideradas

| Alternativa | Motivo para não adotar agora |
| --- | --- |
| Endereço/Google/avaliações em organizations | Obriga migração conceitual quando surgir a segunda unidade |
| Organization por filial | Muda tenant e duplica memberships/dados institucionais |
| Unidade obrigatória e automática para todos | Gera registros fictícios e altera cadastro existente, inclusive digital |
| Dados locais na empresa até surgir segunda unidade | Espalha condicionais e muda identidade dos recursos conforme quantidade |
| Memberships/roles por unidade | Complexidade sem requisito de restrição intraempresa |
| Unidade “Todas” ou “Institucional” | Mistura escopo de leitura com entidade operacional |
| NFC exclusivamente local | Bloqueia cartão institucional; exclusivamente global perde atribuição local |
| Modelo polimórfico universal de proprietário | Enfraquece FKs e adiciona abstração desnecessária |

A opção 0..N locations permite transição progressiva; sua contrapartida é tratar estados sem unidade explicitamente. Uma unidade real continua necessária para qualquer recurso de natureza local, seja a primeira ou a centésima.

## 19. Decisões que não devem ser tomadas ainda

Não decidir critérios/score de maturidade, papéis locais, hierarquia de empresas/unidades, modelo fiscal completo, unicidade de documentos, integração Google/OAuth, cardinalidade histórica final de perfis, sincronização, retenção, métricas, agregações de negócio ou cobrança. Não escolher arquitetura distribuída, microsserviços, event sourcing, CQRS ou engine de permissões.

Antes da implementação, revisar com o produto o núcleo mínimo, quem poderá editar unidades, necessidade de contatos/endereço no primeiro formulário e eventual arquivamento. A recomendação inicial é admin escreve/cliente lê; qualquer exceção exige novo escopo. Essas decisões não impedem entregar a proposta, mas não podem ser presumidas como funcionalidades aprovadas.

## 20. Proposta de implementação incremental futura

1. Revisar esta arquitetura e aprovar explicitamente o escopo da Etapa 09B. Não iniciar por consequência desta documentação.
2. Em incremento autorizado, adicionar locations mínima por nova migration, com constraints, grants/RLS e testes SQL/HTTP na mesma entrega. Preservar empresas antigas com zero unidades; não aplicar remoto automaticamente.
3. Implementar cadastro/listagem administrativa subordinada à empresa, se incluídos no escopo aprovado. Sem cadastro público nem papéis de unidade. Testar integridade e permissões pela API direta.
4. Evoluir contexto/UX centralizados para 0/1/N unidades, preferências e revogação; manter regressões do cookie de empresa, login/logout e admin. Revisar manualmente empresa digital, única e múltipla.
5. Somente quando houver módulo aprovado, acrescentar contatos/endereço/horários e respectivas validações. Integrações Google, reviews e NFC recebem incrementos independentes com relações compostas e testes próprios. Maturidade recebe requisitos de diagnóstico antes do schema.

Critério de saída da futura implementação: testes reais de isolamento e integridade, estados claros de interface, documentação e revisão humana. Esta etapa termina com um único documento novo. Nenhum staging, commit, push, migration, alteração de banco/RLS, instalação ou funcionalidade foi executado; o checkpoint ddad923 permanece intacto.
