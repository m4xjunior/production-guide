import { NextResponse } from "next/server";

/**
 * GET /api/admin/auth
 *
 * Endpoint simples para validar credenciais de admin.
 * A validação real acontece no middleware (X-Admin-Password).
 * Se chegar até aqui, a senha é válida.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
