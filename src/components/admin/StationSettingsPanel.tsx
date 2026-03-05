"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

interface StationCfg {
  ttsVoiceId: string | null;
  fontSize: number | null;
  backgroundColor: string | null;
  accentColor: string | null;
  autoAdvanceDelay: number | null;
}

interface GlobalCfg {
  ttsVoiceId: string;
  fontSize: number;
  autoAdvanceDelay: number;
}

export function StationSettingsPanel({ stationId }: { stationId: string }) {
  const [settings, setSettings] = useState<StationCfg | null>(null);
  const [global, setGlobal] = useState<GlobalCfg | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/config/stations/${stationId}`)
      .then((r) => r.json())
      .then((d: { settings: StationCfg }) => setSettings(d.settings))
      .catch(() => {});
    fetch("/api/config/global")
      .then((r) => r.json())
      .then((d: { settings: GlobalCfg }) => setGlobal(d.settings))
      .catch(() => {});
  }, [stationId]);

  const update = async (key: string, value: unknown) => {
    const res = await adminFetch(`/api/config/stations/${stationId}`, {
      method: "PUT",
      body: JSON.stringify({ [key]: value === "" ? null : value }),
    });
    if (res.ok) {
      const data = (await res.json()) as { settings: StationCfg };
      setSettings(data.settings);
      toast({ title: "Guardado", description: `${key} actualizado para esta estacion.` });
    } else {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    }
  };

  if (!settings || !global) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuraciones de esta estacion</CardTitle>
        <CardDescription>
          Dejar en blanco para heredar la configuracion global del sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="station-settings-voice-id">
            Voice ID (global: <code className="text-xs">{global.ttsVoiceId}</code>)
          </Label>
          <Input
            id="station-settings-voice-id"
            defaultValue={settings.ttsVoiceId ?? ""}
            onBlur={(e) => void update("ttsVoiceId", e.target.value)}
            placeholder={`Heredar global: ${global.ttsVoiceId}`}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="station-settings-font-size">Tamano de fuente (global: {global.fontSize}px)</Label>
          <Input
            id="station-settings-font-size"
            type="number"
            min={12}
            max={32}
            defaultValue={settings.fontSize ?? ""}
            onBlur={(e) =>
              void update("fontSize", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder={`Heredar global: ${global.fontSize}px`}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="station-settings-bg-color">Color de fondo (hex, ej: #f0f4ff)</Label>
          <div className="flex gap-2">
            <Input
              id="station-settings-bg-color"
              defaultValue={settings.backgroundColor ?? ""}
              onBlur={(e) => void update("backgroundColor", e.target.value)}
              placeholder="Heredar configuracion global"
            />
            {settings.backgroundColor && (
              <div
                className="w-10 h-10 rounded border shrink-0"
                style={{ backgroundColor: settings.backgroundColor }}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="station-settings-accent-color">Color de acento (hex)</Label>
          <div className="flex gap-2">
            <Input
              id="station-settings-accent-color"
              defaultValue={settings.accentColor ?? ""}
              onBlur={(e) => void update("accentColor", e.target.value)}
              placeholder="Heredar color primario del sistema"
            />
            {settings.accentColor && (
              <div
                className="w-10 h-10 rounded border shrink-0"
                style={{ backgroundColor: settings.accentColor }}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="station-settings-auto-advance">Delay auto-avance en ms (global: {global.autoAdvanceDelay}ms)</Label>
          <Input
            id="station-settings-auto-advance"
            type="number"
            min={1000}
            max={10000}
            step={500}
            defaultValue={settings.autoAdvanceDelay ?? ""}
            onBlur={(e) =>
              void update(
                "autoAdvanceDelay",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            placeholder={`Heredar global: ${global.autoAdvanceDelay}ms`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
