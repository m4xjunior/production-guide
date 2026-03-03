import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ConditionInput = {
  matchResponse: string | null;
  nextStepId: string | null;
};

/**
 * PUT /api/stations/:id/steps/:stepId/conditions
 * Replace all conditions for a step atomically (delete + recreate in transaction).
 * Body: { conditions: Array<{ matchResponse: string | null, nextStepId: string | null }> }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const body = await request.json();
    const { conditions } = body;

    // Validate conditions is an array
    if (!Array.isArray(conditions)) {
      return NextResponse.json(
        { error: "El campo 'conditions' debe ser un array" },
        { status: 400 }
      );
    }

    // Verify step exists
    const step = await prisma.step.findUnique({ where: { id: stepId } });
    if (!step) {
      return NextResponse.json(
        { error: "Paso no encontrado" },
        { status: 404 }
      );
    }

    // Atomically delete old conditions and create new ones
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

    // Return updated conditions
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
