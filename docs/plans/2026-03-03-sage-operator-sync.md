# Sage Operator Sync — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate operators against Sage DB (SQL Server) by syncing operator data to Neon every 60s, and show operator name on login.

**Architecture:** A standalone sync script (Node.js + `mssql`) runs on a network server, reads operators from Sage read-only, and upserts into a new `Operator` table in Neon via Prisma. The Vercel app validates login codes against this table instantly.

**Tech Stack:** Prisma 7.4, `mssql` (TDS protocol), Next.js 15 API routes, React 19

---

### Task 1: Create feature branch

**Step 1: Create and switch to branch**

```bash
git checkout -b feat/sage-operator-validation
```

**Step 2: Verify branch**

```bash
git branch --show-current
```

Expected: `feat/sage-operator-validation`

---

### Task 2: Add `Operator` model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma:53-69` (add model before OperatorSession, update OperatorSession)

**Step 1: Add Operator model to `prisma/schema.prisma`**

Add this **before** the `OperatorSession` model (line 53):

```prisma
/// Operadores sincronizados desde Sage (read-only desde Sage, sync cada 60s)
model Operator {
  id           String   @id @default(uuid()) @db.Uuid
  sageCode     String   @unique @map("sage_code") /// Código del operario en Sage
  name         String   /// Nombre completo del operario
  isActive     Boolean  @default(true) @map("is_active")
  lastSyncedAt DateTime @default(now()) @map("last_synced_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  sessions OperatorSession[]

  @@map("operators")
}
```

**Step 2: Update OperatorSession to reference Operator**

In the `OperatorSession` model, add optional relation to `Operator`:

```prisma
model OperatorSession {
  id             String    @id @default(uuid()) @db.Uuid
  operatorNumber String    @map("operator_number")
  stationId      String    @map("station_id") @db.Uuid
  loginAt        DateTime  @default(now()) @map("login_at") @db.Timestamptz
  logoutAt       DateTime? @map("logout_at") @db.Timestamptz
  completedUnits Int       @default(0) @map("completed_units")
  isActive       Boolean   @default(true) @map("is_active")

  station  Station   @relation(fields: [stationId], references: [id], onDelete: Cascade)
  operator Operator? @relation(fields: [operatorNumber], references: [sageCode])
  stepLogs StepLog[]

  @@index([stationId])
  @@index([operatorNumber])
  @@index([isActive])
  @@map("operator_sessions")
}
```

**Step 3: Generate Prisma client and create migration**

```bash
npx prisma generate
npx prisma migrate dev --name add-operator-model
```

Expected: Migration created successfully, new `operators` table in DB.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Operator model synced from Sage"
```

---

### Task 3: Add `Operator` type to frontend types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add Operator interface**

Add at the top of `src/types/index.ts`:

```typescript
export interface Operator {
  id: string;
  sageCode: string;
  name: string;
  isActive: boolean;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Operator type"
```

---

### Task 4: Create `/api/validate/operator` endpoint

**Files:**
- Create: `src/app/api/validate/operator/route.ts`
- Modify: `src/middleware.ts:36-39` (add to RUTAS_OPERARIO)

**Step 1: Create the API route**

Create `src/app/api/validate/operator/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/validate/operator
 * Valida si un código de operario existe en la tabla de operadores (sincronizada desde Sage).
 * Body: { code: "1234" }
 * Returns: { valid: true, name: "João Silva", sageCode: "1234" } | { valid: false }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "El campo 'code' es obligatorio" },
        { status: 400 },
      );
    }

    const operator = await prisma.operator.findUnique({
      where: { sageCode: code },
    });

    if (!operator || !operator.isActive) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      name: operator.name,
      sageCode: operator.sageCode,
    });
  } catch (error) {
    console.error("Error validating operator:", error);
    return NextResponse.json(
      { valid: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
```

**Step 2: Add route to middleware's public operator routes**

In `src/middleware.ts:35-39`, add `/api/validate/operator` to `RUTAS_OPERARIO`:

```typescript
const RUTAS_OPERARIO = [
  "/api/sessions",
  "/api/step-logs",
  "/api/validate/barcode",
  "/api/validate/operator",
];
```

**Step 3: Verify the route responds**

```bash
curl -s -X POST http://localhost:3000/api/validate/operator \
  -H "Content-Type: application/json" \
  -d '{"code":"9999"}' | jq .
```

Expected: `{ "valid": false }`

**Step 4: Commit**

```bash
git add src/app/api/validate/operator/route.ts src/middleware.ts
git commit -m "feat: add operator validation endpoint"
```

---

### Task 5: Update OperatorLogin to validate against Sage

**Files:**
- Modify: `src/components/OperatorLogin.tsx`

**Step 1: Update OperatorLoginProps interface**

Change the `onLogin` callback to receive both code and name:

```typescript
interface OperatorLoginProps {
  onLogin: (operatorNumber: string, operatorName: string) => void;
}
```

**Step 2: Add validation state and logic**

Add states after line 16:

```typescript
const [validating, setValidating] = useState(false);
const [operatorName, setOperatorName] = useState("");
const [validated, setValidated] = useState(false);
```

**Step 3: Replace handleSubmit with validation call**

Replace the existing `handleSubmit` (lines 41-49) with:

```typescript
const handleSubmit = useCallback(async () => {
  if (operatorNumber.length !== 4) {
    setError("El número de operario debe tener 4 dígitos");
    setShake(true);
    setTimeout(() => setShake(false), 500);
    return;
  }

  setValidating(true);
  setError("");

  try {
    const res = await fetch("/api/validate/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: operatorNumber }),
    });

    const data = await res.json();

    if (data.valid) {
      setOperatorName(data.name);
      setValidated(true);
      // Brief delay to show the name, then proceed
      setTimeout(() => {
        onLogin(operatorNumber, data.name);
      }, 1500);
    } else {
      setError("Operario no encontrado");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  } catch {
    setError("Error de conexión");
    setShake(true);
    setTimeout(() => setShake(false), 500);
  } finally {
    setValidating(false);
  }
}, [operatorNumber, onLogin]);
```

**Step 4: Add welcome overlay after PIN display**

After the error message block (after line ~175), add a validated state display:

```tsx
{/* Validated operator name */}
{validated && operatorName && (
  <div className="mt-4 text-center animate-fadeIn">
    <p className="text-sm text-[#6B6B6B] tracking-wide">Bienvenido</p>
    <p className="text-lg font-semibold text-[#E8E8E8] tracking-wide mt-1">
      {operatorName}
    </p>
  </div>
)}
```

**Step 5: Add loading state to Enter button**

Update the main Enter button text (line ~262-263) to show spinner while validating:

```tsx
{validating ? (
  <Loader2 className="h-5 w-5 animate-spin" />
) : (
  <>
    <LogIn className="h-5 w-5" />
    Entrar
  </>
)}
```

Add `Loader2` to the lucide-react import at line 4:

```typescript
import { Delete, LogIn, Settings2, Loader2 } from "lucide-react";
```

Also disable buttons while validating — add `disabled={validating}` to both submit buttons and numpad.

**Step 6: Commit**

```bash
git add src/components/OperatorLogin.tsx
git commit -m "feat: validate operator against Sage-synced data on login"
```

---

### Task 6: Update Home page to pass operator name through

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add operatorName state**

After line 25 (`const [operatorNumber, setOperatorNumber] = useState("")`), add:

```typescript
const [operatorName, setOperatorName] = useState("");
```

**Step 2: Update handleLogin to receive name**

Change `handleLogin` (line 95-98):

```typescript
const handleLogin = useCallback(async (operator: string, name: string) => {
  setOperatorNumber(operator);
  setOperatorName(name);
  setAppState("station-selection");
}, []);
```

**Step 3: Update session restore to include name**

In the session save effect (line 86), add `operatorName`:

```typescript
sessionStorage.setItem("p2v_session", JSON.stringify({
  operatorNumber,
  operatorName,
  sessionId,
  stationId: selectedStationId,
  currentStepIndex,
}));
```

In the session restore effect (line 63), add:

```typescript
setOperatorName(data.operatorName || "");
```

**Step 4: Pass operatorName to StationSelector**

Update StationSelector call (line ~226) to pass `operatorName`:

```tsx
<StationSelector
  operatorNumber={operatorNumber}
  operatorName={operatorName}
  onStationSelected={handleStationSelected}
  onBack={() => {
    setAppState("login");
    setOperatorNumber("");
    setOperatorName("");
  }}
/>
```

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: pass operator name through app flow"
```

---

### Task 7: Create the sync-sage script

**Files:**
- Create: `sync-sage/package.json`
- Create: `sync-sage/src/index.ts`
- Create: `sync-sage/.env.example`
- Create: `sync-sage/tsconfig.json`

**Step 1: Create sync-sage directory and package.json**

Create `sync-sage/package.json`:

```json
{
  "name": "sage-operator-sync",
  "version": "1.0.0",
  "private": true,
  "description": "Syncs operators from Sage SQL Server to Neon PostgreSQL",
  "scripts": {
    "sync": "tsx src/index.ts",
    "sync:once": "SYNC_ONCE=true tsx src/index.ts"
  },
  "dependencies": {
    "mssql": "^11.0.1",
    "@prisma/client": "^7.4.2",
    "@prisma/adapter-pg": "^7.4.2"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.0.0",
    "@types/mssql": "^9.1.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `sync-sage/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Create .env.example**

Create `sync-sage/.env.example`:

```
# Sage SQL Server (rede interna)
SAGE_HOST=192.168.x.x
SAGE_PORT=1433
SAGE_USER=sa
SAGE_PASSWORD=admin000
SAGE_DATABASE=SAGE

# Tabela e colunas de operadores no Sage (ajustar após mapeamento)
SAGE_OPERATOR_TABLE=OPERARIOS
SAGE_CODE_COLUMN=CODIGO
SAGE_NAME_COLUMN=NOMBRE

# Neon PostgreSQL
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require

# Intervalo de sync em segundos
SYNC_INTERVAL=60
```

**Step 4: Create sync script**

Create `sync-sage/src/index.ts`:

```typescript
import sql from "mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Config ──
const SAGE_CONFIG: sql.config = {
  server: process.env.SAGE_HOST || "localhost",
  port: parseInt(process.env.SAGE_PORT || "1433"),
  user: process.env.SAGE_USER || "sa",
  password: process.env.SAGE_PASSWORD || "",
  database: process.env.SAGE_DATABASE || "SAGE",
  options: {
    encrypt: false, // rede interna
    trustServerCertificate: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 15000,
};

const SAGE_TABLE = process.env.SAGE_OPERATOR_TABLE || "OPERARIOS";
const SAGE_CODE_COL = process.env.SAGE_CODE_COLUMN || "CODIGO";
const SAGE_NAME_COL = process.env.SAGE_NAME_COLUMN || "NOMBRE";
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || "60") * 1000;
const SYNC_ONCE = process.env.SYNC_ONCE === "true";

// ── Prisma (Neon) ──
function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

const prisma = createPrisma();

// ── Sync Logic ──
async function syncOperators(): Promise<void> {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Sync iniciado...`);

  let pool: sql.ConnectionPool | null = null;

  try {
    // 1. Connect to Sage
    pool = await sql.connect(SAGE_CONFIG);

    // 2. Read operators (read-only query)
    const result = await pool.request().query(
      `SELECT ${SAGE_CODE_COL} AS code, ${SAGE_NAME_COL} AS name FROM ${SAGE_TABLE}`
    );

    const sageOperators = result.recordset as { code: string; name: string }[];
    console.log(`  Sage: ${sageOperators.length} operadores encontrados`);

    if (sageOperators.length === 0) {
      console.log("  AVISO: Sage retornou 0 operadores. Pulando sync para não desativar todos.");
      return;
    }

    // 3. Upsert each operator
    const now = new Date();
    let created = 0;
    let updated = 0;

    for (const op of sageOperators) {
      const code = String(op.code).trim();
      const name = String(op.name).trim();
      if (!code) continue;

      const existing = await prisma.operator.findUnique({
        where: { sageCode: code },
      });

      if (existing) {
        if (existing.name !== name || !existing.isActive) {
          await prisma.operator.update({
            where: { sageCode: code },
            data: { name, isActive: true, lastSyncedAt: now },
          });
          updated++;
        } else {
          await prisma.operator.update({
            where: { sageCode: code },
            data: { lastSyncedAt: now },
          });
        }
      } else {
        await prisma.operator.create({
          data: { sageCode: code, name, isActive: true, lastSyncedAt: now },
        });
        created++;
      }
    }

    // 4. Deactivate operators not in Sage anymore
    const sageCodes = sageOperators.map((op) => String(op.code).trim()).filter(Boolean);
    const deactivated = await prisma.operator.updateMany({
      where: {
        sageCode: { notIn: sageCodes },
        isActive: true,
      },
      data: { isActive: false, lastSyncedAt: now },
    });

    const elapsed = Date.now() - startTime;
    console.log(
      `  Resultado: +${created} criados, ~${updated} atualizados, -${deactivated.count} desativados (${elapsed}ms)`
    );
  } catch (error) {
    console.error("  ERRO no sync:", error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// ── Main Loop ──
async function main(): Promise<void> {
  console.log("=== Sage Operator Sync ===");
  console.log(`  Sage: ${SAGE_CONFIG.server}:${SAGE_CONFIG.port}/${SAGE_CONFIG.database}`);
  console.log(`  Tabela: ${SAGE_TABLE} (${SAGE_CODE_COL}, ${SAGE_NAME_COL})`);
  console.log(`  Intervalo: ${SYNC_INTERVAL / 1000}s`);
  console.log("");

  // First sync
  await syncOperators();

  if (SYNC_ONCE) {
    console.log("Modo single-run. Encerrando.");
    await prisma.$disconnect();
    process.exit(0);
  }

  // Loop
  setInterval(syncOperators, SYNC_INTERVAL);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nEncerrando sync...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nEncerrando sync...");
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
```

**Step 5: Add sync targets to root Makefile**

Add to `Makefile` at the end:

```makefile
## Sage Sync
sage-sync-install:
	cd sync-sage && npm install

sage-sync:
	cd sync-sage && npm run sync

sage-sync-once:
	cd sync-sage && npm run sync:once
```

**Step 6: Install sync-sage dependencies**

```bash
cd sync-sage && npm install && cd ..
```

**Step 7: Commit**

```bash
git add sync-sage/ Makefile
git commit -m "feat: add Sage operator sync script"
```

---

### Task 8: Update StationSelector to show operator name

**Files:**
- Modify: `src/components/StationSelector.tsx` (add `operatorName` prop, display it)

**Step 1: Add `operatorName` to StationSelector props**

Find the interface and add:

```typescript
operatorName?: string;
```

**Step 2: Display operator name in the header**

Where the operator number is shown, add the name below it:

```tsx
{operatorName && (
  <span className="text-sm text-[#A1A1AA]">{operatorName}</span>
)}
```

**Step 3: Commit**

```bash
git add src/components/StationSelector.tsx
git commit -m "feat: show operator name in station selector"
```

---

### Task 9: Update reports to include operator name

**Files:**
- Modify: `src/app/api/reports/presence/route.ts` (join with Operator table)
- Modify: `src/app/api/reports/production/route.ts` (join with Operator table)

**Step 1: Update presence report to include operator name**

In the presence report query, add an include/join for the operator:

```typescript
const sessions = await prisma.operatorSession.findMany({
  // ...existing query...
  include: {
    station: true,
    operator: { select: { name: true } },
  },
});
```

Map the results to include `operatorName`:

```typescript
operatorName: s.operator?.name || null,
```

**Step 2: Same for production report**

**Step 3: Commit**

```bash
git add src/app/api/reports/
git commit -m "feat: include operator name in reports"
```

---

### Task 10: Add .gitignore entries and clean up

**Files:**
- Modify: `.gitignore` (add sync-sage/.env, sync-sage/node_modules)

**Step 1: Add gitignore entries**

```
# Sage sync
sync-sage/.env
sync-sage/node_modules/
sync-sage/dist/
```

**Step 2: Final commit**

```bash
git add .gitignore
git commit -m "chore: add sync-sage to gitignore"
```

---

## Pending: Sage Schema Mapping

When the Sage server IP is provided, connect and run:

```sql
-- List all tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Find operator-related tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%OPER%' OR TABLE_NAME LIKE '%EMPL%' OR TABLE_NAME LIKE '%TRAB%';

-- Describe columns
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '[found_table]';
```

Then update `sync-sage/.env` with correct table/column names.
