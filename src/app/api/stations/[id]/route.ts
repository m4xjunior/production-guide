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
    const station = await prisma.station.findUnique({
      where: { id },
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

    return NextResponse.json({ station, steps });
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
    const { name, description, productCode, isActive } = body;

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
