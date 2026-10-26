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
  const [club, setClub] = useState<any>(null);
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setClub(d);
        if (d?.sports && d.sports.length > 0) {
          const validSports = d.sports.filter((s: any) => s.active !== false);
          const savedSportId = localStorage.getItem("selected_sport_id");
          const found = validSports.find((s: any) => String(s.id) === savedSportId);
          if (found) {
            setSelectedSportId(found.id);
          } else {
            const defaultSport =
              validSports.find((s: any) => s.slug === "padel") ||
              validSports.find((s: any) => s.slug === "tenis" || s.useSets) ||
              validSports[0];
            setSelectedSportId(defaultSport.id);
            try {
              localStorage.setItem("selected_sport_id", String(defaultSport.id));
            } catch {}
          }
        }
      })
      .catch(() => {});

    const handleSportChange = (e?: any) => {
      const id = e?.detail ?? (localStorage.getItem("selected_sport_id") ? Number(localStorage.getItem("selected_sport_id")) : null);
      if (id) setSelectedSportId(id);
    };

    window.addEventListener("sport_changed", handleSportChange);
    return () => window.removeEventListener("sport_changed", handleSportChange);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const url = selectedSportId ? `/api/ranking?sportId=${selectedSportId}` : "/api/ranking";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setRanking(Array.isArray(data) ? data : []);
      })
      .catch(() => setRanking([]))
      .finally(() => setIsLoading(false));
  }, [selectedSportId]);

  const activeSport = club?.sports?.find((s: any) => s.id === selectedSportId) || club?.sports?.[0];
  const isFootball =
    activeSport?.slug === "futbol" ||
    activeSport?.name?.toLowerCase().includes("fútbol");

  const handleSelectSport = (id: number) => {
    setSelectedSportId(id);
    localStorage.setItem("selected_sport_id", String(id));
    window.dispatchEvent(new CustomEvent("sport_changed", { detail: id }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isFootball ? "Tabla de Posiciones" : "Ranking Oficial del Club"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isFootball
              ? "Clasificación oficial de fútbol: 3 pts victoria, 1 pto empate, 0 pts derrota y estadísticas de gol."
              : "Clasificación por sistema Elo dinámico según nivel de rivales, sets y games disputados."}
          </p>
        </div>

        {club?.sports && club.sports.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border rounded-xl self-start sm:self-auto">
            {club.sports.map((s: any) => {
              const active = s.id === selectedSportId;
              const isFut = s.slug === "futbol" || s.name?.toLowerCase().includes("fútbol");
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSport(s.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <span>{isFut ? "⚽" : s.slug === "tenis" ? "🎾" : "🎾"}</span>
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !ranking?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-card border border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
            {isFootball ? "⚽" : <Trophy size={28} className="text-muted-foreground" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {isFootball ? "Sin partidos de fútbol registrados aún" : "Sin partidos de pádel/tenis registrados aún"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {isFootball
                ? "Registra partidos internos o contra rivales externos en Nuevo Partido para sumar puntos a la tabla de posiciones."
                : "Registra y confirma partidos en Nuevo Partido para calcular el Elo y la clasificación del club."}
            </p>
          </div>
          <Link
            href="/partidos/nuevo"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Registrar Primer Partido
          </Link>
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
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            {isFootball ? (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-12 gap-1 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
                    <div className="col-span-1 text-center">{t("ranking.pos")}</div>
                    <div className="col-span-3">{t("ranking.player")}</div>
                    <div className="col-span-1 text-center text-primary font-bold">PTS</div>
                    <div className="col-span-1 text-center">PJ</div>
                    <div className="col-span-1 text-center text-green-400">PG</div>
                    <div className="col-span-1 text-center text-yellow-400">PE</div>
                    <div className="col-span-1 text-center text-red-400">PP</div>
                    <div className="col-span-1 text-center font-mono">GF</div>
                    <div className="col-span-1 text-center font-mono">GC</div>
                    <div className="col-span-1 text-center font-mono">DG</div>
                    <div className="col-span-1 text-center">% Ef.</div>
                  </div>
                  <div className="divide-y divide-border">
                    {ranking.map((entry: any) => {
                      const totalMatches = entry.totalMatches ?? (entry.wins + entry.losses + (entry.draws || 0));
                      const dg = entry.goalDiff ?? ((entry.goalsFor ?? 0) - (entry.goalsAgainst ?? 0));
                      return (
                        <Link
                          key={entry.playerId}
                          href={`/jugadores/${entry.playerId}`}
                          className="grid grid-cols-12 gap-1 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
                        >
                          <div className="col-span-1 text-center">
                            <RankBadge rank={entry.rank} />
                          </div>
                          <div className="col-span-3 flex items-center gap-2 min-w-0">
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
                          <div className="col-span-1 text-center">
                            <PointsDisplay points={entry.points ?? 0} />
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium text-foreground/90">
                            {totalMatches}
                          </div>
                          <div className="col-span-1 text-center text-sm text-green-400 font-semibold">
                            {entry.wins}
                          </div>
                          <div className="col-span-1 text-center text-sm text-yellow-400 font-semibold">
                            {entry.draws ?? 0}
                          </div>
                          <div className="col-span-1 text-center text-sm text-red-400 font-medium">
                            {entry.losses}
                          </div>
                          <div className="col-span-1 text-center text-sm font-mono text-muted-foreground">
                            {entry.goalsFor ?? 0}
                          </div>
                          <div className="col-span-1 text-center text-sm font-mono text-muted-foreground">
                            {entry.goalsAgainst ?? 0}
                          </div>
                          <div className="col-span-1 text-center text-sm font-mono font-bold">
                            <span className={dg > 0 ? "text-green-400" : dg < 0 ? "text-red-400" : "text-muted-foreground"}>
                              {dg > 0 ? `+${dg}` : dg}
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            <span className="text-xs font-medium text-muted-foreground">{entry.winRate}%</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-12 gap-1 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
                    <div className="col-span-1 text-center">{t("ranking.pos")}</div>
                    <div className="col-span-3">{t("ranking.player")}</div>
                    <div className="col-span-1 text-center">Cat.</div>
                    <div className="col-span-1 text-center text-primary font-bold">Elo</div>
                    <div className="col-span-1 text-center">PJ</div>
                    <div className="col-span-1 text-center text-green-400 font-semibold">PG</div>
                    <div className="col-span-1 text-center text-red-400 font-medium">PP</div>
                    <div className="col-span-1 text-center font-mono">Sets</div>
                    <div className="col-span-1 text-center font-mono">Games</div>
                    <div className="col-span-1 text-center">Racha</div>
                    <div className="col-span-1 text-center">% Ef.</div>
                  </div>
                  <div className="divide-y divide-border">
                    {ranking.map((entry: any) => {
                      const totalMatches = entry.totalMatches ?? (entry.wins + entry.losses);
                      const gamesDiff = entry.gamesDiff ?? ((entry.gamesWon ?? 0) - (entry.gamesLost ?? 0));
                      return (
                        <Link
                          key={entry.playerId}
                          href={`/jugadores/${entry.playerId}`}
                          className="grid grid-cols-12 gap-1 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
                        >
                          <div className="col-span-1 text-center">
                            <RankBadge rank={entry.rank} />
                          </div>
                          <div className="col-span-3 flex items-center gap-2 min-w-0">
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
                          <div className="col-span-1 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-muted/60 border border-border text-foreground/80">
                              {entry.category ?? "4ª Cat"}
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            <EloDisplay elo={entry.elo} />
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium text-foreground/90">
                            {totalMatches}
                          </div>
                          <div className="col-span-1 text-center text-sm text-green-400 font-semibold">
                            {entry.wins}
                          </div>
                          <div className="col-span-1 text-center text-sm text-red-400 font-medium">
                            {entry.losses}
                          </div>
                          <div className="col-span-1 text-center text-xs font-mono text-muted-foreground">
                            {entry.setsWon ?? 0}-{entry.setsLost ?? 0}
                          </div>
                          <div className="col-span-1 text-center text-xs font-mono font-medium">
                            <span className={gamesDiff > 0 ? "text-green-400" : gamesDiff < 0 ? "text-red-400" : "text-muted-foreground"}>
                              {gamesDiff > 0 ? `+${gamesDiff}` : gamesDiff}
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            <span className="text-xs font-semibold text-foreground/90">
                              {entry.streak ?? "-"}
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            <span className="text-xs font-medium text-muted-foreground">{entry.winRate}%</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rules / Explanation */}
          {isFootball ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚽</span>
                <div>
                  <h3 className="text-sm font-semibold">Sistema Tradicional de Puntuación de Fútbol (3-1-0)</h3>
                  <p className="text-xs text-muted-foreground">
                    Cálculo oficial de puntos y posiciones para la nómina del club en partidos internos y contra rivales externos.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground block mb-0.5">Victoria (+3 PTS)</strong>
                    <span>
                      Otorga 3 puntos a los jugadores convocados tanto en triunfos ante rivales externos como al equipo ganador en partidos internos.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground block mb-0.5">Empate (+1 PTO)</strong>
                    <span>
                      Otorga 1 punto en empates oficiales, premiando la paridad deportiva en partidos internos y contra rivales externos.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground block mb-0.5">Derrota (0 PTS)</strong>
                    <span>
                      0 puntos. Se contabilizan los goles a favor (GF), en contra (GC) y la diferencia de goles (DG) para el desempate.
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-2 text-xs text-muted-foreground border-t border-border/40 flex flex-wrap gap-x-5 gap-y-1.5">
                <span><strong className="text-foreground">Criterios de Desempate:</strong> 1° Puntos (PTS)</span>
                <span>2° Diferencia de Goles (DG = GF - GC)</span>
                <span>3° Goles a Favor (GF)</span>
                <span>4° Partidos Ganados (PG)</span>
                <span>5° % Efectividad</span>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">{t("ranking.howEloWorks")}</h3>
                  <p className="text-xs text-muted-foreground">
                    Cálculo oficial de puntuación Elo individual para Pádel y Tenis por cada set y partido disputado.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                  <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground block mb-0.5">Victoria y Nivel de Rival</strong>
                    <span>{t("ranking.eloWinLossRule")}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                  <TrendingDown size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground block mb-0.5">Derrota y Rendimiento</strong>
                    <span>{t("ranking.eloDrawRule")}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                  <span className="w-3.5 h-3.5 rounded-full bg-primary/30 flex items-center justify-center text-primary font-bold text-[9px] mt-0.5 flex-shrink-0">
                    ⚡
                  </span>
                  <div>
                    <strong className="text-foreground block mb-0.5">Puntuación Base y Categorías</strong>
                    <span>{t("ranking.eloBaseRule")}</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 text-xs text-muted-foreground border-t border-border/40 flex flex-wrap gap-x-5 gap-y-1.5">
                <span><strong className="text-foreground">Categorías Oficiales:</strong> 1ª Cat (1800+ Elo)</span>
                <span>2ª Cat (1650-1799)</span>
                <span>3ª Cat (1520-1649)</span>
                <span>4ª Cat (1400-1519)</span>
                <span>5ª Cat (1250-1399)</span>
                <span>6ª Cat (&lt;1250)</span>
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
        <span className="text-[11px] text-muted-foreground font-medium">
          {isFootball ? "Puntos Liga" : entry.category ?? "4ª Cat"}
        </span>
      </div>
    </Link>
  );
}
