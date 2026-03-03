# SAO — Sistema de Ayuda al Operario

> Sistema de guia de montaje para operarios de fabrica con control por voz, escaneo de codigos de barras y controles de calidad configurables.

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL)
- Google Cloud SDK (para GCS — opcional en desarrollo)

## Instalacion rapida

```bash
make setup
```

Este comando levanta PostgreSQL en Docker, instala dependencias, genera el cliente Prisma, ejecuta las migraciones e importa los datos iniciales.

## Desarrollo

```bash
make dev
```

La aplicacion estara disponible en `http://localhost:3000`.

## Arquitectura

- **Frontend:** Next.js 15 + React 19 + shadcn-ui + Tailwind CSS 4
- **Backend:** Next.js API Routes + Prisma ORM
- **Base de datos:** PostgreSQL 15 (Docker)
- **Almacenamiento:** Google Cloud Storage (imagenes, configuraciones)
- **Voz:** Web Speech API (TTS + reconocimiento continuo)

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                      # Pagina principal (flujo operario)
│   ├── layout.tsx                    # Layout raiz
│   ├── globals.css                   # Estilos globales
│   ├── admin/
│   │   ├── page.tsx                  # Panel admin
│   │   └── stations/[id]/page.tsx    # Editor de estacion
│   └── api/
│       ├── stations/                 # CRUD estaciones
│       ├── sessions/                 # Sesiones de operario
│       ├── step-logs/                # Registro de pasos
│       ├── validate/barcode/         # Validacion de codigos
│       ├── upload/image/             # Subida de imagenes a GCS
│       └── reports/                  # Reportes (presencia, produccion)
├── components/
│   ├── ProductionStep.tsx            # Paso de produccion (voz, scan, boton)
│   ├── BarcodeScanner.tsx            # Lector de codigos de barras
│   ├── OperatorLogin.tsx             # Login de operario
│   ├── StationSelector.tsx           # Selector de estacion
│   ├── StationCard.tsx               # Tarjeta de estacion
│   ├── admin/                        # Componentes del panel admin
│   └── ui/                           # Componentes shadcn-ui
├── hooks/
│   ├── useContinuousSpeechRecognition.ts  # Reconocimiento de voz continuo
│   ├── useSpeechRecognition.ts            # Reconocimiento de voz manual
│   ├── useTextToSpeech.ts                 # Sintesis de voz (TTS)
│   └── use-toast.ts                       # Notificaciones
├── lib/
│   ├── db.ts                         # Cliente Prisma singleton
│   ├── gcs.ts                        # Cliente Google Cloud Storage
│   └── utils.ts                      # Utilidades generales
├── types/
│   └── index.ts                      # Tipos TypeScript
└── middleware.ts                      # Middleware Next.js
prisma/
├── schema.prisma                     # Esquema de base de datos
├── seed.ts                           # Seed de datos iniciales
└── migrations/                       # Migraciones SQL
```

## API Reference

### Estaciones

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/stations` | Listar estaciones activas | Publica |
| POST | `/api/stations` | Crear estacion | Admin |
| GET | `/api/stations/:id` | Detalle con pasos | Publica |
| PUT | `/api/stations/:id` | Editar estacion | Admin |
| DELETE | `/api/stations/:id` | Desactivar estacion | Admin |

### Pasos

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/stations/:id/steps` | Listar pasos | Publica |
| POST | `/api/stations/:id/steps` | Anadir paso | Admin |
| PUT | `/api/stations/:id/steps/:stepId` | Editar paso | Admin |
| DELETE | `/api/stations/:id/steps/:stepId` | Eliminar paso | Admin |
| PATCH | `/api/stations/:id/steps/reorder` | Reordenar pasos | Admin |

### Sesiones

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/sessions` | Iniciar sesion | Publica |
| GET | `/api/sessions/:id` | Estado de sesion | Publica |
| PATCH | `/api/sessions/:id/logout` | Cerrar sesion | Publica |

### Logs y Validacion

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/step-logs` | Registrar paso completado | Publica |
| POST | `/api/validate/barcode` | Validar codigo de barras | Publica |
| POST | `/api/upload/image` | Subir imagen | Admin |

### Reportes

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/api/reports/presence` | Reporte de presencia | Publica |
| GET | `/api/reports/production` | Reporte de produccion | Publica |

## Variables de entorno

Configuradas en `.env.local`:

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexion a PostgreSQL | `postgresql://p2v:p2v_secret@localhost:54320/picktvoice` |
| `GOOGLE_CLOUD_PROJECT` | ID del proyecto en Google Cloud | `eastern-synapse-466208-t9` |
| `GOOGLE_CLOUD_LOCATION` | Region de Google Cloud | `us-central1` |
| `GCS_BUCKET` | Nombre del bucket de GCS | `lexusfx-media-eastern-synapse-466208-t9-prod` |
| `GCS_TENANT` | Tenant dentro del bucket | `p2v` |
| `ADMIN_PASSWORD` | Contrasena para endpoints admin | *(definir en .env.local)* |
| `SAGE_API_URL` | URL de la API de Sage ERP (futuro) | *(pendiente)* |
| `SAGE_API_KEY` | Clave API de Sage ERP (futuro) | *(pendiente)* |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry para monitorizacion | *(opcional)* |

## Modelo de datos

La base de datos PostgreSQL tiene 4 tablas principales gestionadas por Prisma:

### stations

Estaciones de trabajo en la fabrica. Cada estacion representa una linea o puesto de montaje.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador unico |
| `name` | TEXT | Nombre de la estacion |
| `description` | TEXT? | Descripcion opcional |
| `product_code` | TEXT? | Codigo Sage (futuro ERP) |
| `is_active` | BOOLEAN | Si esta activa (default: true) |
| `updated_by` | TEXT? | Email del ingeniero que la modifico |

### steps

Pasos de cada estacion. Definen las instrucciones de montaje ordenadas.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador unico |
| `station_id` | UUID | FK a stations |
| `order_num` | INT | Orden del paso dentro de la estacion |
| `tipo` | TEXT | VOZ, SISTEMA o QC |
| `mensaje` | TEXT | Instruccion visual (pantalla) |
| `voz` | TEXT? | Texto para sintesis de voz |
| `response_type` | TEXT | voice, scan, button o auto |
| `respuesta` | TEXT? | Respuesta esperada o codigo de barras |
| `photo_url` | TEXT? | URL de imagen (GCS o local) |
| `model_url` | TEXT? | URL de modelo 3D (fase 2) |
| `is_qc` | BOOLEAN | Si es control de calidad |
| `qc_frequency` | INT? | Cada N unidades (NULL = siempre) |

### operator_sessions

Sesiones de operario. Registran cuando un operario inicia y finaliza trabajo en una estacion.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador unico |
| `operator_number` | TEXT | Numero del operario |
| `station_id` | UUID | FK a stations |
| `login_at` | TIMESTAMPTZ | Inicio de sesion |
| `logout_at` | TIMESTAMPTZ? | Fin de sesion (NULL = activa) |
| `completed_units` | INT | Unidades completadas |
| `is_active` | BOOLEAN | Si la sesion esta activa |

### step_logs

Log de cada paso completado. Permite trazabilidad completa de la produccion.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID | Identificador unico |
| `session_id` | UUID | FK a operator_sessions |
| `step_id` | UUID | FK a steps |
| `completed_at` | TIMESTAMPTZ | Momento de completado |
| `response_received` | TEXT? | Lo que el operario dijo/escaneo |
| `duration_ms` | INT? | Duracion del paso en milisegundos |
| `was_skipped` | BOOLEAN | Si fue saltado por frecuencia QC |

## Comandos Make

| Comando | Descripcion |
|---------|-------------|
| `make setup` | Instalacion completa (Docker + deps + migraciones + seed) |
| `make dev` | Servidor de desarrollo |
| `make start` | Modo produccion (build + start) |
| `make db-up` | Levantar PostgreSQL en Docker |
| `make db-down` | Parar Docker |
| `make db-migrate` | Ejecutar migraciones Prisma |
| `make db-seed` | Importar datos iniciales |
| `make db-reset` | Resetear base de datos |
| `make db-studio` | Abrir Prisma Studio |
| `make clean` | Limpiar todo (Docker volumes + node_modules + .next) |
