import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    // Caminho para a pasta de produtos
    const productsDir = path.join(process.cwd(), "public", "products");

    // Verificar se a pasta existe
    try {
      await fs.access(productsDir);
    } catch (error) {
      console.error("Products directory not found:", error);
      return NextResponse.json([]);
    }

    // Ler os diretórios de produtos
    const productDirs = await fs.readdir(productsDir, { withFileTypes: true });
    const products = productDirs
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => ({
        id: dirent.name,
        name: `Produto ${dirent.name}`,
        description: `Processo de produção para produto ${dirent.name}`,
        steps: 0, // Será calculado quando carregar o CSV
        estimatedTime: "A calcular",
      }));

    return NextResponse.json(products);
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    return NextResponse.json([]);
  }
}
