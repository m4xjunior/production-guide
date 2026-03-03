"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useContinuousSpeechRecognition } from "@/hooks/useContinuousSpeechRecognition";
import { useWhisperSTT } from "@/hooks/useWhisperSTT";
import { type Step } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RotateCcw,
  LogOut,
  Loader2,
} from "lucide-react";

interface ProductionStepProps {
  step: Step;
  steps: Step[];
  currentIndex: number;
  totalSteps: number;
  operatorNumber: string;
  sessionId: string;
  onStepCompleted: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onBackToStations: () => void;
  onRestart: () => void;
  onLogout: () => void;
}

export function ProductionStep({
  step,
  steps,
  currentIndex,
  totalSteps,
  operatorNumber,
  sessionId,
  onStepCompleted,
  onPreviousStep,
  onNextStep,
  onBackToStations,
  onRestart,
  onLogout,
}: ProductionStepProps) {
  const [stepStartTime] = useState(Date.now());
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [useWhisper, setUseWhisper] = useState(false);
  const [whisperUrl, setWhisperUrl] = useState("ws://localhost:8765");
  const hasSpokenRef = useRef(false);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { speak, stop: stopSpeech, isSpeaking } = useTextToSpeech();

  const handleVoiceMatch = useCallback(() => {
    logStepCompletion(step.respuesta || "voz");
    onStepCompleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.respuesta, onStepCompleted]);

  const {
    isListening,
    lastHeard,
    isSupported: speechSupported,
    startContinuousListening,
    stopContinuousListening,
  } = useContinuousSpeechRecognition(
    step.respuesta || "",
    handleVoiceMatch,
    isSpeaking
  );

  const whisperSTT = useWhisperSTT({
    expectedResponse: step.respuesta || "",
    onMatch: () => {
      stopContinuousListening();
      handleVoiceMatch();
    },
    isTTSSpeaking: isSpeaking,
    serverUrl: whisperUrl,
    enabled: useWhisper && step.responseType === "voice",
  });

  const logStepCompletion = useCallback(async (response: string) => {
    const durationMs = Date.now() - stepStartTime;
    try {
      await fetch("/api/step-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          stepId: step.id,
          responseReceived: response,
          durationMs,
          wasSkipped: false,
        }),
      });
    } catch (err) {
      console.error("Error logging step:", err);
    }
  }, [sessionId, step.id, stepStartTime]);

  // Speak the step instruction (from pre-generated ElevenLabs audio)
  useEffect(() => {
    hasSpokenRef.current = false;

    if (!isMuted && step.vozAudioUrl) {
      const timer = setTimeout(() => {
        if (!hasSpokenRef.current) {
          hasSpokenRef.current = true;
          speak(step.vozAudioUrl!);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, isMuted]);

  // Start voice recognition for voice steps
  useEffect(() => {
    if (step.responseType === "voice" && step.respuesta) {
      const timer = setTimeout(() => {
        if (useWhisper) {
          void whisperSTT.startListening();
        } else if (speechSupported) {
          startContinuousListening();
        }
      }, 1000);
      return () => {
        clearTimeout(timer);
        if (useWhisper) {
          whisperSTT.stopListening();
        } else {
          stopContinuousListening();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, step.responseType, useWhisper]);

  // Auto-advance for SISTEMA steps
  useEffect(() => {
    if (step.responseType === "auto" || step.tipo === "SISTEMA") {
      setAutoAdvanceCountdown(3);
      autoTimerRef.current = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(autoTimerRef.current!);
            logStepCompletion("auto");
            onStepCompleted();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);

      return () => {
        if (autoTimerRef.current) {
          clearInterval(autoTimerRef.current);
        }
      };
    } else {
      setAutoAdvanceCountdown(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      stopContinuousListening();
      whisperSTT.stopListening();
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Whisper config from global settings
  useEffect(() => {
    fetch("/api/config/global")
      .then((r) => r.json())
      .then((d: { settings?: { useWhisperSTT?: boolean; whisperServerUrl?: string } }) => {
        if (d.settings) {
          setUseWhisper(d.settings.useWhisperSTT ?? false);
          setWhisperUrl(d.settings.whisperServerUrl ?? "ws://localhost:8765");
        }
      })
      .catch(() => {});
  }, []);

  const handleButtonConfirm = () => {
    logStepCompletion("confirmado");
    onStepCompleted();
  };

  const handleScanComplete = (code: string) => {
    logStepCompletion(code);
    onStepCompleted();
  };

  const handleToggleMute = () => {
    if (isSpeaking) stopSpeech();
    setIsMuted(!isMuted);
  };

  const handleRepeatVoice = () => {
    if (step.vozAudioUrl) {
      speak(step.vozAudioUrl);
    }
  };

  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  const tipoBadge = {
    VOZ: { variant: "default" as const, label: "Voz" },
    SISTEMA: { variant: "secondary" as const, label: "Sistema" },
    QC: { variant: "warning" as const, label: "Control Calidad" },
  };

  const badgeInfo = tipoBadge[step.tipo] || tipoBadge.VOZ;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b bg-card px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBackToStations}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Estaciones
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground">
              Operario: <span className="font-semibold text-foreground">{operatorNumber}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleToggleMute} title={isMuted ? "Activar sonido" : "Silenciar"}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onRestart} title="Reiniciar">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} title="Cerrar sesion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border-b px-4 py-2">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Paso {currentIndex + 1} de {totalSteps}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Instruction */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                {step.isQc && (
                  <Badge variant="warning">QC</Badge>
                )}
                {step.responseType === "voice" && (isListening || (useWhisper && whisperSTT.isListening)) && (
                  <Badge variant="default" className="voice-listening">
                    <Mic className="h-3 w-3 mr-1" />
                    Escuchando...
                  </Badge>
                )}
                {useWhisper && whisperSTT.isConnected && (
                  <span className="text-xs text-green-600">● Whisper</span>
                )}
              </div>

              <Card className="border-2">
                <CardContent className="p-6 md:p-8">
                  <p className="text-xl md:text-2xl lg:text-3xl font-semibold leading-relaxed voice-optimized">
                    {step.mensaje}
                  </p>
                </CardContent>
              </Card>

              {/* Voice feedback */}
              {step.responseType === "voice" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {(isListening || (useWhisper && whisperSTT.isListening)) ? (
                      <>
                        <Mic className="h-4 w-4 text-primary animate-pulse" />
                        <span>Escuchando... Di: <strong className="text-foreground">&quot;{step.respuesta}&quot;</strong></span>
                        {useWhisper && whisperSTT.isConnected && (
                          <span className="text-xs text-green-600 ml-1">● Whisper</span>
                        )}
                      </>
                    ) : (speechSupported || useWhisper) ? (
                      <>
                        <MicOff className="h-4 w-4" />
                        <span>Microfono pausado</span>
                      </>
                    ) : (
                      <span>Reconocimiento de voz no disponible</span>
                    )}
                  </div>
                  {(useWhisper ? whisperSTT.lastHeard : lastHeard) && (
                    <p className="text-sm text-muted-foreground italic">
                      Ultimo escuchado: &quot;{useWhisper ? whisperSTT.lastHeard : lastHeard}&quot;
                    </p>
                  )}
                  {/* Manual advance button for voice steps */}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleButtonConfirm}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirmar manualmente
                  </Button>
                </div>
              )}

              {/* Scan input */}
              {step.responseType === "scan" && (
                <BarcodeScanner
                  expectedCode={step.respuesta}
                  onScanComplete={handleScanComplete}
                  stepId={step.id}
                />
              )}

              {/* Button confirmation */}
              {step.responseType === "button" && (
                <Button
                  variant="success"
                  size="touch"
                  className="w-full text-xl font-bold voice-button"
                  onClick={handleButtonConfirm}
                >
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Confirmar
                </Button>
              )}

              {/* Auto-advance */}
              {(step.responseType === "auto" || step.tipo === "SISTEMA") && autoAdvanceCountdown !== null && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-lg">
                    Avanzando automaticamente en {autoAdvanceCountdown}s...
                  </span>
                </div>
              )}

              {/* Repeat audio button */}
              {step.vozAudioUrl && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRepeatVoice}
                  disabled={isSpeaking}
                  className="w-full"
                >
                  <Volume2 className="h-5 w-5 mr-2" />
                  {isSpeaking ? "Reproduciendo..." : "Repetir instruccion"}
                </Button>
              )}
            </div>

            {/* Right: Image */}
            <div className="flex items-start justify-center">
              {step.photoUrl ? (
                <div className="w-full rounded-xl overflow-hidden border bg-white shadow-sm">
                  <img
                    src={step.photoUrl}
                    alt={`Referencia paso ${currentIndex + 1}`}
                    className="w-full h-auto object-contain max-h-[60vh]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/file.svg";
                    }}
                  />
                </div>
              ) : (
                <div className="w-full aspect-video rounded-xl border-2 border-dashed bg-muted/50 flex items-center justify-center">
                  <p className="text-muted-foreground text-lg">Sin imagen de referencia</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t bg-card px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            size="touch"
            onClick={onPreviousStep}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Anterior
          </Button>

          {/* Step indicator dots */}
          <div className="hidden md:flex items-center gap-1.5">
            {steps.slice(
              Math.max(0, currentIndex - 3),
              Math.min(totalSteps, currentIndex + 4)
            ).map((s, i) => {
              const actualIndex = Math.max(0, currentIndex - 3) + i;
              return (
                <div
                  key={s.id}
                  className={`h-2.5 rounded-full transition-all ${
                    actualIndex === currentIndex
                      ? "w-8 bg-primary"
                      : actualIndex < currentIndex
                      ? "w-2.5 bg-primary/40"
                      : "w-2.5 bg-muted-foreground/20"
                  }`}
                />
              );
            })}
          </div>

          <Button
            variant="outline"
            size="touch"
            onClick={onNextStep}
            disabled={isLastStep}
          >
            Siguiente
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
