import { useAuth } from "@workspace/replit-auth-web";
import { useListPlayers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function VincularJugador() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: players, isLoading: playersLoading } = useListPlayers();
  const [, navigate] = useLocation();
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  if (authLoading || playersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <p className="text-muted-foreground">Debes iniciar sesión para vincular tu cuenta.</p>
      </div>
    );
  }

  // 🛡️ VISTA ESPECIAL PARA SUPER ADMIN
  const isSuperAdmin = (user as any)?.role === "superadmin" || (user as any)?.role === "super_admin";
  if (isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Shield className="h-8 w-8" />
          </div>
        </div>
        <h1 className="text-xl font-bold">Modo Super Admin</h1>
        <p className="text-muted-foreground text-sm">
          Como administrador global de la plataforma no necesitas estar vinculado a un perfil de jugador para gestionar el sistema.
        </p>
        <Button onClick={() => navigate("/admin")}>Ir al Panel de Administración</Button>
      </div>
    );
  }

  if (user.playerId) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <p className="text-muted-foreground">Tu cuenta ya está vinculada a un jugador.</p>
        <Button onClick={() => navigate(`/jugadores/${user.playerId}`)}>Ver mi perfil</Button>
      </div>
    );
  }

  async function handleLink(playerId: number) {
    setLinking(true);
    try {
      const res = await fetch("/api/auth/link-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries();
        navigate("/encuentros");
      }
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link className="h-6 w-6 text-primary" />
          Vincular perfil de jugador
        </h1>
        <p className="text-muted-foreground mt-1">
          Selecciona qué jugador eres para poder confirmar asistencia a los encuentros.
        </p>
      </div>

      <div className="grid gap-3">
        {players?.map((player) => (
          <Card key={player.id} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{player.name}</CardTitle>
                  {player.nickname && (
                    <CardDescription className="text-xs">"{player.nickname}"</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    ELO {player.elo}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => handleLink(player.id)}
                    disabled={linking}
                  >
                    Soy yo
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}