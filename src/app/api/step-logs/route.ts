import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";

/**
 * POST /api/step-logs
 * Registrar un paso completado por el operario.
 * Body: { sessionId, stepId, responseReceived?, durationMs? }
 */
export async function POST(request: NextRequest) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

  try {
    const body = await request.json();
    const { sessionId, stepId, responseReceived, durationMs } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "El campo 'sessionId' es obligatorio" },
        { status: 400 },
      );
    }
    if (!stepId || typeof stepId !== "string") {
      return NextResponse.json(
        { error: "El campo 'stepId' es obligatorio" },
        { status: 400 },
      );
    }

    // Verificar que la sesión existe, está activa y pertenece al tenant
    const session = await prisma.operatorSession.findUnique({
      where: { id: sessionId },
      include: { station: { select: { tenantId: true } } },
    });
    if (!session || session.station.tenantId !== tenantId) {
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

    const step = await prisma.step.findUnique({
      where: { id: stepId },
    });
    if (!step) {
      return NextResponse.json(
        { error: "Paso no encontrado" },
        { status: 404 },
      );
    }
    if (step.stationId !== session.stationId) {
      return NextResponse.json(
        { error: "El paso no pertenece a la estación de esta sesión" },
        { status: 400 },
      );
    }

    let wasSkipped = false;
    if (step.isQc && step.qcFrequency !== null && step.qcFrequency > 0) {
      if (session.completedUnits % step.qcFrequency !== 0) {
        wasSkipped = true;
      }
    }

    const stepLog = await prisma.stepLog.create({
      data: {
        sessionId,
        stepId,
        responseReceived: wasSkipped ? null : (responseReceived ?? null),
        durationMs: durationMs ?? null,
        wasSkipped,
      },
    });

    if (wasSkipped) {
      return NextResponse.json(
        { stepLog, skipped: true, message: "Paso QC saltado por frecuencia" },
        { status: 201 },
      );
    }

    const totalPasos = await prisma.step.count({
      where: { stationId: session.stationId },
    });

    const logsUnidadActual = await prisma.stepLog.count({
      where: { sessionId },
    });

    const logsDeLaUnidadActual =
      logsUnidadActual - session.completedUnits * totalPasos;

    if (logsDeLaUnidadActual >= totalPasos) {
      await prisma.operatorSession.update({
        where: { id: sessionId },
        data: {
          completedUnits: { increment: 1 },
        },
      });

      return NextResponse.json(
        {
          stepLog,
          skipped: false,
          unidadCompletada: true,
          unidadesCompletadas: session.completedUnits + 1,
          message: "Unidad completada",
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { stepLog, skipped: false, unidadCompletada: false },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error al registrar paso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
