import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

type SourceKind = "HP" | "PE";

type ExtractedStep = {
  source: SourceKind;
  sourceOrder: number;
  mensaje: string;
};

type CliOptions = {
  hpPath: string;
  pePath?: string;
  stationName: string;
  stationDescription: string;
  productCode: string;
  modelBaseUrl?: string;
  dryRun: boolean;
};

function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function getCellText(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
): string {
  const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[cellRef];
  if (!cell?.v) return "";
  return normalizeText(String(cell.v));
}

function findBestSheetName(workbook: XLSX.WorkBook): string {
  const preferred = workbook.SheetNames.find((name) => name.toUpperCase() === "F08002");
  if (preferred) return preferred;

  const fallback = workbook.SheetNames.find((name) => name.toUpperCase().includes("F080"));
  if (fallback) return fallback;

  return workbook.SheetNames[0];
}

function extractStepsFromWorkbook(filePath: string, source: SourceKind): ExtractedStep[] {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    cellFormula: true,
    cellStyles: false,
  });

  const sheetName = findBestSheetName(workbook);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet["!ref"]) {
    throw new Error(`No se pudo leer la hoja de trabajo en ${filePath}`);
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headers: Array<{ row: number; col: number; stepNumber: number }> = [];

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const text = getCellText(sheet, row, col).toUpperCase();
      const match = text.match(/^PASO\s*(\d{1,2})$/);
      if (!match) continue;
      headers.push({ row, col, stepNumber: Number(match[1]) });
    }
  }

  if (headers.length === 0) {
    throw new Error(`No se detectaron columnas PASO en ${path.basename(filePath)} (${sheetName})`);
  }

  headers.sort((a, b) => {
    if (a.stepNumber !== b.stepNumber) return a.stepNumber - b.stepNumber;
    return a.col - b.col;
  });

  const extracted: ExtractedStep[] = [];

  for (const header of headers) {
    const lines: string[] = [];
    const maxScanRows = Math.min(range.e.r, header.row + 18);

    for (let row = header.row + 1; row <= maxScanRows; row++) {
      const current = getCellText(sheet, row, header.col);
      if (!current) continue;
      if (/^PASO\s*\d+/i.test(current)) break;

      const upper = current.toUpperCase();
      if (
        upper === "OK" ||
        upper === "SI" ||
        upper === "NO" ||
        upper === "NA"
      ) {
        continue;
      }

      lines.push(current);
      if (lines.length >= 4) break;
    }

    const merged = normalizeText(lines.join(". "));
    const mensaje = merged.length > 0
      ? merged
      : `Ejecutar paso ${header.stepNumber} (${source})`;

    extracted.push({
      source,
      sourceOrder: header.stepNumber,
      mensaje,
    });
  }

  return extracted;
}

function buildModelUrl(baseUrl: string | undefined, source: SourceKind, sourceOrder: number): string | null {
  if (!baseUrl) return null;
  const normalized = baseUrl.replace(/\/$/, "");
  const order = String(sourceOrder).padStart(2, "0");
  return `${normalized}/${source.toLowerCase()}-paso-${order}.glb`;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);

  const findFlag = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    return args[index + 1];
  };

  const hpPath =
    findFlag("--hp") ||
    process.env.TECHO_HP_XLSX ||
    "";

  const pePath =
    findFlag("--pe") ||
    process.env.TECHO_PE_XLSX;

  const stationName =
    findFlag("--station-name") ||
    "Techo ciclonico - Montaje guiado";

  const stationDescription =
    findFlag("--station-description") ||
    "Flujo de montaje importado desde hojas HP/PE";

  const productCode =
    findFlag("--product-code") ||
    "TECHO-CICLONICO";

  const modelBaseUrl =
    findFlag("--model-base-url") ||
    process.env.TECHO_MODEL_BASE_URL;

  const dryRun = args.includes("--dry-run");

  if (!hpPath) {
    throw new Error(
      "Falta --hp. Ejemplo: npx tsx scripts/import-techo-ciclonico.ts --hp '/ruta/5. HP_Techo ciclonico.xlsx' --pe '/ruta/4. PE_Techo ciclonico.xlsx'",
    );
  }

  return {
    hpPath,
    pePath,
    stationName,
    stationDescription,
    productCode,
    modelBaseUrl,
    dryRun,
  };
}

async function main() {
  const options = parseCliArgs();

  if (!fs.existsSync(options.hpPath)) {
    throw new Error(`Archivo HP no encontrado: ${options.hpPath}`);
  }
  if (options.pePath && !fs.existsSync(options.pePath)) {
    throw new Error(`Archivo PE no encontrado: ${options.pePath}`);
  }

  const hpSteps = extractStepsFromWorkbook(options.hpPath, "HP");
  const peSteps = options.pePath ? extractStepsFromWorkbook(options.pePath, "PE") : [];

  const allSteps = [...hpSteps, ...peSteps]
    .sort((a, b) => {
      if (a.source === b.source) return a.sourceOrder - b.sourceOrder;
      return a.source === "HP" ? -1 : 1;
    });

  console.log(`\nPasos detectados: HP=${hpSteps.length}, PE=${peSteps.length}, total=${allSteps.length}`);

  if (allSteps.length === 0) {
    throw new Error("No se encontraron pasos para importar.");
  }

  const preview = allSteps.slice(0, 5).map((step) =>
    `  [${step.source} ${step.sourceOrder}] ${step.mensaje.slice(0, 90)}`,
  );
  console.log("\nVista previa:");
  preview.forEach((line) => console.log(line));

  if (options.dryRun) {
    console.log("\n--dry-run activado: no se escribieron datos en la base.");
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL es obligatorio para importar pasos.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    let station = await prisma.station.findFirst({
      where: { productCode: options.productCode },
    });

    if (!station) {
      station = await prisma.station.create({
        data: {
          name: options.stationName,
          description: options.stationDescription,
          productCode: options.productCode,
          isActive: true,
        },
      });
      console.log(`\nEstacion creada: ${station.name} (${station.id})`);
    } else {
      station = await prisma.station.update({
        where: { id: station.id },
        data: {
          name: options.stationName,
          description: options.stationDescription,
          isActive: true,
        },
      });
      console.log(`\nEstacion actualizada: ${station.name} (${station.id})`);
    }

    const deleted = await prisma.step.deleteMany({
      where: { stationId: station.id },
    });
    if (deleted.count > 0) {
      console.log(`Pasos anteriores eliminados: ${deleted.count}`);
    }

    for (let index = 0; index < allSteps.length; index++) {
      const step = allSteps[index];
      const orderNum = index + 1;

      await prisma.step.create({
        data: {
          stationId: station.id,
          orderNum,
          tipo: "VOZ",
          mensaje: step.mensaje,
          voz: step.mensaje,
          responseType: "button",
          respuesta: null,
          photoUrl: null,
          modelUrl: buildModelUrl(options.modelBaseUrl, step.source, step.sourceOrder),
          isQc: false,
          qcFrequency: null,
        },
      });
    }

    console.log(`Pasos importados correctamente: ${allSteps.length}`);
    console.log("\nSugerencia: en admin, ajusta textos finales y vincula modelos 3D paso a paso.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nError en importacion Techo ciclonico:", error);
  process.exit(1);
});
