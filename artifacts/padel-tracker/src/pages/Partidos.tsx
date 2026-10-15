import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListMatches,
  useDeleteMatch,
  getListMatchesQueryKey,
  getGetRankingQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calendar, Pencil, TrendingUp, TrendingDown, Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "@/context/LanguageContext";
import { formatSportName } from "@/lib/translations";

function formatDate(iso: string, language: string) {
  const loc = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-ES";
  return new Date(iso).toLocaleDateString(loc, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

type EloChange = { playerId: number; playerName: string; eloBefore: number; eloAfter: number; eloChange: number };
type TeamPlayer = { id: number; name: string };

export default function Partidos() {
  const { t, language } = useLanguage();
  const { data: matches, isLoading } = useListMatches();
  const [selectedSport, setSelectedSport] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_sport_id");
      if (saved === "3") return "futbol";
      if (saved === "2") return "tenis";
      if (saved === "1") return "padel";
    }
    return "all";
  });
  const [club, setClub] = useState<any>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClub(d))
      .catch(() => {});

    const handleSportChange = (e?: any) => {
      const id = e?.detail ?? (localStorage.getItem("selected_sport_id") ? Number(localStorage.getItem("selected_sport_id")) : null);
      if (id === 3) setSelectedSport("futbol");
      else if (id === 2) setSelectedSport("tenis");
      else if (id === 1) setSelectedSport("padel");
    };

    window.addEventListener("sport_changed", handleSportChange);
    return () => window.removeEventListener("sport_changed", handleSportChange);
  }, []);

  const handleSelectSport = (key: string, sportId?: number) => {
    setSelectedSport(key);
    if (sportId) {
      localStorage.setItem("selected_sport_id", String(sportId));
      window.dispatchEvent(new CustomEvent("sport_changed", { detail: sportId }));
    }
  };

  const deleteMutation = useDeleteMatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      },
    },
  });

  const handleConfirmMatch = async (matchId: number) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      } else {
        alert(data.error || "No se pudo confirmar el partido");
      }
    } catch {
      alert("Error de conexión al confirmar el partido.");
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t("partidos.deleteConfirm"))) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredMatches = (matches ?? []).filter((m: any) => {
    if (selectedSport === "all") return true;
    if (selectedSport === "futbol") {
      return m.sportSlug === "futbol" || m.sportName?.toLowerCase().includes("fútbol") || m.sportId === 3;
    }
    if (selectedSport === "padel") {
      return m.sportSlug === "padel" || m.sportName?.toLowerCase().includes("pádel") || m.sportId === 1;
    }
    if (selectedSport === "tenis") {
      return m.sportSlug === "tenis" || m.sportName?.toLowerCase().includes("tenis") || m.sportId === 2;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("partidos.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("partidos.count", { count: filteredMatches.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {club?.sports && club.sports.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border rounded-xl">
              <button
                onClick={() => handleSelectSport("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  selectedSport === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todos
              </button>
              {club.sports.map((s: any) => {
                const isFut = s.slug === "futbol" || s.name?.toLowerCase().includes("fútbol");
                const key = isFut ? "futbol" : s.slug;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSport(key, s.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer",
                      selectedSport === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{isFut ? "⚽" : "🎾"}</span>
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          <Link
            href="/partidos/nuevo"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus size={15} /> {t("partidos.new")}
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !filteredMatches.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-card border border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
            {selectedSport === "futbol" ? "⚽" : <Calendar size={28} className="text-muted-foreground" />}
          </div>
          <div>
            <p className="font-semibold">
              {selectedSport === "futbol" ? "Sin partidos de fútbol registrados" : t("partidos.noMatches")}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedSport === "futbol"
                ? "Registra el primer partido de fútbol (amistoso interno o contra un rival externo) para calcular la tabla de posiciones."
                : t("partidos.noMatchesDesc")}
            </p>
          </div>
          <Link
            href="/partidos/nuevo"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("partidos.new")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMatches.map((m: any) => {
            const team1Players: TeamPlayer[] = m.team1Players ?? [];
            const team2Players: TeamPlayer[] = m.team2Players ?? [];
            const t1ScoreNum = Number(m.team1Score ?? 0);
            const t2ScoreNum = Number(m.team2Score ?? 0);
            const team1Won = m.result === "team1" || (m.result !== "team2" && t1ScoreNum > t2ScoreNum);
            const team2Won = m.result === "team2" || (m.result !== "team1" && t2ScoreNum > t1ScoreNum);
            const isDraw = m.result === "draw" || (!team1Won && !team2Won && t1ScoreNum === t2ScoreNum);
            const eloChanges: EloChange[] = m.eloChanges ?? [];
            const team1Ids = team1Players.map((p) => p.id);
            const team2Ids = team2Players.map((p) => p.id);
            const team1EloChanges = eloChanges.filter((c) => team1Ids.includes(c.playerId));
            const team2EloChanges = eloChanges.filter((c) => team2Ids.includes(c.playerId));
            const sets = m.sets as Array<{ setNumber: number; team1Games: number; team2Games: number }> | null;

            const isStaff = (user as any)?.isAdmin === 1 || (user as any)?.isClubAdmin === 1;
            const isRival = m.matchType === "rival" || Boolean(m.rivalTeamName);
            const team1Substitutes: TeamPlayer[] = m.team1Substitutes ?? [];
            const team2Substitutes: TeamPlayer[] = m.team2Substitutes ?? [];
            const userInClubSquad = team1Ids.includes(userPlayerId) || team1Substitutes.some((s) => s.id === userPlayerId);
            const isParticipant = userPlayerId && (isRival ? userInClubSquad : (team1Ids.includes(userPlayerId) || team2Ids.includes(userPlayerId)));
            const canEdit = isStaff || isParticipant;
            const canDelete = isStaff;

            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 group">
                {/* Sport & Modality Badges */}
                <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                  {m.sportName && (
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {formatSportName(m.sportName, language)}
                    </span>
                  )}
                  {m.modalityName && (
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      {m.modalityName}
                    </span>
                  )}
                  {isRival && (
                    <span className="text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                      vs Rival
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Team 1 / Nuestro Club */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0",
                          team1Won ? "bg-primary/20 text-primary font-bold" : isDraw ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {team1Won ? t("partidos.winnerBadge") : isDraw ? t("partidos.drawBadge") : t("partidos.loserBadge")}
                        </span>
                        <p className="text-sm font-medium truncate">
                          {isRival && <span className="text-xs font-semibold text-primary mr-1">[Nuestro Club]</span>}
                          {team1Players.map((p) => p.name).join(" / ") || "—"}
                        </p>
                      </div>
                      {team1Substitutes.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate pl-6 mt-0.5">
                          <span className="font-semibold text-muted-foreground/80">Banca:</span> {team1Substitutes.map((s) => s.name).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Team 2 / Rival */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0",
                          team2Won ? "bg-primary/20 text-primary font-bold" : isDraw ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {team2Won ? t("partidos.winnerBadge") : isDraw ? t("partidos.drawBadge") : t("partidos.loserBadge")}
                        </span>
                        <p className="text-sm font-medium truncate">
                          {isRival ? (
                            <span className="font-semibold text-foreground">
                              🛡️ {m.rivalTeamName || "Equipo Rival"}
                            </span>
                          ) : (
                            team2Players.map((p) => p.name).join(" / ") || "—"
                          )}
                        </p>
                      </div>
                      {!isRival && team2Substitutes.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate pl-6 mt-0.5">
                          <span className="font-semibold text-muted-foreground/80">Banca:</span> {team2Substitutes.map((s) => s.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Score + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">
                        <span className={team1Won ? "text-primary" : "text-muted-foreground"}>
                          {m.team1Score}
                        </span>
                        <span className="text-muted-foreground mx-1 text-lg">-</span>
                        <span className={team2Won ? "text-primary" : "text-muted-foreground"}>
                          {m.team2Score}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sets && sets.length > 0 ? "sets" : "goles"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <Link
                          href={`/partidos/${m.id}/editar`}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Editar marcador del partido"
                        >
                          <Pencil size={14} />
                        </Link>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          disabled={deleteMutation.isPending}
                          title="Eliminar partido (Solo Administrador)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sets detail */}
                {sets && sets.length > 0 && (
                  <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border">
                    {sets.map((s) => (
                      <div key={s.setNumber} className="text-xs text-muted-foreground">
                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                          {s.team1Games}-{s.team2Games}
                        </span>
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(m.playedAt, language)}</span>
                  </div>
                )}

                {!sets && (
                  <div className="mt-2.5 pt-2.5 border-t border-border">
                    <span className="text-xs text-muted-foreground">{formatDate(m.playedAt, language)}</span>
                  </div>
                )}

                {/* Puntos / Elo changes */}
                {(() => {
                  const isMatchFootball = m.sportSlug === "futbol" || m.sportName?.toLowerCase().includes("fútbol") || m.sportId === 3;
                  if (isMatchFootball) {
                    const isDraw = m.result === "draw";
                    const isT1Win = m.result === "team1";
                    const isT2Win = m.result === "team2";
                    return (
                      <div className="mt-2.5 pt-2.5 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          ⚽ Puntos de Liga:
                        </span>
                        {isDraw ? (
                          <span className="bg-yellow-500/15 text-yellow-400 font-semibold px-2 py-0.5 rounded text-[11px]">
                            +1 pto cada equipo (Empate)
                          </span>
                        ) : isT1Win ? (
                          <span className="bg-green-500/15 text-green-400 font-semibold px-2 py-0.5 rounded text-[11px]">
                            +3 pts {m.matchType === "rival" ? "Nuestro Club" : "Equipo 1"} (Victoria) · 0 pts {m.matchType === "rival" ? (m.rivalTeamName || "Rival") : "Equipo 2"}
                          </span>
                        ) : isT2Win ? (
                          <span className="bg-green-500/15 text-green-400 font-semibold px-2 py-0.5 rounded text-[11px]">
                            +3 pts {m.matchType === "rival" ? (m.rivalTeamName || "Rival") : "Equipo 2"} · 0 pts {m.matchType === "rival" ? "Nuestro Club" : "Equipo 1"}
                          </span>
                        ) : null}
                      </div>
                    );
                  }

                  if (eloChanges.length > 0) {
                    return (
                      <div className="mt-2.5 pt-2.5 border-t border-border">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {[...team1EloChanges, ...team2EloChanges].map((c) => (
                            <EloChangePill key={c.playerId} change={c} />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Fair Play Validation Bar */}
                {m.status === "pending_confirmation" && (
                  <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        ⚖️ Fair Play:
                      </span>
                      <span className="text-muted-foreground ml-1">
                        {m.submittedByPlayerName ? `Propuesto por ${m.submittedByPlayerName}.` : "Marcador propuesto."} Requiere confirmación del rival o del administrador para validar los puntos en la tabla de posiciones.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const userPlayerId = (user as any)?.playerId;
                        const isStaff = (user as any)?.isAdmin === 1 || (user as any)?.isClubAdmin === 1;
                        const userInT1 = team1Ids.includes(userPlayerId);
                        const userInT2 = team2Ids.includes(userPlayerId);
                        const isRival = m.submittedByPlayerId
                          ? (userInT1 && !team1Ids.includes(m.submittedByPlayerId)) ||
                            (userInT2 && !team2Ids.includes(m.submittedByPlayerId))
                          : userInT1 || userInT2;

                        if (isStaff) {
                          return (
                            <button
                              onClick={() => handleConfirmMatch(m.id)}
                              className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-medium flex items-center gap-1"
                            >
                              <ShieldCheck size={13} />
                              {t("adminApprove") || "Aprobar como Admin"}
                            </button>
                          );
                        }

                        if (isRival) {
                          return (
                            <button
                              onClick={() => handleConfirmMatch(m.id)}
                              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center gap-1"
                            >
                              <Check size={13} />
                              {t("approveResult") || "Aprobar como Rival"}
                            </button>
                          );
                        }

                        if (userInT1 || userInT2) {
                          return (
                            <span className="text-[11px] text-amber-500">
                              {t("partidos.waitingRival")}
                            </span>
                          );
                        }

                        return null;
                      })()}
                    </div>
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

function EloChangePill({ change }: { change: EloChange }) {
  const positive = change.eloChange > 0;
  const neutral = change.eloChange === 0;
  return (
    <div className="flex items-center gap-1 text-xs">
      {positive ? (
        <TrendingUp size={10} className="text-green-400" />
      ) : neutral ? null : (
        <TrendingDown size={10} className="text-red-400" />
      )}
      <span className="text-muted-foreground truncate max-w-[80px]">
        {change.playerName.split(" ")[0]}
      </span>
      <span className={cn(
        "font-bold tabular-nums",
        positive ? "text-green-400" : neutral ? "text-muted-foreground" : "text-red-400",
      )}>
        {positive ? "+" : ""}{change.eloChange}
      </span>
      <span className="text-muted-foreground/60 tabular-nums">({change.eloAfter})</span>
    </div>
  );
}