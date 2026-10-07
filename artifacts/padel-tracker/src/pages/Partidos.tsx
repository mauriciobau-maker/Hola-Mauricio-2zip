import { Link } from "wouter";
import {
  useListMatches,
  useDeleteMatch,
  getListMatchesQueryKey,
  getGetRankingQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calendar, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

function formatDate(iso: string, locale: string = "es") {
  const localeMap: Record<string, string> = {
    es: "es-ES",
    en: "en-US",
    pt: "pt-BR",
  };
  return new Date(iso).toLocaleDateString(localeMap[locale] || "es-ES", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

type EloChange = { playerId: number; playerName: string; eloBefore: number; eloAfter: number; eloChange: number };
type TeamPlayer = { id: number; name: string };

export default function Partidos() {
  const { data: matches, isLoading } = useListMatches();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

  const deleteMutation = useDeleteMatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      },
    },
  });

  const handleDelete = (id: number) => {
    const confirmMsg =
      language === "en"
        ? "Delete this match? This action cannot be undone."
        : language === "pt"
        ? "Excluir esta partida? Esta ação não pode ser desfeita."
        : "¿Eliminar este partido? Esta acción no se puede deshacer.";

    if (confirm(confirmMsg)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("matchesTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {matches?.length ?? 0} {language === "en" ? "matches recorded" : language === "pt" ? "partidas registradas" : "partidos registrados"}
          </p>
        </div>
        <Link
          href="/partidos/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> {t("newMatchButton")}
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : !matches?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Calendar size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">{t("noMatchesFound")}</p>
            <p className="text-sm text-muted-foreground">
              {language === "en" ? "Record the first match to get started" : language === "pt" ? "Registre a primeira partida para começar" : "Registra el primer partido para empezar"}
            </p>
          </div>
          <Link
            href="/partidos/nuevo"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("newMatchButton")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m: any) => {
            const team1Players: TeamPlayer[] = m.team1Players ?? [];
            const team2Players: TeamPlayer[] = m.team2Players ?? [];
            const team1Won = m.result === "team1";
            const isDraw = m.result === "draw";
            const eloChanges: EloChange[] = m.eloChanges ?? [];
            const team1Ids = team1Players.map((p) => p.id);
            const team2Ids = team2Players.map((p) => p.id);
            const team1EloChanges = eloChanges.filter((c) => team1Ids.includes(c.playerId));
            const team2EloChanges = eloChanges.filter((c) => team2Ids.includes(c.playerId));
            const sets = m.sets as Array<{ setNumber: number; team1Games: number; team2Games: number }> | null;

            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 group">
                {/* Sport badge */}
                {m.sportName && (
                  <div className="mb-2">
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {m.sportName}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Team 1 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", team1Won ? "text-primary" : "text-foreground")}>
                          {team1Players.map((p) => p.name).join(" / ") || "—"}
                        </span>
                        {team1Won && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            {language === "en" ? "Winner" : language === "pt" ? "Vencedor" : "Ganador"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold tabular-nums", team1Won ? "text-primary" : "text-muted-foreground")}>
                          {m.team1Score ?? 0}
                        </span>
                        {team1EloChanges.length > 0 && (
                          <EloBadge changes={team1EloChanges} />
                        )}
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", !team1Won && !isDraw ? "text-primary" : "text-foreground")}>
                          {team2Players.map((p) => p.name).join(" / ") || "—"}
                        </span>
                        {!team1Won && !isDraw && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            {language === "en" ? "Winner" : language === "pt" ? "Vencedor" : "Ganador"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold tabular-nums", !team1Won && !isDraw ? "text-primary" : "text-muted-foreground")}>
                          {m.team2Score ?? 0}
                        </span>
                        {team2EloChanges.length > 0 && (
                          <EloBadge changes={team2EloChanges} />
                        )}
                      </div>
                    </div>

                    {/* Sets detail */}
                    {sets && sets.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">{t("sets")}:</span>
                        <div className="flex gap-2">
                          {sets.map((s, idx) => (
                            <span key={idx} className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {s.team1Games}-{s.team2Games}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/partidos/${m.id}/editar`}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={t("edit")}
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={t("delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(m.playedAt, language)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EloBadge({ changes }: { changes: EloChange[] }) {
  const totalChange = changes.reduce((acc, c) => acc + c.eloChange, 0) / changes.length;
  const rounded = Math.round(totalChange);
  if (rounded === 0) return null;

  const isPositive = rounded > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded font-mono",
        isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400",
      )}
    >
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isPositive ? `+${rounded}` : rounded}
    </span>
  );
}
