'use client'

import { useState, useEffect, useCallback } from "react";
import { Step } from "@/types/Step";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useContinuousSpeechRecognition } from "@/hooks/useContinuousSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import Image from "next/image";
import { DotGridBackground } from "./DotGridBackground";
import { Header } from "./Header";

interface ProductionStepImprovedProps {
  step: Step;
  productId: string;
  onStepCompleted: () => void;
  onManualInput: (input: string) => void;
  stepNumber: number;
  totalSteps: number;
  operatorNumber?: string;
  onBackClick?: () => void;
  onRestart?: () => void;
  onPreviousStep?: () => void;
  onNextStep?: () => void;
  onShowLogs?: () => void;
}

export const ProductionStepImproved: React.FC<ProductionStepImprovedProps> = ({
  step,
  productId,
  onStepCompleted,
  onManualInput,
  stepNumber,
  totalSteps,
  operatorNumber,
  onBackClick,
  onRestart,
  onPreviousStep,
  onNextStep,
  onShowLogs,
}) => {
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isValidResponse, setIsValidResponse] = useState<boolean | null>(null);
  const [useContinuousMode, setUseContinuousMode] = useState(false);
  const [hasSpokenInitialVoz, setHasSpokenInitialVoz] = useState(false);

  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const {
    speak,
    stop: stopSpeech,
    isSpeaking,
    isSupported: isTTSSupported,
  } = useTextToSpeech();

  const handleStepMatch = useCallback(() => {
    setIsValidResponse(true);
    setTimeout(() => {
      onStepCompleted();
      setIsValidResponse(null);
    }, 1500);
  }, [onStepCompleted]);

  const {
    isListening: isContinuousListening,
    lastHeard,
    startContinuousListening,
    stopContinuousListening,
    isSupported: isContinuousSupported,
  } = useContinuousSpeechRecognition(
    step.respuesta,
    handleStepMatch,
    isSpeaking,
  );

  const validateResponse = useCallback(
    (input: string) => {
      const normalizedInput = input.toLowerCase().trim();
      const normalizedExpected = step.respuesta.toLowerCase().trim();

      console.log("Manual validation:", {
        input: normalizedInput,
        expected: normalizedExpected,
      });

      // More flexible matching - same logic as continuous listening
      const isValid =
        normalizedInput.includes(normalizedExpected) ||
        normalizedExpected.includes(normalizedInput) ||
        // Check for "pin bueno" variations
        (normalizedExpected.includes("pin bueno") &&
          (normalizedInput.includes("pin bueno") ||
            normalizedInput.includes("pinbueno") ||
            normalizedInput.includes("pin buen") ||
            normalizedInput.includes("bueno") ||
            normalizedInput.includes("buen"))) ||
        // Check for other common patterns
        (normalizedInput.length >= 3 &&
          normalizedExpected.length >= 3 &&
          (normalizedInput.includes(
            normalizedExpected.substring(
              0,
              Math.max(3, normalizedExpected.length - 2),
            ),
          ) ||
            normalizedExpected.includes(
              normalizedInput.substring(
                0,
                Math.max(3, normalizedInput.length - 2),
              ),
            )));

      setIsValidResponse(isValid);

      if (isValid) {
        console.log("Manual validation successful! Advancing step.");
        setTimeout(() => {
          onStepCompleted();
          resetTranscript();
          setIsValidResponse(null);
        }, 1500);
      } else {
        console.log("Manual validation failed.");
      }
    },
    [step.respuesta, onStepCompleted, resetTranscript],
  );

  useEffect(() => {
    if (transcript) {
      validateResponse(transcript);
    }
  }, [transcript, validateResponse]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onManualInput(manualInput.trim());
      validateResponse(manualInput.trim());
      setManualInput("");
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setIsValidResponse(null);
      startListening();
    }
  };

  useEffect(() => {
    if (step.tipo === "SISTEMA") {
      const timer = setTimeout(() => {
        onStepCompleted();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step.tipo, onStepCompleted]);

  // Reset the spoken flag only when the step number changes.
  useEffect(() => {
    setHasSpokenInitialVoz(false);
  }, [step.paso]);

  // Auto-speak the "voz" column when the component is ready, but only once per step.
  useEffect(() => {
    if (
      !hasSpokenInitialVoz &&
      step.tipo === "VOZ" &&
      step.voz &&
      step.voz !== "N/A" &&
      isTTSSupported
    ) {
      const timer = setTimeout(() => {
        speak(step.voz);
        setHasSpokenInitialVoz(true); // Mark as spoken for this step
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step.tipo, step.voz, isTTSSupported, hasSpokenInitialVoz, speak]);

  // Stop continuous listening when component unmounts or step changes
  useEffect(() => {
    return () => {
      stopContinuousListening();
      stopSpeech();
    };
  }, [stopContinuousListening, stopSpeech]);

  // Pause continuous listening during TTS speaking
  useEffect(() => {
    if (isSpeaking && useContinuousMode) {
      console.log("TTS started, temporarily pausing continuous listening");
      stopContinuousListening();
    } else if (!isSpeaking && useContinuousMode) {
      console.log("TTS ended, restarting continuous listening");
      // Small delay to ensure TTS has completely finished
      const timer = setTimeout(() => {
        if (useContinuousMode && !isSpeaking) {
          startContinuousListening();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    isSpeaking,
    useContinuousMode,
    startContinuousListening,
    stopContinuousListening,
  ]);

  // Auto-start continuous listening when component mounts (for VOZ steps only)
  useEffect(() => {
    if (step.tipo === "VOZ" && isContinuousSupported) {
      console.log("Auto-starting continuous listening for VOZ step");
      // Delay to ensure TTS finishes first and component is fully mounted
      const timer = setTimeout(() => {
        if (!useContinuousMode && !isSpeaking) {
          setUseContinuousMode(true);
          startContinuousListening();
        }
      }, 2000); // 2 second delay to let TTS finish

      return () => clearTimeout(timer);
    }
  }, [
    step.tipo,
    step.paso,
    isContinuousSupported,
    startContinuousListening,
    useContinuousMode,
    isSpeaking,
  ]);

  const toggleContinuousMode = () => {
    if (useContinuousMode) {
      stopContinuousListening();
      setUseContinuousMode(false);
    } else {
      startContinuousListening();
      setUseContinuousMode(true);
    }
  };

  if (step.tipo === "SISTEMA") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 relative">
        {/* Background Pattern */}
        <DotGridBackground
          dotColor="rgba(255, 255, 255, 0.08)"
          spacing="25px"
          dotSize="2px"
        />

        {/* Header */}
        <Header
          title="Proceso del Sistema"
          subtitle={`Paso ${stepNumber} de ${totalSteps} - Automático`}
          showBackButton={!!onBackClick}
          onBackClick={onBackClick}
          showOperatorInfo={!!operatorNumber}
          operatorNumber={operatorNumber}
          productId={productId}
          currentStep={stepNumber}
          totalSteps={totalSteps}
          onRestart={onRestart}
          onShowLogs={onShowLogs}
        />

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <div className="max-w-4xl w-full bg-black/20 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/10">
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-l-4 border-yellow-500 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-yellow-300 mb-2">
                    Proceso del Sistema
                  </h3>
                  <p className="text-gray-200 text-lg leading-relaxed">
                    {step.mensaje}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center space-x-3 text-yellow-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                <span className="text-lg font-medium">
                  Procesando automáticamente...
                </span>
              </div>
              <div className="mt-4 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                  style={{ animationDelay: "200ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                  style={{ animationDelay: "400ms" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 relative flex flex-col">
      {/* Background Pattern */}
      <DotGridBackground
        dotColor="rgba(255, 255, 255, 0.08)"
        spacing="25px"
        dotSize="2px"
      />

      {/* Header */}
      <Header
        title="Control de Producción"
        subtitle={`Paso ${stepNumber} de ${totalSteps} - Control de Voz`}
        showBackButton={!!onBackClick}
        onBackClick={onBackClick}
        showOperatorInfo={!!operatorNumber}
        operatorNumber={operatorNumber}
        productId={productId}
        currentStep={stepNumber}
        totalSteps={totalSteps}
        onRestart={onRestart}
        onShowLogs={onShowLogs}
      />

      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 grid lg:grid-cols-3 gap-6 min-h-0">
          {/* Instructions Panel - Taking 2 columns */}
          <div className="lg:col-span-2 flex flex-col space-y-4 min-h-0">
            {/* Instructions Card */}
            <div className="bg-black/20 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/10 flex-1 min-h-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-red-300">
                  INSTRUCCIONES
                </h3>
              </div>
              <div className="bg-red-500/10 rounded-lg p-6 border border-red-500/20 flex-1 overflow-y-auto">
                <p
                  className="text-white leading-relaxed font-bold break-words"
                  style={{ fontSize: "36px" }}
                >
                  {step.mensaje}
                </p>
              </div>
            </div>

            {/* TTS and Expected Response Card */}
            <div className="bg-black/20 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-green-300">
                    Respuesta Esperada
                  </h3>
                </div>
                {isTTSSupported &&
                  step.tipo === "VOZ" &&
                  step.voz &&
                  step.voz !== "N/A" && (
                    <button
                      onClick={() => speak(step.voz)}
                      disabled={isSpeaking}
                      aria-label="Repetir instrucciones de voz"
                      className="group relative px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="text-lg">
                          {isSpeaking ? "🔊" : "🎵"}
                        </span>
                        <span>Repetir TTS</span>
                      </span>
                    </button>
                  )}
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20 mb-3">
                <p className="text-green-200 font-mono text-lg text-center">
                  &quot;{step.respuesta}&quot;
                </p>
              </div>
              {step.tipo === "VOZ" && step.voz && step.voz !== "N/A" && (
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                  <p className="text-purple-200 text-sm">
                    🎙️ IA dice: &quot;{step.voz}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Voice Controls */}
            {(isContinuousSupported || isSupported) && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/10">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Continuous Listening Button */}
                  <button
                    onClick={toggleContinuousMode}
                    aria-label={useContinuousMode ? "Parar Escucha Continua" : "Iniciar Escucha Continua"}
                    className={`group relative h-16 rounded-xl font-semibold text-lg overflow-hidden transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 ${
                      useContinuousMode
                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white focus:ring-green-300"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white focus:ring-blue-300 hover:from-blue-700 hover:to-blue-800"
                    }`}
                  >
                    {/* Glare Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    </div>

                    <span className="relative z-10 flex items-center justify-center space-x-3">
                      <span className="text-3xl">
                        {useContinuousMode ? "🔴" : "🟢"}
                      </span>
                      <span>
                        {useContinuousMode
                          ? "Parar Escucha"
                          : "Escucha Continua"}
                      </span>
                    </span>
                  </button>

                  {/* Manual Listening Button */}
                  <button
                    onClick={handleVoiceInput}
                    aria-label={isListening ? "Parar Grabación Manual" : "Iniciar Escucha Manual"}
                    className={`group relative h-16 rounded-xl font-semibold text-lg overflow-hidden transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 ${
                      isListening
                        ? "bg-gradient-to-r from-red-700 to-red-800 text-white focus:ring-red-300"
                        : "bg-gradient-to-r from-red-600 to-red-700 text-white focus:ring-red-300 hover:from-red-700 hover:to-red-800"
                    }`}
                  >
                    {/* Glare Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    </div>

                    <span className="relative z-10 flex items-center justify-center space-x-3">
                      <span className="text-3xl">🎤</span>
                      <span>
                        {isListening ? "Parar Grabación" : "Escucha Manual"}
                      </span>
                    </span>
                  </button>
                </div>

                {/* Status Display */}
                {(transcript || lastHeard || isContinuousListening) && (
                  <div className="space-y-3">
                    {isContinuousListening && (
                      <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4">
                        <p className="text-green-300 font-medium text-lg flex items-center space-x-2">
                          <span>🟢</span>
                          <span>Escuchando continuamente...</span>
                        </p>
                        {lastHeard && (
                          <p className="text-white mt-2">
                            Último escuchado: &quot;{lastHeard}&quot;
                          </p>
                        )}
                      </div>
                    )}
                    {transcript && (
                      <div
                        className={`rounded-lg p-4 transition-all duration-300 ${
                          isValidResponse === true
                            ? "bg-green-500/20 border border-green-500/40"
                            : isValidResponse === false
                              ? "bg-red-500/20 border border-red-500/40"
                              : "bg-gray-500/20 border border-gray-500/40"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              isValidResponse === true
                                ? "bg-green-500"
                                : isValidResponse === false
                                  ? "bg-red-500"
                                  : "bg-gray-500"
                            }`}
                          >
                            {isValidResponse === true
                              ? "✓"
                              : isValidResponse === false
                                ? "✗"
                                : "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-300 mb-1">
                              Escucha manual:
                            </p>
                            <p className="text-white text-lg">
                              &quot;{transcript}&quot;
                            </p>
                            {isValidResponse === true && (
                              <p className="text-green-400 font-medium mt-2 flex items-center space-x-2">
                                <span>✅</span>
                                <span>¡Respuesta correcta! Avanzando...</span>
                              </p>
                            )}
                            {isValidResponse === false && (
                              <p className="text-red-400 font-medium mt-2 flex items-center space-x-2">
                                <span>❌</span>
                                <span>
                                  Respuesta incorreta. Intente nuevamente.
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual Input */}
            <div className="bg-black/20 backdrop-blur-md rounded-xl shadow-lg p-3 border border-white/10">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                aria-label={showManualInput ? "Ocultar entrada manual" : "Mostrar entrada manual"}
                className="text-red-400 hover:text-red-300 text-sm underline mb-2"
              >
                {showManualInput ? "Ocultar" : "Entrada manual"}
              </button>

              {showManualInput && (
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <label htmlFor="manualInput" className="sr-only">Entrada manual</label>
                  <input
                    id="manualInput"
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-gray-400 text-sm"
                    placeholder="Digite respuesta..."
                  />
                  <button
                    type="submit"
                    aria-label="Enviar entrada manual"
                    className="w-full py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded text-sm hover:from-green-700 hover:to-green-800 transition-all"
                  >
                    Enviar
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Image Panel */}
          <div className="bg-black/20 backdrop-blur-md rounded-xl shadow-lg p-3 border border-white/10 flex flex-col min-h-0">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-purple-300">
                Referencia Visual
              </h3>
            </div>

            {step.fotos && step.fotos !== "N/A" ? (
              <div className="flex-1 flex flex-col min-h-0 h-full">
                <div className="relative flex-1 bg-gray-800/50 rounded-lg overflow-hidden mb-2">
                  <Image
                    key={step.fotos}
                    src={`/products/${productId}/${step.fotos}`}
                    alt={`Paso ${step.paso}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="text-center mb-2">
                  <span className="text-gray-400 text-xs">
                    Imagen: {step.fotos}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 mb-2">
                <svg
                  className="w-12 h-12 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm">Sin imagen</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <button
                onClick={onPreviousStep}
                disabled={stepNumber <= 1}
                aria-label="Paso anterior"
                className="flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded text-sm transition-all disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Anterior</span>
              </button>

              <div className="text-white text-xs">
                {stepNumber}/{totalSteps}
              </div>

              <button
                onClick={onNextStep}
                disabled={stepNumber >= totalSteps}
                aria-label="Próximo paso"
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded text-sm transition-all disabled:cursor-not-allowed"
              >
                <span>Próximo</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
