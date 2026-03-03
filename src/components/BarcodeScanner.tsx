"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanBarcode, Check, X, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  expectedCode: string | null;
  onScanComplete: (scannedCode: string) => void;
  stepId: string;
}

export function BarcodeScanner({ expectedCode, onScanComplete, stepId }: BarcodeScannerProps) {
  const [scannedValue, setScannedValue] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeystrokeTime = useRef<number>(0);
  const bufferRef = useRef<string>("");

  // Auto-focus on mount and when stepId changes
  useEffect(() => {
    setScannedValue("");
    setStatus("idle");
    setErrorMessage("");
    bufferRef.current = "";
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [stepId]);

  const validateBarcode = useCallback(async (code: string) => {
    setStatus("validating");
    try {
      const res = await fetch("/api/validate/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannedCode: code, stepId }),
      });

      const data = await res.json();
      if (res.ok && data.match) {
        setStatus("success");
        setTimeout(() => {
          onScanComplete(code);
        }, 500);
      } else {
        setStatus("error");
        setErrorMessage(data.expected ? `Esperado: ${data.expected}` : "Codigo no valido. Escanea de nuevo.");
        setTimeout(() => {
          setScannedValue("");
          setStatus("idle");
          setErrorMessage("");
          inputRef.current?.focus();
        }, 2000);
      }
    } catch {
      // If no validation endpoint, do client-side check
      if (!expectedCode || code.trim().toLowerCase() === expectedCode.trim().toLowerCase()) {
        setStatus("success");
        setTimeout(() => {
          onScanComplete(code);
        }, 500);
      } else {
        setStatus("error");
        setErrorMessage(`Esperado: ${expectedCode}`);
        setTimeout(() => {
          setScannedValue("");
          setStatus("idle");
          setErrorMessage("");
          inputRef.current?.focus();
        }, 2000);
      }
    }
  }, [expectedCode, onScanComplete, stepId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeystrokeTime.current;
    lastKeystrokeTime.current = now;

    if (e.key === "Enter") {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value.length > 0) {
        validateBarcode(value);
      }
      bufferRef.current = "";
      return;
    }

    // Hardware scanners type rapidly (< 50ms between keystrokes)
    if (timeSinceLastKey > 100) {
      bufferRef.current = "";
    }
    if (e.key.length === 1) {
      bufferRef.current += e.key;
    }
  }, [validateBarcode]);

  const handleManualSubmit = useCallback(() => {
    if (scannedValue.trim().length > 0) {
      validateBarcode(scannedValue.trim());
    }
  }, [scannedValue, validateBarcode]);

  const statusBorder =
    status === "success" ? "border-success ring-2 ring-success/30" :
    status === "error" ? "border-destructive ring-2 ring-destructive/30" :
    status === "validating" ? "border-warning ring-2 ring-warning/30" :
    "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScanBarcode className="h-5 w-5 text-primary" />
        <Label className="text-lg font-semibold">Escanear codigo de barras</Label>
      </div>

      {expectedCode && (
        <Badge variant="outline" className="text-sm">
          Codigo esperado: {expectedCode}
        </Badge>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={scannedValue}
            onChange={(e) => setScannedValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escanea o escribe el codigo..."
            className={`h-14 text-xl font-mono ${statusBorder}`}
            disabled={status === "validating" || status === "success"}
            autoComplete="off"
            autoFocus
          />
          {status === "validating" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-warning" />
            </div>
          )}
          {status === "success" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check className="h-5 w-5 text-success" />
            </div>
          )}
          {status === "error" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-5 w-5 text-destructive" />
            </div>
          )}
        </div>
        <Button
          size="touch"
          onClick={handleManualSubmit}
          disabled={scannedValue.trim().length === 0 || status === "validating" || status === "success"}
        >
          Validar
        </Button>
      </div>

      {errorMessage && (
        <p className="text-destructive text-base font-medium">{errorMessage}</p>
      )}

      {status === "idle" && (
        <p className="text-muted-foreground text-sm">
          Apunta el lector al codigo de barras o introduce el codigo manualmente.
        </p>
      )}
    </div>
  );
}
