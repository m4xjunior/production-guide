"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

interface GlobalSettings {
  ttsVoiceId: string;
  ttsSpeed: number;
  ttsStability: number;
  ttsSimilarity: number;
  fontSize: number;
  theme: string;
  defaultLanguage: string;
  autoAdvanceDelay: number;
  enableQcByDefault: boolean;
  whisperServerUrl: string;
  useWhisperSTT: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  performedBy: string;
  performedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  const loadSettings = () => {
    fetch("/api/config/global")
      .then((r) => r.json())
      .then((d: { settings: GlobalSettings }) => setSettings(d.settings))
      .catch(() => {});
    fetch("/api/config/audit?entityType=Tenant&limit=30")
      .then((r) => r.json())
      .then((d: { logs: AuditLog[] }) => setAuditLogs(d.logs))
      .catch(() => {});
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = async (key: string, value: unknown) => {
    const res = await adminFetch("/api/config/global", {
      method: "PUT",
      body: JSON.stringify({ [key]: value }),
    });
    if (res.ok) {
      const data = (await res.json()) as { settings: GlobalSettings };
      setSettings(data.settings);
      toast({ title: "Configuracion guardada", description: `${key} actualizado con exito.` });
      loadSettings(); // refresh audit
    } else {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    }
  };

  const handleRegenerateAudio = async (force = false) => {
    setIsRegenerating(true);
    try {
      const res = await adminFetch(`/api/tts/generate-all${force ? "?force=true" : ""}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Generación completada",
          description: data.message,
        });
      } else {
        throw new Error(data.error || "Error al regenerar");
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo regenerar el audio.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuraciones Globales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Afecta a todos los operarios y estaciones del sistema (salvo cuando la estacion tiene configuracion propia).
          {settings.updatedAt && (
            <span className="ml-2 text-xs">
              Ultima actualizacion: {new Date(settings.updatedAt).toLocaleString("es-ES")}
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="tts">
        <TabsList className="flex overflow-x-auto flex-nowrap w-full bg-[#141416] justify-start sm:grid sm:grid-cols-5">
          <TabsTrigger
            value="tts"
            className="whitespace-nowrap data-[state=active]:bg-[#1A1A1E] data-[state=active]:text-[#E8E8E8]"
          >
            Voz TTS
          </TabsTrigger>
          <TabsTrigger
            value="ui"
            className="whitespace-nowrap data-[state=active]:bg-[#1A1A1E] data-[state=active]:text-[#E8E8E8]"
          >
            Interfaz
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            className="whitespace-nowrap data-[state=active]:bg-[#1A1A1E] data-[state=active]:text-[#E8E8E8]"
          >
            Comportamiento
          </TabsTrigger>
          <TabsTrigger
            value="transcription"
            className="whitespace-nowrap data-[state=active]:bg-[#1A1A1E] data-[state=active]:text-[#E8E8E8]"
          >
            Transcripcion
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="whitespace-nowrap data-[state=active]:bg-[#1A1A1E] data-[state=active]:text-[#E8E8E8]"
          >
            Auditoria
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Voz TTS ── */}
        <TabsContent value="tts" className="space-y-4">
          <Card className="border-[#2A2A2E]">
            <CardHeader>
              <CardTitle>ElevenLabs — Configuracion de Voz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-muted-foreground mb-4">
                Los cambios se guardan automáticamente al salir de cada campo.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ttsVoiceId">Voice ID</Label>
                <Input
                  id="ttsVoiceId"
                  defaultValue={settings.ttsVoiceId}
                  onBlur={(e) => void updateSetting("ttsVoiceId", e.target.value)}
                  placeholder="JBFqnCBsd6RMkjVDRZzb"
                />
                <p className="text-xs text-muted-foreground">
                  ID de la voz en ElevenLabs. Cambiarla regenera los audios en los proximos pasos creados.
                </p>
              </div>

              <div className="space-y-2">
                <Label id="label-ttsSpeed">
                  Velocidad:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.ttsSpeed}x
                  </Badge>
                </Label>
                <Slider
                  aria-labelledby="label-ttsSpeed"
                  value={[settings.ttsSpeed]}
                  onValueChange={([v]) => void updateSetting("ttsSpeed", v)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5x (lento)</span>
                  <span>1.0x (normal)</span>
                  <span>2.0x (rapido)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label id="label-ttsStability">
                  Estabilidad:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.ttsStability}
                  </Badge>
                </Label>
                <Slider
                  aria-labelledby="label-ttsStability"
                  value={[settings.ttsStability]}
                  onValueChange={([v]) => void updateSetting("ttsStability", v)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <div className="space-y-2">
                <Label id="label-ttsSimilarity">
                  Similitud:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.ttsSimilarity}
                  </Badge>
                </Label>
                <Slider
                  aria-labelledby="label-ttsSimilarity"
                  value={[settings.ttsSimilarity]}
                  onValueChange={([v]) => void updateSetting("ttsSimilarity", v)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <div className="pt-4 border-t border-[#2A2A2E] space-y-4">
                <div className="flex flex-col gap-2">
                  <Label>Mantenimiento de Audio</Label>
                  <p className="text-xs text-muted-foreground">
                    Si los operarios no escuchan el audio, intente regenerar los archivos faltantes o forzar la actualización de todos.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => void handleRegenerateAudio(false)}
                    disabled={isRegenerating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Generar faltantes
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => void handleRegenerateAudio(true)}
                    disabled={isRegenerating}
                  >
                    Regenerar TODO (Force)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Interfaz ── */}
        <TabsContent value="ui" className="space-y-4">
          <Card className="border-[#2A2A2E]">
            <CardHeader>
              <CardTitle>Interfaz del Operario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label id="label-fontSize">
                  Tamano de fuente:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.fontSize}px
                  </Badge>
                </Label>
                <Slider
                  aria-labelledby="label-fontSize"
                  value={[settings.fontSize]}
                  onValueChange={([v]) => void updateSetting("fontSize", v)}
                  min={12}
                  max={32}
                  step={1}
                />
                <div
                  className="p-3 rounded border border-[#2A2A2E] bg-muted"
                  style={{ fontSize: `${settings.fontSize}px` }}
                >
                  Vista previa: Instruccion de montaje del producto
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Idioma predeterminado</Label>
                <Select
                  value={settings.defaultLanguage}
                  onValueChange={(v) => void updateSetting("defaultLanguage", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Espanol</SelectItem>
                    <SelectItem value="pt">Portugues</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Francais</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Comportamiento ── */}
        <TabsContent value="behavior" className="space-y-4">
          <Card className="border-[#2A2A2E]">
            <CardHeader>
              <CardTitle>Comportamiento del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label id="label-autoAdvanceDelay">
                  Delay auto-avance:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.autoAdvanceDelay / 1000}s
                  </Badge>
                </Label>
                <Slider
                  aria-labelledby="label-autoAdvanceDelay"
                  value={[settings.autoAdvanceDelay]}
                  onValueChange={([v]) => void updateSetting("autoAdvanceDelay", v)}
                  min={1000}
                  max={10000}
                  step={500}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1s</span>
                  <span>5s</span>
                  <span>10s</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-[#141416] p-4">
                <div>
                  <Label htmlFor="enableQcByDefault" className="text-sm font-medium cursor-pointer">QC habilitado por defecto</Label>
                  <p className="text-xs text-muted-foreground">
                    Los nuevos pasos creados tendran QC activado automaticamente
                  </p>
                </div>
                <Switch
                  id="enableQcByDefault"
                  checked={settings.enableQcByDefault}
                  onCheckedChange={(v) => void updateSetting("enableQcByDefault", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Transcripcion ── */}
        <TabsContent value="transcription" className="space-y-4">
          <Card className="border-[#2A2A2E]">
            <CardHeader>
              <CardTitle>Reconocimiento de Voz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-[#141416] p-4">
                <div>
                  <Label htmlFor="useWhisperSTT" className="text-sm font-medium cursor-pointer">Usar Whisper (servidor local)</Label>
                  <p className="text-xs text-muted-foreground">
                    Usa el servidor Python local con Whisper para maxima precision en lugar de la Web
                    Speech API del navegador
                  </p>
                </div>
                <Switch
                  id="useWhisperSTT"
                  checked={settings.useWhisperSTT}
                  onCheckedChange={(v) => void updateSetting("useWhisperSTT", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whisperServerUrl">URL del servidor Whisper</Label>
                <Input
                  id="whisperServerUrl"
                  defaultValue={settings.whisperServerUrl}
                  onBlur={(e) => void updateSetting("whisperServerUrl", e.target.value)}
                  placeholder="ws://localhost:8765"
                  disabled={!settings.useWhisperSTT}
                />
                <p className="text-xs text-muted-foreground">
                  Inicie el servidor: <code>cd transcription-server && ./start.sh</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Auditoria ── */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-[#2A2A2E]">
            <CardHeader>
              <CardTitle>Historial de Cambios</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Ningun cambio registrado aun.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 text-sm border border-[#2A2A2E] rounded-lg p-3"
                    >
                      <Badge variant="outline" className="text-xs shrink-0">
                        {log.action}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.performedAt).toLocaleString("es-ES")}
                      </span>
                      <span className="text-xs">por {log.performedBy}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
