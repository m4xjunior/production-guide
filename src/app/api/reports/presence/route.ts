import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/reports/presence
 * Reporte de presencia de operarios.
 * Query params: ?from=ISO&to=ISO&operatorNumber?
 * Devuelve sesiones agrupadas por operario con total de horas trabajadas.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const operatorNumber = searchParams.get("operatorNumber");

    // Validar parámetros de fecha obligatorios
    if (!from || !to) {
      return NextResponse.json(
        { error: "Los parámetros 'from' y 'to' son obligatorios (formato ISO)" },
        { status: 400 },
      );
    }

    const fechaDesde = new Date(from);
    const fechaHasta = new Date(to);

    if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
      return NextResponse.json(
        { error: "Formato de fecha inválido. Use formato ISO (YYYY-MM-DDTHH:mm:ssZ)" },
        { status: 400 },
      );
    }

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
    }

    // Construir filtro de consulta
    const where: {
      loginAt: { gte: Date; lte: Date };
      operatorNumber?: string;
      station: { tenantId: string };
    } = {
      loginAt: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      station: { tenantId },
    };

    if (operatorNumber) {
      where.operatorNumber = operatorNumber;
    }

    // Obtener sesiones del período
    const sessions = await prisma.operatorSession.findMany({
      where,
      include: {
        station: {
          select: { id: true, name: true },
        },
      },
      orderBy: { loginAt: "asc" },
    });

    // Agrupar por operario
    const porOperario: Record<
      string,
      {
        operatorNumber: string;
        sesiones: typeof sessions;
        totalHoras: number;
        totalSesiones: number;
      }
    > = {};

    for (const sesion of sessions) {
      const op = sesion.operatorNumber;
      if (!porOperario[op]) {
        porOperario[op] = {
          operatorNumber: op,
          sesiones: [],
          totalHoras: 0,
          totalSesiones: 0,
        };
      }

      porOperario[op].sesiones.push(sesion);
      porOperario[op].totalSesiones += 1;

      // Calcular horas trabajadas.
      // Sesiones activas sin logout: usar el mínimo entre ahora y loginAt + 24h
      // para evitar acumular duraciones absurdas por sesiones colgadas.
      const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
      const fin = sesion.logoutAt ?? new Date(Math.min(Date.now(), sesion.loginAt.getTime() + MAX_SESSION_MS));
      const duracionMs = Math.max(0, fin.getTime() - sesion.loginAt.getTime());
      const duracionHoras = duracionMs / (1000 * 60 * 60);
      porOperario[op].totalHoras += duracionHoras;
    }

    // Convertir a array y redondear horas
    const reporte = Object.values(porOperario).map((op) => ({
      operatorNumber: op.operatorNumber,
      totalSesiones: op.totalSesiones,
      totalHoras: Math.round(op.totalHoras * 100) / 100,
      sesiones: op.sesiones.map((s) => ({
        id: s.id,
        stationId: s.stationId,
        stationName: s.station.name,
        loginAt: s.loginAt,
        logoutAt: s.logoutAt,
        completedUnits: s.completedUnits,
        isActive: s.isActive,
      })),
    }));

    return NextResponse.json({
      desde: fechaDesde.toISOString(),
      hasta: fechaHasta.toISOString(),
      operarios: reporte,
    });
  } catch (error) {
    console.error("Error al generar reporte de presencia:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
