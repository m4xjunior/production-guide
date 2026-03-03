export interface Operator {
  id: string;
  sageCode: string;
  name: string;
  isActive: boolean;
}

export interface Reference {
  id: string;
  sageCode: string;
  name: string;
}

export interface Station {
  id: string;
  name: string;
  description: string | null;
  productCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { steps: number };
  references?: Reference[];
}

export interface Step {
  id: string;
  stationId: string;
  orderNum: number;
  tipo: 'VOZ' | 'SISTEMA' | 'QC';
  mensaje: string;
  voz: string | null;
  responseType: 'voice' | 'scan' | 'button' | 'auto';
  respuesta: string | null;
  photoUrl: string | null;
  vozAudioUrl: string | null;
  modelUrl: string | null;
  isQc: boolean;
  qcFrequency: number | null;
}

export interface OperatorSession {
  id: string;
  operatorNumber: string;
  stationId: string;
  referenceId: string | null;
  loginAt: string;
  logoutAt: string | null;
  completedUnits: number;
  isActive: boolean;
  station?: Station;
  reference?: Reference | null;
}

export interface StepLog {
  id: string;
  sessionId: string;
  stepId: string;
  completedAt: string;
  responseReceived: string | null;
  durationMs: number | null;
  wasSkipped: boolean;
}

export interface PresenceReport {
  operatorNumber: string;
  loginAt: string;
  logoutAt: string | null;
  stationName: string;
  durationMinutes: number | null;
}

export interface ProductionReport {
  operatorNumber: string;
  stationName: string;
  completedUnits: number;
  date: string;
}
