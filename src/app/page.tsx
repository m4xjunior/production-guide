"use client";

import { useState, useEffect, useCallback } from "react";
import { OperatorLogin } from "@/components/OperatorLogin";
import { StationSelector } from "@/components/StationSelector";
import { ReferenceSelector } from "@/components/ReferenceSelector";
import { ProductionStep } from "@/components/ProductionStep";
import { AudioUnlockOverlay } from "@/components/devkit";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useToast } from "@/hooks/use-toast";
import { type Step, type OperatorSession, type Reference } from "@/types";
import { Loader2 } from "lucide-react";
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

type AppState = "login" | "station-selection" | "reference-selection" | "production";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("login");
  const [operatorNumber, setOperatorNumber] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedStationName, setSelectedStationName] = useState("");
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [stationReferences, setStationReferences] = useState<Reference[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { toast } = useToast();
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const { unlockAudio, preload } = useTextToSpeech();

  const loadSteps = useCallback(async (stationId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stations/${stationId}/steps`);
      if (!res.ok) throw new Error("Error al cargar pasos");
      const data = await res.json();
      const stepsList = data.steps ?? data;
      setSteps(stepsList);

      const audioUrls = stepsList
        .map((s: Step) => s.vozAudioUrl)
        .filter(Boolean) as string[];
      if (audioUrls.length > 0) {
        preload(audioUrls);
      }

      return stepsList.length > 0;
    } catch (err) {
      console.error("Error loading steps:", err);
      return false;
    }
  }, [preload]);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const savedSession = sessionStorage.getItem("p2v_session");
    if (savedSession) {
      try {
        const data = JSON.parse(savedSession);
        if (data.operatorNumber && data.sessionId && data.stationId) {
          setOperatorNumber(data.operatorNumber);
          setOperatorName(data.operatorName || "");
          setSessionId(data.sessionId);
          setSelectedStationId(data.stationId);
          setSelectedStationName(data.stationName || "");
          setSelectedReferenceId(data.referenceId ?? null);
          setCurrentStepIndex(data.currentStepIndex || 0);
          loadSteps(data.stationId).then((hasSteps) => {
            if (hasSteps) {
              setAppState("production");
            } else {
              sessionStorage.removeItem("p2v_session");
            }
          });
        }
      } catch {
        sessionStorage.removeItem("p2v_session");
      }
    }
  }, [loadSteps]);

  // Save session state
  useEffect(() => {
    if (appState === "production" && sessionId) {
      sessionStorage.setItem("p2v_session", JSON.stringify({
        operatorNumber,
        operatorName,
        sessionId,
        stationId: selectedStationId,
        stationName: selectedStationName,
        referenceId: selectedReferenceId,
        currentStepIndex,
      }));
    }
  }, [appState, operatorNumber, operatorName, sessionId, selectedStationId, selectedStationName, selectedReferenceId, currentStepIndex]);

  const handleLogin = useCallback(async (operator: string, name: string) => {
    setOperatorNumber(operator);
    setOperatorName(name);
    setAppState("station-selection");
  }, []);

  const startProduction = useCallback(async (stationId: string, referenceId: string | null) => {
    setLoading(true);
    try {
      // Create session
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorNumber,
          stationId,
          ...(referenceId !== null && { referenceId }),
        }),
      });

      if (!sessionRes.ok) throw new Error("Error al crear sesion");
      const sessionData = await sessionRes.json();
      const session: OperatorSession = sessionData.session ?? sessionData;
      setSessionId(session.id);

      // Load steps
      const hasSteps = await loadSteps(stationId);
      if (hasSteps) {
        setCurrentStepIndex(0);
        setAppState("production");
      } else {
        toast({ variant: "destructive", title: "Sin pasos", description: "La estacion no tiene pasos configurados." });
      }
    } catch (err) {
      console.error("Error starting production:", err);
      toast({ variant: "destructive", title: "Error", description: "Error al iniciar la produccion. Verifica la conexion." });
    } finally {
      setLoading(false);
    }
  }, [operatorNumber, loadSteps]);

  const handleStationSelected = useCallback(async (stationId: string, stationName: string) => {
    // Unlock audio on first user interaction
    unlockAudio();

    setSelectedStationId(stationId);
    setSelectedStationName(stationName);
    setSelectedReferenceId(null);

    // Check if station has references linked
    setLoading(true);
    try {
      const res = await fetch(`/api/stations/${stationId}`);
      if (!res.ok) throw new Error("Error al cargar estacion");
      const data = await res.json();
      const station = data.station ?? data;
      const refs = Array.isArray(station.references) ? station.references : [];

      if (refs.length > 0) {
        // Go to reference selection — pass already-loaded refs to avoid a second fetch
        setStationReferences(refs);
        setLoading(false);
        setAppState("reference-selection");
      } else {
        // No references: go straight to production
        setLoading(false);
        await startProduction(stationId, null);
      }
    } catch (err) {
      console.error("Error checking station references:", err);
      setLoading(false);
      await startProduction(stationId, null);
    }
  }, [unlockAudio, startProduction]);

  const handleReferenceSelected = useCallback(async (referenceId: string) => {
    setSelectedReferenceId(referenceId);
    await startProduction(selectedStationId, referenceId);
  }, [selectedStationId, startProduction]);

  const handleStepCompleted = useCallback((nextStep?: Step | null) => {
    if (nextStep) {
      const nextIndex = steps.findIndex((s) => s.id === nextStep.id);
      if (nextIndex >= 0) {
        setCurrentStepIndex(nextIndex);
        return;
      }
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Todos los pasos completados — reiniciar para la seguinte unidade
      sessionStorage.removeItem("p2v_session");
      setCurrentStepIndex(0);
    }
  }, [currentStepIndex, steps]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, steps.length]);

  const handleBackToStations = useCallback(() => {
    sessionStorage.removeItem("p2v_session");
    setSteps([]);
    setCurrentStepIndex(0);
    setStationReferences([]);
    setAppState("station-selection");
  }, []);

  const handleRestart = useCallback(() => {
    setShowRestartDialog(true);
  }, []);

  const confirmRestart = useCallback(() => {
    setShowRestartDialog(false);
    setCurrentStepIndex(0);
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutDialog(false);

    // Close session
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}/logout`, {
          method: "PATCH",
        });
      } catch (err) {
        console.error("Error closing session:", err);
      }
    }

    sessionStorage.removeItem("p2v_session");
    setAppState("login");
    setOperatorNumber("");
    setOperatorName("");
    setSessionId("");
    setSelectedStationId("");
    setSelectedStationName("");
    setSelectedReferenceId(null);
    setStationReferences([]);
    setSteps([]);
    setCurrentStepIndex(0);
  }, [sessionId]);

  // Audio/mic unlock gate — required on mobile before any audio or speech recognition
  if (!audioUnlocked) {
    return (
      <AudioUnlockOverlay
        unlockAudio={unlockAudio}
        onUnlocked={() => setAudioUnlocked(true)}
      />
    );
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          <p className="text-xl text-muted-foreground font-medium">
            Cargando estacion...
          </p>
        </div>
      </div>
    );
  }

  // Login
  if (appState === "login") {
    return <OperatorLogin onLogin={handleLogin} />;
  }

  // Station selection
  if (appState === "station-selection") {
    return (
      <StationSelector
        operatorNumber={operatorNumber}
        operatorName={operatorName}
        onStationSelected={(stationId, stationName) =>
          handleStationSelected(stationId, stationName)
        }
        onBack={() => {
          setAppState("login");
          setOperatorNumber("");
          setOperatorName("");
        }}
      />
    );
  }

  // Reference selection
  if (appState === "reference-selection") {
    return (
      <ReferenceSelector
        stationId={selectedStationId}
        stationName={selectedStationName}
        operatorNumber={operatorNumber}
        operatorName={operatorName}
        references={stationReferences}
        onReferenceSelected={handleReferenceSelected}
        onBack={() => setAppState("station-selection")}
      />
    );
  }

  // Production
  if (appState === "production" && steps.length > 0) {
    const currentStep = steps[currentStepIndex];

    return (
      <>
        <ProductionStep
          step={currentStep}
          steps={steps}
          currentIndex={currentStepIndex}
          totalSteps={steps.length}
          operatorNumber={operatorNumber}
          sessionId={sessionId}
          onStepCompleted={handleStepCompleted}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
          onBackToStations={handleBackToStations}
          onRestart={handleRestart}
          onLogout={handleLogout}
        />

        {/* Restart confirmation */}
        <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reiniciar proceso</AlertDialogTitle>
              <AlertDialogDescription>
                Se volvera al primer paso de esta estacion. El progreso actual no se guardara.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRestart}>
                Reiniciar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Logout confirmation */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cerrar sesion</AlertDialogTitle>
              <AlertDialogDescription>
                Se cerrara tu sesion y se perdera el progreso actual. Tendras que volver a iniciar sesion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLogout}>
                Cerrar sesion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return null;
}
