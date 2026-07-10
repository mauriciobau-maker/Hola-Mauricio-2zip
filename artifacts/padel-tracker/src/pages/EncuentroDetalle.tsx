import { useState, useEffect } from "react";
import { useGetEncuentro, useRespondEncuentro } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays, MapPin, Users, Check, X, Clock,
  Trash2, ArrowLeft, Shuffle, Trophy, Plus, Minus, ExternalLink, Swords,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmo", icon: Check, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  declined: { label: "No puedo", icon: X, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  pending: { label: "Pendiente", icon: Clock, color: "text-muted-foreground", bg: "bg-white/5 border-border" },
};

interface MatchData {
  id: number;
  team1Players: Array<{ id: number; name: string }>;
  team2Players: Array<{ id: number; name: string }>;
  team1Score: number;
  team2Score: number;
  result: string;
  sets: any;
  pendingResult: boolean;
  playedAt: string;
}

interface Sport {
  id: number;
  name: string;
  slug: string;
  teamSize: number;
  useSets: boolean;
}

export function EncuentroDetalle() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useGetEncuentro(id);
  const rsvpMutation = useRespondEncuentro();

  const [matches, setMatches] = useState<MatchData[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formato, setFormato] = useState<"americana" | "parejas_fijas">("americana");
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState({ team1: 0, team2: 0 });
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    fetch(`/api/encuentros/${id}/partidos`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setMatches(Array.isArray(data) ? data : []); setMatchesLoaded(true); })
      .catch(() => setMatchesLoaded(true));

    fetch("/api/sports", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Sport[]) => { setSports(data); if (data.length > 0) setSelectedSportId(data[0].id); });
  }, [id]);

  const reloadMatches = () => {
    fetch(`/api/encuentros/${id}/partidos`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMatches(Array.isArray(data) ? data : []);
        setShowGenerateForm(false);
      });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Encuentro no encontrado.</p>
        <Button variant="link" onClick={() => navigate("/encuentros")}>Volver</Button>
      </div>
    );
  }

  const { encuentro, asistencia } = data as any;
  const date = new Date(encuentro.dateTime);
  const isOrganizer = user?.id === encuentro.organizerId || (user as any)?.isAdmin;
  const myEntry = asistencia.find((a: any) => a.playerId === user?.playerId);
  const confirmedCount = asistencia.filter((a: any) => a.status === "confirmed").length;
  const declinedCount = asistencia.filter((a: any) => a.status === "declined").length;
  const pendingCount = asistencia.filter((a: any) => a.status === "pending").length;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(encuentro.location)}`;

  async function handleRsvp(status: "confirmed" | "declined" | "pending") {
    await rsvpMutation.mutateAsync({ id, data: { status } });
    await queryClient.invalidateQueries({ queryKey: [`/encuentros/${id}`] });
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este encuentro?")) return;
    await fetch(`/api/encuentros/${id}`, { method: "DELETE", credentials: "include" });
    navigate("/encuentros");
  }

  async function handleGenerateMatches() {
    if (!selectedSportId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/encuentros/${id}/generar-partidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ formato, sportId: selectedSportId }),
      });
      if (res.ok) {
        setShowGenerateForm(false);
        reloadMatches();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveScore(matchId: number) {
    setSavingScore(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          team1Score: editScore.team1,
          team2Score: editScore.team2,
        }),
      });
      if (res.ok) {
        setEditingMatchId(null);
        reloadMatches();
      }
    } finally {
      setSavingScore(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/encuentros")} className="-ml-2 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{encuentro.title}</h1>
            {encuentro.estado && (
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border",
                encuentro.estado === "finalizado" ? "bg-muted text-muted-foreground border-border" :
                encuentro.estado === "en_curso" ? "bg-primary/10 text-primary border-primary/20" :
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                {encuentro.estado === "abierto" ? "Abierto" : encuentro.estado === "en_curso" ? "En curso" : "Finalizado"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {format(date, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
            </span>

          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors"><MapPin className="h-4 w-4" />{encuentro.location}<ExternalLink className="h-3 w-3" /></a>
            {encuentro.maxSpots && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Máx. {encuentro.maxSpots} jugadores
              </span>
            )}
          </div>
          {encuentro.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">{encuentro.notes}</p>
          )}
        </div>
        {isOrganizer && (
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mi RSVP */}
      {user && user.playerId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tu respuesta</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              {(["confirmed", "declined", "pending"] as const).map((status) => {
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                const isActive = myEntry?.status === status;
                return (
                  <Button key={status} variant={isActive ? "default" : "outline"} size="sm"
                    className={`gap-2 flex-1 ${isActive ? "" : "border-white/10"}`}
                    onClick={() => handleRsvp(status)} disabled={rsvpMutation.isPending}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : user && !user.playerId ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 px-4 text-sm text-amber-400">
            Vincula tu cuenta a un jugador para poder confirmar asistencia.{" "}
            <button onClick={() => navigate("/vincular")} className="underline font-medium">Vincular ahora</button>
          </CardContent>
        </Card>
      ) : null}

      {/* Resumen asistencia */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Confirman", count: confirmedCount, color: "text-emerald-400" },
          { label: "No pueden", count: declinedCount, color: "text-red-400" },
          { label: "Pendientes", count: pendingCount, color: "text-muted-foreground" },
        ].map((item) => (
          <Card key={item.label} className="text-center py-3">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Lista asistencia */}
      {asistencia.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jugadores ({asistencia.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {asistencia.map((entry: any) => {
              const cfg = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const initials = entry.playerName.split(" ").map((p: string) => p[0]).slice(0, 2).join("");
              return (
                <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-lg border ${cfg.bg}`}>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-white/10">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.playerName}</p>
                    {entry.playerNickname && <p className="text-xs text-muted-foreground">"{entry.playerNickname}"</p>}
                  </div>
                  <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Sección partidos */}
      {isOrganizer && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Swords size={16} className="text-primary" />
              Partidos del encuentro
            </h2>
            {matches.length === 0 && !showGenerateForm && (
              <button onClick={() => setShowGenerateForm(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                <Shuffle size={14} /> Generar partidos
              </button>
            )}
          </div>

          {/* Formulario generación */}
          {showGenerateForm && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Formato</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormato("americana")}
                      className={cn("px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                        formato === "americana" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                      )}>
                      🎾 Americana
                    </button>
                    <button type="button" onClick={() => setFormato("parejas_fijas")}
                      className={cn("px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                        formato === "parejas_fijas" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                      )}>
                      👥 Parejas fijas
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Deporte</p>
                  <div className="flex gap-2 flex-wrap">
                    {sports.map((sport) => (
                      <button key={sport.id} type="button" onClick={() => setSelectedSportId(sport.id)}
                        className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                          selectedSportId === sport.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                        )}>
                        {sport.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se usarán los {confirmedCount} jugadores confirmados. {confirmedCount < 4 && <span className="text-destructive">Necesitas al menos 4.</span>}
                </p>
                <div className="flex gap-2">
                  <button onClick={handleGenerateMatches} disabled={generating || confirmedCount < 4}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                    {generating ? "Generando..." : "Generar partidos"}
                  </button>
                  <button onClick={() => setShowGenerateForm(false)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">
                    Cancelar
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de partidos */}
          {matchesLoaded && matches.length > 0 && (
            <div className="space-y-2">
              {matches.map((match, idx) => (
                <Card key={match.id} className={cn(match.pendingResult ? "border-border" : "border-primary/20")}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs text-muted-foreground font-medium">Partido {idx + 1}</span>
                      {match.pendingResult ? (
                        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Pendiente resultado
                        </span>
                      ) : (
                        <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                          ✓ Completado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-sm font-medium">
                        {match.team1Players.map((p) => p.name).join(" / ")}
                      </div>
                      <div className="text-center">
                        {editingMatchId === match.id ? (
                          <div className="flex items-center gap-2">
                            <ScoreInput value={editScore.team1} onChange={(v) => setEditScore((s) => ({ ...s, team1: v }))} />
                            <span className="text-muted-foreground">-</span>
                            <ScoreInput value={editScore.team2} onChange={(v) => setEditScore((s) => ({ ...s, team2: v }))} />
                          </div>
                        ) : (
                          <span className="font-bold text-lg tabular-nums">
                            <span className={match.result === "team1" && !match.pendingResult ? "text-primary" : "text-muted-foreground"}>
                              {match.team1Score}
                            </span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className={match.result === "team2" && !match.pendingResult ? "text-primary" : "text-muted-foreground"}>
                              {match.team2Score}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-sm font-medium text-right">
                        {match.team2Players.map((p) => p.name).join(" / ")}
                      </div>
                    </div>

                    {editingMatchId === match.id ? (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleSaveScore(match.id)} disabled={savingScore}
                          className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                          {savingScore ? "Guardando..." : "Guardar resultado"}
                        </button>
                        <button onClick={() => setEditingMatchId(null)}
                          className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-muted/80">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => {
                        setEditingMatchId(match.id);
                        setEditScore({ team1: match.team1Score, team2: match.team2Score });
                      }}
                        className="w-full mt-3 text-xs text-primary hover:underline font-medium">
                        {match.pendingResult ? "Ingresar resultado" : "Editar resultado"}
                      </button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {matchesLoaded && matches.length === 0 && !showGenerateForm && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Swords size={24} className="mx-auto mb-2 opacity-30" />
              <p>No hay partidos generados aún.</p>
              <p className="text-xs mt-1">Genera los partidos cuando tengas los jugadores confirmados.</p>
            </div>
          )}
        </div>
      )}

      {/* Vista partidos para no-organizadores */}
      {!isOrganizer && matchesLoaded && matches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Swords size={14} /> Partidos ({matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {matches.map((match, idx) => (
              <div key={match.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground w-16">Partido {idx + 1}</span>
                <div className="flex-1 text-xs">{match.team1Players.map((p) => p.name).join(" / ")}</div>
                <span className="font-mono font-bold text-sm">{match.team1Score}-{match.team2Score}</span>
                <div className="flex-1 text-xs text-right">{match.team2Players.map((p) => p.name).join(" / ")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded bg-muted flex items-center justify-center">
        <Minus size={10} />
      </button>
      <span className="w-6 text-center font-bold tabular-nums text-sm">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded bg-muted flex items-center justify-center">
        <Plus size={10} />
      </button>
    </div>
  );
}