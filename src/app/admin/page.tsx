"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  Loader2,
  ArrowRight,
  Activity,
  Clock,
  TrendingUp,
  Layers,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface DashboardStats {
  totalStations: number;
  activeStations: number;
  activeSessions: number;
  unitsToday: number;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const stationsRes = await adminFetch("/api/stations");
      let stations: Station[] = [];
      if (stationsRes.ok) {
        const data = await stationsRes.json();
        stations = Array.isArray(data) ? data : data.stations || [];
      }

      const totalStations = stations.length;
      const activeStations = stations.filter((s) => s.isActive).length;

      const today = toLocalDateString(new Date());
      const prodRes = await adminFetch(`/api/reports/production?from=${today}&to=${today}`);
      let unitsToday = 0;
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const items = Array.isArray(prodData) ? prodData : prodData.estaciones || prodData.data || [];
        unitsToday = items.reduce(
          (acc: number, item: { completedUnits?: number; unitsCompleted?: number }) =>
            acc + (item.completedUnits ?? item.unitsCompleted ?? 0),
          0
        );
      }

      const presRes = await adminFetch(`/api/reports/presence?from=${today}&to=${today}`);
      let activeSessions = 0;
      if (presRes.ok) {
        const presData = await presRes.json();
        const presItems = Array.isArray(presData) ? presData : presData.operarios || presData.data || [];
        activeSessions = presItems.length;
      }

      setStats({ totalStations, activeStations, activeSessions, unitsToday });
      setRecentStations(
        [...stations]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Panel de control</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen del sistema de produccion
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={loading}
          className="gap-2 border-border/60 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {lastUpdated
            ? lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
            : "Actualizar"}
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-4 pb-3">
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-8 w-12 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Factory}
            label="Estaciones activas"
            value={stats.activeStations}
            sub={`de ${stats.totalStations} totales`}
            accent="#8B1A1A"
          />
          <StatCard
            icon={Users}
            label="Operarios hoy"
            value={stats.activeSessions}
            sub="sesiones registradas"
            accent="#3B82F6"
          />
          <StatCard
            icon={CheckCircle2}
            label="Unidades hoy"
            value={stats.unitsToday}
            sub="unidades completadas"
            accent="#F59E0B"
          />
          <StatCard
            icon={Activity}
            label="Estado"
            value="Operativo"
            sub="sistema en linea"
            accent="#22C55E"
            isText
            pulse
          />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Acciones rapidas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {[
                { href: "/admin/stations", icon: Factory, label: "Gestionar estaciones", color: "#8B1A1A" },
                { href: "/admin/reports", icon: BarChart3, label: "Ver reportes", color: "#3B82F6" },
                { href: "/admin/voice-commands", icon: Layers, label: "Comandos de voz", color: "#8B5CF6" },
                { href: "/", icon: ExternalLink, label: "Vista del operario", color: "#22C55E" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-white/[0.02] transition-all group">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="rounded-md p-1.5"
                        style={{ background: `${item.color}18` }}
                      >
                        <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Mini stats */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { label: "Pasos configurados", value: recentStations.reduce((a, s) => a + (s.stepsCount ?? 0), 0), icon: Layers },
                { label: "Estaciones con pasos", value: recentStations.filter((s) => (s.stepsCount ?? 0) > 0).length, icon: TrendingUp },
                { label: "Ultima actualizacion", value: recentStations[0] ? formatRelativeTime(recentStations[0].updatedAt) : "—", icon: Clock },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Stations table */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Estaciones recientes
            </CardTitle>
            <Link href="/admin/stations">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#8B1A1A] hover:text-[#A52525] hover:bg-[#8B1A1A]/5">
                Ver todas
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#8B1A1A]" />
              </div>
            ) : recentStations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground/50 px-4">
                <Factory className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin estaciones aun.</p>
                <Link href="/admin/stations" className="mt-3 inline-block">
                  <Button size="sm" variant="outline" className="mt-2">Crear primera estacion</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="px-4 text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Nombre</TableHead>
                    <TableHead className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Codigo</TableHead>
                    <TableHead className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium text-center">Pasos</TableHead>
                    <TableHead className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">Estado</TableHead>
                    <TableHead className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium text-right pr-4">Actualizada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStations.map((station) => (
                    <TableRow
                      key={station.id}
                      className="border-b border-border/20 hover:bg-white/[0.015] transition-colors"
                    >
                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/admin/stations/${station.id}`}
                          className="font-medium text-sm text-foreground/90 hover:text-[#A52525] transition-colors"
                        >
                          {station.name}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        {station.productCode ? (
                          <Badge variant="secondary" className="font-mono text-xs h-5 px-1.5">
                            {station.productCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {station.stepsCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant={station.isActive ? "success" : "secondary"}
                          className="text-xs h-5"
                        >
                          {station.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        <span className="text-xs text-muted-foreground/50 flex items-center justify-end gap-1">
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

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  isText = false,
  pulse = false,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  isText?: boolean;
  pulse?: boolean;
}) {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider truncate">
              {label}
            </p>
            {pulse ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ background: accent }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: accent }}
                  />
                </span>
                <p className="font-semibold text-base" style={{ color: accent }}>
                  {value}
                </p>
              </div>
            ) : (
              <p
                className={`mt-1 font-bold tabular-nums ${isText ? "text-base" : "text-2xl"}`}
                style={{ color: accent }}
              >
                {value}
              </p>
            )}
            <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">{sub}</p>
          </div>
          <div
            className="rounded-lg p-2 shrink-0"
            style={{ background: `${accent}14` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
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

  return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
