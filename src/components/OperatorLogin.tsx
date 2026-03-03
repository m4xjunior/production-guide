"use client";

import { useState, useCallback, useEffect } from "react";
import { Delete, LogIn, Settings2 } from "lucide-react";
import Link from "next/link";

interface OperatorLoginProps {
  onLogin: (operatorNumber: string) => void;
}

export function OperatorLogin({ onLogin }: OperatorLoginProps) {
  const [operatorNumber, setOperatorNumber] = useState("");
  const [error, setError] = useState("");
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNumpadPress = useCallback(
    (digit: string) => {
      setError("");
      setPressedKey(digit);
      setTimeout(() => setPressedKey(null), 150);
      if (operatorNumber.length < 4) {
        setOperatorNumber((prev) => prev + digit);
      }
    },
    [operatorNumber.length]
  );

  const handleDelete = useCallback(() => {
    setOperatorNumber((prev) => prev.slice(0, -1));
    setError("");
    setPressedKey("del");
    setTimeout(() => setPressedKey(null), 150);
  }, []);

  const handleSubmit = useCallback(() => {
    if (operatorNumber.length !== 4) {
      setError("El número de operario debe tener 4 dígitos");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onLogin(operatorNumber);
  }, [operatorNumber, onLogin]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleNumpadPress(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter") {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNumpadPress, handleDelete, handleSubmit]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] p-4 overflow-hidden relative">
      {/* Industrial background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.1) 2px,
            rgba(255,255,255,0.1) 3px
          )`,
        }}
      />

      {/* Subtle red ambient glow from top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.07] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)",
        }}
      />

      {/* Main terminal */}
      <div
        className={`relative w-full max-w-[420px] transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Terminal frame */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Metallic border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2A2A2E] via-[#1A1A1E] to-[#2A2A2E] p-px pointer-events-none">
            <div className="w-full h-full rounded-2xl bg-[#111113]" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-8 py-10">
            {/* Header */}
            <div className="text-center mb-10">
              {/* Logo */}
              <div className="mb-5 relative inline-block">
                <img
                  src="/logo-kh.png"
                  alt="KH Know How"
                  className="h-16 w-auto mx-auto relative z-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Logo glow */}
                <div
                  className="absolute inset-0 blur-xl opacity-30"
                  style={{
                    background:
                      "radial-gradient(circle, #8B1A1A 0%, transparent 70%)",
                  }}
                />
              </div>

              {/* Title */}
              <h1
                className="text-2xl font-bold tracking-[0.2em] text-[#E8E8E8] mb-1"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                S.A.O.
              </h1>
              <p className="text-xs tracking-[0.3em] uppercase text-[#6B6B6B]">
                Sistema de Ayuda al Operario
              </p>

              {/* Separator line */}
              <div className="mt-5 mx-auto w-16 h-px bg-gradient-to-r from-transparent via-[#8B1A1A]/50 to-transparent" />
            </div>

            {/* PIN Display */}
            <div className={`mb-8 ${shake ? "animate-shake" : ""}`}>
              <div className="flex items-center justify-center gap-5">
                {[0, 1, 2, 3].map((i) => {
                  const isFilled = i < operatorNumber.length;
                  const isNext = i === operatorNumber.length;
                  return (
                    <div key={i} className="relative">
                      {/* Dot */}
                      <div
                        className={`w-4 h-4 rounded-full transition-all duration-200 ${
                          isFilled
                            ? "bg-[#8B1A1A] scale-110"
                            : isNext
                            ? "bg-[#2A2A2E] ring-1 ring-[#8B1A1A]/30"
                            : "bg-[#1A1A1E] ring-1 ring-[#2A2A2E]"
                        }`}
                      />
                      {/* Glow effect for filled dots */}
                      {isFilled && (
                        <div className="absolute inset-0 rounded-full bg-[#8B1A1A] blur-md opacity-40" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error message */}
              {error && (
                <p className="text-xs text-[#DC2626] text-center mt-3 tracking-wide">
                  {error}
                </p>
              )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <NumpadKey
                  key={digit}
                  label={String(digit)}
                  isPressed={pressedKey === String(digit)}
                  onClick={() => handleNumpadPress(String(digit))}
                />
              ))}

              {/* Delete */}
              <button
                onClick={handleDelete}
                aria-label="Borrar dígito"
                className={`group relative h-16 rounded-xl transition-all duration-100
                  bg-[#141416] border border-[#2A2A2E]
                  hover:border-[#3A3A3E] active:translate-y-[1px]
                  ${pressedKey === "del" ? "translate-y-[1px] border-[#3A3A3E]" : ""}
                `}
                style={{
                  boxShadow: `
                    0 2px 0 0 #0A0A0C,
                    inset 0 1px 0 0 rgba(255,255,255,0.03)
                  `,
                }}
              >
                <Delete className="h-5 w-5 text-[#6B6B6B] mx-auto group-hover:text-[#A1A1AA] transition-colors" />
              </button>

              {/* Zero */}
              <NumpadKey
                label="0"
                isPressed={pressedKey === "0"}
                onClick={() => handleNumpadPress("0")}
              />

              {/* Enter shortcut on numpad */}
              <button
                onClick={handleSubmit}
                aria-label="Confirmar número de operario"
                disabled={operatorNumber.length !== 4}
                className={`group relative h-16 rounded-xl transition-all duration-100
                  ${
                    operatorNumber.length === 4
                      ? "bg-[#8B1A1A]/20 border border-[#8B1A1A]/40 hover:bg-[#8B1A1A]/30 hover:border-[#8B1A1A]/60 active:translate-y-[1px]"
                      : "bg-[#141416] border border-[#2A2A2E] opacity-30 cursor-not-allowed"
                  }
                `}
                style={{
                  boxShadow:
                    operatorNumber.length === 4
                      ? `0 2px 0 0 #0A0A0C, 0 0 20px -5px rgba(139,26,26,0.3)`
                      : `0 2px 0 0 #0A0A0C`,
                }}
              >
                <LogIn className="h-5 w-5 text-[#8B1A1A] mx-auto" />
              </button>
            </div>

            {/* Main Enter button */}
            <button
              onClick={handleSubmit}
              disabled={operatorNumber.length !== 4}
              className={`w-full h-14 rounded-xl font-semibold text-base tracking-[0.15em] uppercase
                transition-all duration-200 flex items-center justify-center gap-3
                ${
                  operatorNumber.length === 4
                    ? "bg-[#8B1A1A] text-white hover:bg-[#A52525] active:translate-y-[1px] cursor-pointer"
                    : "bg-[#1A1A1E] text-[#4A4A4E] border border-[#2A2A2E] cursor-not-allowed"
                }
              `}
              style={
                operatorNumber.length === 4
                  ? {
                      boxShadow: `
                      0 2px 0 0 #5A0E0E,
                      0 0 30px -5px rgba(139,26,26,0.4),
                      inset 0 1px 0 0 rgba(255,255,255,0.1)
                    `,
                    }
                  : undefined
              }
            >
              <LogIn className="h-5 w-5" />
              Entrar
            </button>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#2A2A2E]" />
              <span
                className="text-[10px] tracking-[0.3em] uppercase text-[#3A3A3E]"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                KH | Know How
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#2A2A2E]" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin link */}
      <Link
        href="/admin"
        className="fixed bottom-4 right-4 p-2.5 rounded-lg text-[#3A3A3E] hover:text-[#6B6B6B] hover:bg-[#1A1A1E] transition-all"
        title="Panel de administración"
      >
        <Settings2 className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ─── Numpad Key Component ─── */
function NumpadKey({
  label,
  isPressed,
  onClick,
}: {
  label: string;
  isPressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative h-16 rounded-xl transition-all duration-100
        bg-[#141416] border border-[#2A2A2E]
        hover:border-[#3A3A3E] hover:bg-[#181818]
        active:translate-y-[1px]
        ${isPressed ? "translate-y-[1px] border-[#3A3A3E] bg-[#181818]" : ""}
      `}
      style={{
        boxShadow: isPressed
          ? `0 1px 0 0 #0A0A0C, inset 0 1px 0 0 rgba(255,255,255,0.03)`
          : `0 2px 0 0 #0A0A0C, inset 0 1px 0 0 rgba(255,255,255,0.03)`,
      }}
    >
      <span
        className="text-xl font-semibold text-[#C8C8CC] group-hover:text-[#E8E8E8] transition-colors"
        style={{ fontFamily: "var(--font-geist-mono), monospace" }}
      >
        {label}
      </span>
    </button>
  );
}
