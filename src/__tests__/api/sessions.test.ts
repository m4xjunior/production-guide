import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const { POST } = await import("@/app/api/sessions/route");

const STATION_ID = "station-uuid-abc";
const OPERATOR_NUMBER = "OP-001";
const REFERENCE_ID = "ref-uuid-xyz";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/sessions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockActiveStation = {
  id: STATION_ID,
  name: "Estação B",
  description: null,
  productCode: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = {
  id: "session-uuid-001",
  operatorNumber: OPERATOR_NUMBER,
  stationId: STATION_ID,
  referenceId: null,
  loginAt: new Date(),
  logoutAt: null,
  completedUnits: 0,
  isActive: true,
};

describe("POST /api/sessions — validação de referenceId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    vi.mocked(prisma.station.findUnique).mockResolvedValue(
      mockActiveStation as never
    );
    vi.mocked(prisma.stationReference.findFirst).mockResolvedValue(
      { id: "sr-1", stationId: STATION_ID, referenceId: REFERENCE_ID } as never
    );
    vi.mocked(prisma.operatorSession.updateMany).mockResolvedValue(
      { count: 0 } as never
    );
    vi.mocked(prisma.operatorSession.create).mockResolvedValue(
      mockSession as never
    );
    vi.mocked(prisma.step.findMany).mockResolvedValue([] as never);
  });

  it("rejeita referenceId que não é string (status 400)", async () => {
    // ARRANGE — referenceId is a number
    const req = makeRequest({
      operatorNumber: OPERATOR_NUMBER,
      stationId: STATION_ID,
      referenceId: 999,
    });

    // ACT
    const response = await POST(req);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toContain("referenceId");
  });

  it("rejeita referenceId não vinculado à estação (status 400)", async () => {
    // ARRANGE — stationReference.findFirst returns null (not linked)
    vi.mocked(prisma.stationReference.findFirst).mockResolvedValue(null as never);
    const req = makeRequest({
      operatorNumber: OPERATOR_NUMBER,
      stationId: STATION_ID,
      referenceId: "ref-not-linked",
    });

    // ACT
    const response = await POST(req);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toContain("referencia");
  });

  it("rejeita referenceId de referência inativa (status 400)", async () => {
    // ARRANGE — stationReference.findFirst returns null because isActive filter fails
    vi.mocked(prisma.stationReference.findFirst).mockResolvedValue(null as never);
    const req = makeRequest({
      operatorNumber: OPERATOR_NUMBER,
      stationId: STATION_ID,
      referenceId: "ref-inactive",
    });

    // ACT
    const response = await POST(req);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(400);
    expect(data.error).toContain("referencia");
  });

  it("cria sessão sem referenceId (aceita null/undefined)", async () => {
    // ARRANGE — no referenceId in body
    const req = makeRequest({
      operatorNumber: OPERATOR_NUMBER,
      stationId: STATION_ID,
    });

    // ACT
    const response = await POST(req);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(201);
    expect(data.session).toBeDefined();
    // stationReference.findFirst should NOT be called when referenceId is absent
    expect(prisma.stationReference.findFirst).not.toHaveBeenCalled();
  });

  it("cria sessão com referenceId válido e vinculado", async () => {
    // ARRANGE — happy path with valid, linked referenceId
    vi.mocked(prisma.operatorSession.create).mockResolvedValue({
      ...mockSession,
      referenceId: REFERENCE_ID,
    } as never);
    const req = makeRequest({
      operatorNumber: OPERATOR_NUMBER,
      stationId: STATION_ID,
      referenceId: REFERENCE_ID,
    });

    // ACT
    const response = await POST(req);
    const data = await response.json();

    // ASSERT
    expect(response.status).toBe(201);
    expect(data.session).toBeDefined();
    expect(data.session.referenceId).toBe(REFERENCE_ID);
    // Verify that the link check was performed
    expect(prisma.stationReference.findFirst).toHaveBeenCalledOnce();
    expect(prisma.stationReference.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stationId: STATION_ID,
          referenceId: REFERENCE_ID,
        }),
      })
    );
  });
});
