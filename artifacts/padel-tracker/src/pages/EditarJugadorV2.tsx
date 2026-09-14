import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import {
  useGetCurrentAuthUser,
  useGetPlayer,
  useUpdatePlayer,
  getListPlayersQueryKey,
  getGetPlayerQueryKey,
  getGetPlayerStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Phone, MessageSquare, Globe, Lock, UserRound, ShieldCheck, Trophy, Tags, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function EditarJugadorV2() {
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: authData, isLoading: isAuthLoading } = useGetCurrentAuthUser();
  const authUser = authData?.user as any;
  const isSuperAdmin = authUser?.isAdmin === 1;
  const isClubAdmin = authUser?.isClubAdmin === 1;
  const isAdmin = isSuperAdmin || isClubAdmin;

  const { data: player, isLoading } = useGetPlayer(id, {
    query: { enabled: !!id, queryKey: getGetPlayerQueryKey(id) },
  });

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState("es");
  const [phone, setPhone] = useState("");
  const [waId, setWaId] = useState("");
  const [wspConsent, setWspConsent] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [clubSports, setClubSports] = useState<any[]>([]);
  const [clubCategories, setClubCategories] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/club", { credentials: "include" }).then((res) => res.json()),
      fetch("/api/club/categories", { credentials: "include" }).then((res) => res.json()),
    ])
      .then(([club, categories]) => {
        if (Array.isArray(club?.sports)) setClubSports(club.sports);
        if (Array.isArray(categories)) setClubCategories(categories);
      })
      .catch((err) => console.error("Error cargando configuración del perfil:", err));
  }, []);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNickname(player.nickname ?? "");
      setLanguage((player as any).language ?? "es");
      setPhone((player as any).phone ?? "");
      setWaId((player as any).waId ?? "");
      setWspConsent((player as any).wspConsent ?? false);
      if (Array.isArray((player as any).categories)) {
        setSelectedCategoryIds((player as any).categories.map((category: any) => category.id));
      }
    }
  }, [player]);

  const updateMutation = useUpdatePlayer({
    mutation: {
      onSuccess: (updatedPlayer) => {
        queryClient.setQueryData(getGetPlayerQueryKey(id), updatedPlayer);
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayerStatsQueryKey(id) });
        setSuccess("Cambios guardados correctamente");
        setTimeout(() => navigate(`/jugadores/${id}`), 1500);
      },
      onError: () => setError("Error al guardar los cambios. Intenta de nuevo."),
    },
  });

  if (isLoading || isAuthLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-96 bg-card rounded-xl border border-border" />
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

  const originalCatIds = Array.isArray((player as any).categories)
    ? (player as any).categories.map((c: any) => c.id).sort()
    : [];
  const currentCatIds = [...selectedCategoryIds].sort();
  const categoriesChanged = JSON.stringify(originalCatIds) !== JSON.stringify(currentCatIds);
  const isDirty =
    (isAdmin && (name !== player.name || nickname !== (player.nickname ?? ""))) ||
    language !== ((player as any).language ?? "es") ||
    phone !== ((player as any).phone ?? "") ||
    waId !== ((player as any).waId ?? "") ||
    wspConsent !== ((player as any).wspConsent ?? false) ||
    (isAdmin && categoriesChanged);
  const activeSports = clubSports.filter((sport) => sport.active);
  const accountEmail = authUser?.email || "No disponible";

  const toggleCategory = (categoryId: number) => {
    if (!isAdmin) return;
    setSelectedCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((idValue) => idValue !== categoryId) : [...current, categoryId]
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (isAdmin && !name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    updateMutation.mutate({
      id,
      data: {
        ...(isAdmin ? { name: name.trim(), nickname: nickname.trim() || null } : {}),
        language,
        phone: phone.trim() || null,
        waId: waId.trim() || null,
        wspConsent,
        ...(isAdmin ? { categoryIds: selectedCategoryIds } : {}),
      } as any,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/jugadores/${id}`}
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Editar perfil</h1>
          <p className="text-sm text-muted-foreground">Datos personales, cuenta, deporte, categorías y contacto</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
          {name.trim() ? initials(name.trim()) : "?"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos Personales */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <UserRound size={17} className="text-primary" />
            <div>
              <h2 className="font-semibold">Datos personales</h2>
              <p className="text-xs text-muted-foreground">Nombre y apodo</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>
                Nombre completo <span className="text-destructive">*</span>
              </span>
              {!isAdmin && <Lock size={12} className="text-muted-foreground" />}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className={cn(
                "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                !isAdmin && "bg-muted/40 cursor-not-allowed"
              )}
              placeholder="Juan Pérez"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Apodo <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={!isAdmin}
              className={cn(
                "w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                !isAdmin && "bg-muted/40 cursor-not-allowed"
              )}
              placeholder="JP"
            />
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground italic flex items-center gap-1">
              <Lock size={11} /> El nombre registrado requiere administración.
            </p>
          )}
        </section>

        {/* Datos de Cuenta */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <CircleUserRound size={17} className="text-primary" />
            <div>
              <h2 className="font-semibold">Datos de cuenta</h2>
              <p className="text-xs text-muted-foreground">Email de acceso</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email de la cuenta</label>
            <input
              value={accountEmail}
              readOnly
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La edición del email se implementará sobre la cuenta User, sin crear un campo email en Player.
          </p>
        </section>

        {/* Datos Deportivos */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Trophy size={17} className="text-primary" />
            <div>
              <h2 className="font-semibold">Datos deportivos</h2>
              <p className="text-xs text-muted-foreground">Deportes disponibles</p>
            </div>
          </div>
          {activeSports.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No hay deportes activos configurados en el club.</p>
          ) : (
            activeSports.map((sport) => (
              <div key={sport.id} className="border border-border/60 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold">{sport.name}</p>
                <p className="text-xs text-muted-foreground">Los niveles y categorías se seleccionan abajo</p>
              </div>
            ))
          )}
        </section>

        {/* Categorías */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Tags size={17} className="text-primary" />
            <div>
              <h2 className="font-semibold">Categorías por deporte</h2>
              <p className="text-xs text-muted-foreground">Nivel en cada disciplina</p>
            </div>
          </div>
          {activeSports.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No hay deportes activos.</p>
          ) : (
            activeSports.map((sport) => {
              const sportCategories = clubCategories.filter((category) => category.sportId === sport.id);
              return (
                <div key={sport.id} className="border border-border/60 rounded-lg p-3 space-y-2">
                  <span className="text-xs font-bold block">{sport.name}</span>
                  {sportCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No hay categorías definidas</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sportCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          disabled={!isAdmin}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                            selectedCategoryIds.includes(cat.id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-muted-foreground hover:bg-muted",
                            !isAdmin && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Contacto */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Globe size={17} className="text-primary" />
            <div>
              <h2 className="font-semibold">Contacto y notificaciones</h2>
              <p className="text-xs text-muted-foreground">Idioma, teléfono y WhatsApp</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Globe size={14} />
              Idioma de la aplicación
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="es">Español 🇪🇸</option>
              <option value="en">English 🇺🇸</option>
              <option value="pt">Português 🇧🇷</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Phone size={14} />
              Teléfono <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="+56912345678"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare size={14} />
              WhatsApp ID / Usuario <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <input
              value={waId}
              onChange={(e) => setWaId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="juanperez"
            />
          </div>
          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={wspConsent}
              onChange={(e) => setWspConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border border-border cursor-pointer accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              Autorizo envío de mensajes WhatsApp para notificaciones deportivas
            </span>
          </label>
        </section>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            {success}
          </p>
        )}
        <div className="flex gap-2">
          <Link
            href={`/jugadores/${id}`}
            className="flex-1 text-center border border-border rounded-lg py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all",
              isDirty
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            )}
          >
            {updateMutation.isPending ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Save size={16} />
            )}
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <ShieldCheck size={12} />
        Las estadísticas y el historial de partidos no se ven afectados por cambios de datos
      </p>
    </div>
  );
}
