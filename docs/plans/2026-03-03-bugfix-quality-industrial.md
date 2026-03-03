# Design: Bugfix + Qualidade Industrial

**Data:** 2026-03-03  
**Branch:** feat/elevenlabs-live-waveform-adapter  
**Abordagem:** Cirúrgica — 5 correções nas causas raiz

## Problema 1: GCS 403 (voz e imagens não carregam)

**Causa:** `vozAudioUrl` e `photoUrl` no DB apontam para URLs públicas do GCS mas o bucket é privado.  
**Fix:** `GET /api/stations/[id]/steps` gera signed URLs de 7 dias antes de retornar. GCS serve direto ao browser.  
**Arquivos:** `src/lib/gcs.ts`, `src/app/api/stations/[id]/steps/route.ts`

## Problema 2: React infinite re-render ("Maximum update depth exceeded")

**Causa:** `onMatch` passado para `useElevenStepConversation` é função inline (novo ref a cada render) → `checkMatch` muda → loop.  
**Fix:** `onMatch` vai para ref dentro do hook. `checkMatch` usa `onMatchRef.current`.  
**Arquivos:** `src/hooks/useElevenStepConversation.ts`

## Problema 3: `loadSteps` instável em `page.tsx`

**Causa:** Função async declarada sem `useCallback` dentro do componente, chamada em useEffect com `eslint-disable`.  
**Fix:** Vira `useCallback` com deps explícitas.  
**Arquivos:** `src/app/page.tsx`

## Problema 4: Modo produção + process management

**Causa:** App roda em `next dev` — hot-reload overhead, múltiplas instâncias possíveis.  
**Fix:** `next build` + `next start --port 3000` via PM2. Makefile atualizado com `start-prod`/`stop-prod`.  
**Arquivos:** `Makefile`

## Problema 5: Signed URLs para photoUrl

**Mesmo fix do Problema 1** — aplicado também a `photoUrl` dos steps e imagens de produto.

## Critérios de Sucesso

- Zero erros de console na página de produção
- Áudio TTS toca nos passos
- Imagens de produto carregam
- App roda em `next start` (não `next dev`)
- Nunca mais de 1 instância rodando
