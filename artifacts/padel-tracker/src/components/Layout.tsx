import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, Trophy, Menu, X, Handshake, CalendarDays, Shield, MapPin, DollarSign, Globe, Sparkles } from "lucide-react";
import { cn, hexToHslChannels } from "@/lib/utils";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "../context/LanguageContext";
import { TranslationKey } from "../lib/translations";
import ParrynWidget, { triggerParryn } from "@/components/ParrynWidget";

interface ClubBranding {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  address?: string | null;
  defaultLanguage?: string | null;
}

interface NavItem {
  href: string;
  key: TranslationKey;
  icon: any;
}

const navItems: NavItem[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/ranking", key: "ranking", icon: Trophy },
  { href: "/parejas", key: "pairs", icon: Handshake },
  { href: "/partidos", key: "matches", icon: Calendar },
  { href: "/jugadores", key: "players", icon: Users },
  { href: "/encuentros", key: "encuentros", icon: CalendarDays },
  { href: "/cobros", key: "payments", icon: DollarSign },
];

const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [club, setClub] = useState<ClubBranding | null>(null);
  const { user, isLoading } = useAuth();
  const { language, setLanguage, setClubDefaultLanguage, t } = useLanguage();

  const isPublicClubRoute = /^\/[^/]+$/.test(location) && !reservedSingleSegmentRoutes.has(location);
  const isSuperAdmin = !!(user && ((user as any).role === "superadmin" || (user as any).role === "super_admin"));
  const isAdmin = !!(user && (user as any).isAdmin && (user as any).isAdmin > 0) || isSuperAdmin;

  useEffect(() => {
    if (!isLoading && user && !(user as any).clubId && !isAdmin && !isPublicClubRoute && location !== "/onboarding" && location !== "/vincular" && location !== "/admin") {
      navigate("/onboarding");
    }
  }, [user, isLoading, location, isAdmin, isPublicClubRoute, navigate]);

  useEffect(() => {
    if (isPublicClubRoute) {
      const slug = location.slice(1);
      fetch(`/api/clubs/public/${encodeURIComponent(slug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setClub(data);
            if (data.defaultLanguage) setClubDefaultLanguage(data.defaultLanguage);
          } else setClub(null);
        })
        .catch(() => setClub(null));
      return;
    }

    if (user && ((user as any).clubId || isAdmin)) {
      fetch("/api/clubs/current")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setClub(data);
            if (data.defaultLanguage) setClubDefaultLanguage(data.defaultLanguage);
          }
        })
        .catch((err) => console.error("Error cargando marca blanca:", err));
    } else setClub(null);
  }, [user, isAdmin, isPublicClubRoute, location, setClubDefaultLanguage]);

  const dynamicStyles: Record<string, string> = {};
  if (club?.primaryColor) dynamicStyles["--primary"] = hexToHslChannels(club.primaryColor);
  if (club?.secondaryColor) dynamicStyles["--secondary"] = hexToHslChannels(club.secondaryColor);

  const LanguageSelector = () => (
    <div className="flex items-center gap-1 bg-muted/40 border border-border px-2 py-1 rounded-lg shrink-0">
      <Globe size={14} className="text-muted-foreground" />
      <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer">
        <option value="es" className="bg-background text-foreground">🇪🇸 ES</option>
        <option value="en" className="bg-background text-foreground">🇺🇸 EN</option>
        <option value="pt" className="bg-background text-foreground">🇧🇷 PT</option>
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" style={dynamicStyles as React.CSSProperties}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-base md:text-lg tracking-tight shrink-0 whitespace-nowrap overflow-hidden">
            {club?.logoUrl ? (
              <img src={club.logoUrl} alt={`Logo ${club.name}`} className="h-7 w-auto object-contain max-w-[110px] rounded shrink-0" />
            ) : (
              <span className="text-primary font-black tracking-tight shrink-0 flex items-center gap-1">
                Parryn
              </span>
            )}
            <span className="text-foreground whitespace-nowrap shrink-0">
              {club?.name ? `• ${club.name}` : ""}
            </span>
            <span className="text-[11px] font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
              Secretario IA
            </span>
          </Link>

          {!isPublicClubRoute && <nav className="hidden xl:flex items-center gap-1 shrink-0">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap", location === item.href ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <item.icon size={14} />{t(item.key)}
              </Link>
            ))}
            {(isAdmin || !user) && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  location === "/admin" ? "bg-primary/15 text-primary font-semibold" : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                )}
              >
                <Shield size={14} className="text-purple-400" />
                {t("adminPanel")}
              </Link>
            )}
          </nav>}

          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => triggerParryn()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Abrir secretario deportivo Parryn"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Sparkles size={13} className="text-yellow-400" />
              <span>Parryn IA</span>
            </button>
            <LanguageSelector />
            <AuthButton />
          </div>
          <div className="xl:hidden flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => triggerParryn()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 text-xs font-bold active:scale-95 cursor-pointer"
              title="Abrir Parryn"
            >
              <Sparkles size={12} className="text-yellow-400" />
              <span>Parryn</span>
            </button>
            <LanguageSelector />
            <AuthButton />
            {!isPublicClubRoute && (
              <button
                className="p-1.5 rounded-md hover:bg-muted/50 text-foreground"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {mobileOpen && !isPublicClubRoute && (
          <div className="xl:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                triggerParryn();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-left transition-colors"
            >
              <Sparkles size={16} className="text-yellow-400" />
              <span>Parryn • Secretario Deportivo IA</span>
            </button>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === item.href ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon size={16} />
                {t(item.key)}
              </Link>
            ))}
            {(isAdmin || !user) && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === "/admin" ? "bg-primary/15 text-primary font-semibold" : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                )}
              >
                <Shield size={16} className="text-purple-400" />
                {t("adminPanel")}
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>

      <footer className="mt-auto border-t border-border bg-muted/30 py-4 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {club?.name || "Padel Tracker"}.</p>
          {club?.address && <span className="flex items-center gap-1 font-medium bg-background border border-border px-2 py-1 rounded-md shadow-sm"><MapPin size={12} className="text-primary" /> {club.address}</span>}
        </div>
      </footer>

      {!isPublicClubRoute && (
        <>
          <nav className="xl:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur flex z-40 items-center justify-around py-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-1.5 text-xs font-medium transition-colors",
                  location === item.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon size={17} />
                <span className="text-[10px]">{t(item.key)}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => triggerParryn()}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <div className="relative">
                <Sparkles size={17} className="text-yellow-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <span className="text-[10px] font-bold">Parryn</span>
            </button>
          </nav>
          <div className="xl:hidden h-16" />
        </>
      )}

      {/* Asistente y Secretario Inteligente Parryn */}
      <ParrynWidget />
    </div>
  );
}
