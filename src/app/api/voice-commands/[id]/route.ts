import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Comando de voz no encontrado" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.voiceCommand.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Comando de voz no encontrado" }, { status: 404 });
    }
    throw error;
  }
}
