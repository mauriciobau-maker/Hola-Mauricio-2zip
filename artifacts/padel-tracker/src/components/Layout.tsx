import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, Trophy, Menu, X, Handshake, CalendarDays, Shield, MapPin, DollarSign, Globe, Bot } from "lucide-react";
import { cn, hexToHslChannels } from "@/lib/utils";
import { AuthButton } from "@/components/AuthButton";
import { ParrynFloatingWidget } from "@/components/ParrynFloatingWidget";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "../context/LanguageContext";
import { TranslationKey } from "../lib/translations";

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
  { href: "/secretario", key: "parrynSecretary", icon: Bot },
];

const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros", "/secretario"]);

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
      <select value={language} onChange={(e) => setLanguage(e.target.value as any, true)} className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer">
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
          <Link href="/" className="flex items-center gap-2.5 tracking-tight shrink-0 whitespace-nowrap overflow-hidden">
            {club?.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-9 h-9 rounded-xl object-contain bg-background/80 border border-border/60 p-0.5 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center text-primary font-black text-sm shadow-sm shrink-0">
                {(club?.name ? club.name.trim().slice(0, 2).toUpperCase() : "CP")}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-foreground font-black text-sm md:text-base tracking-tight truncate max-w-[200px] md:max-w-[280px]">
                {club?.name || "Club Pádel"}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <span className="opacity-75">powered by</span>
                <span className="font-semibold text-foreground/80">Parryn Sport Hub</span>
                <span className="text-[9px] font-bold bg-primary/20 text-primary px-1 py-0.2 rounded border border-primary/30">IA</span>
              </div>
            </div>
          </Link>

          {!isPublicClubRoute && <nav className="hidden xl:flex items-center gap-1 shrink-0">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap", location === item.href ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <item.icon size={14} />{t(item.key)}
              </Link>
            ))}
            {isAdmin && (
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

          <div className="hidden xl:flex items-center gap-2 shrink-0"><LanguageSelector /><AuthButton /></div>
          <div className="xl:hidden flex items-center gap-2 shrink-0"><LanguageSelector /><AuthButton />{!isPublicClubRoute && <button className="p-2 rounded-md hover:bg-muted/50 text-foreground" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>}</div>
        </div>

        {mobileOpen && !isPublicClubRoute && <div className="xl:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1 shadow-lg">
          {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors", location === item.href ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><item.icon size={16} />{t(item.key)}</Link>)}
          {isAdmin && (
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
        </div>}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>

      <footer className="mt-auto border-t border-border bg-muted/30 py-4 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {club?.name || "Club Pádel"} • Powered by Parryn Sport Hub IA.</p>
          {club?.address && <span className="flex items-center gap-1 font-medium bg-background border border-border px-2 py-1 rounded-md shadow-sm"><MapPin size={12} className="text-primary" /> {club.address}</span>}
        </div>
      </footer>

      {!isPublicClubRoute && (
        <>
          <ParrynFloatingWidget />
          <nav className="xl:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur flex z-40">
            {navItems.map((item) => <Link key={item.href} href={item.href} className={cn("flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors", location === item.href ? "text-primary" : "text-muted-foreground")}><item.icon size={18} /><span className="text-[10px]">{t(item.key)}</span></Link>)}
          </nav>
          <div className="xl:hidden h-16" />
        </>
      )}
    </div>
  );
}
