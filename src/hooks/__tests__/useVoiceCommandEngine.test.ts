// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockCommands = [
  { id: "1", scope: "global", action: "confirm", phrases: ["pin bueno", "ok"], isEnabled: true },
  { id: "2", scope: "global", action: "logout", phrases: ["salir"], isEnabled: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ commands: mockCommands }),
  }) as unknown as typeof fetch;
});

import { useVoiceCommandEngine } from "../useVoiceCommandEngine";

describe("useVoiceCommandEngine", () => {
  it("dispara onConfirm cuando transcript coincide con frase de paso", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useVoiceCommandEngine({ stepPhrases: ["pin bueno"], callbacks: { onConfirm } })
    );
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    act(() => { result.current.processTranscript("Pin Bueno"); });
    expect(onConfirm).toHaveBeenCalledWith("Pin Bueno");
  });

  it("normaliza acentos y mayusculas", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useVoiceCommandEngine({ stepPhrases: ["revision ok"], callbacks: { onConfirm } })
    );
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    act(() => { result.current.processTranscript("Revision OK"); });
    expect(onConfirm).toHaveBeenCalled();
  });

  it("dispara onLogout con comando global", async () => {
    const onLogout = vi.fn();
    const { result } = renderHook(() =>
      useVoiceCommandEngine({ callbacks: { onLogout } })
    );
    await vi.waitFor(() => {
      expect(result.current.applicableCommands.length).toBeGreaterThan(0);
    });
    act(() => { result.current.processTranscript("salir"); });
    expect(onLogout).toHaveBeenCalled();
  });
});
