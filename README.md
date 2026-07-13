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

As rotas `/login`, `/cadastro` e `/dashboard` existem apenas como placeholders
organizacionais. Autenticacao, sessao, protecao de rotas e dashboard real ainda
nao foram implementados.
