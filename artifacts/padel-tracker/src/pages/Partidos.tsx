import { Link } from "wouter";
import { useListMatches, useDeleteMatch, getListMatchesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Partidos() {
  const { data: matches, isLoading } = useListMatches();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteMatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
      },
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Eliminar este partido? Esta accion no se puede deshacer.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {matches?.length ?? 0} partido{(matches?.length ?? 0) !== 1 ? "s" : ""} registrado{(matches?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/partidos/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Registrar
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !matches?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Calendar size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Sin partidos aun</p>
            <p className="text-sm text-muted-foreground">Registra el primer partido para empezar</p>
          </div>
          <Link
            href="/partidos/nuevo"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Registrar partido
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const team1Won = m.team1SetsWon > m.team2SetsWon;
            const sets = m.sets as Array<{ setNumber: number; team1Games: number; team2Games: number }>;
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 hover:bg-card/80 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Team 1 */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded",
                        team1Won ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {team1Won ? "GANADOR" : "PERDEDOR"}
                      </span>
                      <p className="text-sm font-medium truncate">
                        {m.team1Player1Name} / {m.team1Player2Name}
                      </p>
                    </div>
                    {/* Team 2 */}
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded",
                        !team1Won ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {!team1Won ? "GANADOR" : "PERDEDOR"}
                      </span>
                      <p className="text-sm font-medium truncate">
                        {m.team2Player1Name} / {m.team2Player2Name}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">
                        <span className={team1Won ? "text-primary" : "text-muted-foreground"}>{m.team1SetsWon}</span>
                        <span className="text-muted-foreground mx-1 text-lg">-</span>
                        <span className={!team1Won ? "text-primary" : "text-muted-foreground"}>{m.team2SetsWon}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">sets</p>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Sets detail */}
                {sets && sets.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    {sets.map((s) => (
                      <div key={s.setNumber} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                          Set {s.setNumber}: {s.team1Games}-{s.team2Games}
                        </span>
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(m.playedAt)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
