import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const PRODUCT_IDS = ["00610", "00612", "03411", "03473", "10093"];

function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(";").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(";");
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function nullIfNA(value: string): string | null {
  return value === "N/A" ? null : value;
}

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const productsDir = path.resolve(__dirname, "..", "public", "products");

  console.log("=== Seed: Starting CSV import ===\n");

  for (const productId of PRODUCT_IDS) {
    const csvPath = path.join(productsDir, productId, `${productId}.csv`);

    if (!fs.existsSync(csvPath)) {
      console.warn(`  SKIP: CSV not found at ${csvPath}`);
      continue;
    }

    console.log(`Processing product ${productId}...`);

    const rows = parseCsv(csvPath);

    // Find existing station by productCode or create a new one
    let station = await prisma.station.findFirst({
      where: { productCode: productId },
    });

    if (station) {
      console.log(`  Station already exists for ${productId}, reusing.`);
    } else {
      station = await prisma.station.create({
        data: {
          name: `Producto ${productId}`,
          productCode: productId,
          isActive: true,
        },
      });
    }

    console.log(`  Station: ${station.name} (${station.id})`);

    // Delete existing steps for this station (idempotent re-seed)
    const deleted = await prisma.step.deleteMany({
      where: { stationId: station.id },
    });
    if (deleted.count > 0) {
      console.log(`  Cleared ${deleted.count} existing steps.`);
    }

    // Create steps from CSV rows
    for (const row of rows) {
      const paso = parseInt(row["PASO"], 10);
      const tipo = row["TIPO"];
      const mensaje = row["MENSAJE"];
      const voz = nullIfNA(row["VOZ"]);
      const respuesta = nullIfNA(row["RESPUESTA"]);
      const fotos = row["FOTOS"];

      const responseType = tipo === "SISTEMA" ? "auto" : "voice";
      const photoUrl =
        fotos && fotos !== "N/A"
          ? `/products/${productId}/${fotos}`
          : null;

      await prisma.step.create({
        data: {
          stationId: station.id,
          orderNum: paso,
          tipo,
          mensaje,
          voz,
          responseType,
          respuesta,
          photoUrl,
          isQc: false,
        },
      });

      console.log(`    Step ${paso}: [${tipo}] ${mensaje.substring(0, 60)}...`);
    }

    console.log(`  Done: ${rows.length} steps created.\n`);
  }

  await prisma.globalSettings.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });
  console.log("GlobalSettings inicializado.");

  console.log("=== Seed complete ===");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
