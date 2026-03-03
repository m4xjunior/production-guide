"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
} from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Loader2,
  LogOut,
  Factory,
  BarChart3,
  Settings,
  Settings2,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// ─── Auth Context ──────────────────────────────────────────
interface AdminAuthContextType {
  password: string;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  password: "",
  logout: () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

// ─── Sidebar nav items ────────────────────────────────────
const NAV_ITEMS = [
  {
    label: "Panel",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Estaciones",
    href: "/admin/stations",
    icon: Factory,
    exact: false,
  },
  {
    label: "Reportes",
    href: "/admin/reports",
    icon: BarChart3,
    exact: false,
  },
  {
    label: "Configuraciones",
    href: "/admin/settings",
    icon: Settings2,
    exact: false,
  },
];

// ─── Layout Component ─────────────────────────────────────
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Check existing session on mount
  useEffect(() => {
    const saved = getAdminPassword();
    if (saved) {
      setPassword(saved);
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = useCallback(async () => {
    if (!inputPassword.trim()) {
      setError("Introduce la contrasena de administrador");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate password against the API
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": inputPassword,
        },
        body: JSON.stringify({ _validate: true }),
      });

      // Accept both 200 (OK) and 400 (bad request body but auth passed)
      // as indicators the password is valid. Only 401/403 means wrong password.
      if (res.status === 401 || res.status === 403) {
        setError("Contrasena incorrecta");
        setLoading(false);
        return;
      }

      setAdminPassword(inputPassword);
      setPassword(inputPassword);
      setIsAuthenticated(true);
    } catch {
      // Network error -- allow login for local dev
      setAdminPassword(inputPassword);
      setPassword(inputPassword);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, [inputPassword]);

  const handleLogout = useCallback(() => {
    clearAdminPassword();
    setIsAuthenticated(false);
    setPassword("");
    setInputPassword("");
  }, []);

  // ─── Loading state ────────────────────────────────────
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─── Login gate ───────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md border-zinc-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 rounded-full bg-blue-50 p-4 w-fit">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900">
              Panel de Administracion
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Introduce la contrasena de administrador para acceder al sistema de gestion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-zinc-700">
                Contrasena
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={inputPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setInputPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Contrasena de administrador"
                className="h-12 text-base border-zinc-300 focus-visible:ring-blue-500"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Acceder
            </Button>
            <div className="text-center pt-1">
              <Button variant="link" className="text-zinc-500" asChild>
                <Link href="/">Volver a la aplicacion</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Authenticated layout ─────────────────────────────
  return (
    <AdminAuthContext.Provider value={{ password, logout: handleLogout }}>
      <div className="min-h-screen bg-zinc-50 flex">
        {/* ─── Sidebar ─────────────────────────────────── */}
        <aside
          className={`
            fixed top-0 left-0 z-40 h-screen bg-white border-r border-zinc-200
            flex flex-col transition-all duration-200
            ${sidebarCollapsed ? "w-16" : "w-60"}
          `}
        >
          {/* Logo area */}
          <div className="h-16 flex items-center px-4 border-b border-zinc-200 shrink-0">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Factory className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-zinc-900 leading-tight">
                    SAO Admin
                  </h1>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Sistema de Ayuda al Operario
                  </p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="h-8 w-8 mx-auto rounded-lg bg-blue-600 flex items-center justify-center">
                <Factory className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }
                    ${sidebarCollapsed ? "justify-center" : ""}
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-blue-600" : ""}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="border-t border-zinc-200 p-2 space-y-1 shrink-0">
            <Link
              href="/"
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500
                hover:bg-zinc-100 hover:text-zinc-700 transition-colors
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
              title={sidebarCollapsed ? "Ver app operario" : undefined}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Ver app operario</span>}
            </Link>
            <button
              onClick={handleLogout}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500
                hover:bg-red-50 hover:text-red-600 transition-colors w-full
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
              title={sidebarCollapsed ? "Cerrar sesion" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Cerrar sesion</span>}
            </button>

            <Separator className="my-1" />

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              title={sidebarCollapsed ? "Expandir" : "Colapsar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Colapsar</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ─── Main Content ────────────────────────────── */}
        <main
          className={`
            flex-1 transition-all duration-200
            ${sidebarCollapsed ? "ml-16" : "ml-60"}
          `}
        >
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-16 bg-white border-b border-zinc-200 flex items-center px-6">
            <div className="flex items-center justify-between w-full">
              <div>
                {/* Breadcrumb area -- filled by page content */}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Conectado
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AdminAuthContext.Provider>
  );
}
