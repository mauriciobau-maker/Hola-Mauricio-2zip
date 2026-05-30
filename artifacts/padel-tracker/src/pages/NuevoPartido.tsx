import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  useCreateMatch,
  useListPlayers,
  getListMatchesQueryKey,
  getGetRankingQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetData {
  setNumber: number;
  team1Games: number;
  team2Games: number;
}

export default function NuevoPartido() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: players } = useListPlayers();

  const [team1P1, setTeam1P1] = useState<number | null>(null);
  const [team1P2, setTeam1P2] = useState<number | null>(null);
  const [team2P1, setTeam2P1] = useState<number | null>(null);
  const [team2P2, setTeam2P2] = useState<number | null>(null);
  const [sets, setSets] = useState<SetData[]>([{ setNumber: 1, team1Games: 0, team2Games: 0 }]);
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const createMutation = useCreateMatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        navigate("/partidos");
      },
      onError: () => {
        setError("Error al registrar el partido. Verifica los datos.");
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
      setSets((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })));
    }
  };

  const updateSet = (idx: number, field: "team1Games" | "team2Games", value: number) => {
    setSets((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: Math.max(0, value) } : s));
  };

  const selectedIds = [team1P1, team1P2, team2P1, team2P2].filter(Boolean) as number[];
  const team1Wins = sets.filter((s) => s.team1Games > s.team2Games).length;
  const team2Wins = sets.filter((s) => s.team2Games > s.team1Games).length;

  const playerOptions = (exclude: number[]) =>
    (players ?? []).filter((p) => !exclude.includes(p.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!team1P1 || !team1P2 || !team2P1 || !team2P2) {
      setError("Selecciona los 4 jugadores.");
      return;
    }
    if (new Set([team1P1, team1P2, team2P1, team2P2]).size !== 4) {
      setError("Los 4 jugadores deben ser diferentes.");
      return;
    }
    if (sets.every((s) => s.team1Games === 0 && s.team2Games === 0)) {
      setError("Introduce al menos un resultado de set.");
      return;
    }
    createMutation.mutate({
      data: {
        team1Player1Id: team1P1,
        team1Player2Id: team1P2,
        team2Player1Id: team2P1,
        team2Player2Id: team2P2,
        sets,
        playedAt: new Date(playedAt).toISOString(),
      },
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/partidos" className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Registrar Partido</h1>
          <p className="text-sm text-muted-foreground">Partido 2 contra 2</p>
        </div>
      </div>

      {!players?.length ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium">Necesitas al menos 4 jugadores</p>
          <p className="text-xs text-muted-foreground">Crea jugadores primero para poder registrar un partido.</p>
          <Link
            href="/jugadores/nuevo"
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Crear jugadores
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teams */}
          <div className="grid grid-cols-2 gap-3">
            {/* Team 1 */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-center text-primary">Equipo 1</h3>
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

            {/* Team 2 */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-center text-accent">Equipo 2</h3>
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

          {/* Sets */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Sets jugados</h3>
              {sets.length < 5 && (
                <button
                  type="button"
                  onClick={addSet}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus size={12} /> Agregar set
                </button>
              )}
            </div>

            {/* Score preview */}
            <div className="flex items-center justify-center gap-3 py-2 bg-muted/30 rounded-lg">
              <span className="text-3xl font-bold text-primary tabular-nums">{team1Wins}</span>
              <span className="text-muted-foreground font-medium">-</span>
              <span className="text-3xl font-bold text-accent tabular-nums">{team2Wins}</span>
            </div>

            <div className="space-y-2">
              {sets.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Set {s.setNumber}</span>
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

          {/* Date */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-1.5">
            <label className="text-sm font-medium">Fecha del partido</label>
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

          <button
            type="submit"
            disabled={createMutation.isPending || selectedIds.length < 4}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Guardando..." : "Guardar Partido"}
          </button>
        </form>
      )}
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
            {p.name}{p.nickname ? ` (${p.nickname})` : ""}
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
        onClick={() => onChange(value - 1)}
        className="w-7 h-7 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
      >
        <Minus size={12} />
      </button>
      <span className={cn(
        "flex-1 text-center text-lg font-bold tabular-nums",
        color === "primary" ? "text-primary" : "text-accent"
      )}>
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
