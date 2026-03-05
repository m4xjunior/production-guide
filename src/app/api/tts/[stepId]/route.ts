import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { downloadBuffer, fileExists } from "@/lib/gcs";

/**
 * GET /api/tts/[stepId]
 * Sirve el audio TTS pre-generado para un paso.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

  const { stepId } = await params;

  try {
    const step = await prisma.step.findUnique({
      where: { id: stepId },
      select: { vozAudioUrl: true, voz: true, station: { select: { tenantId: true } } },
    });

    if (!step || step.station.tenantId !== tenantId) {
      return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
    }

    if (!step.vozAudioUrl) {
      return NextResponse.json({ error: "Audio no disponible para este paso" }, { status: 404 });
    }

    const gcsPath = `tts/${stepId}.mp3`;

    const exists = await fileExists(gcsPath);
    if (!exists) {
      console.error(`Audio file missing in GCS: ${gcsPath}`);
      return NextResponse.json({ error: "Audio no encontrado en almacenamiento" }, { status: 404 });
    }

    try {
      const buffer = await downloadBuffer(gcsPath);
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
