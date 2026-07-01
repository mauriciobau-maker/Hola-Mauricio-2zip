import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
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

interface Sport {
  id: number;
  name: string;
  slug: string;
  teamSize: number;
  useSets: boolean;
}

export default function NuevoPartido() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: players } = useListPlayers();

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [team1Players, setTeam1Players] = useState<(number | null)[]>([null, null]);
  const [team2Players, setTeam2Players] = useState<(number | null)[]>([null, null]);
  const [sets, setSets] = useState<SetData[]>([{ setNumber: 1, team1Games: 0, team2Games: 0 }]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Cargar deportes al montar
  useState(() => {
    fetch("/api/sports")
      .then((r) => r.json())
      .then((data: Sport[]) => {
        setSports(data);
        if (data.length > 0) {
          setSelectedSport(data[0]);
          setTeam1Players(Array(data[0].teamSize).fill(null));
          setTeam2Players(Array(data[0].teamSize).fill(null));
        }
        setSportsLoaded(true);
      })
      .catch(() => setSportsLoaded(true));
  });

  const handleSportChange = (sportId: number) => {
    const sport = sports.find((s) => s.id === sportId) ?? null;
    setSelectedSport(sport);
    if (sport) {
      setTeam1Players(Array(sport.teamSize).fill(null));
      setTeam2Players(Array(sport.teamSize).fill(null));
    }
  };

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

  const allSelectedIds = [...team1Players, ...team2Players].filter(Boolean) as number[];
  const teamSize = selectedSport?.teamSize ?? 2;
  const useSets = selectedSport?.useSets ?? true;

  const team1SetsWon = sets.filter((s) => s.team1Games > s.team2Games).length;
  const team2SetsWon = sets.filter((s) => s.team2Games > s.team1Games).length;

  const availableFor = (exclude: (number | null)[]) =>
    (players ?? []).filter((p) => !exclude.filter(Boolean).includes(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const t1Ids = team1Players.filter(Boolean) as number[];
    const t2Ids = team2Players.filter(Boolean) as number[];

    if (t1Ids.length !== teamSize || t2Ids.length !== teamSize) {
      setError(`Selecciona ${teamSize} jugador${teamSize !== 1 ? "es" : ""} por equipo.`);
      return;
    }

    if (new Set([...t1Ids, ...t2Ids]).size !== t1Ids.length + t2Ids.length) {
      setError("Un jugador no puede estar en ambos equipos.");
      return;
    }

    const t1Score = useSets ? team1SetsWon : team1Score;
    const t2Score = useSets ? team2SetsWon : team2Score;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportId: selectedSport?.id,
          team1PlayerIds: t1Ids,
          team2PlayerIds: t2Ids,
          team1Score: t1Score,
          team2Score: t2Score,
          sets: useSets ? sets : null,
          playedAt: new Date(playedAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al registrar el partido.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      navigate("/partidos");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sportsLoaded) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Cargando...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/partidos" className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Registrar Partido</h1>
          <p className="text-sm text-muted-foreground">
            {selectedSport ? `${selectedSport.name} · ${teamSize}v${teamSize}` : "Selecciona un deporte"}
          </p>
        </div>
      </div>

      {!players?.length ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium">Necesitas jugadores registrados</p>
          <p className="text-xs text-muted-foreground">Crea jugadores primero para poder registrar un partido.</p>
          <Link href="/jugadores/nuevo" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90">
            Crear jugadores
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Deporte */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="text-sm font-semibold">Deporte</label>
            <div className="flex gap-2 flex-wrap">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => handleSportChange(sport.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                    selectedSport?.id === sport.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {sport.name}
                </button>
              ))}
            </div>
          </div>

          {/* Equipos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-center text-primary">Equipo 1</h3>
              {team1Players.map((val, idx) => (
                <PlayerSelect
                  key={idx}
                  label={teamSize === 1 ? "Jugador" : `Jugador ${idx + 1}`}
                  value={val}
                  onChange={(id) => setTeam1Players((prev) => prev.map((v, i) => i === idx ? id : v))}
                  options={availableFor([...team1Players.filter((_, i) => i !== idx), ...team2Players])}
                />
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-center text-accent">Equipo 2</h3>
              {team2Players.map((val, idx) => (
                <PlayerSelect
                  key={idx}
                  label={teamSize === 1 ? "Jugador" : `Jugador ${idx + 1}`}
                  value={val}
                  onChange={(id) => setTeam2Players((prev) => prev.map((v, i) => i === idx ? id : v))}
                  options={availableFor([...team1Players, ...team2Players.filter((_, i) => i !== idx)])}
                />
              ))}
            </div>
          </div>

          {/* Resultado */}
          {useSets ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sets jugados</h3>
                {sets.length < 5 && (
                  <button type="button" onClick={addSet} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus size={12} /> Agregar set
                  </button>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-3xl font-bold text-primary tabular-nums">{team1SetsWon}</span>
                <span className="text-muted-foreground font-medium">-</span>
                <span className="text-3xl font-bold text-accent tabular-nums">{team2SetsWon}</span>
              </div>
              <div className="space-y-2">
                {sets.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Set {s.setNumber}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <GamesInput value={s.team1Games} onChange={(v) => updateSet(idx, "team1Games", v)} color="primary" />
                      <span className="text-muted-foreground text-xs">-</span>
                      <GamesInput value={s.team2Games} onChange={(v) => updateSet(idx, "team2Games", v)} color="accent" />
                    </div>
                    {sets.length > 1 && (
                      <button type="button" onClick={() => removeSet(idx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Resultado (goles)</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Equipo 1</span>
                  <GamesInput value={team1Score} onChange={setTeam1Score} color="primary" />
                </div>
                <span className="text-2xl font-bold text-muted-foreground">-</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Equipo 2</span>
                  <GamesInput value={team2Score} onChange={setTeam2Score} color="accent" />
                </div>
              </div>
            </div>
          )}

          {/* Fecha */}
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
            disabled={isSubmitting || allSelectedIds.length < teamSize * 2}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Guardando..." : "Guardar Partido"}
          </button>
        </form>
      )}
    </div>
  );
}

function PlayerSelect({ label, value, onChange, options }: {
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

function GamesInput({ value, onChange, color }: {
  value: number;
  onChange: (v: number) => void;
  color: "primary" | "accent";
}) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-7 h-7 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
        <Minus size={12} />
      </button>
      <span className={cn("flex-1 text-center text-lg font-bold tabular-nums", color === "primary" ? "text-primary" : "text-accent")}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} className="w-7 h-7 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
        <Plus size={12} />
      </button>
    </div>
  );
}