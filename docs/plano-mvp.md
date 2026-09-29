# Plano do MVP — incrementos verificáveis

## Etapa 01 — arquitetura (concluída)

Inspeção do repositório, proposta de arquitetura, modelo mínimo, regras para agentes e roteiro. Aceite: documentação distingue claramente decisões propostas, funcionalidades futuras e estado implementado. Nenhuma dependência ou serviço externo é necessário para ler esta entrega.

## Etapa 02 — bootstrap da aplicação (implementado; validações no README)

Criar Next.js com TypeScript estrito e Tailwind, tela inicial simples sem indicadores fictícios e .gitignore. Criar .env.example somente quando houver variáveis necessárias; o bootstrap não exige nenhuma. Fixar versões compatíveis e lockfile; documentar Node e npm. Adicionar apenas dependências exigidas pelo incremento.

Aceite: instalação com npm ci, typecheck, lint, build e inicialização de produção funcionam. Não usar o build como substituto de lint ou typecheck. Documentar os comandos reais no README.

## Etapa 03 — banco e barreira multi-tenant (validada localmente; aguardando revisão humana)

Estado atual: clientes Supabase, configuração CLI local, migration e testes SQL/HTTP preparados. Docker instalado; migration aplicada localmente e 48 asserções pgTAP mais cenários A–I HTTP aprovados em 27/09/2026. Fixtures removidas. Nenhuma aplicação remota ocorreu. O desenvolvedor autorizou posteriormente a Etapa 04 mínima. Procedimentos e resultados em [Supabase](supabase.md).

Escopo: criar migrações de organizations, organization_members e user_global_roles com constraints, índices, grants e RLS. Definir procedimento controlado do primeiro administrador e usar ambiente de desenvolvimento. Dados de teste devem estar separados de produção.

Aceite obrigatório, com empresas A/B e identidades isoladas:

- Cliente A vê A e não vê B por URL, consulta direta, ID conhecido ou API Supabase.
- Cliente B não vê A; usuário com dois vínculos vê ambas; usuário sem vínculo não vê nenhuma.
- Anônimo não lê nem escreve dados privados.
- Cliente não cria vínculos, não muda seu papel e não concede papel global.
- INSERT/UPDATE/DELETE indevidos falham, inclusive troca de organization_id.
- Administrador consulta todas as empresas e gerencia vínculos conforme a matriz; não promove outros administradores pela API comum.
- Revogar vínculo ou papel retira acesso na consulta seguinte, mesmo com JWT ainda válido.
- Policies de membros e papéis funcionam sem recursão; migrações funcionam em banco vazio.

Executar operações como authenticated/anon com JWTs reais de teste ou contexto de autenticação corretamente simulado no PostgreSQL. Testes com service_role/proprietário não demonstram isolamento. Complementar testes SQL com requisições reais à API antes de expor o ambiente.

## Etapa 04 — autenticação mínima (implementada; aguardando revisão)

Escopo aprovado: e-mail/senha, sessão SSR, /login, /app simples protegida no servidor e logout. Sem callback, recuperação de senha, cadastro público, seleção de empresa ou diferenciação visual por papel. A previsão mais ampla da Etapa 01 foi reduzida pelo pedido explícito da Etapa 04.

Lint, typecheck, build e sete testes unitários passaram. O fluxo foi exercitado em navegador contra produção local, incluindo login inválido/válido, persistência, renovação, cookie adulterado e logout. Detalhes em [autenticação](autenticacao.md). Migrations, policies e testes de RLS permanecem inalterados. Nenhuma operação remota foi realizada.

Parar para revisão humana antes de novos módulos. Recuperação, convites, seleção de empresa e autorização de rotas administrativas exigem escopo e testes próprios.

## Etapa 05 — operação administrativa mínima

Cadastro/edição de empresas e convite/vínculo de usuários pelo ADMIN_ADSCOM. Página do cliente exibe apenas identificação da empresa e estado vazio honesto.

Aceite: um administrador provisiona dois clientes; cada cliente acessa apenas suas empresas. Convite repetido, falha na criação do vínculo e tentativa de autoelevação têm tratamento verificável. Nenhuma chave privilegiada chega ao navegador ou logs.

## Etapa 06 — primeiro módulo de valor

Escolher com o responsável pelo produto um incremento: recomendações manuais ou piloto NFC. Não implementar os dois automaticamente. Só então acrescentar tabelas específicas.

Se NFC for escolhido: cadastrar dispositivo, editar destino e resolver link público com evento mínimo. Aceite: o mesmo código passa a redirecionar para o novo destino; código inválido/inativo é tratado; destino inseguro é rejeitado; acesso público não expõe dados privados; falha de registro não impede destino já resolvido; integridade entre empresas é testada. Definir limites de requisições e retenção antes do piloto público.

Integrações reais com Google e demais módulos ficam para incrementos próprios, após definição de credenciais, escopo e origem dos dados.

## Etapa 07 — preparação de produção

Validar o plano Hostinger, Node, build/start, variáveis de ambiente, HTTPS, domínios, callbacks e processo persistente. Separar Supabase de desenvolvimento/produção, planejar backups e restauração e definir aplicação de migrações e recuperação em caso de falha. Não presumir que recursos de backup estão incluídos no plano contratado.

Aceite: smoke test de login e isolamento no ambiente de homologação, sem segredos no bundle; procedimento de deploy reproduzível e verificação da estratégia de recuperação antes de dados reais. Publicação exige escopo autorizado e configurações disponíveis.

## Decisões pendentes por momento

| Quando | Informação necessária |
| --- | --- |
| Antes do fluxo de autenticação | Confirmar entrada por convite e e-mail/senha ou outro método desejado |
| Antes de conceder acesso global | Identidade do primeiro administrador ADSCOM |
| Antes de conectar serviços | Remoto GitHub e configuração local do projeto Supabase já informado pelo desenvolvedor |
| Antes do primeiro módulo | Prioridade de produto entre recomendações manuais e piloto NFC |
| Antes de NFC público | Domínio, política de destinos, dados de evento e retenção |
| Antes de produção | Plano Hostinger, domínio da aplicação, ambientes, e-mail e responsáveis por operação |

Essas decisões não bloqueiam a documentação atual. Devem ser resolvidas antes do trabalho que depende delas.
