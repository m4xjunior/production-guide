# KH Industrial Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic blue shadcn light theme with KH corporate identity — dark industrial aesthetic with red #8B1A1A accent.

**Architecture:** CSS variable swap in globals.css provides the base dark palette. Then sweep through every component that uses hardcoded Tailwind colors (blue-600, zinc-50, bg-white, etc.) and replace with semantic tokens or KH palette values. Add KH logo to header, sidebar, and login.

**Tech Stack:** Tailwind CSS v4, shadcn-ui, Next.js 15, CSS custom properties

---

## Task 1: Swap CSS palette to KH dark theme

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace `:root` variables**

Replace the entire `:root` block with KH dark palette:

```css
:root {
  --radius: 0.625rem;
  --background: #111113;
  --foreground: #E8E8E8;
  --card: #1A1A1E;
  --card-foreground: #E8E8E8;
  --popover: #1A1A1E;
  --popover-foreground: #E8E8E8;
  --primary: #8B1A1A;
  --primary-foreground: #FFFFFF;
  --secondary: #27272A;
  --secondary-foreground: #E8E8E8;
  --muted: #27272A;
  --muted-foreground: #A1A1AA;
  --accent: #1F1F23;
  --accent-foreground: #E8E8E8;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --border: #2A2A2E;
  --input: #27272A;
  --ring: #8B1A1A;
  --chart-1: #8B1A1A;
  --chart-2: #22C55E;
  --chart-3: #F59E0B;
  --chart-4: #6B6B6B;
  --chart-5: #A52525;
  --success: #22C55E;
  --success-foreground: #FFFFFF;
  --warning: #F59E0B;
  --warning-foreground: #111113;
}
```

**Step 2: Update voice-listening pulse to KH red**

Replace the blue pulse `rgba(59, 130, 246, ...)` with KH red `rgba(139, 26, 26, ...)`:

```css
.voice-listening {
  animation: pulse-voice 2s infinite;
  box-shadow: 0 0 0 0 rgba(139, 26, 26, 0.7);
}

@keyframes pulse-voice {
  0% {
    box-shadow: 0 0 0 0 rgba(139, 26, 26, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(139, 26, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(139, 26, 26, 0);
  }
}
```

**Step 3: Update scrollbar for dark theme**

```css
::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
```

**Step 4: Verify — run `npm run dev` and check that background is dark, text is light**

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: swap CSS palette to KH dark industrial theme"
```

---

## Task 2: Update meta tags and PWA manifest

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `public/manifest.json`

**Step 1: Update layout.tsx theme-color**

Change `#1e40af` to `#111113`:

```tsx
<meta name="theme-color" content="#111113" />
```

**Step 2: Update manifest.json**

```json
{
  "theme_color": "#111113",
  "background_color": "#111113"
}
```

**Step 3: Commit**

```bash
git add src/app/layout.tsx public/manifest.json
git commit -m "feat: update PWA meta and manifest to KH dark theme"
```

---

## Task 3: Redesign OperatorLogin

**Files:**
- Modify: `src/components/OperatorLogin.tsx`

**Step 1: Add KH branding and dark styling**

The login screen needs:
- Larger KH logo (h-20 instead of h-16)
- Title "SAO" prominent, subtitle "Sistema de Ayuda al Operario" smaller
- Numpad buttons: dark card background, subtle border
- Enter button: KH red background
- Overall dark feel (the CSS vars handle `bg-background`, `bg-card` etc)

Replace the return JSX:

```tsx
return (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md shadow-2xl border-border">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto mb-2">
          <img
            src="/logo-kh.png"
            alt="KH Know How"
            className="h-20 w-auto mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">
          SAO
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Sistema de Ayuda al Operario
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display */}
        <div className="relative">
          <Input
            value={operatorNumber}
            readOnly
            placeholder="_ _ _ _"
            className="text-center text-4xl font-mono tracking-[0.5em] h-16 bg-muted border-border"
          />
          {operatorNumber.length > 0 && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Borrar todo"
            >
              <Delete className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive text-center font-medium">
            {error}
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <Button
              key={digit}
              variant="outline"
              size="touch"
              className="text-2xl font-bold aspect-square border-border hover:bg-accent hover:border-[#8B1A1A]/50"
              onClick={() => handleNumpadPress(String(digit))}
            >
              {digit}
            </Button>
          ))}
          <Button
            variant="outline"
            size="touch"
            className="text-lg border-border"
            onClick={handleDelete}
          >
            <Delete className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="touch"
            className="text-2xl font-bold aspect-square border-border hover:bg-accent hover:border-[#8B1A1A]/50"
            onClick={() => handleNumpadPress("0")}
          >
            0
          </Button>
          <Button
            variant="default"
            size="touch"
            className="text-lg font-bold bg-[#8B1A1A] hover:bg-[#A52525] text-white"
            onClick={handleSubmit}
            disabled={operatorNumber.length !== 4}
          >
            <LogIn className="h-6 w-6" />
          </Button>
        </div>

        {/* Login button */}
        <Button
          onClick={handleSubmit}
          disabled={operatorNumber.length !== 4}
          size="xl"
          className="w-full text-lg font-semibold bg-[#8B1A1A] hover:bg-[#A52525] text-white"
        >
          <LogIn className="mr-2 h-5 w-5" />
          Entrar
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          KH | Know How
        </p>
      </CardContent>
    </Card>

    <Link
      href="/admin"
      className="fixed bottom-4 right-4 p-2 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
      title="Panel de administracion"
    >
      <Settings2 className="h-5 w-5" />
    </Link>
  </div>
);
```

**Step 2: Commit**

```bash
git add src/components/OperatorLogin.tsx
git commit -m "feat: redesign OperatorLogin with KH dark branding"
```

---

## Task 4: Redesign StationSelector + StationCard

**Files:**
- Modify: `src/components/StationSelector.tsx`
- Modify: `src/components/StationCard.tsx`

**Step 1: Add KH logo to StationSelector header**

In StationSelector, add logo next to the title:

```tsx
<div>
  <div className="flex items-center gap-2">
    <img src="/logo-kh.png" alt="KH" className="h-8 w-auto" />
    <h1 className="text-2xl font-bold">Selecciona una estacion</h1>
  </div>
  <p className="text-muted-foreground text-lg">
    Operario: <span className="font-semibold text-foreground">{operatorNumber}</span>
  </p>
</div>
```

**Step 2: Update StationCard hover to KH red border**

Replace `hover:border-primary/50` with explicit KH red:

```tsx
<Card
  className="cursor-pointer hover:shadow-lg hover:shadow-[#8B1A1A]/10 hover:border-[#8B1A1A]/50 transition-all active:scale-[0.98] border-border"
  onClick={() => onClick(station.id)}
>
```

**Step 3: Commit**

```bash
git add src/components/StationSelector.tsx src/components/StationCard.tsx
git commit -m "feat: dark StationSelector with KH logo + red hover on cards"
```

---

## Task 5: Redesign ProductionStep header

**Files:**
- Modify: `src/components/ProductionStep.tsx`

**Step 1: Add KH logo to top bar**

Replace the top bar content with KH logo + "SAO" branding:

```tsx
{/* Top bar */}
<div className="border-b border-border bg-card px-4 py-3">
  <div className="max-w-5xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-3">
      <img src="/logo-kh.png" alt="KH" className="h-8 w-auto" />
      <span className="text-sm font-bold text-foreground tracking-wide">SAO</span>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm" onClick={onBackToStations}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Estaciones
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-sm text-muted-foreground">
        Operario: <span className="font-semibold text-foreground">{operatorNumber}</span>
      </span>
    </div>
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleToggleMute} title={isMuted ? "Activar sonido" : "Silenciar"}>
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={onRestart} title="Reiniciar">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onLogout} title="Cerrar sesion">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

**Step 2: Update image container for dark theme**

Replace `bg-white` on the image container:

```tsx
<div className="w-full rounded-xl overflow-hidden border border-border bg-card shadow-sm">
```

**Step 3: Add KH footer**

After `<SuccessFeedback>`, before closing div, add subtle footer:

```tsx
{/* Footer */}
<div className="border-t border-border bg-card px-4 py-1.5 text-center">
  <span className="text-xs text-muted-foreground/40">KH | Know How</span>
</div>
```

**Step 4: Commit**

```bash
git add src/components/ProductionStep.tsx
git commit -m "feat: ProductionStep header with KH logo + dark image container + footer"
```

---

## Task 6: Redesign admin layout (sidebar + login gate)

**Files:**
- Modify: `src/app/admin/layout.tsx`

**Step 1: Replace all hardcoded blue/zinc/white colors**

This is the biggest file. Every hardcoded color reference needs to change:

| Old | New |
|---|---|
| `bg-zinc-50` | `bg-background` |
| `bg-white` | `bg-card` |
| `border-zinc-200` | `border-border` |
| `text-zinc-900` | `text-foreground` |
| `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-400` | `text-muted-foreground/60` |
| `text-zinc-600` | `text-muted-foreground` |
| `text-zinc-700` | `text-foreground` |
| `bg-blue-50` | `bg-[#8B1A1A]/10` |
| `text-blue-600` | `text-[#8B1A1A]` |
| `text-blue-700` | `text-[#A52525]` |
| `bg-blue-600` | `bg-[#8B1A1A]` |
| `hover:bg-blue-700` | `hover:bg-[#A52525]` |
| `ring-blue-500` | `ring-[#8B1A1A]` |
| `hover:bg-zinc-100` | `hover:bg-accent` |
| `hover:text-zinc-900` | `hover:text-foreground` |
| `hover:text-zinc-700` | `hover:text-foreground` |
| `hover:bg-red-50` | `hover:bg-destructive/10` |
| `hover:text-red-600` | `hover:text-destructive` |
| `text-red-600` | `text-destructive` |

**Step 2: Replace sidebar logo icon with KH logo image**

Replace the Factory icon logo block with:

```tsx
{/* Logo area */}
<div className="h-16 flex items-center px-4 border-b border-border shrink-0">
  {!sidebarCollapsed && (
    <div className="flex items-center gap-2">
      <img src="/logo-kh.png" alt="KH" className="h-8 w-auto" />
      <div>
        <h1 className="text-sm font-bold text-foreground leading-tight">
          SAO Admin
        </h1>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Sistema de Ayuda al Operario
        </p>
      </div>
    </div>
  )}
  {sidebarCollapsed && (
    <img src="/logo-kh.png" alt="KH" className="h-8 w-auto mx-auto" />
  )}
</div>
```

**Step 3: Update nav item active state**

Replace active state from blue to KH red:

```tsx
${
  isActive
    ? "bg-[#8B1A1A]/10 text-[#A52525]"
    : "text-muted-foreground hover:bg-accent hover:text-foreground"
}
```

Icon active class: `${isActive ? "text-[#8B1A1A]" : ""}`

**Step 4: Update login gate Lock icon container**

Replace `bg-blue-50` → `bg-[#8B1A1A]/10`, `text-blue-600` → `text-[#8B1A1A]`

Replace login button: `bg-blue-600 hover:bg-blue-700` → `bg-[#8B1A1A] hover:bg-[#A52525]`

**Step 5: Update loading spinner**

Replace `text-blue-600` → `text-[#8B1A1A]`

**Step 6: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: dark admin sidebar with KH logo and red accents"
```

---

## Task 7: Redesign admin dashboard page

**Files:**
- Modify: `src/app/admin/page.tsx`

**Step 1: Replace all hardcoded zinc/blue colors**

Same pattern as layout:

| Old | New |
|---|---|
| `text-zinc-900` | `text-foreground` |
| `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-400` | `text-muted-foreground/60` |
| `text-zinc-300` | `text-muted-foreground/40` |
| `text-zinc-600` | `text-muted-foreground` |
| `border-zinc-200` | `border-border` |
| `hover:bg-zinc-50` | `hover:bg-accent` |
| `text-blue-600` | `text-[#8B1A1A]` |
| `text-blue-700` | `text-[#A52525]` |
| `hover:text-blue-600` | `hover:text-[#A52525]` |
| `hover:text-blue-700` | `hover:text-[#A52525]` |
| `text-blue-600` (loading) | `text-[#8B1A1A]` |

**Step 2: Update StatCard color map**

Replace blue/emerald/amber colorMap with dark theme:

```tsx
const colorMap = {
  blue: {
    bg: "bg-[#8B1A1A]/10",
    icon: "text-[#8B1A1A]",
    value: "text-[#A52525]",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-400",
    value: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-400",
    value: "text-amber-400",
  },
};
```

And `bg-blue-50` → `bg-[#8B1A1A]/10` for stat card backgrounds.

**Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: dark admin dashboard with KH color palette"
```

---

## Task 8: Fix admin settings page — Castellano + dark theme

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

**Step 1: Replace all Portuguese text with Castellano**

| Portuguese | Castellano |
|---|---|
| `Configurações Globais` | `Configuraciones Globales` |
| `Afeta todos os operadores...` | `Afecta a todos los operadores y estaciones del sistema (salvo cuando la estacion tiene configuracion propia).` |
| `Última atualização` | `Ultima actualizacion` |
| `toLocaleString("pt-BR")` | `toLocaleString("es-ES")` |
| `ElevenLabs — Configuração de Voz` | `ElevenLabs — Configuracion de Voz` |
| `ID da voz no ElevenLabs...` | `ID de la voz en ElevenLabs. Cambiar regenera audios en los proximos pasos creados.` |
| `Velocidade` | `Velocidad` |
| `(lento)` | `(lento)` |
| `(normal)` | `(normal)` |
| `(rápido)` | `(rapido)` |
| `Estabilidade` | `Estabilidad` |
| `Similaridade` | `Similitud` |
| `Interface do Operador` | `Interfaz del Operador` |
| `Tamanho de fonte` | `Tamano de fuente` |
| `Prévia: Instrução de montagem do produto` | `Vista previa: Instruccion de montaje del producto` |
| `Idioma padrão` | `Idioma por defecto` |
| `Comportamento do Sistema` | `Comportamiento del Sistema` |
| `Delay auto-avanço` | `Delay auto-avance` |
| `QC habilitado por padrão` | `QC habilitado por defecto` |
| `Novos passos criados...` | `Nuevos pasos creados tendran QC activado automaticamente` |
| `Reconhecimento de Voz` | `Reconocimiento de Voz` |
| `Usar Whisper (servidor local)` | `Usar Whisper (servidor local)` |
| `Usa o servidor Python local...` | `Usa el servidor Python local con Whisper para maxima precision en vez del Web Speech API del navegador` |
| `URL do servidor Whisper` | `URL del servidor Whisper` |
| `Inicie o servidor` | `Inicie el servidor` |
| `Histórico de Mudanças` | `Historial de Cambios` |
| `Nenhuma mudança registrada ainda.` | `Ningun cambio registrado todavia.` |
| `Configuração salva` | `Configuracion guardada` |
| `atualizado com sucesso` | `actualizado con exito` |
| `Erro` | `Error` |
| `Não foi possível salvar.` | `No fue posible guardar.` |

Tab labels:
| Old | New |
|---|---|
| `Voz TTS` | `Voz TTS` |
| `Interface` | `Interfaz` |
| `Comportamento` | `Comportamiento` |
| `Transcrição` | `Transcripcion` |
| `Auditoria` | `Auditoria` |

**Step 2: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "fix: admin settings page — all text to Castellano"
```

---

## Task 9: Build verification

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Visual verification**

```bash
PORT=3030 npm run dev
```

Check:
- [ ] Login: dark background, KH logo large, red Enter button
- [ ] Station selector: dark cards, red hover border, KH logo in header
- [ ] Production step: KH logo in top bar, dark image container, red progress bar
- [ ] Admin login gate: dark, red button, KH lock icon
- [ ] Admin sidebar: dark, KH logo, red active item
- [ ] Admin dashboard: dark cards, red stat accents
- [ ] Admin settings: all Castellano, dark cards
- [ ] Zero blue anywhere in the interface

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: post-review visual adjustments for KH redesign"
```
