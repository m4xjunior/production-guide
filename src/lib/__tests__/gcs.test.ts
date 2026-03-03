import { describe, it, expect } from "vitest";
import { buildGcsPath } from "../gcs";

describe("buildGcsPath", () => {
  it("constrói path com tenant e múltiplos segmentos", () => {
    expect(
      buildGcsPath("kh", "stations", "abc123", "steps", "def456", "photo.jpg")
    ).toBe("tenants/kh/stations/abc123/steps/def456/photo.jpg");
  });

  it("funciona com um único segmento", () => {
    expect(buildGcsPath("acme", "branding/logo.png")).toBe(
      "tenants/acme/branding/logo.png"
    );
  });

  it("isola tenants diferentes", () => {
    expect(buildGcsPath("kh", "arquivo.mp4")).not.toBe(
      buildGcsPath("acme", "arquivo.mp4")
    );
  });
});
