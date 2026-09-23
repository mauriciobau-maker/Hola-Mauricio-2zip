import { useAuth } from "@/lib/useAuth";
import { useListPlayers, useCreateEncuentro } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { format, isValid } from "date-fns";
import { useLanguage, Language } from "@/context/LanguageContext";

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
  const [maxSpots, setMaxSpots] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());

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
          maxSpots: maxSpots ? parseInt(maxSpots, 10) : undefined,
          notes: notes.trim() || undefined,
          playerIds: selectedPlayers.size > 0 ? Array.from(selectedPlayers).map(Number) : undefined,
        },
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
    } catch (error) {
      console.error("Error al crear encuentro:", error);
      alert(t.errorCreating);
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

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-1.5">
          <Label htmlFor="maxSpots">{t.fieldMaxSpots}</Label>
          <Input
            id="maxSpots"
            type="number"
            min={1}
            value={maxSpots}
            onChange={(e) => setMaxSpots(e.target.value)}
            placeholder="4"
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
