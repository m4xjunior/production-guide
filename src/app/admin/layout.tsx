"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Loader2,
  LogOut,
  Factory,
  BarChart3,
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

function useAdminAuth() {
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
      // Validate password against dedicated auth endpoint
      const res = await fetch("/api/admin/auth", {
        method: "GET",
        headers: { "X-Admin-Password": inputPassword },
      });

      if (res.status === 401 || res.status === 403) {
        setError("Contrasena incorrecta");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("No se pudo validar la contrasena");
        setLoading(false);
        return;
      }

      setAdminPassword(inputPassword);
      setPassword(inputPassword);
      setIsAuthenticated(true);
    } catch {
      setError("Error de red. No se pudo validar la contrasena.");
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0A0A0C" }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#8B1A1A" }} />
      </div>
    );
  }

  // ─── Login gate ───────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "#0A0A0C" }}
      >
        <div className="w-full max-w-md relative">
          {/* Gradient metallic border overlay */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              padding: "1px",
              background:
                "linear-gradient(135deg, #3A3A3E 0%, #8B1A1A 40%, #3A3A3E 60%, #2A2A2E 100%)",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Content */}
          <div
            className="relative z-10 rounded-2xl px-8 py-10"
            style={{ background: "#111113" }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="rounded-full p-4"
                style={{ background: "rgba(139, 26, 26, 0.1)" }}
              >
                <Lock className="h-8 w-8" style={{ color: "#8B1A1A" }} />
              </div>
            </div>

            {/* Title */}
            <h1
              className="text-2xl font-bold text-center mb-1"
              style={{ color: "#E8E8E8" }}
            >
              Panel de Administracion
            </h1>
            <p
              className="text-sm text-center mb-8"
              style={{ color: "#6B6B6B" }}
            >
              Introduce la contrasena de administrador para acceder al sistema de
              gestion
            </p>

            {/* Form */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="admin-password"
                  style={{ color: "#E8E8E8" }}
                >
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
                  className="h-12 text-base"
                  style={{
                    background: "#0A0A0C",
                    borderColor: "#2A2A2E",
                    color: "#E8E8E8",
                  }}
                  autoFocus
                />
                {error && (
                  <p className="text-sm font-medium" style={{ color: "#D44" }}>
                    {error}
                  </p>
                )}
              </div>
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 text-base text-white"
                style={{
                  background: "#8B1A1A",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#A52525")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#8B1A1A")
                }
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Acceder
              </Button>
              <div className="text-center pt-1">
                <Link
                  href="/"
                  className="text-sm transition-colors"
                  style={{ color: "#6B6B6B" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#E8E8E8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#6B6B6B")
                  }
                >
                  Volver a la aplicacion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authenticated layout ─────────────────────────────
  return (
    <AdminAuthContext.Provider value={{ password, logout: handleLogout }}>
      {/* Pulse keyframes for status dot */}
      <style jsx global>{`
        @keyframes status-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
      `}</style>

      <div className="min-h-screen flex" style={{ background: "#0A0A0C" }}>
        {/* ─── Sidebar ─────────────────────────────────── */}
        <aside
          className="fixed top-0 left-0 z-40 h-screen flex flex-col transition-all duration-200"
          style={{
            background: "#111113",
            borderRight: "1px solid #2A2A2E",
            width: sidebarCollapsed ? "64px" : "240px",
          }}
        >
          {/* Scan-line texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)",
              zIndex: 1,
            }}
          />

          {/* Logo area */}
          <div
            className="h-16 flex items-center px-4 shrink-0 relative z-10"
            style={{ borderBottom: "1px solid #2A2A2E" }}
          >
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <img src="/logo-kh.png" alt="KH" className="h-8 w-auto" />
                <div>
                  <h1
                    className="text-sm font-bold leading-tight"
                    style={{ color: "#E8E8E8" }}
                  >
                    SAO Admin
                  </h1>
                  <p
                    className="text-[10px] leading-tight"
                    style={{
                      color: "#3A3A3E",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    Sistema de Ayuda al Operario
                  </p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <img src="/logo-kh.png" alt="KH" className="h-8 w-auto mx-auto" />
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto relative z-10">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 text-sm font-medium transition-all duration-150 rounded-lg relative"
                  style={{
                    padding: sidebarCollapsed
                      ? "10px 0"
                      : "10px 12px 10px 14px",
                    justifyContent: sidebarCollapsed ? "center" : "flex-start",
                    color: isActive ? "#E8E8E8" : "#6B6B6B",
                    background: isActive
                      ? "rgba(139, 26, 26, 0.1)"
                      : "transparent",
                    borderLeft: isActive
                      ? "2px solid #8B1A1A"
                      : "2px solid transparent",
                    borderRadius: "0 8px 8px 0",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)";
                      e.currentTarget.style.color = "#E8E8E8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#6B6B6B";
                    }
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className="h-5 w-5 shrink-0"
                    style={{ color: isActive ? "#8B1A1A" : undefined }}
                  />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div
            className="p-3 space-y-1 shrink-0 relative z-10"
            style={{ borderTop: "1px solid #2A2A2E" }}
          >
            <Link
              href="/"
              className="flex items-center gap-3 text-sm transition-colors rounded-lg"
              style={{
                padding: sidebarCollapsed ? "8px 0" : "8px 12px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                color: "#6B6B6B",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.color = "#E8E8E8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#6B6B6B";
              }}
              title={sidebarCollapsed ? "Ver app operario" : undefined}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Ver app operario</span>}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-sm transition-colors rounded-lg w-full"
              style={{
                padding: sidebarCollapsed ? "8px 0" : "8px 12px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                color: "#6B6B6B",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 26, 26, 0.1)";
                e.currentTarget.style.color = "#A52525";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#6B6B6B";
              }}
              title={sidebarCollapsed ? "Cerrar sesion" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>Cerrar sesion</span>}
            </button>

            {/* Separator */}
            <div
              className="my-2"
              style={{ height: "1px", background: "#2A2A2E" }}
            />

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center w-full rounded-lg text-sm transition-colors"
              style={{
                padding: "8px 12px",
                color: "#3A3A3E",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.color = "#6B6B6B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#3A3A3E";
              }}
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
          className="flex-1 transition-all duration-200"
          style={{
            marginLeft: sidebarCollapsed ? "64px" : "240px",
          }}
        >
          {/* Top bar */}
          <header
            className="sticky top-0 z-30 h-16 flex items-center px-6"
            style={{
              background: "#111113",
              borderBottom: "1px solid #2A2A2E",
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div>{/* Breadcrumb area -- filled by page content */}</div>
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "#6B6B6B" }}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: "#22C55E",
                      animation: "status-pulse 2s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    Conectado
                  </span>
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
