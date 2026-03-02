import { ProductionLog } from "@/types/ProductionLog";

const LOGS_KEY = "production-logs";

export const saveProductionLog = (log: ProductionLog): void => {
  try {
    const existingLogs = getProductionLogs();
    const updatedLogs = [log, ...existingLogs]; // Add new log at the beginning
    
    // Keep only last 1000 logs to prevent localStorage overflow
    const limitedLogs = updatedLogs.slice(0, 1000);
    
    localStorage.setItem(LOGS_KEY, JSON.stringify(limitedLogs));
    console.log("Production log saved:", log);
  } catch (error) {
    console.error("Error saving production log:", error);
  }
};

export const getProductionLogs = (): ProductionLog[] => {
  try {
    const logs = localStorage.getItem(LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error("Error loading production logs:", error);
    return [];
  }
};

export const createProductionLog = (
  operatorNumber: string,
  productId: string,
  totalSteps: number,
  completedSteps: number,
  startTime?: number
): ProductionLog => {
  const now = Date.now();
  const date = new Date(now);
  
  const log: ProductionLog = {
    id: `${operatorNumber}-${productId}-${now}`,
    timestamp: now,
    date: date.toLocaleDateString('es-ES'),
    time: date.toLocaleTimeString('es-ES'),
    operatorNumber,
    productId,
    totalSteps,
    completedSteps,
    isComplete: completedSteps >= totalSteps,
    startTime,
    endTime: now
  };

  if (startTime) {
    log.duration = Math.round((now - startTime) / 60000); // Duration in minutes
  }

  return log;
};

export const logProductionStart = (
  operatorNumber: string,
  productId: string,
  totalSteps: number
): number => {
  const startTime = Date.now();
  const log = createProductionLog(operatorNumber, productId, totalSteps, 0, startTime);
  log.endTime = undefined; // Not finished yet
  log.duration = undefined; // Not finished yet
  log.isComplete = false;
  
  // Save as incomplete log
  saveProductionLog(log);
  
  return startTime;
};

export const logProductionCompletion = (
  operatorNumber: string,
  productId: string,
  totalSteps: number,
  completedSteps: number,
  startTime?: number
): void => {
  const log = createProductionLog(operatorNumber, productId, totalSteps, completedSteps, startTime);
  saveProductionLog(log);
};

export const exportLogsAsCSV = (): string => {
  const logs = getProductionLogs();
  const headers = [
    "ID",
    "Fecha",
    "Hora",
    "Operario",
    "Producto",
    "Pasos Totales",
    "Pasos Completados",
    "Completo",
    "Duración (min)"
  ];
  
  const csvContent = [
    headers.join(","),
    ...logs.map(log => [
      log.id,
      log.date,
      log.time,
      log.operatorNumber,
      log.productId,
      log.totalSteps,
      log.completedSteps,
      log.isComplete ? "SI" : "NO",
      log.duration || "N/A"
    ].join(","))
  ].join("\n");
  
  return csvContent;
};

export const downloadLogsCSV = (): void => {
  const csvContent = exportLogsAsCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `production-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};