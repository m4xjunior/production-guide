"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StationCard } from "@/components/StationCard";
import { type Station } from "@/types";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";

interface StationSelectorProps {
  operatorNumber: string;
  onStationSelected: (stationId: string) => void;
  onBack: () => void;
}

export function StationSelector({ operatorNumber, onStationSelected, onBack }: StationSelectorProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stations");
      if (!res.ok) throw new Error("Error al cargar estaciones");
      const data = await res.json();
      const list = data.stations ?? data;
      setStations(list.filter((s: Station) => s.isActive));
    } catch (err) {
      setError("No se pudieron cargar las estaciones. Verifica la conexion.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="touch" onClick={onBack}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <img src="/logo-kh.png" alt="KH" className="h-8 w-auto" />
                <h1 className="text-2xl font-bold">Selecciona una estacion</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Operario: <span className="font-semibold text-foreground">{operatorNumber}</span>
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchStations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Cargando estaciones...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-lg text-destructive mb-4">{error}</p>
            <Button onClick={fetchStations}>Reintentar</Button>
          </div>
        )}

        {!loading && !error && stations.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">
              No hay estaciones activas disponibles.
            </p>
          </div>
        )}

        {!loading && !error && stations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                onClick={onStationSelected}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
