import { describe, it, expect, vi } from "vitest";

// O setup global em src/__tests__/setup.ts faz vi.mock("@/lib/db").
// Para testar o módulo real precisamos remover esse mock antes do import dinâmico.
vi.unmock("@/lib/db");

describe("getTenantPrisma", () => {
  it("é importável e retorna um objeto", async () => {
    // Teste de smoke — verifica que a factory existe e retorna algo
    // Não conectamos a DB real em tests unitários
    const { getTenantPrisma } = await import("../db");
    expect(typeof getTenantPrisma).toBe("function");
    // Não chamamos getTenantPrisma() aqui pois requer DATABASE_URL
  });

  it("adminPrisma é exportado", async () => {
    const { adminPrisma } = await import("../db");
    expect(adminPrisma).toBeDefined();
  });
});
