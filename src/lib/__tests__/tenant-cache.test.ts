import { describe, it, expect } from "vitest";
import { extractSubdomain, getTenantFromCache, setTenantCache } from "../tenant-cache";

describe("extractSubdomain", () => {
  it("extrae subdominio de kh.sao.app", () => {
    expect(extractSubdomain("kh.sao.app")).toBe("kh");
  });

  it("retorna null para localhost", () => {
    expect(extractSubdomain("localhost")).toBeNull();
  });

  it("retorna null para www.sao.app", () => {
    expect(extractSubdomain("www.sao.app")).toBeNull();
  });

  it("retorna null para sao.app (sem subdomínio)", () => {
    expect(extractSubdomain("sao.app")).toBeNull();
  });
});

describe("tenant cache", () => {
  it("almacena e recupera tenant", () => {
    setTenantCache("kh", "uuid-kh");
    const entry = getTenantFromCache("kh");
    expect(entry?.id).toBe("uuid-kh");
    expect(entry?.slug).toBe("kh");
  });

  it("retorna null para slug não existente", () => {
    expect(getTenantFromCache("inexistente-xyz")).toBeNull();
  });
});
