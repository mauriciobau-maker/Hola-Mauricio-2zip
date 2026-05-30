import { Link } from "wouter";
import { useListPlayers, useDeletePlayer, getListPlayersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronRight, Users, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-emerald-500/20 text-emerald-400",
  "bg-blue-500/20 text-blue-400",
  "bg-purple-500/20 text-purple-400",
  "bg-orange-500/20 text-orange-400",
  "bg-pink-500/20 text-pink-400",
  "bg-cyan-500/20 text-cyan-400",
];

export default function Jugadores() {
  const { data: players, isLoading } = useListPlayers();
  const queryClient = useQueryClient();
  const deleteMutation = useDeletePlayer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
      },
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Eliminar a ${name}? Esta accion no se puede deshacer.`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jugadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {players?.length ?? 0} jugador{(players?.length ?? 0) !== 1 ? "es" : ""} registrado{(players?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/jugadores/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Nuevo
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !players?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Users size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Sin jugadores aun</p>
            <p className="text-sm text-muted-foreground">Crea el primer jugador para empezar</p>
          </div>
          <Link
            href="/jugadores/nuevo"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Crear jugador
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {players.map((player, idx) => (
            <div key={player.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                avatarColors[idx % avatarColors.length]
              )}>
                {initials(player.name)}
              </div>
              <Link href={`/jugadores/${player.id}`} className="flex-1 min-w-0">
                <p className="font-medium text-sm">{player.name}</p>
                {player.nickname && (
                  <p className="text-xs text-muted-foreground">&quot;{player.nickname}&quot;</p>
                )}
              </Link>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/jugadores/${player.id}/editar`}
                  className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil size={14} />
                </Link>
                <button
                  onClick={() => handleDelete(player.id, player.name)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={14} />
                </button>
                <Link href={`/jugadores/${player.id}`} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
