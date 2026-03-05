import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";

/**
 * POST /api/validate/barcode
 * Validar un escaneo de código de barras.
 * Body: { stepId, scannedCode }
 */
export async function POST(request: NextRequest) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

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

    const step = await prisma.step.findUnique({
      where: { id: stepId },
      include: { station: { select: { tenantId: true } } },
    });

    if (!step || step.station.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Paso no encontrado" },
        { status: 404 },
      );
    }

    if (!step.respuesta) {
      return NextResponse.json(
        { error: "Este paso no tiene código de barras esperado configurado" },
        { status: 400 },
      );
    }

    const codigoEsperado = step.respuesta.trim().toLowerCase();
    const codigoEscaneado = scannedCode.trim().toLowerCase();
    const coincide = codigoEscaneado === codigoEsperado;

    return NextResponse.json({
      match: coincide,
    });
  } catch (error) {
    console.error("Error al validar código de barras:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
