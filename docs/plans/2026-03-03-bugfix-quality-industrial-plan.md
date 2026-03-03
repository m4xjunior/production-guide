# Bugfix + Qualidade Industrial — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir os 5 bugs raiz que causam erros de console, voz muda e múltiplas instâncias; migrar para produção.

**Architecture:** Cirúrgica — nenhuma nova abstração. Cada fix toca o mínimo necessário: (1) signed URLs geradas na API antes de retornar steps, (2) `onMatch` em ref para estabilizar o hook ElevenLabs, (3) `loadSteps` em `useCallback`, (4) build de produção com PM2.

**Tech Stack:** Next.js 15, React 19, Prisma + PostgreSQL, ElevenLabs SDK `@elevenlabs/react`, Google Cloud Storage `@google-cloud/storage`, PM2 (process manager).

---

## Task 1: GCS — Signed URLs para `vozAudioUrl` e `photoUrl`

**Problema:** `vozAudioUrl` e `photoUrl` guardados no banco são URLs públicas do GCS (`https://storage.googleapis.com/...`) mas o bucket é privado → HTTP 403 → áudio não toca e imagens não aparecem.

**Fix:** A API `GET /api/stations/[id]/steps` gera signed URLs de 7 dias para cada step antes de retornar. GCS serve direto ao browser, nenhum proxy.

**Files:**
- Modify: `src/lib/gcs.ts` — adicionar `batchSignedUrls()`
- Modify: `src/app/api/stations/[id]/steps/route.ts` — transformar URLs na resposta GET

---

**Step 1: Adicionar `batchSignedUrls` em `gcs.ts`**

Abrir `src/lib/gcs.ts` e adicionar ao final do arquivo:

```typescript
// ─── Batch Signed URLs ─────────────────────────────────────────────────────
/**
 * Converte uma URL pública do GCS (`https://storage.googleapis.com/BUCKET/tenants/...`)
 * numa signed URL de `expiresInMinutes` minutos.
 * Se a URL não pertencer ao bucket configurado, retorna a URL original intacta.
 */
export async function signPublicUrl(
  publicUrl: string,
  expiresInMinutes = 60 * 24 * 7, // 7 dias
): Promise<string> {
  const prefix = `https://storage.googleapis.com/${BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) return publicUrl;

  const gcsObjectPath = publicUrl.slice(prefix.length); // "tenants/p2v/tts/xxx.mp3"
  const file = bucket().file(gcsObjectPath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    version: "v4",
  });
  return url;
}

/**
 * Assina em paralelo uma lista de URLs públicas do GCS.
 * Retorna as originais para entradas null/undefined ou fora do bucket.
 */
export async function signPublicUrls(
  urls: (string | null | undefined)[],
  expiresInMinutes = 60 * 24 * 7,
): Promise<(string | null)[]> {
  return Promise.all(
    urls.map((url) =>
      url ? signPublicUrl(url, expiresInMinutes).catch(() => url) : Promise.resolve(null),
    ),
  );
}
```

**Step 2: Atualizar a rota GET steps para assinar as URLs**

Abrir `src/app/api/stations/[id]/steps/route.ts`, localizar o handler `GET` e substituir o `return NextResponse.json({ steps })` pela versão que assina URLs:

```typescript
import { signPublicUrls } from "@/lib/gcs";

// ... dentro do GET, após o findMany:
    const steps = await prisma.step.findMany({
      where: { stationId: id },
      orderBy: { orderNum: "asc" },
    });

    // Assinar vozAudioUrl e photoUrl em paralelo
    const vozUrls = steps.map((s) => s.vozAudioUrl);
    const photoUrls = steps.map((s) => s.photoUrl);

    const [signedVoz, signedPhoto] = await Promise.all([
      signPublicUrls(vozUrls),
      signPublicUrls(photoUrls),
    ]);

    const signedSteps = steps.map((s, i) => ({
      ...s,
      vozAudioUrl: signedVoz[i],
      photoUrl: signedPhoto[i],
    }));

    return NextResponse.json({ steps: signedSteps });
```

**Step 3: Verificar manualmente**

```bash
# 1. Buscar steps de qualquer estação via API (substitua [STATION_ID] por um ID real)
curl http://localhost:3000/api/stations/[STATION_ID]/steps | python3 -m json.tool | grep "vozAudioUrl" | head -3
```

Esperado: URLs contendo `?X-Goog-Signature=` em vez de apenas `https://storage.googleapis.com/...`

```bash
# 2. Testar que a URL retorna 200
SIGNED_URL=$(curl -s http://localhost:3000/api/stations/[STATION_ID]/steps | python3 -c "import json,sys; steps=json.load(sys.stdin)['steps']; print(next((s['vozAudioUrl'] for s in steps if s['vozAudioUrl']), ''))")
curl -s -o /dev/null -w "%{http_code}" "$SIGNED_URL"
```

Esperado: `200`

**Step 4: Commit**

```bash
git add src/lib/gcs.ts src/app/api/stations/[id]/steps/route.ts
git commit -m "fix: signed URLs de 7 dias para vozAudioUrl e photoUrl — corrige GCS 403"
```

---

## Task 2: Infinite Re-render — `onMatch` em ref no hook ElevenLabs

**Problema:** `onMatch` é passado como função inline para `useElevenStepConversation` a cada render de `ProductionStep` → `checkMatch` (que depende de `onMatch`) recria → `useConversation.onMessage` vê novo callback → loop infinito "Maximum update depth exceeded".

**Files:**
- Modify: `src/hooks/useElevenStepConversation.ts`

---

**Step 1: Estabilizar `onMatch` com ref**

No arquivo `src/hooks/useElevenStepConversation.ts`, localizar a linha onde `onMatch` é desestruturado dos parâmetros da função. Após a desestruturação dos parâmetros, adicionar:

```typescript
  const onMatchRef = useRef(onMatch);
  useEffect(() => {
    onMatchRef.current = onMatch;
  });
```

**Step 2: Atualizar `checkMatch` para usar ref**

Localizar o `useCallback` de `checkMatch`. Remover `onMatch` das deps e usar `onMatchRef.current` na chamada:

```typescript
  const checkMatch = useCallback(
    (heardRaw: string) => {
      if (!heardRaw || isTTSSpeakingRef.current) return;

      const heard = normalize(heardRaw);
      const expected = normalize(expectedResponse);

      if (!heard || !expected) return;

      const isMatch =
        heard.includes(expected) ||
        expected.includes(heard) ||
        (expected.includes("pin bueno") &&
          (heard.includes("pin bueno") ||
            heard.includes("pinbueno") ||
            heard.includes("pin buen") ||
            heard.includes("bueno"))) ||
        (heard.length >= 3 &&
          expected.length >= 3 &&
          (expected.startsWith(heard.slice(0, 3)) ||
            heard.startsWith(expected.slice(0, 3))));

      if (!isMatch) return;

      if (lastMatchedRef.current === heard) return;
      lastMatchedRef.current = heard;
      onMatchRef.current(); // ← usa ref, não onMatch direto
    },
    [expectedResponse], // ← removido onMatch das deps
  );
```

**Step 3: Verificar no browser**

```bash
# Abrir http://localhost:3000 no browser, fazer login (qualquer 4 dígitos),
# selecionar uma estação, entrar no primeiro passo.
# Verificar no console: zero erros "Maximum update depth exceeded"
```

**Step 4: Commit**

```bash
git add src/hooks/useElevenStepConversation.ts
git commit -m "fix: estabiliza onMatch com ref em useElevenStepConversation — elimina loop infinito"
```

---

## Task 3: `loadSteps` instável em `page.tsx`

**Problema:** `loadSteps` é função async declarada inline sem `useCallback` dentro do componente. É chamada em `useEffect` com `// eslint-disable-next-line react-hooks/exhaustive-deps`. Se `preload` mudar (improvável mas possível), o efeito não re-executa. O padrão correto é `useCallback`.

**Files:**
- Modify: `src/app/page.tsx`

---

**Step 1: Converter `loadSteps` para `useCallback`**

Localizar a declaração `const loadSteps = async (stationId: string)...` e substituir por:

```typescript
  const loadSteps = useCallback(async (stationId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stations/${stationId}/steps`);
      if (!res.ok) throw new Error("Error al cargar pasos");
      const data = await res.json();
      const stepsList = data.steps ?? data;
      setSteps(stepsList);

      const audioUrls = stepsList
        .map((s: Step) => s.vozAudioUrl)
        .filter(Boolean) as string[];
      if (audioUrls.length > 0) {
        preload(audioUrls);
      }

      return stepsList.length > 0;
    } catch (err) {
      console.error("Error loading steps:", err);
      return false;
    }
  }, [preload]);
```

**Step 2: Remover o eslint-disable do useEffect de restore de sessão**

Localizar o `useEffect` de restore de sessão e adicionar `loadSteps` nas deps:

```typescript
  useEffect(() => {
    const savedSession = sessionStorage.getItem("p2v_session");
    if (savedSession) {
      try {
        const data = JSON.parse(savedSession);
        if (data.operatorNumber && data.sessionId && data.stationId) {
          setOperatorNumber(data.operatorNumber);
          setSessionId(data.sessionId);
          setSelectedStationId(data.stationId);
          setCurrentStepIndex(data.currentStepIndex || 0);
          loadSteps(data.stationId).then(() => {
            setAppState("production");
          });
        }
      } catch {
        sessionStorage.removeItem("p2v_session");
      }
    }
  }, [loadSteps]); // ← dep explícita, sem eslint-disable
```

**Step 3: Verificar TypeScript**

```bash
cd "/Users/maxmeireles/Library/Mobile Documents/com~apple~CloudDocs/Proyectos/Proyectos Abiertos/production-guide-main"
npx tsc --noEmit 2>&1 | head -30
```

Esperado: zero erros.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix: loadSteps em useCallback com deps explícitas em page.tsx"
```

---

## Task 4: Build de produção + PM2

**Problema:** App roda em `next dev` — overhead de hot-reload, DevTools toolbar, múltiplas instâncias possíveis.

**Fix:** Build de produção via `next build`, servidor via PM2, Makefile atualizado.

---

**Step 1: Instalar PM2 globalmente (se não instalado)**

```bash
which pm2 || npm install -g pm2
pm2 --version
```

**Step 2: Garantir que o `next dev` atual está parado**

```bash
# Verificar processos
ps aux | grep "next" | grep -v grep

# Matar tudo next
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Confirmar zero processos
ps aux | grep "next-server" | grep -v grep | wc -l
```

Esperado: `0`

**Step 3: Build de produção**

```bash
cd "/Users/maxmeireles/Library/Mobile Documents/com~apple~CloudDocs/Proyectos/Proyectos Abiertos/production-guide-main"
DATABASE_URL=postgresql://p2v:p2v_secret@localhost:54320/picktvoice npm run build 2>&1 | tail -30
```

Esperado: `✓ Compiled successfully` sem erros TypeScript. Se houver erros, corrigir antes de prosseguir.

**Step 4: Criar ecosystem.config.js para PM2**

Criar arquivo `ecosystem.config.js` na raiz do projeto:

```javascript
module.exports = {
  apps: [
    {
      name: "p2v",
      script: "node_modules/.bin/next",
      args: "start --port 3000",
      cwd: "/Users/maxmeireles/Library/Mobile Documents/com~apple~CloudDocs/Proyectos/Proyectos Abiertos/production-guide-main",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://p2v:p2v_secret@localhost:54320/picktvoice",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/tmp/p2v-error.log",
      out_file: "/tmp/p2v-out.log",
    },
  ],
};
```

**Step 5: Iniciar com PM2**

```bash
cd "/Users/maxmeireles/Library/Mobile Documents/com~apple~CloudDocs/Proyectos/Proyectos Abiertos/production-guide-main"
pm2 start ecosystem.config.js
pm2 status
```

Esperado: app `p2v` em status `online`.

**Step 6: Verificar que está respondendo**

```bash
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Esperado: `200`

**Step 7: Atualizar `Makefile` com targets de produção**

Adicionar ao Makefile (após o target `start` existente):

```makefile
## Produção com PM2
start-prod: build
	pm2 start ecosystem.config.js

stop-prod:
	pm2 stop p2v

restart-prod: build
	pm2 restart p2v

logs-prod:
	pm2 logs p2v --lines 100

status-prod:
	pm2 status

build:
	DATABASE_URL=$(DB_URL) npm run build
```

**Step 8: Salvar PM2 para auto-restart no boot**

```bash
pm2 save
# Opcional: pm2 startup  (gera comando launchd/systemd para autostart)
```

**Step 9: Commit**

```bash
cd "/Users/maxmeireles/Library/Mobile Documents/com~apple~CloudDocs/Proyectos/Proyectos Abiertos/production-guide-main"
git add ecosystem.config.js Makefile
git commit -m "feat: produção com PM2 — single instance, autorestart, Makefile targets"
```

---

## Task 5: Verificação Final — Zero erros de console

**Step 1: Abrir a app no browser**

Navegar para `http://localhost:3000` (ou `https://p2v.lexusfx.com` no celular).

**Step 2: Abrir DevTools → Console, filtrar por Errors**

Fazer o fluxo completo:
1. Login com PIN de 4 dígitos
2. Selecionar uma estação
3. Avançar pelo menos 3 passos
4. Observar o console

**Step 3: Critérios de sucesso**

- [ ] Zero erros "Maximum update depth exceeded"
- [ ] Zero erros "Failed to load resource" para `tts/*.mp3`
- [ ] Zero erros "Failed to load resource" para `products/*.png`
- [ ] Áudio TTS toca automaticamente nos passos com `vozAudioUrl`
- [ ] `pm2 status` mostra 1 instância `p2v` em `online`

**Step 4: Commit final (se necessário)**

```bash
git add -A
git commit -m "fix: zero erros de console — voz, imagens e re-render resolvidos"
```

---

## Resumo dos Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---|---|---|
| `src/lib/gcs.ts` | Modify | `signPublicUrl` + `signPublicUrls` |
| `src/app/api/stations/[id]/steps/route.ts` | Modify | Assinar URLs antes de retornar |
| `src/hooks/useElevenStepConversation.ts` | Modify | `onMatchRef` + `checkMatch` deps |
| `src/app/page.tsx` | Modify | `loadSteps` em `useCallback` |
| `ecosystem.config.js` | Create | Config PM2 |
| `Makefile` | Modify | Targets `start-prod`, `stop-prod`, etc. |
