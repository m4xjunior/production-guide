import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/reports/production
 * Reporte de producción.
 * Query params: ?from=ISO&to=ISO&stationId?
 * Devuelve unidades completadas por estación, tiempo medio por unidad y rendimiento por operario.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const stationId = searchParams.get("stationId");

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

    // Construir filtro de consulta para sesiones
    const whereSession: {
      loginAt: { gte: Date; lte: Date };
      stationId?: string;
      station: { tenantId: string };
    } = {
      loginAt: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
      station: { tenantId },
    };

    if (stationId) {
      whereSession.stationId = stationId;
    }

    // Obtener sesiones del período con sus logs
    const sessions = await prisma.operatorSession.findMany({
      where: whereSession,
      include: {
        station: {
          select: { id: true, name: true, productCode: true },
        },
        stepLogs: {
          select: { durationMs: true, wasSkipped: true, completedAt: true },
        },
      },
      orderBy: { loginAt: "asc" },
    });

    // Agrupar por estación
    const porEstacion: Record<
      string,
      {
        stationId: string;
        stationName: string;
        productCode: string | null;
        totalUnidades: number;
        totalDuracionMs: number;
        totalPasosCompletados: number;
        operarios: Record<
          string,
          { operatorNumber: string; unidades: number; duracionMs: number }
        >;
      }
    > = {};

    for (const sesion of sessions) {
      const sId = sesion.stationId;
      if (!porEstacion[sId]) {
        porEstacion[sId] = {
          stationId: sId,
          stationName: sesion.station.name,
          productCode: sesion.station.productCode,
          totalUnidades: 0,
          totalDuracionMs: 0,
          totalPasosCompletados: 0,
          operarios: {},
        };
      }

      porEstacion[sId].totalUnidades += sesion.completedUnits;

      // Sumar duración total de los logs de esta sesión
      const duracionSesion = sesion.stepLogs.reduce(
        (acc, log) => acc + (log.durationMs ?? 0),
        0,
      );
      porEstacion[sId].totalDuracionMs += duracionSesion;
      porEstacion[sId].totalPasosCompletados += sesion.stepLogs.filter(
        (l) => !l.wasSkipped,
      ).length;

      // Acumular por operario
      const op = sesion.operatorNumber;
      if (!porEstacion[sId].operarios[op]) {
        porEstacion[sId].operarios[op] = {
          operatorNumber: op,
          unidades: 0,
          duracionMs: 0,
        };
      }
      porEstacion[sId].operarios[op].unidades += sesion.completedUnits;
      porEstacion[sId].operarios[op].duracionMs += duracionSesion;
    }

    // Formatear resultado
    const reporte = Object.values(porEstacion).map((est) => {
      // Calcular tiempo medio por unidad en minutos
      const tiempoMedioPorUnidadMs =
        est.totalUnidades > 0 ? est.totalDuracionMs / est.totalUnidades : 0;
      const tiempoMedioPorUnidadMin = tiempoMedioPorUnidadMs / (1000 * 60);

      // Rendimiento por operario
      const rendimientoOperarios = Object.values(est.operarios).map((op) => {
        const tiempoMedioOp =
          op.unidades > 0
            ? op.duracionMs / op.unidades / (1000 * 60)
            : 0;
        return {
          operatorNumber: op.operatorNumber,
          unidadesCompletadas: op.unidades,
          tiempoMedioPorUnidadMin: Math.round(tiempoMedioOp * 100) / 100,
        };
      });

      return {
        stationId: est.stationId,
        stationName: est.stationName,
        productCode: est.productCode,
        totalUnidadesCompletadas: est.totalUnidades,
        tiempoMedioPorUnidadMin:
          Math.round(tiempoMedioPorUnidadMin * 100) / 100,
        totalPasosCompletados: est.totalPasosCompletados,
        operarios: rendimientoOperarios,
      };
    });

    return NextResponse.json({
      desde: fechaDesde.toISOString(),
      hasta: fechaHasta.toISOString(),
      estaciones: reporte,
    });
  } catch (error) {
    console.error("Error al generar reporte de producción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
