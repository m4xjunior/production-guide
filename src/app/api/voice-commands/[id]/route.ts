import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar que el voice command pertenece al tenant via station
    const cmd = await prisma.voiceCommand.findUnique({
      where: { id },
    });
    if (!cmd || cmd.tenantId !== tenantId) {
      return NextResponse.json({ error: "Comando de voz no encontrado" }, { status: 404 });
    }

    const updated = await prisma.voiceCommand.update({
      where: { id },
      data: {
        ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
        ...(body.phrases !== undefined ? { phrases: body.phrases } : {}),
        ...(body.sequence !== undefined ? { sequence: body.sequence } : {}),
        ...(body.action !== undefined ? { action: body.action } : {}),
      },
    });

    return NextResponse.json({ command: updated });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON inválido en el cuerpo" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

  try {
    const { id } = await params;

    const cmd = await prisma.voiceCommand.findUnique({
      where: { id },
    });
    if (!cmd || cmd.tenantId !== tenantId) {
      return NextResponse.json({ error: "Comando de voz no encontrado" }, { status: 404 });
    }

    await prisma.voiceCommand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Comando de voz no encontrado" }, { status: 404 });
    }
    throw error;
  }
}
