"use client";

import { useState, useEffect } from "react";
import { StarBorderButton } from "./StarBorderButton";
import { ProductionLog } from "@/types/ProductionLog";
import { useTransition, animated } from "react-spring";

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "complete" | "incomplete"
  >("all");

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const logsData = await response.json();
        setLogs(logsData);
      } else {
        console.error("Failed to load logs");
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    const csvContent = exportLogsAsCSV();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `production-logs-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportLogsAsCSV = (): string => {
    const headers = [
      "ID",
      "Fecha",
      "Hora",
      "Operario",
      "Producto",
      "Pasos Totales",
      "Pasos Completados",
      "Completo",
      "Duración (min)",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.id,
          log.date,
          log.time,
          log.operatorNumber,
          log.productId,
          log.totalSteps,
          log.completedSteps,
          log.isComplete ? "SI" : "NO",
          log.duration || "N/A",
        ].join(","),
      ),
    ].join("\n");

    return csvContent;
  };

  const clearAllLogs = async () => {
    if (
      confirm(
        "¿Está seguro de que desea eliminar todos los logs? Esta acción no se puede deshacer.",
      )
    ) {
      try {
        const response = await fetch("/api/logs", { method: "DELETE" });
        if (response.ok) {
          setLogs([]);
        }
      } catch (error) {
        console.error("Error clearing logs:", error);
      }
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.operatorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "complete" && log.isComplete) ||
      (filterStatus === "incomplete" && !log.isComplete);

    return matchesSearch && matchesFilter;
  });

  const transitions = useTransition(filteredLogs, {
    from: { opacity: 0, transform: "translate3d(0,-40px,0)" },
    enter: { opacity: 1, transform: "translate3d(0,0px,0)" },
    leave: { opacity: 0, transform: "translate3d(0,-40px,0)" },
    keys: (log) => log.id,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m-6-4h6m-7 4h.01M5 16h.01M5 20h.01M9 20h.01M13 20h.01M17 20h.01M21 20h.01M21 16h.01M21 12h.01M21 8h.01M21 4h.01M17 4h.01M13 4h.01M9 4h.01M5 4h.01M5 8h.01M5 12h.01"
                  />
                </svg>
              </div>
              <span>Logs de Producción</span>
              <span className="text-sm bg-blue-500/20 px-2 py-1 rounded-full text-blue-300">
                {filteredLogs.length} registros
              </span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por operario, producto o ID..."
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as "all" | "complete" | "incomplete",
                )
              }
              className="px-4 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="all">Todos</option>
              <option value="complete">Completos</option>
              <option value="incomplete">Incompletos</option>
            </select>

            <StarBorderButton
              variant="primary"
              onClick={downloadLogs}
              disabled={logs.length === 0}
              className="flex items-center space-x-2"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Descargar CSV</span>
            </StarBorderButton>

            <StarBorderButton
              variant="danger"
              onClick={clearAllLogs}
              disabled={logs.length === 0}
            >
              Limpiar Todo
            </StarBorderButton>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-white">Cargando logs...</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m-6-4h6m-7 4h.01M5 16h.01M5 20h.01M9 20h.01M13 20h.01M17 20h.01M21 20h.01M21 16h.01M21 12h.01M21 8h.01M21 4h.01M17 4h.01M13 4h.01M9 4h.01M5 4h.01M5 8h.01M5 12h.01"
                  />
                </svg>
                <p className="text-lg">No hay logs disponibles</p>
                <p className="text-sm">
                  Complete algunas producciones para ver los registros aquí
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4">Fecha/Hora</th>
                    <th className="text-left py-3 px-4">Operario</th>
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-center py-3 px-4">Progreso</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-center py-3 px-4">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {transitions((style, log, t, index) => (
                    <animated.tr
                      style={style}
                      key={log.id}
                      className={`border-b border-white/10 hover:bg-white/5 ${index % 2 === 0 ? "bg-white/5" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{log.date}</div>
                          <div className="text-sm text-gray-400">
                            {log.time}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {log.operatorNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {log.productId}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span>
                            {log.completedSteps}/{log.totalSteps}
                          </span>
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${log.isComplete ? "bg-green-500" : "bg-yellow-500"}`}
                              style={{
                                width: `${(log.completedSteps / log.totalSteps) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                            log.isComplete
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {log.isComplete ? "COMPLETO" : "INCOMPLETO"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {log.duration ? `${log.duration} min` : "N/A"}
                      </td>
                    </animated.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};