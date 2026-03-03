import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/sessions/[id]
 * Estado de la sesión actual con progreso del operario.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const session = await prisma.operatorSession.findUnique({
      where: { id },
      include: {
        station: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    // Obtener total de pasos de la estación
    const totalPasos = await prisma.step.count({
      where: { stationId: session.stationId },
    });

    // Obtener logs de la unidad actual (después del último incremento de completedUnits)
    // Los logs de la unidad en curso son los que no forman parte de unidades ya completadas
    const logsUnidadActual = await prisma.stepLog.findMany({
      where: {
        sessionId: id,
      },
      orderBy: { completedAt: "desc" },
      take: totalPasos, // Como máximo habrá tantos logs como pasos en la unidad actual
    });

    // Contar pasos completados (no saltados) en la unidad actual
    const pasosCompletadosUnidadActual = logsUnidadActual.filter(
      (log) => !log.wasSkipped,
    ).length;

    // Calcular el paso actual basándose en los logs de la última unidad
    const pasosRegistradosIds = new Set(
      logsUnidadActual.map((log) => log.stepId),
    );

    // Obtener pasos ordenados para determinar en cuál va
    const pasos = await prisma.step.findMany({
      where: { stationId: session.stationId },
      orderBy: { orderNum: "asc" },
    });

    // El paso actual es el primero que no tiene log en la unidad actual
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
