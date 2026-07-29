import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  useListPlayers,
  useCreateMatch,
  getListMatchesQueryKey,
  getGetRankingQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, X, Shuffle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/context/LanguageContext";

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

interface Player {
  id: number;
  name: string;
  nickname?: string | null;
  elo: number;
}

function balanceTeams(players: Player[]): [Player[], Player[]] {
  const sorted = [...players].sort((a, b) => b.elo - a.elo);
  const team1: Player[] = [];
  const team2: Player[] = [];
  sorted.forEach((p, i) => {
    const pos = i % 4;
    if (pos === 0 || pos === 3) team1.push(p);
    else team2.push(p);
  });
  return [team1, team2];
}

type Mode = "manual" | "balance";

const TRANSLATIONS = {
  es: {
    title: "Registrar Partido",
    needPlayers: "Necesitas jugadores registrados",
    createPlayers: "Crear jugadores",
    sport: "Deporte",
    mode: "Modo de armado",
    manual: "Manual",
    balanceElo: "Balancear por ELO",
    team1: "Equipo 1",
    team2: "Equipo 2",
    selectPlayers: "Selecciona jugadores",
    balanceButton: "Balancear equipos",
    balancedTitle: "Equipos balanceados",
    reshuffle: "Mezclar de nuevo",
    eloDiff: "Diferencia de ELO promedio:",
    setsPlayed: "Sets jugados",
    addSet: "Agregar set",
    matchDate: "Fecha del partido",
    save: "Guardar Partido",
    saving: "Guardando...",
    errorBalanceCount: "Selecciona la cantidad exacta de jugadores para balancear.",
    errorFirstBalance: "Primero balancea los equipos.",
    errorTeamSize: "Selecciona los jugadores requeridos por equipo.",
    errorDuplicatePlayer: "Un jugador no puede estar en ambos equipos.",
    errorSave: "Error al registrar el partido. Inténtalo de nuevo.",
  },
  en: {
    title: "Register Match",
    needPlayers: "Registered players required",
    createPlayers: "Create players",
    sport: "Sport",
    mode: "Setup Mode",
    manual: "Manual",
    balanceElo: "Balance by ELO",
    team1: "Team 1",
    team2: "Team 2",
    selectPlayers: "Select players",
    balanceButton: "Balance teams",
    balancedTitle: "Balanced Teams",
    reshuffle: "Reshuffle",
    eloDiff: "Avg ELO difference:",
    setsPlayed: "Sets played",
    addSet: "Add set",
    matchDate: "Match Date",
    save: "Save Match",
    saving: "Saving...",
    errorBalanceCount: "Select the exact number of players to balance.",
    errorFirstBalance: "Balance teams first.",
    errorTeamSize: "Select all required players for each team.",
    errorDuplicatePlayer: "A player cannot be on both teams.",
    errorSave: "Error registering match. Please try again.",
  },
  pt: {
    title: "Registrar Partida",
    needPlayers: "Jogadores registrados necessários",
    createPlayers: "Criar jogadores",
    sport: "Esporte",
    mode: "Modo de montagem",
    manual: "Manual",
    balanceElo: "Balancear por ELO",
    team1: "Equipe 1",
    team2: "Equipe 2",
    selectPlayers: "Selecionar jogadores",
    balanceButton: "Balancear equipes",
    balancedTitle: "Equipes balanceadas",
    reshuffle: "Embaralhar novamente",
    eloDiff: "Diferença média de ELO:",
    setsPlayed: "Sets jogados",
    addSet: "Adicionar set",
    matchDate: "Data da partida",
    save: "Salvar Partida",
    saving: "Salvando...",
    errorBalanceCount: "Selecione a quantidade exata de jogadores para balancear.",
    errorFirstBalance: "Balanceie as equipes primeiro.",
    errorTeamSize: "Selecione os jogadores necessários por equipe.",
    errorDuplicatePlayer: "Um jogador não pode estar em ambas as equipes.",
    errorSave: "Erro ao registrar a partida. Tente novamente.",
  },
};

export default function NuevoPartido() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: players } = useListPlayers();
  const createMatchMutation = useCreateMatch();

  const { language } = useLanguage();
  const t = TRANSLATIONS[(language as Language) || "es"] || TRANSLATIONS.es;

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [mode, setMode] = useState<Mode>("manual");

  const [team1Players, setTeam1Players] = useState<(number | null)[]>([null, null]);
  const [team2Players, setTeam2Players] = useState<(number | null)[]>([null, null]);

  const [selectedForBalance, setSelectedForBalance] = useState<number[]>([]);
  const [balancedTeam1, setBalancedTeam1] = useState<Player[]>([]);
  const [balancedTeam2, setBalancedTeam2] = useState<Player[]>([]);
  const [balanceConfirmed, setBalanceConfirmed] = useState(false);

  const [sets, setSets] = useState<SetData[]>([{ setNumber: 1, team1Games: 0, team2Games: 0 }]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  const handleSportChange = (sportId: number) => {
    const sport = sports.find((s) => s.id === sportId) ?? null;
    setSelectedSport(sport);
    if (sport) {
      setTeam1Players(Array(sport.teamSize).fill(null));
      setTeam2Players(Array(sport.teamSize).fill(null));
      setSelectedForBalance([]);
      setBalancedTeam1([]);
      setBalancedTeam2([]);
      setBalanceConfirmed(false);
    }
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setError("");
    setBalanceConfirmed(false);
    setSelectedForBalance([]);
    setBalancedTeam1([]);
    setBalancedTeam2([]);
  };

  const togglePlayerForBalance = (playerId: number) => {
    const teamSize = selectedSport?.teamSize ?? 2;
    const maxPlayers = teamSize * 2;
    setSelectedForBalance((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= maxPlayers) return prev;
      return [...prev, playerId];
    });
    setBalanceConfirmed(false);
    setBalancedTeam1([]);
    setBalancedTeam2([]);
  };

  const handleBalance = () => {
    const teamSize = selectedSport?.teamSize ?? 2;
    if (selectedForBalance.length !== teamSize * 2) {
      setError(t.errorBalanceCount);
      return;
    }
    setError("");
    const selectedPlayers = (players as Player[] ?? []).filter((p) => selectedForBalance.includes(p.id));
    const [t1, t2] = balanceTeams(selectedPlayers);
    setBalancedTeam1(t1);
    setBalancedTeam2(t2);
    setBalanceConfirmed(true);
  };

  const handleReshuffle = () => {
    const selectedPlayers = (players as Player[] ?? []).filter((p) => selectedForBalance.includes(p.id));
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const [t1, t2] = balanceTeams(shuffled);
    setBalancedTeam1(t1);
    setBalancedTeam2(t2);
  };

  const addSet = () => {
    if (sets.length < 5) setSets((prev) => [...prev, { setNumber: prev.length + 1, team1Games: 0, team2Games: 0 }]);
  };
  const removeSet = (idx: number) => {
    if (sets.length > 1) setSets((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })));
  };
  const updateSet = (idx: number, field: "team1Games" | "team2Games", value: number) => {
    setSets((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: Math.max(0, value) } : s));
  };

  const teamSize = selectedSport?.teamSize ?? 2;
  const useSets = selectedSport?.useSets ?? true;
  const team1SetsWon = sets.filter((s) => s.team1Games > s.team2Games).length;
  const team2SetsWon = sets.filter((s) => s.team2Games > s.team1Games).length;
  const allSelectedIds = [...team1Players, ...team2Players].filter(Boolean) as number[];
  const canBalance = selectedSport?.slug !== "futbol";

  const availableFor = (exclude: (number | null)[]) =>
    (players ?? []).filter((p) => !exclude.filter(Boolean).includes(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let t1Ids: number[] = [];
    let t2Ids: number[] = [];

    if (mode === "manual") {
      t1Ids = team1Players.filter(Boolean) as number[];
      t2Ids = team2Players.filter(Boolean) as number[];
      if (t1Ids.length !== teamSize || t2Ids.length !== teamSize) {
        setError(t.errorTeamSize);
        return;
      }
    } else {
      if (!balanceConfirmed || balancedTeam1.length === 0) {
        setError(t.errorFirstBalance);
        return;
      }
      t1Ids = balancedTeam1.map((p) => p.id);
      t2Ids = balancedTeam2.map((p) => p.id);
    }

    if (new Set([...t1Ids, ...t2Ids]).size !== t1Ids.length + t2Ids.length) {
      setError(t.errorDuplicatePlayer);
      return;
    }

    const t1Score = useSets ? team1SetsWon : team1Score;
    const t2Score = useSets ? team2SetsWon : team2Score;

    try {
      await createMatchMutation.mutateAsync({
        data: {
          sportId: selectedSport?.id,
          team1PlayerIds: t1Ids,
          team2PlayerIds: t2Ids,
          team1Score: t1Score,
          team2Score: t2Score,
          sets: useSets ? sets : null,
          playedAt: new Date(playedAt).toISOString(),
        } as any,
      });

      queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      navigate("/partidos");
    } catch {
      setError(t.errorSave);
    }
  };

  if (!sportsLoaded) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">...</div>;
  }

  const eloAvg = (ps: Player[]) => ps.length ? Math.round(ps.reduce((s, p) => s + p.elo, 0) / ps.length) : 0;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/partidos" className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedSport ? `${selectedSport.name} · ${teamSize}v${teamSize}` : ""}
          </p>
        </div>
      </div>

      {!players?.length ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium">{t.needPlayers}</p>
          <Link href="/jugadores/nuevo" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90">
            {t.createPlayers}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="text-sm font-semibold">{t.sport}</label>
            <div className="flex gap-2 flex-wrap">
              {sports.map((sport) => (
                <button key={sport.id} type="button" onClick={() => handleSportChange(sport.id)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                    selectedSport?.id === sport.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  )}>
                  {sport.name}
                </button>
              ))}
            </div>
          </div>

          {canBalance && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <label className="text-sm font-semibold">{t.mode}</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleModeChange("manual")}
                  className={cn("flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                    mode === "manual" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  )}>
                  <Users size={15} /> {t.manual}
                </button>
                <button type="button" onClick={() => handleModeChange("balance")}
                  className={cn("flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                    mode === "balance" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  )}>
                  <Shuffle size={15} /> {t.balanceElo}
                </button>
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-center text-primary">{t.team1}</h3>
                {team1Players.map((val, idx) => (
                  <PlayerSelect key={idx}
                    label={teamSize === 1 ? "Jugador" : `Jugador ${idx + 1}`}
                    value={val}
                    onChange={(id) => setTeam1Players((prev) => prev.map((v, i) => i === idx ? id : v))}
                    options={availableFor([...team1Players.filter((_, i) => i !== idx), ...team2Players])}
                  />
                ))}
              </div>
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-center text-accent">{t.team2}</h3>
                {team2Players.map((val, idx) => (
                  <PlayerSelect key={idx}
                    label={teamSize === 1 ? "Jugador" : `Jugador ${idx + 1}`}
                    value={val}
                    onChange={(id) => setTeam2Players((prev) => prev.map((v, i) => i === idx ? id : v))}
                    options={availableFor([...team1Players, ...team2Players.filter((_, i) => i !== idx)])}
                  />
                ))}
              </div>
            </div>
          )}

          {mode === "balance" && (
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t.selectPlayers}</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedForBalance.length} / {teamSize * 2}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {(players as Player[]).map((player) => {
                    const isSelected = selectedForBalance.includes(player.id);
                    const isDisabled = !isSelected && selectedForBalance.length >= teamSize * 2;
                    return (
                      <button key={player.id} type="button"
                        onClick={() => togglePlayerForBalance(player.id)}
                        disabled={isDisabled}
                        className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors",
                          isSelected ? "bg-primary/10 border-primary/40 text-foreground" :
                          isDisabled ? "opacity-40 cursor-not-allowed bg-muted border-border" :
                          "bg-muted/30 border-border hover:border-primary/30"
                        )}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="font-medium">{player.name}</span>
                          {player.nickname && <span className="text-muted-foreground text-xs">"{player.nickname}"</span>}
                        </div>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded font-medium">
                          {player.elo}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={handleBalance}
                  disabled={selectedForBalance.length !== teamSize * 2}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                  <Shuffle size={15} /> {t.balanceButton}
                </button>
              </div>

              {balanceConfirmed && balancedTeam1.length > 0 && (
                <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary">{t.balancedTitle}</h3>
                    <button type="button" onClick={handleReshuffle}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Shuffle size={12} /> {t.reshuffle}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-primary">{t.team1}</p>
                        <span className="text-xs text-muted-foreground font-mono">~{eloAvg(balancedTeam1)} ELO</span>
                      </div>
                      {balancedTeam1.map((p) => (
                        <div key={p.id} className="bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5 text-xs font-medium">
                          {p.name}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-accent">{t.team2}</p>
                        <span className="text-xs text-muted-foreground font-mono">~{eloAvg(balancedTeam2)} ELO</span>
                      </div>
                      {balancedTeam2.map((p) => (
                        <div key={p.id} className="bg-accent/5 border border-accent/20 rounded-lg px-2.5 py-1.5 text-xs font-medium">
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    {t.eloDiff} <span className="font-mono font-medium">{Math.abs(eloAvg(balancedTeam1) - eloAvg(balancedTeam2))} pts</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {(mode === "manual" ? allSelectedIds.length === teamSize * 2 : balanceConfirmed) && (
            <>
              {useSets ? (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.setsPlayed}</h3>
                    {sets.length < 5 && (
                      <button type="button" onClick={addSet} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus size={12} /> {t.addSet}
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
                  <h3 className="text-sm font-semibold">Resultado</h3>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{t.team1}</span>
                      <GamesInput value={team1Score} onChange={setTeam1Score} color="primary" />
                    </div>
                    <span className="text-2xl font-bold text-muted-foreground">-</span>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{t.team2}</span>
                      <GamesInput value={team2Score} onChange={setTeam2Score} color="accent" />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl p-4 space-y-1.5">
                <label className="text-sm font-medium">{t.matchDate}</label>
                <input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit"
            disabled={createMatchMutation.isPending || (mode === "manual" ? allSelectedIds.length < teamSize * 2 : !balanceConfirmed)}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
            {createMatchMutation.isPending ? t.saving : t.save}
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
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="w-full bg-background border border-input rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Seleccionar...</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{p.name}{p.nickname ? ` (${p.nickname})` : ""}</option>
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