import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetDashboard, useGetRanking } from "@workspace/api-client-react";
import {
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  ChevronRight,
  Sparkles,
  MessageSquare,
  DollarSign,
  ClipboardList,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { triggerParryn } from "@/components/ParrynWidget";

function formatDate(iso: string, locale: string = "es") {
  const localeMap: Record<string, string> = {
    es: "es-ES",
    en: "en-US",
    pt: "pt-BR",
  };
  return new Date(iso).toLocaleDateString(localeMap[locale] || "es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ParrynStatus {
  available: boolean;
  secretaryName: string;
  clubName?: string;
  highlight?: string;
  nextEncuentro?: {
    id: number;
    titulo: string;
    fecha: string;
    confirmadosCount: number;
    maxSpots: number;
    cuposDisponibles: number;
  } | null;
  pendingPaymentTotal?: number;
  pendingPaymentCount?: number;
  leader?: string | null;
}

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingDash } = useGetDashboard();
  const { data: ranking } = useGetRanking();
  const { t, language } = useLanguage();
  const [parrynStatus, setParrynStatus] = useState<ParrynStatus | null>(null);

  useEffect(() => {
    fetch("/api/parryn/status", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setParrynStatus(data);
      })
      .catch(() => {});
  }, []);

  if (loadingDash) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  const top5 = (ranking ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("clubOverview")}</p>
        </div>
      </div>

      {/* Hero Interactivo: Secretaría del Club con Parryn IA */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/40 via-card to-background border-2 border-emerald-500/35 rounded-3xl p-5 sm:p-6 shadow-xl transition-all">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 text-white font-black flex items-center justify-center text-xl shadow-lg border border-emerald-300/30">
                P
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background"></span>
              </span>
            </div>

            <div className="space-y-1 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
                  <span>{t("parrynHeroTitle")}</span>
                  <Sparkles size={16} className="text-yellow-400 animate-pulse" />
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {t("parrynStatusOnline")}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed font-medium">
                {parrynStatus?.highlight || t("parrynHeroSubtitle")}
              </p>

              {parrynStatus?.nextEncuentro && (
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 bg-background/60 border border-border px-2.5 py-1 rounded-md text-emerald-300 font-medium">
                    🎾 Próximo: {parrynStatus.nextEncuentro.titulo} (
                    {parrynStatus.nextEncuentro.confirmadosCount}/
                    {parrynStatus.nextEncuentro.maxSpots} confirmados)
                  </span>
                  {parrynStatus.pendingPaymentTotal ? (
                    <span className="inline-flex items-center gap-1 bg-background/60 border border-border px-2.5 py-1 rounded-md text-amber-300 font-medium">
                      💰 Pendiente: ${parrynStatus.pendingPaymentTotal.toLocaleString("es-CL")}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 md:self-center shrink-0">
            <button
              type="button"
              onClick={() => triggerParryn()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md hover:shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>{t("parrynOpenChat")}</span>
            </button>
          </div>
        </div>

        {/* Botones de acción rápida con Parryn */}
        <div className="mt-4 pt-4 border-t border-emerald-500/20 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mr-1">
            Acciones Rápidas:
          </span>
          <button
            type="button"
            onClick={() =>
              triggerParryn("¿Quién falta por confirmar para el próximo encuentro del club?")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 hover:bg-emerald-500/15 text-foreground hover:text-emerald-300 border border-border hover:border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <ClipboardList size={13} className="text-emerald-400" />
            <span>{t("parrynAskWhoMissing")}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              triggerParryn(
                "Redacta una convocatoria oficial lista para copiar y pegar en el grupo de WhatsApp"
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 hover:bg-emerald-500/15 text-foreground hover:text-emerald-300 border border-border hover:border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <Send size={13} className="text-emerald-400" />
            <span>{t("parrynDraftWhatsapp")}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              triggerParryn("¿Cómo están los cobros y qué jugadores tienen saldo pendiente?")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 hover:bg-emerald-500/15 text-foreground hover:text-emerald-300 border border-border hover:border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <DollarSign size={13} className="text-emerald-400" />
            <span>{t("parrynPaymentReminder")}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              triggerParryn("¿Quiénes lideran actualmente el ranking ELO y cómo van las posiciones?")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 hover:bg-emerald-500/15 text-foreground hover:text-emerald-300 border border-border hover:border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trophy size={13} className="text-yellow-400" />
            <span>Consultar Ranking</span>
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={18} className="text-primary" />}
          label={t("totalPlayers")}
          value={dashboard?.totalPlayers ?? 0}
          href="/jugadores"
        />
        <StatCard
          icon={<Calendar size={18} className="text-chart-2" />}
          label={t("totalMatches")}
          value={dashboard?.totalMatches ?? 0}
          href="/partidos"
        />
        <StatCard
          icon={<Trophy size={18} className="text-yellow-400" />}
          label={t("eloLeaderboard")}
          value={dashboard?.topPlayer?.name ?? "—"}
          sub={
            dashboard?.topPlayer
              ? `${(dashboard.topPlayer as any).elo ?? dashboard.topPlayer.points ?? ""} pts`
              : undefined
          }
          href="/ranking"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-chart-3" />}
          label={t("ranking")}
          value={
            top5.length > 0
              ? `${top5.length} ${language === "en" ? "active" : language === "pt" ? "ativos" : "activos"}`
              : "0"
          }
          href="/ranking"
        />
      </div>

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent matches */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">{t("recentMatches")}</h2>
            <Link
              href="/partidos"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              {t("viewAll")} <ChevronRight size={12} />
            </Link>
          </div>
          {!dashboard?.recentMatches?.length ? (
            <EmptyState
              message={t("noRecentMatches")}
              action={{ label: t("newMatch"), href: "/partidos/nuevo" }}
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
            <h2 className="font-semibold text-sm">{t("topPlayers")}</h2>
            <Link
              href="/ranking"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              {t("viewAll")} <ChevronRight size={12} />
            </Link>
          </div>
          {!top5.length ? (
            <EmptyState
              message={t("noPlayersYet")}
              action={{ label: t("newPlayer"), href: "/jugadores/nuevo" }}
            />
          ) : (
            <div className="divide-y divide-border">
              {top5.map((entry: any) => (
                <Link
                  key={entry.playerId}
                  href={`/jugadores/${entry.playerId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      entry.rank === 1
                        ? "bg-yellow-500/20 text-yellow-400"
                        : entry.rank === 2
                        ? "bg-gray-400/20 text-gray-300"
                        : entry.rank === 3
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
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
                  <span className="font-bold text-primary text-sm">
                    {entry.elo ?? entry.points} pts
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

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-xl p-4 hover:bg-card/80 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 rounded-lg bg-muted/50">{icon}</div>
        <ChevronRight
          size={14}
          className="text-muted-foreground group-hover:text-foreground transition-colors"
        />
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

  const team1Names = team1Players.map((p) => p.name).join(" / ") || "—";
  const team2Names = team2Players.map((p) => p.name).join(" / ") || "—";

  return (
    <Link href="/partidos" className="block px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              team1Won ? "text-primary" : "text-foreground/70"
            )}
          >
            {team1Names}
          </p>
          <p
            className={cn(
              "text-xs truncate",
              !team1Won && !isDraw ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {team2Names}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              team1Won ? "text-primary" : "text-muted-foreground"
            )}
          >
            {match.team1Score ?? 0}
          </span>
          <span className="text-muted-foreground text-xs">-</span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              !team1Won && !isDraw ? "text-primary" : "text-muted-foreground"
            )}
          >
            {match.team2Score ?? 0}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">{formatDate(match.playedAt, language)}</p>
        {match.sportName && (
          <span className="text-xs text-muted-foreground/60">{match.sportName}</span>
        )}
      </div>
    </Link>
  );
}

function EmptyState({
  message,
  action,
}: {
  message: string;
  action: { label: string; href: string };
}) {
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
