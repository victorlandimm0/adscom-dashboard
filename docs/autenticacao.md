# Autenticação — implementação atual e histórico

Evolução atual: a Etapa 06 introduziu shell e empresa atual; consulte [dashboard](dashboard.md). As seções de validação das Etapas 04/05 abaixo registram o histórico anterior. A Etapa 06 revalidou login/logout por HTTP e não repetiu testes visuais de navegador.

A Etapa 07 acrescenta `/admin`, autorizado por sessão e ADMIN_ADSCOM consultado no banco em cada página/action. O proxy também cobre `/admin/:path*`; logout e seleção são reutilizados. Anônimo vai para login; cliente ou papel revogado retorna a `/app`. Consulte [administração](administracao.md).

Resultados atuais da suíte e revisão manual informada pelo usuário estão em [consolidação](consolidacao.md) e [administração](administracao.md). As contagens de sete testes abaixo são históricas; a suíte atual tem 13.

## Configurar e acessar

Mantenha valores reais apenas em `.env.local` (ignorado pelo Git): NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. O exemplo versionado permanece vazio. Use Project URL e Publishable Key do mesmo ambiente; não use secret, service_role, token pessoal da CLI ou senha PostgreSQL. Não há compatibilidade com chaves JWT legadas nos clientes da aplicação.

Local: Docker e `npm run db:start`, usando a URL e Publishable Key locais disponíveis no Studio/CLI. Remoto: configurar as duas variáveis com dados do projeto hospedado. Nenhuma operação remota foi executada nesta etapa. O briefing informa vínculo remoto, mas supabase/.temp/project-ref não foi encontrado neste checkout; o funcionamento da aplicação não depende desse vínculo da CLI.

Execute `npm run dev` e abra `/login`. Para produção local, execute `npm run build` e `npm start`. Reinicie o servidor após mudar `.env.local`; faça novo build quando mudar variáveis NEXT_PUBLIC_, que podem ser incorporadas ao bundle do navegador. A página inicial `/` continua sem exigir Supabase. Nenhum arquivo de ambiente com valores reais foi criado pelos testes desta etapa: a configuração local foi injetada apenas no processo de teste.

É necessário um usuário Supabase Auth existente com e-mail e senha. A criação controlada de usuários fica sob responsabilidade do desenvolvedor/operador no ambiente escolhido, sem guardar senhas em arquivos. Não existe tela nem action de cadastro. Para impedir cadastro direto na API do projeto hospedado, desative **Allow new users to sign up** nas configurações de Auth. Isso não é controlado pela ausência de um botão no frontend. O cadastro local continua habilitado exclusivamente para as fixtures dos testes da Etapa 03; não foi alterado para evitar quebrá-los. Nenhuma configuração remota de Auth foi modificada.

## Fluxo implementado

1. `/login` consulta `getUser()` no servidor. Usuário válido vai para `/app`; visitante recebe o formulário.
2. O formulário usa uma Server Action, valida tipos/limites de entrada e chama `signInWithPassword`. A senha não é normalizada nem registrada em logs. Uma falha de autenticação exibe mensagem genérica, sem revelar se o e-mail está cadastrado.
3. O cliente servidor é criado por requisição. Na action, writeCookies=true permite gravar os cookies de sessão. Após sucesso, o destino é fixo: `/app`; parâmetros externos de retorno não são aceitos.
4. O proxy do Next.js 16 executa em `/login`, `/app/*` e `/admin/*`, chama getClaims para renovar/validar o token e propaga cookies atualizados tanto para a requisição quanto para a resposta. Também preserva headers privados de cache do SDK.
5. O contexto servidor de `/app` e subrotas usa getUser para verificar a identidade diretamente no Auth. Cookie existente, papel enviado pelo navegador ou resultado de getSession não são provas de identidade. A Etapa 06 mostra usuário, empresa atual validada e Sair no shell compartilhado.
6. Sair chama signOut({ scope: 'local' }) em Server Action. Em sucesso, remove a sessão deste navegador e a preferência de empresa, redirecionando para `/login`; em falha, mostra mensagem para tentar novamente, sem afirmar que a sessão foi encerrada.

Server Components usam o cliente em modo de leitura de cookies; o proxy é responsável por persistir a renovação. Server Actions usam escrita explícita e não silenciam falhas de cookies. As páginas são force-dynamic. Em produção, as respostas testadas usam Cache-Control: private, no-store, max-age=0. Não habilitar cache compartilhado dessas rotas na hospedagem ou CDN. Next.js Server Actions mantêm suas proteções padrão de origem para POST; nenhum endpoint GET faz logout.

Não é necessário callback para e-mail/senha. Nenhuma nova dependência foi adicionada. A implementação segue a [abordagem SSR oficial do Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), com getUser adicional nas páginas para consultar o registro atual do usuário.

## Limites

Autenticação confirma quem é o usuário; não concede acesso a empresas. Um usuário sem vínculos e sem papel global pode abrir esta página mínima, mas RLS continua impedindo acesso a dados de empresas. A Etapa 05 consulta empresas, vínculos e o próprio papel global. Toda futura operação de dados deve verificar autorização e preservar RLS.

Logout local não desconecta outros dispositivos. Tokens de acesso já copiados podem continuar válidos até expirar; o logout não deve ser descrito como revogação instantânea de todo JWT. Tokens, cookies e senhas não devem ser registrados em logs. Produção deve usar HTTPS e as proteções de Auth/rate limits do Supabase; não foi implementado um limitador próprio.

Não foram implementados cadastro de usuários Auth, convites pela aplicação, recuperação, OAuth, magic link, MFA, callbacks ou módulos de negócio. Shell e seleção de empresa foram acrescentados na Etapa 06; administração mínima de empresas e vínculos, na Etapa 07.

## Histórico de verificações da Etapa 04

`npm run lint`, `npm run typecheck`, `npm run build` e `npm test` passaram. Há sete testes unitários: quatro de ambiente e três de validação de entradas. Testes de banco anteriores não foram alterados.

Foi executado teste em navegador headless contra `next start` e Supabase exclusivamente local, com usuário temporário sem vínculo e senha gerada em memória. Não foi adicionada dependência de navegador ao projeto. A fixture foi removida ao final. Os seguintes passos passaram e podem ser repetidos manualmente com uma conta de desenvolvimento:

1. Sem sessão, abrir `/app`: redireciona para `/login`, sem conteúdo protegido.
2. Informar senha incorreta: mantém login e exibe erro genérico.
3. Informar credenciais corretas: abre `/app` e mostra o e-mail autenticado.
4. Recarregar: sessão permanece válida.
5. Abrir `/login` autenticado: redireciona para `/app`.
6. Clicar Sair: retorna ao login e remove cookies de sessão; abrir `/app` novamente exige login.

Adicionalmente, o teste automatizado local simulou expiração no cookie armazenado e confirmou emissão/persistência de novo token pelo proxy, conteúdo protegido disponível e header private/no-store em produção. Um cookie adulterado foi recusado. A primeira asserção de cache em modo dev falhou porque o header efetivo difere do servidor de produção; a renovação já funcionava. O teste completo de produção passou. Não foram registrados tokens ou senhas nos resultados.

O aviso histórico sobre suporte do ESLint 9 permanece em [consolidação](consolidacao.md). Não houve validação contra o projeto remoto ou contra a hospedagem Hostinger.

## Etapa 05 — empresas em /app

Histórico: a listagem sem seleção descrita nesta seção foi substituída pelo contexto atual e seletor da [Etapa 06](dashboard.md).

Após `getUser()`, o Server Component consulta a concessão própria de ADMIN_ADSCOM em `user_global_roles` e os vínculos em `organization_members`, filtrando `user_id` pelo ID retornado pelo Auth. Para clientes, consulta `organizations(id, name)` usando os IDs desses vínculos. A consulta final também passa por RLS: uma revogação entre as leituras não libera a empresa revogada. Não há IDs de empresa recebidos de URL/cookie, autorização por user_metadata ou credencial privilegiada nesse fluxo. O cliente Supabase permanece por requisição, sem cache compartilhado.

- Um vínculo: mostra o nome sob “Empresa”.
- Nenhum vínculo e nenhum papel global: “Nenhuma empresa vinculada à sua conta.” Não cria empresa nem concede acesso.
- Múltiplas empresas: lista os nomes ordenados e informa “Nenhuma empresa foi selecionada.” A listagem é a solução mínima desta etapa; não existe contexto ativo nem seletor persistido.
- ADMIN_ADSCOM: lê as empresas permitidas pelo papel global, sem exigir/criar membership, e mostra uma explicação do acesso global. Sem empresas disponíveis, mostra estado vazio próprio. Não há painel administrativo ou novas permissões.
- Falha de qualquer consulta: mensagem de erro, sem mostrar lista parcial e sem confundir falha com ausência de vínculo; o botão Sair continua disponível.

As policies existentes consultam `auth.uid()` e vínculos/papel no banco. Filtrar por um UUID alheio não contorna RLS, inclusive pela API direta. Nenhuma migration, policy ou dependência foi adicionada. A prova desta etapa cobre as tabelas da fundação; futuros módulos exigem suas próprias policies e testes. A listagem usa o limite de resposta configurado no Supabase; paginação fica para quando houver necessidade, sem escolher empresa implicitamente.

### Validação em 29/09/2026

Passaram `npm run lint`, `npm run typecheck`, `npm test` (7 testes), `npm run build`, `npm run test:db` (52 asserções) e `npm run test:rls:api` (cenários anteriores e leituras da Etapa 05). As tentativas iniciais de testes unitários/build foram bloqueadas pelo sandbox com spawn EPERM; a repetição com subprocessos permitidos passou. SQL usa rollback; a suíte HTTP confirmou remoção das fixtures. Nenhum teste ou alteração remota foi executado.

Os testes HTTP verificam as consultas autenticadas, não a renderização/login da nova página. Os resultados de navegador acima pertencem à Etapa 04. Posteriormente, o usuário informou validação manual remota de ADMIN_ADSCOM e clientes A/B na Etapa 05 e revisão funcional da Etapa 07. O roteiro abaixo preserva o comportamento histórico da Etapa 05; para o seletor atual, use [dashboard](dashboard.md).

### Roteiro manual da Etapa 05

Use somente Supabase local descartável já com a migration aplicada e `.env.local` apontando para ele. Não compartilhe credenciais nem versione valores. Para os testes automatizados, basta executar `npm run test:db` e `npm run test:rls:api`: a suíte HTTP cria seis usuários com e-mails example.test e senhas aleatórias em memória, cria A/B e vínculos, verifica e remove suas fixtures.

Para conferir a interface, prepare separadamente no Studio **local** duas empresas com nomes de teste e cinco usuários Auth: A, B, múltiplos, sem vínculo e administrador. Defina senhas somente na interface local e anote os UUIDs apenas localmente. Em `organization_members`, vincule A à primeira empresa, B à segunda e múltiplos a ambas, com role CLIENTE; deixe os outros sem vínculo. Por operação do operador local, insira somente para o administrador uma concessão ADMIN_ADSCOM em `user_global_roles`. Isso prepara fixtures, não representa um cadastro administrativo implementado no produto.

1. Execute `npm run dev`; sem sessão, `/app` deve redirecionar para `/login`.
2. Entre como A: veja somente o nome de A; saia e repita com B, que deve ver somente B.
3. Entre sem vínculo: confira a mensagem de ausência de empresa.
4. Entre como múltiplos: confira ambos os nomes e a mensagem de que nenhuma empresa foi selecionada.
5. Entre como administrador sem vínculo: confira ambas as empresas e a indicação de acesso global.
6. Remova um vínculo pelo Studio local e recarregue a sessão correspondente: a empresa deve desaparecer. Remova o papel do administrador sem vínculo e recarregue: deve ficar sem empresas.
7. Confira persistência após recarregar e Sair em cada perfil. Para verificar o estado de erro, com Auth disponível interrompa temporariamente apenas a API de dados local e recarregue: deve mostrar erro, sem lista parcial; restaure o serviço em seguida.
8. Para acesso direto a UUID alheio com JWT real, repita a suíte HTTP; ela cobre A→B, B→A e sem vínculo→A sem registrar tokens.

Ao terminar, remova apenas as fixtures manuais: vínculos e concessões, empresas de teste e usuários Auth criados para esse roteiro. Não use reset nem dados reais. Nenhuma configuração externa adicional é exigida além de Docker/Supabase local, URL e Publishable Key. A validação remota e na Hostinger permanece fora do escopo.
