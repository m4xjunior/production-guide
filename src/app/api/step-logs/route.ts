import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/step-logs
 * Registrar un paso completado por el operario.
 * Body: { sessionId, stepId, responseReceived?, durationMs? }
 *
 * Lógica de frecuencia QC:
 * - Si el paso es QC (isQc=true) y tiene qcFrequency definido:
 *   - Se consulta session.completedUnits
 *   - Si completedUnits % qcFrequency !== 0, se marca wasSkipped=true y se devuelve { skipped: true }
 *   - En caso contrario, se registra normalmente
 *
 * Después de registrar el ÚLTIMO paso de la estación, se incrementa session.completedUnits en 1.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, stepId, responseReceived, durationMs } = body;

    // Validaciones de campos obligatorios
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

    // Verificar que la sesión existe y está activa
    const session = await prisma.operatorSession.findUnique({
      where: { id: sessionId },
    });
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

    // Verificar que el paso existe y pertenece a la estación de la sesión
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

    // Lógica de frecuencia QC
    let wasSkipped = false;
    if (step.isQc && step.qcFrequency !== null && step.qcFrequency > 0) {
      // Verificar si esta unidad requiere control de calidad
      if (session.completedUnits % step.qcFrequency !== 0) {
        wasSkipped = true;
      }
    }

    // Crear el registro del log
    const stepLog = await prisma.stepLog.create({
      data: {
        sessionId,
        stepId,
        responseReceived: wasSkipped ? null : (responseReceived ?? null),
        durationMs: durationMs ?? null,
        wasSkipped,
      },
    });

    // Si fue saltado por frecuencia QC, devolver indicación
    if (wasSkipped) {
      return NextResponse.json(
        { stepLog, skipped: true, message: "Paso QC saltado por frecuencia" },
        { status: 201 },
      );
    }

    // Verificar si es el ÚLTIMO paso de la estación para incrementar unidades completadas
    const totalPasos = await prisma.step.count({
      where: { stationId: session.stationId },
    });

    // Contar los logs de esta sesión para la unidad actual
    // Los logs de la unidad actual son los últimos N logs (donde N = totalPasos)
    const logsUnidadActual = await prisma.stepLog.count({
      where: {
        sessionId,
        // Contar solo los logs después de la última unidad completada
        // Esto se calcula como: todos los logs - (completedUnits * totalPasos)
      },
    });

    // Los logs de la unidad actual = total de logs - (unidades completadas * total pasos)
    const logsDeLaUnidadActual =
      logsUnidadActual - session.completedUnits * totalPasos;

    if (logsDeLaUnidadActual >= totalPasos) {
      // Se completaron todos los pasos de esta unidad, incrementar contador
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
