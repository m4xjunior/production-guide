# CLAUDE.md — Instruções para o agente

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Prisma 7** com PostgreSQL (Neon) — multi-tenant
- **Vercel** (deploy automático via push em `main`)
- **Sentry** para monitoramento de erros

## Banco de dados (Prisma + Neon)

### Migrations são automáticas no deploy

O build já inclui `prisma migrate deploy` antes de `next build`.
Sempre que há um push em `main`, a Vercel roda as migrations pendentes automaticamente.
**Não é necessário rodar migrations manualmente em circunstâncias normais.**

### Quando criar uma nova migration

Após alterar `prisma/schema.prisma`, gerar a migration:

```bash
npx prisma migrate dev --name descricao_da_mudanca
```

Isso gera o arquivo em `prisma/migrations/` e deve ser commitado junto com o schema.

### Se precisar rodar migrations manualmente em produção

```bash
vercel env pull --environment=production .env.production.local
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d'"' -f2) npx prisma migrate deploy
rm .env.production.local
```

### Regras para rotas API com Prisma multi-tenant

Toda rota que lê ou escreve dados **deve filtrar por tenantId**.
O middleware já injeta `x-tenant-id` em todos os requests — basta ler o header:

```ts
// Em qualquer route handler:
const tenantId = request.headers.get("x-tenant-id");

// No findMany:
where: { tenantId, ...outrosFiltros }

// No create:
data: { tenantId, ...outrosCampos }
```

**Nunca fazer create sem tenantId** — o campo é NOT NULL no banco.

## Deploy

Push em `main` → Vercel faz deploy automático em `p2v.lexusfx.com`.
Para forçar um deploy manual: `vercel --prod`

## Erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `table X does not exist` | Migration não aplicada | Já resolvido: build roda `prisma migrate deploy` |
| `Argument tenant is missing` | Route não passa `tenantId` | Ler `x-tenant-id` do header e incluir no create |
| `DEPRECATION WARNING @sentry/nextjs` | Opções fora de `webpack: {}` | Mover para `webpack: { ... }` em `next.config.ts` |
| `DROP INDEX ... depends on it` | FK depende do índice | Dropar a FK antes de dropar o índice na migration |
