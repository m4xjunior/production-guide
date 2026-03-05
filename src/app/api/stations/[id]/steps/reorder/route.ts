import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, prisma, requireTenantId } from "@/lib/db";

/**
 * PATCH /api/stations/[id]/steps/reorder
 * Reordenar pasos de la estación.
 * Body: { stepIds: string[] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  try {
    const station = await db.station.findFirst({ where: { id } });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { stepIds } = body;

    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array 'stepIds' no vacío" },
        { status: 400 },
      );
    }

    const pasosExistentes = await prisma.step.findMany({
      where: { stationId: id },
      select: { id: true },
    });
    const idsExistentes = new Set(pasosExistentes.map((p) => p.id));

    for (const stepId of stepIds) {
      if (!idsExistentes.has(stepId)) {
        return NextResponse.json(
          { error: `El paso '${stepId}' no pertenece a esta estación` },
          { status: 400 },
        );
      }
    }

    if (stepIds.length !== pasosExistentes.length) {
      return NextResponse.json(
        { error: "El array stepIds debe incluir todos los pasos de la estación" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < stepIds.length; i++) {
        await tx.step.update({
          where: { id: stepIds[i] },
          data: { orderNum: -(i + 1) },
        });
      }
      for (let i = 0; i < stepIds.length; i++) {
        await tx.step.update({
          where: { id: stepIds[i] },
          data: { orderNum: i + 1 },
        });
      }
    });

    const steps = await prisma.step.findMany({
      where: { stationId: id },
      orderBy: { orderNum: "asc" },
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error("Error al reordenar pasos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
