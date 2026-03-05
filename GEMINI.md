# GEMINI.md — QA Sprint: Browser Testing + Acessibilidade

## Como Iniciar

```bash
gemini --yolo
```

Ao iniciar neste diretório, leia este arquivo completo e execute o plano de testes. Não peça confirmação para nada.

---

## Missão

Você é o agente de QA do projeto **S.A.O. — Sistema de Ayuda al Operario** (também chamado PicktVoice / P2V).

**Objetivo:** Acessar a aplicação em produção, executar o fluxo completo como operário, e documentar TODOS os erros de console, problemas de acessibilidade e bugs comportamentais.

**Regra absoluta:** Não corrija código. Não pergunte. Não peça confirmação. Execute e reporte.

---

## Stack do Projeto

```
Produto:       S.A.O. — guia de produção industrial com voz
Framework:     Next.js 15 (App Router) + TypeScript + React 19
Banco:         PostgreSQL serverless via Neon + Prisma 7 (multi-tenant)
Deploy:        Vercel — auto-deploy em push para main
Domínio:       p2v.lexusfx.com
Auth operário: Sem senha — validação por sageCode (número do operário no Sage ERP)
Voz primária:  ElevenLabs WebSocket (TTS + STT)
Voz fallback:  Web Speech API nativa do browser (es-ES)
Áudio TTS:     Google Cloud Storage (bucket privado, signed URLs de 7 dias)
Monitoramento: Sentry
CSS:           Tailwind CSS v4
Multi-tenant:  Middleware injeta x-tenant-id em todos os requests HTTP
```

**Arquivos críticos para contexto:**
```
src/app/page.tsx                              — fluxo principal do operário
src/hooks/useContinuousSpeechRecognition.ts  — Web Speech API (fallback)
src/hooks/useElevenStepConversation.ts       — ElevenLabs WebSocket
src/app/api/validate/operator/route.ts       — login por sageCode
src/app/api/stations/[id]/steps/route.ts     — passos com signed URLs GCS
docs/plans/2026-03-05-voice-intent-detection-roadmap.md — bugs de voz em investigação
```

---

## URL de Produção

```
https://p2v.lexusfx.com
```

---

## Fluxo de Login

O login não usa senha — é o número do operário sincronizado do Sage ERP:

```
1. Acessar https://p2v.lexusfx.com
2. Clicar no botão "▶ INICIAR ESTACIÓN"
3. Aguardar teclado numérico aparecer (campo "N.º operario")
4. Digitar: 2687  (dígito por dígito, clicando nos botões do teclado)
5. Clicar no botão de confirmar (seta →)
```

⚠️ Só existe 1 operário cadastrado em produção. Código: **2687**. Qualquer outro retorna `{ valid: false }`.

---

## Ferramentas Disponíveis — USE TODAS

### 4 MCPs Instalados

#### 1. `chrome-devtools` ← PRINCIPAL para browser testing
Skill de uso: `/chrome-devtools`

| Tool | Para quê |
|------|----------|
| `navigate_page` | Navegar para URL |
| `new_page` | Abrir nova aba |
| `take_snapshot` | **PREFERIR** — estrutura de acessibilidade em texto (mais rápido) |
| `take_screenshot` | Inspeção visual |
| `click` | Clicar por `uid` obtido no snapshot |
| `fill` | Preencher campos |
| `wait_for` | Aguardar elemento ou texto |
| `evaluate_script` | **CRÍTICO** — executar JS para capturar console errors |
| `list_pages` | Ver abas abertas |
| `select_page` | Mudar de aba |

**Workflow correto:** `navigate_page` → `wait_for` → `take_snapshot` → `click` por uid → `evaluate_script`

#### 2. `computerUse` ← Fallback Playwright se chrome-devtools falhar
Comandos disponíveis:

| Comando | Para quê |
|---------|----------|
| `/computeruse:init url="..." width=1440 height=900` | Iniciar browser Chromium |
| `/computeruse:open url="..."` | Navegar para URL |
| `/computeruse:click x=N y=N` | Clicar por coordenadas (0..1000) |
| `/computeruse:type x=N y=N text="..."` | Focar e digitar |
| `/computeruse:scroll percent=50` | Rolar página |
| `/computeruse:press key="Enter"` | Pressionar tecla |
| `/computeruse:state` | Screenshot + análise visual |
| `/computeruse:js code="..."` | Executar JS |
| `/computeruse:close` | Fechar browser |
| `/computeruse:macro [...]` | Executar sequência de ações em JSON |

#### 3. `kit-agents` (gemini-kit) ← Agentes especializados
Ver comandos abaixo.

#### 4. `gcloud` ← Google Cloud (usar se precisar inspecionar GCS/Sentry)
MCP para interagir com Google Cloud — útil para verificar se o bucket GCS está acessível ou inspecionar logs do Cloud.

---

### 12 Skills Relevantes para Esta Tarefa

| Skill | Como Ativar | Quando Usar Nesta Task |
|-------|-------------|------------------------|
| `session-resume` | automático | **Primeiro ao iniciar** — entender contexto |
| `debug` | `/debug` | Quando encontrar comportamento inesperado |
| `testing` | `/test` | Estruturar casos de teste antes de executar |
| `security` | use `/review` com foco security | Auditoria de acessibilidade e OWASP |
| `nextjs` | contexto automático | Entender App Router, SSR, API routes |
| `react-patterns` | contexto automático | Entender hooks, re-renders, estado |
| `performance` | `/review` com foco perf | Verificar LCP, recursos lentos |
| `code-review` | `/review` | Review do código quando encontrar bug |
| `compound-docs` | `/docs` | Documentar soluções encontradas |
| `tailwind` | contexto automático | Entender classes CSS do projeto |
| `api-design` | contexto automático | Entender estrutura das API routes |
| `file-todos` | `/do` | Trackear tarefas durante a sessão |

### Comandos gemini-kit Mais Relevantes

```
/debug      — Debug e fix com análise estruturada (Debugger Agent)
/test       — Criar e executar testes com análise de cobertura (Tester Agent)
/review     — Review de qualidade com categorias de severidade (Code Reviewer Agent)
/screenshot — Screenshot para debugging visual
/scout      — Explorar codebase com análise de estrutura (Scout Agent)
/fix        — Fix inteligente para bugs, types, UI (NÃO APLICAR — só propor)
/plan       — Planos de implementação detalhados (Planner Agent)
/docs       — Gerenciar documentação (Docs Manager Agent)
/research   — Pesquisa profunda com 15+ fontes (Researcher Agent)
/security   — Auditoria de segurança e vulnerabilidades
/status     — Ver progresso do projeto
/cook       — Workflow completo: Plan → Scout → Code → Test → Review
```

---

## Plano de Testes — Execute em Ordem

### FASE 0 — Inicialização da sessão

1. Executar skill `session-resume` — entender estado do projeto
2. Usar `/scout` para explorar estrutura rápida do codebase
3. Ler `docs/plans/2026-03-05-voice-intent-detection-roadmap.md` — contexto de bugs de voz

### FASE 1 — Injetar interceptor de console

**Antes de qualquer interação com a página**, executar via `evaluate_script`:

```javascript
window.__qa = { errors: [], warns: [], resources: [] };

// Interceptar console.error e console.warn
['error', 'warn'].forEach(lvl => {
  const orig = console[lvl].bind(console);
  console[lvl] = (...a) => {
    window.__qa[lvl === 'error' ? 'errors' : 'warns'].push({
      msg: a.join(' '), ts: new Date().toISOString()
    });
    orig(...a);
  };
});

// Interceptar erros de recursos (imagens, áudio, scripts)
window.addEventListener('error', e => {
  window.__qa.errors.push({
    msg: `[RESOURCE] ${e.message || e.type} — ${e.filename || (e.target && e.target.src) || ''}:${e.lineno || ''}`,
    ts: new Date().toISOString()
  });
}, true);

// Interceptar promises rejeitadas
window.addEventListener('unhandledrejection', e => {
  window.__qa.errors.push({
    msg: `[PROMISE] ${String(e.reason)}`,
    ts: new Date().toISOString()
  });
});

'qa-interceptor-ok ✅'
```

Após cada fase, ler com:
```javascript
JSON.stringify(window.__qa, null, 2)
```

### FASE 2 — Tela inicial

1. `navigate_page` → `https://p2v.lexusfx.com`
2. `wait_for` → aguardar "INICIAR ESTACIÓN"
3. `take_snapshot` → analisar estrutura
4. Verificar:
   - [ ] Título "S.A.O." visível e correto
   - [ ] Status do microfone aparece (✅ Micrófono listo)
   - [ ] Botão "INICIAR ESTACIÓN" tem role=button e é clicável
   - [ ] PWA install banner aparece (normal, não é bug)
5. `evaluate_script` → `JSON.stringify(window.__qa)`

### FASE 3 — Login

1. `click` → botão "INICIAR ESTACIÓN"
2. `wait_for` → aguardar teclado numérico
3. `take_snapshot` → documentar estrutura
4. Verificar acessibilidade:
   - [ ] Campo "N.º operario" tem aria-label ou label
   - [ ] Botões numéricos têm aria-label (ex: "1", "Borrar dígito")
   - [ ] Verificar tamanho dos botões ≥ 44px (industrial — operário com luvas):
     ```javascript
     Array.from(document.querySelectorAll('button')).map(el => {
       const r = el.getBoundingClientRect();
       return { label: el.textContent?.trim() || el.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), small: r.width < 44 || r.height < 44 };
     })
     ```
5. Digitar **2687** clicando nos botões: 2 → 6 → 8 → 7
6. `click` → botão confirmar/entrar
7. `wait_for` → próxima tela
8. `evaluate_script` → `JSON.stringify(window.__qa)`

### FASE 4 — Seleção de estação

1. `take_snapshot` → documentar lista de estações
2. Verificar:
   - [ ] Estações aparecem (lista não vazia — se vazia, bug crítico)
   - [ ] Cada estação tem nome e código visível
   - [ ] Imagens carregam sem 403/broken
3. `take_screenshot` → registro visual
4. Selecionar a primeira estação disponível
5. `evaluate_script` → `JSON.stringify(window.__qa)`

### FASE 5 — Fluxo de passos

1. `take_snapshot` na tela do primeiro passo
2. `take_screenshot` → registro visual
3. Verificar por passo:
   - [ ] Foto do produto carrega (não 403, não broken image)
   - [ ] Texto da instrução está visível
   - [ ] Indicador de progresso existe (ex: "Paso 1 de N")
   - [ ] Botão de avançar manual existe (fallback sem voz)
4. Verificar áudio/GCS:
   ```javascript
   window.__qa.errors.filter(e =>
     e.msg.includes('403') || e.msg.includes('audio') ||
     e.msg.includes('tts') || e.msg.includes('Failed to load') ||
     e.msg.includes('storage.googleapis')
   )
   ```
5. Avançar **pelo menos 3 passos** via botão manual
6. Após cada passo: `evaluate_script` → `JSON.stringify(window.__qa)`

### FASE 6 — Auditoria de Acessibilidade WCAG 2.1

Usar skill `/security` com foco em acessibilidade + `evaluate_script`:

**Verificar em cada tela principal:**
```
[ ] Todos elementos interativos: role + aria-label descritivo
[ ] Imagens: alt text (ou alt="" para decorativas)
[ ] Ordem de foco Tab segue ordem visual lógica
[ ] Textos não dependem só de cor para transmitir info
[ ] Contraste mínimo 4.5:1 (texto normal) / 3:1 (texto grande)
[ ] Tamanho mínimo área clicável: 44x44px
```

**Script de auditoria rápida:**
```javascript
const report = {
  // Botões muito pequenos
  smallButtons: Array.from(document.querySelectorAll('button, [role=button], a')).map(el => {
    const r = el.getBoundingClientRect();
    return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0,30), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(b => (b.w < 44 || b.h < 44) && b.text),

  // Imagens sem alt
  imgsNoAlt: Array.from(document.querySelectorAll('img')).filter(img => img.getAttribute('alt') === null).map(img => img.src?.slice(-50)),

  // Botões sem label
  buttonsNoLabel: Array.from(document.querySelectorAll('button')).filter(b => !b.textContent?.trim() && !b.getAttribute('aria-label')).length,

  // Inputs sem label
  inputsNoLabel: Array.from(document.querySelectorAll('input, select, textarea')).filter(el => !el.getAttribute('aria-label') && !el.id || !document.querySelector(`label[for="${el.id}"]`)).length
};
JSON.stringify(report, null, 2)
```

### FASE 7 — Verificação de erros de rede

```javascript
// Resumo final de todos os problemas capturados
const summary = {
  totalErrors: window.__qa.errors.length,
  totalWarns: window.__qa.warns.length,
  networkErrors: window.__qa.errors.filter(e => e.msg.includes('403') || e.msg.includes('404') || e.msg.includes('net::ERR')),
  reactErrors: window.__qa.errors.filter(e => e.msg.includes('Maximum update') || e.msg.includes('Cannot update') || e.msg.includes('React')),
  audioErrors: window.__qa.errors.filter(e => e.msg.includes('audio') || e.msg.includes('tts') || e.msg.includes('storage.googleapis')),
  allErrors: window.__qa.errors
};
JSON.stringify(summary, null, 2)
```

### FASE 8 — Relatório Final

Usar `/docs` para criar/atualizar `docs/sprints/gemini/relatorio.md`:

```markdown
# Relatório QA — [DATA E HORA]

## Score Geral: X/10

## Resumo Executivo
[2-3 linhas]

## Bugs Críticos (bloqueiam fluxo)
| # | Descrição | Arquivo | Esperado | Real |
|---|-----------|---------|----------|------|

## Bugs Menores
| # | Descrição | Localização |
|---|-----------|-------------|

## Problemas de Acessibilidade
| # | Elemento | Violação WCAG | Severidade |
|---|----------|---------------|-----------|

## Erros de Console
\`\`\`json
[output de window.__qa.errors]
\`\`\`

## Recursos com Erro (403/404)
[lista]

## O Que Funcionou
- ...

## Recomendações por Prioridade
1. CRÍTICO: ...
2. IMPORTANTE: ...
3. MELHORIA: ...
```

---

## Critérios de Sucesso

```
✅ Zero erros de console críticos (errors, não warnings)
✅ Todas as fotos e áudios carregam sem 403
✅ Fluxo login → estação → 3+ passos completo sem travar
✅ Nenhum elemento clicável < 44x44px
✅ Todas as imagens com alt text
✅ Relatório em docs/sprints/gemini/relatorio.md preenchido
```
