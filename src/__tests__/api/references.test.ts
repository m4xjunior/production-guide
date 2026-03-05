import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Dynamic import so the mock is in place before the module loads
const { GET } = await import("@/app/api/references/route");

const makeRequest = () =>
  new NextRequest("http://localhost/api/references", {
    headers: { "x-tenant-id": "tenant-test-uuid" },
  });

describe("GET /api/references", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna lista de referências ativas ordenadas por nome", async () => {
    // ARRANGE
    vi.mocked(prisma.reference.findMany).mockResolvedValue([
      { id: "ref-1", sageCode: "R001", name: "Tecto Power" },
      { id: "ref-2", sageCode: "R002", name: "Tecto Solar" },
    ] as never);

    // ACT
    const response = await GET(makeRequest());
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.references).toHaveLength(2);
    expect(data.references[0].name).toBe("Tecto Power");
    expect(data.references[1].name).toBe("Tecto Solar");
  });

  it("retorna array vazio quando não há referências ativas", async () => {
    // ARRANGE
    vi.mocked(prisma.reference.findMany).mockResolvedValue([] as never);

    // ACT
    const response = await GET(makeRequest());
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(data.references).toHaveLength(0);
    expect(Array.isArray(data.references)).toBe(true);
  });

  it("responde com status 200", async () => {
    // ARRANGE
    vi.mocked(prisma.reference.findMany).mockResolvedValue([] as never);

    // ACT
    const response = await GET(makeRequest());

    // ASSERT
    expect(response.status).toBe(200);
  });
});
