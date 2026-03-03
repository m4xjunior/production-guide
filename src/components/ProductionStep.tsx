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
import {
  type VoiceProvider,
  useElevenStepConversation,
} from "@/hooks/useElevenStepConversation";
import { StepTransition } from "@/components/StepTransition";
import { SuccessFeedback } from "@/components/SuccessFeedback";
import { type Step } from "@/types";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { StepVoiceElevenPanel } from "@/components/StepVoiceElevenPanel";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Volume2,
  VolumeX,
  Mic,
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
  const [useElevenLive, setUseElevenLive] = useState(true);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>("elevenlabs");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [showSuccess, setShowSuccess] = useState(false);
  const elevenLiveEnabledByEnv =
    process.env.NEXT_PUBLIC_ENABLE_ELEVENLABS_LIVE !== "false";
  const hasSpokenRef = useRef(false);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { speak, stop: stopSpeech, isSpeaking } = useTextToSpeech();

  const handleVoiceMatch = useCallback(() => {
    logStepCompletion(step.respuesta || "voz");
    setDirection("forward");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 900);
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

  const startFallbackRecognition = useCallback(() => {
    if (useWhisper) {
      void whisperSTT.startListening();
      return;
    }

    if (speechSupported) {
      startContinuousListening();
    }
  }, [useWhisper, whisperSTT, speechSupported, startContinuousListening]);

  const stopFallbackRecognition = useCallback(() => {
    whisperSTT.stopListening();
    stopContinuousListening();
  }, [whisperSTT, stopContinuousListening]);

  const elevenStep = useElevenStepConversation({
    sessionId,
    stationId: step.stationId,
    stepId: step.id,
    expectedResponse: step.respuesta || "",
    onMatch: () => {
      stopFallbackRecognition();
      handleVoiceMatch();
    },
    isTTSSpeaking: isSpeaking,
    enabled: useElevenLive && step.responseType === "voice",
  });

  useEffect(() => {
    setVoiceProvider(elevenStep.provider);
  }, [elevenStep.provider]);

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

  // Start voice recognition for voice steps (ElevenLabs first, fallback automático)
  useEffect(() => {
    if (step.responseType === "voice" && step.respuesta) {
      let cancelled = false;
      const timer = setTimeout(() => {
        void (async () => {
          if (!useElevenLive) {
            startFallbackRecognition();
            return;
          }

          const startedWithEleven = await elevenStep.startListening();
          if (cancelled) return;

          if (!startedWithEleven) {
            startFallbackRecognition();
          }
        })();
      }, 1000);

      return () => {
        cancelled = true;
        clearTimeout(timer);
        void elevenStep.stopListening();
        stopFallbackRecognition();
      };
    }
  }, [
    step.id,
    step.responseType,
    step.respuesta,
    useElevenLive,
    elevenStep.startListening,
    elevenStep.stopListening,
    startFallbackRecognition,
    stopFallbackRecognition,
  ]);

  // Auto-advance for SISTEMA steps
  useEffect(() => {
    if (step.responseType === "auto" || step.tipo === "SISTEMA") {
      setAutoAdvanceCountdown(3);
      autoTimerRef.current = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(autoTimerRef.current!);
            logStepCompletion("auto");
            setDirection("forward");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 900);
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
      stopFallbackRecognition();
      void elevenStep.stopListening();
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [stopSpeech, stopFallbackRecognition, elevenStep.stopListening]);

  // Fetch Whisper config from global settings
  useEffect(() => {
    setUseElevenLive(elevenLiveEnabledByEnv);
    fetch("/api/config/global")
      .then((r) => r.json())
      .then((
        d: {
          settings?: {
            useWhisperSTT?: boolean;
            whisperServerUrl?: string;
            useElevenLiveSTT?: boolean;
          };
        },
      ) => {
        if (d.settings) {
          setUseWhisper(d.settings.useWhisperSTT ?? false);
          setWhisperUrl(d.settings.whisperServerUrl ?? "ws://localhost:8765");
          if (typeof d.settings.useElevenLiveSTT === "boolean") {
            setUseElevenLive(d.settings.useElevenLiveSTT);
          }
        }
      })
      .catch(() => {});
  }, [elevenLiveEnabledByEnv]);

  // Se ElevenLabs cair durante o passo, ativa fallback automaticamente.
  useEffect(() => {
    if (step.responseType !== "voice" || !step.respuesta) return;

    if (voiceProvider === "fallback") {
      startFallbackRecognition();
      return;
    }

    stopFallbackRecognition();
  }, [
    step.id,
    step.responseType,
    step.respuesta,
    voiceProvider,
    startFallbackRecognition,
    stopFallbackRecognition,
  ]);

  const handleButtonConfirm = () => {
    logStepCompletion("confirmado");
    setDirection("forward");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 900);
    onStepCompleted();
  };

  const handleScanComplete = (code: string) => {
    logStepCompletion(code);
    setDirection("forward");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 900);
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

  const handlePreviousStep = () => {
    setDirection("backward");
    onPreviousStep();
  };

  const handleNextStep = () => {
    setDirection("forward");
    onNextStep();
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

  const fallbackEngineLabel = useWhisper ? "Whisper" : "Web Speech API";
  const isFallbackVoiceListening =
    isListening || (useWhisper && whisperSTT.isListening);
  const isVoiceListening =
    step.responseType === "voice" &&
    (voiceProvider === "elevenlabs"
      ? elevenStep.isListening
      : isFallbackVoiceListening);
  const lastHeardText =
    voiceProvider === "elevenlabs"
      ? elevenStep.lastHeard
      : useWhisper
      ? whisperSTT.lastHeard
      : lastHeard;

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
          <StepTransition stepKey={step.id} direction={direction}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Instruction */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                  {step.isQc && (
                    <Badge variant="warning">QC</Badge>
                  )}
                  {isVoiceListening && (
                    <Badge variant="default" className="voice-listening flex items-center gap-1.5">
                      <Mic className="h-3 w-3" />
                      Escuchando ({voiceProvider === "elevenlabs" ? "Eleven" : "Fallback"})
                    </Badge>
                  )}
                  {isSpeaking && (
                    <Badge variant="secondary" className="flex items-center gap-1.5 pr-1">
                      <Volume2 className="h-3 w-3" />
                      Hablando
                      <LiveWaveform
                        processing
                        height={16}
                        barWidth={2}
                        barGap={1}
                        barRadius={1}
                        barColor="currentColor"
                        fadeEdges={false}
                        className="w-16"
                      />
                    </Badge>
                  )}
                  {step.responseType === "voice" && voiceProvider === "elevenlabs" && (
                    <span className="text-xs text-green-600">● ElevenLabs</span>
                  )}
                  {step.responseType === "voice" && voiceProvider === "fallback" && (
                    <span className="text-xs text-amber-700">
                      ● Fallback ({fallbackEngineLabel})
                    </span>
                  )}
                  {voiceProvider === "fallback" && useWhisper && whisperSTT.isConnected && (
                    <span className="text-xs text-green-600">● Whisper conectado</span>
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
                  <StepVoiceElevenPanel
                    provider={voiceProvider}
                    status={elevenStep.status}
                    expectedResponse={step.respuesta || ""}
                    isListening={isVoiceListening}
                    isSpeaking={isSpeaking || elevenStep.isSpeaking}
                    lastHeard={lastHeardText}
                    error={elevenStep.error}
                    inputBars={elevenStep.inputBars}
                    outputBars={elevenStep.outputBars}
                    fallbackEngineLabel={fallbackEngineLabel}
                    onManualConfirm={handleButtonConfirm}
                  />
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
                    {isSpeaking ? (
                      <>
                        <Volume2 className="h-5 w-5 mr-2 animate-pulse" />
                        <span className="mr-2">Reproduciendo</span>
                        <LiveWaveform
                          processing
                          height={24}
                          barWidth={2}
                          barGap={1}
                          barRadius={1}
                          barColor="currentColor"
                          fadeEdges={false}
                          className="w-24"
                        />
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5 mr-2" />
                        Repetir instruccion
                      </>
                    )}
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
          </StepTransition>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t bg-card px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            size="touch"
            onClick={handlePreviousStep}
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
            onClick={handleNextStep}
            disabled={isLastStep}
          >
            Siguiente
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>

      <SuccessFeedback visible={showSuccess} />
    </div>
  );
}
