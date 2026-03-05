import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, prisma, requireTenantId } from "@/lib/db";

/**
 * POST /api/stops
 * Registra inicio de un paro de estacion.
 * Body: { stationId, sessionId?, reason? }
 */
export async function POST(request: NextRequest) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  try {
    const body = await request.json();
    const { stationId, sessionId, reason } = body;

    if (!stationId || typeof stationId !== "string" || stationId.trim() === "") {
      return NextResponse.json(
        { error: "El campo 'stationId' es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar estación pertenece al tenant (filtro automático)
    const station = await db.station.findFirst({ where: { id: stationId } });
    if (!station) {
      return NextResponse.json(
        { error: "Estacion no encontrada" },
        { status: 404 }
      );
    }

    const stop = await prisma.stationStop.create({
      data: {
        stationId,
        sessionId: sessionId ?? null,
        reason: reason ?? null,
        startAt: new Date(),
        endAt: null,
      },
    });

    return NextResponse.json(
      {
        stop: {
          id: stop.id,
          stationId: stop.stationId,
          sessionId: stop.sessionId,
          startAt: stop.startAt,
          reason: stop.reason,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar paro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stops?stationId=<id>&from=<iso>&to=<iso>
 * Lista paros de una estacion en un intervalo de tiempo.
 */
export async function GET(request: NextRequest) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!stationId || stationId.trim() === "") {
      return NextResponse.json(
        { error: "El parametro 'stationId' es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar estación pertenece al tenant
    const station = await db.station.findFirst({ where: { id: stationId } });
    if (!station) {
      return NextResponse.json(
        { error: "Estacion no encontrada" },
        { status: 404 }
      );
    }

    const where: {
      stationId: string;
      startAt?: { gte?: Date; lte?: Date };
    } = { stationId };

    if (from || to) {
      where.startAt = {};
      if (from) where.startAt.gte = new Date(from);
      if (to) where.startAt.lte = new Date(to);
    }

    const stops = await prisma.stationStop.findMany({
      where,
      orderBy: { startAt: "desc" },
    });

    const stopsWithDuration = stops.map((stop) => ({
      ...stop,
      durationMs:
        stop.endAt != null
          ? stop.endAt.getTime() - stop.startAt.getTime()
          : null,
    }));

    return NextResponse.json({ stops: stopsWithDuration });
  } catch (error) {
    console.error("Error al listar paros:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
