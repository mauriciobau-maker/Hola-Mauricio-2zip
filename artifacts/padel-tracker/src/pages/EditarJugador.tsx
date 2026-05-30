import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import {
  useGetPlayer,
  useUpdatePlayer,
  getListPlayersQueryKey,
  getGetPlayerQueryKey,
  getGetPlayerStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function EditarJugador() {
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: player, isLoading } = useGetPlayer(id, {
    query: { enabled: !!id, queryKey: getGetPlayerQueryKey(id) },
  });

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNickname(player.nickname ?? "");
    }
  }, [player]);

  const updateMutation = useUpdatePlayer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayerQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetPlayerStatsQueryKey(id) });
        navigate(`/jugadores/${id}`);
      },
      onError: () => {
        setError("Error al guardar los cambios. Intenta de nuevo.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        name: name.trim(),
        nickname: nickname.trim() || null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-48 bg-card rounded-xl border border-border" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Jugador no encontrado</p>
        <Link href="/jugadores" className="text-primary hover:underline text-sm mt-2 block">
          Volver a jugadores
        </Link>
      </div>
    );
  }

  const isDirty = name !== player.name || nickname !== (player.nickname ?? "");

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/jugadores/${id}`}
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Editar Jugador</h1>
          <p className="text-sm text-muted-foreground">Modifica nombre o apodo</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {/* Avatar preview */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
            {name.trim() ? initials(name.trim()) : "?"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Nombre completo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carlos Lopez"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Apodo{" "}
              <span className="text-muted-foreground text-xs">(opcional — dejar vacío para eliminar)</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej: El Rayo"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Link
              href={`/jugadores/${id}`}
              className="flex-1 text-center border border-border rounded-lg py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending || !name.trim() || !isDirty}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground text-center">
        Las estadísticas y el historial de partidos no se ven afectados por este cambio.
      </p>
    </div>
  );
}
