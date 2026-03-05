# GEMINI.md — QA Sprint: Browser Testing + Acessibilidade

## Como Iniciar

```bash
gemini --yolo
```

Ao iniciar neste diretório, leia este arquivo e execute o plano de testes abaixo sem pedir confirmação para nada.

---

## Missão

Você é o agente de QA do projeto **PicktVoice (P2V) / S.A.O. (Sistema de Ayuda al Operario)**.

Acesse a aplicação em produção, execute o fluxo completo como operário, e documente **todos** os erros de console, problemas de acessibilidade e bugs comportamentais.

**Não corrija código. Não pergunte. Não peça confirmação. Execute e reporte.**

---

## Stack do Projeto (leia antes de testar)

```
Framework:     Next.js 15 (App Router) + TypeScript + React 19
Banco:         PostgreSQL via Neon (serverless) + Prisma 7
Deploy:        Vercel — deploy automático em push para main
Auth operário: Sem senha — validação por sageCode (número de operário no Sage ERP)
Voz (primária): ElevenLabs WebSocket — converte fala → texto e TTS
Voz (fallback): Web Speech API do navegador (es-ES)
Áudio TTS:     Google Cloud Storage (bucket privado, signed URLs de 7 dias)
Monitoramento: Sentry
Multi-tenant:  Middleware injeta x-tenant-id em todos os requests
```

**Arquivos chave:**
```
src/app/page.tsx                              — fluxo principal do operário
src/hooks/useContinuousSpeechRecognition.ts  — Web Speech API fallback
src/hooks/useElevenStepConversation.ts       — ElevenLabs WebSocket
src/app/api/validate/operator/route.ts       — login por sageCode
src/app/api/stations/[id]/steps/route.ts     — passos com signed URLs GCS
```

---

## URL de Produção

```
https://p2v.lexusfx.com
```

---

## Fluxo de Login (mapeado)

O login NÃO é senha — é número de operário do sistema Sage:

```
1. Acessar https://p2v.lexusfx.com
2. Clicar em "▶ INICIAR ESTACIÓN"
3. Aguardar teclado numérico aparecer (campo "N.º operario")
4. Digitar o número do operário: **2687**
5. Clicar no botão de confirmar (seta →) OU clicar "ENTRAR"
```

**⚠️ IMPORTANTE:** Só existe 1 operário cadastrado no banco de produção. Qualquer outro número retornará `{ valid: false }`. Use APENAS o código indicado acima.

---

## Ferramentas — USE TODAS, NESTA ORDEM DE PREFERÊNCIA

### 1. chrome-devtools-mcp ← PRINCIPAL

```
navigate_page      # Navegar para URL
take_snapshot      # Estrutura de acessibilidade (PREFERIR — é texto, mais rápido que screenshot)
take_screenshot    # Somente para inspeção visual
click              # Clicar por uid do snapshot
fill               # Preencher campos
wait_for           # Aguardar elemento ou texto
evaluate_script    # ← CRÍTICO: executar JS para capturar console errors
list_pages         # Ver abas abertas
```

### 2. ComputerUse ← Fallback se chrome-devtools falhar

```
/computeruse:init        # Iniciar browser Playwright
/computeruse:open        # Navegar para URL
/computeruse:screenshot  # Screenshot
/computeruse:click       # Clicar por coordenadas normalizadas (0..1000)
/computeruse:type        # Digitar texto
/computeruse:scroll      # Rolar página
```

### 3. gemini-kit ← Para análise, debug e documentação

```
/debug    # Debugar comportamento inesperado
/test     # Estruturar e executar casos de teste
/fix      # Propor fix (NÃO aplicar — só reportar)
/review   # Review do código relacionado a um bug
/doc      # Documentar achados no relatorio.md
/plan     # Planejar sequência de investigação
/brainstorm  # Ideias sobre causa raiz de um bug
```

---

## Plano de Testes — Execute Nesta Sequência

### PASSO 0 — Injetar interceptor de console (FAZER PRIMEIRO)

Antes de qualquer interação, executar via `evaluate_script`:

```javascript
window.__qa = { errors: [], warns: [], resources: [] };
['error','warn'].forEach(lvl => {
  const orig = console[lvl].bind(console);
  console[lvl] = (...a) => {
    window.__qa[lvl === 'error' ? 'errors' : 'warns'].push({
      msg: a.join(' '), ts: new Date().toISOString()
    });
    orig(...a);
  };
});
window.addEventListener('error', e => {
  window.__qa.errors.push({ msg: e.message + ' — ' + e.filename + ':' + e.lineno, ts: new Date().toISOString() });
});
window.addEventListener('unhandledrejection', e => {
  window.__qa.errors.push({ msg: 'UnhandledRejection: ' + String(e.reason), ts: new Date().toISOString() });
});
'qa-interceptor-ok'
```

Para ler erros acumulados (chamar após cada passo):
```javascript
JSON.stringify(window.__qa, null, 2)
```

---

### PASSO 1 — Tela inicial

1. `navigate_page` → `https://p2v.lexusfx.com`
2. `take_snapshot` → documentar estrutura
3. Verificar:
   - [ ] Título "S.A.O." visível
   - [ ] Status do microfone aparece (✅ Micrófono listo)
   - [ ] Botão "INICIAR ESTACIÓN" existe e é clicável
   - [ ] PWA install banner aparece (correto, não é bug)
4. `evaluate_script` → ler `window.__qa`

---

### PASSO 2 — Login com número de operário

1. Clicar "INICIAR ESTACIÓN"
2. `wait_for` → aguardar teclado numérico aparecer
3. `take_snapshot` → documentar estrutura do login
4. Verificar acessibilidade:
   - [ ] Campo "N.º operario" tem label adequado
   - [ ] Botões numéricos têm aria-label
   - [ ] Tamanho dos botões ≥ 44px (industrial — operário com luvas)
5. Digitar o número do operário **dígito por dígito** clicando nos botões
6. Clicar confirmar → `wait_for` próxima tela
7. `evaluate_script` → ler `window.__qa`

---

### PASSO 3 — Seleção de estação

1. `take_snapshot` → documentar lista de estações
2. Verificar:
   - [ ] Estações aparecem (se vazio, é bug crítico)
   - [ ] Cada estação tem nome e código visível
   - [ ] Imagens de estação carregam (não quebradas)
3. Selecionar a primeira estação disponível
4. `evaluate_script` → ler `window.__qa`

---

### PASSO 4 — Fluxo de passos (production steps)

1. `take_snapshot` na tela do primeiro passo
2. Verificar:
   - [ ] Foto do produto carrega (não 403, não broken)
   - [ ] Texto da instrução visível
   - [ ] Indicador de progresso existe (ex: "Paso 1 de N")
   - [ ] Botão de avançar manual existe como fallback
3. Verificar áudio TTS:
   ```javascript
   // Verificar erros relacionados a áudio/GCS:
   window.__qa.errors.filter(e =>
     e.msg.includes('403') || e.msg.includes('audio') ||
     e.msg.includes('tts') || e.msg.includes('Failed to load')
   )
   ```
4. Avançar **3 passos** usando o botão manual (sem voz)
5. `take_screenshot` a cada passo — documentar visual
6. `evaluate_script` → ler `window.__qa` completo

---

### PASSO 5 — Auditoria de Acessibilidade WCAG 2.1

Para cada tela principal, usar `take_snapshot` + `evaluate_script`:

**Verificações via snapshot (acessibilidade):**
```
[ ] Todos elementos interativos: role + aria-label
[ ] Imagens: alt text ou alt="" (decorativas)
[ ] Formulários: label associada a cada input
[ ] Textos não dependem só de cor para transmitir info
[ ] Botões com só ícone têm aria-label descritivo
```

**Verificar tamanho de elementos (industrial — luvas):**
```javascript
Array.from(document.querySelectorAll('button, [role=button], a')).map(el => {
  const r = el.getBoundingClientRect();
  return {
    text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0,30),
    w: Math.round(r.width),
    h: Math.round(r.height),
    small: r.width < 44 || r.height < 44
  };
}).filter(b => b.small && b.text)
```

**Verificar contraste (simplificado):**
```javascript
// Listar elementos com text muito claro ou muito escuro que podem ter problema
Array.from(document.querySelectorAll('p, h1, h2, h3, button, span')).slice(0,20).map(el => {
  const s = window.getComputedStyle(el);
  return { tag: el.tagName, color: s.color, bg: s.backgroundColor, text: el.textContent?.trim().slice(0,20) };
})
```

---

### PASSO 6 — Verificação de rede e recursos

```javascript
// Recursos com erro (captured via error listener):
window.__qa.errors.filter(e =>
  e.msg.includes('net::ERR') || e.msg.includes('404') ||
  e.msg.includes('403') || e.msg.includes('Failed to fetch')
)
```

Verificar também via `take_snapshot` se há imagens quebradas (img sem src ou com erro).

---

### PASSO 7 — Relatório Final

Criar `docs/sprints/gemini/relatorio.md` com este formato:

```markdown
# Relatório QA — [DATA E HORA]

## Score Geral: X/10

## Resumo Executivo
[2-3 linhas do estado geral]

## Bugs Críticos (bloqueiam o fluxo)
| # | Descrição | Arquivo | Comportamento Esperado | Comportamento Real |
|---|-----------|---------|----------------------|-------------------|
| 1 | ... | ... | ... | ... |

## Bugs Menores (não bloqueiam)
| # | Descrição | Localização |
|---|-----------|-------------|

## Problemas de Acessibilidade
| # | Elemento | Problema WCAG | Severidade |
|---|----------|---------------|-----------|

## Erros de Console Encontrados
\`\`\`json
[colar output do window.__qa.errors]
\`\`\`

## Warnings de Console
\`\`\`json
[colar output do window.__qa.warns]
\`\`\`

## Recursos Que Não Carregaram
[lista de URLs com 403/404]

## O Que Funcionou Corretamente
- ...

## Recomendações por Prioridade
1. CRÍTICO: ...
2. IMPORTANTE: ...
3. MELHORIA: ...
```

---

## Regras de Comportamento

1. **`--yolo` ativo** — nenhuma confirmação, execute diretamente
2. **Capture `window.__qa` após CADA passo** — não só no final
3. **Prefira `take_snapshot`** — mais rápido e dá acessibilidade; use screenshot só para visual
4. **Não corrija código** — documente com precisão cirúrgica: arquivo, linha, esperado vs. real
5. **Se chrome-devtools falhar**, use `/computeruse:*` como fallback imediato
6. **Use `/debug`** quando encontrar comportamento que não entende
7. **Use `/plan`** antes de cada fase para estruturar a sequência

---

## Contexto do Sistema de Voz (para entender bugs de voz)

Ler antes de testar: `docs/plans/2026-03-05-voice-intent-detection-roadmap.md`

Bugs conhecidos em investigação:
- `transcript.includes(expected)` dispara falsos positivos com falas de fundo
- ElevenLabs WebSocket pode falhar → fallback Web Speech API
- GCS signed URLs de 7 dias (não devem dar 403 se assinadas corretamente)
