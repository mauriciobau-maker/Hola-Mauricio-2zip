import { useState, useEffect, useMemo } from "react";
import { useGetEncuentro } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays, MapPin, Users, Check, X, Clock,
  Trash2, ArrowLeft, Shuffle, Plus, Minus, ExternalLink, Swords, MessageCircle, Send, CheckSquare, Square, AlertCircle, Crown, RotateCcw, Info, Printer
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { es, enUS, ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/context/LanguageContext";
import { ParrynAssistant } from "@/components/ParrynAssistant";
import { Bot, Sparkles, ShieldCheck } from "lucide-react";
import { PrintFixtureModal } from "@/components/PrintFixtureModal";

const LOCALES = {
  es: es,
  en: enUS,
  pt: ptBR,
};

const TRANSLATIONS = {
  es: {
    notFound: "Encuentro no encontrado.",
    back: "Volver",
    open: "Abierto",
    inProgress: "En curso",
    finished: "Finalizado",
    maxPlayers: (num: number) => `Máx. ${num} jugadores`,
    shareGroupWhatsapp: "Compartir Citación por WhatsApp",
    yourResponse: "Tu respuesta",
    attending: "Confirmo",
    cantGo: "No puedo",
    pending: "Pendiente",
    waitlist: "En Reserva",
    linkAccountMsg: "Vincula tu cuenta a un jugador para poder confirmar asistencia.",
    linkNow: "Vincular ahora",
    confirmedCount: "Confirman",
    declinedCount: "No pueden",
    pendingCount: "Pendientes",
    waitlistCount: "En Reserva",
    playersTitle: (count: number) => `Jugadores (${count})`,
    sendWhatsappReminder: "Enviar recordatorio por WhatsApp",
    eventMatches: "Partidos del encuentro",
    generateMatches: "Generar partidos",
    formatLabel: "Formato",
    fixedPairs: "Parejas fijas",
    sportLabel: "Deporte",
    confirmedPlayersMsg: (count: number) => `Se usarán los ${count} jugadores confirmados.`,
    needAtLeast4: "Necesitas al menos 4.",
    generating: "Generando...",
    cancel: "Cancelar",
    matchIndex: (idx: number) => `Partido ${idx}`,
    pendingResult: "Pendiente resultado",
    completed: "Completado",
    saving: "Guardando...",
    saveScore: "Guardar resultado",
    enterScore: "Ingresar resultado",
    editScore: "Editar resultado",
    noMatchesYet: "No hay partidos generados aún.",
    deleteConfirm: "¿Eliminar este encuentro?",
    bulkActions: "Acciones masivas",
    confirmAll: "Confirmar todos",
    clearSelection: "Limpiar selección",
    selectedCount: (n: number) => `${n} seleccionados`,
    spotsFull: "Cupos agotados",
    addSet: "Agregar Set",
    removeSet: "Eliminar Set",
    setLabel: (idx: number) => `Set ${idx}`,
    groupMessage: {
      invitation: "INVITACIÓN",
      date: "Fecha",
      location: "Lugar",
      confirmed: "Confirmados",
      notes: "Notas",
      cta: "Confirma o revisa los detalles aquí:",
    },
    playerMessage: {
      greeting: (name: string) => `Hola ${name}! 👋`,
      reminder: (title: string) => `Te recordamos la citación para el encuentro *${title}*:`,
      date: "Fecha",
      location: "Lugar",
      cta: "Por favor confirma tu asistencia aquí:",
    },
    printFixture: "Imprimir Fixture",
    regenerateFixture: "Re-generar Fixture",
    cleanFixture: "Limpiar",
    restNotice: (start: string, end: string) => `⏳ Descanso de 2 minutos: ${start} a ${end} (Rotación de pistas y calentamiento corto)`,
    restingNames: (names: string) => `☕ Descansan en esta ronda: ${names}`,
  },
  en: {
    notFound: "Match not found.",
    back: "Back",
    open: "Open",
    inProgress: "In Progress",
    finished: "Finished",
    maxPlayers: (num: number) => `Max ${num} players`,
    shareGroupWhatsapp: "Share Invitation via WhatsApp",
    yourResponse: "Your response",
    attending: "Attending",
    cantGo: "Can't go",
    pending: "Pending",
    waitlist: "On Waitlist",
    linkAccountMsg: "Link your account to a player to confirm attendance.",
    linkNow: "Link now",
    confirmedCount: "Confirmed",
    declinedCount: "Declined",
    pendingCount: "Pending",
    waitlistCount: "Waitlist",
    playersTitle: (count: number) => `Players (${count})`,
    sendWhatsappReminder: "Send WhatsApp reminder",
    eventMatches: "Event Matches",
    generateMatches: "Generate matches",
    formatLabel: "Format",
    fixedPairs: "Fixed pairs",
    sportLabel: "Sport",
    confirmedPlayersMsg: (count: number) => `Using ${count} confirmed players.`,
    needAtLeast4: "Need at least 4.",
    generating: "Generating...",
    cancel: "Cancel",
    matchIndex: (idx: number) => `Match ${idx}`,
    pendingResult: "Pending result",
    completed: "Completed",
    saving: "Saving...",
    saveScore: "Save score",
    enterScore: "Enter score",
    editScore: "Edit score",
    noMatchesYet: "No matches generated yet.",
    deleteConfirm: "Delete this event?",
    bulkActions: "Bulk actions",
    confirmAll: "Confirm all",
    clearSelection: "Clear selection",
    selectedCount: (n: number) => `${n} selected`,
    spotsFull: "Spots full",
    addSet: "Add Set",
    removeSet: "Remove Set",
    setLabel: (idx: number) => `Set ${idx}`,
    groupMessage: {
      invitation: "INVITATION",
      date: "Date",
      location: "Location",
      confirmed: "Confirmed",
      notes: "Notes",
      cta: "Confirm or view details here:",
    },
    playerMessage: {
      greeting: (name: string) => `Hi ${name}! 👋`,
      reminder: (title: string) => `Friendly reminder for the match *${title}*:`,
      date: "Date",
      location: "Location",
      cta: "Please confirm your attendance here:",
    },
    printFixture: "Print Fixture",
    regenerateFixture: "Regenerate Fixture",
    cleanFixture: "Clear",
    restNotice: (start: string, end: string) => `⏳ 2-minute break: ${start} to ${end} (Court rotation and short warm-up)`,
    restingNames: (names: string) => `☕ Resting in this round: ${names}`,
  },
  pt: {
    notFound: "Encontro não encontrado.",
    back: "Voltar",
    open: "Aberto",
    inProgress: "Em andamento",
    finished: "Finalizado",
    maxPlayers: (num: number) => `Máx. ${num} jogadores`,
    shareGroupWhatsapp: "Compartilhar Convocação pelo WhatsApp",
    yourResponse: "Sua resposta",
    attending: "Vou",
    cantGo: "Não posso",
    pending: "Pendente",
    waitlist: "Na Reserva",
    linkAccountMsg: "Vincule sua conta a um jogador para confirmar presença.",
    linkNow: "Vincular agora",
    confirmedCount: "Confirmados",
    declinedCount: "Recusados",
    pendingCount: "Pendentes",
    waitlistCount: "Lista de Espera",
    playersTitle: (count: number) => `Jogadores (${count})`,
    sendWhatsappReminder: "Enviar lembrete pelo WhatsApp",
    eventMatches: "Partidas do encontro",
    generateMatches: "Gerar partidas",
    formatLabel: "Formato",
    fixedPairs: "Duplas fixas",
    sportLabel: "Esporte",
    confirmedPlayersMsg: (count: number) => `Serão usados os ${count} jogadores confirmados.`,
    needAtLeast4: "Você precisa de pelo menos 4.",
    generating: "Gerando...",
    cancel: "Cancelar",
    matchIndex: (idx: number) => `Partida ${idx}`,
    pendingResult: "Resultado pendente",
    completed: "Concluído",
    saving: "Salvando...",
    saveScore: "Salvar resultado",
    enterScore: "Inserir resultado",
    editScore: "Editar resultado",
    noMatchesYet: "Nenhuma partida gerada ainda.",
    deleteConfirm: "Excluir este encontro?",
    bulkActions: "Ações em massa",
    confirmAll: "Confirmar todos",
    clearSelection: "Limpar seleção",
    selectedCount: (n: number) => `${n} selecionados`,
    spotsFull: "Vagas esgotadas",
    addSet: "Adicionar Set",
    removeSet: "Remover Set",
    setLabel: (idx: number) => `Set ${idx}`,
    groupMessage: {
      invitation: "CONVOCAÇÃO",
      date: "Data",
      location: "Local",
      confirmed: "Confirmados",
      notes: "Notas",
      cta: "Confirme ou veja os detalhes aqui:",
    },
    playerMessage: {
      greeting: (name: string) => `Olá ${name}! 👋`,
      reminder: (title: string) => `Lembrete para a partida *${title}*:`,
      date: "Data",
      location: "Local",
      cta: "Por favor confirme sua presença aqui:",
    },
    printFixture: "Imprimir Fixture",
    regenerateFixture: "Regenerar Fixture",
    cleanFixture: "Limpar",
    restNotice: (start: string, end: string) => `⏳ Descanso de 2 minutos: ${start} às ${end} (Rotação de quadras e aquecimento rápido)`,
    restingNames: (names: string) => `☕ Descansam nesta rodada: ${names}`,
  },
};

const STATUS_CONFIG = {
  confirmed: { 
    labelKey: "attending" as const, 
    icon: Check, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" 
  },
  declined: { 
    labelKey: "cantGo" as const, 
    icon: X, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" 
  },
  pending: { 
    labelKey: "pending" as const, 
    icon: Clock, color: "text-muted-foreground", bg: "bg-white/5 border-border" 
  },
  waitlist: { 
    labelKey: "waitlist" as const, 
    icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" 
  },
  reserva: { 
    labelKey: "waitlist" as const, 
    icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" 
  },
};

interface SetScore {
  team1: number;
  team2: number;
}

interface MatchData {
  id: number;
  encuentroId?: number;
  round?: number;
  court?: number;
  team1Players: Array<{ id: number; name: string }>;
  team2Players: Array<{ id: number; name: string }>;
  team1Score: number;
  team2Score: number;
  result: string;
  sets: SetScore[] | Record<string, any>;
  status?: string;
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

interface AsistenciaEntry {
  id?: number;
  playerId: number;
  playerName: string;
  playerNickname?: string;
  playerPhone?: string;
  playerLanguage?: string;
  status: "confirmed" | "declined" | "pending" | "waitlist" | "reserva";
}

interface EncuentroDetailsData {
  encuentro: {
    id: number;
    title: string;
    dateTime: string;
    location: string;
    notes?: string;
    estado?: "abierto" | "en_curso" | "finalizado";
    maxSpots?: number;
    organizerId?: number;
  };
  asistencia: AsistenciaEntry[];
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
      >
        <Minus size={10} />
      </button>
      <span className="w-6 text-center font-bold tabular-nums text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

export function EncuentroDetalle() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();
  const { user } = useAuth() as { user: { id?: number; playerId?: number; isAdmin?: boolean } | null };
  const queryClient = useQueryClient();

  const { language } = useLanguage();
  const lang = (language as Language) || "es";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.es;

  const { data, isLoading, error } = useGetEncuentro(id) as { data: EncuentroDetailsData | undefined; isLoading: boolean; error: unknown };

  const [matches, setMatches] = useState<MatchData[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formato, setFormato] = useState<"americana" | "parejas_fijas" | "desafio">("americana");
  const [canchas, setCanchas] = useState<number>(1);
  const [rondas, setRondas] = useState<number>(3);
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deletingMatches, setDeletingMatches] = useState(false);
  const [previewCruces, setPreviewCruces] = useState<any[] | null>(null);
  const [previewSummary, setPreviewSummary] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Estado para la edición de resultados por sets
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editSets, setEditSets] = useState<SetScore[]>([{ team1: 0, team2: 0 }]);
  const [savingScore, setSavingScore] = useState(false);

  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  const rawAsistencia: AsistenciaEntry[] = data?.asistencia || [];
  const asistencia = useMemo(() => {
    const map = new Map<number, AsistenciaEntry>();
    for (const entry of rawAsistencia) {
      const existing = map.get(entry.playerId);
      if (!existing || (entry.id && entry.id > (existing.id || 0))) {
        map.set(entry.playerId, entry);
      }
    }
    return Array.from(map.values());
  }, [rawAsistencia]);

  const confirmedList = useMemo(() => asistencia.filter((a) => a.status === "confirmed"), [asistencia]);
  const confirmedCount = confirmedList.length;
  const declinedCount = useMemo(() => asistencia.filter((a) => a.status === "declined").length, [asistencia]);
  const pendingCount = useMemo(() => asistencia.filter((a) => a.status === "pending").length, [asistencia]);
  const waitlistCount = useMemo(() => asistencia.filter((a) => a.status === "waitlist" || a.status === "reserva").length, [asistencia]);

  const matchesByRound = useMemo(() => {
    const map = new Map<number, MatchData[]>();
    for (const m of matches) {
      const r = m.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [matches]);

  useEffect(() => {
    if (confirmedCount >= 4) {
      const recCanchas = Math.max(1, Math.floor(confirmedCount / 4));
      setCanchas((prev) => (prev <= 1 && recCanchas > 1 ? recCanchas : prev));
      if (confirmedCount === 4) setRondas((prev) => (prev === 1 ? 3 : prev));
      else if (confirmedCount === 5) setRondas(5);
      else if (confirmedCount >= 8) setRondas((prev) => (prev === 1 ? 3 : prev));
    }
  }, [confirmedCount]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/encuentros/${id}/partidos`, { credentials: "include" })
      .then((r) => r.json())
      .then((resData) => {
        setMatches(Array.isArray(resData) ? resData : []);
        setMatchesLoaded(true);
      })
      .catch(() => setMatchesLoaded(true));

    fetch("/api/sports", { credentials: "include" })
      .then((r) => r.json())
      .then((resData: Sport[]) => {
        setSports(resData);
        if (resData.length > 0) setSelectedSportId(resData[0].id);
      })
      .catch((err) => console.error("Error al cargar deportes:", err));
  }, [id]);

  const reloadMatches = () => {
    fetch(`/api/encuentros/${id}/partidos`, { credentials: "include" })
      .then((r) => r.json())
      .then((resData) => {
        setMatches(Array.isArray(resData) ? resData : []);
        setShowGenerateForm(false);
      });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>{t.notFound}</p>
        <Button variant="link" onClick={() => navigate("/encuentros")}>
          {t.back}
        </Button>
      </div>
    );
  }

  const { encuentro } = data;
  const date = new Date(encuentro.dateTime);
  const isOrganizer = Boolean(
    user && (
      String(user.id) === String(encuentro.organizerId) ||
      user.isAdmin ||
      (user.playerId && String(user.playerId) === String(encuentro.organizerId))
    )
  );
  const myEntry = asistencia.find((a) => a.playerId === user?.playerId);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    encuentro.location
  )}`;

  const refreshEncuentroData = async () => {
    await queryClient.invalidateQueries({ queryKey: [`/api/encuentros/${id}`] });
    await queryClient.invalidateQueries({ queryKey: [`/encuentros/${id}`] });
    await queryClient.invalidateQueries({ queryKey: ["/api/encuentros"] });
  };

  async function handleRsvp(status: "confirmed" | "declined" | "pending" | "waitlist") {
    setRsvpError(null);
    setSubmittingRsvp(true);
    try {
      const res = await fetch(`/api/encuentros/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setRsvpError(resData.message || "No se pudo actualizar la asistencia");
        return;
      }
      await refreshEncuentroData();
    } catch (err) {
      console.error("Error actualizando RSVP:", err);
      setRsvpError("Error al conectar con el servidor.");
    } finally {
      setSubmittingRsvp(false);
    }
  }

  async function handleOrganizerSetStatus(playerId: number, status: "confirmed" | "declined" | "pending" | "waitlist") {
    setRsvpError(null);
    try {
      const res = await fetch(`/api/encuentros/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, playerId }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setRsvpError(resData.message || "No se pudo actualizar el jugador");
        return;
      }
      await refreshEncuentroData();
    } catch (err) {
      console.error("Error actualizando estado de asistencia:", err);
      setRsvpError("Error al conectar con el servidor.");
    }
  }

  async function handleBulkStatusChange(status: "confirmed" | "declined" | "pending") {
    if (selectedPlayerIds.length === 0) return;
    setRsvpError(null);

    let idsToProcess = selectedPlayerIds;

    if (status === "confirmed" && encuentro?.maxSpots) {
      const availableSpots = Math.max(0, encuentro.maxSpots - confirmedCount);
      if (availableSpots === 0) {
        setRsvpError("Los cupos del encuentro ya están agotados.");
        return;
      }
      if (selectedPlayerIds.length > availableSpots) {
        idsToProcess = selectedPlayerIds.slice(0, availableSpots);
        setRsvpError(`Solo se pudieron confirmar ${availableSpots} jugador(es) por límite de plazas.`);
      }
    }

    try {
      const promises = idsToProcess.map((playerId) =>
        fetch(`/api/encuentros/${id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status, playerId }),
        })
      );

      const results = await Promise.all(promises);
      const hasError = results.some((res) => !res.ok);
      if (hasError && !rsvpError) {
        setRsvpError("Algunos cupos no pudieron ser modificados.");
      }
      setSelectedPlayerIds([]);
      await refreshEncuentroData();
    } catch (err) {
      console.error("Error en cambio masivo de asistencia:", err);
      setRsvpError("Error de conexión al procesar la asistencia masiva.");
    }
  }

  const toggleSelectPlayer = (playerId: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((item) => item !== playerId) : [...prev, playerId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPlayerIds.length === asistencia.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(asistencia.map((a) => a.playerId));
    }
  };

  async function handleDelete() {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/encuentros/${id}`, { method: "DELETE", credentials: "include" });
    navigate("/encuentros");
  }

  async function handleGenerateMatches() {
    if (!selectedSportId) return;
    setGenerating(true);
    setRsvpError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`/api/encuentros/${id}/generar-partidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          formato,
          sportId: selectedSportId,
          courts: canchas,
          rounds: rondas,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resData = await res.json();

      if (res.ok) {
        setShowGenerateForm(false);
        reloadMatches();
      } else {
        setRsvpError(resData.message || "Error al generar partidos");
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error("Error al generar partidos:", err);
      if (err instanceof Error && err.name === "AbortError") {
        setRsvpError("El servidor tardó demasiado en responder. Revisa la consola del backend.");
      } else {
        setRsvpError("Error de conexión al generar partidos");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreviewMatches() {
    if (!selectedSportId) return;
    setPreviewLoading(true);
    setRsvpError(null);
    try {
      const res = await fetch(`/api/encuentros/${id}/generar-partidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          formato,
          sportId: selectedSportId,
          courts: canchas,
          rounds: rondas,
          previewOnly: true,
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.cruces) {
        setPreviewCruces(resData.cruces);
        setPreviewSummary(resData.summary || null);
        setShowPreviewModal(true);
      } else {
        setRsvpError(resData.message || "Error al calcular cruces");
      }
    } catch {
      setRsvpError("Error de conexión al simular emparejamiento.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDeleteMatches() {
    if (!confirm("¿Deseas eliminar todos los partidos generados para este encuentro? Podrás reconfigurar y volver a generar los cruces libremente.")) return;
    setDeletingMatches(true);
    setRsvpError(null);
    try {
      const res = await fetch(`/api/encuentros/${id}/partidos`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        reloadMatches();
        setShowGenerateForm(true);
      } else {
        const d = await res.json();
        setRsvpError(d.message || "Error al eliminar partidos");
      }
    } catch {
      setRsvpError("Error de conexión al eliminar los partidos.");
    } finally {
      setDeletingMatches(false);
    }
  }

  async function handleConfirmMatchOfficial(matchId: number) {
    try {
      const res = await fetch(`/api/matches/${matchId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        reloadMatches();
      } else {
        alert(data.error || "No se pudo confirmar el partido");
      }
    } catch {
      alert("Error al confirmar resultado oficial");
    }
  }

  async function handleFinalizarEncuentro() {
    if (!confirm("¿Deseas dar por finalizado oficialmente este encuentro deportivo?")) return;
    try {
      const res = await fetch(`/api/encuentros/${id}/finalizar`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        await refreshEncuentroData();
        if (data.pendingCount > 0) {
          alert(`Encuentro finalizado. Quedaron ${data.pendingCount} partidos sin resultado oficial.`);
        } else {
          alert("¡Encuentro finalizado con éxito! Todos los resultados y rankings están computados.");
        }
      }
    } catch {
      alert("Error al finalizar el encuentro");
    }
  }

  // --- Funciones para gestión de Sets dinámicos ---
  const handleStartEditMatch = (match: MatchData) => {
    setEditingMatchId(match.id);
    if (Array.isArray(match.sets) && match.sets.length > 0) {
      setEditSets(
        match.sets.map((s: any) => ({
          team1: Number(s.team1 ?? s.team1Score ?? 0),
          team2: Number(s.team2 ?? s.team2Score ?? 0),
        }))
      );
    } else if (match.sets && typeof match.sets === "object" && Object.keys(match.sets).length > 0) {
      const parsed = Object.values(match.sets).map((s: any) => ({
        team1: Number(s.team1 ?? s.team1Score ?? 0),
        team2: Number(s.team2 ?? s.team2Score ?? 0),
      }));
      setEditSets(parsed.length > 0 ? parsed : [{ team1: match.team1Score || 0, team2: match.team2Score || 0 }]);
    } else {
      setEditSets([{ team1: match.team1Score || 0, team2: match.team2Score || 0 }]);
    }
  };

  const handleSetChange = (index: number, team: "team1" | "team2", val: number) => {
    setEditSets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [team]: val };
      return updated;
    });
  };

  const handleAddSet = () => {
    setEditSets((prev) => [...prev, { team1: 0, team2: 0 }]);
  };

  const handleRemoveSet = (index: number) => {
    if (editSets.length <= 1) return;
    setEditSets((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSaveScore(matchId: number) {
    setSavingScore(true);
    try {
      let t1Sets = 0;
      let t2Sets = 0;
      let t1Games = 0;
      let t2Games = 0;

      editSets.forEach((s) => {
        t1Games += s.team1;
        t2Games += s.team2;
        if (s.team1 > s.team2) t1Sets++;
        else if (s.team2 > s.team1) t2Sets++;
      });

      // Si hay más de 1 set, el score global suele ser la cantidad de sets ganados. Si es 1 set, son los juegos.
      const team1Score = editSets.length > 1 ? t1Sets : editSets[0].team1;
      const team2Score = editSets.length > 1 ? t2Sets : editSets[0].team2;

      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          team1Score,
          team2Score,
          sets: editSets,
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

  const dateLocale = LOCALES[lang] || es;
  const formattedDateStr = format(date, "EEEE d 'de' MMMM, HH:mm", { locale: dateLocale });
  const appUrl = window.location.href;

  const handleShareGroupWhatsapp = () => {
    const msg = t.groupMessage;
    const text =
      `🎾 *${msg.invitation} - ${encuentro.title.toUpperCase()}*\n\n` +
      `📅 *${msg.date}:* ${formattedDateStr}\n` +
      `📍 *${msg.location}:* ${encuentro.location}\n` +
      `👥 *${msg.confirmed}:* ${confirmedCount}${encuentro.maxSpots ? `/${encuentro.maxSpots}` : ""}\n` +
      (encuentro.notes ? `📝 *${msg.notes}:* ${encuentro.notes}\n` : "") +
      `\n📌 ${msg.cta}\n${appUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSharePlayerWhatsapp = (entry: AsistenciaEntry) => {
    const playerLang: Language = (entry.playerLanguage as Language) || lang;
    const targetT = TRANSLATIONS[playerLang] || TRANSLATIONS.es;
    const msg = targetT.playerMessage;

    const dateFormatMap: Record<Language, string> = {
      es: "EEEE d 'de' MMMM, HH:mm",
      en: "EEEE, MMMM d, HH:mm",
      pt: "EEEE, d 'de' MMMM, HH:mm",
    };

    const playerFormattedDate = format(
      date,
      dateFormatMap[playerLang] || dateFormatMap.es,
      { locale: LOCALES[playerLang] || es }
    );

    const text =
      `${msg.greeting(entry.playerName)}\n\n${msg.reminder(encuentro.title)}\n` +
      `📅 *${msg.date}:* ${playerFormattedDate}\n` +
      `📍 *${msg.location}:* ${encuentro.location}\n\n` +
      `${msg.cta}\n${appUrl}`;

    const phone = entry.playerPhone ? entry.playerPhone.replace(/[^0-9]/g, "") : "";
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {rsvpError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{rsvpError}</span>
          <button onClick={() => setRsvpError(null)} className="text-xs hover:underline ml-auto font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/encuentros")} className="-ml-2 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{encuentro.title}</h1>
            {encuentro.estado && (
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border",
                  encuentro.estado === "finalizado"
                    ? "bg-muted text-muted-foreground border-border"
                    : encuentro.estado === "en_curso"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}
              >
                {encuentro.estado === "abierto"
                  ? t.open
                  : encuentro.estado === "en_curso"
                  ? t.inProgress
                  : t.finished}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formattedDateStr}
            </span>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <MapPin className="h-4 w-4" />
              {encuentro.location}
              <ExternalLink className="h-3 w-3" />
            </a>
            {encuentro.maxSpots && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {t.maxPlayers(encuentro.maxSpots)}
              </span>
            )}
          </div>
          {encuentro.notes && <p className="mt-2 text-sm text-muted-foreground italic">{encuentro.notes}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleShareGroupWhatsapp}
            >
              <MessageCircle className="h-4 w-4" />
              {t.shareGroupWhatsapp}
            </Button>

            <ParrynAssistant
              mode="convocatoria"
              payload={{
                title: encuentro.title,
                dateTime: formattedDateStr,
                location: encuentro.location,
                maxSpots: encuentro.maxSpots,
                confirmedCount,
                missingCount: Math.max(0, (encuentro.maxSpots || 4) - confirmedCount),
                confirmedNames: confirmedList.map((a) => a.playerName),
              }}
            />

            {matches.length > 0 && (
              <ParrynAssistant
                mode="cierre"
                payload={{
                  title: encuentro.title,
                  date: formattedDateStr,
                  matches: matches.map((m, idx) => ({
                    matchNumber: idx + 1,
                    team1Names: m.team1Players.map((p) => p.name).join(" / "),
                    team2Names: m.team2Players.map((p) => p.name).join(" / "),
                    score: `${m.team1Score} - ${m.team2Score}`,
                    status: (m as any).status,
                  })),
                }}
              />
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
              onClick={() => {
                const playerIds = confirmedList.map((c) => c.playerId).join(",");
                navigate(`/cobros?encuentroId=${encuentro.id}&players=${playerIds}&title=${encodeURIComponent(encuentro.title)}`);
              }}
            >
              💳 Generar Cobros del Encuentro
            </Button>

            {encuentro.estado !== "finalizado" && (
              <Button
                size="sm"
                variant="outline"
                className="border-border hover:bg-muted gap-1.5"
                onClick={handleFinalizarEncuentro}
              >
                🏁 Finalizar Encuentro
              </Button>
            )}
          </div>
        </div>

        {isOrganizer && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {user && user.playerId ? (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.yourResponse}
            </CardTitle>
            {(myEntry?.status === "waitlist" || myEntry?.status === "reserva") && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {t.waitlist}
              </span>
            )}
            {encuentro.maxSpots && confirmedCount >= encuentro.maxSpots && myEntry?.status !== "confirmed" && myEntry?.status !== "waitlist" && myEntry?.status !== "reserva" && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {t.spotsFull} ({confirmedCount}/{encuentro.maxSpots})
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              {(["confirmed", "declined", "pending"] as const).map((status) => {
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                const isActive = myEntry?.status === status;
                return (
                  <Button
                    key={status}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`gap-2 flex-1 ${isActive ? "" : "border-white/10"}`}
                    onClick={() => handleRsvp(status)}
                    disabled={submittingRsvp}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t[cfg.labelKey]}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : user && !user.playerId ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 px-4 text-sm text-amber-400">
            {t.linkAccountMsg}{" "}
            <button onClick={() => navigate("/vincular")} className="underline font-medium">
              {t.linkNow}
            </button>
          </CardContent>
        </Card>
      ) : null}

      <div className={cn("grid gap-3", waitlistCount > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {[
          { label: t.confirmedCount, count: confirmedCount, color: "text-emerald-400" },
          { label: t.declinedCount, count: declinedCount, color: "text-red-400" },
          { label: t.pendingCount, count: pendingCount, color: "text-muted-foreground" },
          ...(waitlistCount > 0 ? [{ label: t.waitlistCount, count: waitlistCount, color: "text-amber-400" }] : []),
        ].map((item) => (
          <Card key={item.label} className="text-center py-3">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </Card>
        ))}
      </div>

      {isOrganizer && (
        <div className="bg-primary/10 border border-primary/25 rounded-xl p-3.5 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
            <Crown size={18} />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              👑 Modo Organizador del Encuentro
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">Tú eres el creador</span>
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Como creador de este evento, tienes la facultad de gestionar la asistencia de todos los jugadores (confirmar o dar de baja si te avisan por WhatsApp) y generar los cruces de partidos. Los jugadores invitados solo pueden responder por su propia cuenta.
            </p>
          </div>
        </div>
      )}

      {asistencia.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.playersTitle(asistencia.length)}
            </CardTitle>
            {isOrganizer && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  {selectedPlayerIds.length === asistencia.length ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                  {selectedPlayerIds.length === asistencia.length ? t.clearSelection : t.confirmAll}
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {isOrganizer && selectedPlayerIds.length > 0 && (
              <div className="bg-primary/10 border border-primary/30 p-2.5 rounded-lg flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-primary">
                  {t.selectedCount(selectedPlayerIds.length)}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleBulkStatusChange("confirmed")}
                  >
                    ✓ {t.attending}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleBulkStatusChange("declined")}
                  >
                    ✕ {t.cantGo}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-border"
                    onClick={() => setSelectedPlayerIds([])}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </div>
            )}

            {asistencia.map((entry) => {
              const cfg = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const initials = entry.playerName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");
              const isSelected = selectedPlayerIds.includes(entry.playerId);
              const isWaitlist = entry.status === "waitlist" || entry.status === "reserva";

              return (
                <div
                  key={`player-${entry.playerId}`}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                    cfg.bg,
                    isSelected && "ring-1 ring-primary"
                  )}
                >
                  {isOrganizer && (
                    <button
                      type="button"
                      onClick={() => toggleSelectPlayer(entry.playerId)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                    </button>
                  )}

                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-white/10">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{entry.playerName}</p>
                      {isWaitlist && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                          {t.waitlist}
                        </span>
                      )}
                    </div>
                    {entry.playerNickname && (
                      <p className="text-xs text-muted-foreground">"{entry.playerNickname}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                      title={t.sendWhatsappReminder}
                      onClick={() => handleSharePlayerWhatsapp(entry)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>

                    {isOrganizer ? (
                      <div className="flex items-center gap-1 bg-black/20 p-1 rounded-md border border-white/5">
                        <button
                          title="Confirmar"
                          onClick={() => handleOrganizerSetStatus(entry.playerId, "confirmed")}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center transition-colors",
                            entry.status === "confirmed" ? "bg-emerald-600 text-white" : "hover:bg-white/10 text-muted-foreground"
                          )}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          title="No puede"
                          onClick={() => handleOrganizerSetStatus(entry.playerId, "declined")}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center transition-colors",
                            entry.status === "declined" ? "bg-red-600 text-white" : "hover:bg-white/10 text-muted-foreground"
                          )}
                        >
                          <X size={12} />
                        </button>
                        <button
                          title="Pendiente"
                          onClick={() => handleOrganizerSetStatus(entry.playerId, "pending")}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center transition-colors",
                            entry.status === "pending" ? "bg-secondary text-secondary-foreground" : "hover:bg-white/10 text-muted-foreground"
                          )}
                        >
                          <Clock size={12} />
                        </button>
                        <button
                          title="Reserva"
                          onClick={() => handleOrganizerSetStatus(entry.playerId, "waitlist")}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center transition-colors",
                            isWaitlist ? "bg-amber-600 text-white" : "hover:bg-white/10 text-muted-foreground"
                          )}
                        >
                          <Clock size={12} className="text-amber-300" />
                        </button>
                      </div>
                    ) : (
                      <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Swords size={16} className="text-primary" />
            {t.eventMatches}
            {matches.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {matches.length} partidos
              </span>
            )}
          </h2>
          {isOrganizer && matches.length === 0 && !showGenerateForm && (
            <button
              onClick={() => setShowGenerateForm(true)}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <Shuffle size={14} /> {t.generateMatches}
            </button>
          )}
          {matches.length > 0 && !showGenerateForm && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(true)}
                className="h-7 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 font-medium"
                title={t.printFixture}
              >
                <Printer size={13} /> {t.printFixture}
              </Button>
              {isOrganizer && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGenerateForm(true)}
                    className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                  >
                    <Shuffle size={12} /> {t.regenerateFixture}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteMatches}
                    disabled={deletingMatches}
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <Trash2 size={12} /> {t.cleanFixture}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {isOrganizer && showGenerateForm && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-primary" />
                    Configurar Fixture y Generar Partidos
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define la modalidad, pistas disponibles y cantidad de rondas a disputar.
                  </p>
                </div>
                {matches.length > 0 && (
                  <span className="text-[11px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                    ⚠️ Reemplazará los partidos existentes
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Formato */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  1. Formato de Juego
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormato("americana")}
                    className={cn(
                      "p-3 rounded-xl text-left border transition-all",
                      formato === "americana"
                        ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                      🎾 Americana (Rotación)
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Individual: rotas de compañero y rivales en cada ronda sumando puntos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormato("parejas_fijas")}
                    className={cn(
                      "p-3 rounded-xl text-left border transition-all",
                      formato === "parejas_fijas"
                        ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                      👥 Parejas Fijas (Liguilla)
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Parejas estables balanceadas por Elo jugando todos contra todos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormato("desafio");
                      setRondas(1);
                    }}
                    className={cn(
                      "p-3 rounded-xl text-left border transition-all",
                      formato === "desafio"
                        ? "bg-primary/15 text-foreground border-primary ring-1 ring-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                      ⚡ Desafío (1 Partido)
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      1 solo partido competitivo por cada pista disponible.
                    </p>
                  </button>
                </div>
              </div>

              {/* Canchas y Rondas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Canchas */}
                <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">2. Pistas / Canchas Disponibles</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Máx. {Math.max(1, Math.floor(confirmedCount / 4))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={canchas <= 1}
                      onClick={() => setCanchas((c) => Math.max(1, c - 1))}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="font-bold text-sm min-w-16 text-center tabular-nums">
                      {canchas} {canchas === 1 ? "Pista" : "Pistas"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={canchas >= Math.max(1, Math.floor(confirmedCount / 4))}
                      onClick={() =>
                        setCanchas((c) =>
                          Math.min(Math.max(1, Math.floor(confirmedCount / 4)), c + 1)
                        )
                      }
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {canchas * 4} jugadores en simultáneo •{" "}
                    {Math.max(0, confirmedCount - canchas * 4) === 0 ? (
                      <span className="text-emerald-500 font-medium">0 descansan</span>
                    ) : (
                      <span className="text-amber-500 font-medium">
                        {confirmedCount - canchas * 4} descansan por ronda (rotación)
                      </span>
                    )}
                  </p>
                </div>

                {/* Rondas */}
                <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">3. Rondas a Disputar</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {canchas * rondas} partidos tot.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={rondas <= 1}
                      onClick={() => setRondas((r) => Math.max(1, r - 1))}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="font-bold text-sm min-w-16 text-center tabular-nums">
                      {rondas} {rondas === 1 ? "Ronda" : "Rondas"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={rondas >= 15}
                      onClick={() => setRondas((r) => Math.min(15, r + 1))}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  {/* Presets rápidos */}
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {[
                      { r: 3, label: "3 rondas (Recomendado)" },
                      ...(confirmedCount >= 8 ? [{ r: 4, label: "4 rondas" }, { r: 7, label: "7 rondas (Completa)" }] : []),
                      ...(confirmedCount === 5 ? [{ r: 5, label: "5 rondas (1 descanso c/u)" }] : []),
                    ].map((preset) => (
                      <button
                        key={preset.r}
                        type="button"
                        onClick={() => setRondas(preset.r)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-md border transition-colors",
                          rondas === preset.r
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-background/60 hover:bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deporte */}
              {sports.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Deporte
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {sports.map((sport) => (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => setSelectedSportId(sport.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          selectedSportId === sport.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {sport.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarjeta de Desglose en Vivo (Cálculo visible antes de generar) */}
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span className="flex items-center gap-1.5">
                    <Info size={14} /> Planificación y División del Encuentro
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {confirmedCount < 4 ? "Mínimo 4 jugadores" : "Paridad deportiva con Elo"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-background/90 p-2 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Jugadores</span>
                    <span className="font-bold text-sm text-foreground">{confirmedCount} confirmados</span>
                  </div>
                  <div className="bg-background/90 p-2 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Pistas simultáneas</span>
                    <span className="font-bold text-sm text-foreground">{canchas} pista{canchas > 1 ? "s" : ""}</span>
                  </div>
                  <div className="bg-background/90 p-2 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Rondas de juego</span>
                    <span className="font-bold text-sm text-foreground">{rondas} ronda{rondas > 1 ? "s" : ""}</span>
                  </div>
                  <div className="bg-background/90 p-2 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Total Partidos</span>
                    <span className="font-bold text-sm text-primary">{canchas * rondas} partidos</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>⏱️ Tiempo estimado: ~{rondas * 30} minutos</span>
                  <span>
                    {confirmedCount - canchas * 4 > 0
                      ? `☕ ${confirmedCount - canchas * 4} jugador(es) descansan por ronda en rotación`
                      : "✓ Todos los jugadores juegan simultáneamente"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  onClick={handlePreviewMatches}
                  disabled={previewLoading || generating || confirmedCount < 4}
                  variant="outline"
                  className="flex-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  {previewLoading ? "Calculando equilibrio..." : "🤖 Simular Cruces (Vista Previa Parryn)"}
                </Button>
                <Button
                  onClick={handleGenerateMatches}
                  disabled={generating || confirmedCount < 4}
                  className="flex-1 bg-primary text-primary-foreground text-xs font-semibold gap-1.5 hover:opacity-90"
                >
                  <Swords size={13} />
                  {generating ? "Generando..." : `⚔️ Generar ${canchas * rondas} Partidos Oficiales`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowGenerateForm(false)}
                  className="px-4 text-xs"
                >
                  {t.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {matchesLoaded && matches.length > 0 && (
          <div className="space-y-6">
            {matchesByRound.map(([roundNum, roundMatches]) => (
              <div key={`round-block-${roundNum}`} className="space-y-2.5">
                <div className="flex items-center justify-between bg-muted/40 px-3.5 py-2 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                      R{roundNum}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      Ronda {roundNum} {matchesByRound.length > 1 ? `de ${matchesByRound.length}` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {roundMatches.length} partido{roundMatches.length > 1 ? "s" : ""} en simultáneo
                  </span>
                </div>

                <div className="space-y-2">
                  {roundMatches.map((match, idx) => {
                    const setsList = Array.isArray(match.sets)
                      ? match.sets
                      : match.sets && typeof match.sets === "object"
                      ? Object.values(match.sets)
                      : [];

                    return (
                      <Card key={match.id} className={cn(match.pendingResult ? "border-border" : "border-primary/20")}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                                🏟️ Pista {match.court || (idx + 1)}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                Partido #{match.id}
                              </span>
                            </div>
                            {match.pendingResult ? (
                              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                {t.pendingResult}
                              </span>
                            ) : (match as any).status === "pending_confirmation" ? (
                              <span className="text-xs bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                                ⏳ Pendiente aprobación rival
                              </span>
                            ) : (
                              <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                ✓ {t.completed} (Oficial)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1 text-sm font-medium">
                              {match.team1Players.map((p) => p.name).join(" / ")}
                            </div>

                            {/* Visualización del Marcador Global y de los Sets */}
                            <div className="text-center">
                              <div className="font-bold text-lg tabular-nums">
                                <span
                                  className={
                                    (match.result === "team1" || match.team1Score > match.team2Score) && !match.pendingResult
                                      ? "text-primary font-bold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {match.team1Score}
                                </span>
                                <span className="text-muted-foreground mx-1">-</span>
                                <span
                                  className={
                                    (match.result === "team2" || match.team2Score > match.team1Score) && !match.pendingResult
                                      ? "text-primary font-bold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {match.team2Score}
                                </span>
                              </div>
                              {setsList.length > 0 && (
                                <div className="flex gap-1.5 justify-center mt-1">
                                  {setsList.map((s: any, sIdx: number) => (
                                    <span
                                      key={sIdx}
                                      className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                                    >
                                      {s.team1 ?? s.team1Score ?? 0}-{s.team2 ?? s.team2Score ?? 0}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 text-sm font-medium text-right">
                              {match.team2Players.map((p) => p.name).join(" / ")}
                            </div>
                          </div>

                          {/* Formulario de Edición con Sets Dinámicos */}
                          {isOrganizer && (
                            <>
                              {editingMatchId === match.id ? (
                                <div className="mt-4 p-3 bg-muted/30 border border-white/5 rounded-lg space-y-3">
                                  <div className="space-y-2">
                                    {editSets.map((s, sIdx) => (
                                      <div key={sIdx} className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded">
                                        <span className="text-xs font-semibold text-muted-foreground w-12">
                                          {t.setLabel(sIdx + 1)}
                                        </span>
                                        <div className="flex items-center gap-3">
                                          <ScoreInput
                                            value={s.team1}
                                            onChange={(v) => handleSetChange(sIdx, "team1", v)}
                                          />
                                          <span className="text-xs text-muted-foreground font-bold">-</span>
                                          <ScoreInput
                                            value={s.team2}
                                            onChange={(v) => handleSetChange(sIdx, "team2", v)}
                                          />
                                        </div>
                                        {editSets.length > 1 ? (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveSet(sIdx)}
                                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                            title={t.removeSet}
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        ) : (
                                          <div className="w-5" />
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleAddSet}
                                    className="w-full py-1.5 text-xs text-primary border border-primary/30 border-dashed rounded hover:bg-primary/5 transition-colors flex items-center justify-center gap-1 font-medium"
                                  >
                                    <Plus size={12} /> {t.addSet}
                                  </button>

                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() => handleSaveScore(match.id)}
                                      disabled={savingScore}
                                      className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                                    >
                                      {savingScore ? t.saving : t.saveScore}
                                    </button>
                                    <button
                                      onClick={() => setEditingMatchId(null)}
                                      className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-muted/80"
                                    >
                                      {t.cancel}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEditMatch(match)}
                                  className="w-full mt-3 text-xs text-primary hover:underline font-medium"
                                >
                                  {match.pendingResult ? t.enterScore : t.editScore}
                                </button>
                              )}
                            </>
                          )}

                          {/* Banner de Validación Cruzada Fair Play */}
                          {((match as any).status === "pending_confirmation" || (!match.pendingResult && (match as any).status !== "confirmed")) && (
                            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  ⚖️ Fair Play:
                                </span>
                                <span className="text-muted-foreground ml-1">
                                  {(match as any).submittedByPlayerName
                                    ? `Marcador registrado por ${(match as any).submittedByPlayerName}.`
                                    : "Marcador registrado."}{" "}
                                  Requiere aprobación del rival o del administrador para validar el Elo.
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {(() => {
                                  const userPlayerId = user?.playerId;
                                  const isStaff = (user as any)?.isAdmin === 1 || (user as any)?.isClubAdmin === 1;
                                  const userInT1 = match.team1Players.some((p) => p.id === userPlayerId);
                                  const userInT2 = match.team2Players.some((p) => p.id === userPlayerId);
                                  const submitterId = (match as any).submittedByPlayerId;
                                  const isRival = submitterId
                                    ? (userInT1 && !match.team1Players.some((p) => p.id === submitterId)) ||
                                      (userInT2 && !match.team2Players.some((p) => p.id === submitterId))
                                    : userInT1 || userInT2;

                                  if (isStaff) {
                                    return (
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1"
                                        onClick={() => handleConfirmMatchOfficial(match.id)}
                                      >
                                        🛡️ Aprobar como Admin
                                      </Button>
                                    );
                                  }

                                  if (isRival) {
                                    return (
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                                        onClick={() => handleConfirmMatchOfficial(match.id)}
                                      >
                                        <Check className="w-3 h-3" />
                                        ✓ Aprobar resultado rival
                                      </Button>
                                    );
                                  }

                                  if (userInT1 || userInT2) {
                                    return (
                                      <span className="text-[11px] text-amber-500 font-medium">
                                        Esperando que tu rival confirme...
                                      </span>
                                    );
                                  }

                                  return null;
                                })()}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Vista Previa de Cruces con Parryn */}
        {showPreviewModal && previewCruces && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-base">Vista Previa del Fixture (Parryn IA)</h3>
                    <p className="text-[11px] text-muted-foreground">Cruces calculados y balanceados por nivel Elo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {previewSummary && (
                <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-primary/5 rounded-xl border border-primary/20 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Jugadores</span>
                    <span className="font-bold">{previewSummary.totalConfirmed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Pistas</span>
                    <span className="font-bold">{previewSummary.courts}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Rondas</span>
                    <span className="font-bold">{previewSummary.rounds}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Partidos</span>
                    <span className="font-bold text-primary">{previewSummary.totalMatches}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {previewCruces.map((cruce: any) => (
                  <div
                    key={`preview-${cruce.round}-${cruce.court}-${cruce.matchIndex}`}
                    className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                          Ronda {cruce.round || 1} • Pista {cruce.court || 1}
                        </span>
                        <span className="text-muted-foreground font-normal">Partido #{cruce.matchIndex}</span>
                      </div>
                      <span className="text-emerald-500 font-medium">Δ Elo: {cruce.diffElo} pts</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <div className="bg-background/80 p-2 rounded-lg border">
                        <p className="font-medium text-foreground">{cruce.team1Names}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Elo promedio: {cruce.team1AvgElo}</p>
                      </div>
                      <div className="bg-background/80 p-2 rounded-lg border">
                        <p className="font-medium text-foreground">{cruce.team2Names}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Elo promedio: {cruce.team2AvgElo}</p>
                      </div>
                    </div>

                    {cruce.restingNames && cruce.restingNames.length > 0 && (
                      <p className="text-[10px] text-amber-500/90 pt-0.5">
                        ☕ Descansan en esta ronda: {cruce.restingNames.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    setShowPreviewModal(false);
                    await handleGenerateMatches();
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar y Crear Fixture
                </Button>
              </div>
            </div>
          </div>
        )}

        {matchesLoaded && matches.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Swords size={24} className="mx-auto mb-2 opacity-30" />
            <p>{t.noMatchesYet}</p>
          </div>
        )}

        {showPrintModal && (
          <PrintFixtureModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            encuentro={encuentro}
            matches={matches}
            asistencia={asistencia}
            clubName={encuentro.location || "Club de Pádel"}
          />
        )}
      </div>
    </div>
  );
}