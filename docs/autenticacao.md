# Autenticação mínima — Etapa 04

## Configurar e acessar

Mantenha valores reais apenas em `.env.local` (ignorado pelo Git): NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. O exemplo versionado permanece vazio. Use Project URL e Publishable Key do mesmo ambiente; não use secret, service_role, token pessoal da CLI ou senha PostgreSQL. Não há compatibilidade com chaves JWT legadas nos clientes da aplicação.

Local: Docker e `npm run db:start`, usando a URL e Publishable Key locais disponíveis no Studio/CLI. Remoto: configurar as duas variáveis com dados do projeto hospedado. Nenhuma operação remota foi executada nesta etapa. O briefing informa vínculo remoto, mas supabase/.temp/project-ref não foi encontrado neste checkout; o funcionamento da aplicação não depende desse vínculo da CLI.

Execute `npm run dev` e abra `/login`. Para produção local, execute `npm run build` e `npm start`. Reinicie o servidor após mudar `.env.local`; faça novo build quando mudar variáveis NEXT_PUBLIC_, que podem ser incorporadas ao bundle do navegador. A página inicial `/` continua sem exigir Supabase. Nenhum arquivo de ambiente com valores reais foi criado pelos testes desta etapa: a configuração local foi injetada apenas no processo de teste.

É necessário um usuário Supabase Auth existente com e-mail e senha. A criação controlada de usuários fica sob responsabilidade do desenvolvedor/operador no ambiente escolhido, sem guardar senhas em arquivos. Não existe tela nem action de cadastro. Para impedir cadastro direto na API do projeto hospedado, desative **Allow new users to sign up** nas configurações de Auth. Isso não é controlado pela ausência de um botão no frontend. O cadastro local continua habilitado exclusivamente para as fixtures dos testes da Etapa 03; não foi alterado para evitar quebrá-los. Nenhuma configuração remota de Auth foi modificada.

## Fluxo implementado

1. `/login` consulta `getUser()` no servidor. Usuário válido vai para `/app`; visitante recebe o formulário.
2. O formulário usa uma Server Action, valida tipos/limites de entrada e chama `signInWithPassword`. A senha não é normalizada nem registrada em logs. Uma falha de autenticação exibe mensagem genérica, sem revelar se o e-mail está cadastrado.
3. O cliente servidor é criado por requisição. Na action, writeCookies=true permite gravar os cookies de sessão. Após sucesso, o destino é fixo: `/app`; parâmetros externos de retorno não são aceitos.
4. O proxy do Next.js 16 executa somente em `/login` e `/app/*`, chama getClaims para renovar/validar o token e propaga cookies atualizados tanto para a requisição quanto para a resposta. Também preserva headers privados de cache do SDK.
5. A página `/app` usa getUser para verificar a identidade diretamente no servidor Auth antes de renderizar. Cookie existente, papel enviado pelo navegador ou resultado de getSession não são provas de identidade. A página mostra apenas confirmação de autenticação, e-mail e Sair.
6. Sair chama signOut({ scope: 'local' }) em Server Action. Em sucesso, remove a sessão deste navegador e redireciona para `/login`; em falha, mostra mensagem para tentar novamente, sem afirmar que a sessão foi encerrada.

Server Components usam o cliente em modo de leitura de cookies; o proxy é responsável por persistir a renovação. Server Actions usam escrita explícita e não silenciam falhas de cookies. As páginas são force-dynamic. Em produção, as respostas testadas usam Cache-Control: private, no-store, max-age=0. Não habilitar cache compartilhado dessas rotas na hospedagem ou CDN. Next.js Server Actions mantêm suas proteções padrão de origem para POST; nenhum endpoint GET faz logout.

Não é necessário callback para e-mail/senha. Nenhuma nova dependência foi adicionada. A implementação segue a [abordagem SSR oficial do Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), com getUser adicional nas páginas para consultar o registro atual do usuário.

## Limites

Autenticação confirma quem é o usuário; não concede acesso a empresas. Um usuário sem vínculos pode abrir esta página mínima, mas RLS continua impedindo acesso a dados de empresas. A página não lê tabelas de negócio, nem diferencia CLIENTE e ADMIN_ADSCOM. Toda futura operação de dados deve verificar autorização e preservar RLS.

Logout local não desconecta outros dispositivos. Tokens de acesso já copiados podem continuar válidos até expirar; o logout não deve ser descrito como revogação instantânea de todo JWT. Tokens, cookies e senhas não devem ser registrados em logs. Produção deve usar HTTPS e as proteções de Auth/rate limits do Supabase; não foi implementado um limitador próprio.

Não foram implementados cadastro, convites pela aplicação, recuperação, OAuth, magic link, MFA, callbacks, área administrativa, seleção de empresa, dashboard ou módulos de negócio. A Etapa 05 não foi iniciada.

## Verificações e roteiro manual

`npm run lint`, `npm run typecheck`, `npm run build` e `npm test` passaram. Há sete testes unitários: quatro de ambiente e três de validação de entradas. Testes de banco anteriores não foram alterados.

Foi executado teste em navegador headless contra `next start` e Supabase exclusivamente local, com usuário temporário sem vínculo e senha gerada em memória. Não foi adicionada dependência de navegador ao projeto. A fixture foi removida ao final. Os seguintes passos passaram e podem ser repetidos manualmente com uma conta de desenvolvimento:

1. Sem sessão, abrir `/app`: redireciona para `/login`, sem conteúdo protegido.
2. Informar senha incorreta: mantém login e exibe erro genérico.
3. Informar credenciais corretas: abre `/app` e mostra o e-mail autenticado.
4. Recarregar: sessão permanece válida.
5. Abrir `/login` autenticado: redireciona para `/app`.
6. Clicar Sair: retorna ao login e remove cookies de sessão; abrir `/app` novamente exige login.

Adicionalmente, o teste automatizado local simulou expiração no cookie armazenado e confirmou emissão/persistência de novo token pelo proxy, conteúdo protegido disponível e header private/no-store em produção. Um cookie adulterado foi recusado. A primeira asserção de cache em modo dev falhou porque o header efetivo difere do servidor de produção; a renovação já funcionava. O teste completo de produção passou. Não foram registrados tokens ou senhas nos resultados.

O aviso pré-existente sobre ESLint 9 fora de suporte permanece documentado no README. Não houve validação contra o projeto remoto ou contra a hospedagem Hostinger.
