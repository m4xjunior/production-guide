import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer, getPublicUrl } from "@/lib/gcs";
import { randomUUID } from "crypto";

/**
 * POST /api/upload/image
 * Subir una imagen a Google Cloud Storage.
 * Acepta multipart/form-data con un campo 'file'.
 * Devuelve la URL pública de la imagen subida.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Se requiere un archivo en el campo 'image'" },
        { status: 400 },
      );
    }

    // Validar que sea una imagen
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido: ${file.type}. Tipos válidos: ${tiposPermitidos.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Limitar tamaño (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo excede el tamaño máximo de 10 MB" },
        { status: 400 },
      );
    }

    // Generar nombre único para el archivo
    const tenantSlug = request.headers.get("x-tenant-slug") || "default";
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? "jpg";
    const nombreArchivo = `${randomUUID()}.${extension}`;
    const gcsPath = `tenants/${tenantSlug}/images/${nombreArchivo}`;

    // Convertir a buffer y subir a GCS
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const gsUri = await uploadBuffer(buffer, gcsPath, file.type);
    const publicUrl = getPublicUrl(gcsPath);

    return NextResponse.json(
      {
        url: publicUrl,
        gsUri,
        fileName: nombreArchivo,
        contentType: file.type,
        size: file.size,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error al subir imagen:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al subir la imagen" },
      { status: 500 },
    );
  }
}
