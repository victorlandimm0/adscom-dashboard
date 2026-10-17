# ADSCOM NFC — documentação funcional inicial

Etapa 12A.1 · 08/10/2026 · Documento para revisão humana, sem implementação.

Atualização documental da Etapa 12A.2, em 08/10/2026: conceito aprovado pelo usuário e separação entre rascunho privado e versão publicada formalizada abaixo. A [arquitetura técnica](nfc-arquitetura.md) recebeu as aprovações delimitadas na 12A.2.7; nenhuma implementação foi autorizada.

Consolidação da Etapa 12A.2.7, em 14/10/2026: estratégia de produtos, Opção A e Q1–Q4 preservados; Q4.1 substitui a regra Google da 12A.2.5, permitindo ocultar sem remover, mantendo a contagem e o topo quando visível. P1–P8 dos [contratos técnicos](nfc-contratos-tecnicos.md#13-matriz-final-de-decisões) estão APROVADOS nos limites expressos: P3 como abordagem com comprovação técnica pendente e P4 como abordagem com viabilidade de infraestrutura pendente. Detalhes físicos e operacionais seguem sujeitos a desenho e validação. Nenhuma permissão foi alterada no sistema.

Base: branch `main`, checkpoint `1b757d67667891719ffc59408ee8feb89a9561f9`. A Etapa 11D confirmou as quatro migrations no remoto; o contexto aprovado informa também sua aplicação local. Esta etapa não consulta bancos nem reexecuta testes funcionais. NFC, menus e eventos descritos aqui ainda não estão implementados.

Classificação usada: **APROVADO** identifica decisão expressa do usuário; **PENDENTE** identifica detalhe que exige decisão; **PENDENTE DE COMPROVAÇÃO** identifica abordagem aprovada cuja segurança ou viabilidade não foi demonstrada; **RECOMENDAÇÃO** identifica possibilidade técnica não aprovada; **NÃO AUTORIZADO** identifica implementação/operação fora desta etapa. A edição autorizada limita-se aos três documentos NFC; não autoriza schema, migrations, acesso ao Supabase, alterações de código, staging/commit/push/deploy ou início da 12A.3.2.2.

**Histórico:** a 12A.3.1.1 consolidou oito decisões conceituais após a análise 12A.3.1; a análise de contratos físicos 12A.3.2.1 também foi concluída, sem implementação.

**Consolidação vigente — Etapa 12A.3.2.1.1, 15/10/2026:** incorpora as decisões físicas e funcionais expressas do usuário, preservando Q1–Q4.2 e P1–P8. Somente os três documentos NFC são atualizados. P3/P4 continuam PENDENTES DE COMPROVAÇÃO; Storage privado está aprovado conceitualmente, com viabilidade operacional pendente. Não há tabelas NFC, código ou garantias de execução criados por este texto. A Etapa 12A.3.2.2 não é iniciada.

## 1. Visão do produto

**APROVADO:** o ADSCOM NFC é o primeiro produto e a porta de entrada para o ecossistema ADSCOM. Combina placas físicas NFC/QR, URLs permanentes, redirecionamento direto e Menu Digital Inteligente completo. A compra inclui todas as funcionalidades inicialmente disponibilizadas e todas as funcionalidades futuras desse menu, sem cobrança adicional por novos recursos.

A placa mantém seu endereço ADSCOM enquanto o destino configurado pode mudar. NFC e QR Code usam a mesma infraestrutura. “Inteligente” descreve o menu configurável; não implica IA, personalização automática ou ADSCOM Agent.

Preservar uma aplicação Next.js/TypeScript/Tailwind e um banco Supabase PostgreSQL, com Supabase Auth e isolamento por organização. Sem microsserviços, ORM, motor genérico de permissões ou dependência exclusiva da Vercel. A hospedagem Node.js planejada continua sujeita à validação operacional existente.

**Princípio aprovado do ecossistema:** uma empresa poderá usar novos produtos ADSCOM sem recriar organização ou identidade. Supabase Auth, `organizations`, `organization_members`, `locations`, autorização e isolamento multiempresa formam a fundação compartilhada. Produtos permanecem módulos separados; identidade compartilhada não concede acesso automático a dados/operações de outro produto. Não antecipar estruturas genéricas de produtos, assinaturas, licenças ou marketplace.

Fontes: [AGENTS.md](../AGENTS.md), [arquitetura](arquitetura.md), [plano do MVP](plano-mvp.md), [empresa e unidades](modelo-empresa-unidades.md), [perfil e presença](perfil-empresa-presenca.md), [schema de presença](schema-presenca.md), [administração](administracao.md), [autenticação](autenticacao.md), [dashboard](dashboard.md), [Supabase](supabase.md) e [README](../README.md).

Diferenças em relação aos registros anteriores, preservados sem edição:

- O plano e partes da arquitetura registram etapas antigas, migration única e NFC adiado. A autorização atual prioriza a documentação do NFC, sem iniciar sua implementação.
- Perfil/presença previa a Etapa 12 como consulta de canais, excluindo NFC. O pedido atual redefine a prioridade para documentação funcional do NFC; não declara aquela tela implementada.
- Perfil/schema ainda registram a migration social como pendente no remoto. Esse estado foi superado pela aplicação auditada da Etapa 11D nesta conversa.
- CLIENTE hoje lê canais, mas não os edita. A autonomia NFC é requisito futuro e precisa de autorização específica no servidor e banco, sem ampliar silenciosamente o CRUD de Presença.
- O schema vigente permite ao administrador corrigir unidade/URL do canal, apesar da antiga proposta de escopo imutável. NFC deverá preservar o histórico e exigir publicação explícita de mudanças de destino.
- A validação HTTPS atual de canais, sem lista de domínios e sem consulta externa, não comprova legitimidade para um redirecionador público. Sua política de proteção precisa ser definida antes da exposição pública.

## 2. Público e necessidades atendidas

Empresas com zero, uma ou várias unidades precisam oferecer acesso simples aos seus canais, atualizar destinos sem substituir a placa e compreender quais interações ocorreram. Uma empresa digital pode utilizar placas institucionais sem unidade fictícia.

O proprietário é aqui o usuário autorizado a administrar o produto para uma organização; o termo não cria um papel de banco nem comprova propriedade jurídica. O consumidor acessa conteúdo publicado sem receber acesso ao dashboard ou aos dados privados. Na primeira versão, ADMIN_ADSCOM cadastra as placas físicas no sistema, vincula-as às empresas e unidades aplicáveis e realiza a ativação inicial. A logística de entrega continua pendente. Na V1, a Opção A aprovada concede a mesma autonomia digital a todos os CLIENTEs com vínculo válido na organização, sem distinção adicional entre proprietários e colaboradores.

## 3. Jornada do proprietário

1. Autenticar-se e selecionar uma empresa à qual tenha acesso; a preferência de navegação não autoriza operações.
2. Visualizar somente placas, menus e indicadores autorizados dessa organização.
3. Selecionar uma placa vinculada à empresa e, quando aplicável, à unidade correta.
4. Em uma placa ativa, escolher redirecionamento direto ou Menu Inteligente e preparar conteúdo/destino permitido.
5. Revisar uma prévia antes de publicar, incluindo o efeito sobre outras placas que compartilhem o menu.
6. Publicar mediante validação de sessão, permissão, organização e referências; somente uma publicação confirmada deve ser apresentada como sucesso.
7. Atualizar links, alternar modo ou gerenciar vínculos entre suas placas e menus, mantendo a URL da placa.
8. Consultar indicadores com período, escopo e limitações claros.

**Decisão aprovada na Etapa 12A.2:** o cliente autorizado edita um rascunho privado. A versão publicada permanece disponível com seu conteúdo anterior durante a edição. A prévia é autenticada, não publica o rascunho e não registra interações públicas.

A publicação exige ação explícita do cliente e valida identidade, organização, autorização e conteúdo. Uma tentativa malsucedida não pode substituir parcialmente a versão anterior. A interface deve informar que publicar mudanças em um menu compartilhado poderá afetar várias placas e mostrar esse alcance. O sistema só apresenta sucesso quando a nova versão estiver efetivamente publicada.

**P1/P2 APROVADOS:** um rascunho privado editável por menu, publicações completas imutáveis, referência atual e publicação atômica em transação PostgreSQL. Falha obrigatória desfaz a publicação inteira; preservar o histórico necessário, sem restauração automática na V1. Revisão monotônica do conjunto editável, detecção de concorrência, bloqueios curtos quando necessários, revisão conferida antes de publicar e identificação das tentativas protegem contra sobrescrita e repetição por falhas de rede. O impacto compartilhado exige confirmação. Detalhes físicos, coordenação e testes continuam pendentes.

**Menu compartilhado — APROVADO:** a confirmação inclui TODAS as placas atualmente associadas, mesmo PREPARED, INACTIVE ou bloqueadas, mostrando sua disponibilidade atual. Lista e marcador monotônico dos vínculos devem ser consistentes; mudança de associação exige reconfirmação. Associar/desassociar incrementa o marcador do menu; mover entre menus atualiza ambos, atomicamente com a revisão da configuração da placa. Menus continuam compartilháveis entre unidades da mesma organização. A associação vigente pode derivar da configuração atual; não exigir tabela duplicada de vínculo. Locks e comprovação concorrente continuam pendentes.

## 4. Jornada do consumidor

1. Aproximar o celular da placa NFC ou escanear o QR Code, abrindo o endereço com os recursos do aparelho.
2. Acessar a URL pública ADSCOM.
3. O sistema identificar a placa pelo código público, sem inferir identidade pessoal.
4. Verificar disponibilidade e configuração publicada.
5. Resolver o modo de funcionamento.
6. Registrar a interação mínima conforme regras aprovadas de privacidade e segurança.
7. Encaminhar ao destino permitido ou apresentar o Menu Inteligente; botões HTTPS seguem P6, e Telefone usa somente o contrato tel: construído no servidor. Nenhum clique comprova resultado no serviço ou aparelho de destino.

Código inexistente, placa desativada ou configuração indisponível deve resultar em mensagem neutra, sem revelar dados internos. Falha de resolução não pode inventar destino. Conforme a direção arquitetural existente, falha isolada no registro de interação não deve impedir acesso a um destino já resolvido e validado; indicadores poderão apresentar perda de eventos.

O acesso não prova aproximação física: a URL pode ser compartilhada, copiada ou aberta por bots. NFC e QR com o mesmo endereço não permitem distinguir automaticamente a origem do acesso.

**Cliques públicos — APROVADO:** referências do navegador são não confiáveis. O servidor valida placa, disponibilidade, bloqueios, configuração, menu, publicação, botão e destino. Contexto antigo é recusado com possibilidade de atualizar o menu: nunca seguir destino removido, substituir silenciosamente pelo novo ou atribuir o clique à publicação errada. Assinatura criptográfica adicional do contexto NÃO é obrigatória na V1; poderá ser reavaliada pelo modelo de ameaças. Interface, representação técnica, rate limiting e testes de abuso/replay continuam pendentes.

## 5. Modos de funcionamento

| Modo aprovado | Comportamento | Configuração necessária |
| --- | --- | --- |
| A — Redirecionamento direto | A URL permanente encaminha ao destino publicado | URL HTTPS permitida e placa disponível |
| B — Menu Digital Inteligente | A URL permanente apresenta página hospedada pela ADSCOM | Menu publicado e autorizado da mesma organização |

Destinos possíveis: avaliações no Google, WhatsApp, Instagram, site, agendamentos, cardápios e outros destinos legítimos que atendam à política P6 aprovada e seus parâmetros técnicos ainda pendentes. A lista não aprova qualquer URL desses serviços nem exige criar tipos novos em `digital_channels`.

Alternar modo não altera a identidade da placa. Não usar endereço enviado por parâmetro público como destino arbitrário. Domínio, formato da rota e comportamento HTTP final continuam pendentes; o redirecionamento temporário sem cache permanente da arquitetura é uma recomendação a validar, para evitar que o navegador fixe um destino antigo.

## 6. Menu Digital Inteligente

**Q4 — APROVADO na Etapa 12A.2.5:** funcionalidades e identidade visual do Menu Digital Inteligente V1. A aprovação é funcional; não implementa editor, upload, armazenamento ou mecanismos de segurança. A descrição textual fornecida pelo usuário orienta esta consolidação. As imagens da conversa de planejamento não foram inspecionadas nesta etapa nem presumidas como arquivos do repositório. A referência visual não autoriza copiar software, marca ou código de terceiros.

### Identidade visual padronizada

O mesmo layout atende todas as organizações, com prioridade para dispositivos móveis:

- Logotipo circular centralizado, nome comercial centralizado e descrição curta abaixo do nome.
- Botões verticais com cantos arredondados, ícone à esquerda, título e indicador de navegação à direita.
- Rodapé obrigatório com `Powered by ADSCOM`.

O CLIENTE pode personalizar somente logotipo, nome comercial, descrição, conteúdo dos botões e a escolha entre tema **CLARO** e **ESCURO**. O design é mantido pela ADSCOM. Não permitir paletas individuais, fontes personalizadas, alteração livre do formato dos botões, layouts alternativos ou remoção da identificação ADSCOM. Valores exatos de cores e fontes não são definidos aqui.

**Q4.2 — APROVADO, detalhado na 12A.3.2.1.1:** campos estruturados de nome comercial, descrição opcional, referência opcional de logo e tema CLARO/ESCURO; botões relacionados com tipo, título, destino específico do tipo, ícone ADSCOM, posição, visibilidade e origem opcional em canal da mesma organização. Não usar JSON livre como substituto da integridade relacional. Um rascunho mutável por menu, com campos principais em `nfc_menus` e botões em `nfc_menu_draft_buttons`; snapshots em `nfc_menu_publications` e `nfc_menu_publication_buttons`. Esses nomes descrevem estruturas futuras, não tabelas existentes. Nome de exibição não renomeia `organizations.name`.

### Botões, limite e avaliação Google

Cada menu permite **no máximo 10 botões/links configurados**, contando ocultos e Google. **APROVADO:** posições inteiras de 1 a 10, únicas por menu/publicação, sem obrigação de preencher todos os números; reordenação atômica e 11º botão impedido também pelo banco sob concorrência. Google oculto ocupa vaga; quando visível exige posição 1, e reexibi-lo pode reorganizar os demais atomicamente. Não há faixa paga para ampliar o limite.

O CLIENTE autorizado pode adicionar até o limite, editar título e destino conforme o tipo, reordenar botões comuns, mostrar/ocultar botões conforme Q4.1, remover botões, selecionar canais existentes da própria organização e criar links personalizados HTTPS conforme as regras de segurança. Todos seguem o padrão visual oficial.

### Catálogo fechado de oito tipos da V1

**APROVADO:** exatamente oito tipos, com representação estruturada, ícones padronizados ADSCOM e validação própria. Esta decisão substitui a lista anterior de exemplos; Canal direto com a gerência e Salvar contato não são tipos adicionais da V1. Os oito tipos do menu não são o catálogo de `digital_channels`.

| Tipo | Entrada e comportamento aprovados | Limites da V1 |
| --- | --- | --- |
| Avaliar no Google | Link oficial de avaliação; validar HTTPS, domínio e formato reconhecido. Opcional e ocultável; posição 1 quando visível | Busca genérica não é avaliação; sem Google Business Profile API; clique não comprova avaliação |
| WhatsApp | Número internacional validado/normalizado e mensagem opcional de até 500 caracteres Unicode; acentos, emojis e quebras de linha aceitos; gerar `https://wa.me/` com query codificada | Excesso recusado sem truncar; contagem exata a especificar; sem envio automático ou WhatsApp Cloud API |
| Instagram | Username com ou sem @, validado; gerar URL oficial HTTPS do perfil | Sem URL arbitrária, Reels ou posts nesse tipo; outros links legítimos usam Site / Link personalizado; sem API/login obrigatório |
| Site / Link personalizado | Título configurável e HTTPS público legítimo, com caminhos/parâmetros legítimos, sem lista fechada de plataformas | Rejeitar esquemas perigosos, locais/internos e inválidos; sem fetch arbitrário |
| Localização | Somente links oficiais HTTPS de Google Maps, Waze ou Apple Maps, com provedor e padrão validados | Domínio arbitrário não é localização validada; sem mapas próprios ou integração paga por padrão |
| Telefone | País e número ou E.164 completo; armazenar E.164 com até 15 dígitos; construir `tel:` somente no servidor | Rejeitar comandos, extensões e códigos de serviço; clique não comprova ligação |
| Agendamento | Título configurável e HTTPS externo legítimo | Sem agendamento nativo nem confirmação de reserva |
| Cardápio | Título configurável e HTTPS externo legítimo; pode abrir outro Menu Digital Inteligente ADSCOM publicado | Nunca acessar rascunho ou contornar disponibilidade/bloqueios; sem pedidos/pagamentos próprios |

Todos os tipos HTTPS seguem segurança, bloqueio organizacional e resolução pública. **PENDENTE:** hostnames e padrões concretos, links internacionais, limites de nomes/descrições e testes de compatibilidade. Nenhum hostname adicional foi aprovado por inferência.

**Q4.1 APROVADA na 12A.2.7 — Avaliar no Google:** é opcional; o CLIENTE autorizado pode configurar, remover, ocultar temporariamente sem remoção e reexibir. Mesmo oculto, conta como uma das 10 vagas e não aparece nem expõe seu conteúdo na página pública. Quando visível, ocupa obrigatoriamente a primeira posição e não pode ser reordenado para outra. Ao reexibir e publicar, retorna automaticamente ao topo. Toda alteração de visibilidade só afeta a página pública após publicação explícita; a versão pública anterior permanece durante a edição. Esta decisão substitui expressamente a regra da 12A.2.5 que exigia remoção para deixar de exibir o Google.

Seu destino deve ser um link de avaliação validado conforme a política de segurança; não converter automaticamente um link genérico de perfil Google. O clique é uma interação observada, não comprovação de avaliação publicada. Limite, contagem, posição e validações devem valer também para operações diretas de API, não somente na interface.

### Editor, prévia e publicação

- **Identidade:** exibir e editar logotipo, nome comercial e descrição, com seleção de tema CLARO ou ESCURO.
- **Botões:** listar, adicionar, editar, ordenar os comuns, mostrar/ocultar e remover; mostrar contador de todos os configurados, máximo de 10, incluindo Google oculto. Google visível sempre primeiro, sem reordenação; reexibição publicada o devolve ao topo.
- **Prévia:** representar o menu em formato de dispositivo móvel e refletir o rascunho privado; não expor rascunho ao público nem produzir eventos públicos de acesso/clique. Informar que as alterações só chegam aos consumidores após publicação.
- **Publicação:** exigir ação explícita, validar o conjunto completo, preservar a versão pública anterior durante edição/falha, informar antes da confirmação o alcance sobre as placas que compartilham o menu e impedir publicação parcial.

Espaços com ícones de adição não são botões públicos vazios. A biblioteca de ícones é controlada pela ADSCOM, sem upload individual; sua seleção concreta permanece pendente.

**Compartilhamento APROVADO:** cada menu pertence a uma organização e pode atender placas de diferentes unidades dela. **Q2 — exclusividade por utilização:** se somente uma unidade usa o menu hoje, ele pode ser compartilhado com outras unidades da mesma organização amanhã, sem recriação e sem exclusividade permanente no banco. Não há compartilhamento entre organizações nem troca automática de conteúdo/destino pela unidade da placa. Publicação afeta as novas resoluções de todas as placas vinculadas; a prévia informa o alcance antes da confirmação.

A edição do nome comercial não renomeia silenciosamente `organizations.name`. A organização continua referência institucional; a persistência principal do rascunho em `nfc_menus` está aprovada, com parâmetros físicos finais ainda pendentes.

**Q1 APROVADO:** menus podem incluir canais locais de diferentes unidades da mesma organização, selecionados explicitamente e identificados por unidade de origem na edição e na prévia. Não há herança automática nem permissão adicional de escrita no inventário de canais.

Selecionar canal não comprova titularidade ou integração. **APROVADO:** CLIENTE continua sem editar `digital_channels`; um marcador monotônico será acrescentado futuramente por migration incremental autorizada. Mudanças de URL/unidade, inclusive posteriormente revertidas, invalidam confirmação antiga; incorporar exige revisão e publicação explícitas. Conteúdo já publicado e eventos históricos não mudam silenciosamente. A migration histórica permanece intacta.

**Conteúdo mínimo publicável — APROVADO:** nome comercial não vazio e pelo menos um botão visível, válido e funcional; todos os configurados respeitam seus contratos e nenhum destino visível pode estar bloqueado. Logo e descrição são opcionais; sem logo, usar identidade neutra e padronizada ADSCOM. Publicação explícita, completa e atômica. Ocultos não são enviados ao navegador. Conteúdo público anterior permanece durante edição/falha, sujeito aos bloqueios atuais. Acessibilidade de teclado, contraste e alvos de toque continua RECOMENDAÇÃO de implementação.

O Menu Inteligente NFC não é software avançado de restaurante. Catálogo de produtos, pedidos e pagamentos pertencem a outro produto; não são incluídos automaticamente no menu NFC. Não há editor livre de HTML/scripts. Logo é a única imagem personalizável inicialmente.

### Logotipo e identidade visual

**APROVADO CONCEITUALMENTE, PENDENTE DE VIABILIDADE OPERACIONAL:** Supabase Storage privado, upload por usuário autenticado atualmente vinculado à organização, isolamento por tenant, validação/processamento antes do uso e entrega pública controlada, sem listagem genérica de arquivos privados. Cada logo aprovado recebe referência imutável; não substituir bytes publicados no mesmo endereço. Publicações históricas mantêm a imagem correspondente e assets referenciados não podem ser eliminados indevidamente.

**Limites V1 APROVADOS:** PNG, JPEG e WebP; máximo de 5 MB; entrada até 4096 × 4096 px; exibição processada dentro de 512 × 512 px, proporcional e sem corte/distorção automática; transparência preservada quando aplicável. SVG e GIF animado não aceitos. Verificar conteúdo real, rejeitar malformados, limitar recursos e remover metadados desnecessários. Não há upload de ícones personalizados.

A configuração do Storage, pipeline, cache e entrega ainda exigem comprovação. O requisito expresso de vínculo para upload não concede exceção automática a ADMIN sem membership; eventual exceção altera a fronteira de autorização e exige decisão própria. Nada é configurado nesta etapa.

## 7. Estratégia comercial e ecossistema

**APROVADO na 12A.2.4:** a compra da placa inclui o Menu Digital Inteligente completo, com todas as funcionalidades disponibilizadas inicialmente e todas as funcionalidades futuras desse menu. Não existe Menu Premium, assinatura mensal do menu, cobrança adicional por novos recursos ou bloqueio de funcionalidades do menu conforme plano de assinatura.

**Registro histórico:** esta decisão substitui o modelo anterior de “essencial + Premium opcional” das etapas documentais anteriores. Esse modelo foi superado e não é alternativa comercial vigente.

| Produto | Finalidade e fronteira | Situação comercial aprovada |
| --- | --- | --- |
| ADSCOM NFC | Placa física NFC/QR, redirecionamento direto e Menu Digital Inteligente completo; entrada no ecossistema e aquisição de clientes | Menu completo incluído na compra da placa, incluindo recursos futuros do próprio menu |
| ADSCOM Agent | Atendimento inteligente e automação, incluindo WhatsApp; produto independente do NFC | Único produto atualmente previsto com mensalidade recorrente; sem exigir compra de NFC |
| Softwares especializados por segmento | Produtos independentes para necessidades setoriais; exemplos conceituais de restaurante e clínica | Em planejamento; modelo de cobrança não definido |

O exemplo de software para restaurantes pode envolver fotos, vídeos, descrições, preços, pedidos e pagamentos. O software de clínicas também é conceitual. Nenhum deles é uma funcionalidade automaticamente incluída no Menu Inteligente NFC. Não modelar ou implementar esses produtos nesta etapa.

A inclusão de recursos futuros do menu não define cronograma, conteúdo de cada entrega ou funcionamento ilimitado. Preço da placa, condições de venda e suporte continuam sem valores definidos. O máximo de 10 configurados está aprovado em Q4; os oito tipos, o mínimo publicável e os limites de logo também estão aprovados. Permanecem pendentes os parâmetros residuais indicados na seção 16 e a comprovação operacional do Storage privado. Esses parâmetros não autorizam criar faixas pagas ou cobrança por funcionalidades do menu.

Não criar tabelas, flags, planos, elegibilidade ou mecanismos de cobrança para o menu. Disponibilidade operacional e bloqueio de segurança seguem Q3; não são restrições por assinatura. A mensalidade do Agent não condiciona o uso do NFC.

## 8. Autonomia e permissões

**Aprovado na Etapa 12A.2.1:** ADMIN_ADSCOM é responsável pelo cadastro das placas físicas no sistema, vínculo às empresas e unidades aplicáveis e ativação inicial. Também administra configurações digitais conforme sua autorização global, revalidada no banco.

**APROVADA na 12A.2.3 — Opção A:** todos os usuários com papel CLIENTE e vínculo válido com uma organização administram seus recursos digitais NFC. Não há permissão NFC adicional por usuário na V1. Podem visualizar placas vinculadas, alterar o modo digital de uma placa ativa, configurar destinos HTTPS permitidos, criar/editar menus, visualizar rascunhos e prévias autenticadas, publicar versões revisadas, associar menus existentes às placas da organização e consultar seus indicadores NFC. Não podem cadastrar placas físicas, alterar UUID/código público, transferir tenant ou alterar o vínculo físico da placa com sua unidade.

| Ator | Fronteira funcional |
| --- | --- |
| Consumidor anônimo | Resolver placa disponível e ler apenas conteúdo intencionalmente publicado; sem administração ou relatórios privados |
| Usuário autenticado sem acesso à empresa | Sem leitura privada ou edição de recursos dessa empresa |
| CLIENTE autorizado | Gestão digital de sua organização: modos, destinos, menus, rascunhos, prévias, publicação, vínculo menu/placa e indicadores; sem cadastro físico, alteração de identidade ou transferência de tenant |
| ADMIN_ADSCOM | Cadastro físico no sistema, vínculo empresa/unidade, ativação inicial e gestão digital conforme autorização global; sempre validar o contexto e as relações |

CLIENTE continua sendo o papel existente no banco, assim como ADMIN_ADSCOM. Não criar OWNER, GERENTE, COLABORADOR ou um novo sistema de permissões nesta etapa. Não há hierarquia entre proprietários e colaboradores na V1: vale o vínculo CLIENTE atual, não apenas possuir uma conta autenticada. **Q3 APROVADO:** ADMIN_ADSCOM e CLIENTE vinculado podem solicitar desativação operacional; somente ADMIN_ADSCOM reativa placas após verificação e aplica/remove bloqueios de segurança. **Q3.1 APROVADA:** a solicitação não desativa imediatamente; ADMIN_ADSCOM analisa e aprova ou recusa, e somente após aprovação administrativa a desativação se torna efetiva. Estados e fluxo foram detalhados na 12A.3.2.1.1; representação final, notificações, concorrência e implementação continuam pendentes. A documentação não implementa permissões NFC nem concede escrita adicional em `digital_channels`.

Servidor e banco devem verificar autorização em cada operação, incluindo prévia, publicação e indicadores. Revogação do vínculo deve impedir novas operações privadas mesmo com JWT ainda válido; verificar o vínculo atual no banco, não somente cookie ou payload. IDs, código público, cookie de empresa, campos do formulário e metadados editáveis do usuário não provam permissão. Não usar credencial privilegiada para contornar as restrições da administração normal.

## 9. Placas e unidades

| Conceito aprovado | Responsabilidade |
| --- | --- |
| Identificador interno | Identidade estável do registro; independente do endereço de destino e do UID físico do chip |
| Código público | Aleatório, único, não sequencial e difícil de adivinhar; identifica a placa, não autentica o visitante |
| Organização | Obrigatória, proprietária do recurso e fronteira de isolamento |
| Unidade | Opcional, sempre da mesma organização; ausência significa institucional, não “todas as unidades” |
| URL permanente ADSCOM | Endereço gravado no NFC e utilizado pelo QR; preservado nas mudanças comuns de modo/destino |
| Configuração | Modo, destino direto ou menu associado, sujeitos a validação e publicação |
| Disponibilidade | Distingue desativação operacional e bloqueio de segurança; não depende de assinatura de menu |

Uma placa de finalidade local deve identificar sua unidade real, inclusive em empresa com unidade única. Várias placas podem compartilhar um menu, mas nenhuma associação pode cruzar organizações. Não usar UID do chip como chave principal nem como prova de posse: cópia do link ou da placa não confere autorização administrativa.

Relações futuras entre placa, unidade, menu, canal e evento devem preservar `organization_id` e integridade no banco, com relações compostas quando aplicáveis. Não há DDL neste documento. Não presumir transferência de placas entre empresas. Q1 permite seleção explícita de canais locais de diferentes unidades da organização, identificados pela origem. Q2 define exclusividade somente pelo uso atual: compartilhar depois não exige recriar menu; não deve existir exclusividade permanente de unidade no banco. O vínculo físico placa/unidade não é alterado por associar um menu.

ADMIN_ADSCOM realiza o vínculo da placa à organização e à unidade aplicável; CLIENTE autorizado vincula menus a placas já pertencentes à sua organização. Essas são operações diferentes. O papel global não autoriza combinações empresa/unidade inconsistentes nem torna transferência de tenant parte do cadastro comum.

**P7 e formato do código — APROVADO na 12A.3.1.1:** UUID interno separado do código público, gerado a partir de **16 bytes criptograficamente aleatórios (128 bits)**, em **Base64URL sem padding, exatamente 22 caracteres**, alfabeto `A-Z`, `a-z`, `0-9`, `_`, `-`, sensível a maiúsculas e minúsculas. Código globalmente único com unicidade imposta pelo banco, independente do UID físico do chip e permanente após emissão. Rejeitar malformados, gerar novamente em colisão, não reutilizar códigos já emitidos e não reduzir entropia por truncamento inadequado. Conhecer o código não autoriza administração. NFC e QR usam a mesma URL permanente; mudanças digitais não exigem regravação. **PENDENTE:** domínio, formato definitivo da rota, DNS/TLS, implementação da geração, gravação física e conferência operacional; nenhum domínio ou caminho foi escolhido.

**Configuração e unidade — APROVADO:** revisões digitais imutáveis e referência explícita à atual; eventos preservam a configuração utilizada. Unidade atual permanece na identidade administrativa da placa e configurações históricas preservam a unidade observada durante sua vigência. Eventual transferência futura dentro da mesma organização será exclusiva de ADMIN e criará nova revisão mesmo sem mudar menu/destino. Não há transferência entre organizações nem implementação desse fluxo nesta etapa. Campos, constraints, coordenação transacional e retenção física ainda exigem desenho/prova.

## 10. Eventos e indicadores

| Evento conceitual | O que a ADSCOM pode observar | O que não comprova |
| --- | --- | --- |
| Acesso à URL da placa | Requisição recebida para o endereço público | Pessoa única, leitura física NFC ou QR |
| Abertura do Menu Inteligente | Atendimento da página ou sinal de exibição, conforme definição técnica futura | Leitura humana completa ou interesse comercial |
| Clique em botão | Acionamento observado de um botão publicado | Contato efetivo, venda ou conclusão no destino |
| Redirecionamento externo | Encaminhamento emitido/observado pela ADSCOM | Carregamento bem-sucedido ou ação concluída no serviço externo |

Um acesso pode gerar vários eventos; não somá-los como visitantes únicos. Recarregamentos, prévias, bots, prefetch e falhas de instrumentação afetam contagens. O ponto exato de registro, deduplicação e classificação de tráfego são pendentes; relatórios devem explicar o que foi medido.

**P8 APROVADO:** registro mínimo de requisições às placas, aberturas de menus e cliques, com referências históricas às placas, menus, botões e publicações pertinentes. Indicadores isolados por organização, com filtros por período, organização, unidade, placa, menu e botão quando o modelo permitir. Fuso, agrupamentos e atualização ainda serão detalhados; não há divisão de funcionalidades por plano. Eventos institucionais aparecem como institucionais, sem atribuição fictícia a uma unidade.

Preservar a atribuição histórica: mudar destino, menu ou unidade não pode reclassificar silenciosamente eventos anteriores. P1/P5/P8 e a decisão 6 da 12A.3.1.1 aprovam referências às publicações e revisões imutáveis da configuração da placa efetivamente utilizadas. A representação física e eventuais dados históricos complementares permanecem pendentes, sem antecipar event sourcing.

P8 proíbe perfis individuais e coleta de nome, telefone, localização precisa ou identificadores persistentes de visitantes para esses indicadores. Exige tratamento compatível com a LGPD e definição de retenção, descarte e transparência antes de ativar coleta real; esta aprovação não comprova conformidade implementada. Falhas no registro de métricas não devem interromper menu ou redirecionamento.

**Retenção — APROVADO como referências V1 de produto, sujeito à validação legal/técnica:** eventos brutos de acesso e clique por 90 dias; indicadores agregados por 24 meses; logs técnicos por 30 dias; tentativas idempotentes por 7 dias; publicações/configurações históricas enquanto necessárias à integridade/auditoria; identidade mínima de códigos emitidos permanente, observadas obrigações legais. Configuração vigente permanece enquanto necessária. Rotinas de descarte, agregação quando aplicável, backups, transparência e requisitos da LGPD ainda precisam de validação. Não descartar referências exigidas por eventos retidos. Aberturas/encaminhamentos eventualmente instrumentados precisam de enquadramento explícito na categoria; não inventar prazo adicional. **NÃO AUTORIZADO:** coleta real nesta etapa.

Separar interações observadas pela ADSCOM de avaliações e resultados fornecidos por serviços externos. Abrir um link de avaliação Google não prova avaliação publicada. Importar ou relacionar avaliações exige integração autorizada e validação técnica próprias; não há essa promessa no produto inicial.

## 11. Ciclo de vida

| Estado/operação conceitual | Resultado esperado e limites |
| --- | --- |
| Cadastro | ADMIN_ADSCOM cadastra a placa física no sistema e a vincula à organização; detalhes do procedimento permanecem pendentes |
| Preparação | Vínculo à unidade aplicável realizado por ADMIN_ADSCOM; gravação/conferência física de NFC/QR e logística ainda precisam de procedimento |
| Ativação inicial | Somente ADMIN, PREPARED → ACTIVE, com todas as precondições verificadas na transação; sem criação automática de conteúdo |
| Alteração de modo/destino | Prévia, validação e publicação explícitas; preservação da URL e do histórico |
| Solicitar desativação operacional | ADMIN_ADSCOM ou CLIENTE com vínculo atual podem solicitar; a solicitação não autoriza transição direta |
| Efetivar desativação operacional | Q3.1: ADMIN_ADSCOM analisa e aprova ou recusa; somente após aprovação administrativa interrompe atendimento público, preservando identidade, organização e histórico. CLIENTE não efetiva diretamente |
| Reativação | Somente ADMIN, INACTIVE → ACTIVE, sem bloqueio e com configuração utilizável; bloqueada deve ser recusada |
| Aplicar/remover bloqueio de segurança | Somente ADMIN_ADSCOM; decisão distinta da desativação operacional, sem apagar identidade, organização ou histórico |

**Q3.2 — APROVADO, detalhado na 12A.3.2.1.1:** estados `PREPARED` (cadastrada, não ativada), `ACTIVE` (ativa) e `INACTIVE` (desativada). Bloqueio é independente; não criar estado operacional BLOCKED. Uma ACTIVE pode ser bloqueada posteriormente, sem virar INACTIVE silenciosamente.

Ativação e reativação são exclusivas de ADMIN: organização válida, código permanente, configuração vigente coerente/utilizável e ausência de bloqueio da placa, revalidados na transação. Direto exige HTTPS válido não bloqueado; menu exige mesma organização e publicação vigente utilizável. Não criar menu/configuração automaticamente nem registrar outra ativação de placa já ativa. Indisponibilidade posterior não muda o estado operacional. **Precisão sobre o histórico:** a independência aprovada permanece, mas reativar uma placa bloqueada agora deve ser recusado; desbloquear não reativa.

Um único pedido pendente por placa. CLIENTE vinculado pode solicitar sem efeito imediato; ADMIN aprova ou rejeita. Aprovação e passagem para INACTIVE são atômicas; rejeição não altera estado. Após rejeição, novo pedido é permitido enquanto ativa. Decisão com estado/revisão obsoleto é recusada. Preservar autoria, decisão, motivo, resultado e contexto. Nomes das situações do pedido, locks, auditoria e notificações ainda precisam de detalhamento; não criar máquina genérica de estados.

**Identidade permanente — APROVADO:** na V1, placas emitidas não são excluídas fisicamente pelas operações comuns; UUID/código permanecem protegidos. Exclusão futura exigirá registro mínimo sobrevivente de códigos emitidos e análise de privacidade. Isso não significa reter ilimitadamente eventos ou dados pessoais. Substituição física completa continua futura, sem reutilizar códigos.

## 12. Segurança e privacidade

Princípios obrigatórios herdados e aprovados:

- Toda informação privada pertence ao tenant correto; autenticação, autorização e integridade são verificadas no servidor e banco. Tabelas futuras acessíveis pela API exigirão RLS e grants mínimos junto à implementação.
- Leitura pública é uma superfície específica, limitada ao conteúdo publicado. Não liberar anon para listar organizações, placas privadas ou eventos, nem aceitar INSERT anônimo irrestrito. O servidor deve resolver a organização a partir da placa, não confiar em IDs enviados pelo visitante.
- Código público não é segredo nem permissão. Mesmo difícil de adivinhar, pode ser compartilhado; não incluir credenciais ou informações privadas na URL ADSCOM.
- Validar destinos HTTPS no servidor para modo direto e botões HTTPS; Telefone usa exclusivamente E.164 convertido em tel: no servidor. Rejeitar esquemas arbitrários, credenciais embutidas e destino livre do payload. HTTPS sozinho não prova legitimidade.
- **P6 APROVADO:** links personalizados/externos HTTPS legítimos sem lista fechada de plataformas; tipos Google, Instagram e Localização seguem seus provedores/contratos específicos, e WhatsApp gera seu link oficial. Rejeitar internos/locais/malformados, bloquear por destino organizacional, prevenir ciclos conhecidos e validar navegação legítima ADSCOM. Sem HTTP arbitrário ou promessa de detectar toda fraude.
- **P8 APROVADO:** minimizar eventos, sem perfis individuais ou coleta de nome, telefone, localização precisa e identificadores persistentes para indicadores. IP, user-agent completo e impressão digital não integram o conjunto mínimo. Dados efêmeros estritamente necessários a controles de abuso exigem finalidade e expiração próprias; não usar NFC para identificar quem visitou.
- Não registrar tokens, senhas, URLs com segredos ou dados pessoais desnecessários em logs. Separar logs operacionais de eventos do produto e estabelecer retenção para ambos antes da coleta.
- Publicar somente campos intencionalmente aprovados para divulgação. Rascunhos, prévias, relatórios e dados administrativos permanecem privados; impedir cache compartilhado de informações privadas.
- Tratar títulos, descrições, imagens e URLs como entrada não confiável. **Recomendação:** conteúdo textual sem HTML/scripts arbitrários e tratamento seguro de imagens; mecanismos serão definidos no desenho técnico.
- Preservar histórico conforme finalidade e referências V1 aprovadas, sem retenção ilimitada de dados pessoais/eventos. Validação legal/técnica, descarte, backups e transparência continuam pendentes antes de instrumentação pública.

**Segurança de destinos — APROVADO:** ADMIN aplica/remove bloqueio de placa ou destino específico com histórico. Na V1, destino bloqueado vale em TODAS as ocorrências correspondentes da organização; bloqueio global entre organizações fica fora da V1. Não reescrever snapshots. Normalização HTTPS conservadora: somente equivalências comprovadas, como caixa do hostname e porta HTTPS padrão; preservar diferenças significativas de caminhos/parâmetros, sem equiparar domínio inteiro. Rejeitar malformadas/ambíguas/locais/internas; mesmo contrato ao cadastrar, publicar, bloquear e encaminhar, sem buscar recursos externos para inferir equivalência.

**Ciclos — APROVADO:** impedir redirecionamento direto da placa para si e ciclos conhecidos de duas ou mais placas ADSCOM, na configuração e novamente na resolução, considerando concorrência/invalidação. Navegação legítima por botão para outro menu publicado é permitida, sem acesso a rascunhos ou bypass de disponibilidade/bloqueios; não é proibição geral de links internos. Sem crawling de sites externos. Reconhecimento de URLs internas, representação e provas concorrentes continuam pendentes.

Riscos ainda abertos: URL maliciosa apesar de HTTPS, cópia de placas/QR, alteração simultânea de menu compartilhado, atribuição histórica incorreta e contagens infladas por tráfego automatizado. Cada um exige critérios e testes no incremento correspondente. A dívida ambiental de privilégios privilegiados registrada na administração não é corrigida aqui e deve ser considerada antes de qualquer operação pública privilegiada.

## 13. Escopo funcional inicial

Esta entrega contém exclusivamente documentação. O núcleo funcional a detalhar em etapas autorizadas inclui identidade/vínculo/disponibilidade da placa, endereço permanente para NFC/QR, os dois modos, conteúdo funcional e visual aprovado em Q4 para o menu completo, prévia/publicação, autonomia autorizada e eventos mínimos com indicadores de significado explícito.

Q4/Q4.1/Q4.2 preservam layout, personalização, dez configurados, Google ocultável na posição 1 quando visível, rascunho e publicação. A 12A.3.2.1.1 fecha catálogo/protocolos funcionais, mínimo publicável e limites de logo, sem comprovar os mecanismos físicos ou a viabilidade do upload. Antes de implementar, comprovar P3/P4 e fechar desenho físico das decisões Q3.2/Q4.2 e das revisões/alcance aprovados, parâmetros de segurança e retenção e recorte pequeno autorizado com critérios verificáveis. Não criar tabelas vazias para funcionalidades futuras.

Não estão implementados ou autorizados aqui: schema NFC, endpoints públicos, editor, uploads, instrumentação, relatórios, testes com fixtures ou mudanças de banco. Preservar integralmente a fundação existente e as permissões atuais.

## 14. Funcionalidades futuras

Evoluções do próprio Menu Inteligente estarão incluídas na compra da placa quando disponibilizadas, sem cobrança adicional por novos recursos. Relatórios avançados, substituição de placas, fluxos de ciclo de vida e integrações dependem de definição e escopo próprios. ADSCOM Agent e softwares especializados para restaurantes, clínicas e outros segmentos são produtos independentes, não ampliações automáticas do menu; não criar seus modelos ou tabelas aqui. Pagamentos, OAuth, sincronização, CRM e automações permanecem fora desta etapa.

## 15. Decisões aprovadas

1. NFC é o produto prioritário; esta etapa é somente documental.
2. Uma aplicação e um banco; organização permanece tenant, com zero ou várias unidades reais.
3. Placas NFC e QR usam URLs permanentes ADSCOM e destinos configuráveis.
4. Existem dois modos: redirecionamento direto e Menu Digital Inteligente hospedado pela ADSCOM.
5. Q4: layout móvel padronizado com logotipo circular e nome centralizados, descrição, botões verticais arredondados com ícone/título/indicador e rodapé obrigatório `Powered by ADSCOM`. CLIENTE personaliza somente logo, nome comercial, descrição, conteúdo dos botões e tema CLARO ou ESCURO; sem paletas/fontes próprias, formatos livres ou layouts alternativos.
6. Autonomia do usuário autorizado dentro de sua organização, incluindo prévia e gestão de vínculos entre placas e menus.
7. Compra da placa inclui Menu Digital Inteligente completo e todas as funcionalidades iniciais e futuras desse menu, sem mensalidade, cobrança por novos recursos ou bloqueio por plano.
8. Placa tem identidade interna, código público aleatório único, organização obrigatória e unidade opcional. UID físico não é identidade principal.
9. Cada menu pertence a uma organização e pode ser compartilhado entre suas unidades. Q1 aprova canais locais de diferentes unidades, explicitamente selecionados e identificados. Q2 define exclusividade por utilização, sem restrição permanente nem recriação ao compartilhar.
10. Interações não equivalem a pessoas, contatos, vendas ou avaliações; dados externos exigem origem e integração próprias.
11. Histórico e isolamento devem ser preservados. Não presumir exclusão física na V1.
12. Rascunho privado separado da publicação; prévia autenticada sem publicação ou eventos públicos; publicação explícita, validada e sem substituição parcial, com alcance informado para menus compartilhados e sucesso somente após confirmação efetiva.
13. Na primeira versão, ADMIN_ADSCOM cadastra as placas físicas no sistema, vincula empresa/unidade e realiza ativação inicial, além de administrar configurações digitais sob autorização global.
14. Opção A: todo CLIENTE com vínculo válido tem autonomia digital NFC na organização, sem permissão adicional por usuário; inclui modo de placa ativa, destinos permitidos, menus, rascunhos, publicação, associação de menus e indicadores. Não cadastra placas físicas, altera UUID/código, transfere tenant ou altera vínculo físico de unidade. Revogação bloqueia novas operações privadas mesmo com JWT válido.

15. Q3/Q3.1: ADMIN_ADSCOM e CLIENTE vinculado podem solicitar desativação operacional; ADMIN analisa e aprova ou recusa, com efeito somente após aprovação administrativa. Só ADMIN reativa após verificação e aplica/remove bloqueios de segurança. Identidade, organização e histórico são preservados; desenho físico das transições continua pendente.
16. Agent é independente do NFC e o único produto atualmente previsto com mensalidade; softwares de segmento são independentes, estão em planejamento e não têm modelo de cobrança definido.

17. Q4/Q4.1: máximo de 10 configurados incluindo ocultos e Google. Google opcional e ocultável sem remoção; quando visível, sempre primeiro e sem reordenação. Reexibição retorna ao topo após publicação, sem liberar vaga ao ocultar. Destino validado; clique não comprova avaliação. Regras no servidor e na API direta; prévia privada e ausência de botões vazios públicos.

18. P1–P8 aprovados no escopo da 12A.2.7: publicação imutável/atômica; concorrência/idempotência; publicação restrita; resolução pública mínima; integridade multiempresa; segurança dos links; identidade permanente; indicadores/histórico/privacidade. P3 exige comprovação técnica e SECURITY DEFINER somente se necessário e seguro; P4 exige prova de viabilidade da infraestrutura. Nenhuma aprovação equivale a implementação ou início da 12A.3.2.2.

### Oito decisões consolidadas na 12A.3.1.1

A matriz preserva as oito decisões de origem e incorpora os complementos expressamente aprovados na 12A.3.2.1.1. As comparações históricas permanecem como registro, não como alternativas reabertas.

Registro preservado, com detalhamentos e pendências atualizados pela 12A.3.2.1.1; regras funcionais completas nas seções anteriores.

| Decisão | Classificação e alcance aprovado | Detalhamento ainda PENDENTE |
| --- | --- | --- |
| 1 — Q3.2 | APROVADO: PREPARED/ACTIVE/INACTIVE, bloqueio independente, pedido único pendente, decisão ADMIN e ativação/reativação condicionadas | Representação física final, concorrência, auditoria, notificações e testes |
| 2 — Q4.2 | APROVADO: rascunho em nfc_menus, botões relacionados, posições 1–10, mínimo publicável e catálogo fechado de oito tipos; ícones ADSCOM | Campos/constraints finais, padrões por provedor, biblioteca concreta e comprovação do pipeline de logo |
| 3 — Cliques antigos | APROVADO: Opção C com validação integral no servidor; assinatura adicional não obrigatória na V1 | Representação do contexto, interface, controles de abuso/replay e testes |
| 4 — Retenção | APROVADO: por categoria; referências V1 de 90 dias, 24 meses, 30 dias e 7 dias conforme finalidade | Validação legal/técnica, descarte/agregação, backups e transparência; coleta não autorizada |
| 5 — Bloqueios direcionados | APROVADO: placa ou destino específico, alcance organizacional na V1, normalização conservadora e histórico ADMIN | Representação da identidade canônica, consulta/revogação, concorrência e testes; global fora da V1 |
| 6 — Configuração da placa | APROVADO: revisões imutáveis, referência atual, unidade histórica e nova revisão em eventual transferência administrativa no tenant | Campos, constraints, transação, retenção física e execução futura da transferência |
| 7 — Alcance do menu | APROVADO: todas as placas associadas, lista/marcador consistentes, associação/configuração atômicas e reconfirmação após mudança | Representação, locks, concorrência e testes; sem tabela duplicada de vínculo atual |
| 8 — Código público | APROVADO: 16 bytes/128 bits, Base64URL sem padding, 22 caracteres, sensível a caixa, unicidade global no banco e nenhuma reutilização de emitidos | Domínio/rota, DNS/TLS e operação de geração/gravação/conferência |

P3/P4 e a efetividade das garantias acima permanecem **PENDENTES DE COMPROVAÇÃO**. Aprovar o contrato não comprova autorização, isolamento, concorrência ou segurança operacional. Implementação, acesso a bancos e início da 12A.3.2.2 são **NÃO AUTORIZADOS** nesta etapa.

## 16. Decisões pendentes

| Categoria | Questões a resolver antes do incremento correspondente |
| --- | --- |
| Comercial | Preço da placa, condições de venda e suporte; nenhum valor definido. O menu completo está incluído sem cobrança por recursos; a cobrança de softwares especializados não está definida e não pertence ao schema NFC |
| Autorização | Estados PREPARED/ACTIVE/INACTIVE, precondições de ativação/reativação e pedido único aprovados; faltam situações físicas do pedido, auditoria, concorrência e notificações. Upload exige vínculo atual; exceção ADMIN sem membership não foi concedida |
| Publicação | P1/P2 aprovados; faltam representação física, coordenação detalhada das revisões/locks/tentativas e prova de atomicidade/concorrência. P3 aprovado como abordagem, com necessidade de elevação e segurança ainda por demonstrar; sem restauração automática na V1 |
| Conteúdo | Oito tipos, posições 1–10, mínimo publicável, logo/descrição opcionais e limites de logo aprovados. Pendentes limites de textos, padrões oficiais, biblioteca concreta, contagem Unicode e comprovação do pipeline/Storage/entrega |
| Canais | Revisão monotônica futura aprovada, inclusive para invalidar alteração revertida; faltam representação/testes e migration incremental autorizada. CLIENTE continua sem editar canais |
| Placas | Identidade sem exclusão física comum na V1; futura exclusão exige registro sobrevivente. Transferência futura de unidade somente ADMIN no tenant, com nova revisão. Pendentes execução física, domínio/rota, emissão/conferência e substituição |
| Segurança pública | P4 aprovado como abordagem: validar Supabase/PostgreSQL, Next.js e hospedagem, conexões, autenticação de banco, pooler, TLS, isolamento e privilégios; identidade dedicada/funções privadas a avaliar. P6 aprovado: detalhar DNS/IDN/portas/encurtadores, abuso, denúncia e bloqueio; propor alternativas seguras à revisão humana se houver inviabilidade |
| Privacidade | Referências V1 de retenção aprovadas: 90 dias acesso/clique, 24 meses agregados, 30 dias logs, 7 dias tentativas; validar legal/técnica, descarte, backups e transparência. Identidade mínima permanente sob obrigações legais; sem coleta real |
| Indicadores | Opção C aprovada sem assinatura adicional obrigatória na V1; faltam contexto técnico, controle de abuso, elegibilidade/enquadramento dos eventos, fuso, apresentação histórica e compatibilidade |
| Continuidade | Disponibilidade operacional, recuperação e suporte; menu independente de assinatura do Agent; sem elegibilidade comercial de funcionalidades do menu |

Recomendações técnicas deste documento não são decisões comerciais nem autorização para executar SQL. Não é necessário resolver todas as pendências para revisar este texto; cada pendência relevante deverá estar fechada antes de implementar o fluxo afetado.

A seção 13 da [arquitetura NFC](nfc-arquitetura.md) classifica as pendências por momento: representação física, autorização, concorrência e histórico exigem desenho/verificação antes do schema correspondente; detalhes operacionais devem estar fechados antes do componente ou exposição pública. P1/P2 já aprovam publicações imutáveis, referência atual, transação atômica, revisão monotônica e tratamento de repetições. P3/P4 continuam pendentes de comprovação/viabilidade, sem aprovação implícita de grants, funções ou conexões físicas. Não presumir histórico complexo nem restauração automática.

**RECOMENDAÇÃO de sequência para a futura 12A.3.2.2:** (1) fechar contratos físicos antes do schema; (2) obter comprovações técnicas de P3/P4 em escopo autorizado; (3) resolver detalhes antes do componente correspondente, antecipando os que afetem invariantes; (4) explicitar itens fora da V1. A [proposta de prioridades](nfc-contratos-tecnicos.md#proposta-de-prioridades-para-a-futura-12a322--não-iniciada) discrimina entregas e critérios. Nenhuma dessas operações é iniciada aqui.

## 17. Critérios de aceite da documentação

- [x] Apresenta os dois modos, jornadas, menu, ciclo de vida e estratégia de produtos sem inventar preços ou limites.
- [x] Distingue estado atual, decisões aprovadas, recomendações e pendências.
- [x] Preserva organização como tenant, unidade opcional real, papéis existentes e autorização no servidor/banco.
- [x] Explicita o conflito entre autonomia NFC futura e escrita atual de canais exclusiva do administrador.
- [x] Separa leitura pública de administração; código público e UID físico não autenticam consumidores.
- [x] Distingue eventos observados de pessoas/resultados externos e registra riscos de privacidade, abuso e histórico.
- [x] Registra divergências históricas sem modificar documentos anteriores.
- [x] Não contém implementação, DDL, preços, integração presumida ou garantias de segurança já testada para NFC.
- [x] Aprovação conceitual da Etapa 12A.1 informada pelo usuário no pedido da 12A.2; separação rascunho/publicação aprovada nesse pedido.
- [x] Opção A e Q1–Q3.1 preservados; Q4/Q4.1 aprovam layout, temas e limite de 10 incluindo Google oculto, primeiro somente quando visível, com publicação explícita. P1–P8 aprovados nos limites expressos, P3/P4 ainda pendentes de comprovação.
- [ ] Revisão humana da consolidação 12A.3.2.1.1; P3/P4 e Storage continuam pendentes de comprovação; implementação e início da 12A.3.2.2 NÃO AUTORIZADOS.

Verificação da consolidação 12A.3.2.1.1: conferir alterações somente nos três documentos NFC, incluindo `docs/nfc-contratos-tecnicos.md`, executar `git diff --check` e verificar whitespace/conflitos também nos três arquivos não rastreados. Testes da aplicação e banco não são necessários para esta alteração documental e não comprovam funcionalidades NFC ainda inexistentes. Não executar SQL, acessar Supabase, adicionar ao staging, criar commit/push/tag ou iniciar a Etapa 12A.3.2.2. A entrega aguarda revisão humana.
