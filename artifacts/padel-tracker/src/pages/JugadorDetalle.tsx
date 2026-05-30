import { Link, useParams } from "wouter";
import { useGetPlayer, useGetPlayerStats, getGetPlayerQueryKey, getGetPlayerStatsQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, TrendingUp, Award, Target, Flame, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function JugadorDetalle() {
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);
  const { data: player, isLoading: loadingPlayer } = useGetPlayer(id, {
    query: { enabled: !!id, queryKey: getGetPlayerQueryKey(id) },
  });
  const { data: stats, isLoading: loadingStats } = useGetPlayerStats(id, {
    query: { enabled: !!id, queryKey: getGetPlayerStatsQueryKey(id) },
  });

  if (loadingPlayer || loadingStats) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-40 bg-card rounded-xl border border-border" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card rounded-xl border border-border" />)}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Jugador no encontrado</p>
        <Link href="/jugadores" className="text-primary hover:underline text-sm mt-2 block">Volver a jugadores</Link>
      </div>
    );
  }

  const winRate = stats?.winRate ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/jugadores" className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold flex-1">Perfil del jugador</h1>
        <Link
          href={`/jugadores/${id}/editar`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil size={13} />
          Editar
        </Link>
      </div>

      {/* Player card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {initials(player.name)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{player.name}</h2>
            {player.nickname && (
              <p className="text-muted-foreground text-sm">&quot;{player.nickname}&quot;</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Miembro desde {new Date(player.createdAt).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Win rate bar */}
        {stats && stats.totalMatches > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Porcentaje de victorias</span>
              <span className="text-xs font-semibold text-primary">{winRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            icon={<Award size={16} className="text-yellow-400" />}
            label="Puntos"
            value={stats.points}
            accent
          />
          <StatTile
            icon={<TrendingUp size={16} className="text-primary" />}
            label="Victorias"
            value={stats.wins}
          />
          <StatTile
            icon={<Target size={16} className="text-muted-foreground" />}
            label="Derrotas"
            value={stats.losses}
          />
          <StatTile
            icon={<Flame size={16} className="text-orange-400" />}
            label="Racha actual"
            value={`${stats.currentStreak}V`}
          />
        </div>
      )}

      {/* Sets stats */}
      {stats && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Estadisticas de sets</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{stats.setsWon}</p>
              <p className="text-xs text-muted-foreground">Sets ganados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.setsLost}</p>
              <p className="text-xs text-muted-foreground">Sets perdidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMatches}</p>
              <p className="text-xs text-muted-foreground">Partidos totales</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent matches */}
      {stats && (stats.recentMatches ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Ultimos partidos</h3>
          </div>
          <div className="divide-y divide-border">
            {(stats.recentMatches ?? []).map((m) => {
              const onTeam1 = m.team1Player1Id === id || m.team1Player2Id === id;
              const won = onTeam1 ? m.team1SetsWon > m.team2SetsWon : m.team2SetsWon > m.team1SetsWon;
              const myTeam = onTeam1
                ? `${m.team1Player1Name} / ${m.team1Player2Name}`
                : `${m.team2Player1Name} / ${m.team2Player2Name}`;
              const rivalTeam = onTeam1
                ? `${m.team2Player1Name} / ${m.team2Player2Name}`
                : `${m.team1Player1Name} / ${m.team1Player2Name}`;
              const myScore = onTeam1 ? m.team1SetsWon : m.team2SetsWon;
              const rivalScore = onTeam1 ? m.team2SetsWon : m.team1SetsWon;

              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    won ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                  )}>
                    {won ? "V" : "D"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{myTeam}</p>
                    <p className="text-xs text-muted-foreground truncate">vs {rivalTeam}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold flex-shrink-0">
                    <span className={won ? "text-primary" : "text-muted-foreground"}>{myScore}</span>
                    <span className="text-muted-foreground text-xs">-</span>
                    <span className={!won ? "text-primary" : "text-muted-foreground"}>{rivalScore}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(m.playedAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border p-4 text-center",
      accent ? "bg-primary/10 border-primary/20" : "bg-card border-border"
    )}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={cn("text-2xl font-bold", accent && "text-primary")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
