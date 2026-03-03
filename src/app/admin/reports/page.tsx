"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminFetch } from "@/lib/admin-api";
import {
  Search,
  Loader2,
  Download,
  Users,
  BarChart3,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────

interface PresenceRow {
  operatorNumber: string;
  stationName: string;
  loginAt: string;
  logoutAt: string | null;
  durationMinutes: number | null;
}

interface PresenceAggregated {
  operatorNumber: string;
  totalHours: number;
  sessionCount: number;
  sessions: PresenceRow[];
}

interface ProductionRow {
  operatorNumber: string;
  stationName: string;
  completedUnits: number;
  date: string;
  avgTimePerUnit?: number;
}

interface ProductionByStation {
  stationName: string;
  unitsCompleted: number;
  avgTimePerUnit: number | null;
  operators: ProductionRow[];
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const today = toLocalDateString(new Date());
  const weekAgo = toLocalDateString(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);

  // Presence
  const [presenceData, setPresenceData] = useState<PresenceAggregated[]>([]);
  const [rawPresence, setRawPresence] = useState<PresenceRow[]>([]);
  const [loadingPresence, setLoadingPresence] = useState(false);

  // Production
  const [productionData, setProductionData] = useState<ProductionByStation[]>([]);
  const [rawProduction, setRawProduction] = useState<ProductionRow[]>([]);
  const [loadingProduction, setLoadingProduction] = useState(false);

  // Expanded rows
  const [expandedPresence, setExpandedPresence] = useState<Set<string>>(new Set());
  const [expandedProduction, setExpandedProduction] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  // ─── Fetch Presence ────────────────────────────────────
  const fetchPresence = useCallback(async () => {
    setLoadingPresence(true);
    try {
      const res = await adminFetch(
        `/api/reports/presence?from=${dateFrom}&to=${dateTo}`
      );
      if (!res.ok) throw new Error("Error al cargar presencia");
      const data = await res.json();
      const items: PresenceRow[] = Array.isArray(data)
        ? data
        : data.operarios || data.data || [];

      setRawPresence(items);

      // Aggregate by operator
      const byOperator = new Map<string, PresenceRow[]>();
      items.forEach((row) => {
        const existing = byOperator.get(row.operatorNumber) || [];
        existing.push(row);
        byOperator.set(row.operatorNumber, existing);
      });

      const aggregated: PresenceAggregated[] = Array.from(byOperator.entries()).map(
        ([op, sessions]) => ({
          operatorNumber: op,
          totalHours: sessions.reduce(
            (acc, s) => acc + (s.durationMinutes || 0) / 60,
            0
          ),
          sessionCount: sessions.length,
          sessions,
        })
      );

      aggregated.sort((a, b) => b.totalHours - a.totalHours);
      setPresenceData(aggregated);
    } catch (err) {
      console.error("Error loading presence:", err);
      setPresenceData([]);
      setRawPresence([]);
      toast({
        title: "Error",
        description: "No se pudo cargar el informe de presencia",
        variant: "destructive",
      });
    } finally {
      setLoadingPresence(false);
    }
  }, [dateFrom, dateTo, toast]);

  // ─── Fetch Production ──────────────────────────────────
  const fetchProduction = useCallback(async () => {
    setLoadingProduction(true);
    try {
      const res = await adminFetch(
        `/api/reports/production?from=${dateFrom}&to=${dateTo}`
      );
      if (!res.ok) throw new Error("Error al cargar produccion");
      const data = await res.json();
      const items: ProductionRow[] = Array.isArray(data)
        ? data
        : data.estaciones || data.data || [];

      setRawProduction(items);

      // Aggregate by station
      const byStation = new Map<string, ProductionRow[]>();
      items.forEach((row) => {
        const existing = byStation.get(row.stationName) || [];
        existing.push(row);
        byStation.set(row.stationName, existing);
      });

      const aggregated: ProductionByStation[] = Array.from(byStation.entries()).map(
        ([station, rows]) => {
          const totalUnits = rows.reduce((acc, r) => acc + r.completedUnits, 0);
          const avgTimes = rows
            .filter((r) => r.avgTimePerUnit != null)
            .map((r) => r.avgTimePerUnit!);
          const avgTime =
            avgTimes.length > 0
              ? avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length
              : null;

          return {
            stationName: station,
            unitsCompleted: totalUnits,
            avgTimePerUnit: avgTime,
            operators: rows,
          };
        }
      );

      aggregated.sort((a, b) => b.unitsCompleted - a.unitsCompleted);
      setProductionData(aggregated);
    } catch (err) {
      console.error("Error loading production:", err);
      setProductionData([]);
      setRawProduction([]);
      toast({
        title: "Error",
        description: "No se pudo cargar el informe de produccion",
        variant: "destructive",
      });
    } finally {
      setLoadingProduction(false);
    }
  }, [dateFrom, dateTo, toast]);

  // ─── Search both ──────────────────────────────────────
  const handleSearch = () => {
    fetchPresence();
    fetchProduction();
  };

  // ─── Toggle expand ────────────────────────────────────
  const togglePresenceExpand = (op: string) => {
    setExpandedPresence((prev) => {
      const next = new Set(prev);
      if (next.has(op)) next.delete(op);
      else next.add(op);
      return next;
    });
  };

  const toggleProductionExpand = (station: string) => {
    setExpandedProduction((prev) => {
      const next = new Set(prev);
      if (next.has(station)) next.delete(station);
      else next.add(station);
      return next;
    });
  };

  // ─── CSV Export ───────────────────────────────────────
  const exportPresenceCSV = () => {
    if (rawPresence.length === 0) return;
    const csvHeaders = ["Operario", "Estacion", "Entrada", "Salida", "Duracion (min)"];
    const rows = rawPresence.map((r) => [
      r.operatorNumber,
      r.stationName,
      r.loginAt,
      r.logoutAt || "En curso",
      r.durationMinutes?.toString() || "",
    ]);
    downloadCSV(csvHeaders, rows, "presencia");
  };

  const exportProductionCSV = () => {
    if (rawProduction.length === 0) return;
    const csvHeaders = ["Operario", "Estacion", "Unidades completadas", "Fecha"];
    const rows = rawProduction.map((r) => [
      r.operatorNumber,
      r.stationName,
      r.completedUnits.toString(),
      r.date,
    ]);
    downloadCSV(csvHeaders, rows, "produccion");
  };

  const downloadCSV = (csvHeaders: string[], rows: string[][], filename: string) => {
    const csv = [
      csvHeaders.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Formatters ───────────────────────────────────────
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return "En curso";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground mt-1">
          Informes de presencia y produccion del sistema
        </p>
      </div>

      {/* Date range */}
      <Card className="border-border">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Desde
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Hasta
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44 border-border"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-[#8B1A1A] hover:bg-[#A52525]"
              disabled={loadingPresence || loadingProduction}
            >
              {(loadingPresence || loadingProduction) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Consultar
            </Button>
            {/* Quick date buttons */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(today);
                }}
              >
                Hoy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setDateFrom(weekAgo);
                  setDateTo(today);
                }}
              >
                7 dias
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  const monthAgo = toLocalDateString(
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  );
                  setDateFrom(monthAgo);
                  setDateTo(today);
                }}
              >
                30 dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="presence">
        <TabsList className="bg-accent">
          <TabsTrigger value="presence" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Users className="h-4 w-4" />
            Presencia
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground">
            <BarChart3 className="h-4 w-4" />
            Produccion
          </TabsTrigger>
        </TabsList>

        {/* ─── Presence Tab ──────────────────────────── */}
        <TabsContent value="presence">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Informe de presencia
                </CardTitle>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Horas trabajadas y sesiones por operario
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPresence}
                  disabled={loadingPresence}
                  className="border-border"
                >
                  {loadingPresence ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPresenceCSV}
                  disabled={rawPresence.length === 0}
                  className="border-border"
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPresence ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#8B1A1A]" />
                </div>
              ) : presenceData.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message="Sin datos de presencia."
                  hint="Selecciona un rango de fechas y pulsa Consultar."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-accent/50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Operario
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">
                        Horas totales
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">
                        Sesiones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presenceData.map((row) => {
                      const isExpanded = expandedPresence.has(row.operatorNumber);
                      return (
                        <PresenceOperatorRow
                          key={row.operatorNumber}
                          row={row}
                          isExpanded={isExpanded}
                          onToggle={() => togglePresenceExpand(row.operatorNumber)}
                          formatDateTime={formatDateTime}
                          formatDuration={formatDuration}
                          formatHours={formatHours}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Production Tab ────────────────────────── */}
        <TabsContent value="production">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Informe de produccion
                </CardTitle>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Unidades completadas por estacion y operario
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProduction}
                  disabled={loadingProduction}
                  className="border-border"
                >
                  {loadingProduction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportProductionCSV}
                  disabled={rawProduction.length === 0}
                  className="border-border"
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#8B1A1A]" />
                </div>
              ) : productionData.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  message="Sin datos de produccion."
                  hint="Selecciona un rango de fechas y pulsa Consultar."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-accent/50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="text-muted-foreground font-semibold">
                        Estacion
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">
                        Unidades completadas
                      </TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">
                        Tiempo medio / unidad
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionData.map((row) => {
                      const isExpanded = expandedProduction.has(row.stationName);
                      return (
                        <ProductionStationRow
                          key={row.stationName}
                          row={row}
                          isExpanded={isExpanded}
                          onToggle={() => toggleProductionExpand(row.stationName)}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Presence Operator Row (with expandable sub-rows) ───────

function PresenceOperatorRow({
  row,
  isExpanded,
  onToggle,
  formatDateTime,
  formatDuration,
  formatHours,
}: {
  row: PresenceAggregated;
  isExpanded: boolean;
  onToggle: () => void;
  formatDateTime: (d: string) => string;
  formatDuration: (m: number | null) => string;
  formatHours: (h: number) => string;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-accent"
        onClick={onToggle}
      >
        <TableCell className="w-8 pr-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          )}
        </TableCell>
        <TableCell className="font-medium text-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center text-xs font-bold text-[#A52525]">
              {row.operatorNumber.slice(-2)}
            </div>
            Operario {row.operatorNumber}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className="font-semibold text-foreground tabular-nums">
            {formatHours(row.totalHours)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <Badge variant="secondary" className="tabular-nums">
            {row.sessionCount}
          </Badge>
        </TableCell>
      </TableRow>
      {isExpanded &&
        row.sessions.map((session, i) => (
          <TableRow key={`${row.operatorNumber}-${i}`} className="bg-accent/70">
            <TableCell></TableCell>
            <TableCell className="text-sm text-muted-foreground pl-12">
              {session.stationName}
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              <span className="flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(session.loginAt)}
                {" - "}
                {session.logoutAt ? formatDateTime(session.logoutAt) : "En curso"}
              </span>
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {session.logoutAt ? (
                formatDuration(session.durationMinutes)
              ) : (
                <Badge variant="success" className="text-xs">
                  Activo
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}

// ─── Production Station Row (with expandable sub-rows) ──────

function ProductionStationRow({
  row,
  isExpanded,
  onToggle,
}: {
  row: ProductionByStation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-accent"
        onClick={onToggle}
      >
        <TableCell className="w-8 pr-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          )}
        </TableCell>
        <TableCell className="font-medium text-foreground">
          {row.stationName}
        </TableCell>
        <TableCell className="text-right">
          <span className="font-bold text-lg text-emerald-400 tabular-nums">
            {row.unitsCompleted}
          </span>
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {row.avgTimePerUnit != null ? `${row.avgTimePerUnit.toFixed(1)} min` : "-"}
        </TableCell>
      </TableRow>
      {isExpanded &&
        row.operators.map((op, i) => (
          <TableRow key={`${row.stationName}-${i}`} className="bg-accent/70">
            <TableCell></TableCell>
            <TableCell className="text-sm text-muted-foreground pl-12">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {op.operatorNumber.slice(-2)}
                </div>
                Operario {op.operatorNumber}
              </div>
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
              {op.completedUnits}
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground/60">
              {op.date}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}

// ─── Empty State Component ──────────────────────────────────

function EmptyState({
  icon: Icon,
  message,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  hint: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">{hint}</p>
    </div>
  );
}
