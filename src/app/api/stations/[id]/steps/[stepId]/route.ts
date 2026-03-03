import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAndUploadTTS } from "@/lib/elevenlabs";
import { getPublicUrl } from "@/lib/gcs";

/**
 * PUT /api/stations/[id]/steps/[stepId]
 * Editar un paso existente. Todos los campos son opcionales.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const { id, stepId } = await params;

  try {
    // Verificar que el paso existe y pertenece a la estación
    const existing = await prisma.step.findUnique({ where: { id: stepId } });
    if (!existing || existing.stationId !== id) {
      return NextResponse.json(
        { error: "Paso no encontrado en esta estación" },
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
      orderNum,
      isErrorStep,
      errorMessage,
      periodEveryN,
      videoUrl,
      synonyms,
    } = body;

    const step = await prisma.step.update({
      where: { id: stepId },
      data: {
        ...(tipo !== undefined && { tipo }),
        ...(mensaje !== undefined && { mensaje }),
        ...(voz !== undefined && { voz }),
        ...(responseType !== undefined && { responseType }),
        ...(respuesta !== undefined && { respuesta }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(modelUrl !== undefined && { modelUrl }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(synonyms !== undefined && { synonyms }),
        ...(isQc !== undefined && { isQc }),
        ...(qcFrequency !== undefined && { qcFrequency }),
        ...(orderNum !== undefined && { orderNum }),
        ...(isErrorStep !== undefined && { isErrorStep }),
        ...(errorMessage !== undefined && { errorMessage }),
        ...(periodEveryN !== undefined && { periodEveryN }),
      },
    });

    // Regenerar audio TTS si el texto de voz cambió
    let updatedStep = step;
    const vozChanged = voz !== undefined && voz !== existing.voz;
    if (vozChanged && voz && typeof voz === "string" && voz.trim().length > 0) {
      try {
        const gcsPath = await generateAndUploadTTS(stepId, voz.trim());
        updatedStep = await prisma.step.update({
          where: { id: stepId },
          data: { vozAudioUrl: getPublicUrl(gcsPath) },
        });
      } catch (ttsError) {
        console.error("Error regenerando TTS para paso:", ttsError);
      }
    } else if (vozChanged && (!voz || voz.trim().length === 0)) {
      // Si se eliminó el texto de voz, limpiar la URL del audio
      updatedStep = await prisma.step.update({
        where: { id: stepId },
        data: { vozAudioUrl: null },
      });
    }

    return NextResponse.json({ step: updatedStep });
  } catch (error) {
    console.error("Error al editar paso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/stations/[id]/steps/[stepId]
 * Eliminar un paso y re-numerar los pasos restantes.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const { id, stepId } = await params;

  try {
    // Verificar que el paso existe y pertenece a la estación
    const existing = await prisma.step.findUnique({ where: { id: stepId } });
    if (!existing || existing.stationId !== id) {
      return NextResponse.json(
        { error: "Paso no encontrado en esta estación" },
        { status: 404 },
      );
    }

    // Eliminar el paso y re-numerar en una transacción
    await prisma.$transaction(async (tx) => {
      await tx.step.delete({ where: { id: stepId } });

      const pasosRestantes = await tx.step.findMany({
        where: { stationId: id },
        orderBy: { orderNum: "asc" },
      });

      for (let i = 0; i < pasosRestantes.length; i++) {
        const nuevoOrder = i + 1;
        if (pasosRestantes[i].orderNum !== nuevoOrder) {
          await tx.step.update({
            where: { id: pasosRestantes[i].id },
            data: { orderNum: nuevoOrder },
          });
        }
      }
    });

    return NextResponse.json({ message: "Paso eliminado y pasos re-numerados" });
  } catch (error) {
    console.error("Error al eliminar paso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
