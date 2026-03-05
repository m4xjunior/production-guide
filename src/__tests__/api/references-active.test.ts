import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const { GET } = await import("@/app/api/references/route");

const makeRequest = () =>
  new NextRequest("http://localhost/api/references", {
    headers: { "x-tenant-id": "tenant-test-uuid" },
  });

describe("GET /api/references — filtro isActive (integração leve)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não retorna referências inativas", async () => {
    // ARRANGE — the mock simulates Prisma already filtering isActive:true
    // (in production, the WHERE clause excludes inactive ones)
    vi.mocked(prisma.reference.findMany).mockResolvedValue([
      { id: "ref-1", sageCode: "R001", name: "Referência Ativa" },
    ] as never);

    // ACT
    const response = await GET(makeRequest());
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    // Verify the handler called findMany with isActive: true filter
    expect(prisma.reference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
    // Only the active one is in the response
    expect(data.references).toHaveLength(1);
    expect(data.references[0].name).toBe("Referência Ativa");
  });

  it("retorna apenas campos id, sageCode, name", async () => {
    // ARRANGE
    vi.mocked(prisma.reference.findMany).mockResolvedValue([
      { id: "ref-2", sageCode: "R002", name: "Tecto Isolado" },
    ] as never);

    // ACT
    const response = await GET(makeRequest());
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    // Handler must select only id, sageCode, name
    expect(prisma.reference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, sageCode: true, name: true },
      })
    );
    const ref = data.references[0];
    expect(ref).toHaveProperty("id");
    expect(ref).toHaveProperty("sageCode");
    expect(ref).toHaveProperty("name");
    // No extra fields beyond what the handler selects
    expect(Object.keys(ref)).toEqual(["id", "sageCode", "name"]);
  });
});
