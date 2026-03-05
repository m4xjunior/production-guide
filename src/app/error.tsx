"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Algo salio mal
        </h2>
        <p className="text-muted-foreground">
          Ha ocurrido un error inesperado. Puedes intentar recargar la pagina.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
