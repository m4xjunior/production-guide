"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type PresenceReport, type ProductionReport } from "@/types";
import { Search, Loader2, Download, Users, BarChart3 } from "lucide-react";

interface ReportsPanelProps {
  adminPassword: string;
}

export function ReportsPanel({ adminPassword }: ReportsPanelProps) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);
  const [presenceData, setPresenceData] = useState<PresenceReport[]>([]);
  const [productionData, setProductionData] = useState<ProductionReport[]>([]);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [loadingProduction, setLoadingProduction] = useState(false);

  const headers = {
    "X-Admin-Password": adminPassword,
  };

  const fetchPresence = useCallback(async () => {
    setLoadingPresence(true);
    try {
      const res = await fetch(
        `/api/reports/presence?from=${dateFrom}&to=${dateTo}`,
        { headers }
      );
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setPresenceData(data);
    } catch (err) {
      console.error("Error loading presence report:", err);
      setPresenceData([]);
    } finally {
      setLoadingPresence(false);
    }
  }, [dateFrom, dateTo, adminPassword]);

  const fetchProduction = useCallback(async () => {
    setLoadingProduction(true);
    try {
      const res = await fetch(
        `/api/reports/production?from=${dateFrom}&to=${dateTo}`,
        { headers }
      );
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setProductionData(data);
    } catch (err) {
      console.error("Error loading production report:", err);
      setProductionData([]);
    } finally {
      setLoadingProduction(false);
    }
  }, [dateFrom, dateTo, adminPassword]);

  const formatDate = (dateStr: string) => {
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
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map((row) => keys.map((k) => `"${row[k] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Reportes</h2>

      {/* Date range selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={() => { fetchPresence(); fetchProduction(); }}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="presence">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="presence" className="gap-2">
            <Users className="h-4 w-4" />
            Presencia
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Produccion
          </TabsTrigger>
        </TabsList>

        {/* Presence Tab */}
        <TabsContent value="presence">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Informe de presencia</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPresence}
                  disabled={loadingPresence}
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
                  onClick={() => exportCSV(presenceData as unknown as Record<string, unknown>[], "presencia")}
                  disabled={presenceData.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPresence ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : presenceData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Sin datos. Selecciona un rango de fechas y pulsa Buscar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operario</TableHead>
                      <TableHead>Estacion</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Duracion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presenceData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.operatorNumber}</TableCell>
                        <TableCell>{row.stationName}</TableCell>
                        <TableCell>{formatDate(row.loginAt)}</TableCell>
                        <TableCell>
                          {row.logoutAt ? formatDate(row.logoutAt) : (
                            <span className="text-success font-medium">En curso</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(row.durationMinutes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Informe de produccion</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProduction}
                  disabled={loadingProduction}
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
                  onClick={() => exportCSV(productionData as unknown as Record<string, unknown>[], "produccion")}
                  disabled={productionData.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productionData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Sin datos. Selecciona un rango de fechas y pulsa Buscar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operario</TableHead>
                      <TableHead>Estacion</TableHead>
                      <TableHead>Unidades completadas</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.operatorNumber}</TableCell>
                        <TableCell>{row.stationName}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-lg">{row.completedUnits}</span>
                        </TableCell>
                        <TableCell>{row.date}</TableCell>
                      </TableRow>
                    ))}
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
