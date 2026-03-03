"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminFetch } from "@/lib/admin-api";
import { type Station } from "@/types";
import {
  Factory,
  BarChart3,
  Users,
  CheckCircle,
  Loader2,
  ArrowRight,
  Activity,
  Clock,
} from "lucide-react";

// ─── Dashboard Stats ────────────────────────────────────────

interface DashboardStats {
  totalStations: number;
  activeStations: number;
  activeSessions: number;
  unitsToday: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStations: 0,
    activeStations: 0,
    activeSessions: 0,
    unitsToday: 0,
  });
  const [recentStations, setRecentStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stations
      const stationsRes = await adminFetch("/api/stations");
      let stations: Station[] = [];
      if (stationsRes.ok) {
        const data = await stationsRes.json();
        stations = Array.isArray(data) ? data : data.stations || [];
      }

      const totalStations = stations.length;
      const activeStations = stations.filter((s) => s.isActive).length;

      // Fetch today's production report
      const today = new Date().toISOString().split("T")[0];
      const prodRes = await adminFetch(
        `/api/reports/production?from=${today}&to=${today}`
      );
      let unitsToday = 0;
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const items = Array.isArray(prodData)
          ? prodData
          : prodData.estaciones || prodData.data || [];
        unitsToday = items.reduce(
          (acc: number, item: { completedUnits?: number; unitsCompleted?: number }) =>
            acc + (item.completedUnits ?? item.unitsCompleted ?? 0),
          0
        );
      }

      // Fetch today's presence (active sessions)
      const presRes = await adminFetch(
        `/api/reports/presence?from=${today}&to=${today}`
      );
      let activeSessions = 0;
      if (presRes.ok) {
        const presData = await presRes.json();
        const presItems = Array.isArray(presData)
          ? presData
          : presData.operarios || presData.data || [];
        activeSessions = presItems.length;
      }

      setStats({
        totalStations,
        activeStations,
        activeSessions,
        unitsToday,
      });

      // Show the 5 most recently updated stations
      setRecentStations(
        [...stations]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 5)
      );
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B1A1A]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de control</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general del sistema de produccion
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Factory}
          label="Estaciones activas"
          value={stats.activeStations}
          subtitle={`${stats.totalStations} totales`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Sesiones hoy"
          value={stats.activeSessions}
          subtitle="Operarios registrados"
          color="emerald"
        />
        <StatCard
          icon={CheckCircle}
          label="Unidades hoy"
          value={stats.unitsToday}
          subtitle="Unidades completadas"
          color="amber"
        />
        <StatCard
          icon={Activity}
          label="Estado"
          value="Operativo"
          subtitle="Sistema en linea"
          color="emerald"
          isText
        />
      </div>

      <Separator />

      {/* Quick actions + recent stations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Acciones rapidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/stations" className="block">
              <Button variant="outline" className="w-full justify-between h-11 text-left">
                <span className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-[#8B1A1A]" />
                  Gestionar estaciones
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
              </Button>
            </Link>
            <Link href="/admin/reports" className="block">
              <Button variant="outline" className="w-full justify-between h-11 text-left">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Ver reportes
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full justify-between h-11 text-left">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  Vista del operario
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent stations */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              Estaciones recientes
            </CardTitle>
            <Link href="/admin/stations">
              <Button variant="ghost" size="sm" className="text-[#8B1A1A] hover:text-[#A52525]">
                Ver todas
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentStations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/60">
                <Factory className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No hay estaciones creadas todavia.</p>
                <Link href="/admin/stations" className="mt-3 inline-block">
                  <Button size="sm">Crear primera estacion</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-muted-foreground">Codigo</TableHead>
                    <TableHead className="text-muted-foreground">Pasos</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground text-right">
                      Actualizada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStations.map((station) => (
                    <TableRow key={station.id} className="cursor-pointer hover:bg-accent">
                      <TableCell>
                        <Link
                          href={`/admin/stations/${station.id}`}
                          className="font-medium text-foreground hover:text-[#A52525] transition-colors"
                        >
                          {station.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {station.productCode ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {station.productCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {station._count?.steps ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={station.isActive ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {station.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground/60">
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(station.updatedAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Stat Card Component ────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  isText = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle: string;
  color: "blue" | "emerald" | "amber";
  isText?: boolean;
}) {
  const colorMap = {
    blue: {
      bg: "bg-[#8B1A1A]/10",
      icon: "text-[#8B1A1A]",
      value: "text-[#A52525]",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      icon: "text-emerald-400",
      value: "text-emerald-400",
    },
    amber: {
      bg: "bg-amber-500/10",
      icon: "text-amber-400",
      value: "text-amber-400",
    },
  };

  const c = colorMap[color];

  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className={`mt-1 font-bold ${
                isText ? "text-lg" : "text-3xl tabular-nums"
              } ${c.value}`}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>
          </div>
          <div className={`rounded-lg p-2.5 ${c.bg}`}>
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;

  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}
