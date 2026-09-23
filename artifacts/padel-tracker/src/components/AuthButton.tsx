import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Link } from "lucide-react";
import { useLocation } from "wouter";

export function AuthButton() {
  const { user, isLoading, login, logout } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button size="sm" variant="outline" onClick={() => login()} className="gap-2 border-white/20 text-white hover:bg-white/10">
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Entrar</span>
      </Button>
    );
  }

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((s) => s![0])
    .join("") || user.email?.[0]?.toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={initials} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
        </div>
        <DropdownMenuSeparator />
        {!user.playerId && (
          <DropdownMenuItem onClick={() => navigate("/vincular")} className="gap-2 cursor-pointer">
            <Link className="h-4 w-4" />
            Vincular jugador
          </DropdownMenuItem>
        )}
        {user.playerId && (
          <DropdownMenuItem onClick={() => navigate(`/jugadores/${user.playerId}`)} className="gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Mi perfil
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
