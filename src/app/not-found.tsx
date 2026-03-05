import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-8">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="text-xl font-semibold text-foreground">
          Pagina no encontrada
        </h2>
        <p className="text-muted-foreground">
          La pagina que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
