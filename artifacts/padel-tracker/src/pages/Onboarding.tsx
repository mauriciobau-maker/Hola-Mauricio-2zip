import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, updateStoredUser } from "@workspace/replit-auth-web";
import { Building2, ArrowRight, UserPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "club" | "jugador" | "done";

interface Club {
  id: number;
  name: string;
  slug: string;
}

interface Player {
  id: number;
  name: string;
  nickname?: string | null;
  elo: number;
}

export function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("club");
  const [inviteCode, setInviteCode] = useState(() => {
    return new URLSearchParams(window.location.search).get("code") || "";
  });
  const [club, setClub] = useState<Club | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNickname, setNewPlayerNickname] = useState("");
  const [courtSide, setCourtSide] = useState<string>("ambos");
  const [dominantHand, setDominantHand] = useState<string>("diestro");

  // Si viene con ?code= en la URL y el usuario no tiene clubId, auto-unir
  useEffect(() => {
    const codeParam = new URLSearchParams(window.location.search).get("code");
    if (codeParam && !user?.clubId && step === "club") {
      setInviteCode(codeParam);
    }
  }, [user, step]);

  // 🚀 SI EL USUARIO YA TIENE clubId (ej. Admin de club creado por Super Admin)
  // Saltamos automáticamente el Paso 1 de ingresar código
  useEffect(() => {
    if (user && (user as any).clubId) {
      setLoading(true);
      Promise.all([
        fetch("/api/club", { credentials: "include" }).then((res) => res.json()),
        fetch("/api/players", { credentials: "include" }).then((res) => res.json()),
      ])
        .then(([clubData, playersData]) => {
          if (clubData && !clubData.error) {
            setClub(clubData);
          }
          if (Array.isArray(playersData)) {
            setPlayers(playersData);
          }
          setStep("jugador");
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/join-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Código inválido");
        return;
      }
      if (data.user) {
        updateStoredUser(data.user);
      }
      setClub(data.club);
      // Cargar jugadores del club
      const playersRes = await fetch("/api/players", { credentials: "include" });
      const playersData = await playersRes.json();
      if (Array.isArray(playersData)) {
        setPlayers(playersData);
      }
      setStep("jugador");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPlayer = async (playerId: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/link-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          updateStoredUser(data.user);
        } else {
          updateStoredUser({ playerId });
        }
        setStep("done");
        // Forzar recarga completa para que useAuth() lea el nuevo clubId/playerId
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newPlayerName.trim(),
          nickname: newPlayerNickname.trim() || undefined,
          courtSide,
          dominantHand,
        }),
      });
      const player = await res.json();
      if (res.ok) {
        await handleLinkPlayer(player.id);
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <Check size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold">¡Listo!</h2>
        <p className="text-muted-foreground">Tu cuenta está configurada. Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8 py-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-2 text-sm font-medium", step === "club" ? "text-primary" : "text-muted-foreground")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2", step === "club" ? "border-primary text-primary" : "border-primary bg-primary text-primary-foreground")}>
            {step !== "club" ? <Check size={12} /> : "1"}
          </div>
          Unirse al club
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={cn("flex items-center gap-2 text-sm font-medium", step === "jugador" ? "text-primary" : "text-muted-foreground")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2", step === "jugador" ? "border-primary text-primary" : "border-border text-muted-foreground")}>
            2
          </div>
          Tu perfil
        </div>
      </div>

      {/* Step 1 — Código de invitación */}
      {step === "club" && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Building2 size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Bienvenido</h1>
            <p className="text-muted-foreground text-sm">
              Ingresa el código de invitación que te dio el administrador de tu club.
            </p>
          </div>

          <form onSubmit={handleJoinClub} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código de invitación</label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ej: 694BE17F"
                maxLength={8}
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || inviteCode.length < 6}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Verificando..." : <>Continuar <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      )}

      {/* Step 2 — Seleccionar o crear jugador */}
      {step === "jugador" && club && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
              <Building2 size={14} />
              {club.name}
            </div>
            <h2 className="text-xl font-bold">¿Cuál eres tú?</h2>
            <p className="text-muted-foreground text-sm">
              Selecciona tu perfil de jugador o crea uno nuevo.
            </p>
          </div>

          {!creatingNew ? (
            <div className="space-y-3">
              {(Array.isArray(players) ? players : []).map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleLinkPlayer(player.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between bg-card border border-border hover:border-primary/50 rounded-xl px-4 py-3 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{player.name}</p>
                    {player.nickname && <p className="text-xs text-muted-foreground">"{player.nickname}"</p>}
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono font-medium">
                    ELO {player.elo}
                  </span>
                </button>
              ))}

              <button
                onClick={() => setCreatingNew(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border hover:border-primary/50 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <UserPlus size={16} />
                Crear nuevo jugador
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tu nombre completo</label>
                <input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Rafael Nadal"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {newPlayerName.trim().length >= 3 && (() => {
                  const match = players.find((p) => p.name.toLowerCase().includes(newPlayerName.toLowerCase().trim()));
                  if (!match) return null;
                  return (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs flex items-center justify-between gap-2 mt-2">
                      <div>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">¿Ya juegas en el club?</span>
                        <p className="text-muted-foreground">Existe "{match.name}" (Elo {match.elo})</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLinkPlayer(match.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs font-semibold shrink-0"
                      >
                        Vincularme
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apodo (opcional)</label>
                <input
                  value={newPlayerNickname}
                  onChange={(e) => setNewPlayerNickname(e.target.value)}
                  placeholder="Rafa"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Lado en Cancha</label>
                  <select
                    value={courtSide}
                    onChange={(e) => setCourtSide(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-ring"
                  >
                    <option value="drive">Drive (Derecha)</option>
                    <option value="reves">Revés (Izquierda)</option>
                    <option value="ambos">Ambos Lados</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mano Hábil</label>
                  <select
                    value={dominantHand}
                    onChange={(e) => setDominantHand(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-ring"
                  >
                    <option value="diestro">Diestro</option>
                    <option value="zurdo">Zurdo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPlayerName.trim()}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear y continuar"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}