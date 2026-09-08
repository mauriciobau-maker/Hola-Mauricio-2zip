import { useState, useEffect } from "react";
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
import { ArrowLeft, Save, Phone, MessageSquare, Globe, Lock, Trophy } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const labels: Record<string, Record<string, string>> = {
  es: {
    title: "Editar Jugador", subtitle: "Modifica tus datos personales y preferencias", fullName: "Nombre completo", nickname: "Apodo", nicknameOptional: "(opcional — dejar vacío para eliminar)", appLanguage: "Idioma de la aplicación", contactHeader: "Contacto & Notificaciones", sportsHeader: "Deportes & Categorías", phone: "Teléfono", waId: "WhatsApp ID / Usuario", optional: "(opcional)", consent: "Autoriza el envío de notificaciones y confirmación de partidos por WhatsApp.", cancel: "Cancelar", save: "Guardar cambios", saving: "Guardando...", errorMsg: "Error al guardar los cambios. Intenta de nuevo.", errorNameRequired: "El nombre es obligatorio.", readOnlyNotice: "Para modificar tu nombre registrado, contacta a la administración del club.", infoNote: "Las estadísticas y el historial de partidos no se ven afectados por este cambio.", noSports: "No hay deportes activos configurados en el club.",
  },
  en: {
    title: "Edit Player", subtitle: "Modify personal details and preferences", fullName: "Full Name", nickname: "Nickname", nicknameOptional: "(optional — leave empty to remove)", appLanguage: "App Language", contactHeader: "Contact & Notifications", sportsHeader: "Sports & Categories", phone: "Phone Number", waId: "WhatsApp ID / Username", optional: "(optional)", consent: "Authorizes sending notifications and match confirmations via WhatsApp.", cancel: "Cancel", save: "Save changes", saving: "Saving...", errorMsg: "Error saving changes. Please try again.", errorNameRequired: "Name is required.", readOnlyNotice: "To change your registered name, please contact club administration.", infoNote: "Statistics and match history are not affected by this change.", noSports: "No active sports configured in the club.",
  },
  pt: {
    title: "Editar Jogador", subtitle: "Modifique seus dados pessoais e preferências", fullName: "Nome completo", nickname: "Apelido", nicknameOptional: "(opcional — deixe em branco para remover)", appLanguage: "Idioma do aplicativo", contactHeader: "Contato & Notificações", sportsHeader: "Esportes & Categorias", phone: "Telefone", waId: "ID / Usuário do WhatsApp", optional: "(opcional)", consent: "Autoriza o envio de notificações e confirmação de jogos pelo WhatsApp.", cancel: "Cancelar", save: "Salvar alterações", saving: "Salvando...", errorMsg: "Erro ao salvar alterações. Tente novamente.", errorNameRequired: "O nome é obrigatório.", readOnlyNotice: "Para alterar seu nome registrado, entre em contato com a administração do clube.", infoNote: "Estatísticas e histórico de jogos não são afetados por esta alteração.", noSports: "Não há esportes ativos configurados no clube.",
  },
};

export default function EditarJugador() {
  const params = useParams();
  const id = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: authData, isLoading: isAuthLoading } = useGetCurrentAuthUser();
  const authUser = authData?.user;
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

  useEffect(() => {
    fetch("/api/club")
      .then((res) => res.json())
      .then((data) => { if (data && Array.isArray(data.sports)) setClubSports(data.sports); })
      .catch((err) => console.error("Error cargando club sports:", err));
    fetch("/api/club/categories")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setClubCategories(data); })
      .catch((err) => console.error("Error cargando club categories:", err));
  }, []);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNickname(player.nickname ?? "");
      setLanguage((player as any).language ?? "es");
      setPhone((player as any).phone ?? "");
      setWaId((player as any).waId ?? "");
      setWspConsent((player as any).wspConsent ?? false);
      if (Array.isArray((player as any).categories)) setSelectedCategoryIds((player as any).categories.map((c: any) => c.id));
    }
  }, [player]);

  const t = labels[language] || labels.es;

  const updateMutation = useUpdatePlayer({
    mutation: {
      onSuccess: (updatedPlayer) => {
        queryClient.setQueryData(getGetPlayerQueryKey(id), updatedPlayer);
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayerStatsQueryKey(id) });
        navigate(`/jugadores/${id}`);
      },
      onError: () => setError(t.errorMsg),
    },
  });

  const handleCategoryToggle = (catId: number) => {
    if (!isAdmin) return;
    setSelectedCategoryIds((prev) => prev.includes(catId) ? prev.filter((i) => i !== catId) : [...prev, catId]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isAdmin && !name.trim()) { setError(t.errorNameRequired); return; }
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

  if (isLoading || isAuthLoading) return <div className="max-w-md mx-auto space-y-4 animate-pulse"><div className="h-8 w-32 bg-muted rounded" /><div className="h-64 bg-card rounded-xl border border-border" /></div>;
  if (!player) return <div className="text-center py-20"><p className="text-muted-foreground">Jugador no encontrado</p><Link href="/jugadores" className="text-primary hover:underline text-sm mt-2 block">Volver a jugadores</Link></div>;

  const originalCatIds = Array.isArray((player as any).categories) ? (player as any).categories.map((c: any) => c.id).sort() : [];
  const currentCatIds = [...selectedCategoryIds].sort();
  const categoriesChanged = JSON.stringify(originalCatIds) !== JSON.stringify(currentCatIds);
  const isDirty =
    (isAdmin && (name !== player.name || nickname !== (player.nickname ?? ""))) ||
    language !== ((player as any).language ?? "es") ||
    phone !== ((player as any).phone ?? "") ||
    waId !== ((player as any).waId ?? "") ||
    wspConsent !== ((player as any).wspConsent ?? false) ||
    (isAdmin && categoriesChanged);
  const activeSports = clubSports.filter((s) => s.active);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3"><Link href={`/jugadores/${id}`} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={18} /></Link><div><h1 className="text-xl font-bold">{t.title}</h1><p className="text-sm text-muted-foreground">{t.subtitle}</p></div></div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-center mb-6"><div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">{name.trim() ? initials(name.trim()) : "?"}</div></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium flex items-center justify-between"><span>{t.fullName} <span className="text-destructive">*</span></span>{!isAdmin && <Lock size={12} className="text-muted-foreground" />}</label><input type="text" value={name} disabled={!isAdmin} onChange={(e) => setName(e.target.value)} placeholder="Ej: Carlos Lopez" className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${isAdmin ? "bg-background border-input focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" : "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"}`} autoFocus={isAdmin} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium flex items-center justify-between"><span>{t.nickname} <span className="text-muted-foreground text-xs">{t.nicknameOptional}</span></span>{!isAdmin && <Lock size={12} className="text-muted-foreground" />}</label><input type="text" value={nickname} disabled={!isAdmin} onChange={(e) => setNickname(e.target.value)} placeholder="Ej: El Rayo" className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${isAdmin ? "bg-background border-input focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" : "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"}`} /></div>
          {!isAdmin && <p className="text-xs text-muted-foreground italic flex items-center gap-1 mt-1"><Lock size={11} /> {t.readOnlyNotice}</p>}
          <div className="space-y-1.5 pt-1"><label className="text-sm font-medium flex items-center gap-1.5"><Globe size={14} className="text-muted-foreground" />{t.appLanguage}</label><select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"><option value="es">Español (ES)</option><option value="en">English (EN)</option><option value="pt">Português (PT)</option></select></div>
          <hr className="border-border/60 my-3" />
          <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Trophy size={13} />{t.sportsHeader}</p>{activeSports.length === 0 ? <p className="text-xs text-muted-foreground italic">{t.noSports}</p> : <div className="space-y-3">{activeSports.map((sport) => { const sportCategories = clubCategories.filter((cat) => cat.clubSportId === sport.id || cat.sportId === sport.id); return <div key={sport.id} className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2"><span className="text-xs font-bold text-foreground block">{sport.name}</span>{sportCategories.length === 0 ? <p className="text-[11px] text-muted-foreground italic">Sin categorías definidas por el club.</p> : <div className="grid grid-cols-2 gap-2 pt-1">{sportCategories.map((cat) => { const isChecked = selectedCategoryIds.includes(cat.id); return <label key={cat.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs select-none ${isAdmin ? "cursor-pointer transition-colors" : "cursor-not-allowed opacity-70"} ${isChecked ? "bg-primary/10 border-primary/40 text-primary font-medium" : "bg-background border-input text-foreground"}`}><input type="checkbox" checked={isChecked} disabled={!isAdmin} onChange={() => handleCategoryToggle(cat.id)} className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5" /><span className="truncate">{cat.name}</span></label>; })}</div>}</div>; })}</div>}</div>
          <hr className="border-border/60 my-3" />
          <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.contactHeader}</p><div className="space-y-1.5"><label className="text-sm font-medium flex items-center gap-1.5"><Phone size={14} className="text-muted-foreground" />{t.phone} <span className="text-muted-foreground text-xs">{t.optional}</span></label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +56912345678" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" /></div><div className="space-y-1.5"><label className="text-sm font-medium flex items-center gap-1.5"><MessageSquare size={14} className="text-muted-foreground" />{t.waId} <span className="text-muted-foreground text-xs">{t.optional}</span></label><input type="text" value={waId} onChange={(e) => setWaId(e.target.value)} placeholder="Ej: @carlos_padel" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" /></div><label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none"><input type="checkbox" checked={wspConsent} onChange={(e) => setWspConsent(e.target.checked)} className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4" /><span className="text-xs text-muted-foreground leading-relaxed">{t.consent}</span></label></div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1"><Link href={`/jugadores/${id}`} className="flex-1 text-center border border-border rounded-lg py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors">{t.cancel}</Link><button type="submit" disabled={updateMutation.isPending || (isAdmin && !name.trim()) || !isDirty} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"><Save size={14} />{updateMutation.isPending ? t.saving : t.save}</button></div>
        </form>
      </div>
      <p className="text-xs text-muted-foreground text-center">{t.infoNote}</p>
    </div>
  );
}
