import { describe, it, expect } from "vitest";
import { resolveNextStep } from "@/lib/resolveNextStep";
import type { Step, StepCondition } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────

function makeStep(
  id: string,
  conditions?: StepCondition[]
): Step {
  return {
    id,
    stationId: "station-1",
    orderNum: 1,
    tipo: "VOZ",
    mensaje: `Paso ${id}`,
    voz: null,
    responseType: "voice",
    respuesta: null,
    photoUrl: null,
    vozAudioUrl: null,
    modelUrl: null,
    videoUrl: null,
    synonyms: [],
    isQc: false,
    qcFrequency: null,
    isErrorStep: false,
    errorMessage: null,
    periodEveryN: null,
    conditions,
  };
}

const stepA = makeStep("a");
const stepB = makeStep("b");
const stepC = makeStep("c");

const allSteps = [stepA, stepB, stepC];

// ─── Tests ───────────────────────────────────────────────────

describe("resolveNextStep — sin condiciones (flujo lineal)", () => {
  it("retorna el siguiente step cuando no hay condiciones", () => {
    const result = resolveNextStep(stepA, "cualquiera", allSteps);
    expect(result?.id).toBe("b");
  });

  it("retorna null para el ultimo step sin condiciones", () => {
    const result = resolveNextStep(stepC, "cualquiera", allSteps);
    expect(result).toBeNull();
  });
});

describe("resolveNextStep — con condiciones", () => {
  it("retorna nextStep correcto cuando hay match exacto", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: "si", nextStepId: "c" },
      { id: "c2", stepId: "a", matchResponse: null, nextStepId: "b" },
    ]);
    const result = resolveNextStep(stepWithCond, "si", [stepWithCond, stepB, stepC]);
    expect(result?.id).toBe("c");
  });

  it("retorna condicion default (matchResponse=null) cuando no hay match especifico", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: "si", nextStepId: "c" },
      { id: "c2", stepId: "a", matchResponse: null, nextStepId: "b" },
    ]);
    const result = resolveNextStep(stepWithCond, "otro", [stepWithCond, stepB, stepC]);
    expect(result?.id).toBe("b");
  });

  it("match especifico tiene prioridad sobre default", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: null, nextStepId: "b" },
      { id: "c2", stepId: "a", matchResponse: "si", nextStepId: "c" },
    ]);
    const result = resolveNextStep(stepWithCond, "si", [stepWithCond, stepB, stepC]);
    expect(result?.id).toBe("c");
  });

  it("nextStepId=null con condiciones retorna null (fin del flujo)", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: "fin", nextStepId: null },
    ]);
    const result = resolveNextStep(stepWithCond, "fin", [stepWithCond, stepB, stepC]);
    expect(result).toBeNull();
  });

  it("match es case-insensitive", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: "SI", nextStepId: "c" },
    ]);
    const result = resolveNextStep(stepWithCond, "si", [stepWithCond, stepB, stepC]);
    expect(result?.id).toBe("c");
  });

  it("match es case-insensitive (respuesta en mayusculas, condicion en minusculas)", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: "ok", nextStepId: "c" },
    ]);
    const result = resolveNextStep(stepWithCond, "OK", [stepWithCond, stepB, stepC]);
    expect(result?.id).toBe("c");
  });

  it("retorna null cuando conditions es array vacio y es el ultimo step", () => {
    const stepWithEmpty = makeStep("c", []);
    const result = resolveNextStep(stepWithEmpty, "algo", [stepA, stepB, stepWithEmpty]);
    expect(result).toBeNull();
  });

  it("con conditions vacio sigue comportamiento lineal", () => {
    const stepWithEmpty = makeStep("a", []);
    const result = resolveNextStep(stepWithEmpty, "algo", [stepWithEmpty, stepB, stepC]);
    expect(result?.id).toBe("b");
  });

  it("nextStepId apunta a un step que no existe en allSteps retorna null", () => {
    const stepWithCond = makeStep("a", [
      { id: "c1", stepId: "a", matchResponse: null, nextStepId: "inexistente" },
    ]);
    const result = resolveNextStep(stepWithCond, "algo", [stepWithCond, stepB, stepC]);
    expect(result).toBeNull();
  });
});
