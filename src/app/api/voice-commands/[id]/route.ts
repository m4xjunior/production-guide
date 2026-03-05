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

    // Validar tipos dos campos
    if (body.isEnabled !== undefined && typeof body.isEnabled !== "boolean") {
      return NextResponse.json({ error: "isEnabled debe ser boolean" }, { status: 400 });
    }
    if (body.phrases !== undefined && !Array.isArray(body.phrases)) {
      return NextResponse.json({ error: "phrases debe ser un array" }, { status: 400 });
    }
    if (body.sequence !== undefined && typeof body.sequence !== "number") {
      return NextResponse.json({ error: "sequence debe ser un número" }, { status: 400 });
    }
    if (body.action !== undefined && typeof body.action !== "string") {
      return NextResponse.json({ error: "action debe ser un string" }, { status: 400 });
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
