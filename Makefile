# Variables
DB_URL := postgresql://p2v:p2v_secret@localhost:54320/picktvoice

.PHONY: start stop logs sync-once deploy migrate status build help \
        setup dev start-prod stop-prod restart-prod logs-prod status-prod \
        db-up db-down db-migrate db-seed db-reset db-studio \
        gcs-sync clean whisper whisper-stop whisper-logs whisper-restart \
        sage-sync-install sage-sync sage-sync-once

# ===========================================================================
# T14 — Docker Compose production targets (Sprint 6D)
# ===========================================================================

## Inicia todos os servicos Docker (sync-sage + transcription-server)
start:
	docker compose up -d

## Para todos os servicos
stop:
	docker compose down

## Segue logs em tempo real (Ctrl+C para sair)
logs:
	docker compose logs -f

## Executa sync Sage uma vez e sai (para testing)
sync-once:
	docker compose run --rm sync-sage sh -c "SYNC_ONCE=true node dist/index.js"

## Build das imagens Docker
build:
	docker compose build

## Deploy do frontend para Vercel (producao)
deploy:
	vercel --prod

## Aplica migrations Prisma no Neon (producao)
migrate:
	npx prisma migrate deploy

## Estado dos containers
status:
	docker compose ps

## Mostra esta ajuda
help:
	@grep -E '^##' Makefile | sed 's/^## //'

# ===========================================================================
# Development targets (local dev with local postgres)
# ===========================================================================

## Setup completo (primeira vez)
setup: db-up
	npm install
	@sleep 3
	DATABASE_URL=$(DB_URL) npx prisma generate
	DATABASE_URL=$(DB_URL) npx prisma migrate dev
	DATABASE_URL=$(DB_URL) npx prisma db seed
	@echo "Setup completo. Ejecutar: make dev"

## Desenvolvimento
dev:
	DATABASE_URL=$(DB_URL) npm run dev

## Producao com PM2 (Next.js standalone)
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

# ===========================================================================
# Database targets
# ===========================================================================

## Sobe postgres local
db-up:
	docker compose up -d postgres
	@echo "Esperando PostgreSQL..."
	@sleep 3
	@docker exec p2v-postgres pg_isready -U p2v -d picktvoice

## Para postgres local
db-down:
	docker compose down

db-migrate:
	DATABASE_URL=$(DB_URL) npx prisma migrate dev

db-seed:
	DATABASE_URL=$(DB_URL) npx prisma db seed

db-reset:
	DATABASE_URL=$(DB_URL) npx prisma migrate reset

db-studio:
	DATABASE_URL=$(DB_URL) npx prisma studio

# ===========================================================================
# Transcription server (Whisper local)
# ===========================================================================

## Inicia Whisper server local na porta 8765
whisper: whisper-stop
	@echo "Iniciando Whisper server na porta 8765..."
	@cd transcription-server && nohup .venv/bin/uvicorn server:app --host 0.0.0.0 --port 8765 > /tmp/whisper.log 2>&1 & echo "Whisper iniciado (PID: $$!). Logs: tail -f /tmp/whisper.log"

whisper-stop:
	@pm2 delete whisper 2>/dev/null || true
	@lsof -ti:8765 | xargs kill -9 2>/dev/null || true
	@echo "Whisper parado"

whisper-logs:
	@tail -f /tmp/whisper.log

whisper-restart: whisper-stop whisper

# ===========================================================================
# GCS + Sage sync
# ===========================================================================

gcs-sync:
	@echo "GCS sync no implementado aun"

## Instala dependencias do sync-sage
sage-sync-install:
	cd sync-sage && npm install

sage-sync:
	cd sync-sage && npm run sync

sage-sync-once:
	cd sync-sage && npm run sync:once

# ===========================================================================
# Cleanup
# ===========================================================================

## Remove containers, volumes e node_modules
clean:
	docker compose down -v
	rm -rf node_modules .next generated
