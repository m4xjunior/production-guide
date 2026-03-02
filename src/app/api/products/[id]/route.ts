import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "@/utils/csvParser";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // Primeiro tenta o arquivo com o nome do produto
    let csvPath = path.join(
      process.cwd(),
      "public",
      "products",
      id,
      `${id}.csv`,
    );

    try {
      const csvContent = await fs.readFile(csvPath, "utf-8");
      const steps = parseCSV(csvContent);

      const productData = {
        productId: id,
        steps,
        imagesPath: `/products/${id}/`,
      };

      return NextResponse.json(productData);
    } catch (fileError) {
      console.error(`Error reading primary CSV for product ${id}:`, fileError);
      // Se não encontrar, tenta steps.csv (fallback)
      csvPath = path.join(process.cwd(), "public", "products", id, "steps.csv");

      try {
        const csvContent = await fs.readFile(csvPath, "utf-8");
        const steps = parseCSV(csvContent);

        const productData = {
          productId: id,
          steps,
          imagesPath: `/products/${id}/`,
        };

        return NextResponse.json(productData);
      } catch (fallbackError) {
        console.error(
          `Arquivo CSV não encontrado para produto ${id}:`,
          fallbackError,
        );
        return NextResponse.json(
          { error: `Produto ${id} não encontrado ou sem dados` },
          { status: 404 },
        );
      }
    }
  } catch (error) {
    console.error("Erro ao carregar produto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
