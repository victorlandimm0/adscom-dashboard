# Desenho técnico de Presença Digital — Etapas 11B.1 e 11B.1.1

## Decisão vigente — Etapa 11C.2.1 (05/10/2026)

A Presença Digital inicial aceita exatamente oito tipos: SITE, WHATSAPP, GOOGLE_BUSINESS_PROFILE, INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN e YOUTUBE. Labels: Site, WhatsApp, Perfil da Empresa no Google, Instagram, Facebook, TikTok, LinkedIn e YouTube. Todos são cadastros manuais, institucionais ou locais, sem verificação externa, propriedade comprovada, integração, autenticação, sincronização ou monitoramento. Todos usam a mesma validação estrutural HTTPS, sem whitelist de domínio e sem acesso de rede ao destino. Type continua imutável; edição somente de unidade/URL, sem exclusão ou arquivamento.

Esta decisão substitui o recorte anterior de três tipos. Os registros de etapas anteriores abaixo preservam seu contexto histórico, não restringem o conjunto vigente. A migration incremental `20261005000100_digital_channels_social_types.sql` substitui somente `digital_channels_type_check`; a migration histórica permanece intacta. Migration aplicada somente no Supabase local; permanece pendente no remoto. A única alteração remota autorizada foi a limpeza dos dois canais manuais da revisão anterior, documentada em administracao.md.

## Implementação local — Etapa 11B.2 (03/10/2026)

Contrato abaixo implementado em `supabase/migrations/20261003000100_digital_channels_foundation.sql`, aplicada **somente no Supabase local** por `npm run db:migrate` (`migration up --local`). Pré-voo: main, HEAD ba8c6c7, working tree limpo; banco local com as duas migrations anteriores, UNIQUE de locations confirmada e digital_channels ausente. Nenhum reset, operação remota ou mudança nas migrations históricas.

São exatamente sete colunas, dois CHECKs, duas FKs, RLS com as três policies descritas e grants por coluna. A FK composta usa MATCH SIMPLE, DELETE RESTRICT, UPDATE NO ACTION e não é deferrable; a FK direta protege organization quando location_id é NULL. O índice não único (organization_id, location_id) foi reavaliado e mantido: não havia equivalente na tabela filha e ele atende as consultas previstas e referências da FK; somente ele e a PK foram criados.

A validação textual de URL exige prefixo literal `https://`, autoridade não vazia e sem `@`, ausência de whitespace/controles literais e comprimento de 1–2048 caracteres. Rejeita em vez de aplicar trim. Não verifica provedor, disponibilidade ou autenticidade e não é parser universal. Nenhuma URL é acessada pelos testes. Todos os canais continuam MANUAL por contrato, sem source persistido.

`public.set_digital_channels_updated_at()` é SECURITY INVOKER, com search_path pg_catalog e EXECUTE direto revogado de PUBLIC/anon/authenticated. O trigger `digital_channels_set_updated_at`, BEFORE UPDATE FOR EACH ROW, usa IS DISTINCT FROM em url/location_id: mudança real recebe statement_timestamp(); no-op mantém a data anterior, inclusive com NULL. INSERT usa now(). API não fornece id/datas nem altera tenant/type; somente ADMIN atualiza location_id/url. O funcionamento real do trigger sem grants de escrita de updated_at/EXECUTE direto foi testado.

Validação concluída localmente:

- pgTAP: **237/237** (90 existentes intactos + **147 novos** em `003_digital_channels.test.sql`), cobrindo catálogo, tipos, defaults, constraints, FKs, índices, grants de tabela/coluna, policies, trigger e operações com roles comuns; fixtures em rollback.
- HTTP/JWT: matriz **A–X passou** em `test-digital-channels-api.mjs`, integrado ao harness existente. N e revogação administrativa são comprovados no harness com comparação do mesmo JWT. Inclui UUID alheio, 0/N unidades, três types institucionais, duplicatas, INSERT/UPDATE cross-tenant negados, correções de unidade/NULL, timestamps/no-op, imutabilidade e fronteiras de URL. Requisições usam sessões reais e chave pública locais.
- Y/regressão: lint sem warnings, TypeScript, **13/13 unitários**, HTTP/RLS e locations existentes, dashboard, administração e unidades administrativas passaram. Build habitual passou após o build local do harness; git diff --check passou.
- A limpeza HTTP remove canais antes de locations e demais fixtures, com conferência de contagens por UUID. Auditoria local final: zero canais, unidades, empresas, memberships, concessões e usuários Auth, como no ambiente vazio inicial. Não foram deixadas fixtures permanentes.

A primeira execução pgTAP encontrou erro de uma fixture: o prefixo da URL tinha 21 caracteres, mas o sufixo fora calculado como se tivesse 20. O teste passou após calcular o sufixo a partir do comprimento real (2048/2049); a migration não mudou. As asserções SQL de mudança de unidade também verificam statement_timestamp() no próprio UPDATE RETURNING. A tentativa inicial dos unitários recebeu spawn EPERM do sandbox; repetição com subprocessos permitidos passou sem alterar código/testes. O acesso ao Docker local exigiu a mesma permissão ambiental.

Nenhum conflito arquitetural novo: a associação editável segue a decisão explícita da 11B.1.1, que substitui a restrição anterior de escopo. Sem UI, integrações, exclusão ou arquivamento. Aplicação remota e administração visual continuam pendentes de autorização própria; 11C não iniciada. Sem commit/push nesta entrega.

Fechamento após interrupção, em 04/10/2026: main e HEAD ba8c6c7 reconfirmados, com os mesmos sete arquivos da etapa e staging vazio. Revisados o diff e os arquivos novos; migrations históricas, src/ e testes anteriores intactos. Auditoria somente leitura no container local reconfirmou histórico, sete colunas, constraints/FKs, índices, RLS/policies, grants por coluna e função/trigger conforme este desenho, além de zero registros nas cinco tabelas públicas e em auth.users. As suítes acima já haviam terminado com sucesso antes da interrupção; não foram reexecutadas nem houve reimplementação. git diff --check e conferência adicional de whitespace/conflitos nos arquivos novos passaram. Nesta retomada, somente este registro documental foi acrescentado; nenhuma operação remota ou commit.

## Registro do desenho aprovado (11B.1 / 11B.1.1)

As seções seguintes preservam o desenho e os critérios aprovados; expressões de implementação futura descrevem aquele checkpoint. O resultado efetivamente executado na 11B.2 está registrado acima.

Data: 03/10/2026. **Decisões técnicas incorporadas na 11B.1.1; schema não implementado.** Pré-voo desta revisão: branch `main`, HEAD `9f215f9` (`docs: define company presence architecture`); somente `?? docs/schema-presenca.md`, sem alterações staged. Somente este documento é atualizado.

## 1. Objetivo e fontes

Especificar o conteúdo mínimo da futura migration 11B.2, suas garantias e testes, sem escrever migration executável ou alterar aplicação/banco. A fonte principal é [perfil-empresa-presenca.md](perfil-empresa-presenca.md), lida integralmente e preservada. Foram consultados [modelo-empresa-unidades.md](modelo-empresa-unidades.md), [arquitetura.md](arquitetura.md), [supabase.md](supabase.md), as duas migrations, os dois testes pgTAP e os scripts HTTP/RLS existentes.

Os documentos anteriores contêm registros históricos; prevalecem as decisões aprovadas da 11A/11A.1 e o schema versionado. Não foi inspecionado nenhum banco em execução, nem executada suíte com fixtures nesta etapa. Os 90 testes pgTAP existentes são a base de regressão, não evidência de validação deste schema ainda inexistente.

A decisão humana final da 11B.1.1 substitui a restrição anterior de associação imutável: ADMIN_ADSCOM poderá corrigir location_id dentro da mesma organization, inclusive de/para NULL. Essa atualização pontual prevalece sobre a descrição anterior de escopo imutável; o documento arquitetural permanece intacto. Organization e type continuam imutáveis pela API normal.

## 2. Premissas herdadas e base existente

- Organization é o tenant; admite 0..N locations. Canal sempre tem organization e pode ter location opcional. NULL representa institucional, não “todas as unidades”.
- Canal tem UUID próprio; URL é atributo mutável. Tipos iniciais: SITE, WHATSAPP e GOOGLE_BUSINESS_PROFILE. Todos admitem escopo institucional ou local e múltiplos registros do mesmo tipo.
- ADMIN_ADSCOM cadastra/corrige/atualiza; CLIENTE só consulta empresas vinculadas; anônimo não acessa. Sem DELETE, arquivamento, integração ou score.
- MANUAL, EXTERNAL e DERIVED são conceitos distintos. O primeiro conjunto de dados é manual e não comprova verificação externa.
- `locations` já possui PK id e UNIQUE `(organization_id, id)`, FK de organization com RESTRICT, RLS e grants de INSERT (organization_id, name)/UPDATE (name).
- `organization_members` tem PK (organization_id, user_id), papel CLIENTE e índice (user_id, organization_id). `user_global_roles` contém somente concessões próprias visíveis por RLS, com papel ADMIN_ADSCOM.
- As migrations atuais usam transação, nomes qualificados, RLS e revogação de privilégios padrão antes dos grants mínimos. Policies consultam memberships/papéis sem ciclo e sem SECURITY DEFINER.

Não alterar organizations, locations, memberships, papéis, migrations ou policies históricas para introduzir canais.

## 3. Entidade recomendada

Recomendar **`public.digital_channels`**. É o nome já proposto na arquitetura e descreve a entidade de negócio, enquanto Presença é a visão que futuramente comporá canais e evidências. O nome não limita o canal a uma página nem a um provedor.

`presence_channels` seria compreensível, mas acopla o nome ao módulo de apresentação. `organization_channels` pode sugerir que só há escopo institucional. Nenhum deles traz benefício que justifique divergir de digital_channels. Não criar segunda tabela local, tabela por plataforma, tabela de tipos ou perfil empresarial neste corte.

## 4. Schema mínimo proposto

Sete colunas físicas, uma tabela de negócio. Desenho aprovado a ser implementado somente mediante autorização da 11B.2:

| Coluna candidata | Entra? | PostgreSQL / nulabilidade / default | Justificativa |
| --- | --- | --- | --- |
| `id` | Sim | uuid, NOT NULL, PK, default gen_random_uuid() | Identidade estável independente da URL; gerada pelo banco |
| `organization_id` | Sim | uuid, NOT NULL, sem default | Tenant explícito, validado por FK; nunca derivado de cookie no banco |
| `location_id` | Sim | uuid, NULL permitido, sem default explícito (omissão resulta em NULL) | Unidade opcional da mesma empresa |
| `type` | Sim | text, NOT NULL, sem default, CHECK de valores fechados | Obriga declaração do tipo, sem tipo implícito |
| `url` | Sim | text, NOT NULL, sem default, CHECKs mínimos descritos abaixo | Representação uniforme dos três canais iniciais |
| `value` | Não | Sem coluna, tipo/default não aplicáveis | Nome genérico esconderia se o conteúdo é número, URL ou ID |
| `label` | Adiar | Se necessário: text opcional, sem default; limite definido com o fluxo | Não é requisito atual. Tipo + URL + contexto permitem distinguir registros; múltiplos canais não exigem label obrigatório |
| `source` | Não neste MVP | Sem coluna/default; contrato MANUAL. Se introduzido futuramente: text NOT NULL com CHECK e backfill controlado | Preserva a recomendação aprovada; não há fontes coexistindo agora |
| `created_at` | Sim | timestamptz, NOT NULL, default now() | Instante de cadastro controlado pelo banco |
| `updated_at` | Sim | timestamptz, NOT NULL, default now(); manutenção por trigger | Registrar última alteração real de location_id ou url, inclusive via PostgREST |

Não criar campos is_verified, is_connected, sync_status, last_sync_at, external_id, metadata, score, health, maturity, review_count, active ou archived_at. Sem integração, evidência, algoritmo ou ciclo de vida, esses campos aparentariam estados não comprovados. Sem created_by neste corte: auditoria de autoria será especificada quando necessária; updated_at não identifica autor nem constitui trilha histórica.

## 5. URL × value e regras de conteúdo

| Alternativa | Avaliação |
| --- | --- |
| `url` para os três tipos | Escolhida: destino web declarado, contrato claro e uma única coluna para o destino |
| `value` polimórfico | Rejeitada: mistura números, URLs e IDs; cada consumidor precisaria interpretar conteúdo ambíguo |
| `url` + telefone + ID externo | Adiada: fontes concorrentes e campos sem consumidor no MVP |
| JSON genérico | Rejeitado: evita a decisão, não resolve validação ou semântica |

SITE recebe URL do site; GOOGLE_BUSINESS_PROFILE recebe URL pública do perfil; WHATSAPP recebe URL de contato, não número isolado. Um formulário futuro poderá converter número em URL de contato validada, mas persistirá somente url. Não gerar URL a partir de número nesta etapa. Não reduzir todo GOOGLE_BUSINESS_PROFILE a um link: seu id continuará sendo o ponto de evolução para integração/perfil externo.

### Contrato mínimo do banco recomendado

Nomear as constraints `digital_channels_type_check` e `digital_channels_url_check` (ou separar o CHECK de tamanho do de formato na implementação mantendo o mesmo contrato). Para url:

- Comprimento de 1 a 2048 caracteres PostgreSQL; fronteira prática aprovada para o MVP, não regra eterna do domínio ou limite universal da Internet.
- Exigir URL começando exatamente por `https://` e autoridade não vazia; rejeitar autoridade contendo `@` (credenciais embutidas).
- Rejeitar whitespace e caracteres de controle literais em qualquer posição, incluindo espaços nas extremidades. A aplicação pode fazer trim antes de enviar; o banco rejeita em vez de normalizar silenciosamente.
- Não aceitar vazio, NULL, número de telefone cru, URL relativa, `http:`, `javascript:` ou `data:`.
- Uma verificação textual de esquema/autoridade é apenas barreira básica, não parser completo nem comprovação de domínio/provedor. Definir expressão equivalente a esses critérios e casos de borda em testes da 11B.2; não criar função de rede ou consulta externa dentro de CHECK.

HTTPS é o contrato dos três tipos iniciais do MVP. Não presumir que todo tipo futuro de Presença terá a mesma representação; sua inclusão exigirá migration explícita e revisão das constraints aplicáveis, sem antecipar campos ou validação universal agora.

### Validação futura na aplicação

Na 11C, usar parser de URL para estrutura, protocolo, hostname e ausência de username/password; aplicar regras de finalidade para WhatsApp e Perfil Google. Não classificar canal como verificado por passar nessas regras. Não fazer requisição ao destino, resolver encurtadores ou sincronizar dados. Não registrar URLs com credenciais/tokens secretos; regex genérica não consegue detectar todo segredo em query string.

Não fixar agora lista supostamente completa de domínios Google/WhatsApp no CHECK. Regras por provedor pertencem à validação do formulário e devem ser confirmadas com formatos reais/documentação antes da 11C. Consequência explícita: um admin usando API direta pode gravar URL HTTPS sintaticamente básica com tipo inadequado; o banco garante integridade estrutural e acesso, não autenticidade do canal. Clientes não podem explorar isso para escrever porque RLS nega escrita. O futuro consumidor deve validar antes de abrir links e nunca tratá-los como conteúdo confiável.

## 6. Representação de type

| Opção | Vantagem | Custo |
| --- | --- | --- |
| PostgreSQL ENUM | Domínio tipado reutilizável | Objeto adicional e evolução/remoção de valores mais acoplada ao PostgreSQL |
| text + CHECK | Padrão já usado nos papéis; integridade simples e alteração explícita por migration | Valores precisam ser mantidos em validações da aplicação e no CHECK |
| Tabela de tipos | Catálogo administrável e atributos próprios | JOIN, seed e governança sem necessidade para três valores fixos |

Escolher **text + CHECK**, aceitando exatamente SITE, WHATSAPP, GOOGLE_BUSINESS_PROFILE, sensível a caixa e sem espaços. Sem default e sem valor OTHER. Novos tipos exigem migration aditiva do conjunto permitido e testes, sem redesenhar entidade. Nenhuma unicidade por type, organization/type, location/type ou URL; duplicatas são permitidas e id distingue os registros.

## 7. Representação de source

| Opção | Consequência | Decisão |
| --- | --- | --- |
| Não armazenar agora | Todos são MANUAL por contrato; UI precisa informar isso | Recomendada, consistente com a arquitetura aprovada |
| source default MANUAL com três valores | Default não impede que API declare EXTERNAL/DERIVED; precisaria grant restrito e fluxo que ainda não existe | Não adotar |
| source fixo com CHECK somente MANUAL | Impede promoção indevida, mas persiste constante sem consumidor diferente | Alternativa possível, sem benefício concreto agora |

No primeiro caso real de integração ou dado derivado, revisitar source em migration própria. Antes de qualquer importação, essa migration deverá classificar registros existentes como MANUAL, pois o único fluxo autorizado até então será manual. A estratégia de backfill deve ser planejada conforme volume; não habilitar importação antes da distinção estar pronta. Origem de um registro não substitui origem de cada observação: um canal manual pode ganhar evidências externas sem apagar sua declaração original. Colunas futuras ou extensões deverão preservar essa diferença. Nenhum payload atual poderá promover o registro para integrado; source nem existe no schema proposto.

## 8. FKs e integridade organization/location

As duas FKs propostas são necessárias:

| Constraint proposta | Relação | Ações |
| --- | --- | --- |
| `digital_channels_organization_id_fkey` | organization_id → public.organizations(id) | ON DELETE RESTRICT; ON UPDATE NO ACTION; NOT DEFERRABLE |
| `digital_channels_organization_location_fkey` | (organization_id, location_id) → public.locations(organization_id, id) | MATCH SIMPLE; ON DELETE RESTRICT; ON UPDATE NO ACTION; NOT DEFERRABLE |

Em MATCH SIMPLE, location_id NULL dispensa a correspondência composta; organization_id continua obrigatório e validado pela FK direta. Com location_id preenchido, o par precisa existir na UNIQUE atual de locations. MATCH FULL rejeitaria o caso institucional de par parcialmente nulo. Não adicionar FK isolada de location_id: a composta já cobre existência e pertencimento. Esse comportamento é definido nas [constraints do PostgreSQL 17](https://www.postgresql.org/docs/17/ddl-constraints.html).

Exemplos: (empresa A, NULL) válido se A existe; (A, unidade A) válido; (A, unidade B) inválido; (empresa inexistente, NULL) inválido. Não criar trigger de consulta para substituir FK, nem confiar apenas em RLS. A FK protege o par inclusive quando a escrita é de admin global ou de operador privilegiado sujeito às constraints.

RESTRICT não apaga canais ao apagar empresa/unidade e não transforma canal local em institucional por SET NULL. UPDATE de chaves dos pais referenciados não deve propagar reatribuição silenciosa. Sem cascata. Isso protege vínculos existentes, não implementa política de retenção ou arquivamento.

## 9. UPDATE, DELETE e timestamps

| Coluna/operação | Comportamento pela API normal |
| --- | --- |
| url | Editável somente com ADMIN confirmado por RLS |
| id / organization_id | Imutáveis |
| location_id | Editável pelo ADMIN: NULL → unidade válida, unidade → NULL ou outra unidade da mesma organization |
| type | Imutável no primeiro corte: não converter uma identidade de canal Google em WhatsApp |
| created_at / updated_at | Não podem ser fornecidos no INSERT/UPDATE; controlados pelo banco |
| source / label / value | Ausentes; não recebem grant nem payload persistido |
| DELETE / TRUNCATE | Sem grant; sem policy DELETE; sem endpoint ou fluxo de exclusão |

Type incorreto não terá correção pelo CRUD inicial. A associação à unidade poderá ser corrigida: por exemplo, mover um Perfil Google da Unidade Águas Claras para a Unidade Taguatinga da mesma empresa, ou corrigir institucional/local de/para NULL. Isso preserva id, organization_id e type; não transfere o canal entre tenants. A FK composta bloqueia unidade de outra empresa tanto no INSERT quanto no UPDATE. Reclassificação de type exigirá decisão futura explícita, sem conceder UPDATE amplo. Não contornar a ausência de exclusão adicionando active/archived_at.

### updated_at consistente

Manter a estratégia aprovada de uma função específica `public.set_digital_channels_updated_at()` retornando trigger, em PL/pgSQL, SECURITY INVOKER, search_path fixo em pg_catalog, sem parâmetros, SQL dinâmico, consultas de autorização ou leitura/escrita de outras tabelas. Um trigger BEFORE UPDATE FOR EACH ROW somente de digital_channels compara NEW.url com OLD.url e NEW.location_id com OLD.location_id usando IS DISTINCT FROM em cada comparação (incluindo transições de/para NULL): se qualquer um mudou, define NEW.updated_at pelo relógio do statement; se não mudou, mantém OLD.updated_at. Retorna NEW. A inserção usa defaults now() para ambas as datas.

Revogar EXECUTE direto da função para PUBLIC/anon/authenticated na mesma migration; não expor RPC nem criar helper de autorização. O trigger é instalado pelo proprietário da migration. Verificar em teste real que UPDATE(location_id, url) autorizado dispara normalmente mesmo sem grant de UPDATE(updated_at) ou EXECUTE direto. A função opera sobre NEW, sem UPDATE adicional ou elevação de privilégio. Triggers BEFORE podem ajustar a linha antes da gravação, conforme a [documentação PostgreSQL](https://www.postgresql.org/docs/17/trigger-definition.html).

Não usar DEFAULT como se atualizasse a data a cada alteração; não depender da Server Action, porque PostgREST é outro caminho de escrita. Não exigir timestamp estritamente crescente como sequência/versionamento: relógio não é contador de alterações. Mudança semântica, e não reenvio do mesmo valor, altera a data. `updated_at` não é última sincronização, evidência externa, controle de concorrência ou histórico.

Esta é a única função/trigger nova prevista. Não criar framework compartilhado de timestamps nem modificar tabelas anteriores. As proteções de coluna descritas valem para o papel da API comum; proprietário/superusuário e credenciais privilegiadas não estão sujeitos às mesmas barreiras e não são caminho de aplicação.

## 10. RLS conceitual

Ativar RLS e criar somente três policies para authenticated, seguindo locations. Não escrever SQL de policies nesta etapa.

| Nome proposto | Operação | Predicado conceitual |
| --- | --- | --- |
| `digital_channels_select_member_or_admin` | SELECT / USING | Concessão ADMIN_ADSCOM própria, ou membership com organization_id igual ao tenant da linha e user_id igual a auth.uid() |
| `digital_channels_insert_admin` | INSERT / WITH CHECK | Concessão ADMIN_ADSCOM própria no banco |
| `digital_channels_update_admin` | UPDATE / USING e WITH CHECK | Concessão ADMIN_ADSCOM própria no banco, tanto para linha existente quanto resultante |

A consulta do papel segue o padrão atual, cuja segurança depende de global_roles_select_own; não ampliar essa policy. Memberships/papéis não consultam canais, mantendo grafo acíclico. Nenhum helper SECURITY DEFINER, papel de user_metadata, cookie ou valor do formulário prova autorização. A FK composta fornece integridade; RLS seleciona usuários/linhas; grants limitam operações/colunas. RLS sozinha com admin global não impede troca de tenant: o grant de coluna restrito é essencial.

CLIENTE com vínculo lê todos os canais institucionais/locais da empresa; não há permissões por unidade. Sem vínculo e sem papel global, leitura retorna zero linhas. Revogações devem ser observadas na próxima requisição/statement com visibilidade da mudança; não prometer cancelar uma transação já em execução. Não depender de renovar JWT para carregar papéis novos. Nenhuma policy para anon ou DELETE.

## 11. Grants mínimos propostos

Revogar privilégios padrão de PUBLIC, anon e authenticated **somente na tabela nova**. Depois conceder a authenticated:

- SELECT na tabela, pois todos os campos propostos são destinados à leitura autorizada e INSERT/UPDATE com retorno também precisam ler resultado.
- INSERT somente em organization_id, location_id, type e url.
- UPDATE somente em location_id e url.

Sem DELETE, TRUNCATE, REFERENCES, TRIGGER ou grant de escrita em id/datas. Sem grants amplos de INSERT/UPDATE na tabela e sem WITH GRANT OPTION. Não alterar default privileges globais nem privilégios de outros objetos. A função de timestamp tem tratamento restrito descrito acima.

GRANT autoriza a operação ao papel PostgreSQL authenticated, compartilhado por clientes e admins; RLS decide quais identidades podem atuar em quais linhas. Um não substitui o outro. Privilégios de tabela podem ampliar os de coluna; os testes devem verificar ambos, conforme a semântica de [GRANT do PostgreSQL](https://www.postgresql.org/docs/17/sql-grant.html). Não usar service_role para tornar administração possível.

## 12. Índices mínimos

1. `digital_channels_pkey`: B-tree único implícito da PK id, para identidade e busca pontual.
2. `digital_channels_organization_location_idx`: B-tree não único em (organization_id, location_id), para lista da empresa, recorte local/institucional e inspeção dos vínculos da FK composta.

Índice mantido após reavaliação: consultas previstas listam canais por empresa e por unidade ou escopo institucional; o mesmo par permite localizar referências ao verificar a FK. A PK id desta tabela e a UNIQUE (organization_id, id) da tabela pai não indexam esses filtros na tabela filha. Corrigir location_id atualizará o índice, custo justificado por essas consultas e verificações, sem exigir índice adicional.

Não duplicar índice isolado em organization_id: é prefixo do segundo. Não criar índice de type isolado por antecipação; há só três valores e consultas de cliente devem começar pelo tenant. Filtrar type dentro do conjunto da empresa basta inicialmente; avaliar (organization_id, type) somente com volume/plano de execução que justifique. Não criar índice de URL, datas, label, JSON ou índice parcial por tipo.

PK/UNIQUE geram seus índices, mas FK não cria automaticamente índice do lado que referencia. O alvo composto já existe em locations; a FK nova o reutiliza. [Referência PostgreSQL](https://www.postgresql.org/docs/17/ddl-constraints.html).

Adiar UNIQUE(organization_id, id) em digital_channels: id já é globalmente único e nenhum filho a referencia agora. Quando reviews/NFC realmente exigirem FK composta para canal, acrescentar esse par único em migration própria. Não confundir essa UNIQUE de identidade futura com unicidade proibida por tipo. O índice de consulta recomendado agora não é UNIQUE.

## 13. Matriz de operações

| Operação | CLIENTE | ADMIN_ADSCOM | ANÔNIMO |
| --- | --- | --- | --- |
| SELECT | Somente empresas vinculadas, institucional e local | Global, sem membership artificial | Negado |
| INSERT | Negado por RLS | Somente colunas permitidas e dados válidos | Negado por grants |
| UPDATE | Zero linhas elegíveis para location_id/url; colunas imutáveis negadas por grants | Somente location_id e url; datas pelo trigger | Negado |
| DELETE | Negado por grants | Negado por grants | Negado |

Uma operação bloqueada por RLS pode resultar em zero linhas, não erro. Isso não significa alteração autorizada: testar estado persistido e quantidade retornada. Falta de grant e violação de constraint devem ser distinguidas. Na futura interface, “sucesso” exige confirmação de linha afetada. Cada action também deverá validar sessão/admin e contexto, sem confiar apenas em grants/RLS ou no layout.

## 14. Matriz de integridade e resultados esperados

P = pgTAP; H = HTTP/PostgREST. Todos são testes futuros, não executados nesta etapa.

| Caso | Cenário | Resultado esperado | Camada |
| --- | --- | --- | --- |
| A | CLIENTE A consulta canais de A | Apenas canais institucionais/locais de A | P/H — RLS |
| B | A consulta B, inclusive UUID conhecido | Zero linhas, sem dados de B | P/H — RLS |
| C | CLIENTE insere em sua empresa ou alheia | Negado por RLS | P/H — RLS |
| D | CLIENTE altera url | Zero linhas atualizadas; valor/data preservados | P/H — RLS |
| E | CLIENTE altera location_id, inclusive de/para NULL | Zero linhas atualizadas; associação/data preservadas | P/H — RLS |
| F | CLIENTE remove canal | Negado por grant; registro permanece | P/H — grants |
| G | ADMIN sem membership consulta A/B | Acesso aos dois tenants | P/H — RLS |
| H | ADMIN cria institucional em empresa sem unidades | Sucesso, id/datas gerados | P/H — defaults/RLS |
| I | ADMIN cria local com par correto | Sucesso | P/H — FK/RLS |
| J | ADMIN insere ou atualiza canal A com location B | FK composta recusa (23503); estado anterior preservado no UPDATE | P/H — constraints |
| K | location_id omitido ou NULL explícito, nos três types | Institucional válido; organization continua obrigatória | P/H — constraints |
| L | Repetir type e URL na mesma empresa/unidade | Registros distintos aceitos, sem UNIQUE artificial | P/H — constraints |
| M | Anônimo SELECT/INSERT/UPDATE/DELETE | Negado por grants | P/H — grants |
| N | Revogar membership e repetir consulta | Canais deixam de aparecer, com o mesmo JWT no HTTP | P/H — RLS |
| O | ADMIN edita somente url | Sucesso; id/tenant/location/type/created_at preservados | P/H — grants/RLS |
| P | ADMIN corrige unidade A1 para A2 da mesma organization | Sucesso; id/tenant/type/created_at preservados | P/H — FK/grants/RLS |
| Q | ADMIN muda NULL para location válida da mesma empresa | Sucesso; identidade/tenant/type/created_at preservados | P/H — FK/grants/RLS |
| R | ADMIN muda location válida para NULL | Sucesso, canal passa a institucional; identidade/tenant/type/created_at preservados | P/H — FK/grants/RLS |
| S | ADMIN altera organization_id pela API normal | Negado por grant mesmo se tenant de destino existe | P/H — grants |
| T | ADMIN altera type pela API normal | Negado por grant mesmo se type de destino é válido | P/H — grants |
| U | UPDATE permitido muda url, location_id ou ambos | updated_at atualizado pelo banco; cobrir A1→A2, NULL→A1 e A1→NULL | P/H — trigger |
| V | ADMIN tenta alterar created_at | Negado por grant; preservado também em cada UPDATE permitido | P/H — grants/trigger |
| W | URL sem HTTPS, relativa ou com esquema inseguro | Rejeitada pelo CHECK | P/H — constraints |
| X | URL com 2049 caracteres; controle válido de 2048 | Acima do limite rejeitado; fronteira válida aceita | P/H — constraints |
| Y | Suíte existente completa e novos testes | Todos passam sem reduzir cobertura anterior | Regressão local futura |

Casos complementares obrigatórios:

- Empresa NULL/ausente/inexistente e location inexistente: NOT NULL (23502) ou FK (23503), inclusive location inexistente no UPDATE.
- Type NULL, vazio, caixa errada ou desconhecido: NOT NULL ou CHECK (23514).
- URL nula/vazia, whitespace/controle ou credenciais na autoridade: NOT NULL ou CHECK.
- ADMIN não fornece id/created_at/updated_at no INSERT, nem altera id/updated_at diretamente; grants negam. Misturar coluna protegida com permitida deve rejeitar a operação inteira.
- UPDATE reenvia url e location_id idênticos, inclusive NULL: updated_at preservado; alteração de apenas um deles basta para atualizar a data.
- Revogar ADMIN e manter a sessão/JWT: SELECT sem vínculo fica vazio, INSERT negado e UPDATE de location_id/url afeta zero linhas.
- Usuário multiempresa ou sem vínculo: união das empresas vinculadas ou zero canais.
- Operador proprietário local tenta excluir organization/location referenciada: RESTRICT recusa. Tenta gravar par entre tenants sem RLS: FK recusa. Esses testes pgTAP alcançam constraints independentemente das barreiras da API.

Também verificar DELETE/TRUNCATE de admin negados, grants amplos de escrita na tabela ausentes, SELECT concedido, RLS habilitada, exatamente as três policies, função sem SECURITY DEFINER, trigger específico, índices não duplicados e inexistência dos campos adiados. Testes não devem interpretar restrições privilegiadas como garantia contra superusuário.

## 15. Estratégia de testes da 11B.2

### Schema, grants e RLS com pgTAP

Adicionar arquivo SQL próprio, sem reduzir os arquivos 001/002 e suas 90 asserções. Usar begin/rollback e no_plan/finish conforme o padrão. Conferir catálogo: colunas/tipos/null/defaults, PK, FKs e ações, CHECKs, índices, relrowsecurity, policies, privilégios de tabela/coluna e configuração da função/trigger. SET LOCAL ROLE authenticated/anon com request.jwt.claims para provar acesso; fixtures como proprietário só para preparação, integridade privilegiada e limpeza.

Fixtures: empresas A/B com ao menos duas unidades cada e uma terceira empresa sem unidade, canais locais/institucionais e duplicados por tipo; identidades A, B, multi, sem vínculo e admin sem membership. Testar CHECKs com entradas negativas e fronteiras 2048/2049. Para updated_at, não depender de sleep ou de now() avançar dentro da mesma transação: preparar valor antigo controlado na fixture e comparar resultados de mudanças de url, location_id e ambos, incluindo transições NULL, e reenvio idêntico. Separar asserções de catálogo/schema/grants, autorização RLS e integridade por constraints. Testar chamada/execução direta da função restrita e atualização via trigger com sessão normal.

### HTTP/PostgREST com JWT real

Estender o harness `scripts/test-rls-api.mjs` por módulo específico de canais, seguindo `test-locations-api.mjs`. Manter API fixa 127.0.0.1:54321, Docker local e contêiner do projeto, sem ler .env.local ou aceitar URL remota. Requisições usam chave pública e JWTs emitidos pelo Auth local, nunca service_role. Não imprimir senhas, tokens ou respostas que possam contê-los.

Provar pela API defaults/serialização, NULL institucional, FK composta no INSERT e UPDATE, correções A1→A2/NULL→A1/A1→NULL, visibilidade A/B, tentativas reais de escrita e campos protegidos, updated_at e revogações sem renovar JWT. Capturar JWT antes/depois da revogação sem exibi-lo; se mudar, o teste não prova o cenário pretendido. Diferenciar erro de grant, CHECK/FK e UPDATE filtrado com zero linhas. Consultar o registro por sessão autorizada para confirmar que tentativas negadas não mudaram dados.

Limpeza em finally: canais da execução primeiro, depois locations, memberships/organizations e usuários, conforme dependências. Incluir essa ordem no harness porque a FK RESTRICT impedirá a limpeza antiga se houver canais. Usar IDs de fixtures e contagens posteriores; falha de limpeza deve falhar a suíte. Não aplicar esses testes ao remoto. Nenhuma fixture é criada neste desenho documental.

### Regressão e limites da prova

Na 11B.2 executar scripts existentes: lint, typecheck, npm test, test:db, test:rls:api, test:dashboard, build e git diff --check. test:dashboard já inclui administração/locations; não rodar em paralelo com dev/build. Regenerar build habitual depois do harness. Preservar os 13 unitários atuais e 90 pgTAP; novos testes somam cobertura, não substituem.

HTTP não substitui catálogo/constraints; pgTAP com claims simuladas não substitui JWT real. Não há interface nova na 11B.2, portanto não declarar Presença funcional ou revisão visual concluída. Testes de formulários/páginas pertencem às etapas 11C/12.

## 16. Compatibilidade com avaliações e NFC

Um futuro recurso de avaliações/perfil externo poderá referenciar o id estável do canal GOOGLE_BUSINESS_PROFILE, com tenant obrigatório. Adicionar UNIQUE(organization_id, id) no canal quando surgir esse filho e FK composta nele, evitando referências entre empresas. Como location_id do canal é corrigível, distinguir associação atual de atribuição histórica. Se materializar location no filho, definir snapshot ou versão de associação no módulo futuro; uma correção do canal não deverá reatribuir fatos históricos silenciosamente. Leituras de contexto atual podem derivar a location atual do canal. Não implementar histórico nesta fundação. Não adicionar review_count, payload externo ou FK de reviews no MVP. URL não será chave de deduplicação nem identidade de integração.

Um futuro destino NFC poderá referenciar um canal, uma URL independente ou outro destino definido pelo módulo NFC. Não criar destination_type, tabela universal de destinos ou colunas NFC em digital_channels. Alterar URL ou location_id do canal não deve reescrever eventos anteriores nem mudar silenciosamente destino configurado do dispositivo: a etapa NFC definirá versão/snapshot e ação explícita. Canal institucional não exige unidade e dispositivo local continuará validando o par empresa/unidade.

Ausência de DELETE no MVP protege contra perda acidental pela aplicação, mas não é sistema de histórico. Dados futuros de relatórios precisarão de fatos/atribuições preservados independentemente da disponibilidade atual do recurso. Isso será projetado com o primeiro módulo histórico, sem event sourcing antecipado.

## 17. Conteúdo previsto da migration 11B.2

Somente após aprovação e em nova migration com timestamp próprio, sem editar as duas existentes:

1. Abrir transação e criar public.digital_channels com sete colunas, PK, CHECKs e duas FKs definidos neste desenho.
2. Criar apenas o índice não único organization/location adicional à PK.
3. Criar função específica de timestamp SECURITY INVOKER com search_path fixo e trigger BEFORE UPDATE; restringir EXECUTE direto.
4. Ativar RLS; revogar privilégios padrão apenas da nova tabela; conceder SELECT, INSERT nas quatro colunas de entrada e UPDATE(location_id, url).
5. Criar as três policies conceituais propostas, sem alterar concessões/policies existentes.
6. Encerrar transação. Sem seed, backfill, canais automáticos, permissões Auth, extensão nova ou fixtures de produção.

Falhar se já houver objeto conflitante em vez de ocultar divergência com criação condicional. Nenhuma tabela atual precisa mudar. Aplicar e testar primeiro localmente pelo fluxo CLI do projeto, sem reset automático. Aplicação remota é etapa posterior explicitamente autorizada, com confirmação de destino, histórico, dry-run, revisão e auditoria; a 11B.2 local não implica autorização remota.

## 18. Riscos e pontos de revisão antes da migration

As decisões técnicas estão fechadas na 11B.1.1 e não são reabertas:

- digital_channels, sete colunas, type text + CHECK com os três tipos iniciais, url sem value e sem source persistido; todos os registros MANUAL por contrato.
- HTTPS para o conjunto inicial e limite prático de 2048 caracteres. Tipos futuros e fontes externas/derivadas exigirão revisão em migration própria.
- id, organization_id, type e created_at imutáveis pela API normal; location_id e url editáveis somente pelo ADMIN. Correção de unidade, inclusive de/para NULL, não transfere tenant.
- updated_at automático por função/trigger específico; sem escrita manual da data, DELETE, arquivamento ou integrações.

Não foi identificado conflito técnico com o schema versionado. A mudança em relação à imutabilidade anterior de location_id é uma decisão humana explícita, incorporada neste documento, não uma alteração silenciosa da arquitetura. Nenhuma decisão de negócio indispensável permanece aberta para o desenho mínimo. A expressão exata dos CHECKs e o SQL do trigger serão revisados e testados na 11B.2, sem mudar este contrato; nada foi implementado ou validado em banco nesta revisão.

Pontos futuros que não bloqueiam migration: formatos/domínios específicos aceitos pelos formulários de provedores (antes da 11C), rótulos se a UX exigir, retirada/reclassificação de canais, concorrência de edição e proveniência quando houver integrações. CHECK básico não garante URL legítima nem ausência de segredo; manter esse limite visível. Sem fonte externa agora, registrar source constante não resolve esses riscos.

Grants não são imutabilidade absoluta contra o proprietário; RLS não torna um canal “verificado”; timestamps não preservam versões; e nenhum teste deve afirmar essas garantias. Evitar índices redundantes e novas abstrações sem consultas concretas.

## 19. Recomendação final e validação documental

Uma tabela digital_channels com id, organization_id, location_id, type, url, created_at e updated_at; type text + CHECK; sem value/label/source; FK composta MATCH SIMPLE mais FK direta de organization; duas estruturas de índice no total; três policies e grants por coluna; somente location_id e url editáveis pelo admin e timestamp mantido pelo banco. Manter o restante fora deste corte.

Revisão desta etapa é documental. Conferir integralmente este arquivo, git status e git diff --check, incluindo whitespace do arquivo ainda não rastreado. Não executar banco, migrations, scripts de fixtures, implementação ou commit. A única diferença permitida no Git é `docs/schema-presenca.md`. O documento arquitetural aprovado permanece intacto. Parar para revisão antes da 11B.2.
