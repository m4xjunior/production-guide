import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { buildGcsPath } from "@/lib/gcs";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const EXT_MAP: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function getStorage(): Storage {
  let credentials: Record<string, unknown> | undefined;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } catch {
      // usar ADC
    }
  }
  return new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    ...(credentials && { credentials }),
  });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
  }
  const tenantSlug = request.headers.get("x-tenant-slug") || "kh";

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("video") as File | null;
  const stationId = formData.get("stationId") as string | null;
  const stepId = formData.get("stepId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Campo 'video' requerido" }, { status: 400 });
  }
  if (!stationId || !stepId) {
    return NextResponse.json({ error: "stationId y stepId requeridos" }, { status: 400 });
  }
  // Verificar que stationId pertence ao tenant
  const station = await prisma.station.findFirst({
    where: { id: stationId, tenantId },
  });
  if (!station) {
    return NextResponse.json({ error: "Estación no encontrada" }, { status: 404 });
  }
  const step = await prisma.step.findFirst({
    where: { id: stepId, stationId },
  });
  if (!step) {
    return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo no soportado: ${file.type}. Acepta: mp4, webm, quicktime` },
      { status: 415 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Vídeo demasiado grande (máx 200MB)" },
      { status: 413 }
    );
  }

  const ext = EXT_MAP[file.type] || "mp4";
  const gcsObjectPath = buildGcsPath(
    tenantSlug,
    "stations",
    stationId,
    "steps",
    stepId,
    `video.${ext}`
  );

  const bucket = process.env.GCS_BUCKET!;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();
  const fileRef = storage.bucket(bucket).file(gcsObjectPath);

  await fileRef.save(buffer, {
    contentType: file.type,
    metadata: { cacheControl: "public, max-age=86400" },
  });

  const publicUrl = `https://storage.googleapis.com/${bucket}/${gcsObjectPath}`;
  return NextResponse.json({ url: publicUrl });
}
