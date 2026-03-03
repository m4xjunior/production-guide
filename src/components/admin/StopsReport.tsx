"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/admin-api";
import {
  Search,
  Loader2,
  Download,
  Square,
  Calendar,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Station, StationStop } from "@/types";

interface StopRow extends StationStop {
  durationMs: number | null;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null) {
  if (ms === null) return "En curso";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface StopsReportProps {
  stations: Station[];
}

export function StopsReport({ stations }: StopsReportProps) {
  const today = toLocalDateString(new Date());
  const weekAgo = toLocalDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchStops = useCallback(async () => {
    if (!selectedStationId) {
      toast({
        title: "Selecciona una estacion",
        description: "Selecciona una estacion para ver sus paros",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ stationId: selectedStationId });
      if (dateFrom) params.set("from", `${dateFrom}T00:00:00Z`);
      if (dateTo) params.set("to", `${dateTo}T23:59:59Z`);

      const res = await adminFetch(`/api/stops?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar paros");
      const data = await res.json();
      setStops(data.stops ?? []);
    } catch (err) {
      console.error("Error loading stops:", err);
      setStops([]);
      toast({
        title: "Error",
        description: "No se pudo cargar el informe de paros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedStationId, dateFrom, dateTo, toast]);

  const exportCSV = () => {
    if (stops.length === 0) return;
    const headers = ["ID", "Estacion", "Sesion", "Inicio", "Fin", "Duracion", "Motivo"];
    const rows = stops.map((s) => [
      s.id,
      selectedStationId,
      s.sessionId ?? "",
      s.startAt,
      s.endAt ?? "En curso",
      formatDuration(s.durationMs),
      s.reason ?? "",
    ]);
    const escapeCSV = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((r) => r.map(escapeCSV).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paros_${selectedStationId}_${dateFrom}_${dateTo}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const totalDowntime = stops
    .filter((s) => s.durationMs != null)
    .reduce((acc, s) => acc + (s.durationMs ?? 0), 0);

  const openStops = stops.filter((s) => s.endAt === null).length;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Square className="h-4 w-4 text-destructive" aria-hidden="true" />
            Informe de paros
          </CardTitle>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Historial de paros de produccion por estacion
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStops}
            disabled={loading}
            className="border-border w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={stops.length === 0}
            className="border-border w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-1.5 w-full sm:w-52">
            <Label htmlFor="station-select" className="text-muted-foreground text-xs">Estacion</Label>
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger id="station-select" className="border-border w-full">
                <SelectValue placeholder="Seleccionar estacion..." />
              </SelectTrigger>
              <SelectContent>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-full sm:w-auto">
            <Label htmlFor="date-from-stops" className="text-muted-foreground flex items-center gap-1 text-xs">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Desde
            </Label>
            <Input
              id="date-from-stops"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-44 border-border"
            />
          </div>
          <div className="space-y-1.5 w-full sm:w-auto">
            <Label htmlFor="date-to-stops" className="text-muted-foreground flex items-center gap-1 text-xs">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Hasta
            </Label>
            <Input
              id="date-to-stops"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-44 border-border"
            />
          </div>
          <Button
            onClick={fetchStops}
            className="bg-[#8B1A1A] hover:bg-[#A52525] w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Consultar
          </Button>
        </div>

        {/* Summary stats */}
        {stops.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stops.length}</p>
              <p className="text-xs text-muted-foreground">Paros totales</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {formatDuration(totalDowntime)}
              </p>
              <p className="text-xs text-muted-foreground">Tiempo parado</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{openStops}</p>
              <p className="text-xs text-muted-foreground">Paros abiertos</p>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#8B1A1A]" aria-hidden="true" />
          </div>
        ) : stops.length === 0 ? (
          <div className="text-center py-12">
            <Square className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
            <p className="text-muted-foreground">Sin datos de paros.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Selecciona una estacion y un rango de fechas y pulsa Consultar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-accent/50">
                  <TableHead scope="col" className="text-muted-foreground font-semibold">
                    Inicio
                  </TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold">
                    Fin
                  </TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold text-right">
                    Duracion
                  </TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold">
                    Motivo
                  </TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {stops.map((stop) => (
                <TableRow key={stop.id} className="hover:bg-accent">
                  <TableCell className="text-sm text-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      {formatDateTime(stop.startAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {stop.endAt ? formatDateTime(stop.endAt) : (
                      <Badge variant="destructive" className="text-xs">En curso</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium text-foreground">
                    {stop.endAt ? formatDuration(stop.durationMs) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {stop.reason ?? (
                      <span className="italic text-muted-foreground/50">Sin motivo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stop.endAt ? (
                      <Badge variant="secondary" className="text-xs">Cerrado</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Abierto</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
