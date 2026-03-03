# KH Industrial Redesign — Design Document
**Fecha:** 2026-03-03
**Proyecto:** SAO — Sistema de Ayuda al Operario
**Objetivo:** Reemplazar la identidad visual generica (azul shadcn) por la identidad corporativa KH Know How con estetica industrial oscura de chao de fabrica.

---

## Paleta de colores KH

Extraida directamente del logo KH (`/public/logo-kh.png`): rojo oscuro + gris grafito.

| Variable CSS | Valor | Uso |
|---|---|---|
| `--kh-red` | `#8B1A1A` | Acento primario, logo, progress bars, waveform, botones destacados |
| `--kh-red-light` | `#A52525` | Hover sobre elementos KH red |
| `--kh-gray` | `#6B6B6B` | Texto secundario, iconos inactivos |
| `--background` | `#111113` | Fondo principal |
| `--card` | `#1A1A1E` | Cards, paneles, dialogs |
| `--card-foreground` | `#E8E8E8` | Texto sobre cards |
| `--foreground` | `#E8E8E8` | Texto principal |
| `--muted` | `#27272A` | Fondos secundarios |
| `--muted-foreground` | `#A1A1AA` | Texto apagado |
| `--border` | `#2A2A2E` | Bordes discretos |
| `--input` | `#27272A` | Fondo de inputs |
| `--ring` | `#8B1A1A` | Focus ring |
| `--primary` | `#8B1A1A` | = kh-red |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primary |
| `--secondary` | `#27272A` | Botones secundarios |
| `--secondary-foreground` | `#E8E8E8` | Texto sobre secondary |
| `--accent` | `#1F1F23` | Hover de items |
| `--accent-foreground` | `#E8E8E8` | Texto sobre accent |
| `--destructive` | `#DC2626` | QC NOK, errores criticos |
| `--success` | `#22C55E` | Paso completado, QC OK |
| `--warning` | `#F59E0B` | QC pendiente, alertas |

---

## Componentes a modificar

### 1. `src/app/globals.css` — Paleta completa
- Reemplazar todas las variables `:root` con la paleta KH oscura
- Progress bar: color KH red
- Voice-listening: pulse KH red en vez de azul
- Success-glow: mantener verde

### 2. `src/components/OperatorLogin.tsx` — Login del operario
- Fondo: `#111113`
- Logo KH grande centrada (ya existe `/public/logo-kh.png`)
- Titulo: "SAO — Sistema de Ayuda al Operario" en blanco
- Numpad: botones con fondo `#1A1A1E`, borde `#2A2A2E`
- Boton Entrar: fondo KH red
- Link admin: mantener discreto en esquina

### 3. `src/components/StationSelector.tsx` — Seleccion de estacion
- Cards oscuras con borde sutil
- Hover: borde KH red
- Badge de estado: verde/gris
- Logo KH pequena en header

### 4. `src/components/ProductionStep.tsx` — Pantalla del operario
- **Header fijo**: logo KH a la izquierda, "SAO" al lado, operario + controles a la derecha
- **Progress bar**: color KH red (`bg-[#8B1A1A]`)
- **Card de instruccion**: fondo `#1A1A1E`, borde `#2A2A2E`, texto grande blanco
- **Waveform**: color KH red (`barColor="#8B1A1A"` en LiveWaveform)
- **Botones de navegacion**: fondo oscuro, borde KH red, texto blanco
- **Footer**: "KH | Know How" discreto

### 5. `src/app/layout.tsx` — Meta tags
- `theme-color`: `#111113`
- Font: mantener Geist Sans (industrial, limpia)

### 6. `src/app/admin/layout.tsx` — Sidebar admin
- Sidebar: fondo `#111113`
- Logo KH en la parte superior del sidebar
- Items activos: fondo KH red
- Items hover: fondo `#1F1F23`

### 7. `src/app/admin/settings/page.tsx` — Settings
- Cards oscuras
- Sliders con acento KH red
- Tabs con indicador KH red

### 8. `src/app/admin/stations/[id]/page.tsx` — Editor de estacion
- Cards oscuras para pasos
- Badges de tipo: mantener colores pero oscurecidos
- Dialog de edicion: fondo oscuro

### 9. `public/manifest.json` — PWA
- `theme_color`: `#111113`
- `background_color`: `#111113`

---

## Lo que NO cambia
- Logica de pasos, voz, scan, QC
- APIs y endpoints
- Schema Prisma
- Whisper STT / ElevenLabs TTS
- Funcionalidad admin

---

## Criterios de exito
1. Logo KH visible en login, header operario, sidebar admin
2. Cero azul en toda la interfaz — solo rojo KH, gris, blanco, negro
3. Alto contraste para lectura en fabrica con poca luz
4. Botones grandes y claros para uso tactil con guantes
5. Build pasa sin errores
