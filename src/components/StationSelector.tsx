"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StationCard } from "@/components/StationCard";
import { type Station } from "@/types";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";

interface StationSelectorProps {
  operatorNumber: string;
  operatorName?: string;
  onStationSelected: (stationId: string, stationName: string) => void;
  onBack: () => void;
}

export function StationSelector({ operatorNumber, operatorName, onStationSelected, onBack }: StationSelectorProps) {
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
    <div className="min-h-dvh bg-background p-3 sm:p-4 md:p-8 pt-safe pb-safe">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-5 md:mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0 h-10 px-3"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
            <Button
              variant="outline"
              onClick={fetchStations}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 md:mr-2 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Actualizar</span>
            </Button>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <img src="/logo-kh.png" alt="KH" className="h-7 md:h-8 w-auto shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words">
                Selecciona una estacion
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-snug">
                Operario: <span className="font-semibold text-foreground">{operatorNumber}</span>
                {operatorName && (
                  <span className="ml-2 text-foreground">{operatorName}</span>
                )}
              </p>
            </div>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
