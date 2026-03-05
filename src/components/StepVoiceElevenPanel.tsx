"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";
import { CheckCircle2, Mic, MicOff, Volume2 } from "lucide-react";
import { type VoiceProvider } from "@/hooks/useElevenStepConversation";
import { type Status } from "@elevenlabs/react";

interface StepVoiceElevenPanelProps {
  provider: VoiceProvider;
  status: Status | "disconnected";
  expectedResponse: string;
  isListening: boolean;
  isSpeaking: boolean;
  lastHeard: string;
  error: string | null;
  inputBars: number[];
  outputBars: number[];
  fallbackEngineLabel: string;
  onManualConfirm: () => void;
}

interface WaveformStripProps {
  bars: number[];
  accentClass: string;
}

function WaveformStrip({ bars, accentClass }: WaveformStripProps) {
  const safeBars =
    bars.length > 0 ? bars : Array.from({ length: 24 }, () => 0.08);

  return (
    <div className="h-20 rounded-lg border bg-muted/20 px-2 py-2">
      <div className="h-full w-full flex items-end justify-center gap-1">
        {safeBars.slice(0, 24).map((value, idx) => {
          const height = Math.max(6, Math.round(value * 60));
          return (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className={cn("w-1.5 rounded-full transition-all duration-75", accentClass)}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function StepVoiceElevenPanel({
  provider,
  status,
  expectedResponse,
  isListening,
  isSpeaking,
  lastHeard,
  error,
  inputBars,
  outputBars,
  fallbackEngineLabel,
  onManualConfirm,
}: StepVoiceElevenPanelProps) {
  const usingEleven = provider === "elevenlabs";

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base md:text-lg">
            Comando de voz
          </CardTitle>
          <Badge variant={usingEleven ? "default" : "secondary"} className="gap-1">
            <Mic className="h-3.5 w-3.5" />
            {isListening ? "Activo" : "En espera"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {usingEleven ? (
          <div className="space-y-2">
            <WaveformStrip bars={inputBars} accentClass="bg-primary" />
            <WaveformStrip bars={outputBars} accentClass="bg-emerald-500" />
          </div>
        ) : (
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
        )}

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

          <p className="text-xs uppercase tracking-wide">
            Estado: {isListening ? "escuchando" : isSpeaking ? "hablando" : "pausado"}
          </p>
        </div>

        {error && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {lastHeard && (
          <p className="text-sm text-muted-foreground italic">
            Último escuchado: &quot;{lastHeard}&quot;
          </p>
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
