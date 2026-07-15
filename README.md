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
- Recharts
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
organizacao e membership. O papel da membership tambem controla o acesso ao
dashboard gerencial descrito abaixo.

## Dashboard gerencial

A rota privada `/dashboard` e exclusiva para `ADMIN` e `MANAGER` e consome:

```text
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/status-distribution
GET /api/v1/dashboard/priority-distribution
GET /api/v1/dashboard/recent?limit=5
GET /api/v1/dashboard/overdue?limit=5
Authorization: Bearer <token>
```

O frontend exibe cards para total, pendentes, em andamento, concluidas,
atrasadas e tempo medio de resolucao. `waiting` e `cancelled` aparecem em um
resumo secundario para que todos os status retornados sejam representados sem
confundir `WAITING` com `IN_PROGRESS`.

As distribuicoes por status e prioridade sao renderizadas com Recharts. A
interface preserva todos os itens enviados pelo backend, inclusive contagens
zero, traduz os enums e oferece tooltip e legenda. Cada grafico tambem possui
uma tabela textual visivel, com rotulo e quantidade, para nao comunicar os
dados apenas por cor ou depender da leitura do SVG.

A lista de solicitacoes recentes mostra titulo, status, prioridade, criacao,
responsavel quando existente e link para o detalhe. Maiores atrasos mostra
titulo, prazo, duracao retornada em `overdue_seconds`, prioridade, responsavel e
link. A ordem de ambas e preservada exatamente como recebida: criacao mais
recente primeiro e maior atraso primeiro, conforme os contratos do backend.
Tickets concluidos e cancelados sao excluidos de atrasos pelo backend.

`average_resolution_hours` e exibido em horas, usando diretamente o valor
calculado pelo backend e limitando apenas a representacao a duas casas
decimais. Zero aparece como `0 h`; `null` aparece como `Sem dados`. O frontend
nao recalcula duracoes a partir das datas.

O menu mostra Dashboard somente para administradores e gestores. Acesso direto
por `AGENT` ou `REQUESTER` redireciona para `/solicitacoes` sem disparar a query;
o backend continua sendo a fonte de verdade e retorna `403` para esses papeis.
A pagina possui skeletons, erro com nova tentativa e estados vazios. Summary,
cada grafico e cada lista usam queries e estados independentes, de modo que uma
falha parcial nao derruba os demais blocos. No mobile, graficos e listas ficam
em coluna unica; no desktop, usam grid de duas colunas abaixo dos cards.
Relatorios, filtros globais e exportacoes permanecem fora deste escopo.

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

A navegacao mostra Dashboard para `ADMIN` e `MANAGER` e Perfil para todos os
papeis. Usuarios e Categorias aparecem somente para `ADMIN`; isso controla
apenas a interface, e o backend permanece como fonte de verdade para
autorizacao.

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
Os componentes permanecem independentes de dados; a integracao da listagem e
feita pela rota `/solicitacoes` via:

```text
GET /api/v1/tickets?search=&status=&priority=&category_id=&assignee_id=&created_from=&created_to=&overdue=&sort_by=&sort_order=&page=&page_size=20
```

A resposta esperada possui `page`, `page_size`, `total`, `total_pages` e
`items`. Filtros e paginacao compoem a chave da query, enquanto o backend
continua sendo a fonte de verdade do escopo:

- `ADMIN` e `MANAGER`: todas as solicitacoes da organizacao;
- `AGENT`: solicitacoes criadas por ele ou atribuidas a ele;
- `REQUESTER`: somente as proprias solicitacoes.

A listagem usa tabela no desktop e cards no mobile, com loading, erro e vazios
distintos para ausencia de tickets e ausencia de resultados filtrados.

### Filtros e URL da listagem

A rota `/solicitacoes` sincroniza seu estado com a query string publica:

| URL | Backend | Comportamento |
|---|---|---|
| `search` | `search` | busca parcial por titulo, com trim e debounce de 400 ms |
| `status` | `status` | status tipado |
| `priority` | `priority` | prioridade tipada |
| `category` | `category_id` | UUID de categoria ativa |
| `assignee` | `assignee_id` | UUID de responsavel elegivel |
| `createdFrom` | `created_from` | inicio inclusivo do dia em UTC |
| `createdTo` | `created_to` | fim inclusivo do dia em UTC |
| `overdue` | `overdue` | `true` para somente atrasadas |
| `sortBy` | `sort_by` | `created_at` ou `due_date` |
| `sortOrder` | `sort_order` | `asc` ou `desc` |
| `page` | `page` | pagina a partir de 1 |

As ordenacoes disponiveis sao mais recentes, mais antigas, prazo mais proximo
e prazo mais distante. A alteracao de qualquer filtro volta para a pagina 1;
a paginacao preserva todos os filtros. A busca usa `router.replace` depois do
debounce para nao criar uma entrada de historico por tecla; filtros e paginas
usam `router.push`, permitindo voltar e avancar pelo estado da consulta.

Recarregar ou compartilhar a URL reproduz a mesma requisicao. Parametros
invalidos, UUIDs malformados, datas inexistentes e enums desconhecidos sao
ignorados com seguranca antes da chamada ao backend; periodos invertidos sao
normalizados. O painel mostra a quantidade de filtros ativos e permite limpar
a busca isoladamente ou restaurar toda a listagem. Categorias e responsaveis
sao carregados pelas APIs existentes, e o layout se adapta de uma coluna no
mobile para quatro no desktop.

### Nova solicitacao

A rota `/solicitacoes/nova` carrega categorias ativas com `GET /categories` e
cria uma solicitacao com `POST /tickets`. O formulario envia somente:

```json
{
  "title": "Acesso ao financeiro",
  "description": "Liberar perfil para fechamento mensal.",
  "category_id": "uuid-da-categoria",
  "priority": "HIGH",
  "due_date": "2026-07-20T18:00:00.000Z"
}
```

Titulo, descricao e categoria sao obrigatorios; prioridade inicia em `MEDIUM`
e prazo e opcional. O campo de prazo usa data/hora local, rejeita valores
passados no cliente e converte o instante para ISO antes do envio. Organizacao,
solicitante, responsavel, status e datas internas nunca integram o payload.

Apos sucesso, a listagem e invalidada e o usuario segue para
`/solicitacoes/{id}`. A tela tambem cobre carregamento, erro e ausencia de
categorias, mensagens por campo, erros da API e prevencao de envio duplicado.

### Detalhes da solicitacao

A rota `/solicitacoes/[id]` consulta `GET /tickets/{id}` e organiza a resposta
em resumo, descricao, responsaveis, datas e acoes. Sao exibidos categoria,
organizacao, status, prioridade, solicitante, responsavel, prazo, datas
operacionais e atraso com duracao textual.

IDs invalidos sao recusados antes da requisicao. A tela diferencia loading,
nao encontrado/fora do escopo, acesso negado, rede e erro inesperado. Como o
backend oculta recursos externos, uma resposta `404` nao revela se o ticket
existe em outra organizacao.

As acoes visiveis refletem papel e estado: administradores e gestores recebem
as opcoes administrativas validas; agentes veem alteracao de status apenas
quando atribuidos; solicitantes podem editar e cancelar somente ticket proprio,
pendente e sem responsavel. Estados concluidos e cancelados ocultam operacoes
incompativeis. Nesta branch, as acoes sao apenas links para os fluxos futuros;
nenhuma mutacao foi implementada.

### Edicao da solicitacao

A rota `/solicitacoes/[id]/edit` carrega o ticket e as categorias ativas, e
envia uma atualizacao parcial com `PATCH /tickets/{id}`. O formulario permite
alterar titulo, descricao e categoria; prioridade e prazo aparecem somente
quando o contrato permite planejamento. Apenas campos modificados integram o
payload, sem organizacao, solicitante, responsavel, status ou datas internas.

Administradores e gestores podem editar os dados descritivos; em tickets
concluidos, prioridade e prazo permanecem bloqueados. Solicitantes podem editar
o proprio ticket somente quando pendente e sem responsavel, sem acesso aos
campos de planejamento. Agentes e usuarios fora do escopo nao recebem o
formulario, e tickets cancelados nao podem ser editados. O backend permanece
como fonte de verdade para todas as permissoes.

O prazo usa data/hora local e e convertido para ISO somente quando alterado.
A categoria atual continua identificada caso tenha sido inativada, mas as novas
opcoes sao exclusivamente categorias ativas. Apos sucesso, os caches do detalhe
e da listagem sao atualizados/invalidados e a navegacao retorna aos detalhes.
Atribuicao e mudanca de status nao fazem parte deste fluxo.

### Atribuicao, status e cancelamento

Os detalhes da solicitacao oferecem acoes operacionais usando os contratos
`PATCH /tickets/{id}/assignee`, `PATCH /tickets/{id}/status`,
`PATCH /tickets/{id}` e `POST /tickets/{id}/cancel`. Administradores e gestores
podem atribuir, trocar e remover responsaveis, alterar prioridade e prazo e
cancelar tickets nao terminais. A lista de responsaveis consulta memberships
ativas e apresenta nome, e-mail, papel e status; solicitantes e membros
inativos ou com papel `REQUESTER` nao sao oferecidos.

A interface exibe somente as transicoes documentadas e permitidas pelo papel:

```text
PENDING     -> IN_PROGRESS | WAITING
IN_PROGRESS -> WAITING | COMPLETED
WAITING     -> IN_PROGRESS | COMPLETED
COMPLETED   -> IN_PROGRESS (reabertura)
CANCELLED   -> nenhuma
```

Estados operacionais exigem responsavel. Agentes alteram status apenas quando
o ticket esta atribuido a eles; solicitantes nao alteram status. Prioridade e
prazo, inclusive remocao do prazo com `null`, ficam restritos a administradores
e gestores e sao bloqueados em tickets concluidos ou cancelados.

O cancelamento possui confirmacao destrutiva e deixa claro que o registro nao
e excluido. Administradores e gestores cancelam tickets nao terminais;
solicitantes cancelam apenas os proprios enquanto pendentes. As mutacoes nao
fazem atualizacao otimista: depois da resposta, o detalhe recebe o ticket
atualizado e a listagem e invalidada. Motivo de cancelamento permanece fora
desta entrega.

### Comentarios da solicitacao

A pagina `/solicitacoes/[id]` lista e cria comentarios sem recarregar a pagina:

```text
GET  /api/v1/tickets/{ticket_id}/comments
POST /api/v1/tickets/{ticket_id}/comments
```

O `POST` envia somente `{ "content": "..." }`. O conteudo e aparado e deve ter
entre 1 e 5000 caracteres. A resposta contem ID, ticket, conteudo, autor
(`id`, `name`, `avatar_url`) e datas; e-mail, senha e outros dados sensiveis nao
sao exibidos. A listagem respeita a ordem cronologica fornecida pelo backend e
possui estados de carregamento, erro e vazio.

Usuarios com acesso ao ticket podem comentar de acordo com seu papel e vinculo.
Tickets concluidos aceitam comentarios; tickets cancelados ocultam o formulario
e o backend confirma a regra, retornando `cancelled_ticket_comment` em caso de
concorrencia. Depois do sucesso, a query especifica dos comentarios e
invalidada e recarregada, sem insercao local otimista, duplicacao, reload da
pagina ou mudanca da posicao da tela.

Limitacoes: nao ha edicao, exclusao, mencoes, anexos, paginacao ou atualizacao
em tempo real. Esses recursos permanecem fora da entrega de comentarios.

### Timeline do historico

A pagina `/solicitacoes/[id]` tambem consulta o contrato autenticado:

```text
GET /api/v1/tickets/{ticket_id}/history
```

O retorno e exibido como timeline responsiva, preservando a ordem cronologica
crescente fornecida pelo backend: o evento mais antigo permanece no topo. A
secao possui estados de carregamento, erro com nova tentativa e vazio.

As acoes `CREATED`, `TITLE_CHANGED`, `DESCRIPTION_CHANGED`,
`CATEGORY_CHANGED`, `PRIORITY_CHANGED`, `DUE_DATE_CHANGED`, `ASSIGNED`,
`ASSIGNEE_CHANGED`, `ASSIGNEE_REMOVED`, `STATUS_CHANGED`, `COMPLETED`,
`REOPENED` e `CANCELLED` possuem traducoes centralizadas e nao sao apresentadas
como codigos crus. Cada evento mostra a descricao da mudanca, autor e data/hora
no timezone local do navegador.

Status e prioridades reutilizam as traducoes da interface. Datas ISO sao
formatadas com os helpers compartilhados; entidades no formato `ID | nome`
mostram somente o nome; valores ausentes recebem textos de contexto como `Sem
responsavel`, `Sem prazo`, `Sem categoria` ou `Nao informado`. A interface e
somente leitura: nao reordena, filtra, edita ou remove eventos, e o backend
continua controlando visibilidade, auditoria e redacao de dados sensiveis.
