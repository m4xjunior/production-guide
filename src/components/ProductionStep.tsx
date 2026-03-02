import { useState, useEffect, useCallback } from "react";
import { Step } from "@/types/Step";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import Image from "next/image";

interface ProductionStepProps {
  step: Step;
  productId: string;
  onStepCompleted: () => void;
  onManualInput: (input: string) => void;
  stepNumber: number;
  totalSteps: number;
}

export const ProductionStep: React.FC<ProductionStepProps> = ({
  step,
  productId,
  onStepCompleted,
  onManualInput,
  stepNumber,
  totalSteps,
}) => {
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isValidResponse, setIsValidResponse] = useState<boolean | null>(null);

  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const validateResponse = useCallback(
    (input: string) => {
      const normalizedInput = input.toLowerCase().trim();
      const normalizedExpected = step.respuesta.toLowerCase().trim();

      // Check if the response contains the expected keywords
      const isValid =
        normalizedInput.includes(normalizedExpected) ||
        normalizedExpected.includes(normalizedInput);

      setIsValidResponse(isValid);

      if (isValid) {
        setTimeout(() => {
          onStepCompleted();
          resetTranscript();
          setIsValidResponse(null);
        }, 1500);
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

  // Skip system steps automatically
  useEffect(() => {
    if (step.tipo === "SISTEMA") {
      const timer = setTimeout(() => {
        onStepCompleted();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step.tipo, onStepCompleted]);

  if (step.tipo === "SISTEMA") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Passo {stepNumber} de {totalSteps}
            </h2>
            <span className="inline-block bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
              SISTEMA
            </span>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-gray-700 text-lg">{step.mensaje}</p>
          </div>

          <div className="text-center">
            <div className="animate-pulse text-blue-600">
              Processando automaticamente...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Passo {stepNumber} de {totalSteps}
          </h2>
          <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
            VOZ
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Instructions */}
          <div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Instruções:</h3>
              <p className="text-gray-700">{step.mensaje}</p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">
                Resposta Esperada:
              </h3>
              <p className="text-gray-700 font-mono">
                &quot;{step.respuesta}&quot;
              </p>
            </div>

            {/* Voice Input */}
            {isSupported && (
              <div className="mb-4">
                <button
                  onClick={handleVoiceInput}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    isListening
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isListening
                    ? "🎤 Parar Gravação"
                    : "🎤 Iniciar Gravação de Voz"}
                </button>

                {transcript && (
                  <div
                    className={`mt-3 p-3 rounded-md ${
                      isValidResponse === true
                        ? "bg-green-100 border border-green-300"
                        : isValidResponse === false
                          ? "bg-red-100 border border-red-300"
                          : "bg-gray-100 border border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">Você disse:</p>
                    <p className="text-gray-700">{transcript}</p>
                    {isValidResponse === true && (
                      <p className="text-green-600 font-medium mt-2">
                        ✅ Resposta correta!
                      </p>
                    )}
                    {isValidResponse === false && (
                      <p className="text-red-600 font-medium mt-2">
                        ❌ Resposta incorreta. Tente novamente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual Input Toggle */}
            <div className="text-center">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {showManualInput ? "Ocultar" : "Ou digite manualmente"}
              </button>
            </div>

            {/* Manual Input */}
            {showManualInput && (
              <form onSubmit={handleManualSubmit} className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite sua resposta..."
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Image */}
          <div>
            {step.fotos && step.fotos !== "N/A" && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Referência Visual:
                </h3>
                <div className="relative h-96 w-full">
                  <Image
                    src={`/api/products/${productId}/images/${step.fotos}`}
                    alt={`Passo ${step.paso}`}
                    fill
                    className="object-contain rounded-lg"
                    priority
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
