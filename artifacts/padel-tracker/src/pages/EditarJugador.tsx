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
import { ArrowLeft, Save, Phone, MessageSquare, Globe, Lock, Trophy, Mail, Image as ImageIcon, Activity, Upload, Trash2, Camera } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@workspace/replit-auth-web";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// Diccionario de traducciones para soportar el idioma dinámico
const labels: Record<string, Record<string, string>> = {
  es: {
    title: "Editar Jugador",
    subtitle: "Modifica tus datos personales y preferencias",
    fullName: "Nombre completo",
    nickname: "Apodo",
    nicknameOptional: "(opcional — dejar vacío para eliminar)",
    appLanguage: "Idioma de la aplicación",
    contactHeader: "Contacto & Notificaciones",
    sportsHeader: "Deportes & Categorías",
    phone: "Teléfono",
    waId: "WhatsApp ID / Usuario",
    optional: "(opcional)",
    consent: "Autoriza el envío de notificaciones y confirmación de partidos por WhatsApp.",
    cancel: "Cancelar",
    save: "Guardar cambios",
    saving: "Guardando...",
    errorMsg: "Error al guardar los cambios. Intenta de nuevo.",
    errorNameRequired: "El nombre es obligatorio.",
    readOnlyNotice: "Para modificar tu nombre registrado, contacta a la administración del club.",
    infoNote: "Las estadísticas y el historial de partidos no se ven afectados por este cambio.",
    noSports: "No hay deportes activos configurados en el club.",
  },
  en: {
    title: "Edit Player",
    subtitle: "Modify personal details and preferences",
    fullName: "Full Name",
    nickname: "Nickname",
    nicknameOptional: "(optional — leave empty to remove)",
    appLanguage: "App Language",
    contactHeader: "Contact & Notifications",
    sportsHeader: "Sports & Categories",
    phone: "Phone Number",
    waId: "WhatsApp ID / Username",
    optional: "(optional)",
    consent: "Authorizes sending notifications and match confirmations via WhatsApp.",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving...",
    errorMsg: "Error saving changes. Please try again.",
    errorNameRequired: "Name is required.",
    readOnlyNotice: "To change your registered name, please contact club administration.",
    infoNote: "Statistics and match history are not affected by this change.",
    noSports: "No active sports configured in the club.",
  },
  pt: {
    title: "Editar Jogador",
    subtitle: "Modifique seus dados pessoais e preferências",
    fullName: "Nome completo",
    nickname: "Apelido",
    nicknameOptional: "(opcional — deixe em branco para remover)",
    appLanguage: "Idioma do aplicativo",
    contactHeader: "Contato & Notificações",
    sportsHeader: "Esportes & Categorias",
    phone: "Telefone",
    waId: "ID / Usuário do WhatsApp",
    optional: "(opcional)",
    consent: "Autoriza o envio de notificações e confirmação de jogos pelo WhatsApp.",
    cancel: "Cancelar",
    save: "Salvar alterações",
    saving: "Salvando...",
    errorMsg: "Erro ao salvar alterações. Tente novamente.",
    errorNameRequired: "O nome é obrigatório.",
    readOnlyNotice: "Para alterar seu nome registrado, entre em contato com a administração do clube.",
    infoNote: "Estatísticas e histórico de jogos não são afetados por esta alteração.",
    noSports: "Não há esportes ativos configurados no clube.",
  },
};

export default function EditarJugador() {
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { language: activeAppLanguage } = useLanguage();

  const { user } = useAuth();
  const isSuperAdmin = !!(user && ((user as any).role === "superadmin" || (user as any).role === "super_admin" || (user as any).isAdmin === 2));
  const isClubAdmin = !!(user && ((user as any).isClubAdmin && (user as any).isClubAdmin > 0));
  const isAdmin = isSuperAdmin || isClubAdmin;
  const isSelf = user?.playerId === id;

  const { data: player, isLoading } = useGetPlayer(id, {
    query: { enabled: !!id, queryKey: getGetPlayerQueryKey(id) },
  });

  // Estados del formulario
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [dominantHand, setDominantHand] = useState("diestro");
  const [courtSide, setCourtSide] = useState("ambos");
  const [language, setLanguage] = useState("es");
  const [phone, setPhone] = useState("");
  const [waId, setWaId] = useState("");
  const [wspConsent, setWspConsent] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [clubSports, setClubSports] = useState<any[]>([]);
  const [clubCategories, setClubCategories] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Cargar deportes y categorías del club
  useEffect(() => {
    fetch("/api/club")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.sports)) {
          setClubSports(data.sports);
        }
      })
      .catch((err) => console.error("Error cargando club sports:", err));

    fetch("/api/club/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClubCategories(data);
        }
      })
      .catch((err) => console.error("Error cargando club categories:", err));
  }, []);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNickname(player.nickname ?? "");
      setEmail((player as any).email ?? "");
      setProfileImageUrl((player as any).profileImageUrl ?? "");
      setDominantHand((player as any).dominantHand ?? "diestro");
      setCourtSide((player as any).courtSide ?? "ambos");
      setLanguage((player as any).language ?? "es");
      setPhone((player as any).phone ?? "");
      setWaId((player as any).waId ?? "");
      setWspConsent((player as any).wspConsent ?? false);
      if (Array.isArray((player as any).categories)) {
        setSelectedCategoryIds((player as any).categories.map((c: any) => c.id));
      }
    }
  }, [player]);

  const t = labels[activeAppLanguage] || labels.es;

  const updateMutation = useUpdatePlayer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayerQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetPlayerStatsQueryKey(id) });
        navigate(`/jugadores/${id}`);
      },
      onError: () => {
        setError(t.errorMsg);
      },
    },
  });

  const handleCategoryToggle = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((i) => i !== catId) : [...prev, catId]
    );
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setProfileImageUrl(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isAdmin && !name.trim()) {
      setError(t.errorNameRequired);
      return;
    }

    updateMutation.mutate({
      id,
      data: {
        ...(isAdmin ? { name: name.trim(), nickname: nickname.trim() || null } : {}),
        email: email.trim() || null,
        profileImageUrl: profileImageUrl.trim() || null,
        language,
        phone: phone.trim() || null,
        waId: waId.trim() || null,
        wspConsent,
        dominantHand: dominantHand.trim() || null,
        courtSide: courtSide.trim() || null,
        categoryIds: selectedCategoryIds,
      } as any,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-64 bg-card rounded-xl border border-border" />
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

  // Verificación ampliada de cambios (isDirty) incluyendo categorías
  const originalCatIds = Array.isArray((player as any).categories)
    ? (player as any).categories.map((c: any) => c.id).sort()
    : [];
  const currentCatIds = [...selectedCategoryIds].sort();
  const categoriesChanged = JSON.stringify(originalCatIds) !== JSON.stringify(currentCatIds);

  const isDirty =
    (isAdmin && (name !== player.name || nickname !== (player.nickname ?? ""))) ||
    email !== ((player as any).email ?? "") ||
    profileImageUrl !== ((player as any).profileImageUrl ?? "") ||
    dominantHand !== ((player as any).dominantHand ?? "diestro") ||
    courtSide !== ((player as any).courtSide ?? "ambos") ||
    language !== ((player as any).language ?? "es") ||
    phone !== ((player as any).phone ?? "") ||
    waId !== ((player as any).waId ?? "") ||
    wspConsent !== ((player as any).wspConsent ?? false) ||
    categoriesChanged;

  const activeSports = clubSports.filter((s) => s.active);
  const isFootball =
    (player as any)?.isFootball ||
    (player as any)?.sportSlug === "futbol" ||
    activeSports.some((s) => s.slug === "futbol" || s.name?.toLowerCase().includes("fútbol"));

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
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {/* Avatar preview and upload controls */}
        <div className="flex flex-col items-center justify-center mb-6 gap-3">
          <div className="relative group">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={name || "Avatar"}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/50 shadow-md"
                onError={() => {}}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-3xl font-bold text-primary">
                {name.trim() ? initials(name.trim()) : "?"}
              </div>
            )}
            <label
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
              title="Cambiar foto de perfil"
            >
              <Camera size={14} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground cursor-pointer transition-colors shadow-sm">
              <Upload size={13} className="text-primary" />
              <span>Subir foto desde dispositivo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </label>
            {profileImageUrl && (
              <button
                type="button"
                onClick={() => setProfileImageUrl("")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-medium text-destructive transition-colors"
                title="Quitar foto y usar iniciales"
              >
                <Trash2 size={12} />
                <span>Quitar</span>
              </button>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground text-center">
            Formatos JPG, PNG o WebP. Se optimiza y recorta automáticamente.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto de perfil (URL alternativa) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ImageIcon size={13} />
              <span>O pega un enlace directo de foto (URL)</span>
            </label>
            <input
              type="url"
              value={profileImageUrl.startsWith("data:") ? "" : profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/mi-foto.jpg"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-foreground"
            />
          </div>

          {/* Nombre completo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>{t.fullName} <span className="text-destructive">*</span></span>
              {!isAdmin && <Lock size={12} className="text-muted-foreground" />}
            </label>
            <input
              type="text"
              value={name}
              disabled={!isAdmin}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carlos Lopez"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                isAdmin
                  ? "bg-background border-input focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  : "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
              }`}
              autoFocus={isAdmin}
            />
          </div>

          {/* Apodo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>{t.nickname} <span className="text-muted-foreground text-xs">{t.nicknameOptional}</span></span>
              {!isAdmin && <Lock size={12} className="text-muted-foreground" />}
            </label>
            <input
              type="text"
              value={nickname}
              disabled={!isAdmin}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej: El Rayo"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                isAdmin
                  ? "bg-background border-input focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  : "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
              }`}
            />
          </div>

          {!isAdmin && (
            <p className="text-xs text-muted-foreground italic flex items-center gap-1 mt-1">
              <Lock size={11} /> {t.readOnlyNotice}
            </p>
          )}

          {/* Correo Electrónico */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Mail size={14} className="text-muted-foreground" />
              <span>Correo electrónico <span className="text-muted-foreground text-xs">(opcional)</span></span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@ejemplo.com"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Posición / Mano según deporte */}
          {isFootball ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Activity size={14} className="text-muted-foreground" />
                <span>Posición en Cancha (Fútbol)</span>
              </label>
              <select
                value={courtSide}
                onChange={(e) => setCourtSide(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="Delantero">Delantero / Atacante</option>
                <option value="Mediocampista">Mediocampista / Volante</option>
                <option value="Defensa">Defensa / Zaguero</option>
                <option value="Arquero">Arquero / Guardameta</option>
                <option value="Polifuncional">Polifuncional / Rotativo</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mano hábil</label>
                <select
                  value={dominantHand}
                  onChange={(e) => setDominantHand(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="diestro">Diestro</option>
                  <option value="zurdo">Zurdo</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Lado preferido</label>
                <select
                  value={courtSide}
                  onChange={(e) => setCourtSide(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="drive">Drive (Derecha)</option>
                  <option value="reves">Revés (Izquierda)</option>
                  <option value="ambos">Ambos lados</option>
                </select>
              </div>
            </div>
          )}

          {/* Selector de Idioma de la Aplicación */}
          <div className="space-y-1.5 pt-1">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Globe size={14} className="text-muted-foreground" />
              {t.appLanguage}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="es">Español (ES)</option>
              <option value="en">English (EN)</option>
              <option value="pt">Português (PT)</option>
            </select>
          </div>

          <hr className="border-border/60 my-3" />

          {/* Deportes & Categorías */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy size={13} />
              {t.sportsHeader}
            </p>

            {activeSports.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t.noSports}</p>
            ) : (
              <div className="space-y-3">
                {activeSports.map((sport) => {
                  // Filtrar categorías correspondientes a este deporte del club
                  const sportCategories = clubCategories.filter(
                    (cat) => cat.clubSportId === sport.id || cat.sportId === sport.id
                  );

                  return (
                    <div key={sport.id} className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
                      <span className="text-xs font-bold text-foreground block">
                        {sport.name}
                      </span>
                      {sportCategories.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                          Sin categorías definidas por el club.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {sportCategories.map((cat) => {
                            const isChecked = selectedCategoryIds.includes(cat.id);
                            return (
                              <label
                                key={cat.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors select-none ${
                                  isChecked
                                    ? "bg-primary/10 border-primary/40 text-primary font-medium"
                                    : "bg-background border-input hover:bg-muted/50 text-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCategoryToggle(cat.id)}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span className="truncate">{cat.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-border/60 my-3" />

          {/* Contacto & Notificaciones */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.contactHeader}
            </p>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Phone size={14} className="text-muted-foreground" />
                {t.phone} <span className="text-muted-foreground text-xs">{t.optional}</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +56912345678"
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            {/* WhatsApp ID / Username */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare size={14} className="text-muted-foreground" />
                {t.waId} <span className="text-muted-foreground text-xs">{t.optional}</span>
              </label>
              <input
                type="text"
                value={waId}
                onChange={(e) => setWaId(e.target.value)}
                placeholder="Ej: @carlos_padel"
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            {/* Consentimiento */}
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wspConsent}
                onChange={(e) => setWspConsent(e.target.checked)}
                className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                {t.consent}
              </span>
            </label>
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
              {t.cancel}
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending || (isAdmin && !name.trim()) || !isDirty}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {updateMutation.isPending ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground text-center">
        {t.infoNote}
      </p>
    </div>
  );
}