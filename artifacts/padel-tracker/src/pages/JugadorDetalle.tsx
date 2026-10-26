import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  useGetPlayer,
  useGetPlayerStats,
  useGetPlayerEloHistory,
  getGetPlayerQueryKey,
  getGetPlayerStatsQueryKey,
  getGetPlayerEloHistoryQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, TrendingUp, TrendingDown, Award, Target, Flame, Pencil, Zap, Trophy, Mail, Phone, MessageSquare, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

function formatDate(iso: string, language: string) {
  const loc = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-ES";
  return new Date(iso).toLocaleDateString(loc, { day: "numeric", month: "short" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function JugadorDetalle() {
  const { t, language } = useLanguage();
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);

  const [selectedSportId, setSelectedSportId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_sport_id");
      return saved ? Number(saved) : null;
    }
    return null;
  });

  const [playerData, setPlayerData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { data: eloHistory } = useGetPlayerEloHistory(id, {
    query: { enabled: !!id, queryKey: getGetPlayerEloHistoryQueryKey(id) },
  });

  useEffect(() => {
    const handleSportChange = (e?: any) => {
      const sId = e?.detail ?? (localStorage.getItem("selected_sport_id") ? Number(localStorage.getItem("selected_sport_id")) : null);
      if (sId) setSelectedSportId(sId);
    };
    window.addEventListener("sport_changed", handleSportChange);
    return () => window.removeEventListener("sport_changed", handleSportChange);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const pUrl = selectedSportId ? `/api/players/${id}?sportId=${selectedSportId}` : `/api/players/${id}`;
    const sUrl = selectedSportId ? `/api/players/${id}/stats?sportId=${selectedSportId}` : `/api/players/${id}/stats`;

    Promise.all([
      fetch(pUrl).then((r) => (r.ok ? r.json() : null)),
      fetch(sUrl).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([p, s]) => {
        setPlayerData(p);
        setStatsData(s);
      })
      .finally(() => setLoading(false));
  }, [id, selectedSportId]);

  const player = playerData;
  const stats = statsData;

  if (loading) {
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
        <p className="text-muted-foreground">{t("jugadores.playerNotFound")}</p>
        <Link href="/jugadores" className="text-primary hover:underline text-sm mt-2 block">
          {t("jugadores.backToPlayers")}
        </Link>
      </div>
    );
  }

  const isFootball =
    selectedSportId === 3 ||
    (player as any)?.isFootball ||
    (stats as any)?.isFootball ||
    (player as any)?.sportSlug === "futbol" ||
    (player as any)?.sportName?.toLowerCase().includes("fútbol");

  const winRate = stats?.winRate ?? 0;
  const eloDiff = (player.elo ?? 1500) - 1500;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/jugadores"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold flex-1">{t("jugadores.profile")}</h1>
        <Link
          href={`/jugadores/${id}/editar`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil size={13} />
          {t("jugadores.edit")}
        </Link>
      </div>

      {/* Player card with Points or Elo */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-4">
          {player.profileImageUrl ? (
            <img
              src={player.profileImageUrl}
              alt={player.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 flex-shrink-0 bg-muted"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
              {initials(player.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold">{player.name}</h2>
            {player.nickname && (
              <p className="text-muted-foreground text-sm">&quot;{player.nickname}&quot;</p>
            )}
            {player.email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail size={12} className="text-primary/80" />
                <span className="truncate">{player.email}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("jugadores.memberSince", {
                date: new Date(player.createdAt).toLocaleDateString(
                  language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-ES",
                  { month: "long", year: "numeric" }
                ),
              })}
            </p>
          </div>
          {/* Badge */}
          {isFootball ? (
            <div className="flex flex-col items-center gap-0.5 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-1">
                <Trophy size={13} className="text-primary" />
                <span className="text-xs font-semibold text-primary">PUNTOS</span>
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{stats?.points ?? 0}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Liga Oficial</span>
            </div>
          ) : (
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
                    eloDiff > 0 ? "text-green-400" : "text-red-400",
                  )}
                >
                  {eloDiff > 0 ? "+" : ""}{eloDiff}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Informative strip: Phone, WhatsApp, Dominant Hand, Court Side / Position */}
        {(player.phone || player.waId || player.dominantHand || player.courtSide || (player.categories && player.categories.length > 0)) && (
          <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {player.phone && (
              <a
                href={`tel:${player.phone}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors bg-muted/40 px-2.5 py-1 rounded-md border border-border/40"
              >
                <Phone size={12} className="text-primary" />
                <span>{player.phone}</span>
              </a>
            )}
            {player.waId && (
              <a
                href={`https://wa.me/${player.phone?.replace(/[^0-9]/g, "") || player.waId.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors bg-green-500/10 px-2.5 py-1 rounded-md border border-green-500/20"
              >
                <MessageSquare size={12} />
                <span>WhatsApp: {player.waId}</span>
              </a>
            )}
            {!isFootball && (player.dominantHand || player.courtSide) && (
              <div className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                <Activity size={12} className="text-muted-foreground" />
                <span className="capitalize">
                  {player.dominantHand || "Diestro"} • {player.courtSide === "drive" ? "Drive" : player.courtSide === "reves" ? "Revés" : player.courtSide || "Ambos lados"}
                </span>
              </div>
            )}
            {isFootball && (player.courtSide || player.dominantHand) && (
              <div className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                <Activity size={12} className="text-emerald-400" />
                <span>
                  {player.courtSide ? `${player.courtSide}` : "Polifuncional"}
                  {player.dominantHand ? ` • Pie ${player.dominantHand === "derecho" || player.dominantHand === "diestro" ? "Derecho" : player.dominantHand === "zurdo" ? "Zurdo" : player.dominantHand === "ambidiestro" ? "Ambidiestro" : player.dominantHand}` : ""}
                </span>
              </div>
            )}
            {Array.isArray(player.categories) && player.categories.map((c: any) => (
              <span key={c.id} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                {c.name}
              </span>
            ))}
          </div>
        )}

        {/* Win rate bar */}
        {stats && stats.totalMatches > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{t("jugadores.winRate")}</span>
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
            label={isFootball ? "Puntos Liga (3 pts x V)" : t("jugadores.points")}
            value={stats.points}
            accent
          />
          <StatTile
            icon={<TrendingUp size={16} className="text-primary" />}
            label={isFootball ? "Partidos Ganados (PG)" : t("jugadores.wins")}
            value={stats.wins}
          />
          {isFootball ? (
            <StatTile
              icon={<Zap size={16} className="text-amber-400" />}
              label="Partidos Empatados (PE)"
              value={(stats as any).draws ?? 0}
            />
          ) : (
            <StatTile
              icon={<Target size={16} className="text-muted-foreground" />}
              label={t("jugadores.losses")}
              value={stats.losses}
            />
          )}
          <StatTile
            icon={isFootball ? <Target size={16} className="text-muted-foreground" /> : <Flame size={16} className="text-orange-400" />}
            label={isFootball ? "Partidos Perdidos (PP)" : t("jugadores.currentStreak")}
            value={isFootball ? stats.losses : `${stats.currentStreak}${t("parejas.winsShort") || "V"}`}
          />
        </div>
      )}

      {/* Sets stats or Football match performance */}
      {stats && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">
            {isFootball ? "Rendimiento en Cancha (Fútbol)" : t("jugadores.setStats")}
          </h3>
          {isFootball ? (
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-3 text-center">
              <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <p className="text-xl font-bold">{stats.totalMatches}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">PJ</p>
              </div>
              <div className="bg-green-500/10 p-2.5 rounded-lg border border-green-500/20">
                <p className="text-xl font-bold text-green-400">{stats.wins}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">PG</p>
              </div>
              <div className="bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/20">
                <p className="text-xl font-bold text-yellow-400">{(stats as any).draws ?? 0}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">PE</p>
              </div>
              <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                <p className="text-xl font-bold text-red-400">{stats.losses}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">PP</p>
              </div>
              <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <p className="text-xl font-bold text-foreground">{(stats as any).goalsFor ?? (stats as any).setsWon ?? 0}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">GF</p>
              </div>
              <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <p className="text-xl font-bold text-foreground">{(stats as any).goalsAgainst ?? (stats as any).setsLost ?? 0}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">GC</p>
              </div>
              <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40 col-span-2 md:col-span-1">
                {(() => {
                  const gf = (stats as any).goalsFor ?? (stats as any).setsWon ?? 0;
                  const gc = (stats as any).goalsAgainst ?? (stats as any).setsLost ?? 0;
                  const diff = gf - gc;
                  return (
                    <>
                      <p className={cn("text-xl font-bold", diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted-foreground")}>
                        {diff > 0 ? `+${diff}` : diff}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-semibold">DG</p>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{stats.setsWon}</p>
                <p className="text-xs text-muted-foreground">{t("jugadores.setsWon")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{stats.setsLost}</p>
                <p className="text-xs text-muted-foreground">{t("jugadores.setsLost")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMatches}</p>
                <p className="text-xs text-muted-foreground">{t("jugadores.totalMatches")}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Match history & Gráfica de Progreso */}
      {(!isFootball || (eloHistory && eloHistory.length > 0)) && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Trophy size={14} className="text-primary" />
            <h3 className="font-semibold text-sm">
              {isFootball ? "Historial de Puntos y Resultados" : t("jugadores.eloHistory")}
            </h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {t("jugadores.eloMatchesCount", { count: eloHistory?.length ?? 0 })}
            </span>
          </div>
          {/* Mini sparkline only for Padel/Tennis */}
          {!isFootball && <EloSparkline history={(eloHistory ?? []) as any} t={t} />}
          {/* List — last 8 entries reversed (most recent first) */}
          {eloHistory && eloHistory.length > 0 ? (
            <div className="divide-y divide-border">
              {[...eloHistory].reverse().slice(0, 8).map((entry) => {
                const positive = entry.eloChange > 0;
              const isDraw = entry.eloChange === 0;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                      positive ? "bg-green-500/15" : isDraw ? "bg-yellow-500/15" : "bg-red-500/15",
                    )}
                  >
                    {positive ? (
                      <TrendingUp size={11} className="text-green-400" />
                    ) : isDraw ? (
                      <span className="text-[10px] font-bold text-yellow-400">=</span>
                    ) : (
                      <TrendingDown size={11} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{formatDate(entry.matchPlayedAt, language)}</p>
                  </div>
                  {isFootball ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "font-bold tabular-nums px-2 py-0.5 rounded text-[11px]",
                          positive
                            ? "bg-green-500/15 text-green-400"
                            : isDraw
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {positive ? "+3 pts Victoria" : isDraw ? "+1 pto Empate" : "0 pts Derrota"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground tabular-nums">{entry.eloBefore}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold tabular-nums">{entry.eloAfter}</span>
                      <span
                        className={cn(
                          "font-bold tabular-nums w-10 text-right",
                          positive ? "text-green-400" : "text-red-400",
                        )}
                      >
                        {positive ? "+" : ""}{entry.eloChange}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          ) : (
            <div className="p-4 text-center text-xs text-foreground/80 font-medium">
              Aún no hay partidos oficiales registrados para este jugador.
            </div>
          )}
        </div>
      )}

      {/* Recent matches */}
      {stats && (stats.recentMatches ?? []).length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">{t("jugadores.recentMatches")}</h3>
          </div>
          <div className="divide-y divide-border">
            {(stats.recentMatches ?? []).map((m) => {
              const onTeam1 = m.team1Player1Id === id || m.team1Player2Id === id;
              const won = onTeam1
                ? m.team1SetsWon > m.team2SetsWon
                : m.team2SetsWon > m.team1SetsWon;
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
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      won ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive",
                    )}
                  >
                    {won ? (t("parejas.winsShort") || "V") : (t("parejas.lossesShort") || "D")}
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
                    {formatDate(m.playedAt, language)}
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
function EloSparkline({ history, t }: { history: Array<{ eloAfter: number }>; t: (key: string) => string }) {
  const values = (history ?? []).map((h) => h.eloAfter);
  const W = 300;
  const H = 48;
  const pad = 6;

  // Si tiene menos de 2 partidos, mostramos la gráfica con la base 1500 y mensaje
  if (values.length < 2) {
    const currentElo = values[0] ?? 1500;
    return (
      <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
          <line
            x1={pad}
            y1={H / 2}
            x2={W - pad}
            y2={H / 2}
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <circle cx={pad + 10} cy={H / 2} r="3.5" fill="hsl(var(--primary))" />
        </svg>
        <div className="flex items-center justify-between text-xs text-foreground/80 mt-1">
          <span className="font-semibold text-primary">Nivel Inicial: {currentElo} Elo</span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Juega 2 partidos para ver la curva dinámica
          </span>
        </div>
      </div>
    );
  }

  const min = Math.min(...values, 1480);
  const max = Math.max(...values, 1520);
  const range = max - min || 40;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + ((max - v) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const baselineY = pad + ((max - 1500) / range) * (H - pad * 2);

  return (
    <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
        {/* Baseline at 1500 */}
        <line
          x1={pad}
          y1={baselineY}
          x2={W - pad}
          y2={baselineY}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity="0.4"
        />
        {/* Elo line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="3.5"
            fill="hsl(var(--primary))"
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-foreground/80 font-medium mt-1">
        <span>{t("jugadores.start")} (1500)</span>
        <span className="text-muted-foreground text-[11px]">{t("jugadores.baseElo")}</span>
        <span className="text-primary font-bold">{t("jugadores.now")} ({values[values.length - 1]})</span>
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
        accent ? "bg-primary/10 border-primary/20" : "bg-card border-border",
      )}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={cn("text-2xl font-bold", accent && "text-primary")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
