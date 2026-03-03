import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ELEVENLABS_SIGNED_URL_ENDPOINT =
  "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url";

type SessionRequestBody = {
  sessionId?: unknown;
  stationId?: unknown;
  stepId?: unknown;
};

type ElevenSessionResponse =
  | {
      provider: "elevenlabs";
      signedUrl: string;
      agentId: string;
    }
  | {
      provider: "fallback";
      reason: string;
    };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const runtime = "nodejs";

/**
 * POST /api/elevenlabs/session
 * Crea una sesión privada (signed URL) para usar ElevenLabs desde el cliente
 * sin exponer la API key.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionRequestBody;
    const { sessionId, stationId, stepId } = body;

    if (!isNonEmptyString(sessionId)) {
      return NextResponse.json(
        { error: "El campo 'sessionId' es obligatorio" },
        { status: 400 },
      );
    }
    if (!isNonEmptyString(stationId)) {
      return NextResponse.json(
        { error: "El campo 'stationId' es obligatorio" },
        { status: 400 },
      );
    }
    if (!isNonEmptyString(stepId)) {
      return NextResponse.json(
        { error: "El campo 'stepId' es obligatorio" },
        { status: 400 },
      );
    }

    const [session, station, step] = await Promise.all([
      prisma.operatorSession.findUnique({
        where: { id: sessionId },
        select: { id: true, stationId: true, isActive: true },
      }),
      prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true, isActive: true },
      }),
      prisma.step.findUnique({
        where: { id: stepId },
        select: { id: true, stationId: true, responseType: true },
      }),
    ]);

    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }
    if (!session.isActive) {
      return NextResponse.json(
        { error: "La sesión no está activa" },
        { status: 400 },
      );
    }

    if (!station || !station.isActive) {
      return NextResponse.json(
        { error: "Estación no encontrada o inactiva" },
        { status: 404 },
      );
    }

    if (!step) {
      return NextResponse.json(
        { error: "Paso no encontrado" },
        { status: 404 },
      );
    }
    if (step.responseType !== "voice") {
      return NextResponse.json(
        { error: "El paso no es de tipo voz" },
        { status: 400 },
      );
    }

    if (session.stationId !== stationId || step.stationId !== stationId) {
      return NextResponse.json(
        { error: "Sesión, estación y paso no pertenecen al mismo contexto" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey || !agentId) {
      const response: ElevenSessionResponse = {
        provider: "fallback",
        reason: "ElevenLabs no configurado en servidor",
      };
      return NextResponse.json(response, { status: 200 });
    }

    const url = new URL(ELEVENLABS_SIGNED_URL_ENDPOINT);
    url.searchParams.set("agent_id", agentId);

    const signedUrlResponse = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!signedUrlResponse.ok) {
      const response: ElevenSessionResponse = {
        provider: "fallback",
        reason: `ElevenLabs indisponible (${signedUrlResponse.status})`,
      };
      return NextResponse.json(response, { status: 200 });
    }

    const signedUrlData = (await signedUrlResponse.json()) as {
      signed_url?: string;
    };

    if (!signedUrlData.signed_url) {
      const response: ElevenSessionResponse = {
        provider: "fallback",
        reason: "Respuesta inválida de ElevenLabs",
      };
      return NextResponse.json(response, { status: 200 });
    }

    const response: ElevenSessionResponse = {
      provider: "elevenlabs",
      signedUrl: signedUrlData.signed_url,
      agentId,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error creating ElevenLabs session:", error);
    return NextResponse.json(
      {
        provider: "fallback",
        reason: "Error interno al crear sesión ElevenLabs",
      } satisfies ElevenSessionResponse,
      { status: 200 },
    );
  }
}
