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
      toast({ title: "Salvo", description: `${key} atualizado para esta estação.` });
    } else {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
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
        <CardTitle>Configurações desta Estação</CardTitle>
        <CardDescription>
          Deixe em branco para herdar as configurações globais do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>
            Voice ID (global: <code className="text-xs">{global.ttsVoiceId}</code>)
          </Label>
          <Input
            value={settings.ttsVoiceId ?? ""}
            onChange={(e) => void update("ttsVoiceId", e.target.value)}
            placeholder={`Herdar global: ${global.ttsVoiceId}`}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tamanho de fonte (global: {global.fontSize}px)</Label>
          <Input
            type="number"
            min={12}
            max={32}
            value={settings.fontSize ?? ""}
            onChange={(e) =>
              void update("fontSize", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder={`Herdar global: ${global.fontSize}px`}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Cor de fundo (hex, ex: #f0f4ff)</Label>
          <div className="flex gap-2">
            <Input
              value={settings.backgroundColor ?? ""}
              onChange={(e) => void update("backgroundColor", e.target.value)}
              placeholder="Herdar padrão do sistema"
            />
            {settings.backgroundColor && (
              <div
                className="w-10 h-10 rounded border"
                style={{ backgroundColor: settings.backgroundColor }}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cor de destaque (hex)</Label>
          <div className="flex gap-2">
            <Input
              value={settings.accentColor ?? ""}
              onChange={(e) => void update("accentColor", e.target.value)}
              placeholder="Herdar cor primária do sistema"
            />
            {settings.accentColor && (
              <div
                className="w-10 h-10 rounded border"
                style={{ backgroundColor: settings.accentColor }}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Delay auto-avanço em ms (global: {global.autoAdvanceDelay}ms)</Label>
          <Input
            type="number"
            min={1000}
            max={10000}
            step={500}
            value={settings.autoAdvanceDelay ?? ""}
            onChange={(e) =>
              void update(
                "autoAdvanceDelay",
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            placeholder={`Herdar global: ${global.autoAdvanceDelay}ms`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
