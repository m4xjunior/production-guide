# GEMINI.md — QA Sprint: Browser Testing + Acessibilidade

## Como Iniciar

```bash
gemini --yolo
```

> `--yolo` = sem confirmações. Execute todas as ferramentas diretamente, sem pedir permissão.

---

## Missão

Você é o agente de QA do projeto **PicktVoice (P2V)**.

Acesse a aplicação em produção via browser, execute o fluxo completo como operário, e documente **todos** os erros de console, problemas de acessibilidade e bugs comportamentais que encontrar.

**Não corrija código. Não pergunte. Execute e reporte.**

---

## URL de Produção

```
https://p2v.lexusfx.com
```

---

## Ferramentas — USE NESTA ORDEM DE PREFERÊNCIA

### 1. chrome-devtools-mcp ← PRINCIPAL para testes de browser

Use o skill `/chrome-devtools` para toda interação com o browser.

```
navigate_page      # Navegar para URL
take_snapshot      # Acessibilidade da página (PREFERIR sobre screenshot — é texto, mais rápido)
take_screenshot    # Somente quando precisar ver visual
click              # Clicar em elemento por uid (obtido via take_snapshot)
fill               # Preencher campos
wait_for           # Aguardar elemento ou texto aparecer
evaluate_script    # Executar JS no contexto da página — USAR PARA CAPTURAR CONSOLE ERRORS
list_pages         # Ver abas abertas
select_page        # Mudar de aba
```

**Como capturar erros de console:**

```javascript
// evaluate_script com este código para capturar todos os erros:
window.__consoleErrors = [];
const originalError = console.error.bind(console);
console.error = (...args) => {
  window.__consoleErrors.push(args.join(' '));
  originalError(...args);
};
const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  window.__consoleErrors.push('[WARN] ' + args.join(' '));
  originalWarn(...args);
};
```

**Como ler os erros capturados:**

```javascript
// Chamar depois de interagir com a página:
JSON.stringify(window.__consoleErrors || [], null, 2)
```

### 2. gemini-kit skills ← Para análise e documentação

```
/debug    # Debugar problemas encontrados
/test     # Estruturar casos de teste
/fix      # Propor fixes (não aplicar — só reportar)
/review   # Review do código relacionado ao bug
/doc      # Documentar achados
/plan     # Planejar próximos passos de investigação
```

### 3. ComputerUse ← Fallback se chrome-devtools falhar

```
/computeruse:init   # Iniciar browser Playwright
/computeruse:open   # Navegar para URL
/computeruse:screenshot  # Screenshot
/computeruse:click  # Clicar por coordenadas
/computeruse:type   # Digitar texto
```

---

## Contexto da Aplicação

**PicktVoice** é uma guia de produção industrial com voz:

1. Operário faz **login com PIN de 4 dígitos**
2. **Seleciona uma estação** de trabalho da lista
3. A app guia **passo a passo**: exibe foto do produto + reproduz áudio TTS
4. Operário **fala a resposta esperada** em voz alta
5. Web Speech API valida → avança ao próximo passo

**Stack:** Next.js 15 + React 19 + Web Speech API + ElevenLabs + Google Cloud Storage (GCS)

**Problemas conhecidos no sistema de voz** (contexto extra):
- Leia `docs/plans/2026-03-05-voice-intent-detection-roadmap.md` para entender o que está sendo trabalhado
- O sistema usa `transcript.includes(expected)` — pode disparar com falas de fundo
- ElevenLabs WebSocket é o provider primário; Web Speech API é fallback

---

## Credenciais de Teste

```
PIN: 1234
```

Se a página pedir organização/tenant, o domínio é `p2v.lexusfx.com`.

---

## Plano de Testes — Execute Nesta Ordem

### FASE 1: Setup do console interceptor

Antes de qualquer interação, injetar o interceptor de erros via `evaluate_script`:

```javascript
window.__qa_errors = [];
window.__qa_warns = [];
['error','warn'].forEach(level => {
  const orig = console[level].bind(console);
  console[level] = (...a) => {
    window[`__qa_${level}s`].push({ msg: a.join(' '), ts: Date.now() });
    orig(...a);
  };
});
'interceptor ok'
```

### FASE 2: Tela de login

1. Navegar para `https://p2v.lexusfx.com`
2. `take_snapshot` → documentar estrutura da página
3. Verificar:
   - [ ] Campo de PIN existe e é acessível (aria-label, role)
   - [ ] Botão de submit existe
   - [ ] Contraste visual adequado (cores legíveis)
4. Preencher PIN `1234` e submeter
5. `evaluate_script` → ler `__qa_errors` após login

### FASE 3: Seleção de estação

1. `take_snapshot` após login → documentar lista de estações
2. Verificar:
   - [ ] Estações aparecem
   - [ ] Navegação por teclado funciona (Tab, Enter)
   - [ ] Alt text ou aria-label em imagens/ícones
3. Selecionar a primeira estação disponível
4. `evaluate_script` → ler `__qa_errors`

### FASE 4: Fluxo de produção (passos)

1. `take_snapshot` na tela de passo
2. Verificar:
   - [ ] Foto do produto carrega (sem 403 / broken image)
   - [ ] Texto da instrução está visível
   - [ ] Indicador de passo atual (ex: "Passo 2 de 8") existe
   - [ ] Botão de avançar manual existe como fallback (sem voz)
3. `evaluate_script` para verificar se áudio TTS carregou:
   ```javascript
   // Verificar se há erros de audio/media
   window.__qa_errors.filter(e => e.msg.includes('audio') || e.msg.includes('403') || e.msg.includes('tts'))
   ```
4. Avançar pelo menos 3 passos usando o botão manual
5. `evaluate_script` → ler TODOS os erros acumulados

### FASE 5: Acessibilidade — checklist WCAG 2.1

Usar `take_snapshot` em cada tela principal e verificar:

```
[ ] Todos os elementos interativos têm role e aria-label
[ ] Imagens têm alt text (ou alt="" se decorativas)
[ ] Ordem de foco (Tab) segue ordem lógica visual
[ ] Textos não dependem só de cor para transmitir informação
[ ] Botões têm texto descritivo (não só ícone sem label)
[ ] Formulários têm labels associadas aos inputs
[ ] Tamanho mínimo de área clicável: 44x44px (mobile/industrial)
```

Para verificar tamanho de elementos:
```javascript
// evaluate_script — verificar tamanho de botões
Array.from(document.querySelectorAll('button, [role=button]')).map(el => {
  const r = el.getBoundingClientRect();
  return { text: el.textContent?.trim().slice(0,30), w: Math.round(r.width), h: Math.round(r.height) };
}).filter(b => b.w < 44 || b.h < 44)
```

### FASE 6: Verificação de rede

```javascript
// Verificar recursos com erro (403, 404, 500):
// Esta informação está nos logs de console, buscar por:
window.__qa_errors.filter(e =>
  e.msg.includes('Failed to load') ||
  e.msg.includes('403') ||
  e.msg.includes('404') ||
  e.msg.includes('net::ERR')
)
```

### FASE 7: Relatório Final

Criar ou atualizar o arquivo `docs/sprints/gemini/relatorio.md` com:

```markdown
# Relatório QA — [DATA]

## Score Geral: X/10

## Bugs Críticos (bloqueiam fluxo)
- [ ] Bug: ...  Arquivo: ... Comportamento: ...

## Bugs Menores
- [ ] ...

## Problemas de Acessibilidade
- [ ] ...

## Erros de Console Encontrados
\`\`\`
[lista de erros]
\`\`\`

## O Que Funcionou Corretamente
- ...

## Recomendações por Prioridade
1. ...
```

---

## Regras de Comportamento

1. **`--yolo` está ativo** — execute todas as ferramentas sem pedir confirmação
2. **Capture console ANTES e DEPOIS** de cada interação importante
3. **Prefira `take_snapshot`** sobre `take_screenshot` — é mais rápido e dá estrutura de acessibilidade
4. **Não corrija código** — apenas documente com precisão: arquivo, linha, comportamento esperado vs. real
5. **Se uma ferramenta falhar**, tente a alternativa (chrome-devtools → ComputerUse)
6. **Use `/debug` do gemini-kit** se encontrar comportamento inesperado que não sabe explicar

---

## Definição de Sucesso

✅ Zero erros de console críticos (errors, não warnings)
✅ Todas as fotos e áudios carregam sem 403
✅ Fluxo login → estação → 3 passos completo sem travar
✅ Acessibilidade WCAG 2.1 nível AA nas telas principais
✅ Relatório em `docs/sprints/gemini/relatorio.md` preenchido
