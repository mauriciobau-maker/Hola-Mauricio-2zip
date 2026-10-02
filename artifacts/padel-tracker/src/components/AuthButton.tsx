import { useAuth } from "@workspace/replit-auth-web";
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

export function AuthButton() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  const handleLoginAs = async (role: "superadmin" | "colaborador" | "jugador") => {
    try {
      const res = await fetch(`/api/login/demo?as=${role}`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("padel_auth_token", data.token);
          localStorage.setItem("padel_auth_user", JSON.stringify(data.user));
          window.location.reload();
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = `/api/login?as=${role}&returnTo=${encodeURIComponent(window.location.pathname)}`;
  };

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Entrar</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Selecciona cuenta de prueba:</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleLoginAs("superadmin")} className="gap-2.5 cursor-pointer py-2">
            <Shield className="h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Super Administrador</span>
              <span className="text-[10px] text-muted-foreground">mbau73@hotmail.com</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLoginAs("colaborador")} className="gap-2.5 cursor-pointer py-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Colaborador / Admin Club</span>
              <span className="text-[10px] text-muted-foreground">admin.club@padeltracker.com</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLoginAs("jugador")} className="gap-2.5 cursor-pointer py-2">
            <Users className="h-4 w-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Jugador (Carlos Ruiz)</span>
              <span className="text-[10px] text-muted-foreground">jugador@padeltracker.com</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
            O navega libremente en <strong>Modo Invitado</strong>.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const isSuperAdmin = !!(user.isAdmin && user.isAdmin > 0);
  const isClubAdmin = !!(user.isClubAdmin && user.isClubAdmin > 0);
  const roleLabel = isSuperAdmin ? "Super Admin" : isClubAdmin ? "Colaborador Club" : "Jugador";
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
        <Button variant="ghost" className="h-9 px-2 gap-2 rounded-full border border-white/10 hover:bg-white/10">
          <Avatar className="h-7 w-7">
            {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={initials} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-xs font-medium text-white/90 truncate max-w-[120px]">
            {user.firstName || user.email?.split("@")[0]}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleColor}`}>
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
              Rol: {roleLabel}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer font-medium text-purple-400">
            <Shield className="h-4 w-4" />
            Panel Super Admin
          </DropdownMenuItem>
        )}

        {!user.playerId && (
          <DropdownMenuItem onClick={() => navigate("/vincular")} className="gap-2 cursor-pointer">
            <Link className="h-4 w-4" />
            Vincular con ficha de jugador
          </DropdownMenuItem>
        )}

        {user.playerId && (
          <DropdownMenuItem onClick={() => navigate(`/jugadores/${user.playerId}`)} className="gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Mi perfil de jugador
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">Cambiar a otra cuenta de prueba:</DropdownMenuLabel>
        
        {!isSuperAdmin && (
          <DropdownMenuItem onClick={() => handleLoginAs("superadmin")} className="gap-2 cursor-pointer text-xs">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            Cambiar a Super Administrador
          </DropdownMenuItem>
        )}
        {(!isClubAdmin || isSuperAdmin) && (
          <DropdownMenuItem onClick={() => handleLoginAs("colaborador")} className="gap-2 cursor-pointer text-xs">
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            Cambiar a Colaborador / Admin Club
          </DropdownMenuItem>
        )}
        {(isSuperAdmin || isClubAdmin) && (
          <DropdownMenuItem onClick={() => handleLoginAs("jugador")} className="gap-2 cursor-pointer text-xs">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            Cambiar a Jugador (Carlos Ruiz)
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-destructive focus:text-destructive text-xs">
          <LogOut className="h-4 w-4" />
          Cerrar sesión (Modo Invitado)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
