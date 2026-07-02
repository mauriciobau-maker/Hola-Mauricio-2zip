import { Link } from "wouter";
import { useGetDashboard, useGetRanking } from "@workspace/api-client-react";
import { Users, Calendar, Trophy, TrendingUp, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingDash } = useGetDashboard();
  const { data: ranking } = useGetRanking();

  if (loadingDash) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-card rounded-xl border border-border" />)}
        </div>
      </div>
    );
  }

  const top5 = (ranking ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Resumen general del club</p>
        </div>
        <Link
          href="/partidos/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Partido
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={18} className="text-primary" />}
          label="Jugadores"
          value={dashboard?.totalPlayers ?? 0}
          href="/jugadores"
        />
        <StatCard
          icon={<Calendar size={18} className="text-chart-2" />}
          label="Partidos"
          value={dashboard?.totalMatches ?? 0}
          href="/partidos"
        />
        <StatCard
          icon={<Trophy size={18} className="text-yellow-400" />}
          label="Líder"
          value={dashboard?.topPlayer?.name ?? "—"}
          sub={dashboard?.topPlayer ? `${dashboard.topPlayer.elo ?? dashboard.topPlayer.points ?? ""} pts` : undefined}
          href="/ranking"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-chart-3" />}
          label="Ranking"
          value={top5.length > 0 ? `${top5.length} activos` : "0"}
          href="/ranking"
        />
      </div>

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent matches */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Últimos Partidos</h2>
            <Link href="/partidos" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          {!dashboard?.recentMatches?.length ? (
            <EmptyState
              message="No hay partidos registrados"
              action={{ label: "Registrar partido", href: "/partidos/nuevo" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {dashboard.recentMatches.map((m: any) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>

        {/* Top ranking */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Top Ranking</h2>
            <Link href="/ranking" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Ver ranking <ChevronRight size={12} />
            </Link>
          </div>
          {!top5.length ? (
            <EmptyState
              message="No hay jugadores registrados"
              action={{ label: "Crear jugador", href: "/jugadores/nuevo" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {top5.map((entry: any) => (
                <Link
                  key={entry.playerId}
                  href={`/jugadores/${entry.playerId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    entry.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                    entry.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                    entry.rank === 3 ? "bg-orange-500/20 text-orange-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {entry.rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                    {initials(entry.playerName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.wins}V / {entry.losses}D{entry.draws > 0 ? ` / ${entry.draws}E` : ""}
                    </p>
                  </div>
                  <span className="font-bold text-primary text-sm">{entry.elo ?? entry.points} pts</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, href }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
}) {
  return (
    <Link href={href} className="bg-card border border-border rounded-xl p-4 hover:bg-card/80 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 rounded-lg bg-muted/50">{icon}</div>
        <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <p className="text-2xl font-bold truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Link>
  );
}

function MatchRow({ match }: { match: any }) {
  const team1Players: Array<{ id: number; name: string }> = match.team1Players ?? [];
  const team2Players: Array<{ id: number; name: string }> = match.team2Players ?? [];
  const team1Won = match.result === "team1";
  const isDraw = match.result === "draw";

  const team1Names = team1Players.map((p) => p.name).join(" / ") || "—";
  const team2Names = team2Players.map((p) => p.name).join(" / ") || "—";

  return (
    <Link href="/partidos" className="block px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-medium truncate", team1Won ? "text-primary" : "text-foreground/70")}>
            {team1Names}
          </p>
          <p className={cn("text-xs truncate", !team1Won && !isDraw ? "text-primary font-medium" : "text-muted-foreground")}>
            {team2Names}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn("text-sm font-bold tabular-nums", team1Won ? "text-primary" : "text-muted-foreground")}>
            {match.team1Score ?? 0}
          </span>
          <span className="text-muted-foreground text-xs">-</span>
          <span className={cn("text-sm font-bold tabular-nums", !team1Won && !isDraw ? "text-primary" : "text-muted-foreground")}>
            {match.team2Score ?? 0}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">{formatDate(match.playedAt)}</p>
        {match.sportName && (
          <span className="text-xs text-muted-foreground/60">{match.sportName}</span>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ message, action }: { message: string; action: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href={action.href}
        className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
      >
        {action.label}
      </Link>
    </div>
  );
}