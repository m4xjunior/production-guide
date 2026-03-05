import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const { PUT } = await import("@/app/api/stations/[id]/route");

const STATION_ID = "station-uuid-123";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/stations/${STATION_ID}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockExistingStation = {
  id: STATION_ID,
  name: "Estação A",
  description: null,
  productCode: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PUT /api/stations/:id — referenceIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: station exists
    vi.mocked(prisma.station.findUnique).mockResolvedValue(
      mockExistingStation as never
    );
    vi.mocked(prisma.station.update).mockResolvedValue(
      mockExistingStation as never
    );
  });

  it("rejeita referenceIds com elemento não-string (status 400)", async () => {
    // ARRANGE — referenceIds contains a number, not a string
    const req = makeRequest({ referenceIds: [123, "ref-valid"] });

    // ACT
    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID }),
    });
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toContain("strings no vacíos");
  });

  it("rejeita referenceIds com string vazia (status 400)", async () => {
    // ARRANGE — referenceIds contains an empty string
    const req = makeRequest({ referenceIds: ["ref-valid", ""] });

    // ACT
    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID }),
    });
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toContain("strings no vacíos");
  });

  it("aceita referenceIds array vazio (limpa todas as referências)", async () => {
    // ARRANGE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        stationReference: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return fn(tx);
    });
    const req = makeRequest({ referenceIds: [] });

    // ACT
    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID }),
    });
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.station).toBeDefined();
    // Transaction must have been called to clear references
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("aceita referenceIds válidos e usa transação", async () => {
    // ARRANGE
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({ stationReference: { deleteMany, createMany } })
    );
    const req = makeRequest({
      referenceIds: ["ref-uuid-1", "ref-uuid-2"],
    });

    // ACT
    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID }),
    });
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.station).toBeDefined();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(deleteMany).toHaveBeenCalledWith({ where: { stationId: STATION_ID } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { stationId: STATION_ID, referenceId: "ref-uuid-1" },
        { stationId: STATION_ID, referenceId: "ref-uuid-2" },
      ],
    });
  });

  it("não toca em referências quando referenceIds não é fornecido", async () => {
    // ARRANGE — body without referenceIds field
    const req = makeRequest({ name: "Nova Estação" });

    // ACT
    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID }),
    });

    // ASSERT
    expect(response.status).toBe(200);
    // $transaction should NOT be called when referenceIds is not provided
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
