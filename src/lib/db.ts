import "server-only";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ── Modelos que requerem filtro automático de tenant ──
const TENANT_SCOPED_MODELS = ["station", "operator", "reference", "auditlog", "voicecommand"];

// Cache de clientes estendidos por tenant — evita criar novo $extends() a cada request
const MAX_TENANT_CACHE_SIZE = 100;
const tenantClientCache = new Map<string, PrismaClient>();

/**
 * Retorna um cliente Prisma pré-filtrado por tenantId.
 * Usar em todas as rotas API que não são super-admin.
 *
 * @param tenantId - UUID do tenant extraído do header x-tenant-id
 */
export function getTenantPrisma(tenantId: string): PrismaClient {
  const cached = tenantClientCache.get(tenantId);
  if (cached) return cached;

  const client = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: Record<string, any>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (args: Record<string, any>) => Promise<unknown>;
        }) {
          if (TENANT_SCOPED_MODELS.includes(model.toLowerCase())) {
            // Leitura: injetar tenantId no where
            if (
              ["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(operation)
            ) {
              args = { ...args, where: { ...(args.where ?? {}), tenantId } };
            }
            // Escrita: injetar tenantId no data
            if (operation === "create") {
              args = { ...args, data: { ...(args.data ?? {}), tenantId } };
            }
            if (operation === "createMany") {
              const data = (args.data ?? []) as Record<string, unknown>[];
              args = { ...args, data: data.map((d) => ({ ...d, tenantId })) };
            }
            // Update/delete: injetar tenantId no where para evitar cross-tenant writes
            if (["update", "updateMany", "delete", "deleteMany"].includes(operation)) {
              args = { ...args, where: { ...(args.where ?? {}), tenantId } };
            }
            if (operation === "upsert") {
              args = {
                ...args,
                where: { ...(args.where ?? {}), tenantId },
                create: { ...(args.create ?? {}), tenantId },
              };
            }
          }
          return query(args);
        },
      },
    },
  });

  // Evitar crescimento ilimitado do cache
  if (tenantClientCache.size >= MAX_TENANT_CACHE_SIZE) {
    const firstKey = tenantClientCache.keys().next().value;
    if (firstKey) tenantClientCache.delete(firstKey);
  }
  // Cast seguro: $extends preserva a API do PrismaClient, apenas adiciona middleware
  const typedClient = client as unknown as PrismaClient;
  tenantClientCache.set(tenantId, typedClient);
  return typedClient;
}

// Para super-admin sem filtro de tenant
export { prisma as adminPrisma };

/**
 * Extrai e valida tenantId do header x-tenant-id.
 * Retorna o tenantId ou uma NextResponse de erro (400).
 */
export function requireTenantId(request: { headers: { get(name: string): string | null } }): string | Response {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    // Import dinâmico evitado — quem chama deve tratar o tipo Response
    return new Response(JSON.stringify({ error: "Tenant no identificado" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return tenantId;
}
