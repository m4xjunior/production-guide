import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";

/**
 * GET /api/sessions/[id]
 * Estado de la sesión actual con progreso del operario.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

  const { id } = await params;

  try {
    const session = await prisma.operatorSession.findUnique({
      where: { id },
      include: {
        station: true,
      },
    });

    if (!session || session.station.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    const totalPasos = await prisma.step.count({
      where: { stationId: session.stationId },
    });

    const logsUnidadActual = await prisma.stepLog.findMany({
      where: {
        sessionId: id,
      },
      orderBy: { completedAt: "desc" },
      take: totalPasos,
    });

    const pasosCompletadosUnidadActual = logsUnidadActual.filter(
      (log) => !log.wasSkipped,
    ).length;

    const pasosRegistradosIds = new Set(
      logsUnidadActual.map((log) => log.stepId),
    );

    const pasos = await prisma.step.findMany({
      where: { stationId: session.stationId },
      orderBy: { orderNum: "asc" },
    });

    let pasoActual = null;
    for (const paso of pasos) {
      if (!pasosRegistradosIds.has(paso.id)) {
        pasoActual = paso;
        break;
      }
    }

    return NextResponse.json({
      session,
      progreso: {
        totalPasos,
        pasosCompletadosUnidadActual,
        unidadesCompletadas: session.completedUnits,
        pasoActual,
      },
    });
  } catch (error) {
    console.error("Error al obtener sesión:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
