import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/validate/operator
 * Valida si un código de operario existe en la tabla de operadores (sincronizada desde Sage).
 * Body: { code: "1234" }
 * Returns: { valid: true, name: "João Silva", sageCode: "1234" } | { valid: false }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "El campo 'code' es obligatorio" },
        { status: 400 },
      );
    }

    const operator = await prisma.operator.findUnique({
      where: { sageCode: code },
    });

    if (!operator || !operator.isActive) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      name: operator.name,
      sageCode: operator.sageCode,
    });
  } catch (error) {
    console.error("Error validating operator:", error);
    return NextResponse.json(
      { valid: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
