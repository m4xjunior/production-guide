/**
 * One-time script to create a TenantAdmin for a tenant.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <tenant-slug> <email> <password>
 *
 * Example:
 *   npx tsx scripts/create-admin.ts kh admin@kh.com MiPassword123!
 *
 * Requires DATABASE_URL in environment.
 */
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

async function main() {
  const [slug, email, password] = process.argv.slice(2);

  if (!slug || !email || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <tenant-slug> <email> <password>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      console.error(`Tenant with slug "${slug}" not found`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);

    const admin = await prisma.tenantAdmin.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      create: {
        tenantId: tenant.id,
        email,
        passwordHash,
        role: "admin",
      },
      update: {
        passwordHash,
        isActive: true,
      },
    });

    console.log(`TenantAdmin created/updated:`);
    console.log(`  ID:       ${admin.id}`);
    console.log(`  Tenant:   ${tenant.name} (${tenant.slug})`);
    console.log(`  Email:    ${email}`);
    console.log(`  Role:     ${admin.role}`);
    console.log(`\nPassword hash stored. The admin can now log in.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
