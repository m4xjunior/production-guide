import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, requireTenantId } from "@/lib/db";

/**
 * GET /api/stations/[id]
 * Detalle de una estación con todos sus pasos ordenados por orderNum.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  try {
    const [station, steps] = await Promise.all([
      db.station.findFirst({
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
      }),
      db.step.findMany({
        where: { stationId: id },
        orderBy: { orderNum: "asc" },
      }),
    ]);

    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

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
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, productCode, isActive, referenceIds } = body;

    const existing = await db.station.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const station = await db.station.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(productCode !== undefined && { productCode }),
        ...(isActive !== undefined && { isActive }),
      },
    });

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

      await db.$transaction(async (tx) => {
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  try {
    const existing = await db.station.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const station = await db.station.update({
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
