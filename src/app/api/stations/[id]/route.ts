import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/stations/[id]
 * Detalle de una estación con todos sus pasos ordenados por orderNum.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const station = await prisma.station.findFirst({
      where: { id, isActive: true },
      include: {
        references: {
          include: {
            reference: {
              select: { id: true, sageCode: true, name: true },
            },
          },
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const steps = await prisma.step.findMany({
      where: { stationId: id },
      orderBy: { orderNum: "asc" },
    });

    // Flatten the references into a simpler array
    const references = station.references.map((sr) => sr.reference);

    return NextResponse.json({ station: { ...station, references }, steps });
  } catch (error) {
    console.error("Error al obtener estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/stations/[id]
 * Editar una estación (admin).
 * Body: { name?, description?, productCode?, isActive? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, productCode, isActive, referenceIds } = body;

    // Verificar que la estación existe
    const existing = await prisma.station.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const station = await prisma.station.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(productCode !== undefined && { productCode }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Sync station references if provided
    if (Array.isArray(referenceIds)) {
      const invalidIds = referenceIds.filter(
        (refId: unknown) => typeof refId !== "string" || (refId as string).trim() === ""
      );
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "Todos los referenceIds deben ser strings no vacíos" },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.stationReference.deleteMany({ where: { stationId: id } });
        if (referenceIds.length > 0) {
          await tx.stationReference.createMany({
            data: referenceIds.map((referenceId: string) => ({
              stationId: id,
              referenceId,
            })),
          });
        }
      });
    }

    return NextResponse.json({ station });
  } catch (error) {
    console.error("Error al editar estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/stations/[id]
 * Desactivar estación (soft delete: isActive=false).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const existing = await prisma.station.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const station = await prisma.station.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ station, message: "Estación desactivada" });
  } catch (error) {
    console.error("Error al desactivar estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
