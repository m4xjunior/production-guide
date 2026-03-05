"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { CheckCircle2, Mic, MicOff, Volume2 } from "lucide-react";

interface StepVoiceElevenPanelProps {
  expectedResponse: string;
  isListening: boolean;
  isSpeaking: boolean;
  lastHeard: string;
  isSupported?: boolean;
  onManualConfirm: () => void;
  onStartListening: () => void;
}

export function StepVoiceElevenPanel({
  expectedResponse,
  isListening,
  isSpeaking,
  lastHeard,
  isSupported = true,
  onManualConfirm,
  onStartListening,
}: StepVoiceElevenPanelProps) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base md:text-lg">
            Comando de voz
          </CardTitle>
          <Badge variant={isListening ? "default" : "secondary"} className="gap-1">
            <Mic className="h-3.5 w-3.5" />
            {isListening ? "Activo" : "En espera"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3">
          <LiveWaveform
            active={isListening && !isSpeaking}
            processing={isSpeaking}
            height={48}
            barWidth={3}
            barGap={1}
            barRadius={1.5}
            sensitivity={1.8}
            mode="static"
            className="w-full text-primary"
          />
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          {isSpeaking ? (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <span>Reproduciendo instrucción…</span>
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary animate-pulse" />
              <span>
                Escuchando... Di:{" "}
                <strong className="text-foreground">&quot;{expectedResponse}&quot;</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MicOff className="h-4 w-4" />
              <span>Micrófono pausado</span>
            </div>
          )}
        </div>

        {lastHeard && (
          <p className="text-sm text-muted-foreground italic">
            Último escuchado: &quot;{lastHeard}&quot;
          </p>
        )}

        {!isListening && isSupported && (
          <Button
            variant="outline"
            size="lg"
            onClick={onStartListening}
            className="w-full min-h-[44px]"
          >
            <Mic className="h-5 w-5 mr-2" />
            Activar micrófono
          </Button>
        )}

        <Button
          variant="outline"
          size="lg"
          onClick={onManualConfirm}
          className="w-full min-h-[44px]"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Confirmar manualmente
        </Button>
      </CardContent>
    </Card>
  );
}
