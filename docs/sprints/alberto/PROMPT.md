# Alberto — Sprint Corrección de Bugs

## Tu Misión

Eres el agente de Alberto. Tu trabajo es **corregir los bugs activos** del proyecto **PicktVoice (P2V)** — una app de guía de producción industrial con reconocimiento de voz.

## Cómo Usar Esta Documentación

1. Lee este archivo completo antes de empezar
2. Lee `tarefas.md` — lista de bugs a corregir
3. Por cada bug: aplica el fix, verifica, y marca como completado en `progresso.md`
4. Haz commit de cada fix por separado con el mensaje indicado

---

## Contexto del Proyecto

**Nombre:** PicktVoice (P2V)
**Stack:** Next.js 15 + TypeScript + Prisma 7 + PostgreSQL + React 19
**Deploy:** Vercel automático en `p2v.lexusfx.com` (push en `main` → deploy)
**Branch de trabajo:** `alberto` → merge en `main` cuando esté todo listo

### Arquitectura Rápida

```
src/
├── app/                    # Páginas y API routes (Next.js 15 App Router)
│   ├── page.tsx            # Página principal — flujo de producción
│   ├── api/                # API REST
│   │   └── stations/[id]/steps/route.ts   # Pasos de cada estación
├── hooks/                  # React hooks personalizados
│   ├── useElevenStepConversation.ts  # Hook de voz (ElevenLabs)
│   └── useContinuousSpeechRecognition.ts  # Web Speech API fallback
├── lib/
│   ├── gcs.ts              # Google Cloud Storage (fotos, audio)
│   └── db.ts               # Cliente Prisma
src/__tests__/              # Tests (Vitest)
check-steps.ts              # Script utilitario
```

### Flujo de la App

1. Operario hace login con PIN de 4 dígitos
2. Selecciona una estación de trabajo
3. La app guía paso a paso: muestra foto + reproduce audio (voz TTS)
4. Operario repite la instrucción en voz alta → reconocimiento verifica
5. Si coincide → avanza al siguiente paso

---

## Reglas Obligatorias

1. **Rama de trabajo:** siempre trabaja en la rama `alberto`
2. **Un commit por bug** — nunca mezclar fixes en un solo commit
3. **Formato de commit:** `fix: descripción breve del problema resuelto`
4. **No tocar** archivos fuera de los listados en cada tarea
5. **Verificar** antes de hacer commit — ejecutar el comando de verificación indicado

---

## Documentos a Leer

```
docs/sprints/alberto/tarefas.md      # Lista de bugs (LEER ANTES DE EMPEZAR)
docs/sprints/alberto/progresso.md    # Registro de progreso (ACTUALIZAR SIEMPRE)
docs/plans/2026-03-03-bugfix-quality-industrial-plan.md  # Plan técnico detallado
```

---

## Comandos Útiles

```bash
# Ver errores TypeScript
npx tsc --noEmit

# Ejecutar tests
npx vitest run

# Verificar que el build compila
npm run build

# Ver estado de git
git status
git log --oneline -10
```

---

## Cómo Hacer Commit

```bash
# 1. Ver qué archivos cambiaste
git status

# 2. Agregar los archivos del fix
git add src/ruta/al/archivo.ts

# 3. Hacer commit con el mensaje indicado en cada tarea
git commit -m "fix: descripción del bug resuelto"
```

---

## Al Terminar Todo

Cuando todas las tareas estén en verde en `progresso.md`:

```bash
# Verificación final
npx tsc --noEmit
npx vitest run

# Push de la rama
git push origin alberto
```

Luego avisas a Max para que haga el merge en `main`.
