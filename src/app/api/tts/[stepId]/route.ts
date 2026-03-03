import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { downloadBuffer } from "@/lib/gcs";

/**
 * GET /api/tts/[stepId]
 * Sirve el audio TTS pre-generado para un paso.
 * Busca el vozAudioUrl del paso y sirve el MP3 desde GCS.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> },
) {
  const { stepId } = await params;

  try {
    const step = await prisma.step.findUnique({
      where: { id: stepId },
      select: { vozAudioUrl: true, voz: true },
    });

    if (!step) {
      return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
    }

    if (!step.vozAudioUrl) {
      return NextResponse.json({ error: "Audio no disponible para este paso" }, { status: 404 });
    }

    // El vozAudioUrl contiene la URL pública completa.
    // Extraer el path GCS relativo al tenant.
    const gcsPath = `tts/${stepId}.mp3`;

    try {
      const buffer = await downloadBuffer(gcsPath);
      // Convert Node Buffer to ArrayBuffer for Web API compatibility
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch {
      return NextResponse.json({ error: "Audio no encontrado en almacenamiento" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error sirviendo audio TTS:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
