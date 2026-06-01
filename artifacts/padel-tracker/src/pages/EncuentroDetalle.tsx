import { useGetEncuentro, useRespondEncuentro } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays, MapPin, Users, Check, X, Clock,
  Trash2, ArrowLeft, Edit,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmo",
    icon: Check,
    badge: "default" as const,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  declined: {
    label: "No puedo",
    icon: X,
    badge: "destructive" as const,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
  },
  pending: {
    label: "Pendiente",
    icon: Clock,
    badge: "secondary" as const,
    color: "text-muted-foreground",
    bg: "bg-white/5",
  },
};

export function EncuentroDetalle() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useGetEncuentro(id);
  const rsvpMutation = useRespondEncuentro();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-60 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Encuentro no encontrado.</p>
        <Button variant="link" onClick={() => navigate("/encuentros")}>Volver</Button>
      </div>
    );
  }

  const { encuentro, asistencia } = data;
  const date = new Date(encuentro.dateTime);
  const isOrganizer = user?.id === encuentro.organizerId;
  const myEntry = asistencia.find((a) => a.playerId === user?.playerId);
  const confirmedCount = asistencia.filter((a) => a.status === "confirmed").length;
  const declinedCount = asistencia.filter((a) => a.status === "declined").length;
  const pendingCount = asistencia.filter((a) => a.status === "pending").length;

  async function handleRsvp(status: "confirmed" | "declined" | "pending") {
    await rsvpMutation.mutateAsync({ id, data: { status } });
    await queryClient.invalidateQueries({ queryKey: [`/encuentros/${id}`] });
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este encuentro?")) return;
    await fetch(`/api/encuentros/${id}`, { method: "DELETE", credentials: "include" });
    navigate("/encuentros");
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/encuentros")} className="-ml-2 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{encuentro.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {format(date, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {encuentro.location}
            </span>
            {encuentro.maxSpots && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Máx. {encuentro.maxSpots} jugadores
              </span>
            )}
          </div>
          {encuentro.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">{encuentro.notes}</p>
          )}
        </div>
        {isOrganizer && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mi RSVP */}
      {user && user.playerId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tu respuesta</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              {(["confirmed", "declined", "pending"] as const).map((status) => {
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                const isActive = myEntry?.status === status;
                return (
                  <Button
                    key={status}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`gap-2 flex-1 ${isActive ? "" : "border-white/10"}`}
                    onClick={() => handleRsvp(status)}
                    disabled={rsvpMutation.isPending}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : user && !user.playerId ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 px-4 text-sm text-amber-400">
            Vincula tu cuenta a un jugador para poder confirmar asistencia.{" "}
            <button onClick={() => navigate("/vincular")} className="underline font-medium">
              Vincular ahora
            </button>
          </CardContent>
        </Card>
      ) : null}

      {/* Resumen de asistencia */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Confirman" count={confirmedCount} color="text-emerald-400" />
        <SummaryCard label="No pueden" count={declinedCount} color="text-red-400" />
        <SummaryCard label="Pendientes" count={pendingCount} color="text-muted-foreground" />
      </div>

      {/* Lista de asistencia */}
      {asistencia.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jugadores ({asistencia.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {asistencia.map((entry) => {
              const cfg = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const initials = entry.playerName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${cfg.bg}`}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-white/10">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.playerName}</p>
                    {entry.playerNickname && (
                      <p className="text-xs text-muted-foreground">"{entry.playerNickname}"</p>
                    )}
                  </div>
                  <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Card className="text-center py-3">
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Card>
  );
}
