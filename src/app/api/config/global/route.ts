import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.globalSettings.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error al obtener configuración global:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
    }

    const body = await request.json();
    const allowed = [
      "ttsVoiceId", "ttsSpeed", "ttsStability", "ttsSimilarity",
      "fontSize", "theme", "defaultLanguage",
      "autoAdvanceDelay", "enableQcByDefault",
      "whisperServerUrl", "useWhisperSTT",
    ];
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No se proporcionaron campos válidos para actualizar" }, { status: 400 });
    }

    const current = await prisma.globalSettings.findUnique({ where: { id: "global" } });
    const settings = await prisma.globalSettings.update({
      where: { id: "global" },
      data: { ...data, updatedBy: "admin" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
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
