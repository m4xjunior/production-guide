"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Delete, LogIn, Settings2 } from "lucide-react";
import Link from "next/link";

interface OperatorLoginProps {
  onLogin: (operatorNumber: string) => void;
}

export function OperatorLogin({ onLogin }: OperatorLoginProps) {
  const [operatorNumber, setOperatorNumber] = useState("");
  const [error, setError] = useState("");

  const handleNumpadPress = useCallback((digit: string) => {
    setError("");
    if (operatorNumber.length < 4) {
      setOperatorNumber((prev) => prev + digit);
    }
  }, [operatorNumber.length]);

  const handleDelete = useCallback(() => {
    setOperatorNumber((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  const handleClear = useCallback(() => {
    setOperatorNumber("");
    setError("");
  }, []);

  const handleSubmit = useCallback(() => {
    if (operatorNumber.length !== 4) {
      setError("El numero de operario debe tener 4 digitos");
      return;
    }
    onLogin(operatorNumber);
  }, [operatorNumber, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2">
            <img
              src="/logo-kh.png"
              alt="Logo"
              className="h-16 w-auto mx-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            SAO - Sistema de Ayuda al Operario
          </CardTitle>
          <CardDescription className="text-base">
            Introduce tu numero de operario para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display */}
          <div className="relative">
            <Input
              value={operatorNumber}
              readOnly
              placeholder="_ _ _ _"
              className="text-center text-4xl font-mono tracking-[0.5em] h-16 bg-muted/50"
            />
            {operatorNumber.length > 0 && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Borrar todo"
              >
                <Delete className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center font-medium">
              {error}
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                size="touch"
                className="text-2xl font-bold aspect-square"
                onClick={() => handleNumpadPress(String(digit))}
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              size="touch"
              className="text-lg"
              onClick={handleDelete}
            >
              <Delete className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              size="touch"
              className="text-2xl font-bold aspect-square"
              onClick={() => handleNumpadPress("0")}
            >
              0
            </Button>
            <Button
              variant="default"
              size="touch"
              className="text-lg font-bold"
              onClick={handleSubmit}
              disabled={operatorNumber.length !== 4}
            >
              <LogIn className="h-6 w-6" />
            </Button>
          </div>

          {/* Login button */}
          <Button
            onClick={handleSubmit}
            disabled={operatorNumber.length !== 4}
            size="xl"
            className="w-full text-lg font-semibold"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Entrar
          </Button>
        </CardContent>
      </Card>

      <Link
        href="/admin"
        className="fixed bottom-4 right-4 p-2 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
        title="Panel de administracion"
      >
        <Settings2 className="h-5 w-5" />
      </Link>
    </div>
  );
}
