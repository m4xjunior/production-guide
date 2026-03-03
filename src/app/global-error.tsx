"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Ha ocurrido un error</h2>
          <p style={{ color: "#666", margin: "1rem 0" }}>
            El equipo ha sido notificado. Por favor, intenta de nuevo.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              background: "#f5f5f5",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
