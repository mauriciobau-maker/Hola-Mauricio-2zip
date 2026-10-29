import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  useListPlayers,
  getListMatchesQueryKey,
  getGetRankingQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Minus,
  X,
  Shuffle,
  Users,
  Shield,
  Swords,
  UserCheck,
  UserPlus,
  Trophy,
} from "lucide-react";
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
  minTeamSize?: number;
  maxTeamSize?: number;
  useSets: boolean;
}

interface Modality {
  id: number;
  sportId: number;
  name: string;
  slug: string;
  teamSize: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  useSets: boolean;
  active: boolean;
}

interface Player {
  id: number;
  name: string;
  nickname?: string | null;
  elo: number;
}

type MatchType = "rival" | "internal";
type Mode = "manual" | "balance";

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

const TRANSLATIONS = {
  es: {
    title: "Registrar Partido",
    needPlayers: "Necesitas jugadores registrados",
    needPlayersDesc: "Registra primero a los jugadores del club para armar la nómina del partido.",
    createPlayers: "Crear jugadores",
    sport: "Deporte",
    modality: "Modalidad de juego",
    playersPerTeam: "jugadores por equipo",
    loadingSports: "Cargando deportes...",
    matchTypeTitle: "Tipo de Partido",
    vsRival: "vs Rival Externo",
    vsRivalDesc: "Nuestro equipo compite contra otro club",
    internal: "Partido Interno",
    internalDesc: "Entrenamiento o inter-escuadras del club",
    rivalTeamNameLabel: "Nombre del Club / Equipo Rival",
    rivalTeamNamePlaceholder: "Ej: Deportivo San Martín, Rival FC...",
    mode: "Modo de armado",
    manual: "Manual",
    balanceElo: "Balancear Equipos por Nivel",
    team1: "Equipo 1",
    team2: "Equipo 2",
    ourTeam: "Nuestro Club / Convocatoria",
    ourClubShort: "Nuestro Club",
    startersTitle: "Titulares",
    substitutesTitle: "Banca y Suplentes",
    subBadge: "Suplente:",
    noSubstitutes: "No hay suplentes convocados. Puedes añadir suplentes si tu equipo tiene cambios.",
    addSub: "Agregar Suplente",
    selectOption: "Seleccionar jugador...",
    balanceButton: "Balancear equipos",
    balancedTitle: "Equipos balanceados",
    reshuffle: "Mezclar de nuevo",
    level: "Nivel",
    eloDiff: "Diferencia de nivel promedio:",
    setsPlayed: "Sets jugados",
    addSet: "Agregar set",
    matchDate: "Fecha del partido",
    scoreTitle: "Marcador Final (Goles)",
    save: "Guardar Partido",
    saving: "Guardando...",
    errorRivalName: "Por favor ingresa el nombre del equipo rival.",
    errorStartersMissing: "Faltan jugadores titulares por seleccionar.",
    errorDuplicatePlayer: "Un jugador no puede estar repetido entre titulares o suplentes.",
    errorSave: "Error al registrar el partido. Inténtalo de nuevo.",
    selectPlayers: "Seleccionar Jugadores Convocados",
    playerIdx: (n: number) => `Titular #${n}`,
    rivalDefault: "Rival",
  },
  en: {
    title: "Register Match",
    needPlayers: "Registered players required",
    needPlayersDesc: "First register club players to build the match roster.",
    createPlayers: "Create players",
    sport: "Sport",
    modality: "Game Modality",
    playersPerTeam: "players per team",
    loadingSports: "Loading sports...",
    matchTypeTitle: "Match Type",
    vsRival: "vs External Rival",
    vsRivalDesc: "Our team plays against another club",
    internal: "Internal Match",
    internalDesc: "Intra-squad or practice match",
    rivalTeamNameLabel: "Opponent / Rival Team Name",
    rivalTeamNamePlaceholder: "e.g. San Martin FC, Rival Club...",
    mode: "Setup Mode",
    manual: "Manual",
    balanceElo: "Balance Teams by Form/Level",
    team1: "Team 1",
    team2: "Team 2",
    ourTeam: "Our Club / Squad",
    ourClubShort: "Our Club",
    startersTitle: "Starting Lineup",
    substitutesTitle: "Bench & Substitutes",
    subBadge: "Sub:",
    noSubstitutes: "No substitutes called up. You can add substitutes if your team makes changes.",
    addSub: "Add Substitute",
    selectOption: "Select player...",
    balanceButton: "Balance teams",
    balancedTitle: "Balanced Teams",
    reshuffle: "Reshuffle",
    level: "Level",
    eloDiff: "Avg level difference:",
    setsPlayed: "Sets played",
    addSet: "Add set",
    matchDate: "Match Date",
    scoreTitle: "Final Score (Goals)",
    save: "Save Match",
    saving: "Saving...",
    errorRivalName: "Please enter the opponent team name.",
    errorStartersMissing: "Please select all required starting players.",
    errorDuplicatePlayer: "A player cannot be selected more than once.",
    errorSave: "Error registering match. Please try again.",
    selectPlayers: "Select Squad Players",
    playerIdx: (n: number) => `Starter #${n}`,
    rivalDefault: "Opponent",
  },
  pt: {
    title: "Registrar Partida",
    needPlayers: "Jogadores registrados necessários",
    needPlayersDesc: "Cadastre primeiro os jogadores do clube para montar a lista da partida.",
    createPlayers: "Criar jogadores",
    sport: "Esporte",
    modality: "Modalidade de jogo",
    playersPerTeam: "jogadores por equipe",
    loadingSports: "Carregando esportes...",
    matchTypeTitle: "Tipo de Partida",
    vsRival: "vs Rival Externo",
    vsRivalDesc: "Nossa equipe joga contra outro clube",
    internal: "Partida Interna",
    internalDesc: "Treino ou inter-equipes do clube",
    rivalTeamNameLabel: "Nome do Clube / Time Rival",
    rivalTeamNamePlaceholder: "Ex: Deportivo San Martin, Rival FC...",
    mode: "Modo de montagem",
    manual: "Manual",
    balanceElo: "Balancear Equipes por Nível",
    team1: "Equipe 1",
    team2: "Equipe 2",
    ourTeam: "Nosso Clube / Convocação",
    ourClubShort: "Nosso Clube",
    startersTitle: "Titulares",
    substitutesTitle: "Banco e Reservas",
    subBadge: "Reserva:",
    noSubstitutes: "Nenhum reserva convocado. Você pode adicionar reservas se sua equipe tiver substituições.",
    addSub: "Adicionar Reserva",
    selectOption: "Selecionar jogador...",
    balanceButton: "Balancear equipes",
    balancedTitle: "Equipes balanceadas",
    reshuffle: "Embaralhar novamente",
    level: "Nível",
    eloDiff: "Diferença média de nível:",
    setsPlayed: "Sets jogados",
    addSet: "Adicionar set",
    matchDate: "Data da partida",
    scoreTitle: "Placar Final (Gols)",
    save: "Salvar Partida",
    saving: "Salvando...",
    errorRivalName: "Por favor, digite o nome do time adversário.",
    errorStartersMissing: "Selecione todos os titulares necessários.",
    errorDuplicatePlayer: "Um jogador não pode estar repetido.",
    errorSave: "Erro ao registrar a partida. Tente novamente.",
    selectPlayers: "Selecionar Jogadores Convocados",
    playerIdx: (n: number) => `Titular #${n}`,
    rivalDefault: "Rival",
  },
};

export default function NuevoPartido() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: players } = useListPlayers();

  const { language } = useLanguage();
  const t = TRANSLATIONS[(language as Language) || "es"] || TRANSLATIONS.es;

  // Sports & Modalities state
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

  const [modalities, setModalities] = useState<Modality[]>([]);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);

  // Match Type: Default to "rival" for fútbol, "internal" for pádel/tenis
  const [matchType, setMatchType] = useState<MatchType>("rival");
  const [rivalTeamName, setRivalTeamName] = useState("");

  // Mode for internal matches (manual vs balance)
  const [mode, setMode] = useState<Mode>("manual");

  // Rosters
  // Team 1 starters & substitutes
  const [team1Players, setTeam1Players] = useState<(number | null)[]>([]);
  const [team1Substitutes, setTeam1Substitutes] = useState<number[]>([]);

  // Team 2 starters & substitutes (only for internal matches)
  const [team2Players, setTeam2Players] = useState<(number | null)[]>([]);
  const [team2Substitutes, setTeam2Substitutes] = useState<number[]>([]);

  // Balance by Elo
  const [selectedForBalance, setSelectedForBalance] = useState<number[]>([]);
  const [balancedTeam1, setBalancedTeam1] = useState<Player[]>([]);
  const [balancedTeam2, setBalancedTeam2] = useState<Player[]>([]);
  const [balanceConfirmed, setBalanceConfirmed] = useState(false);

  // Scores
  const [sets, setSets] = useState<SetData[]>([{ setNumber: 1, team1Games: 0, team2Games: 0 }]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split("T")[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [club, setClub] = useState<any>(null);

  // 0. Load current active club
  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClub(d))
      .catch(() => {});
  }, []);

  // 1. Initial load of sports
  useEffect(() => {
    fetch("/api/sports")
      .then((r) => r.json())
      .then((data: Sport[]) => {
        setSports(data);
        if (data.length > 0) {
          const savedSportId = typeof window !== "undefined" ? localStorage.getItem("selected_sport_id") : null;
          const found = savedSportId ? data.find((s) => String(s.id) === savedSportId) : null;
          const defaultSport = found || data.find((s) => s.slug === "futbol") || data[0];
          setSelectedSport(defaultSport);
          setMatchType(defaultSport.slug === "futbol" ? "rival" : "internal");
        }
        setSportsLoaded(true);
      })
      .catch(() => setSportsLoaded(true));
  }, []);

  // 2. Load modalities when sport changes
  useEffect(() => {
    if (!selectedSport) return;

    fetch(`/api/sport-modalities?sportId=${selectedSport.id}`)
      .then((r) => r.json())
      .then((mods: Modality[]) => {
        setModalities(mods);
        if (mods.length > 0) {
          // Select default modality: for fútbol, prefer fútbol-7 or baby-futbol
          let chosen =
            mods.find((m) => m.slug === "futbol-7") ||
            mods.find((m) => m.slug === "baby-futbol") ||
            mods.find((m) => m.slug === "futbol-11");
          if (!chosen && selectedSport.slug === "padel") {
            chosen = mods.find((m) => m.slug === "dobles");
          }
          if (!chosen && selectedSport.slug === "tenis") {
            chosen = mods.find((m) => m.slug === "singles");
          }
          if (!chosen) chosen = mods[0];
          setSelectedModality(chosen);
          setupRostersForModality(chosen);
        } else {
          // Fallback if no modality in db
          const teamSize = selectedSport.teamSize || 2;
          setTeam1Players(Array(teamSize).fill(null));
          setTeam2Players(Array(teamSize).fill(null));
        }
      })
      .catch(() => {});
  }, [selectedSport?.id]);

  const setupRostersForModality = (mod: Modality) => {
    setTeam1Players(Array(mod.teamSize).fill(null));
    setTeam1Substitutes([]);
    setTeam2Players(Array(mod.teamSize).fill(null));
    setTeam2Substitutes([]);
    setSelectedForBalance([]);
    setBalancedTeam1([]);
    setBalancedTeam2([]);
    setBalanceConfirmed(false);
  };

  const handleSportChange = (sportId: number) => {
    const s = sports.find((item) => item.id === sportId) ?? null;
    setSelectedSport(s);
    if (s) {
      setMatchType(s.slug === "futbol" ? "rival" : "internal");
      setError("");
    }
  };

  const handleModalityChange = (mod: Modality) => {
    setSelectedModality(mod);
    setupRostersForModality(mod);
    setError("");
  };

  const teamSize = selectedModality?.teamSize ?? selectedSport?.teamSize ?? 2;
  const useSets = selectedModality?.useSets ?? selectedSport?.useSets ?? false;

  const team1SetsWon = sets.filter((s) => s.team1Games > s.team2Games).length;
  const team2SetsWon = sets.filter((s) => s.team2Games > s.team1Games).length;

  // Substitutes helpers
  const handleAddSubstitute = (playerId: number, team: "team1" | "team2") => {
    if (team === "team1") {
      if (!team1Substitutes.includes(playerId)) {
        setTeam1Substitutes((prev) => [...prev, playerId]);
      }
    } else {
      if (!team2Substitutes.includes(playerId)) {
        setTeam2Substitutes((prev) => [...prev, playerId]);
      }
    }
  };

  const handleRemoveSubstitute = (playerId: number, team: "team1" | "team2") => {
    if (team === "team1") {
      setTeam1Substitutes((prev) => prev.filter((id) => id !== playerId));
    } else {
      setTeam2Substitutes((prev) => prev.filter((id) => id !== playerId));
    }
  };

  // Balance team logic
  const togglePlayerForBalance = (playerId: number) => {
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
    if (selectedForBalance.length !== teamSize * 2) {
      setError(`Selecciona exactamente ${teamSize * 2} jugadores para balancear.`);
      return;
    }
    setError("");
    const selectedPlayers = ((players as Player[]) ?? []).filter((p) =>
      selectedForBalance.includes(p.id)
    );
    const [t1, t2] = balanceTeams(selectedPlayers);
    setBalancedTeam1(t1);
    setBalancedTeam2(t2);
    setBalanceConfirmed(true);
  };

  const handleReshuffle = () => {
    const selectedPlayers = ((players as Player[]) ?? []).filter((p) =>
      selectedForBalance.includes(p.id)
    );
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const [t1, t2] = balanceTeams(shuffled);
    setBalancedTeam1(t1);
    setBalancedTeam2(t2);
  };

  // Sets helpers
  const addSet = () => {
    if (sets.length < 5) {
      setSets((prev) => [
        ...prev,
        { setNumber: prev.length + 1, team1Games: 0, team2Games: 0 },
      ]);
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
    setSets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: Math.max(0, value) } : s))
    );
  };

  // Used player IDs to avoid duplicate selection
  const allAssignedIds = [
    ...team1Players.filter(Boolean),
    ...team1Substitutes,
    ...(matchType === "internal"
      ? [...team2Players.filter(Boolean), ...team2Substitutes]
      : []),
  ] as number[];

  const availableFor = (currentId: number | null) => {
    return ((players as Player[]) ?? []).filter(
      (p) => p.id === currentId || !allAssignedIds.includes(p.id)
    );
  };

  const availableForSubstitute = (alreadySubs: number[]) => {
    return ((players as Player[]) ?? []).filter(
      (p) => !allAssignedIds.includes(p.id) && !alreadySubs.includes(p.id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (matchType === "rival" && !rivalTeamName.trim()) {
      setError(t.errorRivalName);
      return;
    }

    let t1Starters: number[] = [];
    let t2Starters: number[] = [];

    if (matchType === "rival") {
      t1Starters = team1Players.filter(Boolean) as number[];
      const minRequired = selectedModality?.minTeamSize || teamSize;
      if (t1Starters.length < minRequired) {
        setError(
          language === "en"
            ? `You must select at least ${minRequired} starters for our team (current: ${t1Starters.length}/${teamSize}).`
            : language === "pt"
            ? `Você deve selecionar pelo menos ${minRequired} titulares do nosso time (atual: ${t1Starters.length}/${teamSize}).`
            : `Debes seleccionar al menos ${minRequired} titulares de nuestro equipo (actual: ${t1Starters.length}/${teamSize}).`
        );
        return;
      }
    } else {
      if (mode === "manual") {
        t1Starters = team1Players.filter(Boolean) as number[];
        t2Starters = team2Players.filter(Boolean) as number[];
        const minRequired = selectedModality?.minTeamSize || teamSize;
        if (t1Starters.length < minRequired || t2Starters.length < minRequired) {
          setError(
            language === "en"
              ? `You must select at least ${minRequired} starters for each team.`
              : language === "pt"
              ? `Você deve selecionar pelo menos ${minRequired} titulares para cada equipe.`
              : `Debes seleccionar al menos ${minRequired} titulares para cada equipo.`
          );
          return;
        }
      } else {
        if (!balanceConfirmed || balancedTeam1.length === 0) {
          setError(
            language === "en"
              ? "Please balance teams first."
              : language === "pt"
              ? "Primeiro equilibre as equipes."
              : "Primero balancea los equipos."
          );
          return;
        }
        t1Starters = balancedTeam1.map((p) => p.id);
        t2Starters = balancedTeam2.map((p) => p.id);
      }
    }

    const t1ScoreVal = useSets ? team1SetsWon : team1Score;
    const t2ScoreVal = useSets ? team2SetsWon : team2Score;

    setIsSubmitting(true);

    try {
      const payload = {
        sportId: selectedSport?.id,
        modalityId: selectedModality?.id,
        clubId: club?.id ? Number(club.id) : undefined,
        matchType,
        rivalTeamName: matchType === "rival" ? rivalTeamName.trim() : null,
        team1PlayerIds: t1Starters,
        team1SubstituteIds: team1Substitutes,
        team2PlayerIds: matchType === "internal" ? t2Starters : [],
        team2SubstituteIds: matchType === "internal" ? team2Substitutes : [],
        team1Score: t1ScoreVal,
        team2Score: t2ScoreVal,
        sets: useSets ? sets : null,
        playedAt: new Date(playedAt).toISOString(),
        autoConfirm: true,
      };

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(club?.id ? { "x-club-id": String(club.id) } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t.errorSave);
      }

      queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRankingQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      navigate("/partidos");
    } catch (err: any) {
      setError(err?.message || t.errorSave);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sportsLoaded) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        {t.loadingSports}
      </div>
    );
  }

  const eloAvg = (ps: Player[]) =>
    ps.length ? Math.round(ps.reduce((s, p) => s + p.elo, 0) / ps.length) : 0;

  const t1StartersCount = team1Players.filter(Boolean).length;
  const isReadyToSubmit =
    matchType === "rival"
      ? t1StartersCount === teamSize && rivalTeamName.trim().length > 0
      : mode === "manual"
      ? t1StartersCount === teamSize && team2Players.filter(Boolean).length === teamSize
      : balanceConfirmed;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/partidos"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedSport?.name} · {selectedModality?.name || `${teamSize} vs ${teamSize}`}
          </p>
        </div>
      </div>

      {!players?.length ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          <div>
            <p className="text-base font-semibold">{t.needPlayers}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t.needPlayersDesc}
            </p>
          </div>
          <Link
            href="/jugadores/nuevo"
            className="inline-block bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 shadow-sm transition-all"
          >
            {t.createPlayers}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Selector de Deporte */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.sport}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => handleSportChange(sport.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all",
                    selectedSport?.id === sport.id
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                      : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:bg-muted/80"
                  )}
                >
                  <Trophy size={16} />
                  {sport.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Selector de Modalidad (Fútbol 11, Fútbol 7, Futbolito, Baby Fútbol, etc.) */}
          {modalities.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.modality}
                </label>
                <span className="text-xs font-medium text-primary">
                  {selectedModality?.teamSize} {t.playersPerTeam}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modalities.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleModalityChange(mod)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-lg text-xs font-medium border transition-all text-center",
                      selectedModality?.id === mod.id
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{mod.name}</span>
                    <span className="text-[10px] opacity-75 font-normal mt-0.5">
                      {mod.teamSize} vs {mod.teamSize}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Selector de Tipo de Partido: vs Rival Externo o Partido Interno */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.matchTypeTitle}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMatchType("rival")}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  matchType === "rival"
                    ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/30"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-md mt-0.5",
                    matchType === "rival"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.vsRival}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.vsRivalDesc}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMatchType("internal")}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  matchType === "internal"
                    ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/30"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-md mt-0.5",
                    matchType === "internal"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Swords size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.internal}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.internalDesc}</p>
                </div>
              </button>
            </div>

            {/* Input nombre del equipo rival si es vs Rival Externo */}
            {matchType === "rival" && (
              <div className="pt-2 space-y-1.5 border-t border-border mt-3">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Shield size={14} className="text-primary" />
                  {t.rivalTeamNameLabel} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.rivalTeamNamePlaceholder}
                  value={rivalTeamName}
                  onChange={(e) => setRivalTeamName(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                />
              </div>
            )}
          </div>

          {/* 4. Convocatoria y Alineación de Jugadores */}
          {matchType === "rival" ? (
            /* CONVOCATORIA VS RIVAL EXTERNO: NUESTRO EQUIPO (TITULARES + BANCA) */
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{t.ourTeam}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Titulares requeridos:</span>
                  <span
                    className={cn(
                      "font-mono font-bold px-2 py-0.5 rounded-full text-xs",
                      t1StartersCount === teamSize
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    )}
                  >
                    {t1StartersCount} / {teamSize}
                  </span>
                </div>
              </div>

              {/* Titulares */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.startersTitle} ({teamSize})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {team1Players.map((val, idx) => (
                    <PlayerSelect
                      key={idx}
                      label={t.playerIdx(idx + 1)}
                      placeholder={t.selectOption}
                      value={val}
                      onChange={(id) =>
                        setTeam1Players((prev) => prev.map((v, i) => (i === idx ? id : v)))
                      }
                      options={availableFor(val)}
                    />
                  ))}
                </div>
              </div>

              {/* Suplentes / Banca */}
              <div className="space-y-2.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={15} className="text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.substitutesTitle} ({team1Substitutes.length})
                    </p>
                  </div>
                  {/* Selector rápido para añadir suplente */}
                  {availableForSubstitute(team1Substitutes).length > 0 && (
                    <div className="w-48">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddSubstitute(parseInt(e.target.value), "team1");
                          }
                        }}
                        className="w-full bg-muted/40 border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
                      >
                        <option value="">+ {t.addSub}...</option>
                        {availableForSubstitute(team1Substitutes).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {team1Substitutes.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 italic py-1">
                    {t.noSubstitutes}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {team1Substitutes.map((subId) => {
                      const player = (players as Player[] ?? []).find((p) => p.id === subId);
                      return (
                        <div
                          key={subId}
                          className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-lg px-2.5 py-1 text-xs font-medium"
                        >
                          <span className="text-muted-foreground">{t.subBadge}</span>
                          <span className="font-semibold text-foreground">
                            {player?.name ?? `ID ${subId}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubstitute(subId, "team1")}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* PARTIDO INTERNO (EQUIPO 1 VS EQUIPO 2) */
            <div className="space-y-4">
              {selectedSport?.slug !== "futbol" && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.mode}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("manual")}
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                        mode === "manual"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <Users size={15} /> {t.manual}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("balance")}
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                        mode === "balance"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <Shuffle size={15} /> {t.balanceElo}
                    </button>
                  </div>
                </div>
              )}

              {mode === "manual" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Equipo 1 */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-center text-primary">{t.team1}</h3>
                    {team1Players.map((val, idx) => (
                      <PlayerSelect
                        key={idx}
                        label={t.playerIdx(idx + 1)}
                        placeholder={t.selectOption}
                        value={val}
                        onChange={(id) =>
                          setTeam1Players((prev) => prev.map((v, i) => (i === idx ? id : v)))
                        }
                        options={availableFor(val)}
                      />
                    ))}
                  </div>

                  {/* Equipo 2 */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-center text-accent">{t.team2}</h3>
                    {team2Players.map((val, idx) => (
                      <PlayerSelect
                        key={idx}
                        label={t.playerIdx(idx + 1)}
                        placeholder={t.selectOption}
                        value={val}
                        onChange={(id) =>
                          setTeam2Players((prev) => prev.map((v, i) => (i === idx ? id : v)))
                        }
                        options={availableFor(val)}
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
                        const isDisabled =
                          !isSelected && selectedForBalance.length >= teamSize * 2;
                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => togglePlayerForBalance(player.id)}
                            disabled={isDisabled}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors",
                              isSelected
                                ? "bg-primary/10 border-primary/40 text-foreground"
                                : isDisabled
                                ? "opacity-40 cursor-not-allowed bg-muted border-border"
                                : "bg-muted/30 border-border hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                  isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                                )}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className="font-medium">{player.name}</span>
                              {player.nickname && (
                                <span className="text-muted-foreground text-xs">
                                  "{player.nickname}"
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded font-medium">
                              {selectedSport?.slug === "futbol" ? `${(player as any).points ?? 0} pts` : player.elo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleBalance}
                      disabled={selectedForBalance.length !== teamSize * 2}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Shuffle size={15} /> {t.balanceButton}
                    </button>
                  </div>

                  {balanceConfirmed && balancedTeam1.length > 0 && (
                    <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-primary">{t.balancedTitle}</h3>
                        <button
                          type="button"
                          onClick={handleReshuffle}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Shuffle size={12} /> {t.reshuffle}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-primary">{t.team1}</p>
                            <span className="text-xs text-muted-foreground font-mono">
                              {t.level} ~{eloAvg(balancedTeam1)} pts
                            </span>
                          </div>
                          {balancedTeam1.map((p) => (
                            <div
                              key={p.id}
                              className="bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                            >
                              {p.name}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-accent">{t.team2}</p>
                            <span className="text-xs text-muted-foreground font-mono">
                              {t.level} ~{eloAvg(balancedTeam2)} pts
                            </span>
                          </div>
                          {balancedTeam2.map((p) => (
                            <div
                              key={p.id}
                              className="bg-accent/5 border border-accent/20 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                            >
                              {p.name}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-center text-xs text-muted-foreground">
                        {t.eloDiff}{" "}
                        <span className="font-mono font-medium">
                          {Math.abs(eloAvg(balancedTeam1) - eloAvg(balancedTeam2))} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Marcador y Resultados */}
          {useSets ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.setsPlayed}</h3>
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
                <span className="text-3xl font-bold text-primary tabular-nums">
                  {team1SetsWon}
                </span>
                <span className="text-muted-foreground font-medium">-</span>
                <span className="text-3xl font-bold text-accent tabular-nums">
                  {team2SetsWon}
                </span>
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
          ) : (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">{t.scoreTitle}</h3>
              <div className="flex items-center justify-center gap-6 py-2">
                <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[160px]">
                  <span className="text-xs font-semibold text-primary truncate">
                    {matchType === "rival" ? t.ourClubShort : t.team1}
                  </span>
                  <GamesInput
                    value={team1Score}
                    onChange={setTeam1Score}
                    color="primary"
                  />
                </div>
                <span className="text-2xl font-bold text-muted-foreground pb-2">-</span>
                <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[160px]">
                  <span className="text-xs font-semibold text-accent truncate">
                    {matchType === "rival"
                      ? rivalTeamName.trim() || t.rivalDefault
                      : t.team2}
                  </span>
                  <GamesInput
                    value={team2Score}
                    onChange={setTeam2Score}
                    color="accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Fecha del partido */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.matchDate}
            </label>
            <input
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isReadyToSubmit}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
          >
            {isSubmitting ? t.saving : t.save}
          </button>
        </form>
      )}
    </div>
  );
}

function PlayerSelect({
  label,
  placeholder = "Seleccionar...",
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder?: string;
  value: number | null;
  onChange: (id: number | null) => void;
  options: Array<{ id: number; name: string; nickname?: string | null }>;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="w-full bg-background border border-input rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring truncate"
      >
        <option value="">{placeholder}</option>
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
    <div className="flex items-center gap-1.5 w-full justify-center">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors text-foreground"
      >
        <Minus size={14} />
      </button>
      <span
        className={cn(
          "w-12 text-center text-2xl font-bold tabular-nums",
          color === "primary" ? "text-primary" : "text-accent"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors text-foreground"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}