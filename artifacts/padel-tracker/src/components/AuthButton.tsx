import { useAuth } from "@workspace/replit-auth-web";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Link, Shield, Building2, Users, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";

export function AuthButton() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  // Super Admin se oculta para testers y solo se activa para el dueño (por email) o mediante acceso maestro (?admin=master o ?super=1)
  const isMasterAuthorized = typeof window !== "undefined" && (
    window.location.search.includes("admin=master") || 
    window.location.search.includes("super=1") ||
    sessionStorage.getItem("enable_superadmin") === "1"
  );

  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.search.includes("admin=master") || window.location.search.includes("super=1"))) {
      sessionStorage.setItem("enable_superadmin", "1");
    }
  }, []);

  const isOwnerEmail = user?.email === "mbau73@hotmail.com" || user?.email === "mauricio.bau@gmail.com";
  const showSuperAdminOption = isMasterAuthorized || isOwnerEmail;

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  const handleLoginAs = async (role: "superadmin" | "colaborador" | "jugador") => {
    let demoUser: any = null;
    if (role === "jugador") {
      demoUser = {
        id: "demo-jugador-1",
        email: "jugador@padeltracker.com",
        firstName: "Carlos",
        lastName: "Ruiz",
        role: "player",
        isAdmin: 0,
        isClubAdmin: 0,
        clubId: 1
      };
    } else if (role === "colaborador") {
      demoUser = {
        id: "demo-admin-1",
        email: "admin.club@padeltracker.com",
        firstName: "Admin",
        lastName: "Club",
        role: "club_admin",
        isAdmin: 1,
        isClubAdmin: 1,
        clubId: 1
      };
    } else {
      demoUser = {
        id: "demo-superadmin-1",
        email: "mauricio.bau@gmail.com",
        firstName: "Mauricio",
        lastName: "Bau",
        role: "superadmin",
        isAdmin: 2,
        isClubAdmin: 1,
        clubId: 1
      };
    }

    try {
      const res = await fetch(`/api/login/demo?as=${role}`);
      if (res.ok) {
        const data = await res.json();
        if (data.token && data.user) {
          demoUser = data.user;
          localStorage.setItem("padel_auth_token", data.token);
        }
      }
    } catch (e) {
      // Offline or static Vercel fallback
    }

    localStorage.setItem("padel_auth_token", `demo-token-${role}`);
    localStorage.setItem("padel_auth_user", JSON.stringify(demoUser));
    window.dispatchEvent(new CustomEvent("padel_auth_update", { detail: demoUser }));
    window.location.reload();
  };

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 sm:h-9 gap-1 sm:gap-2 px-2 sm:px-3 text-xs border-white/20 text-white hover:bg-white/10">
            <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t("auth.login")}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("auth.selectTestAccount")}</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={() => handleLoginAs("jugador")} className="gap-2.5 cursor-pointer py-2">
            <Users className="h-4 w-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">{t("auth.player")} (Carlos Ruiz)</span>
              <span className="text-[10px] text-muted-foreground">jugador@padeltracker.com</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleLoginAs("colaborador")} className="gap-2.5 cursor-pointer py-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">{t("auth.clubAdmin")}</span>
              <span className="text-[10px] text-muted-foreground">admin.club@padeltracker.com</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleLoginAs("superadmin")} className="gap-2.5 cursor-pointer py-2 border-t border-border/50">
            <Shield className="h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-purple-400">Mauricio Bau ({t("auth.superAdmin")})</span>
              <span className="text-[10px] text-muted-foreground">mauricio.bau@gmail.com</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
            {t("auth.guestNotice")}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const isSuperAdmin = !!(user.isAdmin && user.isAdmin > 0);
  const isClubAdmin = !!(user.isClubAdmin && user.isClubAdmin > 0);
  const roleLabel = isSuperAdmin ? t("auth.superAdmin") : isClubAdmin ? t("auth.clubAdmin") : t("auth.player");
  const roleColor = isSuperAdmin
    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
    : isClubAdmin
    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((s) => s![0])
    .join("") || user.email?.[0]?.toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 sm:h-9 px-1 sm:px-2 gap-1.5 sm:gap-2 rounded-full border border-white/10 hover:bg-white/10">
          <Avatar className="h-6 w-6 sm:h-7 sm:h-7">
            {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={initials} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-xs font-medium text-white/90 truncate max-w-[120px]">
            {user.firstName || user.email?.split("@")[0]}
          </span>
          <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleColor}`}>
            {roleLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold truncate text-foreground">
            {user.firstName} {user.lastName}
          </p>
          {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${roleColor}`}>
              {t("auth.role")}: {roleLabel}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer font-medium text-purple-400">
            <Shield className="h-4 w-4" />
            {t("auth.superAdminPanel")}
          </DropdownMenuItem>
        )}

        {!user.playerId && (
          <DropdownMenuItem onClick={() => navigate("/vincular")} className="gap-2 cursor-pointer">
            <Link className="h-4 w-4" />
            {t("auth.linkPlayer")}
          </DropdownMenuItem>
        )}

        {user.playerId && (
          <DropdownMenuItem onClick={() => navigate(`/jugadores/${user.playerId}`)} className="gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            {t("auth.myProfile")}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">{t("auth.switchAccount")}</DropdownMenuLabel>
        
        {(!isClubAdmin || isSuperAdmin) && (
          <DropdownMenuItem onClick={() => handleLoginAs("colaborador")} className="gap-2 cursor-pointer text-xs">
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            {t("auth.switchToClubAdmin")}
          </DropdownMenuItem>
        )}
        {(isSuperAdmin || isClubAdmin) && (
          <DropdownMenuItem onClick={() => handleLoginAs("jugador")} className="gap-2 cursor-pointer text-xs">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            {t("auth.switchToPlayer")} (Carlos Ruiz)
          </DropdownMenuItem>
        )}
        {showSuperAdminOption && !isSuperAdmin && (
          <DropdownMenuItem onClick={() => handleLoginAs("superadmin")} className="gap-2 cursor-pointer text-xs border-t border-border/50 text-purple-400">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            {t("auth.switchToSuperAdmin")}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-destructive focus:text-destructive text-xs">
          <LogOut className="h-4 w-4" />
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
