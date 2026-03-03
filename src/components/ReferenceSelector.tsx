"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { type Reference } from "@/types";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

interface ReferenceSelectorProps {
  stationId: string;
  stationName: string;
  operatorNumber: string;
  operatorName?: string;
  /** Pre-loaded references from the parent. When provided, no additional fetch is performed. */
  references?: Reference[];
  onReferenceSelected: (referenceId: string) => void;
  onBack: () => void;
}

export function ReferenceSelector({
  stationId,
  stationName,
  operatorNumber,
  operatorName,
  references: referencesProp,
  onReferenceSelected,
  onBack,
}: ReferenceSelectorProps) {
  const [references, setReferences] = useState<Reference[]>(referencesProp ?? []);
  const [loading, setLoading] = useState(referencesProp === undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    // If references were already provided by the parent, skip the fetch entirely.
    if (referencesProp !== undefined) {
      setReferences(referencesProp);
      setLoading(false);
      return;
    }

    const fetchReferences = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/stations/${stationId}`);
        if (!res.ok) throw new Error("Error al cargar referencias");
        const data = await res.json();
        const station = data.station ?? data;
        setReferences(Array.isArray(station.references) ? station.references : []);
      } catch (err) {
        setError("No se pudieron cargar las referencias. Verifica la conexion.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferences();
  }, [stationId, referencesProp]);

  return (
    <div
      className="min-h-dvh p-3 sm:p-4 md:p-8 pt-safe pb-safe"
      style={{ backgroundColor: "#0A0A0C" }}
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-5 md:mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0 h-10 px-3"
              style={{ color: "#9ca3af" }}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <img src="/logo-kh.png" alt="KH" className="h-7 md:h-8 w-auto shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words text-white">
                Selecciona una referencia
              </h1>
              <p className="text-base md:text-lg leading-snug" style={{ color: "#9ca3af" }}>
                Estacion:{" "}
                <span className="font-semibold text-white">{stationName}</span>
              </p>
              <p className="text-sm leading-snug" style={{ color: "#6b7280" }}>
                Operario:{" "}
                <span style={{ color: "#d1d5db" }}>{operatorNumber}</span>
                {operatorName && (
                  <span className="ml-2" style={{ color: "#d1d5db" }}>
                    {operatorName}
                  </span>
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
            <Loader2 className="h-12 w-12 animate-spin" style={{ color: "#8B1A1A" }} />
            <p className="text-lg" style={{ color: "#9ca3af" }}>
              Cargando referencias...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-lg mb-4" style={{ color: "#f87171" }}>
              {error}
            </p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        )}

        {!loading && !error && references.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl gap-4"
            style={{ border: "1px solid #2A2A2E", backgroundColor: "#111113" }}
          >
            <AlertTriangle className="h-12 w-12" style={{ color: "#8B1A1A" }} />
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-white">
                Sin referencias vinculadas
              </p>
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                Contacta con el administrador para configurar las referencias de esta estacion.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onBack}
              style={{ borderColor: "#2A2A2E", color: "#d1d5db" }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a estaciones
            </Button>
          </div>
        )}

        {!loading && !error && references.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {references.map((ref) => (
              <button
                key={ref.id}
                onClick={() => onReferenceSelected(ref.id)}
                className="text-left rounded-xl p-5 transition-all duration-150 focus:outline-none"
                style={{
                  backgroundColor: "#111113",
                  border: "1px solid #2A2A2E",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#8B1A1A";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(139,26,26,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#2A2A2E";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#111113";
                }}
              >
                <div className="flex flex-col gap-1">
                  <span
                    className="text-xs font-mono font-semibold tracking-wider uppercase"
                    style={{ color: "#8B1A1A" }}
                  >
                    {ref.sageCode}
                  </span>
                  <span className="text-lg font-semibold text-white leading-tight">
                    {ref.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
