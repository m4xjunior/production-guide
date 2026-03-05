"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

type VoiceCommand = {
  id: string;
  scope: string;
  action: string;
  phrases: string[];
  isEnabled: boolean;
  language: string;
};

const ACTION_LABELS: Record<string, string> = {
  confirm: "Confirmar paso",
  next:    "Siguiente",
  prev:    "Anterior",
  stop:    "Paro de estación",
  logout:  "Cerrar sesión",
  repeat:  "Repetir instrucción",
  help:    "Ayuda / Andon",
};

export default function VoiceCommandsPage() {
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/voice-commands", {
      headers: { "X-Admin-Password": sessionStorage.getItem("p2v_admin_password") || "" },
    })
      .then((r) => r.json())
      .then(({ commands: cmds }) => setCommands(cmds || []));
  }, []);

  async function toggleCommand(id: string, isEnabled: boolean) {
    await fetch(`/api/voice-commands/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": sessionStorage.getItem("p2v_admin_password") || "",
      },
      body: JSON.stringify({ isEnabled }),
    });
    setCommands((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isEnabled } : c))
    );
  }

  function startTest() {
    setTesting(true);
    setTestResult(null);
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognition =
      (win["SpeechRecognition"] as typeof window.SpeechRecognition | undefined) ||
      (win["webkitSpeechRecognition"] as typeof window.SpeechRecognition | undefined);
    if (!SpeechRecognition) {
      setTestResult("Reconocimiento de voz no disponible en este navegador");
      setTesting(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "es-ES";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      const norm = transcript.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
      const matched = commands.find((c) =>
        c.isEnabled && c.phrases.some((p) =>
          p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim() === norm
        )
      );
      setTestResult(
        matched
          ? `Reconocido: "${transcript}" → Acción: ${ACTION_LABELS[matched.action] || matched.action}`
          : `No reconocido: "${transcript}" — sin coincidencia`
      );
      setTesting(false);
    };
    rec.onerror = () => { setTesting(false); setTestResult("Error al escuchar"); };
    rec.onend = () => setTesting(false);
    rec.start();
  }

  const byScope = {
    global:  commands.filter((c) => c.scope === "global"),
    station: commands.filter((c) => c.scope === "station"),
    step:    commands.filter((c) => c.scope === "step"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Comandos de Voz</h1>
        <Button
          variant={testing ? "destructive" : "outline"}
          className="gap-2"
          onClick={startTest}
          disabled={testing}
        >
          {testing ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {testing ? "Escuchando..." : "Probar comando"}
        </Button>
      </div>

      {testResult && (
        <div className="rounded-lg bg-zinc-800 p-4 text-sm text-zinc-200">{testResult}</div>
      )}

      {(["global", "station", "step"] as const).map((scope) =>
        byScope[scope].length > 0 ? (
          <Card key={scope} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base text-zinc-300 capitalize">{scope}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byScope[scope].map((cmd) => (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between rounded-md bg-zinc-800 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {ACTION_LABELS[cmd.action] || cmd.action}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cmd.phrases.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className="text-xs border-zinc-600 text-zinc-400"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Switch
                    checked={cmd.isEnabled}
                    onCheckedChange={(v) => toggleCommand(cmd.id, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null
      )}
    </div>
  );
}
