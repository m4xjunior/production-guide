import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/sessions/[id]/logout
 * Terminar sesión de operario.
 * Establece logoutAt y isActive=false.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const session = await prisma.operatorSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        { error: "La sesión ya está cerrada" },
        { status: 400 },
      );
    }

    const sessionActualizada = await prisma.operatorSession.update({
      where: { id },
      data: {
        logoutAt: new Date(),
        isActive: false,
      },
    });

    return NextResponse.json({
      session: sessionActualizada,
      message: "Sesión cerrada correctamente",
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
