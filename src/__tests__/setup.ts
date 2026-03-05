import { vi } from "vitest";

const mockReferenceModel = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
};

// Mock do módulo Prisma para testes de API routes
vi.mock("@/lib/db", () => ({
  // getTenantPrisma retorna o mesmo mock de prisma (tenant-scoped)
  getTenantPrisma: vi.fn(() => ({
    reference: mockReferenceModel,
  })),
  prisma: {
    reference: mockReferenceModel,
    stationReference: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    station: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    step: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    operatorSession: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    stationStop: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    stepCondition: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stationReference: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        stepCondition: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      })
    ),
  },
}));
