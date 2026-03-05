import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, prisma, requireTenantId } from "@/lib/db";
import { generateAndUploadTTS } from "@/lib/elevenlabs";
import { getPublicUrl, signPublicUrls } from "@/lib/gcs";

/**
 * GET /api/stations/[id]/steps
 * Pasos ordenados de la estación.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  try {
    const station = await db.station.findFirst({ where: { id } });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 },
      );
    }

    const steps = await prisma.step.findMany({
      where: { stationId: id },
      orderBy: { orderNum: "asc" },
      include: { conditions: true },
    });

    const photoUrls = steps.map((s) => s.photoUrl);
    const modelUrls = steps.map((s) => s.modelUrl);

    const [signedPhoto, signedModels] = await Promise.all([
      signPublicUrls(photoUrls),
      signPublicUrls(modelUrls),
    ]);

    const signedSteps = steps.map((s, i) => ({
      ...s,
      vozAudioUrl: s.vozAudioUrl ? `/api/tts/${s.id}` : null,
      photoUrl: signedPhoto[i],
      modelUrl: signedModels[i],
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
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  try {
    const station = await db.station.findFirst({ where: { id } });
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
      modelUrl,
      isQc,
      qcFrequency,
      isErrorStep,
      errorMessage,
      periodEveryN,
    } = body;

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
        modelUrl: modelUrl ?? null,
        isQc: isQc ?? false,
        qcFrequency: qcFrequency ?? null,
        isErrorStep: isErrorStep ?? false,
        errorMessage: errorMessage ?? null,
        periodEveryN: periodEveryN ?? null,
      },
    });

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
