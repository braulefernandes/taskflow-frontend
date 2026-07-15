# TaskFlow Frontend

Frontend do TaskFlow com Next.js App Router, TypeScript, Tailwind CSS, ESLint,
TanStack Query, React Hook Form, Zod e Vitest.

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint 9
- TanStack Query
- React Hook Form, Zod e `@hookform/resolvers`
- Vitest e Testing Library

## Instalacao

```bash
npm install
```

## Ambiente

Crie um arquivo `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Nao coloque segredos em variaveis `NEXT_PUBLIC_*`.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
```

## Execucao

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Cadastro

A rota `/cadastro` consome o contrato documentado do backend:

```text
POST /api/v1/auth/register
```

Request enviado pelo frontend:

```json
{
  "user_name": "Ana Silva",
  "email": "ana@example.com",
  "password": "Senha123",
  "organization_name": "Acme Suporte"
}
```

Response esperada: `201 Created` com `user`, `organization` e `membership`.
O cadastro nao retorna token e nao faz login automatico.

Campos da tela:

- nome;
- e-mail;
- nome da organizacao;
- senha;
- confirmacao de senha.

A confirmacao de senha e validada apenas no frontend e nao e enviada para a API.
Depois de um cadastro bem-sucedido, a tela exibe feedback e redireciona para
`/login`, preservando o e-mail na query string.

Erros tratados na interface:

- `409 email_already_registered`;
- `422 validation_error`;
- falha de rede;
- erro inesperado da API.

## Login e sessao

A rota inicial de login e `/login`.

Contrato consumido:

```text
POST /api/v1/auth/login
```

O backend recebe JSON:

```json
{
  "email": "ana@example.com",
  "password": "Senha123"
}
```

Resposta esperada:

```json
{
  "access_token": "jwt",
  "token_type": "bearer",
  "expires_in": 1800
}
```

Depois do login, o frontend armazena o token e consulta:

```text
GET /api/v1/auth/me
Authorization: Bearer <token>
```

O retorno de `/auth/me` popula o estado publico de sessao com usuario,
organizacao e membership. A rota `/dashboard` exibe apenas nome, e-mail,
organizacao, papel e a indicacao de sessao autenticada.

## Rotas e guard

Rotas publicas:

- `/login`;
- `/cadastro`;
- `/recuperar-senha`;
- `/redefinir-senha?token=<token>`.

Rotas privadas:

- `/dashboard`;
- `/usuarios` (navegação visível apenas para `ADMIN`);
- `/categorias` (navegação visível apenas para `ADMIN`);
- `/perfil`.

Como o JWT esta em `localStorage`, o middleware server-side do Next.js nao
consegue ler o token. Por isso, esta versao usa guards client-side:

- paginas privadas exibem carregamento enquanto `/auth/me` valida a sessao;
- sem token, token invalido ou token expirado limpa a sessao e redireciona para
  `/login`;
- conteudo privado so e renderizado depois de sessao autenticada;
- usuarios autenticados que acessam `/login` ou `/cadastro` sao redirecionados
  para `/dashboard`.

A arquitetura fica preparada para uma futura migracao para cookies `httpOnly`,
quando entao a protecao podera ser reforcada tambem em middleware/server-side.

### Estrategia de token

Neste MVP, o JWT e armazenado em `localStorage` por uma camada centralizada em
`src/lib/auth-token-storage.ts`. O cliente HTTP inclui o bearer token apenas em
chamadas autenticadas e remove o token em respostas `401`.

Limitacoes:

- o token em `localStorage` e acessivel ao JavaScript;
- o token nao deve ser exposto em logs;
- a leitura e escrita devem permanecer centralizadas;
- uma evolucao recomendada e migrar para cookie `httpOnly` quando o backend
  oferecer esse contrato.

## Logout

Contrato consumido:

```text
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

O logout do backend na Sprint 1 usa JWT stateless: a chamada nao revoga o token
no servidor. O frontend chama o endpoint quando possivel e, mesmo em falha de
rede, descarta o token local, limpa o cache da sessao e redireciona para
`/login`. Nao afirme que o token foi revogado; o comportamento correto e
descartar o token no cliente.

## Gerenciamento de membros

A rota `/usuarios` e exclusiva para `ADMIN`. A interface oculta o acesso para
os demais papeis e bloqueia acesso direto; o backend permanece como fonte de
verdade da autorizacao.

Contratos consumidos:

```text
GET   /api/v1/members?search=&role=&is_active=&page=&page_size=
POST  /api/v1/members
PATCH /api/v1/members/{membership_id}
PATCH /api/v1/members/{membership_id}/status
```

A listagem oferece busca por nome/e-mail, filtros de papel e status, paginacao
e estados de carregamento, erro e vazio. A criacao envia `name`, `email`, `role`
e `temporary_password`, usa React Hook Form/Zod e trata
`membership_already_exists`.

Alteracoes de papel e status pedem confirmacao. O conflito `last_active_admin`
e apresentado com mensagem clara. Status usa atualizacao otimista com rollback
em erro; as mutacoes atualizam ou invalidam o cache de membros.

## Perfil do usuario

A rota privada `/perfil` exibe nome, avatar URL, e-mail, organizacao e papel da
sessao atual. Somente nome e avatar URL podem ser editados; e-mail, organizacao
e papel permanecem somente leitura.

Contrato consumido:

```text
PATCH /api/v1/users/me
Authorization: Bearer <token>
```

O payload contém apenas `name` e `avatar_url`. Uma URL vazia envia `null` para
remover o avatar. O formulario usa React Hook Form e Zod, aceitando somente URLs
HTTP/HTTPS. Depois do sucesso, o frontend atualiza o provider de sessao e o
cache de `GET /auth/me`, refletindo o novo nome no cabecalho sem substituir o
token ou encerrar a sessao.

## Gerenciamento de categorias

A rota `/categorias` e exclusiva para `ADMIN`. Ela lista categorias ativas e
inativas, permite busca local por nome/descricao, filtro textual de status,
criacao, edicao e alteracao de status sem exclusao fisica.

Contratos consumidos:

```text
GET   /api/v1/categories?include_inactive=true
POST  /api/v1/categories
PATCH /api/v1/categories/{category_id}
PATCH /api/v1/categories/{category_id}/status
```

O backend nao oferece busca textual; por isso, busca e filtro sao aplicados no
cliente sobre a listagem administrativa completa. Os formularios usam React
Hook Form e Zod, enviam apenas `name` e `description` e tratam o conflito
`category_already_exists`. Ativacao e desativacao exigem confirmacao, atualizam
o cache e nunca chamam um endpoint de exclusao.

## Recuperacao de senha

O fluxo publico possui duas etapas:

```text
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

`/recuperar-senha` envia apenas o e-mail e sempre apresenta a mensagem generica
de que as instrucoes serao enviadas se a conta existir. Depois da resposta, o
formulario deixa de permitir novos envios.

O backend gera links no formato `/redefinir-senha?token=<token>`. A pagina le o
parametro `token` diretamente da query string e o envia somente no corpo da
requisicao de redefinicao, junto de `new_password`. O token nao e armazenado nem
registrado e e removido da URL depois do sucesso.

A nova senha segue a politica do backend: 8 a 128 caracteres, ao menos uma
letra e um numero. Token ausente impede o formulario; tokens invalidos,
expirados ou usados recebem a mesma mensagem segura. Apos sucesso, os campos
sensíveis sao limpos e o usuario e redirecionado ao login.

## Build e testes

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Estrutura

```text
src/app          Rotas do App Router e grupos (public)/(private)
src/components   Componentes reutilizaveis minimos
src/hooks        Hooks compartilhados
src/lib          Infraestrutura compartilhada, Query Client e HTTP client
src/providers    Providers globais da aplicacao
src/schemas      Schemas Zod compartilhados
src/services     Exports de servicos da API
src/types        Tipos compartilhados
```

## Layout privado

As rotas privadas compartilham um shell responsivo com sidebar no desktop,
menu lateral no mobile, header, breadcrumbs, marca TaskFlow e menu do usuario.
Nome da organizacao e papel vêm da sessao validada por `GET /auth/me`.

A navegacao inicial contém Dashboard e Perfil para todos os papeis. Usuarios e
Categorias aparecem somente para `ADMIN`; isso controla apenas a interface, e o
backend permanece como fonte de verdade para autorizacao.

Links e botoes têm foco visivel, menus podem ser fechados com `Escape`, a rota
ativa usa `aria-current` e os estados de carregamento possuem `role="status"`.

## Componentes de solicitacoes

Os componentes reutilizaveis da Sprint 3 ficam em `src/components/tickets` e
`src/components/ui`. O conjunto inclui badges tipados de status e prioridade,
card responsivo, responsavel, tabela generica, paginacao, estados vazio/erro,
skeleton, modal de confirmacao e campos `select`, `textarea` e data/hora.

Tipos e enums ficam em `src/types/tickets.ts`. Traducoes e formatacao de datas
ficam em `src/lib/ticket-formatters.ts`. Datas UTC recebidas nao sao alteradas;
os helpers criam somente uma representacao no timezone local do navegador.
Esta camada nao busca dados e nao implementa paginas ou integracao de tickets.
