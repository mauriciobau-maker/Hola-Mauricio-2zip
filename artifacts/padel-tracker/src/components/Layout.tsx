import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  PlusCircle,
  Menu,
  X,
  Handshake,
  CalendarDays,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@workspace/replit-auth-web";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/parejas", label: "Parejas", icon: Handshake },
  { href: "/partidos", label: "Partidos", icon: Calendar },
  { href: "/jugadores", label: "Jugadores", icon: Users },
  { href: "/encuentros", label: "Encuentros", icon: CalendarDays },
];

  export default function Layout({ children }: { children: React.ReactNode }) {
    const [location, navigate] = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, isLoading } = useAuth();
    const isAdmin = !!(user && (user as any).isAdmin && (user as any).isAdmin > 0);

    // Redirigir a onboarding si está autenticado pero sin club
    useEffect(() => {
      if (!isLoading && user && !(user as any).clubId && location !== "/onboarding" && location !== "/vincular") {
        navigate("/onboarding");
      }
    }, [user, isLoading, location]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="text-primary">Padel</span>
            <span className="text-foreground">Tracker</span>
            <span className="text-xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">IA</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location === item.href
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location === "/admin"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Shield size={15} />
                Admin
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/partidos/nuevo"
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={15} />
              Nuevo Partido
            </Link>
            <AuthButton />
          </div>

          {/* Mobile burger */}
          <div className="md:hidden flex items-center gap-2">
            <AuthButton />
            <button
              className="p-2 rounded-md hover:bg-muted/50"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === item.href
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === "/admin"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Shield size={16} />
                Admin
              </Link>
            )}
            <Link
              href="/partidos/nuevo"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-semibold mt-1"
            >
              <PlusCircle size={16} />
              Nuevo Partido
            </Link>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              location === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              location === "/admin" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Shield size={20} />
            Admin
          </Link>
        )}
      </nav>
      <div className="md:hidden h-16" />
    </div>
  );
}