"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-zinc-800 border border-zinc-700 p-4 shadow-xl flex items-center gap-3">
      <Download className="h-5 w-5 text-red-400 shrink-0" />
      <p className="text-sm text-zinc-200 flex-1">
        Instala SAO para acceso rápido y funcionamiento offline
      </p>
      <button
        onClick={async () => {
          await prompt.prompt();
          setPrompt(null);
        }}
        className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
      >
        Instalar
      </button>
      <button
        onClick={() => {
          localStorage.setItem("pwa-dismissed", "1");
          setDismissed(true);
        }}
        className="text-zinc-500 hover:text-zinc-300"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
