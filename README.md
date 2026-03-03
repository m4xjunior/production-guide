# SAO — Sistema de Ayuda al Operario v3.0

Sistema MES industrial multi-tenant para guiar operarios en línea de montaje mediante voz, imagen y vídeo. Cada fábrica cliente (tenant) tiene su propia configuración, estaciones, operarios y comandos de voz.

## Arquitectura

- **Frontend:** Next.js 15 → Vercel (wildcard domains: `*.sao.app`)
- **DB:** PostgreSQL en Neon (shared schema multi-tenant con tenantId)
- **Backend services:** Docker Compose (sync-sage + transcription-server)
- **Storage:** Google Cloud Storage por tenant (`tenants/{slug}/...`)
- **TTS:** ElevenLabs API
- **STT:** Web Speech API (cloud) o Whisper (local, privacidad fábrica)

## Requisitos

- Node.js 20+
- Docker + Docker Compose
- Cuenta Neon (PostgreSQL)
- Cuenta Vercel
- Bucket en Google Cloud Storage
- ElevenLabs API key (TTS)

## Instalación en nueva fábrica (~30 min)

### 1. Clonar y configurar

```bash
git clone <repo>
cp .env.example .env
# Rellenar DATABASE_URL, GCS_BUCKET, GCS credentials, ELEVENLABS_API_KEY
```

### 2. Instalar dependencias y generar cliente Prisma

```bash
npm install
npx prisma generate
```

### 3. Ejecutar migration en Neon

```bash
npx prisma migrate deploy
```

### 4. Crear tenant en DB

```sql
INSERT INTO tenants (slug, name, primary_color, tts_voice_id)
VALUES ('acme', 'Acme Factory', '#1A4B8B', 'JBFqnCBsd6RMkjVDRZzb');
```

### 5. Configurar DNS

Añadir registro CNAME: `acme.sao.app` → dominio Vercel.

### 6. Iniciar servicios Docker

```bash
cp sync-sage/.env.example sync-sage/.env
# Rellenar SAGE_HOST, SAGE_PASSWORD, DATABASE_URL
make start
```

### 7. Deploy frontend

```bash
make deploy
```

## Comandos Make

| Comando | Descripción |
|---------|-------------|
| `make start` | Inicia Docker services |
| `make stop` | Para Docker services |
| `make logs` | Logs en tiempo real |
| `make sync-once` | Sync Sage manual (una vez) |
| `make build` | Build imágenes Docker |
| `make migrate` | Aplica migrations Prisma |
| `make deploy` | Deploy a Vercel |
| `make status` | Estado de containers |
| `make help` | Lista todos los comandos |

## Desarrollo local

```bash
npm install
npx prisma generate
npm run dev
# App en http://localhost:3000
# Admin en http://localhost:3000/admin
```

> El tenant por defecto en local es `kh` (configurable con `DEFAULT_TENANT_SLUG`).

## Tests

```bash
npx vitest run     # todos los tests (una vez)
npx vitest         # modo watch
```

## Multi-tenancy

El sistema usa subdominio para identificar el tenant:
- `kh.sao.app` → tenant slug = "kh"
- `acme.sao.app` → tenant slug = "acme"
- `localhost` → DEFAULT_TENANT_SLUG (= "kh" por defecto)

Cada tenant tiene estaciones, operarios, referencias, comandos de voz y configuración TTS propios.
