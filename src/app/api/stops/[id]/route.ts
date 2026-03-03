import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/stops/:id
 * Cierra un paro de estacion.
 * Body: { endAt? } — si no se proporciona, usa now()
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { endAt } = body;

    const stop = await prisma.stationStop.update({
      where: { id },
      data: {
        endAt: endAt ? new Date(endAt) : new Date(),
      },
    });

    return NextResponse.json({ stop });
  } catch (error) {
    console.error("Error al cerrar paro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
