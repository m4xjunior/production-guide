import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/stations/[id]/steps/reorder
 * Reordenar pasos de la estación.
 * Body: { stepIds: string[] }
 * Actualiza orderNum según la posición en el array.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // Verificar que la estación existe
    const station = await prisma.station.findUnique({ where: { id } });
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

    // Verificar que todos los stepIds pertenecen a esta estación
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

    // Verificar que se incluyen todos los pasos
    if (stepIds.length !== pasosExistentes.length) {
      return NextResponse.json(
        { error: "El array stepIds debe incluir todos los pasos de la estación" },
        { status: 400 },
      );
    }

    // Actualizar orderNum según posición en el array
    // Usamos una transacción para garantizar consistencia
    // Primero ponemos orderNum negativo temporal para evitar conflictos de unique constraint
    await prisma.$transaction(async (tx) => {
      // Fase 1: asignar orderNum negativos temporales para evitar conflictos
      for (let i = 0; i < stepIds.length; i++) {
        await tx.step.update({
          where: { id: stepIds[i] },
          data: { orderNum: -(i + 1) },
        });
      }
      // Fase 2: asignar los orderNum definitivos
      for (let i = 0; i < stepIds.length; i++) {
        await tx.step.update({
          where: { id: stepIds[i] },
          data: { orderNum: i + 1 },
        });
      }
    });

    // Devolver los pasos en el nuevo orden
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
