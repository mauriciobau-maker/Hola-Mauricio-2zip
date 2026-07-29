import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import {
  useGetMatch,
  useUpdateMatch,
  useListPlayers,
  getListMatchesQueryKey,
  getGetMatchQueryKey,
  getGetRankingQueryKey,
  getGetDashboardQueryKey,
  getGetPlayerStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/context/LanguageContext";

interface SetData {
  setNumber: number;
  team1Games: number;
  team2Games: number;
}

const TRANSLATIONS = {
  es: {
    title: "Editar Partido",
    subtitle: "Corrige jugadores, sets o fecha",
    notFound: "Partido no encontrado",
    backToMatches: "Volver a partidos",
    team1: "Equipo 1",
    team2: "Equipo 2",
    sets: "Sets",
    addSet: "Agregar set",
    matchDate: "Fecha del partido",
    cancel: "Cancelar",
    save: "Guardar cambios",
    saving: "Guardando...",
    errorSelect4: "Selecciona los 4 jugadores.",
    errorUnique4: "Los 4 jugadores deben ser diferentes.",
    errorSave: "Error al guardar los cambios. Verifica los datos.",
    eloNotice: "El ranking y las estadísticas de todos los jugadores involucrados se recalcularán automáticamente.",
  },
  en: {
    title: "Edit Match",
    subtitle: "Correct players, sets, or date",
    notFound: "Match not found",
    backToMatches: "Back to matches",
    team1: "Team 1",
    team2: "Team 2",
    sets: "Sets",
    addSet: "Add set",
    matchDate: "Match Date",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving...",
    errorSelect4: "Select all 4 players.",
    errorUnique4: "All 4 players must be unique.",
    errorSave: "Error saving changes. Please check data.",
    eloNotice: "Rankings and statistics for all players involved will be recalculated automatically.",
  },
  pt: {
    title: "Editar Partida",
    subtitle: "Corrija jogadores, sets ou data",
    notFound: "Partida não encontrada",
    backToMatches: "Voltar para partidas",
    team1: "Equipe 1",
    team2: "Equipe 2",
    sets: "Sets",
    addSet: "Adicionar set",
    matchDate: "Data da partida",
    cancel: "Cancelar",
    save: "Salvar alterações",
    saving: "Salvando...",
    errorSelect4: "Selecione os 4 jogadores.",
    errorUnique4: "Os 4 jogadores devem ser diferentes.",
    errorSave: "Erro ao salvar alterações. Verifique os dados.",
    eloNotice: "O ranking e as estatísticas de todos os jogadores envolvidos serão recalculados automaticamente.",
  },
};

export default function EditarPartido() {
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const t = TRANSLATIONS[(language as Language) || "es"] || TRANSLATIONS.es;

  const { data: match, isLoading: loadingMatch } = useGetMatch(id, {
    query: { enabled: !!id, queryKey: getGetMatchQueryKey(id) },
  });
  const { data: players } = useListPlayers();

  const [team1P1, setTeam1P1] = useState<number | null>(null);
  const [team1P2, setTeam1P2] = useState<number | null>(null);
  const [team2P1, setTeam2P1] = useState<number | null>(null);
  const [team2P2, setTeam2P2] = useState<number | null>(null);
  const [sets, setSets] = useState<SetData[]>([{ setNumber: 1, team1Games: 0, team2Games: 0 }]);
  const [playedAt, setPlayedAt] = useState("");
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (match && !initialized) {
      const matchAny = match as any;
      const t1 = matchAny.team1Players || [];
      const t2 = matchAny.team2Players || [];

      setTeam1P1(t1[0]?.id ?? null);
      setTeam1P2(t1[1]?.id ?? null);
      setTeam2P1(t2[0]?.id ?? null);
      setTeam2P2(t2[1]?.id ?? null);

      const setsData = matchAny.sets as SetData[];
      setSets(setsData && setsData.length > 0 ? setsData : [{ setNumber: 1, team1Games: 0, team2Games: 0 }]);
      setPlayedAt(new Date(matchAny.playedAt).toISOString().split("T")[0]);
      setInitialized(true);
    }
  }, [match, initialized]);

  const updateMutation = useUpdateMatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMatchQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });

        const playerIds = [team1P1, team1P2, team2P1, team2P2].filter(Boolean) as number[];
        for (const pid of playerIds) {
          queryClient.invalidateQueries({ queryKey: getGetPlayerStatsQueryKey(pid) });
        }
        navigate("/partidos");
      },
      onError: () => {
        setError(t.errorSave);
      },
    },
  });

  const addSet = () => {
    if (sets.length < 5) {
      setSets((prev) => [...prev, { setNumber: prev.length + 1, team1Games: 0, team2Games: 0 }]);
    }
  };

  const removeSet = (idx: number) => {
    if (sets.length > 1) {
      setSets((prev) =>
        prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 }))
      );
    }
  };

  const updateSet = (idx: number, field: "team1Games" | "team2Games", value: number) => {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: Math.max(0, value) } : s)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!team1P1 || !team1P2 || !team2P1 || !team2P2) {
      setError(t.errorSelect4);
      return;
    }
    if (new Set([team1P1, team1P2, team2P1, team2P2]).size !== 4) {
      setError(t.errorUnique4);
      return;
    }

    updateMutation.mutate({
      id,
      data: {
        team1PlayerIds: [team1P1, team1P2],
        team2PlayerIds: [team2P1, team2P2],
        sets,
        playedAt: new Date(playedAt).toISOString(),
      } as any,
    });
  };

  if (loadingMatch || !initialized) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="h-48 bg-card rounded-xl border border-border" />
        <div className="h-40 bg-card rounded-xl border border-border" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t.notFound}</p>
        <Link href="/partidos" className="text-primary hover:underline text-sm mt-2 block">
          {t.backToMatches}
        </Link>
      </div>
    );
  }

  const team1Wins = sets.filter((s) => s.team1Games > s.team2Games).length;
  const team2Wins = sets.filter((s) => s.team2Games > s.team1Games).length;

  const playerOptions = (exclude: number[]) =>
    (players ?? []).filter((p) => !exclude.includes(p.id));

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/partidos"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-center text-primary">{t.team1}</h3>
            <PlayerSelect
              label="Jugador 1"
              value={team1P1}
              onChange={setTeam1P1}
              options={playerOptions([team1P2, team2P1, team2P2].filter(Boolean) as number[])}
            />
            <PlayerSelect
              label="Jugador 2"
              value={team1P2}
              onChange={setTeam1P2}
              options={playerOptions([team1P1, team2P1, team2P2].filter(Boolean) as number[])}
            />
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-center text-accent">{t.team2}</h3>
            <PlayerSelect
              label="Jugador 1"
              value={team2P1}
              onChange={setTeam2P1}
              options={playerOptions([team1P1, team1P2, team2P2].filter(Boolean) as number[])}
            />
            <PlayerSelect
              label="Jugador 2"
              value={team2P2}
              onChange={setTeam2P2}
              options={playerOptions([team1P1, team1P2, team2P1].filter(Boolean) as number[])}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t.sets}</h3>
            {sets.length < 5 && (
              <button
                type="button"
                onClick={addSet}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus size={12} /> {t.addSet}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 py-2 bg-muted/30 rounded-lg">
            <span className="text-3xl font-bold text-primary tabular-nums">{team1Wins}</span>
            <span className="text-muted-foreground font-medium">-</span>
            <span className="text-3xl font-bold text-accent tabular-nums">{team2Wins}</span>
          </div>

          <div className="space-y-2">
            {sets.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10 flex-shrink-0">
                  Set {s.setNumber}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <GamesInput
                    value={s.team1Games}
                    onChange={(v) => updateSet(idx, "team1Games", v)}
                    color="primary"
                  />
                  <span className="text-muted-foreground text-xs">-</span>
                  <GamesInput
                    value={s.team2Games}
                    onChange={(v) => updateSet(idx, "team2Games", v)}
                    color="accent"
                  />
                </div>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(idx)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-1.5">
          <label className="text-sm font-medium">{t.matchDate}</label>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Link
            href="/partidos"
            className="flex-1 text-center border border-border rounded-lg py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            {t.cancel}
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {updateMutation.isPending ? t.saving : t.save}
          </button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        {t.eloNotice}
      </p>
    </div>
  );
}

function PlayerSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  options: Array<{ id: number; name: string; nickname?: string | null }>;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="w-full bg-background border border-input rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Seleccionar...</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.nickname ? ` (${p.nickname})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function GamesInput({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: "primary" | "accent";
}) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
      >
        <Minus size={12} />
      </button>
      <span
        className={cn(
          "flex-1 text-center text-lg font-bold tabular-nums",
          color === "primary" ? "text-primary" : "text-accent"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}