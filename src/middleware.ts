import { NextRequest, NextResponse } from "next/server";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Middleware de autenticación para rutas de administración.
 *
 * Reglas:
 * - Las peticiones GET a estaciones, sesiones y reportes son PÚBLICAS (acceso tablet operario).
 * - Las peticiones POST/PUT/DELETE/PATCH sobre estaciones y pasos requieren autenticación admin.
 * - Cualquier ruta bajo /api/admin/* requiere autenticación admin.
 * - La autenticación se verifica con la cabecera X-Admin-Password contra la variable ADMIN_PASSWORD.
 */

// Rutas que requieren autenticación admin para métodos de escritura
const RUTAS_PROTEGIDAS_ESCRITURA = [
  "/api/stations",
  "/api/step-logs",
  "/api/upload",
  "/api/config",
  "/api/tts",
];

// Rutas siempre públicas (lectura libre para operarios)
const METODOS_PUBLICOS = ["GET", "HEAD", "OPTIONS"];

// Rutas de operario que no requieren admin (POST permitido para operarios)
const RUTAS_OPERARIO = [
  "/api/sessions",
  "/api/step-logs",
  "/api/validate/barcode",
];

function requiereAdmin(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const metodo = request.method;

  // Cualquier ruta bajo /api/admin/* siempre requiere admin
  if (pathname.startsWith("/api/admin")) {
    return true;
  }

  // Los métodos de lectura son públicos para todas las rutas
  if (METODOS_PUBLICOS.includes(metodo)) {
    return false;
  }

  // Las rutas de operario (sessions, step-logs, validate) son públicas incluso para escritura
  for (const ruta of RUTAS_OPERARIO) {
    if (pathname.startsWith(ruta)) {
      return false;
    }
  }

  // Los métodos de escritura en estaciones y pasos requieren admin
  for (const ruta of RUTAS_PROTEGIDAS_ESCRITURA) {
    if (pathname.startsWith(ruta)) {
      return true;
    }
  }

  // Por defecto, no requiere admin
  return false;
}

export function middleware(request: NextRequest) {
  // Solo aplicar a rutas de API
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Verificar si requiere autenticación admin
  if (requiereAdmin(request)) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error(
        "ADMIN_PASSWORD no configurada en variables de entorno",
      );
      return NextResponse.json(
        { error: "Configuración de servidor incompleta" },
        { status: 500 },
      );
    }

    const passwordRecibida = request.headers.get("X-Admin-Password");

    if (!passwordRecibida) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere la cabecera X-Admin-Password" },
        { status: 401 },
      );
    }

    if (!constantTimeEqual(passwordRecibida, adminPassword)) {
      return NextResponse.json(
        { error: "Contraseña de administrador incorrecta" },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}

/**
 * Configurar las rutas donde se aplica el middleware.
 * Solo rutas de API.
 */
export const config = {
  matcher: "/api/:path*",
};
