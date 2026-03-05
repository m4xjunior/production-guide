import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAndUploadTTS } from "@/lib/elevenlabs";
import { getPublicUrl } from "@/lib/gcs";

/**
 * POST /api/tts/generate-all
 * Genera audio TTS para todos los pasos que tengan texto de voz
 * pero no tengan audio generado (vozAudioUrl = null).
 * Con ?force=true regenera todos (reseta vozAudioUrl primero).
 * Protegido por middleware admin. Scoped al tenant del request.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
    }

    const force = request.nextUrl.searchParams.get("force") === "true";

    // Obtener IDs de estaciones del tenant para acotar el scope
    const tenantStations = await prisma.station.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const stationIds = tenantStations.map((s) => s.id);

    if (stationIds.length === 0) {
      return NextResponse.json({ message: "No hay estaciones para este tenant", generated: 0 });
    }

    if (force) {
      await prisma.step.updateMany({
        where: { stationId: { in: stationIds }, voz: { not: null } },
        data: { vozAudioUrl: null },
      });
    }

    const steps = await prisma.step.findMany({
      where: {
        stationId: { in: stationIds },
        voz: { not: null },
        vozAudioUrl: null,
      },
      select: { id: true, voz: true },
    });

    if (steps.length === 0) {
      return NextResponse.json({
        message: "Todos los pasos ya tienen audio generado",
        generated: 0,
      });
    }

    let generated = 0;
    const errors: { stepId: string; error: string }[] = [];

    // Processar em batches de 5 para respeitar rate limits da API
    const BATCH_SIZE = 5;
    const stepsWithVoz = steps.filter((s) => s.voz);

    for (let i = 0; i < stepsWithVoz.length; i += BATCH_SIZE) {
      const batch = stepsWithVoz.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (step) => {
          const gcsPath = await generateAndUploadTTS(step.id, step.voz!);
          await prisma.step.update({
            where: { id: step.id },
            data: { vozAudioUrl: getPublicUrl(gcsPath) },
          });
          return step.id;
        }),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          generated++;
        } else {
          const errorMsg = result.reason instanceof Error ? result.reason.message : "Error desconocido";
          errors.push({ stepId: batch[j].id, error: errorMsg });
          console.error(`Error generando TTS para paso ${batch[j].id}:`, result.reason);
        }
      }
    }

    return NextResponse.json({
      message: `Generados ${generated} de ${steps.length} audios`,
      generated,
      total: steps.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error en generación masiva de TTS:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
