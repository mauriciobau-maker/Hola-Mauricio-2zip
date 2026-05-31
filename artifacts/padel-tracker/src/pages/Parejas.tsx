import { useState, useMemo } from "react";
import { useListParejas } from "@workspace/api-client-react";
import type { ParejaStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Handshake, Search, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          rate >= 60 ? "bg-primary" : rate >= 40 ? "bg-yellow-500" : "bg-red-500"
        )}
        style={{ width: `${rate}%` }}
      />
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function ParejaCard({ pareja, rank }: { pareja: ParejaStats; rank: number }) {
  const isTop = rank <= 3;
  const medalColors: Record<number, string> = {
    1: "text-yellow-400",
    2: "text-slate-300",
    3: "text-orange-400",
  };

  const gameDiffColor =
    pareja.gameDiff > 0 ? "text-primary" : pareja.gameDiff < 0 ? "text-red-400" : "text-muted-foreground";
  const GameDiffIcon =
    pareja.gameDiff > 0 ? TrendingUp : pareja.gameDiff < 0 ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-4 space-y-3 transition-all hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5",
        isTop && "border-primary/20"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 text-center">
          {isTop ? (
            <Trophy size={18} className={medalColors[rank]} />
          ) : (
            <span className="text-sm text-muted-foreground font-medium">#{rank}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Player 1 avatar */}
            <div className="flex items-center gap-1.5">
              <Link href={`/jugadores/${pareja.player1Id}`}>
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary/30 transition-colors cursor-pointer">
                  {initials(pareja.player1Name)}
                </div>
              </Link>
              <Link href={`/jugadores/${pareja.player1Id}`}>
                <span className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer">
                  {pareja.player1Nickname ?? pareja.player1Name.split(" ")[0]}
                </span>
              </Link>
            </div>

            <span className="text-muted-foreground text-xs font-medium">+</span>

            {/* Player 2 avatar */}
            <div className="flex items-center gap-1.5">
              <Link href={`/jugadores/${pareja.player2Id}`}>
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary/30 transition-colors cursor-pointer">
                  {initials(pareja.player2Name)}
                </div>
              </Link>
              <Link href={`/jugadores/${pareja.player2Id}`}>
                <span className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer">
                  {pareja.player2Nickname ?? pareja.player2Name.split(" ")[0]}
                </span>
              </Link>
            </div>

            <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-md px-2 py-0.5">
              <span className="text-xs text-muted-foreground">Elo avg</span>
              <span className="text-xs font-bold text-primary">{pareja.avgElo}</span>
            </div>
          </div>

          {/* Names full */}
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {pareja.player1Name} · {pareja.player2Name}
          </p>
        </div>
      </div>

      {/* Win rate bar */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            pareja.winRate >= 60 ? "text-primary" : pareja.winRate >= 40 ? "text-yellow-500" : "text-red-400"
          )}
        >
          {pareja.winRate}%
        </span>
        <div className="flex-1">
          <WinRateBar rate={pareja.winRate} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {pareja.wins}V · {pareja.losses}D
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-2 pt-1 border-t border-border/50">
        <StatCell label="Partidos" value={pareja.totalMatches} />
        <StatCell label="Sets G/P" value={`${pareja.setsWon}/${pareja.setsLost}`} />
        <StatCell label="Games G" value={pareja.gamesWon} />
        <StatCell label="Games P" value={pareja.gamesLost} />
        <div className="flex flex-col items-center gap-0.5">
          <span className={cn("text-sm font-semibold tabular-nums flex items-center gap-0.5", gameDiffColor)}>
            <GameDiffIcon size={12} />
            {pareja.gameDiff > 0 ? `+${pareja.gameDiff}` : pareja.gameDiff}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Dif G</span>
        </div>
      </div>
    </div>
  );
}

const MIN_MATCHES_FOR_RANKING = 1;

export default function Parejas() {
  const { data: parejas, isLoading } = useListParejas();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!parejas) return [];
    const q = search.toLowerCase().trim();
    return parejas.filter((p) => {
      if (!q) return true;
      return (
        p.player1Name.toLowerCase().includes(q) ||
        p.player2Name.toLowerCase().includes(q) ||
        (p.player1Nickname ?? "").toLowerCase().includes(q) ||
        (p.player2Nickname ?? "").toLowerCase().includes(q)
      );
    });
  }, [parejas, search]);

  const ranked = useMemo(
    () => filtered.filter((p) => p.totalMatches >= MIN_MATCHES_FOR_RANKING),
    [filtered]
  );

  const unranked = useMemo(
    () => filtered.filter((p) => p.totalMatches < MIN_MATCHES_FOR_RANKING),
    [filtered]
  );

  // Top 3 for podium (only from all data, no search filter)
  const top3 = useMemo(
    () => (parejas ?? []).filter((p) => p.totalMatches >= MIN_MATCHES_FOR_RANKING).slice(0, 3),
    [parejas]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parejas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Estadísticas de todas las combinaciones de jugadores
          </p>
        </div>
        {parejas && (
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{parejas.length}</span>
            <p className="text-xs text-muted-foreground">parejas activas</p>
          </div>
        )}
      </div>

      {/* Podium top 3 */}
      {!isLoading && top3.length === 3 && !search && (
        <div className="grid grid-cols-3 gap-3">
          <TopPodiumCard pareja={top3[1]} rank={2} />
          <TopPodiumCard pareja={top3[0]} rank={1} isFirst />
          <TopPodiumCard pareja={top3[2]} rank={3} />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre de jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
        />
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Handshake size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">
              {search ? "No se encontraron parejas" : "Sin partidos registrados"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? "Prueba con otro nombre" : "Registra partidos para ver estadísticas de parejas"}
            </p>
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-sm text-primary underline underline-offset-2"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ranking */}
          {ranked.length > 0 && (
            <div>
              {!search && (
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Ranking — Top {Math.min(ranked.length, 20)} parejas
                  </h2>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ranked.slice(0, 20).map((p, i) => {
                  // Find global rank from original sorted list
                  const globalRank =
                    (parejas ?? [])
                      .filter((x) => x.totalMatches >= MIN_MATCHES_FOR_RANKING)
                      .findIndex(
                        (x) => x.player1Id === p.player1Id && x.player2Id === p.player2Id
                      ) + 1;
                  return <ParejaCard key={`${p.player1Id}_${p.player2Id}`} pareja={p} rank={globalRank || i + 1} />;
                })}
              </div>
            </div>
          )}

          {/* Unranked */}
          {unranked.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Sin partidos suficientes
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unranked.map((p, i) => (
                  <ParejaCard key={`${p.player1Id}_${p.player2Id}`} pareja={p} rank={ranked.length + i + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopPodiumCard({
  pareja,
  rank,
  isFirst,
}: {
  pareja: ParejaStats;
  rank: number;
  isFirst?: boolean;
}) {
  const medalColors: Record<number, string> = {
    1: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    2: "text-slate-300 border-slate-300/30 bg-slate-300/5",
    3: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  };
  const medalEmoji: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex flex-col items-center gap-2 text-center",
        medalColors[rank],
        isFirst && "ring-1 ring-yellow-400/20"
      )}
    >
      <span className="text-lg">{medalEmoji[rank]}</span>

      <div className="flex items-center gap-1">
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary">
          {initials(pareja.player1Name)}
        </div>
        <span className="text-[10px] text-muted-foreground">+</span>
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary">
          {initials(pareja.player2Name)}
        </div>
      </div>

      <div className="text-xs font-semibold leading-tight">
        {pareja.player1Nickname ?? pareja.player1Name.split(" ")[0]}
        {" / "}
        {pareja.player2Nickname ?? pareja.player2Name.split(" ")[0]}
      </div>

      <div className={cn("text-base font-bold", rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-300" : "text-orange-400")}>
        {pareja.winRate}%
      </div>
      <div className="text-[10px] text-muted-foreground">
        {pareja.wins}V · {pareja.losses}D · {pareja.totalMatches}P
      </div>
    </div>
  );
}
