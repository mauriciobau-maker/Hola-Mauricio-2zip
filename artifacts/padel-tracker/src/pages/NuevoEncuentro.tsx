import { useAuth } from "@workspace/replit-auth-web";
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
import { format } from "date-fns";

export function NuevoEncuentro() {
  const { user, login } = useAuth();
  const { data: players } = useListPlayers();
  const [, navigate] = useLocation();
  const createMutation = useCreateEncuentro();

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
        <p className="text-muted-foreground">Debes iniciar sesión para crear un encuentro.</p>
        <Button onClick={login}>Iniciar sesión</Button>
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    const result = await createMutation.mutateAsync({
      data: {
        title: title.trim(),
        dateTime: new Date(dateTime).toISOString(),
        location: location.trim(),
        maxSpots: maxSpots ? parseInt(maxSpots, 10) : undefined,
        notes: notes.trim() || undefined,
        playerIds: selectedPlayers.size > 0 ? Array.from(selectedPlayers) : undefined,
      },
    });
    navigate(`/encuentros/${result.id}`);
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/encuentros")} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Nuevo encuentro</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Martes de pádel"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dateTime">Fecha y hora *</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Ubicación *</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej: Club Pádel Norte, pista 3"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maxSpots">Plazas máximas (opcional)</Label>
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
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información adicional, nivel requerido, etc."
            rows={3}
          />
        </div>

        {players && players.length > 0 && (
          <div className="space-y-2">
            <Label>Invitar jugadores (opcional)</Label>
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
          {createMutation.isPending ? "Creando..." : "Crear encuentro"}
        </Button>
      </form>
    </div>
  );
}
