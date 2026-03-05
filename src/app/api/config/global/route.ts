import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Configurações globais do tenant — lê/escreve do modelo Tenant.
 * Substitui o antigo singleton GlobalSettings.
 */

// Campos do Tenant que são expostos como "settings"
const TENANT_SETTING_FIELDS = {
  ttsVoiceId: true,
  ttsSpeed: true,
  ttsStability: true,
  ttsSimilarity: true,
  fontSize: true,
  theme: true,
  defaultLanguage: true,
  autoAdvanceDelay: true,
} as const;

type Features = {
  whisperStt?: boolean;
  elevenLabsTts?: boolean;
  qcDefault?: boolean;
  barcodeScanning?: boolean;
  whisperServerUrl?: string;
};

function tenantToSettings(tenant: {
  ttsVoiceId: string;
  ttsSpeed: number;
  ttsStability: number;
  ttsSimilarity: number;
  fontSize: number;
  theme: string;
  defaultLanguage: string;
  autoAdvanceDelay: number;
  features: unknown;
  updatedAt: Date;
}) {
  const features = (tenant.features ?? {}) as Features;
  return {
    ttsVoiceId: tenant.ttsVoiceId,
    ttsSpeed: tenant.ttsSpeed,
    ttsStability: tenant.ttsStability,
    ttsSimilarity: tenant.ttsSimilarity,
    fontSize: tenant.fontSize,
    theme: tenant.theme,
    defaultLanguage: tenant.defaultLanguage,
    autoAdvanceDelay: tenant.autoAdvanceDelay,
    enableQcByDefault: features.qcDefault ?? false,
    whisperServerUrl: features.whisperServerUrl ?? "ws://localhost:8765",
    useWhisperSTT: features.whisperStt ?? false,
    updatedAt: tenant.updatedAt.toISOString(),
    updatedBy: null as string | null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ settings: tenantToSettings(tenant) });
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

    // Separar campos diretos do Tenant vs campos que vão no features JSON
    const directData: Record<string, unknown> = {};
    const featureUpdates: Record<string, unknown> = {};

    const directAllowed = Object.keys(TENANT_SETTING_FIELDS);
    const featureMapping: Record<string, string> = {
      enableQcByDefault: "qcDefault",
      useWhisperSTT: "whisperStt",
      whisperServerUrl: "whisperServerUrl",
    };

    for (const [key, value] of Object.entries(body)) {
      if (directAllowed.includes(key)) {
        directData[key] = value;
      } else if (key in featureMapping) {
        featureUpdates[featureMapping[key]] = value;
      }
    }

    if (Object.keys(directData).length === 0 && Object.keys(featureUpdates).length === 0) {
      return NextResponse.json({ error: "No se proporcionaron campos válidos para actualizar" }, { status: 400 });
    }

    // Buscar tenant atual para merge de features
    const current = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!current) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Merge features
    if (Object.keys(featureUpdates).length > 0) {
      const currentFeatures = (current.features ?? {}) as Features;
      directData.features = { ...currentFeatures, ...featureUpdates };
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: directData,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "UPDATE_TENANT_SETTINGS",
        entityType: "Tenant",
        entityId: tenantId,
        oldValue: tenantToSettings(current) as unknown as object,
        newValue: tenantToSettings(updated) as unknown as object,
        performedBy: "admin",
      },
    });

    return NextResponse.json({ settings: tenantToSettings(updated) });
  } catch (error) {
    console.error("Error al actualizar configuración global:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
