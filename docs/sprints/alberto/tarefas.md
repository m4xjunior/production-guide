# Tareas — Alberto (Bug Fixes)

> Leer cada tarea completa antes de empezar.
> Marcar como `[x]` cuando termines.

---

## Checklist General

- [ ] Bug 1: TypeScript — `$transaction` en tests
- [ ] Bug 2: TypeScript — `check-steps.ts` sin adaptador
- [ ] Bug 3: Verificación final — cero errores TypeScript

---

## Bug 1: Error TypeScript en los tests — `$transaction`

### Qué está fallando

Al ejecutar `npx tsc --noEmit` aparecen estos errores:

```
src/__tests__/api/stations-references.test.ts(72,7): error TS2345
src/__tests__/api/stations-references.test.ts(102,7): error TS2345
src/__tests__/api/step-conditions.test.ts(59,7): error TS2345
src/__tests__/api/step-conditions.test.ts(93,7): error TS2345
```

**Causa:** En los tests se usa `mockImplementation` con el tipo `(fn: (tx: unknown) => Promise<unknown>)`, pero Prisma 7 espera un tipo más específico. TypeScript detecta la incompatibilidad.

### Archivos a modificar

- `src/__tests__/api/stations-references.test.ts`
- `src/__tests__/api/step-conditions.test.ts`

### Fix exacto

**Archivo: `src/__tests__/api/stations-references.test.ts`**

Buscar las dos ocurrencias de este patrón (en las líneas ~71 y ~101):

```typescript
// ❌ CÓDIGO ACTUAL (aparece 2 veces en el archivo)
vi.mocked(prisma.$transaction).mockImplementation(
  async (fn: (tx: unknown) => Promise<unknown>) => {
```

Reemplazar AMBAS ocurrencias por:

```typescript
// ✅ CÓDIGO CORRECTO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
```

> ⚠️ El cuerpo de la función NO cambia — solo cambia la firma `async (fn: ...) => {`

---

**Archivo: `src/__tests__/api/step-conditions.test.ts`**

Buscar las dos ocurrencias del mismo patrón (en las líneas ~58 y ~92):

```typescript
// ❌ CÓDIGO ACTUAL (aparece 2 veces en el archivo)
vi.mocked(prisma.$transaction).mockImplementation(
  async (fn: (tx: unknown) => Promise<unknown>) =>
```

Reemplazar AMBAS por:

```typescript
// ✅ CÓDIGO CORRECTO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
```

### Verificación

```bash
npx tsc --noEmit 2>&1 | grep "step-conditions\|stations-references"
```

Esperado: **sin output** (cero errores en esos archivos).

### Commit

```bash
git add src/__tests__/api/stations-references.test.ts src/__tests__/api/step-conditions.test.ts
git commit -m "fix: corregir tipos $transaction en tests — compatibilidad Prisma 7"
```

---

## Bug 2: Error TypeScript en `check-steps.ts` — adaptador faltante

### Qué está fallando

```
check-steps.ts(4,18): error TS2554: Expected 1 arguments, but got 0.
```

**Causa:** En `check-steps.ts`, `new PrismaClient()` se llama sin argumentos. Pero en este proyecto, Prisma 7 usa el adaptador `@prisma/adapter-pg` — el constructor **requiere** que le pases el adaptador como argumento.

La configuración correcta está en `src/lib/db.ts` como referencia.

### Archivo a modificar

- `check-steps.ts` (en la raíz del proyecto)

### Fix exacto

**Código actual:**

```typescript
import { PrismaClient } from './generated/prisma/client'

async function main() {
  const prisma = new PrismaClient()
  // ...
}
```

**Código correcto (reemplazar todo el archivo):**

```typescript
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

async function main() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  try {
    const steps = await prisma.step.findMany({
      take: 20,
      select: {
        id: true,
        mensaje: true,
        voz: true,
        vozAudioUrl: true,
      }
    })
    console.log(JSON.stringify(steps, null, 2))
  } catch (e) {
    console.error("Query error:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
```

### Verificación

```bash
npx tsc --noEmit 2>&1 | grep "check-steps"
```

Esperado: **sin output**.

### Commit

```bash
git add check-steps.ts
git commit -m "fix: check-steps.ts — pasar adaptador PrismaPg al constructor PrismaClient"
```

---

## Bug 3: Verificación Final

### Qué hacer

Después de completar los Bug 1 y Bug 2:

**Paso 1: Verificar cero errores TypeScript**

```bash
npx tsc --noEmit
```

Esperado: **sin output** (cero errores).

**Paso 2: Ejecutar los tests**

```bash
npx vitest run
```

Esperado: todos los tests en verde (o al menos los mismos que pasaban antes — no deben aparecer tests nuevos fallando).

**Paso 3: Actualizar progresso.md**

Marcar los tres bugs como completados en `docs/sprints/alberto/progresso.md`.

**Paso 4: Push de la rama**

```bash
git push origin alberto
```

Luego avisas a Max para que revise y haga merge.

---

## Referencia: Contexto Técnico

### ¿Qué es Prisma 7 con adaptador?

Prisma es la librería que conecta la app con la base de datos. En versiones antiguas, `new PrismaClient()` no necesitaba argumentos. En Prisma 7 con adaptador de drivers (como este proyecto), el constructor **exige** que le pases el adaptador de conexión. El adaptador `PrismaPg` es el que gestiona la conexión a PostgreSQL.

### ¿Por qué `any` en los tests?

Los tests simulan (`mock`) el comportamiento de `$transaction`. TypeScript quiere que el tipo de la función simulada coincida exactamente con el tipo real de Prisma — pero el tipo real es muy complejo. Usar `any` es la forma estándar de decirle a TypeScript "confía en mí, esto está bien" en contextos de test donde el tipo exacto no importa.

### ¿Qué son estos tests?

Son tests automáticos que verifican que las rutas de la API funcionan correctamente sin necesidad de conectarse a la base de datos real. Al corregir estos errores TypeScript, los tests pueden compilar y ejecutarse.
