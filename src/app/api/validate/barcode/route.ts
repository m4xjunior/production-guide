import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/validate/barcode
 * Validar un escaneo de código de barras.
 * Body: { stepId, scannedCode }
 * Compara el código escaneado con la respuesta esperada del paso.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stepId, scannedCode } = body;

    if (!stepId || typeof stepId !== "string") {
      return NextResponse.json(
        { error: "El campo 'stepId' es obligatorio" },
        { status: 400 },
      );
    }
    if (!scannedCode || typeof scannedCode !== "string") {
      return NextResponse.json(
        { error: "El campo 'scannedCode' es obligatorio" },
        { status: 400 },
      );
    }

    // Buscar el paso
    const step = await prisma.step.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      return NextResponse.json(
        { error: "Paso no encontrado" },
        { status: 404 },
      );
    }

    // Si el paso no tiene respuesta esperada, no se puede validar
    if (!step.respuesta) {
      return NextResponse.json(
        { error: "Este paso no tiene código de barras esperado configurado" },
        { status: 400 },
      );
    }

    // Comparar el código escaneado con el esperado (insensible a mayúsculas/minúsculas y espacios)
    const codigoEsperado = step.respuesta.trim().toLowerCase();
    const codigoEscaneado = scannedCode.trim().toLowerCase();
    const coincide = codigoEscaneado === codigoEsperado;

    return NextResponse.json({
      match: coincide,
      expected: step.respuesta,
    });
  } catch (error) {
    console.error("Error al validar código de barras:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
