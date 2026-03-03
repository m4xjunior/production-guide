# Variables
DB_URL := postgresql://p2v:p2v_secret@localhost:54320/picktvoice

.PHONY: setup dev start build start-prod stop-prod restart-prod logs-prod status-prod db-up db-down db-migrate db-seed db-reset db-studio gcs-sync clean

## Setup completo (primera vez)
setup: db-up
	npm install
	@sleep 3
	DATABASE_URL=$(DB_URL) npx prisma generate
	DATABASE_URL=$(DB_URL) npx prisma migrate dev
	DATABASE_URL=$(DB_URL) npx prisma db seed
	@echo "✅ Setup completo. Ejecutar: make dev"

## Desarrollo
dev:
	DATABASE_URL=$(DB_URL) npm run dev

## Producción
start:
	DATABASE_URL=$(DB_URL) npm run build && DATABASE_URL=$(DB_URL) npm run start

## Produção com PM2
build:
	DATABASE_URL=$(DB_URL) npm run build

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

## Base de datos
db-up:
	docker compose up -d postgres
	@echo "⏳ Esperando PostgreSQL..."
	@sleep 3
	@docker exec p2v-postgres pg_isready -U p2v -d picktvoice

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

## GCS sync (futuro)
gcs-sync:
	@echo "📦 GCS sync no implementado aún"

## Limpiar
clean:
	docker compose down -v
	rm -rf node_modules .next generated
