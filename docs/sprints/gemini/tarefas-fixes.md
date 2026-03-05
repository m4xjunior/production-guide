# Tasks — Fixes de Acessibilidade (QA Sessões 1 e 2)

**Agente:** Gemini
**Revisor:** Claude
**Origem:** Findings das sessões QA 1 e 2
**Regra:** Aplicar SOMENTE os fixes abaixo. NÃO refatorar nem alterar lógica.

---

## TASK 1 — Botões < 44px no fluxo do operário

### 1.1 — `StepVoiceElevenPanel.tsx` — Confirmar manualmente

**Arquivo:** `src/components/StepVoiceElevenPanel.tsx`
**Linha:** 143
**Problema:** `size="lg"` = `h-10` = 40px < 44px mínimo (operário usa tablet/luvas)

```tsx
// ANTES
<Button
  variant="outline"
  size="lg"
  onClick={onManualConfirm}
  className="w-full"
>

// DEPOIS
<Button
  variant="outline"
  size="lg"
  onClick={onManualConfirm}
  className="w-full min-h-[44px]"
>
```

---

### 1.2 — `StepVoiceElevenPanel.tsx` — Repetir instruccion

**Arquivo:** `src/components/StepVoiceElevenPanel.tsx`
**Buscar por:** `Repetir instruccion` (ou `size="lg"` no mesmo componente se houver)

Verificar se há botão "Repetir instruccion" neste arquivo. Se `size="lg"`, adicionar `min-h-[44px]` no className.

---

### 1.3 — `ProductionStep.tsx` — Estaciones

**Arquivo:** `src/components/ProductionStep.tsx`
**Linha:** ~532
**Problema:** `size="sm"` = `h-8` = 32px

```tsx
// ANTES
<Button variant="ghost" size="sm" onClick={onBackToStations}>

// DEPOIS
<Button variant="ghost" size="sm" className="min-h-[44px]" onClick={onBackToStations}>
```

---

### 1.4 — `ProductionStep.tsx` — Parar

**Arquivo:** `src/components/ProductionStep.tsx`
**Linha:** ~794
**Problema:** `size="sm"` = `h-8` = 32px

```tsx
// ANTES
<Button
  variant="outline"
  size="sm"
  className="border-destructive/50 text-destructive hover:bg-destructive/10"
  onClick={() => setShowStopDialog(true)}
>

// DEPOIS
<Button
  variant="outline"
  size="sm"
  className="border-destructive/50 text-destructive hover:bg-destructive/10 min-h-[44px]"
  onClick={() => setShowStopDialog(true)}
>
```

---

## TASK 2 — Botões de ícone sem `aria-label` em `/admin/stations/[id]`

**Arquivo:** `src/app/admin/stations/[id]/page.tsx`
**Contexto:** Componente `SortableStepCard` — botões de ação da lista de passos
**Problema:** Têm `title` mas não `aria-label` (screen readers usam `aria-label`, não `title`)

### 2.1 — Mover arriba

```tsx
// ANTES (linha ~208)
<Button
  variant="ghost"
  size="sm"
  onClick={() => onMove(step.id, "up")}
  disabled={index === 0}
  className="h-7 w-7 p-0"
  title="Mover arriba"
>

// DEPOIS
<Button
  variant="ghost"
  size="sm"
  onClick={() => onMove(step.id, "up")}
  disabled={index === 0}
  className="h-7 w-7 p-0"
  aria-label="Mover arriba"
  title="Mover arriba"
>
```

### 2.2 — Mover abajo

```tsx
// ANTES (linha ~218)
<Button
  ...
  title="Mover abajo"
>

// DEPOIS
<Button
  ...
  aria-label="Mover abajo"
  title="Mover abajo"
>
```

### 2.3 — Editar paso

```tsx
// ANTES (linha ~228)
<Button
  ...
  title="Editar paso"
>

// DEPOIS
<Button
  ...
  aria-label="Editar paso"
  title="Editar paso"
>
```

### 2.4 — Eliminar paso

```tsx
// ANTES (linha ~237)
<Button
  ...
  title="Eliminar paso"
>

// DEPOIS
<Button
  ...
  aria-label="Eliminar paso"
  title="Eliminar paso"
>
```

### 2.5 — Drag handle (GripVertical)

**Linha:** ~151
**Problema:** `<div>` com drag sem role nem aria-label

```tsx
// ANTES
<div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
  <GripVertical className="h-4 w-4 text-muted-foreground/60" />
</div>

// DEPOIS
<div
  {...attributes}
  {...listeners}
  className="cursor-grab active:cursor-grabbing"
  aria-label="Reordenar paso"
  role="button"
>
  <GripVertical className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
</div>
```

---

## TASK 3 — Sidebar admin: links com altura 36px

**Arquivo:** `src/app/admin/layout.tsx`
**Linha:** ~396–437
**Problema:** Links de navegação com `padding: "10px 0"` resulta em ~36px — abaixo de 44px

Adicionar `minHeight: "44px"` no objeto de estilo inline dos `<Link>` do sidebar:

```tsx
// ANTES
style={{
  padding: sidebarCollapsed ? "10px 0" : "10px 12px 10px 14px",
  justifyContent: sidebarCollapsed ? "center" : "flex-start",
  color: isActive ? "#E8E8E8" : "#6B6B6B",
  ...
}}

// DEPOIS
style={{
  padding: sidebarCollapsed ? "10px 0" : "10px 12px 10px 14px",
  minHeight: "44px",
  justifyContent: sidebarCollapsed ? "center" : "flex-start",
  color: isActive ? "#E8E8E8" : "#6B6B6B",
  ...
}}
```

Aplicar o mesmo fix nos links inferiores do sidebar ("Ver app operario", "Cerrar sesion") se usarem a mesma estrutura de estilo.

---

## TASK 4 — Settings TTS: indicar que é auto-save

**Arquivo:** `src/app/admin/settings/page.tsx`
**Linha:** ~169 (campo ttsVoiceId e sliders)
**Problema:** Formulário usa `onBlur` para auto-save — usuário não sabe que está salvando automaticamente

Adicionar um texto explicativo logo acima dos campos da aba TTS:

```tsx
// Adicionar antes do primeiro campo da tab TTS (após o CardContent ou após o header da tab)
<p className="text-xs text-muted-foreground mb-4">
  Los cambios se guardan automáticamente al salir de cada campo.
</p>
```

**Não alterar** a lógica de `onBlur` — apenas adicionar o texto informativo.

---

## CHECKLIST DE VALIDAÇÃO (após os fixes)

```
[ ] src/components/StepVoiceElevenPanel.tsx — min-h-[44px] em "Confirmar manualmente"
[ ] src/components/ProductionStep.tsx — min-h-[44px] em "Estaciones" e "Parar"
[ ] src/app/admin/stations/[id]/page.tsx — aria-label em 5 elementos (4 buttons + 1 div)
[ ] src/app/admin/layout.tsx — minHeight: "44px" nos links do sidebar
[ ] src/app/admin/settings/page.tsx — texto "Los cambios se guardan automáticamente"
[ ] npx tsc --noEmit — zero erros TypeScript
[ ] Build não quebrado
```

---

## O QUE NÃO FAZER

- ❌ Não alterar a lógica de negócio (onBlur, handlers, hooks)
- ❌ Não refatorar componentes além do pedido
- ❌ Não criar componentes novos
- ❌ Não alterar estilos globais (button.tsx) — afetaria toda a app
- ❌ Não adicionar testes

---

## SAÍDA ESPERADA

Após completar, criar `docs/sprints/gemini/sessao-3-log.md` com:
- Lista de arquivos modificados com número de linha
- Resultado do `npx tsc --noEmit`
