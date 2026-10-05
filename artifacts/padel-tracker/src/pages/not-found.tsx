import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <p className="text-6xl font-black text-primary">404</p>
      <h1 className="text-xl font-bold">Pagina no encontrada</h1>
      <p className="text-sm text-muted-foreground">La pagina que buscas no existe.</p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
