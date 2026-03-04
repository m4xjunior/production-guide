import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/stations
 * Lista todas las estaciones activas con el conteo de pasos.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const stations = await prisma.station.findMany({
      where: { isActive: true, ...(tenantId ? { tenantId } : {}) },
      include: {
        _count: { select: { steps: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Aplanar el campo _count para devolver stepsCount
    const resultado = stations.map((s) => ({
      ...s,
      stepsCount: s._count.steps,
      _count: undefined,
    }));

    return NextResponse.json({ stations: resultado });
  } catch (error) {
    console.error("Error al listar estaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stations
 * Crear una nueva estación (admin).
 * Body: { name, description?, productCode? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, productCode } = body;
    const tenantId = request.headers.get("x-tenant-id");

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "El campo 'name' es obligatorio" },
        { status: 400 },
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant no resuelto" },
        { status: 400 },
      );
    }

    const station = await prisma.station.create({
      data: {
        name,
        description: description ?? null,
        productCode: productCode ?? null,
        tenantId,
      },
    });

    return NextResponse.json({ station }, { status: 201 });
  } catch (error) {
    console.error("Error al crear estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
