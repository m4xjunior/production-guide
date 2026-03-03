import sql from "mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Config ──
const SAGE_CONFIG: sql.config = {
  server: process.env.SAGE_HOST || "localhost",
  port: parseInt(process.env.SAGE_PORT || "1433"),
  user: process.env.SAGE_USER || "sa",
  password: process.env.SAGE_PASSWORD || "",
  database: process.env.SAGE_DATABASE || "SAGE",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 15000,
};

const SAGE_TABLE = process.env.SAGE_OPERATOR_TABLE || "OPERARIOS";
const SAGE_CODE_COL = process.env.SAGE_CODE_COLUMN || "CODIGO";
const SAGE_NAME_COL = process.env.SAGE_NAME_COLUMN || "NOMBRE";
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || "60") * 1000;
const SYNC_ONCE = process.env.SYNC_ONCE === "true";

// ── Prisma (Neon) ──
function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

const prisma = createPrisma();

// ── Sync Logic ──
async function syncOperators(): Promise<void> {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Sync iniciado...`);

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sql.connect(SAGE_CONFIG);

    const result = await pool.request().query(
      `SELECT ${SAGE_CODE_COL} AS code, ${SAGE_NAME_COL} AS name FROM ${SAGE_TABLE}`
    );

    const sageOperators = result.recordset as { code: string; name: string }[];
    console.log(`  Sage: ${sageOperators.length} operadores encontrados`);

    if (sageOperators.length === 0) {
      console.log("  AVISO: Sage retornou 0 operadores. Pulando sync para não desativar todos.");
      return;
    }

    const now = new Date();
    let created = 0;
    let updated = 0;

    for (const op of sageOperators) {
      const code = String(op.code).trim();
      const name = String(op.name).trim();
      if (!code) continue;

      const existing = await prisma.operator.findUnique({
        where: { sageCode: code },
      });

      if (existing) {
        if (existing.name !== name || !existing.isActive) {
          await prisma.operator.update({
            where: { sageCode: code },
            data: { name, isActive: true, lastSyncedAt: now },
          });
          updated++;
        } else {
          await prisma.operator.update({
            where: { sageCode: code },
            data: { lastSyncedAt: now },
          });
        }
      } else {
        await prisma.operator.create({
          data: { sageCode: code, name, isActive: true, lastSyncedAt: now },
        });
        created++;
      }
    }

    // Desativar operadores que não estão mais no Sage
    const sageCodes = sageOperators.map((op) => String(op.code).trim()).filter(Boolean);
    const deactivated = await prisma.operator.updateMany({
      where: {
        sageCode: { notIn: sageCodes },
        isActive: true,
      },
      data: { isActive: false, lastSyncedAt: now },
    });

    const elapsed = Date.now() - startTime;
    console.log(
      `  Resultado: +${created} criados, ~${updated} atualizados, -${deactivated.count} desativados (${elapsed}ms)`
    );
  } catch (error) {
    console.error("  ERRO no sync:", error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// ── Main Loop ──
async function main(): Promise<void> {
  console.log("=== Sage Operator Sync ===");
  console.log(`  Sage: ${SAGE_CONFIG.server}:${SAGE_CONFIG.port}/${SAGE_CONFIG.database}`);
  console.log(`  Tabela: ${SAGE_TABLE} (${SAGE_CODE_COL}, ${SAGE_NAME_COL})`);
  console.log(`  Intervalo: ${SYNC_INTERVAL / 1000}s`);
  console.log("");

  await syncOperators();

  if (SYNC_ONCE) {
    console.log("Modo single-run. Encerrando.");
    await prisma.$disconnect();
    process.exit(0);
  }

  setInterval(syncOperators, SYNC_INTERVAL);

  process.on("SIGINT", async () => {
    console.log("\nEncerrando sync...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nEncerrando sync...");
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
