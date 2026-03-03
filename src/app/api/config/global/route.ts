import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const settings = await prisma.globalSettings.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const allowed = [
      "ttsVoiceId", "ttsSpeed", "ttsStability", "ttsSimilarity",
      "fontSize", "theme", "defaultLanguage",
      "autoAdvanceDelay", "enableQcByDefault",
      "whisperServerUrl", "useWhisperSTT",
    ];
    const current = await prisma.globalSettings.findUnique({ where: { id: "global" } });
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    const settings = await prisma.globalSettings.update({
      where: { id: "global" },
      data: { ...data, updatedBy: "admin" },
    });
    await prisma.auditLog.create({
      data: {
        action: "UPDATE_GLOBAL_SETTINGS",
        entityType: "GlobalSettings",
        entityId: "global",
        oldValue: current as object,
        newValue: settings as object,
        performedBy: "admin",
      },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error al actualizar configuración global:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
