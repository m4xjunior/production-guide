import { uploadBuffer, getPublicUrl } from "../src/lib/gcs";
import { prisma } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

const PRODUCTS = ["00610", "00612", "03411", "03473", "10093"];
const PUBLIC_DIR = path.join(process.cwd(), "public");

async function uploadProductImages() {
  console.log("Iniciando upload de imagens para GCS...");
  for (const productId of PRODUCTS) {
    const productDir = path.join(PUBLIC_DIR, "products", productId);
    if (!fs.existsSync(productDir)) { console.log(`Skipping ${productId} - not found`); continue; }
    const files = fs.readdirSync(productDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    for (const file of files) {
      const localPath = path.join(productDir, file);
      const gcsPath = `images/products/${productId}/${file}`;
      const buffer = fs.readFileSync(localPath);
      console.log(`Uploading ${productId}/${file}...`);
      await uploadBuffer(buffer, gcsPath, "image/png");
      const publicUrl = getPublicUrl(gcsPath);
      const localRef = `/products/${productId}/${file}`;
      const updated = await prisma.step.updateMany({
        where: { photoUrl: localRef },
        data: { photoUrl: publicUrl },
      });
      console.log(`  → ${updated.count} steps atualizados`);
    }
  }
  console.log("Upload concluído!");
  await prisma.$disconnect();
}

uploadProductImages().catch(console.error);
