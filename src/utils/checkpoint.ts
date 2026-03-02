export interface CheckpointData {
  operatorNumber: string;
  selectedProductId: string;
  currentStepIndex: number;
  appState: "operator-input" | "product-selection" | "production";
  timestamp: number;
}

const CHECKPOINT_KEY = "production-guide-checkpoint";

export const saveCheckpoint = (data: CheckpointData) => {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving checkpoint:", error);
  }
};

export const loadCheckpoint = (): CheckpointData | null => {
  try {
    const saved = localStorage.getItem(CHECKPOINT_KEY);
    if (!saved) return null;

    const data = JSON.parse(saved) as CheckpointData;

    // Check if checkpoint is less than 24 hours old
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (now - data.timestamp > maxAge) {
      clearCheckpoint();
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error loading checkpoint:", error);
    return null;
  }
};

export const clearCheckpoint = () => {
  try {
    localStorage.removeItem(CHECKPOINT_KEY);
  } catch (error) {
    console.error("Error clearing checkpoint:", error);
  }
};

export const hasValidCheckpoint = (): boolean => {
  return loadCheckpoint() !== null;
};
