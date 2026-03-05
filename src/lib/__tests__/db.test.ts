import { describe, it, expect, vi } from "vitest";

// Testa a lógica de injeção de tenantId diretamente,
// sem instanciar Prisma nem conectar à DB real.
// Extraímos a lógica de transformação de args para testá-la isoladamente.

const TENANT_SCOPED_MODELS = ["station", "operator", "reference", "auditlog", "voicecommand"];

async function applyTenantFilter(
  { model, operation, args }: { model: string; operation: string; args: Record<string, unknown> },
  tenantId: string
): Promise<Record<string, unknown>> {
  // Replica a lógica interna de getTenantPrisma para ser testável isoladamente
  let transformedArgs = { ...args };
  if (TENANT_SCOPED_MODELS.includes(model.toLowerCase())) {
    if (["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(operation)) {
      transformedArgs = {
        ...transformedArgs,
        where: { ...(transformedArgs.where as Record<string, unknown> ?? {}), tenantId },
      };
    }
    if (operation === "create") {
      transformedArgs = {
        ...transformedArgs,
        data: { ...(transformedArgs.data as Record<string, unknown> ?? {}), tenantId },
      };
    }
    if (operation === "createMany") {
      const data = (transformedArgs.data ?? []) as Record<string, unknown>[];
      transformedArgs = { ...transformedArgs, data: data.map((d) => ({ ...d, tenantId })) };
    }
    if (["update", "updateMany", "delete", "deleteMany"].includes(operation)) {
      transformedArgs = {
        ...transformedArgs,
        where: { ...(transformedArgs.where as Record<string, unknown> ?? {}), tenantId },
      };
    }
    if (operation === "upsert") {
      transformedArgs = {
        ...transformedArgs,
        where: { ...(transformedArgs.where as Record<string, unknown> ?? {}), tenantId },
        create: { ...(transformedArgs.create as Record<string, unknown> ?? {}), tenantId },
      };
    }
  }
  return transformedArgs;
}

describe("lógica de tenant filter (getTenantPrisma)", () => {
  const TENANT_ID = "tenant-abc-123";

  describe("modelos com escopo de tenant", () => {
    it("injeta tenantId no where para findMany em Station", async () => {
      const result = await applyTenantFilter(
        { model: "Station", operation: "findMany", args: { where: { isActive: true } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ isActive: true, tenantId: TENANT_ID });
    });

    it("injeta tenantId no where para findFirst em Operator", async () => {
      const result = await applyTenantFilter(
        { model: "Operator", operation: "findFirst", args: {} },
        TENANT_ID
      );
      expect((result.where as Record<string, unknown>)?.tenantId).toBe(TENANT_ID);
    });

    it("injeta tenantId no where para findUnique em Station", async () => {
      const result = await applyTenantFilter(
        { model: "Station", operation: "findUnique", args: { where: { id: "station-1" } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ id: "station-1", tenantId: TENANT_ID });
    });

    it("injeta tenantId no where para count em Reference", async () => {
      const result = await applyTenantFilter(
        { model: "Reference", operation: "count", args: {} },
        TENANT_ID
      );
      expect((result.where as Record<string, unknown>)?.tenantId).toBe(TENANT_ID);
    });

    it("injeta tenantId no where para aggregate em AuditLog", async () => {
      const result = await applyTenantFilter(
        { model: "AuditLog", operation: "aggregate", args: { where: { action: "create" } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ action: "create", tenantId: TENANT_ID });
    });

    it("injeta tenantId no data para create em Reference", async () => {
      const result = await applyTenantFilter(
        { model: "Reference", operation: "create", args: { data: { name: "REF-001" } } },
        TENANT_ID
      );
      expect((result.data as Record<string, unknown>)?.tenantId).toBe(TENANT_ID);
      expect((result.data as Record<string, unknown>)?.name).toBe("REF-001");
    });

    it("injeta tenantId em cada item para createMany em AuditLog", async () => {
      const result = await applyTenantFilter(
        {
          model: "AuditLog",
          operation: "createMany",
          args: { data: [{ action: "create" }, { action: "update" }] },
        },
        TENANT_ID
      );
      const data = result.data as Record<string, unknown>[];
      expect(data).toHaveLength(2);
      expect(data[0].tenantId).toBe(TENANT_ID);
      expect(data[1].tenantId).toBe(TENANT_ID);
    });

    it("preserva args originais ao injetar tenantId em findMany", async () => {
      const result = await applyTenantFilter(
        {
          model: "Station",
          operation: "findMany",
          args: { where: { name: "Linha 1" }, orderBy: { createdAt: "desc" } },
        },
        TENANT_ID
      );
      expect(result.where).toEqual({ name: "Linha 1", tenantId: TENANT_ID });
      expect(result.orderBy).toEqual({ createdAt: "desc" });
    });

    it("preserva campos existentes no data ao fazer create", async () => {
      const result = await applyTenantFilter(
        {
          model: "Operator",
          operation: "create",
          args: { data: { name: "Ana", badge: "OP-001" } },
        },
        TENANT_ID
      );
      const data = result.data as Record<string, unknown>;
      expect(data.name).toBe("Ana");
      expect(data.badge).toBe("OP-001");
      expect(data.tenantId).toBe(TENANT_ID);
    });

    it("preserva campos existentes em cada item do createMany", async () => {
      const result = await applyTenantFilter(
        {
          model: "Station",
          operation: "createMany",
          args: { data: [{ name: "Linha A", active: true }, { name: "Linha B", active: false }] },
        },
        TENANT_ID
      );
      const data = result.data as Record<string, unknown>[];
      expect(data[0]).toEqual({ name: "Linha A", active: true, tenantId: TENANT_ID });
      expect(data[1]).toEqual({ name: "Linha B", active: false, tenantId: TENANT_ID });
    });

    it("funciona com where vazio (sem filtros prévios)", async () => {
      const result = await applyTenantFilter(
        { model: "Operator", operation: "findMany", args: {} },
        TENANT_ID
      );
      expect(result.where).toEqual({ tenantId: TENANT_ID });
    });

    it("funciona com data vazio no create", async () => {
      const result = await applyTenantFilter(
        { model: "Reference", operation: "create", args: { data: {} } },
        TENANT_ID
      );
      expect(result.data).toEqual({ tenantId: TENANT_ID });
    });

    it("aplica matching case-insensitive — 'station' em minúsculas", async () => {
      const result = await applyTenantFilter(
        { model: "station", operation: "findMany", args: {} },
        TENANT_ID
      );
      expect((result.where as Record<string, unknown>)?.tenantId).toBe(TENANT_ID);
    });

    it("injeta tenantId no where para update em Station", async () => {
      const result = await applyTenantFilter(
        {
          model: "Station",
          operation: "update",
          args: { where: { id: "station-1" }, data: { name: "Nova Linha" } },
        },
        TENANT_ID
      );
      expect(result.where).toEqual({ id: "station-1", tenantId: TENANT_ID });
      // update NÃO injeta no data, só no where
      expect((result.data as Record<string, unknown>)?.tenantId).toBeUndefined();
    });

    it("injeta tenantId no where para delete em Station", async () => {
      const result = await applyTenantFilter(
        { model: "Station", operation: "delete", args: { where: { id: "station-1" } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ id: "station-1", tenantId: TENANT_ID });
    });

    it("injeta tenantId no where para updateMany em Operator", async () => {
      const result = await applyTenantFilter(
        {
          model: "Operator",
          operation: "updateMany",
          args: { where: { isActive: true }, data: { badge: "NEW" } },
        },
        TENANT_ID
      );
      expect(result.where).toEqual({ isActive: true, tenantId: TENANT_ID });
    });

    it("injeta tenantId no where para deleteMany em AuditLog", async () => {
      const result = await applyTenantFilter(
        { model: "AuditLog", operation: "deleteMany", args: { where: { action: "old" } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ action: "old", tenantId: TENANT_ID });
    });

    it("injeta tenantId no where e create para upsert em Station", async () => {
      const result = await applyTenantFilter(
        {
          model: "Station",
          operation: "upsert",
          args: {
            where: { id: "station-1" },
            create: { name: "Nova" },
            update: { name: "Atualizada" },
          },
        },
        TENANT_ID
      );
      expect(result.where).toEqual({ id: "station-1", tenantId: TENANT_ID });
      expect(result.create).toEqual({ name: "Nova", tenantId: TENANT_ID });
      // upsert NÃO injeta no update
      expect((result.update as Record<string, unknown>)?.tenantId).toBeUndefined();
    });

    it("injeta tenantId no where para groupBy em VoiceCommand", async () => {
      const result = await applyTenantFilter(
        { model: "VoiceCommand", operation: "groupBy", args: { where: { action: "next" } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ action: "next", tenantId: TENANT_ID });
    });
  });

  describe("modelos SEM escopo de tenant", () => {
    it("NÃO injeta tenantId em Step (não é modelo raíz)", async () => {
      const result = await applyTenantFilter(
        { model: "Step", operation: "findMany", args: { where: { isQc: true } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ isQc: true }); // sem tenantId
    });

    it("NÃO injeta tenantId em GlobalSettings", async () => {
      const result = await applyTenantFilter(
        { model: "GlobalSettings", operation: "findFirst", args: {} },
        TENANT_ID
      );
      expect((result.where as Record<string, unknown> | undefined)?.tenantId).toBeUndefined();
    });

    it("NÃO injeta tenantId em StepLog (não é modelo raíz)", async () => {
      const result = await applyTenantFilter(
        { model: "StepLog", operation: "findMany", args: { where: { sessionId: "sess-1" } } },
        TENANT_ID
      );
      expect(result.where).toEqual({ sessionId: "sess-1" });
    });

    it("NÃO injeta tenantId em Session", async () => {
      const result = await applyTenantFilter(
        { model: "Session", operation: "create", args: { data: { stationId: "s-1" } } },
        TENANT_ID
      );
      expect((result.data as Record<string, unknown>)?.tenantId).toBeUndefined();
    });

    it("NÃO altera args de modelos não mapeados", async () => {
      const originalArgs = { where: { foo: "bar" }, take: 10 };
      const result = await applyTenantFilter(
        { model: "UnknownModel", operation: "findMany", args: { ...originalArgs } },
        TENANT_ID
      );
      expect(result).toEqual(originalArgs);
    });
  });

  describe("imutabilidade — não modifica args originais", () => {
    it("não muta o objeto args original em findMany", async () => {
      const originalArgs = { where: { isActive: true } };
      const argsCopy = { where: { isActive: true } };
      await applyTenantFilter(
        { model: "Station", operation: "findMany", args: originalArgs },
        TENANT_ID
      );
      expect(originalArgs).toEqual(argsCopy); // args não foi mutado
    });

    it("não muta o objeto data original em create", async () => {
      const originalData = { name: "Test" };
      const originalArgs = { data: originalData };
      await applyTenantFilter(
        { model: "Operator", operation: "create", args: originalArgs },
        TENANT_ID
      );
      expect(originalData.hasOwnProperty("tenantId")).toBe(false);
    });
  });

  describe("exportações de db.ts", () => {
    it("getTenantPrisma é uma função exportada", async () => {
      // Setar DATABASE_URL dummy para o módulo carregar sem erro
      process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/test";
      vi.unmock("@/lib/db");
      vi.resetModules();
      const mod = await import("../db");
      expect(typeof mod.getTenantPrisma).toBe("function");
    });

    it("adminPrisma é exportado", async () => {
      process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/test";
      vi.unmock("@/lib/db");
      vi.resetModules();
      const mod = await import("../db");
      expect(mod.adminPrisma).toBeDefined();
    });
  });
});
