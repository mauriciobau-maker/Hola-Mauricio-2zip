import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, Trophy, Menu, X, Handshake, CalendarDays, Shield, MapPin, DollarSign, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/AuthButton";
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
];

const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);

function hexToHslChannels(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

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

  const handleMainClick = (event: React.MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target as HTMLElement;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    let url: URL;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      return;
    }

    if (url.origin !== window.location.origin) return;

    const path = url.pathname.replace(/\/+$/, "") || "/";
    const isPublicClubLink = /^\/[^/]+$/.test(path) && !reservedSingleSegmentRoutes.has(path);
    if (!isPublicClubLink) return;

    event.preventDefault();
    setMobileOpen(false);
    navigate(path);
  };

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
          <Link href="/" className="flex items-center gap-2 font-bold text-base md:text-lg tracking-tight shrink-0 whitespace-nowrap overflow-hidden">
            {club?.logoUrl ? <img src={club.logoUrl} alt={`Logo ${club.name}`} className="h-7 w-auto object-contain max-w-[110px] rounded shrink-0" /> : !club?.name?.toLowerCase().includes("padel") && <span className="text-primary shrink-0">Padel</span>}
            <span className="text-foreground whitespace-nowrap shrink-0">{club?.name || "Tracker"}</span>
            {!club?.logoUrl && <span className="text-xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30 shrink-0">IA</span>}
          </Link>

          {!isPublicClubRoute && <nav className="hidden xl:flex items-center gap-1 shrink-0">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap", location === item.href ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <item.icon size={14} />{t(item.key)}
              </Link>
            ))}
            {isAdmin && <Link href="/admin" className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap", location === "/admin" ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><Shield size={14} />{t("adminPanel")}</Link>}
          </nav>}

          <div className="hidden xl:flex items-center gap-2 shrink-0"><LanguageSelector /><AuthButton /></div>
          <div className="xl:hidden flex items-center gap-2 shrink-0"><LanguageSelector /><AuthButton />{!isPublicClubRoute && <button className="p-2 rounded-md hover:bg-muted/50 text-foreground" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>}</div>
        </div>

        {mobileOpen && !isPublicClubRoute && <div className="xl:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1 shadow-lg">
          {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors", location === item.href ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><item.icon size={16} />{t(item.key)}</Link>)}
          {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors", location === "/admin" ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><Shield size={16} />{t("adminPanel")}</Link>}
        </div>}
      </header>

      <main onClickCapture={handleMainClick} className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>

      <footer className="mt-auto border-t border-border bg-muted/30 py-4 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {club?.name || "Padel Tracker"}.</p>
          {club?.address && <span className="flex items-center gap-1 font-medium bg-background border border-border px-2 py-1 rounded-md shadow-sm"><MapPin size={12} className="text-primary" /> {club.address}</span>}
        </div>
      </footer>

      {!isPublicClubRoute && <><nav className="xl:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur flex z-40">
        {navItems.map((item) => <Link key={item.href} href={item.href} className={cn("flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors", location === item.href ? "text-primary" : "text-muted-foreground")}><item.icon size={18} /><span className="text-[10px]">{t(item.key)}</span></Link>)}
      </nav><div className="xl:hidden h-16" /></>}
    </div>
  );
}
