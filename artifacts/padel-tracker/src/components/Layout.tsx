import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, Trophy, Menu, X, Handshake, CalendarDays, Shield, MapPin, DollarSign, Globe, Bot, Sparkles } from "lucide-react";
import { cn, hexToHslChannels } from "@/lib/utils";
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

    const activeClubId = (user as any)?.clubId;
    const url = activeClubId ? `/api/clubs/current?clubId=${activeClubId}` : "/api/clubs/current";
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setClub(data);
          if (data.defaultLanguage) setClubDefaultLanguage(data.defaultLanguage);
        } else {
          setClub(null);
        }
      })
      .catch((err) => console.error("Error cargando marca blanca:", err));
  }, [user, isAdmin, isPublicClubRoute, location, setClubDefaultLanguage]);

  const dynamicStyles: Record<string, string> = {};
  if (club?.primaryColor) dynamicStyles["--primary"] = hexToHslChannels(club.primaryColor);
  if (club?.secondaryColor) dynamicStyles["--secondary"] = hexToHslChannels(club.secondaryColor);

  const LanguageSelector = () => (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/40 border border-border px-1.5 sm:px-2 py-1 rounded-lg shrink-0">
      <Globe size={13} className="text-muted-foreground shrink-0" />
      <select value={language} onChange={(e) => setLanguage(e.target.value as any, true)} className="bg-transparent text-foreground text-[11px] sm:text-xs font-medium focus:outline-none cursor-pointer">
        <option value="es" className="bg-background text-foreground">ES</option>
        <option value="en" className="bg-background text-foreground">EN</option>
        <option value="pt" className="bg-background text-foreground">PT</option>
      </select>
    </div>
  );

  const [selectedSportId, setSelectedSportId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_sport_id");
      return saved ? Number(saved) : null;
    }
    return null;
  });

  useEffect(() => {
    const handleSportChange = (e?: any) => {
      const id = e?.detail ?? (localStorage.getItem("selected_sport_id") ? Number(localStorage.getItem("selected_sport_id")) : null);
      setSelectedSportId(id);
    };

    window.addEventListener("sport_changed", handleSportChange);
    window.addEventListener("storage", handleSportChange);
    return () => {
      window.removeEventListener("sport_changed", handleSportChange);
      window.removeEventListener("storage", handleSportChange);
    };
  }, []);

  const activeSports = useMemo(() => {
    const sports = (club as any)?.sports?.filter((s: any) => s.active !== false) || [];
    return [...sports].sort((a: any, b: any) => {
      const order: Record<string, number> = { padel: 1, tenis: 2, futbol: 3 };
      return (order[a.slug] || 99) - (order[b.slug] || 99);
    });
  }, [club]);

  const currentSport = useMemo(() => {
    if (selectedSportId) {
      const found = activeSports.find((s: any) => s.id === selectedSportId);
      if (found) return found;
    }
    // Por defecto en club multideporte, priorizar Pádel o deportes de raqueta
    return (
      activeSports.find((s: any) => s.slug === "padel") ||
      activeSports.find((s: any) => s.slug === "tenis" || s.useSets) ||
      activeSports[0]
    );
  }, [activeSports, selectedSportId]);

  const hasRacketSports = activeSports.some(
    (s: any) => s.slug === "padel" || s.slug === "tenis" || s.useSets
  );

  const isCurrentSportFootball =
    currentSport?.slug === "futbol" ||
    currentSport?.name?.toLowerCase().includes("fútbol");

  const isCurrentSportRacket =
    currentSport?.slug === "padel" ||
    currentSport?.slug === "tenis" ||
    currentSport?.useSets;

  // REGLA CRÍTICA:
  // Al seleccionar un club con multideporte, cuando se escoge Pádel o Tenis:
  // ¡PAREJAS NO DEBE DESAPARECER!
  // Solo se oculta si no es raqueta y se está explícitamente en fútbol.
  const shouldHideParejas =
    !isCurrentSportRacket &&
    (isCurrentSportFootball || (!hasRacketSports && (club as any)?.isFootball));

  const activeNavItems = navItems.filter((item) => !(shouldHideParejas && item.href === "/parejas"));

  const switchSport = (sportId: number) => {
    setSelectedSportId(sportId);
    localStorage.setItem("selected_sport_id", String(sportId));
    window.dispatchEvent(new CustomEvent("sport_changed", { detail: sportId }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden w-full max-w-full" style={dynamicStyles as React.CSSProperties}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full overflow-x-hidden">
        {/* Fila 1: Marca del Club y Perfil de Usuario */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-13 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 tracking-tight shrink min-w-0 whitespace-nowrap overflow-hidden">
            {club?.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-background/80 border border-border/60 p-0.5 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center text-primary font-black text-xs sm:text-sm shadow-sm shrink-0">
                {(club?.name ? club.name.trim().slice(0, 2).toUpperCase() : "CP")}
              </div>
            )}
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-foreground font-black text-xs sm:text-sm md:text-base tracking-tight truncate max-w-[120px] sm:max-w-[240px] md:max-w-[320px]">
                  {club?.name || "Club Pádel"}
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  Secretario IA
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <span className="opacity-75">powered by</span>
                <span className="font-semibold text-foreground/80">Parryn Sport Hub</span>
                <span className="text-[9px] font-bold bg-primary/20 text-primary px-1 py-0.2 rounded border border-primary/30">IA</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {activeSports.length > 1 && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/60 border border-border p-0.5 rounded-lg shrink-0">
                {activeSports.map((s: any) => {
                  const isSelected = currentSport?.id === s.id;
                  const icon = s.slug === "padel" ? "🏸" : s.slug === "tenis" ? "🎾" : "⚽";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => switchSport(s.id)}
                      className={cn(
                        "px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}
                      title={`Cambiar a ${s.name}`}
                    >
                      <span>{icon}</span>
                      <span className="hidden sm:inline">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <LanguageSelector />
            <AuthButton />
            {!isPublicClubRoute && (
              <button
                className="md:hidden p-1.5 sm:p-2 rounded-md hover:bg-muted/50 text-foreground cursor-pointer"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Barra de Navegación Principal */}
        {!isPublicClubRoute && (
          <div className="hidden md:block border-t border-border/60 bg-muted/20">
            <div className="max-w-7xl mx-auto px-4 flex items-center gap-1.5 py-1.5 overflow-x-auto">
              {activeNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                    location === item.href
                      ? "bg-primary/15 text-primary font-bold shadow-xs border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <item.icon size={14} />
                  {t(item.key)}
                </Link>
              ))}

              {/* Enlace elegante a Secretaría */}
              <Link
                href="/secretario"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ml-auto",
                  location === "/secretario"
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Sparkles size={13} className="text-primary/70" />
                <span>Secretaría</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0",
                    location === "/admin"
                      ? "bg-purple-500/25 text-purple-300 border border-purple-500/40"
                      : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20"
                  )}
                >
                  <Shield size={14} className="text-purple-400" />
                  {t("adminPanel")}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Menú Desplegable Móvil */}
        {mobileOpen && !isPublicClubRoute && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-2 shadow-lg">
            {activeSports.length > 1 && (
              <div className="p-2 bg-muted/40 rounded-lg border border-border space-y-1 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Deporte Activo</span>
                <div className="grid grid-cols-3 gap-1">
                  {activeSports.map((s: any) => {
                    const isSelected = currentSport?.id === s.id;
                    const icon = s.slug === "padel" ? "🏸" : s.slug === "tenis" ? "🎾" : "⚽";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { switchSport(s.id); setMobileOpen(false); }}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "bg-background border border-border text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{icon}</span>
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {activeNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === item.href
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon size={16} />
                {t(item.key)}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === "/admin"
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                )}
              >
                <Shield size={16} className="text-purple-400" />
                {t("adminPanel")}
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">{children}</main>

      <footer className="mt-auto border-t border-border bg-muted/30 py-4 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {club?.name || "Club Pádel"} • Plataforma de Gestión Deportiva.</p>
          {club?.address && <span className="flex items-center gap-1 font-medium bg-background border border-border px-2 py-1 rounded-md shadow-sm"><MapPin size={12} className="text-primary" /> {club.address}</span>}
        </div>
      </footer>

      {!isPublicClubRoute && (
        <>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur flex items-center justify-around z-40 h-14 px-1 shadow-lg">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors",
                location === "/" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutDashboard size={18} />
              <span className="text-[10px] leading-tight truncate">{t("dashboard")}</span>
            </Link>

            <Link
              href="/ranking"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors",
                location === "/ranking" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Trophy size={18} />
              <span className="text-[10px] leading-tight truncate">{t("ranking")}</span>
            </Link>

            <Link
              href="/encuentros"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors",
                location === "/encuentros" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar size={18} />
              <span className="text-[10px] leading-tight truncate">{t("encuentros")}</span>
            </Link>

            <Link
              href="/jugadores"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors",
                location === "/jugadores" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users size={18} />
              <span className="text-[10px] leading-tight truncate">{t("players")}</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                mobileOpen ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="text-[10px] leading-tight truncate">{mobileOpen ? "Cerrar" : "Más"}</span>
            </button>
          </nav>
          <div className="md:hidden h-16" />
        </>
      )}
    </div>
  );
}
