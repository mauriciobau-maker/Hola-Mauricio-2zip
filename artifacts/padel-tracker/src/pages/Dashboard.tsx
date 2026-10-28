import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Users, Calendar, Trophy, TrendingUp, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { formatSportName } from "@/lib/translations";

function formatDate(iso: string, language: string) {
  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-ES";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  const [club, setClub] = useState<any>(null);
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setClub(d);
        if (d?.sports && d.sports.length > 0) {
          const savedSportId = localStorage.getItem("selected_sport_id");
          const found = d.sports.find((s: any) => String(s.id) === savedSportId);
          if (found) {
            setSelectedSportId(found.id);
          } else {
            const defaultSport =
              d.sports.find((s: any) => s.slug === "padel") ||
              d.sports.find((s: any) => s.slug === "tenis" || s.useSets) ||
              d.sports[0];
            setSelectedSportId(defaultSport.id);
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
    setLoading(true);
    const dashUrl = selectedSportId ? `/api/dashboard?sportId=${selectedSportId}` : "/api/dashboard";
    const rankUrl = selectedSportId ? `/api/ranking?sportId=${selectedSportId}` : "/api/ranking";

    Promise.all([
      fetch(dashUrl).then((r) => (r.ok ? r.json() : null)),
      fetch(rankUrl).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([dashData, rankData]) => {
        setDashboard(dashData);
        setRanking(Array.isArray(rankData) ? rankData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedSportId]);

  const activeSport = club?.sports?.find((s: any) => s.id === selectedSportId) || club?.sports?.[0];
  const isFootball =
    activeSport?.slug === "futbol" ||
    activeSport?.name?.toLowerCase().includes("fútbol");

  const top5 = (ranking ?? []).slice(0, 5);

  const handleSelectSport = (id: number) => {
    setSelectedSportId(id);
    localStorage.setItem("selected_sport_id", String(id));
    window.dispatchEvent(new CustomEvent("sport_changed", { detail: id }));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-card rounded-xl border border-border" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isFootball
              ? "Panel oficial de fútbol: nómina, partidos disputados y tabla de posiciones."
              : t("dashboard.subtitle")}
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
                  <span>{isFut ? "⚽" : "🎾"}</span>
                  <span>{formatSportName(s.name, language)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Secretaría y Estado Operativo del Club */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">
                  {t("dashboard.secretaryTitle")}
                </h2>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {t("dashboard.secretarySubtitle")}
                </span>
              </div>
              <p className="text-sm text-foreground/90 font-medium">
                {isFootball
                  ? t("dashboard.callupFutbol")
                  : t("dashboard.callupPadel")}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="bg-muted/50 border border-border px-2.5 py-1 rounded-md text-muted-foreground flex items-center gap-1.5 font-medium">
                  <span>{isFootball ? "⚽" : "🎾"}</span>
                  <span>
                    {t("dashboard.next")}: {isFootball ? t("dashboard.nextFutbol") : t("dashboard.nextPadel")}
                  </span>
                </span>
                <span className="bg-muted/50 border border-border px-2.5 py-1 rounded-md text-amber-500 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                  <span>💰</span>
                  <span>{t("dashboard.pending")}: $57.000</span>
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/secretario"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all shrink-0 self-start md:self-center"
          >
            <Sparkles size={14} />
            <span>{t("dashboard.openSecretary")}</span>
          </Link>
        </div>

        {/* Acciones Rápidas */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
          <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider shrink-0">
            {t("dashboard.quickActions")}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href="/secretario?q=quien_falta"
              className="bg-muted/40 hover:bg-muted border border-border px-2.5 py-1 rounded-md text-foreground transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              {t("dashboard.actionWhoPending")}
            </Link>
            <Link
              href="/secretario?q=convocatoria"
              className="bg-muted/40 hover:bg-muted border border-border px-2.5 py-1 rounded-md text-foreground transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              {t("dashboard.actionDraftCallup")}
            </Link>
            <Link
              href="/secretario?q=cobros"
              className="bg-muted/40 hover:bg-muted border border-border px-2.5 py-1 rounded-md text-foreground transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              {t("dashboard.actionPaymentReminder")}
            </Link>
            <Link
              href="/ranking"
              className="bg-muted/40 hover:bg-muted border border-border px-2.5 py-1 rounded-md text-foreground transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              {t("dashboard.actionCheckTable")}
            </Link>
            <Link
              href="/manual"
              className="bg-primary/10 hover:bg-primary/20 border border-primary/30 px-2.5 py-1 rounded-md text-primary transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              📖 {language === "en" ? "User Guide" : language === "pt" ? "Manual de Uso" : "Manual de Uso"}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={18} className="text-primary" />}
          label={isFootball ? "Plantel / Jugadores" : t("players")}
          value={dashboard?.totalPlayers ?? 0}
          href="/jugadores"
        />
        <StatCard
          icon={<Calendar size={18} className="text-chart-2" />}
          label={isFootball ? "Partidos de Fútbol" : t("matches")}
          value={dashboard?.totalMatches ?? 0}
          href="/partidos"
        />
        <StatCard
          icon={<Trophy size={18} className="text-yellow-400" />}
          label={isFootball ? "Líder de la Liga" : t("dashboard.leader")}
          value={dashboard?.topPlayer?.playerName || dashboard?.topPlayer?.name || "—"}
          sub={
            dashboard?.topPlayer
              ? isFootball
                ? `${dashboard.topPlayer.points ?? 0} pts (Liga)`
                : `${dashboard.topPlayer.elo ?? dashboard.topPlayer.points ?? ""} pts`
              : undefined
          }
          href="/ranking"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-chart-3" />}
          label={isFootball ? "Tabla Oficial" : t("ranking")}
          value={top5.length > 0 ? t("dashboard.activeCount", { count: top5.length }) : "0"}
          href="/ranking"
        />
      </div>

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent matches */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">{t("dashboard.recentMatches")}</h2>
            <Link href="/partidos" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              {t("common.viewAll")} <ChevronRight size={12} />
            </Link>
          </div>
          {!dashboard?.recentMatches?.length ? (
            <EmptyState
              message={t("dashboard.noMatches")}
              action={{ label: t("partidos.new"), href: "/partidos/nuevo" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {dashboard.recentMatches.map((m: any) => (
                <MatchRow key={m.id} match={m} language={language} />
              ))}
            </div>
          )}
        </div>

        {/* Top ranking */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">{t("dashboard.topRanking")}</h2>
            <Link href="/ranking" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              {t("dashboard.viewRanking")} <ChevronRight size={12} />
            </Link>
          </div>
          {!top5.length ? (
            <EmptyState
              message={t("dashboard.noPlayers")}
              action={{ label: t("jugadores.new"), href: "/jugadores/nuevo" }}
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
                      {isFootball
                        ? `${entry.wins}PG · ${entry.draws ?? 0}PE · ${entry.losses}PP`
                        : `${entry.wins}${t("parejas.winsShort") || "V"} / ${entry.losses}${t("parejas.lossesShort") || "D"}`}
                    </p>
                  </div>
                  <span className="font-bold text-primary text-sm">
                    {isFootball ? `${entry.points ?? 0} PTS` : `${entry.elo ?? entry.points} pts`}
                  </span>
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

function MatchRow({ match, language }: { match: any; language: string }) {
  const team1Players: Array<{ id: number; name: string }> = match.team1Players ?? [];
  const team2Players: Array<{ id: number; name: string }> = match.team2Players ?? [];
  const team1Won = match.result === "team1";
  const isDraw = match.result === "draw";

  const isRival = match.matchType === "rival" || Boolean(match.rivalTeamName);
  const team1Names = isRival
    ? (team1Players.length > 0
        ? `${team1Players.map((p) => p.name).slice(0, 3).join(", ")}${team1Players.length > 3 ? ` +${team1Players.length - 3}` : ""} (Club)`
        : "Nuestro Club")
    : team1Players.map((p) => p.name).join(" / ") || "—";

  const team2Names = isRival
    ? `🛡️ ${match.rivalTeamName || "Equipo Rival"}`
    : team2Players.map((p) => p.name).join(" / ") || "—";

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
        <p className="text-xs text-muted-foreground">{formatDate(match.playedAt, language)}</p>
        {match.sportName && (
          <span className="text-xs text-muted-foreground/60">{formatSportName(match.sportName, language)}</span>
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