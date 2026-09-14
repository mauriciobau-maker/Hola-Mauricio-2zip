import { Link, useParams } from "wouter";
import {
  useGetPlayer,
  useGetPlayerStats,
  useGetPlayerEloHistory,
  getGetPlayerQueryKey,
  getGetPlayerStatsQueryKey,
  getGetPlayerEloHistoryQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, TrendingUp, TrendingDown, Award, Target, Flame, Pencil, Zap } from "lucide-react";
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
  const { data: eloHistory } = useGetPlayerEloHistory(id, {
    query: { enabled: !!id, queryKey: getGetPlayerEloHistoryQueryKey(id) },
  });

  if (loadingPlayer || loadingStats) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-40 bg-card rounded-xl border border-border" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-card rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Jugador no encontrado</p>
        <Link href="/jugadores" className="text-primary hover:underline text-sm mt-2 block">
          Volver a jugadores
        </Link>
      </div>
    );
  }

  const winRate = stats?.winRate ?? 0;
  const eloDiff = player.elo - 1500;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/jugadores"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
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

      {/* Player card with Elo */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {initials(player.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold">{player.name}</h2>
            {player.nickname && (
              <p className="text-muted-foreground text-sm">&quot;{player.nickname}&quot;</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Miembro desde{" "}
              {new Date(player.createdAt).toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {/* Elo badge */}
          <div className="flex flex-col items-center gap-0.5 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-1">
              <Zap size={12} className="text-primary" />
              <span className="text-xs font-semibold text-primary">ELO</span>
            </div>
            <span className="text-2xl font-bold tabular-nums text-foreground">{player.elo}</span>
            {eloDiff !== 0 && (
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  eloDiff > 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {eloDiff > 0 ? "+" : ""}{eloDiff}
              </span>
            )}
          </div>
        </div>

        {/* Win rate bar */}
        {stats && stats.totalMatches > 0 && (
          <div className="mt-4">
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
          <h3 className="font-semibold text-sm mb-3">Estadísticas de sets</h3>
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

      {/* Elo history */}
      {eloHistory && eloHistory.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Zap size={13} className="text-primary" />
            <h3 className="font-semibold text-sm">Historial Elo</h3>
            <span className="text-xs text-muted-foreground ml-auto">{eloHistory.length} partidos</span>
          </div>
          {/* Mini sparkline */}
          <EloSparkline history={eloHistory as any} />
          {/* List — last 8 entries reversed (most recent first) */}
          <div className="divide-y divide-border">
            {[...eloHistory].reverse().slice(0, 8).map((entry) => {
              const positive = entry.eloChange > 0;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                      positive ? "bg-green-500/15" : "bg-red-500/15"
                    )}
                  >
                    {positive ? (
                      <TrendingUp size={11} className="text-green-400" />
                    ) : (
                      <TrendingDown size={11} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{formatDate(entry.matchPlayedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground tabular-nums">{entry.eloBefore}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold tabular-nums">{entry.eloAfter}</span>
                    <span
                      className={cn(
                        "font-bold tabular-nums w-10 text-right",
                        positive ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {positive ? "+" : ""}{entry.eloChange}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent matches */}
      {stats && (stats.recentMatches ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Últimos partidos</h3>
          </div>
          <div className="divide-y divide-border">
            {(stats.recentMatches ?? []).map((m) => {
              const onTeam1 = m.team1Players.some((p: any) => p.id === id);
              const team1 = m.team1Players.map((p: any) => p.name).join(" / ");
              const team2 = m.team2Players.map((p: any) => p.name).join(" / ");
              const myTeam = onTeam1 ? team1 : team2;
              const rivalTeam = onTeam1 ? team2 : team1;
              const myScore = onTeam1 ? m.team1Score : m.team2Score;
              const rivalScore = onTeam1 ? m.team2Score : m.team1Score;
              const won = onTeam1 ? m.result === "team1" : m.result === "team2";

              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      won ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                    )}
                  >
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
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDate(m.playedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline SVG sparkline for Elo progression */
function EloSparkline({ history }: { history: Array<{ eloAfter: number }> }) {
  const values = history.map((h) => h.eloAfter);
  if (values.length < 2) return null;

  const min = Math.min(...values, 1480);
  const max = Math.max(...values, 1520);
  const range = max - min || 40;
  const W = 300;
  const H = 48;
  const pad = 4;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + ((max - v) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const startLine = `${pad},${pad + ((max - 1500) / range) * (H - pad * 2)}`;
  const endLine = `${W - pad},${pad + ((max - 1500) / range) * (H - pad * 2)}`;

  return (
    <div className="px-4 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
        {/* Baseline at 1500 */}
        <line
          x1={startLine.split(",")[0]}
          y1={startLine.split(",")[1]}
          x2={endLine.split(",")[0]}
          y2={endLine.split(",")[1]}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          opacity="0.4"
        />
        {/* Elo line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="hsl(162 80% 42%)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="2.5"
            fill="hsl(162 80% 42%)"
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
        <span>Inicio</span>
        <span className="text-muted-foreground/50">— 1500 base —</span>
        <span>Ahora</span>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-center",
        accent ? "bg-primary/10 border-primary/20" : "bg-card border-border"
      )}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={cn("text-2xl font-bold", accent && "text-primary")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
