import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAndUploadTTS } from "@/lib/elevenlabs";
import { getPublicUrl } from "@/lib/gcs";

/**
 * POST /api/tts/generate-all
 * Genera audio TTS para todos los pasos que tengan texto de voz
 * pero no tengan audio generado (vozAudioUrl = null).
 * Con ?force=true regenera todos (reseta vozAudioUrl primero).
 * Protegido por middleware admin.
 */
export async function POST(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get("force") === "true";

    if (force) {
      await prisma.step.updateMany({
        where: { voz: { not: null } },
        data: { vozAudioUrl: null },
      });
    }

    const steps = await prisma.step.findMany({
      where: {
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

    for (const step of steps) {
      if (!step.voz) continue;

      try {
        const gcsPath = await generateAndUploadTTS(step.id, step.voz);
        await prisma.step.update({
          where: { id: step.id },
          data: { vozAudioUrl: getPublicUrl(gcsPath) },
        });
        generated++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        errors.push({ stepId: step.id, error: errorMsg });
        console.error(`Error generando TTS para paso ${step.id}:`, err);
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
