"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { resolveNextStep } from "@/lib/resolveNextStep";

export type ExtendedStep = Step & {
  videoUrl?: string | null;
  synonyms?: string[];
};
import { LiveWaveform } from "@/components/ui/live-waveform";
import { StepVoiceElevenPanel } from "@/components/StepVoiceElevenPanel";
import { StepAssemblyViewer } from "@/components/StepAssemblyViewer";
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
  Square,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";

interface ProductionStepProps {
  step: ExtendedStep;
  steps: ExtendedStep[];
  currentIndex: number;
  totalSteps: number;
  operatorNumber: string;
  sessionId: string;
  stationId?: string;
  completedUnits?: number;
  onStepCompleted: (nextStep?: ExtendedStep | null) => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onBackToStations: () => void;
  onRestart: () => void;
  onLogout: () => void;
  onStepNavigate?: (nextStep: Step) => void;
}

export function ProductionStep({
  step,
  steps,
  currentIndex,
  totalSteps,
  operatorNumber,
  sessionId,
  stationId = "",
  completedUnits = 0,
  onStepCompleted,
  onPreviousStep,
  onNextStep,
  onBackToStations,
  onRestart,
  onLogout,
  onStepNavigate,
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

  // Error step: requires manual confirmation
  const [errorConfirmed, setErrorConfirmed] = useState(false);

  // Stop station state
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [currentStopId, setCurrentStopId] = useState<string | null>(null);
  const [isRegisteringStop, setIsRegisteringStop] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const elevenLiveEnabledByEnv =
    process.env.NEXT_PUBLIC_ENABLE_ELEVENLABS_LIVE !== "false";
  const hasSpokenRef = useRef(false);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);

  const { speak, stop: stopSpeech, isSpeaking } = useTextToSpeech();

  // Periodicity check: if periodEveryN defined, skip when not the right unit
  const shouldSkipByPeriod =
    step.periodEveryN != null &&
    step.periodEveryN > 0 &&
    completedUnits % step.periodEveryN !== 0;

  const resolveAndNavigate = useCallback(
    (responseGiven: string) => {
      const nextStep = resolveNextStep(step, responseGiven, steps);
      if (onStepNavigate && nextStep) {
        onStepNavigate(nextStep);
      }
      onStepCompleted(nextStep);
    },
    [step, steps, onStepCompleted, onStepNavigate]
  );

  const handleVoiceMatch = useCallback(() => {
    logStepCompletion(step.respuesta || "voz");
    setDirection("forward");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 900);
    resolveAndNavigate(step.respuesta || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.respuesta, resolveAndNavigate]);

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

  const {
    startListening: startWhisperListening,
    stopListening: stopWhisperListening,
    isListening: isWhisperListening,
    isConnected: isWhisperConnected,
    lastHeard: lastWhisperHeard,
  } = useWhisperSTT({
    expectedResponse: step.respuesta || "",
    onMatch: () => {
      stopContinuousListening();
      handleVoiceMatch();
    },
    isTTSSpeaking: isSpeaking,
    serverUrl: whisperUrl,
    enabled: useWhisper && step.responseType === "voice",
  });

  const startWhisperListeningRef = useRef(startWhisperListening);
  const stopWhisperListeningRef = useRef(stopWhisperListening);
  const startContinuousListeningRef = useRef(startContinuousListening);
  const stopContinuousListeningRef = useRef(stopContinuousListening);

  useEffect(() => {
    startWhisperListeningRef.current = startWhisperListening;
  }, [startWhisperListening]);

  useEffect(() => {
    stopWhisperListeningRef.current = stopWhisperListening;
  }, [stopWhisperListening]);

  useEffect(() => {
    startContinuousListeningRef.current = startContinuousListening;
  }, [startContinuousListening]);

  useEffect(() => {
    stopContinuousListeningRef.current = stopContinuousListening;
  }, [stopContinuousListening]);

  const startFallbackRecognition = useCallback(() => {
    if (useWhisper) {
      void startWhisperListeningRef.current();
      return;
    }

    if (speechSupported) {
      startContinuousListeningRef.current();
    }
  }, [useWhisper, speechSupported]);

  const stopFallbackRecognition = useCallback(() => {
    stopWhisperListeningRef.current();
    stopContinuousListeningRef.current();
  }, []);

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

  const elevenStartRef = useRef(elevenStep.startListening);
  const elevenStopRef = useRef(elevenStep.stopListening);
  useEffect(() => { elevenStartRef.current = elevenStep.startListening; }, [elevenStep.startListening]);
  useEffect(() => { elevenStopRef.current = elevenStep.stopListening; }, [elevenStep.stopListening]);

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

  // Auto-skip for period steps that don't apply this unit
  useEffect(() => {
    if (shouldSkipByPeriod) {
      const timer = setTimeout(() => {
        // Skip without logging — advance automatically
        onStepCompleted(undefined);
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, shouldSkipByPeriod]);

  // Speak the step instruction
  useEffect(() => {
    hasSpokenRef.current = false;

    if (!isMuted && step.vozAudioUrl && !shouldSkipByPeriod) {
      const timer = setTimeout(() => {
        if (!hasSpokenRef.current) {
          hasSpokenRef.current = true;
          speak(step.vozAudioUrl!);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, isMuted, shouldSkipByPeriod]);

  // Start voice recognition for voice steps
  useEffect(() => {
    if (shouldSkipByPeriod || isPaused) return;
    if (step.responseType === "voice" && step.respuesta) {
      let cancelled = false;
      const timer = setTimeout(() => {
        void (async () => {
          if (!useElevenLive) {
            startFallbackRecognition();
            return;
          }

          const startedWithEleven = await elevenStartRef.current();
          if (cancelled) return;

          if (!startedWithEleven) {
            startFallbackRecognition();
          }
        })();
      }, 1000);

      return () => {
        cancelled = true;
        clearTimeout(timer);
        void elevenStopRef.current();
        stopFallbackRecognition();
      };
    }
  }, [
    step.id,
    step.responseType,
    step.respuesta,
    useElevenLive,
    startFallbackRecognition,
    stopFallbackRecognition,
    shouldSkipByPeriod,
    isPaused,
  ]);

  // Auto-advance for SISTEMA steps
  useEffect(() => {
    if (shouldSkipByPeriod || isPaused) return;
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
            resolveAndNavigate("auto");
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
  }, [step.id, shouldSkipByPeriod, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      stopFallbackRecognition();
      void elevenStopRef.current();
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [stopSpeech, stopFallbackRecognition]);

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

  // ElevenLabs fallback on provider change
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

  // Reset error confirmation when step changes
  useEffect(() => {
    setErrorConfirmed(false);
  }, [step.id]);

  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartY.current = e.touches[0].clientY;
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (swipeTouchStartY.current === null) return;
    const deltaY = swipeTouchStartY.current - e.changedTouches[0].clientY;
    swipeTouchStartY.current = null;
    // Swipe up >= 80px confirma o passo (só para pasos de botão)
    if (deltaY >= 80 && step.responseType === "button") {
      handleButtonConfirm();
    }
  };

  const handleButtonConfirm = () => {
    if (step.isErrorStep && !errorConfirmed) {
      setErrorConfirmed(true);
      return;
    }
    logStepCompletion("confirmado");
    setDirection("forward");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 900);
    resolveAndNavigate("confirmado");
  };

  const handleScanComplete = (code: string) => {
    logStepCompletion(code);
    setDirection("forward");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 900);
    resolveAndNavigate(code);
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

  // Stop station handlers
  const handleRegisterStop = async () => {
    setIsRegisteringStop(true);
    try {
      const res = await fetch("/api/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId,
          sessionId,
          reason: stopReason.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentStopId(data.stop.id);
        setIsPaused(true);
        setShowStopDialog(false);
        setStopReason("");
        // Stop voice recognition while paused
        void elevenStopRef.current();
        stopFallbackRecognition();
        stopSpeech();
        if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        setAutoAdvanceCountdown(null);
      }
    } catch (err) {
      console.error("Error registering stop:", err);
    } finally {
      setIsRegisteringStop(false);
    }
  };

  const handleResume = async () => {
    if (!currentStopId) {
      setIsPaused(false);
      return;
    }
    setIsResuming(true);
    try {
      await fetch(`/api/stops/${currentStopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setIsPaused(false);
      setCurrentStopId(null);
    } catch (err) {
      console.error("Error resuming:", err);
    } finally {
      setIsResuming(false);
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

  const fallbackEngineLabel = useWhisper ? "Whisper" : "Web Speech API";
  const isFallbackVoiceListening =
    isListening || (useWhisper && isWhisperListening);
  const isVoiceListening =
    step.responseType === "voice" &&
    (voiceProvider === "elevenlabs"
      ? elevenStep.isListening
      : isFallbackVoiceListening);
  const lastHeardText =
    voiceProvider === "elevenlabs"
      ? elevenStep.lastHeard
      : useWhisper
      ? lastWhisperHeard
      : lastHeard;

  // Suppress unused variable warning
  void isWhisperConnected;

  // ─── Paused screen ───────────────────────────────────────
  if (isPaused) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Square className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Estacion Parada</h2>
          <p className="text-muted-foreground text-lg">
            La produccion esta detenida. Resuelve el incidente y pulsa Reanudar.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-6"
          onClick={handleResume}
          disabled={isResuming}
        >
          {isResuming ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <PlayCircle className="h-5 w-5 mr-2" />
          )}
          Reanudar produccion
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-kh.png" alt="KH" className="h-8 w-auto" />
            <span className="text-sm font-bold text-foreground tracking-wide">SAO</span>
            <Separator orientation="vertical" className="h-6" />
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

      {/* Main content — swipe up para confirmar paso de botón */}
      <div
        className="flex-1 p-4 md:p-8"
        onTouchStart={handleSwipeTouchStart}
        onTouchEnd={handleSwipeTouchEnd}
      >
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
                  {step.isErrorStep && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                  {isVoiceListening && (
                    <Badge variant="default" className="voice-listening flex items-center gap-1.5">
                      <Mic className="h-3 w-3" />
                      Escuchando
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
                  {step.responseType === "voice" && isVoiceListening && (
                    <span className="text-xs text-green-600">● Reconocimiento activo</span>
                  )}
                </div>

                {/* Error step alert */}
                {step.isErrorStep && step.errorMessage && (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-destructive">
                      {step.errorMessage}
                    </p>
                  </div>
                )}

                <Card className={`border-2 ${step.isErrorStep ? "border-destructive/50" : ""}`}>
                  <CardContent className="p-6 md:p-8">
                    <p className="text-xl md:text-2xl lg:text-3xl font-semibold leading-relaxed voice-optimized">
                      {step.mensaje}
                    </p>
                  </CardContent>
                </Card>

                {/* Error step confirmation requirement */}
                {step.isErrorStep && !errorConfirmed && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">
                      Este paso requiere confirmacion manual. Asegurate de haber resuelto el problema antes de continuar.
                    </p>
                  </div>
                )}

                {/* Voice feedback */}
                {step.responseType === "voice" && (
                  <>
                    {isVoiceListening && (
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
                    {!isVoiceListening && (
                      <Button
                        variant="success"
                        size="touch"
                        className="w-full text-xl font-bold"
                        onClick={handleButtonConfirm}
                      >
                        <CheckCircle2 className="h-6 w-6 mr-2" />
                        Confirmar paso
                      </Button>
                    )}
                  </>
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
                    {step.isErrorStep && !errorConfirmed ? "Confirmar que el error fue resuelto" : "Confirmar"}
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

              {/* Right: Visual guidance */}
              <div className="flex items-start justify-center">
                <div className="w-full space-y-4">
                  {step.videoUrl ? (
                    <video
                      src={step.videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full aspect-video rounded-xl object-cover"
                    />
                  ) : step.modelUrl ? (
                    <StepAssemblyViewer
                      sourceUrl={step.modelUrl}
                      stepLabel={`Montaje 3D · Paso ${currentIndex + 1}`}
                    />
                  ) : step.photoUrl ? (
                    <div className="w-full rounded-xl overflow-hidden border border-border bg-card shadow-sm">
                      <img
                        src={step.photoUrl}
                        alt={`Referencia paso ${currentIndex + 1}`}
                        className="w-full h-auto object-contain max-h-[60vh]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/file.svg";
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </StepTransition>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border bg-card px-4 py-4">
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

          {/* Stop button — center */}
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setShowStopDialog(true)}
          >
            <Square className="h-4 w-4 mr-1.5" />
            Parar
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

      {/* Footer */}
      <div className="border-t border-border bg-card px-4 py-1.5 text-center">
        <span className="text-xs text-muted-foreground/40">KH | Know How</span>
      </div>

      <SuccessFeedback visible={showSuccess} />

      {/* Stop station dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Square className="h-5 w-5" />
              Parar estacion
            </AlertDialogTitle>
            <AlertDialogDescription>
              La produccion se detendra hasta que pulses Reanudar. Indica opcionalmente el motivo del paro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="stop-reason">Motivo del paro (opcional)</Label>
            <Textarea
              id="stop-reason"
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              placeholder="Avaria de maquina, falta de material, incidente..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleRegisterStop}
              disabled={isRegisteringStop}
            >
              {isRegisteringStop ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Registrar paro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
