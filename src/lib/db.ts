import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ── Modelos que requerem filtro automático de tenant ──
const TENANT_SCOPED_MODELS = ["station", "operator", "reference", "auditlog"];

/**
 * Retorna um cliente Prisma pré-filtrado por tenantId.
 * Usar em todas as rotas API que não são super-admin.
 *
 * @param tenantId - UUID do tenant extraído do header x-tenant-id
 */
export function getTenantPrisma(tenantId: string) {
  return prisma.$extends({
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
            if (
              ["findMany", "findFirst", "findUnique", "count", "aggregate"].includes(operation)
            ) {
              args = { ...args, where: { ...(args.where ?? {}), tenantId } };
            }
            if (operation === "create") {
              args = { ...args, data: { ...(args.data ?? {}), tenantId } };
            }
            if (operation === "createMany") {
              const data = (args.data ?? []) as Record<string, unknown>[];
              args = { ...args, data: data.map((d) => ({ ...d, tenantId })) };
            }
          }
          return query(args);
        },
      },
    },
  });
}

// Para super-admin sem filtro de tenant
export { prisma as adminPrisma };
