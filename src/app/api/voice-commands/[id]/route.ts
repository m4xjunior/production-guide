import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.voiceCommand.update({
    where: { id },
    data: {
      ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
      ...(body.phrases ? { phrases: body.phrases } : {}),
      ...(body.sequence !== undefined ? { sequence: body.sequence } : {}),
      ...(body.action ? { action: body.action } : {}),
    },
  });

  return NextResponse.json({ command: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.voiceCommand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
