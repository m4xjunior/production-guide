import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, prisma, requireTenantId } from "@/lib/db";

type ConditionInput = {
  matchResponse: string | null;
  nextStepId: string | null;
};

/**
 * PUT /api/stations/:id/steps/:stepId/conditions
 * Replace all conditions for a step atomically (delete + recreate in transaction).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  try {
    const { id, stepId } = await params;
    const body = await request.json();
    const { conditions } = body;

    if (!Array.isArray(conditions)) {
      return NextResponse.json(
        { error: "El campo 'conditions' debe ser un array" },
        { status: 400 }
      );
    }

    // Verificar que la estación pertenece al tenant
    const station = await db.station.findFirst({ where: { id } });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 }
      );
    }

    const step = await prisma.step.findUnique({ where: { id: stepId } });
    if (!step || step.stationId !== id) {
      return NextResponse.json(
        { error: "Paso no encontrado" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.stepCondition.deleteMany({ where: { stepId } });

      if (conditions.length > 0) {
        await tx.stepCondition.createMany({
          data: conditions.map((c: ConditionInput) => ({
            stepId,
            matchResponse: c.matchResponse ?? null,
            nextStepId: c.nextStepId ?? null,
          })),
        });
      }
    });

    const updatedConditions = await prisma.stepCondition.findMany({
      where: { stepId },
    });

    return NextResponse.json({ conditions: updatedConditions });
  } catch (error) {
    console.error("Error al actualizar condiciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
