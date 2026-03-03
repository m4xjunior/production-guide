# Design: Integração Sage para Validação de Operadores

**Data:** 2026-03-03
**Status:** Aprovado

## Contexto

O sistema SAO atualmente aceita qualquer código de 4 dígitos como operador, sem validação. Precisamos integrar o banco de dados Sage (SQL Server, rede interna) para:
- Validar que o operador existe antes de permitir login
- Mostrar o nome do operador na tela após login válido
- Manter acesso read-only ao Sage (nunca alterar dados)

## Problema de Rede

- O Sage DB está na rede local interna
- O frontend está hospedado na Vercel (nuvem)
- Solução: sync periódico (1 min) do Sage para o Neon DB existente

## Arquitetura

```
[Sage DB (SQL Server)]
       │
       │ cron 1 min (read-only)
       ▼
[Sync Script - Node.js]  ← roda num servidor da rede via `make`
       │
       │ Prisma / HTTPS
       ▼
[Neon DB (PostgreSQL)]    ← nova tabela `Operator`
       │
       │ Prisma ORM
       ▼
[Vercel App (Next.js)]
       │
       ▼
[Operador digita código → valida no Neon → mostra nome]
```

## Model Prisma

```prisma
model Operator {
  id              String   @id @default(uuid())
  sageCode        String   @unique    // código do operário no Sage
  name            String               // nome completo do Sage
  isActive        Boolean  @default(true)
  lastSyncedAt    DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  sessions        OperatorSession[]
}
```

- `sageCode` é o que o operário digita no numpad
- `OperatorSession.operatorNumber` passa a referenciar `Operator.sageCode`
- Read-only do Sage — só o sync script escreve nesta tabela

## Sync Script

```
sync-sage/
├── src/
│   └── index.ts        // script principal
├── package.json        // mssql + @prisma/client
├── .env                // SAGE_HOST, SAGE_USER, SAGE_PASSWORD, DATABASE_URL
└── Makefile            // make sync, make sync-loop
```

- Usa pacote `mssql` (protocolo TDS nativo, sem ODBC)
- Conecta ao Sage via IP:porta (SQL Server)
- `SELECT codigo, nombre FROM [tabela_operadores] WHERE activo = 1`
- Upsert no Neon: se existe atualiza nome/status, se não existe cria
- Operadores que não vêm mais do Sage → `isActive = false`
- Loop: executa a cada 60 segundos
- `make sync-loop` para rodar continuamente

## Flow de Login Atualizado

```
1. Operador digita código (4 dígitos) no numpad
2. Frontend: POST /api/validate/operator { code: "1234" }
3. Backend: Prisma → Operator.findUnique({ where: { sageCode: "1234" } })
4a. Se encontrou e isActive:
    → Retorna { valid: true, name: "João Silva", sageCode: "1234" }
    → Frontend mostra: "Olá, João" com animação
    → Prossegue para seleção de estação
4b. Se não encontrou ou !isActive:
    → Retorna { valid: false }
    → Frontend: shake animation + "Operador não encontrado"
```

## Credenciais

**sync-sage/.env** (servidor local):
```
SAGE_HOST=192.168.x.x
SAGE_PORT=1433
SAGE_USER=sa
SAGE_PASSWORD=admin000
SAGE_DATABASE=SAGE
DATABASE_URL=postgresql://...@neon.tech/neondb
```

**App .env.local** — sem alterações (usa Neon que já está configurado).

## Mapeamento Sage (pendente)

O schema exato da tabela de operadores no Sage precisa ser mapeado quando o IP do servidor for fornecido. Placeholders atuais:
- Tabela: `[a determinar]`
- Código operário: `[a determinar]`
- Nome: `[a determinar]`
- Status ativo: `[a determinar]`

## O que NÃO muda

- Admin panel
- Steps, stations, step-logs
- Middleware (nova rota será pública)
- Fluxo de sessão (só adiciona validação antes)
