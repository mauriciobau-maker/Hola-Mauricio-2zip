import { useParams, Link } from "wouter";
import { useGetParejaDetail } from "@workspace/api-client-react";
import type { Match } from "@workspace/api-client-react";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Handshake,
  Calendar,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StatBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-muted/30 rounded-lg p-3">
      <span
        className={cn(
          "text-xl font-bold tabular-nums",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function EloChip({ change, after }: { change: number; after: number }) {
  const positive = change > 0;
  const neutral = change === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
        positive
          ? "bg-primary/10 text-primary"
          : neutral
          ? "bg-muted text-muted-foreground"
          : "bg-red-500/10 text-red-400"
      )}
    >
      {positive ? <TrendingUp size={10} /> : neutral ? <Minus size={10} /> : <TrendingDown size={10} />}
      {positive ? `+${change}` : change} ({after})
    </span>
  );
}

function MatchCard({
  match,
  pairIds,
}: {
  match: Match;
  pairIds: [number, number];
}) {
  const [pid1, pid2] = pairIds;
  const t1Ids = [match.team1Player1Id, match.team1Player2Id].sort((a, b) => a - b);
  const isPairTeam1 = t1Ids[0] === pid1 && t1Ids[1] === pid2;
  const team1Won = match.team1SetsWon > match.team2SetsWon;
  const pairWon = isPairTeam1 ? team1Won : !team1Won;

  const pairName1 = isPairTeam1 ? match.team1Player1Name : match.team2Player1Name;
  const pairName2 = isPairTeam1 ? match.team1Player2Name : match.team2Player2Name;
  const rivalName1 = isPairTeam1 ? match.team2Player1Name : match.team1Player1Name;
  const rivalName2 = isPairTeam1 ? match.team2Player2Name : match.team1Player2Name;

  const pairSets = isPairTeam1 ? match.team1SetsWon : match.team2SetsWon;
  const rivalSets = isPairTeam1 ? match.team2SetsWon : match.team1SetsWon;

  const date = new Date(match.playedAt);
  const dateStr = date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Elo changes for this pair's players
  const pairEloChanges = (match.eloChanges ?? []).filter(
    (e) => e.playerId === pid1 || e.playerId === pid2
  );

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4 space-y-3",
        pairWon ? "border-primary/20" : "border-red-500/20"
      )}
    >
      {/* Header: result badge + date */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
            pairWon
              ? "bg-primary/15 text-primary"
              : "bg-red-500/15 text-red-400"
          )}
        >
          {pairWon ? "Victoria" : "Derrota"}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar size={11} />
          {dateStr}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2 text-sm">
        {/* Pair (us) */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {pairName1} / {pairName2}
          </p>
          <p className="text-[11px] text-muted-foreground">Nuestra pareja</p>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1.5 text-center flex-shrink-0">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums w-6",
              pairWon ? "text-primary" : "text-muted-foreground"
            )}
          >
            {pairSets}
          </span>
          <span className="text-muted-foreground text-sm">-</span>
          <span
            className={cn(
              "text-2xl font-bold tabular-nums w-6",
              !pairWon ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {rivalSets}
          </span>
        </div>

        {/* Rivals */}
        <div className="flex-1 min-w-0 text-right">
          <p className="font-semibold text-foreground truncate">
            {rivalName1} / {rivalName2}
          </p>
          <p className="text-[11px] text-muted-foreground">Rivales</p>
        </div>
      </div>

      {/* Sets detail */}
      {match.sets && match.sets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {match.sets.map((s) => {
            const pairGames = isPairTeam1 ? s.team1Games : s.team2Games;
            const rivalGames = isPairTeam1 ? s.team2Games : s.team1Games;
            const setWon = pairGames > rivalGames;
            return (
              <span
                key={s.setNumber}
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md tabular-nums",
                  setWon
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {pairGames}-{rivalGames}
              </span>
            );
          })}
        </div>
      )}

      {/* Elo changes */}
      {pairEloChanges.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
          {pairEloChanges.map((e) => (
            <div key={e.playerId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">{e.playerName.split(" ")[0]}</span>
              <EloChip change={e.eloChange} after={e.eloAfter} />
            </div>
          ))}
        </div>
      )}

      {/* Link to full match */}
      <div className="pt-1">
        <Link href={`/partidos/${match.id}/editar`} className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
          Ver partido completo →
        </Link>
      </div>
    </div>
  );
}

export default function ParejaDetalle() {
  const params = useParams<{ player1Id: string; player2Id: string }>();
  const pid1 = parseInt(params.player1Id ?? "0", 10);
  const pid2 = parseInt(params.player2Id ?? "0", 10);

  // Always pass sorted IDs to the API
  const sortedId1 = Math.min(pid1, pid2);
  const sortedId2 = Math.max(pid1, pid2);

  const { data, isLoading, isError } = useGetParejaDetail(sortedId1, sortedId2);

  const stats = data?.stats;
  const matches = data?.matches ?? [];

  const gameDiffColor =
    (stats?.gameDiff ?? 0) > 0
      ? "text-primary"
      : (stats?.gameDiff ?? 0) < 0
      ? "text-red-400"
      : "text-muted-foreground";
  const GameDiffIcon =
    (stats?.gameDiff ?? 0) > 0
      ? TrendingUp
      : (stats?.gameDiff ?? 0) < 0
      ? TrendingDown
      : Minus;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/parejas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Volver a Parejas
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-32 bg-card rounded-xl border border-border animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-card rounded-lg border border-border animate-pulse" />
            ))}
          </div>
        </div>
      ) : isError || !stats ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Handshake size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Pareja no encontrada</p>
            <p className="text-sm text-muted-foreground">
              Esta pareja no tiene partidos registrados juntos
            </p>
          </div>
          <Link href="/parejas" className="text-sm text-primary underline underline-offset-2">
            Ver todas las parejas
          </Link>
        </div>
      ) : (
        <>
          {/* Pair header card */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-4">
              {/* Avatars */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/jugadores/${stats.player1Id}`}>
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-sm font-bold text-primary hover:bg-primary/30 transition-colors cursor-pointer">
                    {initials(stats.player1Name)}
                  </div>
                </Link>
                <div className="flex flex-col items-center">
                  <Handshake size={14} className="text-muted-foreground" />
                </div>
                <Link href={`/jugadores/${stats.player2Id}`}>
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-sm font-bold text-primary hover:bg-primary/30 transition-colors cursor-pointer">
                    {initials(stats.player2Name)}
                  </div>
                </Link>
              </div>

              {/* Names */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight leading-tight">
                  {stats.player1Nickname ?? stats.player1Name.split(" ")[0]}
                  {" / "}
                  {stats.player2Nickname ?? stats.player2Name.split(" ")[0]}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {stats.player1Name} · {stats.player2Name}
                </p>
              </div>

              {/* Elo avg */}
              <div className="flex-shrink-0 text-right">
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">Elo promedio</p>
                  <p className="text-xl font-bold text-primary tabular-nums">{stats.avgElo}</p>
                </div>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={cn(
                    "font-bold text-lg tabular-nums",
                    stats.winRate >= 60
                      ? "text-primary"
                      : stats.winRate >= 40
                      ? "text-yellow-500"
                      : "text-red-400"
                  )}
                >
                  {stats.winRate}% victorias
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {stats.wins}V · {stats.losses}D · {stats.totalMatches} partidos
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stats.winRate >= 60
                      ? "bg-primary"
                      : stats.winRate >= 40
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${stats.winRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Sets ganados" value={stats.setsWon} highlight />
            <StatBox label="Sets perdidos" value={stats.setsLost} />
            <StatBox label="Games ganados" value={stats.gamesWon} highlight />
            <StatBox label="Games perdidos" value={stats.gamesLost} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatBox
              label="Diferencia games"
              value={
                (stats.gameDiff > 0 ? "+" : "") + stats.gameDiff
              }
              highlight={stats.gameDiff > 0}
            />
            <StatBox label="Sets ratio" value={`${stats.setsWon}/${stats.setsLost}`} />
            <StatBox label="Games ratio" value={`${stats.gamesWon}/${stats.gamesLost}`} />
          </div>

          {/* Match history */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Historial de partidos — {matches.length} {matches.length === 1 ? "partido" : "partidos"}
              </h2>
            </div>
            <div className="space-y-3">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  pairIds={[sortedId1, sortedId2]}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
