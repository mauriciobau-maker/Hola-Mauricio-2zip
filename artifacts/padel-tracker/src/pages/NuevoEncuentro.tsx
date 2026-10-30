import { useAuth } from "@workspace/replit-auth-web";
import { useListPlayers, useCreateEncuentro } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CalendarDays, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { format, isValid } from "date-fns";
import { useLanguage, Language } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const TRANSLATIONS = {
  es: {
    title: "Nuevo encuentro",
    mustLogin: "Debes iniciar sesión para crear un encuentro.",
    login: "Iniciar sesión",
    fieldTitle: "Título *",
    titlePlaceholder: "Ej: Martes de pádel",
    fieldDateTime: "Fecha y hora *",
    fieldLocation: "Ubicación *",
    locationPlaceholder: "Ej: Club Pádel Norte, pista 3",
    fieldMaxSpots: "Plazas máximas (opcional)",
    fieldNotes: "Notas (opcional)",
    notesPlaceholder: "Información adicional, nivel requerido, etc.",
    invitePlayers: "Invitar jugadores (opcional)",
    selectAll: "Seleccionar todos",
    deselectAll: "Deseleccionar todos",
    creating: "Creando...",
    createButton: "Crear encuentro",
    errorCreating: "Ocurrió un error al crear el encuentro. Inténtalo nuevamente.",
  },
  en: {
    title: "New Match Event",
    mustLogin: "You must log in to create an event.",
    login: "Log in",
    fieldTitle: "Title *",
    titlePlaceholder: "e.g. Tuesday Padel",
    fieldDateTime: "Date and Time *",
    fieldLocation: "Location *",
    locationPlaceholder: "e.g. North Padel Club, court 3",
    fieldMaxSpots: "Max Spots (optional)",
    fieldNotes: "Notes (optional)",
    notesPlaceholder: "Additional info, required level, etc.",
    invitePlayers: "Invite players (optional)",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    creating: "Creating...",
    createButton: "Create event",
    errorCreating: "An error occurred while creating the event. Please try again.",
  },
  pt: {
    title: "Novo encontro",
    mustLogin: "Você precisa fazer login para criar um encontro.",
    login: "Fazer login",
    fieldTitle: "Título *",
    titlePlaceholder: "Ex: Terça de pádel",
    fieldDateTime: "Data e hora *",
    fieldLocation: "Localização *",
    locationPlaceholder: "Ex: Club Pádel Norte, quadra 3",
    fieldMaxSpots: "Vagas máximas (opcional)",
    fieldNotes: "Notas (opcional)",
    notesPlaceholder: "Informações adicionais, nível necessário, etc.",
    invitePlayers: "Convidar jogadores (opcional)",
    selectAll: "Selecionar todos",
    deselectAll: "Deselecionar todos",
    creating: "Criando...",
    createButton: "Criar encontro",
    errorCreating: "Ocorreu um erro ao criar o encontro. Tente novamente.",
  },
};

export function NuevoEncuentro() {
  const { user, login } = useAuth();
  const { data: players } = useListPlayers();
  const [, navigate] = useLocation();
  const createMutation = useCreateEncuentro();

  const { language } = useLanguage();
  const lang = (language as Language) || "es";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.es;

  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState(
    format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );
  const [location, setLocation] = useState("");
  const [maxSpots, setMaxSpots] = useState<string>("4");
  const [durationMinutes, setDurationMinutes] = useState<string>("90");
  const [courtsAvailable, setCourtsAvailable] = useState<string>("1");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  const [sports, setSports] = useState<Array<{ id: number; name: string; slug: string; teamSize: number }>>([]);
  const [selectedSportId, setSelectedSportId] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_sport_id");
      if (saved) return Number(saved);
    }
    return 1;
  });
  const [formato, setFormato] = useState<string>("americana");

  useEffect(() => {
    fetch("/api/sports", { credentials: "include" })
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setSports(list);
          const saved = typeof window !== "undefined" ? localStorage.getItem("selected_sport_id") : null;
          if (saved && list.some((s: any) => s.id === Number(saved))) {
            setSelectedSportId(Number(saved));
          } else if (list.length > 0) {
            setSelectedSportId(list[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const selectedSport = sports.find((s) => s.id === selectedSportId);
  const isFootball = selectedSport?.slug === "futbol" || selectedSportId === 3;

  const handleSelectSport = (sp: { id: number; name: string; slug: string }) => {
    setSelectedSportId(sp.id);
    if (sp.slug === "futbol") {
      setMaxSpots("10");
      setFormato("pichanga");
    } else {
      if (maxSpots === "10") setMaxSpots("4");
      setFormato("americana");
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">{t.mustLogin}</p>
        <Button onClick={login}>{t.login}</Button>
      </div>
    );
  }

  function togglePlayer(id: number) {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!players) return;
    if (selectedPlayers.size === players.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(players.map((p) => p.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    try {
      const dateObj = new Date(dateTime);
      const isoDateTime = isValid(dateObj) ? dateObj.toISOString() : new Date().toISOString();

      const result = await createMutation.mutateAsync({
        data: {
          title: title.trim(),
          dateTime: isoDateTime,
          location: location.trim(),
          maxSpots: maxSpots ? parseInt(maxSpots, 10) : 4,
          durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 90,
          courtsAvailable: courtsAvailable ? parseInt(courtsAvailable, 10) : 1,
          sportId: selectedSportId,
          formato,
          notes: notes.trim() || undefined,
          playerIds: selectedPlayers.size > 0 ? Array.from(selectedPlayers).map(Number) : undefined,
        } as any,
      });

      const encuentroId =
        (result as any)?.encuentro?.id ||
        (result as any)?.id ||
        (result as any)?.data?.id;

      if (encuentroId) {
        navigate(`/encuentros/${encuentroId}`);
      } else {
        navigate("/encuentros");
      }
    } catch (error: any) {
      console.error("Error al crear encuentro:", error);
      setFormError(error?.message || t.errorCreating);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/encuentros")} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      {formError && (
        <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {sports.length > 0 && (
          <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/40">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Deporte del Encuentro
            </Label>
            <div className="flex gap-2 flex-wrap pt-1">
              {sports.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => handleSelectSport(sp)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5",
                    selectedSportId === sp.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  )}
                >
                  <span>{sp.slug === "futbol" ? "⚽" : "🎾"}</span>
                  <span>{sp.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">{t.fieldTitle}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dateTime">{t.fieldDateTime}</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">{t.fieldLocation}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t.locationPlaceholder}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxSpots">{t.fieldMaxSpots}</Label>
              <span className="text-[10px] text-muted-foreground font-medium">
                {selectedSportId === 3 ? "10 para F5" : "4 para dobles"}
              </span>
            </div>
            <Input
              id="maxSpots"
              type="number"
              min={1}
              value={maxSpots}
              onChange={(e) => setMaxSpots(e.target.value)}
              placeholder="4"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durationMinutes">Duración (minutos)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={30}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="90"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {lang === "en" ? "Game Format" : lang === "pt" ? "Formato de Jogo" : "Formato del Encuentro"}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {isFootball ? (
              <>
                <button
                  type="button"
                  onClick={() => setFormato("pichanga")}
                  className={cn(
                    "p-2.5 rounded-xl text-left border transition-all text-xs",
                    formato === "pichanga"
                      ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    ⚽ {lang === "en" ? "Pickup (2 Teams)" : lang === "pt" ? "Pelada (2 Times)" : "Pichanga (2 Equipos)"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "Auto-balance 2 squads by Elo" : lang === "pt" ? "2 times equilibrados por Elo" : "2 equipos equilibrados por Elo"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormato("triangular")}
                  className={cn(
                    "p-2.5 rounded-xl text-left border transition-all text-xs",
                    formato === "triangular"
                      ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    🔄 {lang === "en" ? "Triangular (3 Teams)" : lang === "pt" ? "Triangular (3 Times)" : "Triangular (3 Equipos)"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "3 teams in rotating matches" : lang === "pt" ? "3 times em partidas rotativas" : "3 equipos rotando partidos"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormato("rival")}
                  className={cn(
                    "p-2.5 rounded-xl text-left border transition-all text-xs",
                    formato === "rival"
                      ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    ⚡ {lang === "en" ? "vs External Rival" : lang === "pt" ? "vs Adversário" : "vs Rival Externo"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "Squad vs visiting team" : lang === "pt" ? "Elenco contra time visitante" : "Todo el plantel contra rival"}
                  </p>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFormato("americana")}
                  className={cn(
                    "p-2.5 rounded-xl text-left border transition-all text-xs",
                    formato === "americana"
                      ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    🎾 {lang === "en" ? "Americano (Rotation)" : lang === "pt" ? "Americano (Rotação)" : "Americana (Rotación)"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "Individual partner rotation" : lang === "pt" ? "Rotação individual de duplas" : "Rotación de parejas individual"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormato("parejas_fijas")}
                  className={cn(
                    "p-2.5 rounded-xl text-left border transition-all text-xs",
                    formato === "parejas_fijas"
                      ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    👥 {lang === "en" ? "Fixed Pairs" : lang === "pt" ? "Duplas Fixas" : "Parejas Fijas"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "Round-robin tournament" : lang === "pt" ? "Torneio todas contra todas" : "Liguilla todos contra todos"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormato("desafio")}
                  className={cn(
                    "p-2.5 rounded-xl text-left border transition-all text-xs",
                    formato === "desafio"
                      ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    ⚡ {lang === "en" ? "Single Challenge" : lang === "pt" ? "Desafio Único" : "Desafío Único"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "en" ? "1 competitive match" : lang === "pt" ? "1 partida competitiva" : "1 partido competitivo"}
                  </p>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="courtsAvailable">
            {isFootball
              ? (lang === "en" ? "Assigned Pitch(es)" : lang === "pt" ? "Campo(s) Atribuído(s)" : "Canchas de Fútbol Asignadas")
              : (lang === "en" ? "Assigned Courts" : lang === "pt" ? "Quadras Atribuídas" : "Pistas / Canchas Asignadas")}
          </Label>
          <Input
            id="courtsAvailable"
            type="number"
            min={1}
            value={courtsAvailable}
            onChange={(e) => setCourtsAvailable(e.target.value)}
            placeholder="1"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">{t.fieldNotes}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={3}
          />
        </div>

        {players && players.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t.invitePlayers}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs h-auto py-1 px-2 text-primary hover:underline"
              >
                {selectedPlayers.size === players.length
                  ? t.deselectAll
                  : t.selectAll}
              </Button>
            </div>
            <Card>
              <CardContent className="p-3 space-y-2 max-h-52 overflow-y-auto">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`player-${player.id}`}
                      checked={selectedPlayers.has(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    <label
                      htmlFor={`player-${player.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {player.name}
                      {player.nickname && (
                        <span className="text-muted-foreground ml-1">"{player.nickname}"</span>
                      )}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={createMutation.isPending || !title.trim() || !location.trim()}
        >
          {createMutation.isPending ? t.creating : t.createButton}
        </Button>
      </form>
    </div>
  );
}