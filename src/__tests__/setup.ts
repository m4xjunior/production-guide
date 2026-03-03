import { vi } from "vitest";

// Mock do módulo Prisma para testes de API routes
vi.mock("@/lib/db", () => ({
  prisma: {
    reference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
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
    },
    operatorSession: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stationReference: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      })
    ),
  },
}));
