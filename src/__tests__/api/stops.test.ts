import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const { POST, GET } = await import("@/app/api/stops/route");
const { PATCH } = await import("@/app/api/stops/[id]/route");

const STATION_ID = "station-uuid-001";
const SESSION_ID = "session-uuid-001";
const STOP_ID = "stop-uuid-001";

const mockStation = {
  id: STATION_ID,
  name: "Estacao A",
  isActive: true,
};

const mockStop = {
  id: STOP_ID,
  stationId: STATION_ID,
  sessionId: SESSION_ID,
  startAt: new Date("2026-03-03T10:00:00Z"),
  endAt: null,
  reason: "Avaria maquina",
};

const mockClosedStop = {
  ...mockStop,
  endAt: new Date("2026-03-03T10:30:00Z"),
};

function makeRequest(url: string, method: string, body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/stops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.station.findUnique).mockResolvedValue(mockStation as never);
    vi.mocked(prisma.stationStop.create).mockResolvedValue(mockStop as never);
  });

  it("cria stop com stationId, reason e retorna 201", async () => {
    const req = makeRequest("http://localhost/api/stops", "POST", {
      stationId: STATION_ID,
      sessionId: SESSION_ID,
      reason: "Avaria maquina",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.stop).toBeDefined();
    expect(data.stop.stationId).toBe(STATION_ID);
  });

  it("cria stop sem sessionId (opcional)", async () => {
    vi.mocked(prisma.stationStop.create).mockResolvedValue({
      ...mockStop,
      sessionId: null,
    } as never);
    const req = makeRequest("http://localhost/api/stops", "POST", {
      stationId: STATION_ID,
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it("rejeita sem stationId (status 400)", async () => {
    const req = makeRequest("http://localhost/api/stops", "POST", {
      reason: "sem estacao",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("rejeita stationId vazio (status 400)", async () => {
    const req = makeRequest("http://localhost/api/stops", "POST", {
      stationId: "",
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/stops/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.stationStop.update).mockResolvedValue(mockClosedStop as never);
  });

  it("fecha stop com endAt = now() quando nao fornecido", async () => {
    const req = makeRequest(`http://localhost/api/stops/${STOP_ID}`, "PATCH", {});

    const response = await PATCH(req, { params: Promise.resolve({ id: STOP_ID }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stop).toBeDefined();
    expect(prisma.stationStop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: STOP_ID },
      })
    );
  });

  it("fecha stop com endAt fornecido", async () => {
    const endAt = "2026-03-03T11:00:00Z";
    const req = makeRequest(`http://localhost/api/stops/${STOP_ID}`, "PATCH", { endAt });

    const response = await PATCH(req, { params: Promise.resolve({ id: STOP_ID }) });
    expect(response.status).toBe(200);
  });
});

describe("GET /api/stops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.stationStop.findMany).mockResolvedValue([
      mockStop,
      mockClosedStop,
    ] as never);
  });

  it("lista stops por stationId", async () => {
    const req = makeRequest(
      `http://localhost/api/stops?stationId=${STATION_ID}`,
      "GET"
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.stops)).toBe(true);
    expect(prisma.stationStop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ stationId: STATION_ID }),
      })
    );
  });

  it("calcula durationMs para stops fechados", async () => {
    const req = makeRequest(
      `http://localhost/api/stops?stationId=${STATION_ID}`,
      "GET"
    );

    const response = await GET(req);
    const data = await response.json();

    const closedStop = data.stops.find(
      (s: { endAt: string | null; durationMs?: number | null }) => s.endAt !== null
    );
    expect(closedStop).toBeDefined();
    expect(typeof closedStop.durationMs).toBe("number");
    expect(closedStop.durationMs).toBe(1800000); // 30 min en ms
  });

  it("rejeita sem stationId (status 400)", async () => {
    const req = makeRequest("http://localhost/api/stops", "GET");
    const response = await GET(req);
    expect(response.status).toBe(400);
  });
});
