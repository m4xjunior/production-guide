"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  const { toast } = useToast();

  const loadSettings = () => {
    fetch("/api/config/global")
      .then((r) => r.json())
      .then((d: { settings: GlobalSettings }) => setSettings(d.settings))
      .catch(() => {});
    fetch("/api/config/audit?entityType=GlobalSettings&limit=30")
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
      toast({ title: "Configuração salva", description: `${key} atualizado com sucesso.` });
      loadSettings(); // refresh audit
    } else {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações Globais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Afeta todos os operadores e estações do sistema (salvo quando a estação tem configuração própria).
          {settings.updatedAt && (
            <span className="ml-2 text-xs">
              Última atualização: {new Date(settings.updatedAt).toLocaleString("pt-BR")}
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="tts">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tts">Voz TTS</TabsTrigger>
          <TabsTrigger value="ui">Interface</TabsTrigger>
          <TabsTrigger value="behavior">Comportamento</TabsTrigger>
          <TabsTrigger value="transcription">Transcrição</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="tts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ElevenLabs — Configuração de Voz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Voice ID</Label>
                <Input
                  defaultValue={settings.ttsVoiceId}
                  onBlur={(e) => void updateSetting("ttsVoiceId", e.target.value)}
                  placeholder="JBFqnCBsd6RMkjVDRZzb"
                />
                <p className="text-xs text-muted-foreground">
                  ID da voz no ElevenLabs. Alterar regenera áudios nos próximos passos criados.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Velocidade:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.ttsSpeed}x
                  </Badge>
                </Label>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={settings.ttsSpeed}
                  onChange={(e) => void updateSetting("ttsSpeed", parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5x (lento)</span>
                  <span>1.0x (normal)</span>
                  <span>2.0x (rápido)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Estabilidade:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.ttsStability}
                  </Badge>
                </Label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.ttsStability}
                  onChange={(e) =>
                    void updateSetting("ttsStability", parseFloat(e.target.value))
                  }
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Similaridade:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.ttsSimilarity}
                  </Badge>
                </Label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.ttsSimilarity}
                  onChange={(e) =>
                    void updateSetting("ttsSimilarity", parseFloat(e.target.value))
                  }
                  className="w-full accent-primary"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interface do Operador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Tamanho de fonte:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.fontSize}px
                  </Badge>
                </Label>
                <input
                  type="range"
                  min={12}
                  max={32}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) =>
                    void updateSetting("fontSize", parseInt(e.target.value))
                  }
                  className="w-full accent-primary"
                />
                <div
                  className="p-3 rounded border bg-muted"
                  style={{ fontSize: `${settings.fontSize}px` }}
                >
                  Prévia: Instrução de montagem do produto
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Idioma padrão</Label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => void updateSetting("defaultLanguage", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="es">Español</option>
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comportamento do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Delay auto-avanço:{" "}
                  <Badge variant="outline" className="ml-1">
                    {settings.autoAdvanceDelay / 1000}s
                  </Badge>
                </Label>
                <input
                  type="range"
                  min={1000}
                  max={10000}
                  step={500}
                  value={settings.autoAdvanceDelay}
                  onChange={(e) =>
                    void updateSetting("autoAdvanceDelay", parseInt(e.target.value))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1s</span>
                  <span>5s</span>
                  <span>10s</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">QC habilitado por padrão</p>
                  <p className="text-xs text-muted-foreground">
                    Novos passos criados terão QC ativado automaticamente
                  </p>
                </div>
                <Switch
                  checked={settings.enableQcByDefault}
                  onCheckedChange={(v) => void updateSetting("enableQcByDefault", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reconhecimento de Voz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Usar Whisper (servidor local)</p>
                  <p className="text-xs text-muted-foreground">
                    Usa o servidor Python local com Whisper para máxima precisão em vez do Web
                    Speech API do navegador
                  </p>
                </div>
                <Switch
                  checked={settings.useWhisperSTT}
                  onCheckedChange={(v) => void updateSetting("useWhisperSTT", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>URL do servidor Whisper</Label>
                <Input
                  defaultValue={settings.whisperServerUrl}
                  onBlur={(e) => void updateSetting("whisperServerUrl", e.target.value)}
                  placeholder="ws://localhost:8765"
                  disabled={!settings.useWhisperSTT}
                />
                <p className="text-xs text-muted-foreground">
                  Inicie o servidor: <code>cd transcription-server && ./start.sh</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mudanças</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma mudança registrada ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-sm border rounded-lg p-3">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {log.action}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.performedAt).toLocaleString("pt-BR")}
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
