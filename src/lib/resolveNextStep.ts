import type { Step, StepCondition } from "@/types";

/**
 * Resolve the next step given the current step, the response given,
 * and the full ordered list of steps.
 *
 * Logic:
 * 1. If conditions array is empty or undefined → linear navigation (next by index)
 * 2. Find condition whose matchResponse === responseGiven (case-insensitive)
 * 3. Fallback to condition with matchResponse === null (default)
 * 4. If matched condition has nextStepId === null → end of flow (return null)
 * 5. If matched condition has nextStepId → find that step in allSteps
 */
export function resolveNextStep(
  currentStep: Step,
  responseGiven: string,
  allSteps: Step[]
): Step | null {
  const conditions: StepCondition[] = currentStep.conditions ?? [];

  // No conditions (or empty array): linear navigation
  if (conditions.length === 0) {
    const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);
    if (currentIndex === -1) return null;
    return allSteps[currentIndex + 1] ?? null;
  }

  // Find specific match (case-insensitive)
  const match = conditions.find(
    (c) =>
      c.matchResponse !== null &&
      c.matchResponse.toLowerCase() === responseGiven.toLowerCase()
  );

  // Fallback to default condition (matchResponse === null)
  const defaultCond = conditions.find((c) => c.matchResponse === null);

  const resolved = match ?? defaultCond;

  if (!resolved) {
    // No condition matched and no default — fall back to linear
    const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);
    if (currentIndex === -1) return null;
    return allSteps[currentIndex + 1] ?? null;
  }

  const nextId = resolved.nextStepId;

  // Explicit null means end of flow
  if (nextId === null || nextId === undefined) {
    return null;
  }

  return allSteps.find((s) => s.id === nextId) ?? null;
}
