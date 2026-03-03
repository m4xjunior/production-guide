"use client";

import { useState, useEffect } from "react";
import { OperatorInputAnimated } from "@/components/OperatorInputAnimated";
import { ProductSelectorAnimated } from "@/components/ProductSelectorAnimated";
import { ProductionStepImproved } from "@/components/ProductionStepImproved";
import { loadProductData, ProductData } from "@/utils/csvParser";
import { DotGridBackground } from "@/components/DotGridBackground";
import {
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
} from "@/utils/checkpoint";
import { LogsModal } from "@/components/LogsModal";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { AudioUnlockOverlay } from "@/components/devkit";

type AppState = "operator-input" | "product-selection" | "production";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("operator-input");
  const [operatorNumber, setOperatorNumber] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [productionStartTime, setProductionStartTime] = useState<number | null>(
    null,
  );
  const [showLogsModal, setShowLogsModal] = useState(false);
  // audioUnlocked: false until the user taps the AudioUnlockOverlay.
  // This ensures the audio context and mic permission are ready before voice features start.
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { unlockAudio } = useTextToSpeech();

  // Load checkpoint on mount
  useEffect(() => {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      setAppState(checkpoint.appState);
      setOperatorNumber(checkpoint.operatorNumber);
      setSelectedProductId(checkpoint.selectedProductId);
      setCurrentStepIndex(checkpoint.currentStepIndex);

      // If we have a saved production state, load the product data
      if (
        checkpoint.appState === "production" &&
        checkpoint.selectedProductId
      ) {
        setLoading(true);
        loadProductData(checkpoint.selectedProductId)
          .then((data) => {
            if (data) {
              setProductData(data);
            }
          })
          .finally(() => setLoading(false));
      }
    }
  }, []);

  // Save checkpoint whenever state changes
  useEffect(() => {
    if (appState === "production" && operatorNumber && selectedProductId) {
      saveCheckpoint({
        appState,
        operatorNumber,
        selectedProductId,
        currentStepIndex,
        timestamp: Date.now(),
      });
    }
  }, [appState, operatorNumber, selectedProductId, currentStepIndex]);

  const handleOperatorSet = (operator: string) => {
    setOperatorNumber(operator);
    setAppState("product-selection");
  };

  const handleBackToOperator = () => {
    setAppState("operator-input");
    setOperatorNumber("");
    setSelectedProductId("");
    setProductData(null);
    setCurrentStepIndex(0);
  };

  const handleBackToProducts = () => {
    // Log incomplete production if in progress
    if (
      operatorNumber &&
      selectedProductId &&
      productData &&
      currentStepIndex > 0
    ) {
      const endTime = Date.now();
      const duration = productionStartTime
        ? Math.round((endTime - productionStartTime) / 60000)
        : undefined;

      const incompleteLog = {
        id: `${operatorNumber}-${selectedProductId}-${endTime}`,
        operatorNumber,
        productId: selectedProductId,
        totalSteps: productData.steps.length,
        completedSteps: currentStepIndex,
        isComplete: false,
        startTime: productionStartTime,
        endTime,
        duration,
        timestamp: endTime,
        date: new Date(endTime).toLocaleDateString("es-ES"),
        time: new Date(endTime).toLocaleTimeString("es-ES"),
      };

      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incompleteLog),
      }).catch((error) => console.error("Error saving incomplete log:", error));
    }

    setAppState("product-selection");
    setSelectedProductId("");
    setProductData(null);
    setCurrentStepIndex(0);
    setProductionStartTime(null);
  };

  const handleRestart = () => {
    if (confirm("¿Desea reiniciar el proceso completo?")) {
      // Log incomplete production if in progress
      if (
        operatorNumber &&
        selectedProductId &&
        productData &&
        currentStepIndex > 0
      ) {
        const endTime = Date.now();
        const duration = productionStartTime
          ? Math.round((endTime - productionStartTime) / 60000)
          : undefined;

        const incompleteLog = {
          id: `${operatorNumber}-${selectedProductId}-${endTime}`,
          operatorNumber,
          productId: selectedProductId,
          totalSteps: productData.steps.length,
          completedSteps: currentStepIndex,
          isComplete: false,
          startTime: productionStartTime,
          endTime,
          duration,
          timestamp: endTime,
          date: new Date(endTime).toLocaleDateString("es-ES"),
          time: new Date(endTime).toLocaleTimeString("es-ES"),
        };

        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incompleteLog),
        }).catch((error) =>
          console.error("Error saving incomplete log:", error),
        );
      }

      clearCheckpoint();
      setAppState("operator-input");
      setOperatorNumber("");
      setSelectedProductId("");
      setProductData(null);
      setCurrentStepIndex(0);
      setProductionStartTime(null);
    }
  };

  const handleProductSelected = async (productId: string) => {
    // Unlock audio context on the first user interaction
    unlockAudio();

    setSelectedProductId(productId);
    setLoading(true);

    try {
      const data = await loadProductData(productId);
      if (data) {
        setProductData(data);
        setAppState("production");
        setCurrentStepIndex(0);

        // Log production start
        if (operatorNumber) {
          const startTime = Date.now();
          setProductionStartTime(startTime);

          // Save start log to API
          const startLog = {
            id: `${operatorNumber}-${productId}-${startTime}`,
            operatorNumber,
            productId,
            totalSteps: data.steps.length,
            completedSteps: 0,
            isComplete: false,
            startTime,
            timestamp: startTime,
            date: new Date(startTime).toLocaleDateString("es-ES"),
            time: new Date(startTime).toLocaleTimeString("es-ES"),
          };

          fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(startLog),
          }).catch((error) => console.error("Error saving start log:", error));
        }
      } else {
        alert("Erro ao carregar dados do produto");
      }
    } catch (error) {
      console.error("Error loading product:", error);
      alert("Erro ao carregar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleStepCompleted = () => {
    if (productData && currentStepIndex < productData.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Production completed - log completion and reset
      if (operatorNumber && selectedProductId && productData) {
        const endTime = Date.now();
        const duration = productionStartTime
          ? Math.round((endTime - productionStartTime) / 60000)
          : undefined;

        const completionLog = {
          id: `${operatorNumber}-${selectedProductId}-${endTime}`,
          operatorNumber,
          productId: selectedProductId,
          totalSteps: productData.steps.length,
          completedSteps: productData.steps.length,
          isComplete: true,
          startTime: productionStartTime,
          endTime,
          duration,
          timestamp: endTime,
          date: new Date(endTime).toLocaleDateString("es-ES"),
          time: new Date(endTime).toLocaleTimeString("es-ES"),
        };

        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completionLog),
        }).catch((error) =>
          console.error("Error saving completion log:", error),
        );
      }

      clearCheckpoint();
      setAppState("product-selection");
      setSelectedProductId("");
      setProductData(null);
      setCurrentStepIndex(0);
      setProductionStartTime(null);
    }
  };

  const handleManualInput = (input: string) => {
    console.log("Manual input received:", input);
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (productData && currentStepIndex < productData.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // Show the audio unlock overlay on first visit (before any app state is rendered)
  if (!audioUnlocked) {
    return (
      <AudioUnlockOverlay
        unlockAudio={unlockAudio}
        onUnlocked={() => setAudioUnlocked(true)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center relative">
        {/* Loading Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
          <DotGridBackground
            dotColor="rgba(255, 255, 255, 0.15)"
            spacing="25px"
            dotSize="2px"
            className="animate-pulse"
          />
        </div>

        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">
            Carregando produto...
          </p>
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
              style={{ animationDelay: "200ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: "400ms" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "operator-input") {
    return <OperatorInputAnimated onOperatorSet={handleOperatorSet} />;
  }

  if (appState === "product-selection") {
    return (
      <ProductSelectorAnimated
        onProductSelected={handleProductSelected}
        onBackClick={handleBackToOperator}
      />
    );
  }

  if (appState === "production" && productData) {
    const currentStep = productData.steps[currentStepIndex];

    return (
      <>
        <ProductionStepImproved
          step={currentStep}
          productId={selectedProductId}
          onStepCompleted={handleStepCompleted}
          onManualInput={handleManualInput}
          stepNumber={currentStepIndex + 1}
          totalSteps={productData.steps.length}
          operatorNumber={operatorNumber}
          onBackClick={handleBackToProducts}
          onRestart={handleRestart}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
          onShowLogs={() => setShowLogsModal(true)}
        />
        <LogsModal
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
        />
      </>
    );
  }

  return null;
}
