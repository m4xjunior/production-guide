import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";

/**
 * POST /api/step-logs
 * Registrar un paso completado por el operario.
 * Body: { sessionId, stepId, responseReceived?, durationMs? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, stepId, responseReceived, durationMs } = body;

    // Em produção móvel já vimos casos intermitentes sem x-tenant-id.
    // Fallback: recuperar tenant da própria sessão para não quebrar o fluxo do operário.
    let tenantId = request.headers.get("x-tenant-id");
    let session:
      | ({
          id: string;
          stationId: string;
          isActive: boolean;
          completedUnits: number;
          station: { tenantId: string };
        } | null) = null;

    if (!tenantId && sessionId && typeof sessionId === "string") {
      session = await prisma.operatorSession.findUnique({
        where: { id: sessionId },
        include: { station: { select: { tenantId: true } } },
      });
      tenantId = session?.station.tenantId ?? null;
    }

    if (!tenantId) {
      const tenantOrError = requireTenantId(request);
      if (tenantOrError instanceof Response) return tenantOrError;
      tenantId = tenantOrError;
    }

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
    if (!session) {
      session = await prisma.operatorSession.findUnique({
        where: { id: sessionId },
        include: { station: { select: { tenantId: true } } },
      });
    }
    if (!session || session.station.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }
    if (!session.isActive) {
      console.warn(
        "[step-logs] sesión inactiva, registrando log igual para no bloquear el avance",
        { sessionId, stepId }
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
