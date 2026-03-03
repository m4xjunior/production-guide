"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center">
      <div className="text-center space-y-4 px-4">
        <div className="text-6xl">📡</div>
        <h1 className="text-2xl font-bold text-white">Sin conexión</h1>
        <p className="text-zinc-400 max-w-sm mx-auto">
          No hay conexión a internet. Los pasos de la estación activa pueden seguir
          disponibles si los cargaste antes.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-800 px-6 py-3 text-white font-medium hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
