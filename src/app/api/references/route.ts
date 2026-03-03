import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/references
 * Lista todas las referencias activas sincronizadas desde Sage.
 */
export async function GET() {
  try {
    const references = await prisma.reference.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, sageCode: true, name: true },
    });
    return NextResponse.json({ references });
  } catch (error) {
    console.error("Error al obtener referencias:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
