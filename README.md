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

## Instalação

```bash
npm install
```

## Ambiente

Crie um arquivo `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Não coloque segredos em variáveis `NEXT_PUBLIC_*`.

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
O cadastro não retorna token e não faz login automático.

Campos da tela:

- nome;
- e-mail;
- nome da organização;
- senha;
- confirmação de senha.

A confirmação de senha e validada apenas no frontend e não e enviada para a API.
Depois de um cadastro bem-sucedido, a tela exibe feedback e redireciona para
`/login`, preservando o e-mail na query string.

Erros tratados na interface:

- `409 email_already_registered`;
- `422 validation_error`;
- falha de rede;
- erro inesperado da API.

## Login e sessão

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

O retorno de `/auth/me` popula o estado público de sessão com usuário,
organização e membership. O papel da membership também controla o acesso ao
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

As distribuicoes por status e prioridade são renderizadas com Recharts. A
interface preserva todos os itens enviados pelo backend, inclusive contagens
zero, traduz os enums e oferece tooltip e legenda. Cada grafico também possui
uma tabela textual visível, com rótulo e quantidade, para não comunicar os
dados apenas por cor ou depender da leitura do SVG.

A lista de solicitações recentes mostra título, status, prioridade, criação,
responsável quando existente e link para o detalhe. Maiores atrasos mostra
título, prazo, duração retornada em `overdue_seconds`, prioridade, responsável e
link. A ordem de ambas e preservada exatamente como recebida: criação mais
recente primeiro e maior atraso primeiro, conforme os contratos do backend.
Tickets concluídos e cancelados são excluidos de atrasos pelo backend.

`average_resolution_hours` e exibido em horas, usando diretamente o valor
calculado pelo backend e limitando apenas a representação a duas casas
decimais. Zero aparece como `0 h`; `null` aparece como `Sem dados`. O frontend
não recalcula durações a partir das datas.

O menu mostra Dashboard somente para administradores e gestores. Acesso direto
por `AGENT` ou `REQUESTER` redireciona para `/solicitacoes` sem disparar a query;
o backend continua sendo a fonte de verdade e retorna `403` para esses papeis.
A página possui skeletons, erro com nova tentativa e estados vazios. Summary,
cada grafico e cada lista usam queries e estados independentes, de modo que uma
falha parcial não derruba os demais blocos. No mobile, gráficos e listas ficam
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

Como o JWT está em `localStorage`, o middleware server-side do Next.js não
consegue ler o token. Por isso, está versao usa guards client-side:

- páginas privadas exibem carregamento enquanto `/auth/me` válida a sessão;
- sem token, token inválido ou token expirado limpa a sessão e redireciona para
  `/login`;
- conteudo privado so e renderizado depois de sessão autenticada;
- usuários autenticados que acessam `/login` ou `/cadastro` são redirecionados
  para `/dashboard`.

A arquitetura fica preparada para uma futura migração para cookies `httpOnly`,
quando entao a protecao podera ser reforcada também em middleware/server-side.

### Estrategia de token

Neste MVP, o JWT e armazenado em `localStorage` por uma camada centralizada em
`src/lib/auth-token-storage.ts`. O cliente HTTP inclui o bearer token apenas em
chamadas autenticadas e remove o token em respostas `401`.

Limitações:

- o token em `localStorage` e acessivel ao JavaScript;
- o token não deve ser exposto em logs;
- a leitura e escrita devem permanecer centralizadas;
- uma evolucao recomendada e migrar para cookie `httpOnly` quando o backend
  oferecer esse contrato.

## Logout

Contrato consumido:

```text
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

O logout do backend na Sprint 1 usa JWT stateless: a chamada não revoga o token
no servidor. O frontend chama o endpoint quando possível e, mesmo em falha de
rede, descarta o token local, limpa o cache da sessão e redireciona para
`/login`. Não afirme que o token foi revogado; o comportamento correto e
descartar o token no cliente.

## Gerenciamento de membros

A rota `/usuarios` e exclusiva para `ADMIN`. A interface oculta o acesso para
os demais papeis e bloqueia acesso direto; o backend permanece como fonte de
verdade da autorização.

Contratos consumidos:

```text
GET   /api/v1/members?search=&role=&is_active=&page=&page_size=
POST  /api/v1/members
PATCH /api/v1/members/{membership_id}
PATCH /api/v1/members/{membership_id}/status
```

A listagem oferece busca por nome/e-mail, filtros de papel e status, paginação
e estados de carregamento, erro e vazio. A criação envia `name`, `email`, `role`
e `temporary_password`, usa React Hook Form/Zod e trata
`membership_already_exists`.

Alterações de papel e status pedem confirmação. O conflito `last_active_admin`
e apresentado com mensagem clara. Status usa atualização otimista com rollback
em erro; as mutacoes atualizam ou invalidam o cache de membros.

## Perfil do usuário

A rota privada `/perfil` exibe nome, avatar URL, e-mail, organização e papel da
sessão atual. Somente nome e avatar URL podem ser editados; e-mail, organização
e papel permanecem somente leitura.

Contrato consumido:

```text
PATCH /api/v1/users/me
Authorization: Bearer <token>
```

O payload contém apenas `name` e `avatar_url`. Uma URL vazia envia `null` para
remover o avatar. O formulário usa React Hook Form e Zod, aceitando somente URLs
HTTP/HTTPS. Depois do sucesso, o frontend atualiza o provider de sessão e o
cache de `GET /auth/me`, refletindo o novo nome no cabecalho sem substituir o
token ou encerrar a sessão.

## Gerenciamento de categorias

A rota `/categorias` e exclusiva para `ADMIN`. Ela lista categorias ativas e
inativas, permite busca local por nome/descrição, filtro textual de status,
criação, edição e alteração de status sem exclusão física.

Contratos consumidos:

```text
GET   /api/v1/categories?include_inactive=true
POST  /api/v1/categories
PATCH /api/v1/categories/{category_id}
PATCH /api/v1/categories/{category_id}/status
```

O backend não oferece busca textual; por isso, busca e filtro são aplicados no
cliente sobre a listagem administrativa completa. Os formulários usam React
Hook Form e Zod, enviam apenas `name` e `description` e tratam o conflito
`category_already_exists`. Ativacao e desativacao exigem confirmação, atualizam
o cache e nunca chamam um endpoint de exclusão.

## Recuperação de senha

O fluxo público possui duas etapas:

```text
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

`/recuperar-senha` envia apenas o e-mail e sempre apresenta a mensagem genérica
de que as instrucoes serao enviadas se a conta existir. Depois da resposta, o
formulário deixa de permitir novos envios.

O backend gera links no formato `/redefinir-senha?token=<token>`. A página le o
parâmetro `token` diretamente da query string e o envia somente no corpo da
requisição de redefinição, junto de `new_password`. O token não e armazenado nem
registrado e e removido da URL depois do sucesso.

A nova senha segue a política do backend: 8 a 128 caracteres, ao menos uma
letra e um número. Token ausente impede o formulário; tokens inválidos,
expirados ou usados recebem a mesma mensagem segura. Após sucesso, os campos
sensíveis são limpos e o usuário e redirecionado ao login.

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
src/providers    Providers globais da aplicação
src/schemas      Schemas Zod compartilhados
src/services     Exports de servicos da API
src/types        Tipos compartilhados
```

## Layout privado

As rotas privadas compartilham um shell responsivo com sidebar no desktop,
menu lateral no mobile, header, breadcrumbs, marca TaskFlow e menu do usuário.
Nome da organização e papel vêm da sessão validada por `GET /auth/me`.

A navegação mostra Dashboard para `ADMIN` e `MANAGER` e Perfil para todos os
papeis. Usuários e Categorias aparecem somente para `ADMIN`; isso controla
apenas a interface, e o backend permanece como fonte de verdade para
autorização.

Links e botoes têm foco visível, menus podem ser fechados com `Escape`, a rota
ativa usa `aria-current` e os estados de carregamento possuem `role="status"`.

## Componentes de solicitações

Os componentes reutilizaveis da Sprint 3 ficam em `src/components/tickets` e
`src/components/ui`. O conjunto inclui badges tipados de status e prioridade,
card responsivo, responsável, tabela genérica, paginação, estados vazio/erro,
skeleton, modal de confirmação e campos `select`, `textarea` e data/hora.

Tipos e enums ficam em `src/types/tickets.ts`. Traduções e formatacao de datas
ficam em `src/lib/ticket-formatters.ts`. Datas UTC recebidas não são alteradas;
os helpers criam somente uma representação no timezone local do navegador.
Os componentes permanecem independentes de dados; a integração da listagem e
feita pela rota `/solicitacoes` via:

```text
GET /api/v1/tickets?search=&status=&priority=&category_id=&assignee_id=&created_from=&created_to=&overdue=&sort_by=&sort_order=&page=&page_size=20
```

A resposta esperada possui `page`, `page_size`, `total`, `total_pages` e
`items`. Filtros e paginação compoem a chave da query, enquanto o backend
continua sendo a fonte de verdade do escopo:

- `ADMIN` e `MANAGER`: todas as solicitações da organização;
- `AGENT`: solicitações criadas por ele ou atribuidas a ele;
- `REQUESTER`: somente as próprias solicitações.

A listagem usa tabela no desktop e cards no mobile, com loading, erro e vazios
distintos para ausência de tickets e ausência de resultados filtrados.

### Filtros e URL da listagem

A rota `/solicitacoes` sincroniza seu estado com a query string pública:

| URL | Backend | Comportamento |
|---|---|---|
| `search` | `search` | busca parcial por título, com trim e debounce de 400 ms |
| `status` | `status` | status tipado |
| `priority` | `priority` | prioridade tipada |
| `category` | `category_id` | UUID de categoria ativa |
| `assignee` | `assignee_id` | UUID de responsável elegivel |
| `createdFrom` | `created_from` | inicio inclusivo do dia em UTC |
| `createdTo` | `created_to` | fim inclusivo do dia em UTC |
| `overdue` | `overdue` | `true` para somente atrasadas |
| `sortBy` | `sort_by` | `created_at` ou `due_date` |
| `sortOrder` | `sort_order` | `asc` ou `desc` |
| `page` | `page` | página a partir de 1 |

As ordenacoes disponíveis são mais recentes, mais antigas, prazo mais próximo
e prazo mais distante. A alteração de qualquer filtro volta para a página 1;
a paginação preserva todos os filtros. A busca usa `router.replace` depois do
debounce para não criar uma entrada de histórico por tecla; filtros e páginas
usam `router.push`, permitindo voltar e avancar pelo estado da consulta.

Recarregar ou compartilhar a URL reproduz a mesma requisição. Parâmetros
inválidos, UUIDs malformados, datas inexistentes e enums desconhecidos são
ignorados com seguranca antes da chamada ao backend; periodos invertidos são
normalizados. O painel mostra a quantidade de filtros ativos e permite limpar
a busca isoladamente ou restaurar toda a listagem. Categorias e responsáveis
são carregados pelas APIs existentes, e o layout se adapta de uma coluna no
mobile para quatro no desktop.

### Nova solicitação

A rota `/solicitacoes/nova` carrega categorias ativas com `GET /categories` e
cria uma solicitação com `POST /tickets`. O formulário envia somente:

```json
{
  "title": "Acesso ao financeiro",
  "description": "Liberar perfil para fechamento mensal.",
  "category_id": "uuid-da-categoria",
  "priority": "HIGH",
  "due_date": "2026-07-20T18:00:00.000Z"
}
```

Título, descrição e categoria são obrigatórios; prioridade inicia em `MEDIUM`
e prazo e opcional. O campo de prazo usa data/hora local, rejeita valores
passados no cliente e converte o instante para ISO antes do envio. Organização,
solicitante, responsável, status e datas internas nunca integram o payload.

Após sucesso, a listagem e invalidada e o usuário segue para
`/solicitacoes/{id}`. A tela também cobre carregamento, erro e ausência de
categorias, mensagens por campo, erros da API e prevenção de envio duplicado.

### Detalhes da solicitação

A rota `/solicitacoes/[id]` consulta `GET /tickets/{id}` e organiza a resposta
em resumo, descrição, responsáveis, datas e ações. São exibidos categoria,
organização, status, prioridade, solicitante, responsável, prazo, datas
operacionais e atraso com duração textual.

IDs inválidos são recusados antes da requisição. A tela diferencia loading,
não encontrado/fora do escopo, acesso negado, rede e erro inesperado. Como o
backend oculta recursos externos, uma resposta `404` não revela se o ticket
existe em outra organização.

As ações visíveis refletem papel e estado: administradores e gestores recebem
as opções administrativas válidas; agentes veem alteração de status apenas
quando atribuídos; solicitantes podem editar e cancelar somente ticket próprio,
pendente e sem responsável. Estados concluídos e cancelados ocultam operacoes
incompativeis. Nesta branch, as ações são apenas links para os fluxos futuros;
nenhuma mutacao foi implementada.

### Edição da solicitação

A rota `/solicitacoes/[id]/edit` carrega o ticket e as categorias ativas, e
envia uma atualização parcial com `PATCH /tickets/{id}`. O formulário permite
alterar título, descrição e categoria; prioridade e prazo aparecem somente
quando o contrato permite planejamento. Apenas campos modificados integram o
payload, sem organização, solicitante, responsável, status ou datas internas.

Administradores e gestores podem editar os dados descritivos; em tickets
concluídos, prioridade e prazo permanecem bloqueados. Solicitantes podem editar
o próprio ticket somente quando pendente e sem responsável, sem acesso aos
campos de planejamento. Agentes e usuários fora do escopo não recebem o
formulário, e tickets cancelados não podem ser editados. O backend permanece
como fonte de verdade para todas as permissões.

O prazo usa data/hora local e e convertido para ISO somente quando alterado.
A categoria atual continua identificada caso tenha sido inativada, mas as novas
opções são exclusivamente categorias ativas. Após sucesso, os caches do detalhe
e da listagem são atualizados/invalidados e a navegação retorna aos detalhes.
Atribuição e mudanca de status não fazem parte deste fluxo.

### Atribuição, status e cancelamento

Os detalhes da solicitação oferecem ações operacionais usando os contratos
`PATCH /tickets/{id}/assignee`, `PATCH /tickets/{id}/status`,
`PATCH /tickets/{id}` e `POST /tickets/{id}/cancel`. Administradores e gestores
podem atribuir, trocar e remover responsáveis, alterar prioridade e prazo e
cancelar tickets não terminais. A lista de responsáveis consulta memberships
ativas e apresenta nome, e-mail, papel e status; solicitantes e membros
inativos ou com papel `REQUESTER` não são oferecidos.

A interface exibe somente as transicoes documentadas e permitidas pelo papel:

```text
PENDING     -> IN_PROGRESS | WAITING
IN_PROGRESS -> WAITING | COMPLETED
WAITING     -> IN_PROGRESS | COMPLETED
COMPLETED   -> IN_PROGRESS (reabertura)
CANCELLED   -> nenhuma
```

Estados operacionais exigem responsável. Agentes alteram status apenas quando
o ticket está atribuído a eles; solicitantes não alteram status. Prioridade e
prazo, inclusive remoção do prazo com `null`, ficam restritos a administradores
e gestores e são bloqueados em tickets concluídos ou cancelados.

O cancelamento possui confirmação destrutiva e deixa claro que o registro não
e excluido. Administradores e gestores cancelam tickets não terminais;
solicitantes cancelam apenas os próprios enquanto pendentes. As mutacoes não
fazem atualização otimista: depois da resposta, o detalhe recebe o ticket
atualizado e a listagem e invalidada. Motivo de cancelamento permanece fora
desta entrega.

### Comentários da solicitação

A página `/solicitacoes/[id]` lista e cria comentários sem recarregar a página:

```text
GET  /api/v1/tickets/{ticket_id}/comments
POST /api/v1/tickets/{ticket_id}/comments
```

O `POST` envia somente `{ "content": "..." }`. O conteudo e aparado e deve ter
entre 1 e 5000 caracteres. A resposta contem ID, ticket, conteudo, autor
(`id`, `name`, `avatar_url`) e datas; e-mail, senha e outros dados sensíveis não
são exibidos. A listagem respeita a ordem cronologica fornecida pelo backend e
possui estados de carregamento, erro e vazio.

Usuários com acesso ao ticket podem comentar de acordo com seu papel e vínculo.
Tickets concluídos aceitam comentários; tickets cancelados ocultam o formulário
e o backend confirma a regra, retornando `cancelled_ticket_comment` em caso de
concorrência. Depois do sucesso, a query específica dos comentários e
invalidada e recarregada, sem inserção local otimista, duplicação, reload da
página ou mudanca da posição da tela.

Limitações: não ha edição, exclusão, menções, anexos, paginação ou atualização
em tempo real. Esses recursos permanecem fora da entrega de comentários.

### Timeline do histórico

A página `/solicitacoes/[id]` também consulta o contrato autenticado:

```text
GET /api/v1/tickets/{ticket_id}/history
```

O retorno e exibido como timeline responsiva, preservando a ordem cronologica
crescente fornecida pelo backend: o evento mais antigo permanece no topo. A
seção possui estados de carregamento, erro com nova tentativa e vazio.

As ações `CREATED`, `TITLE_CHANGED`, `DESCRIPTION_CHANGED`,
`CATEGORY_CHANGED`, `PRIORITY_CHANGED`, `DUE_DATE_CHANGED`, `ASSIGNED`,
`ASSIGNEE_CHANGED`, `ASSIGNEE_REMOVED`, `STATUS_CHANGED`, `COMPLETED`,
`REOPENED` e `CANCELLED` possuem traduções centralizadas e não são apresentadas
como códigos crus. Cada evento mostra a descrição da mudanca, autor e data/hora
no timezone local do navegador.

Status e prioridades reutilizam as traduções da interface. Datas ISO são
formatadas com os helpers compartilhados; entidades no formato `ID | nome`
mostram somente o nome; valores ausentes recebem textos de contexto como `Sem
responsável`, `Sem prazo`, `Sem categoria` ou `Não informado`. A interface e
somente leitura: não reordena, filtra, edita ou remove eventos, e o backend
continua controlando visibilidade, auditoria e redação de dados sensíveis.
