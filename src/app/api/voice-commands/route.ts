import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
  }

  const db = getTenantPrisma(tenantId);
  const scope = request.nextUrl.searchParams.get("scope");

  const commands = await db.voiceCommand.findMany({
    where: {
      isEnabled: true,
      ...(scope ? { scope } : {}),
    },
    orderBy: [{ scope: "asc" }, { action: "asc" }],
  });

  return NextResponse.json({ commands });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 });
  }
  const { scope, action, phrases, stationId, stepId, language, sequence, context } = body;

  if (!scope || !action || !phrases?.length) {
    return NextResponse.json(
      { error: "scope, action y phrases son requeridos" },
      { status: 400 }
    );
  }

  if (!["global", "station", "step"].includes(scope)) {
    return NextResponse.json(
      { error: "scope debe ser: global | station | step" },
      { status: 400 }
    );
  }

  if (scope === "station" && !stationId) {
    return NextResponse.json(
      { error: "stationId es requerido cuando scope es 'station'" },
      { status: 400 }
    );
  }

  if (scope === "step" && !stepId) {
    return NextResponse.json(
      { error: "stepId es requerido cuando scope es 'step'" },
      { status: 400 }
    );
  }

  const db = getTenantPrisma(tenantId);
  const cmd = await db.voiceCommand.create({
    data: {
      tenantId,
      scope,
      action,
      phrases,
      stationId: stationId ?? null,
      stepId: stepId ?? null,
      language: language ?? "es-ES",
      sequence: sequence ?? null,
      context: context ?? null,
    },
  });

  return NextResponse.json({ command: cmd }, { status: 201 });
}
