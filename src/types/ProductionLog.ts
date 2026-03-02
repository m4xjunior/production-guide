export interface ProductionLog {
  id: string;
  timestamp: number;
  date: string; // formatted date
  time: string; // formatted time
  operatorNumber: string;
  productId: string;
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
  duration?: number; // in minutes
  startTime?: number;
  endTime?: number;
}

export interface ProductionLogSummary {
  totalProductions: number;
  completedProductions: number;
  incompleteProductions: number;
  averageDuration: number;
  productionsByOperator: Record<string, number>;
  productionsByProduct: Record<string, number>;
}
