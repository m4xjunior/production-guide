import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAndUploadTTS } from "@/lib/elevenlabs";
import { getPublicUrl, signPublicUrls } from "@/lib/gcs";

/**
 * GET /api/stations/[id]/steps
 * Pasos ordenados de la estación.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // Verificar que la estación existe
    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const steps = await prisma.step.findMany({
      where: { stationId: id },
      orderBy: { orderNum: "asc" },
    });

    // Assinar vozAudioUrl e photoUrl em paralelo para servir do GCS com autenticação
    const vozUrls = steps.map((s) => s.vozAudioUrl);
    const photoUrls = steps.map((s) => s.photoUrl);

    const [signedVoz, signedPhoto] = await Promise.all([
      signPublicUrls(vozUrls),
      signPublicUrls(photoUrls),
    ]);

    const signedSteps = steps.map((s, i) => ({
      ...s,
      vozAudioUrl: signedVoz[i],
      photoUrl: signedPhoto[i],
    }));

    return NextResponse.json({ steps: signedSteps });
  } catch (error) {
    console.error("Error al listar pasos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stations/[id]/steps
 * Añadir un nuevo paso a la estación.
 * Body: { tipo, mensaje, voz?, responseType?, respuesta?, photoUrl?, isQc?, qcFrequency? }
 * Auto-asigna el siguiente orderNum.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // Verificar que la estación existe
    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      tipo,
      mensaje,
      voz,
      responseType,
      respuesta,
      photoUrl,
      isQc,
      qcFrequency,
    } = body;

    // Validaciones obligatorias
    if (!tipo || typeof tipo !== "string") {
      return NextResponse.json(
        { error: "El campo 'tipo' es obligatorio" },
        { status: 400 },
      );
    }
    if (!mensaje || typeof mensaje !== "string") {
      return NextResponse.json(
        { error: "El campo 'mensaje' es obligatorio" },
        { status: 400 },
      );
    }

    // Obtener el máximo orderNum actual para auto-asignar el siguiente
    const ultimoPaso = await prisma.step.findFirst({
      where: { stationId: id },
      orderBy: { orderNum: "desc" },
      select: { orderNum: true },
    });
    const siguienteOrder = (ultimoPaso?.orderNum ?? 0) + 1;

    const step = await prisma.step.create({
      data: {
        stationId: id,
        orderNum: siguienteOrder,
        tipo,
        mensaje,
        voz: voz ?? null,
        responseType: responseType ?? "voice",
        respuesta: respuesta ?? null,
        photoUrl: photoUrl ?? null,
        isQc: isQc ?? false,
        qcFrequency: qcFrequency ?? null,
      },
    });

    // Generar audio TTS con ElevenLabs si hay texto de voz
    let updatedStep = step;
    if (voz && typeof voz === "string" && voz.trim().length > 0) {
      try {
        const gcsPath = await generateAndUploadTTS(step.id, voz.trim());
        updatedStep = await prisma.step.update({
          where: { id: step.id },
          data: { vozAudioUrl: getPublicUrl(gcsPath) },
        });
      } catch (ttsError) {
        console.error("Error generando TTS para paso:", ttsError);
        // El paso se creó correctamente, solo faltó el audio
      }
    }

    return NextResponse.json({ step: updatedStep }, { status: 201 });
  } catch (error) {
    console.error("Error al crear paso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
