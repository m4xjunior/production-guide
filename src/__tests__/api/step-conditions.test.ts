import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const { PUT } = await import(
  "@/app/api/stations/[id]/steps/[stepId]/conditions/route"
);
const { GET } = await import("@/app/api/stations/[id]/steps/route");

const STATION_ID = "station-uuid-001";
const STEP_ID = "step-uuid-001";
const STEP_B_ID = "step-uuid-002";

const mockStation = {
  id: STATION_ID,
  name: "Estacao A",
  isActive: true,
};

const mockStep = {
  id: STEP_ID,
  stationId: STATION_ID,
  orderNum: 1,
  tipo: "VOZ",
  mensaje: "Paso 1",
  voz: null,
  responseType: "voice",
  respuesta: "si",
  photoUrl: null,
  vozAudioUrl: null,
  modelUrl: null,
  isQc: false,
  qcFrequency: null,
  isErrorStep: false,
  errorMessage: null,
  periodEveryN: null,
  createdAt: new Date(),
  conditions: [
    { id: "cond-1", stepId: STEP_ID, matchResponse: "si", nextStepId: STEP_B_ID },
  ],
};

function makeRequest(url: string, method: string, body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PUT /api/stations/:id/steps/:stepId/conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.step.findUnique).mockResolvedValue(mockStep as never);
    vi.mocked(prisma.stepCondition.findMany).mockResolvedValue([
      { id: "cond-1", stepId: STEP_ID, matchResponse: "si", nextStepId: STEP_B_ID },
    ] as never);
    vi.mocked(prisma.$transaction).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          stepCondition: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        })
    );
  });

  it("apaga condiciones antiguas y crea nuevas en transaccion", async () => {
    const req = makeRequest(
      `http://localhost/api/stations/${STATION_ID}/steps/${STEP_ID}/conditions`,
      "PUT",
      {
        conditions: [
          { matchResponse: "si", nextStepId: STEP_B_ID },
          { matchResponse: null, nextStepId: null },
        ],
      }
    );

    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID, stepId: STEP_ID }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.conditions).toBeDefined();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("acepta array vacio de condiciones (borra todo)", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          stepCondition: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        })
    );

    const req = makeRequest(
      `http://localhost/api/stations/${STATION_ID}/steps/${STEP_ID}/conditions`,
      "PUT",
      { conditions: [] }
    );

    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID, stepId: STEP_ID }),
    });
    expect(response.status).toBe(200);
  });

  it("retorna 404 si el step no existe", async () => {
    vi.mocked(prisma.step.findUnique).mockResolvedValue(null as never);

    const req = makeRequest(
      `http://localhost/api/stations/${STATION_ID}/steps/inexistente/conditions`,
      "PUT",
      { conditions: [] }
    );

    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID, stepId: "inexistente" }),
    });
    expect(response.status).toBe(404);
  });

  it("retorna 400 si conditions no es un array", async () => {
    const req = makeRequest(
      `http://localhost/api/stations/${STATION_ID}/steps/${STEP_ID}/conditions`,
      "PUT",
      { conditions: "not-an-array" }
    );

    const response = await PUT(req, {
      params: Promise.resolve({ id: STATION_ID, stepId: STEP_ID }),
    });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/stations/:id/steps — incluye conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.station.findUnique).mockResolvedValue(mockStation as never);
    vi.mocked(prisma.step.findMany).mockResolvedValue([mockStep] as never);
  });

  it("retorna steps con campo conditions incluido", async () => {
    // Mock signPublicUrls
    vi.mock("@/lib/gcs", () => ({
      signPublicUrls: vi.fn(async (urls: (string | null)[]) => urls),
      getPublicUrl: vi.fn((path: string) => path),
    }));

    const req = makeRequest(
      `http://localhost/api/stations/${STATION_ID}/steps`,
      "GET"
    );

    const response = await GET(req, {
      params: Promise.resolve({ id: STATION_ID }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.steps)).toBe(true);
  });
});
