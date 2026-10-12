import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetRanking } from "@workspace/api-client-react";
import { Trophy, Medal, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Ranking() {
  const { t } = useLanguage();
  const { data: ranking, isLoading } = useGetRanking();
  const [club, setClub] = useState<any>(null);

  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClub(d))
      .catch(() => {});
  }, []);

  const isFootball =
    club?.isFootball ||
    club?.sports?.some((s: any) => s.slug === "futbol" || s.name?.toLowerCase().includes("fútbol")) ||
    (ranking as any)?.[0]?.isFootball ||
    (ranking as any)?.[0]?.sportSlug === "futbol" ||
    (ranking as any)?.[0]?.sportName?.toLowerCase().includes("fútbol");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isFootball ? "Tabla de Posiciones" : t("ranking.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isFootball ? "Clasificación oficial de la liga por puntos, partidos y efectividad." : t("ranking.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !ranking?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Trophy size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">{t("ranking.noData")}</p>
            <p className="text-sm text-muted-foreground">{t("ranking.noDataDesc")}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {ranking.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              <PodiumCard entry={ranking[1]} isFootball={isFootball} />
              <PodiumCard entry={ranking[0]} isFirst isFootball={isFootball} />
              <PodiumCard entry={ranking[2]} isFootball={isFootball} />
            </div>
          )}

          {/* Full table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isFootball ? (
              <div className="grid grid-cols-12 gap-1 md:gap-2 px-3 md:px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">{t("ranking.pos")}</div>
                <div className="col-span-4">{t("ranking.player")}</div>
                <div className="col-span-2 text-center text-primary">PTS</div>
                <div className="col-span-1 text-center">PJ</div>
                <div className="col-span-1 text-center text-green-400">PG</div>
                <div className="col-span-1 text-center text-yellow-400">PE</div>
                <div className="col-span-2 text-center">% Efic.</div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">{t("ranking.pos")}</div>
                <div className="col-span-4">{t("ranking.player")}</div>
                <div className="col-span-3 text-center">Elo</div>
                <div className="col-span-1 text-center">{t("ranking.wins")}</div>
                <div className="col-span-1 text-center">{t("ranking.losses")}</div>
                <div className="col-span-2 text-center">{t("ranking.winRate")}</div>
              </div>
            )}
            <div className="divide-y divide-border">
              {ranking.map((entry: any) => (
                <Link
                  key={entry.playerId}
                  href={`/jugadores/${entry.playerId}`}
                  className="grid grid-cols-12 gap-1 md:gap-2 px-3 md:px-4 py-3 items-center hover:bg-muted/20 transition-colors"
                >
                  <div className="col-span-1">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {initials(entry.playerName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.playerName}</p>
                      {entry.nickname && (
                        <p className="text-xs text-muted-foreground truncate">&quot;{entry.nickname}&quot;</p>
                      )}
                    </div>
                  </div>

                  {isFootball ? (
                    <>
                      <div className="col-span-2 text-center">
                        <PointsDisplay points={entry.points ?? 0} />
                      </div>
                      <div className="col-span-1 text-center text-sm font-medium text-foreground/80">
                        {entry.totalMatches ?? (entry.wins + entry.losses + (entry.draws || 0))}
                      </div>
                      <div className="col-span-1 text-center text-sm text-green-400 font-medium">
                        {entry.wins}
                      </div>
                      <div className="col-span-1 text-center text-sm text-yellow-400 font-medium">
                        {entry.draws ?? 0}
                      </div>
                      <div className="col-span-2 text-center">
                        <WinRateBar rate={entry.winRate} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-3 text-center">
                        <EloDisplay elo={entry.elo} />
                      </div>
                      <div className="col-span-1 text-center text-sm text-green-400 font-medium">{entry.wins}</div>
                      <div className="col-span-1 text-center text-sm text-red-400 font-medium">{entry.losses}</div>
                      <div className="col-span-2 text-center">
                        <WinRateBar rate={entry.winRate} />
                      </div>
                    </>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Rules / Explanation */}
          {isFootball ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚽</span>
                <h3 className="text-sm font-semibold">Sistema de Puntuación de Liga (Fútbol)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">3 Puntos:</strong> Por cada victoria en partido oficial o pichanga.</span>
                </div>
                <div className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">1 Punto:</strong> Por empate oficial entre ambos equipos.</span>
                </div>
                <div className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/70 mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Efectividad:</strong> Porcentaje de rendimiento acumulado por jugador.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                <h3 className="text-sm font-semibold">{t("ranking.howEloWorks")}</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <TrendingUp size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{t("ranking.eloWinLossRule")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{t("ranking.eloDrawRule")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary/50 flex-shrink-0 mt-0.5" />
                  <span>{t("ranking.eloBaseRule")}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PointsDisplay({ points }: { points: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-bold tabular-nums text-primary">{points} pts</span>
    </div>
  );
}

function EloDisplay({ elo }: { elo: number }) {
  const diff = elo - 1500;
  const color =
    diff > 100 ? "text-yellow-400" :
    diff > 0 ? "text-green-400" :
    diff < -100 ? "text-red-400" :
    diff < 0 ? "text-orange-400" :
    "text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-sm font-bold tabular-nums", color)}>{elo}</span>
      {diff !== 0 && (
        <span className={cn("text-xs tabular-nums", diff > 0 ? "text-green-400" : "text-red-400")}>
          {diff > 0 ? "+" : ""}{diff}
        </span>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={16} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={16} className="text-gray-300" />;
  if (rank === 3) return <Medal size={16} className="text-orange-400" />;
  return <span className="text-sm text-muted-foreground font-medium">{rank}</span>;
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-7 text-right">{rate}%</span>
    </div>
  );
}

function PodiumCard({ entry, isFirst = false, isFootball = false }: { entry: any; isFirst?: boolean; isFootball?: boolean }) {
  const colors = {
    1: "border-yellow-500/40 bg-yellow-500/10",
    2: "border-gray-400/40 bg-gray-400/10",
    3: "border-orange-500/40 bg-orange-500/10",
  } as Record<number, string>;

  return (
    <Link
      href={`/jugadores/${entry.playerId}`}
      className={cn(
        "border rounded-xl p-3 text-center flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity",
        colors[entry.rank] ?? "border-border bg-card",
        isFirst && "scale-105 shadow-lg",
      )}
    >
      <RankBadge rank={entry.rank} />
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
        {initials(entry.playerName)}
      </div>
      <p className="text-xs font-semibold truncate max-w-full">{entry.playerName.split(" ")[0]}</p>
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-primary tabular-nums">
          {isFootball ? `${entry.points ?? 0} pts` : entry.elo}
        </span>
        <span className="text-xs text-muted-foreground">
          {isFootball ? "Puntos Liga" : "Elo"}
        </span>
      </div>
    </Link>
  );
}
