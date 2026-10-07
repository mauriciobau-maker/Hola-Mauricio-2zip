import { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  Plus,
  Check,
  Trash2,
  DollarSign,
  Clock,
  Users,
  Search,
  X,
  AlertCircle,
  MessageSquare,
  CreditCard,
  Paperclip,
  Eye,
  Upload,
  ExternalLink,
  Receipt,
  FileCheck,
  Info,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useListPlayers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { triggerParryn } from "@/components/ParrynWidget";

interface CobroItem {
  concepto: string;
  monto: number;
}

interface Cobro {
  id: number;
  playerId: number;
  clubId: number;
  monto: number;
  items: CobroItem[] | null;
  estado: "pendiente" | "pagado";
  comprobanteUrl: string | null;
  confirmadoPor: string | null;
  notas: string | null;
  pagadoAt: string | null;
  createdAt: string;
  playerName: string | null;
  playerNickname: string | null;
  playerPhone: string | null;
}

interface CobroStats {
  totalRecaudado: number;
  totalPendiente: number;
  totalCobros: number;
  deudoresCount: number;
  isStaff: boolean;
}

interface CostoItemInput {
  id: string;
  concepto: string;
  monto: string;
}

const COBROS_I18N = {
  es: {
    title: "Planilla de Cobros",
    subtitleStaff: "Control de pagos, desglose de ítems, arriendos de pista y gastos compartidos de torneos",
    subtitlePlayer: "Consulta el detalle exacto de tus cobros y adjunta tu comprobante de pago",
    tournamentCalcBtn: "Calculadora de torneo",
    newPaymentBtn: "Nuevo cobro",
    calcTitle: "Calculadora de torneo",
    calcDescription: "Ingresa los costos compartidos y a qué jugadores se les reparte en partes iguales. Si a alguien le corresponde un descuento o un saldo pendiente, ajústalo individualmente junto a su nombre — no afecta a los demás.",
    calcEventName: "Nombre (ej. 3er Torneo)",
    calcSharedCosts: "Costos compartidos",
    calcTotal: "Total",
    calcConceptPlaceholder: "Concepto (ej. Cancha)",
    calcAmountPlaceholder: "Monto",
    calcAddConcept: "+ Agregar concepto",
    calcSplitPlayers: "Jugadores que lo dividen",
    calcBaseFee: "Cuota base:",
    calcDeselectAll: "Deseleccionar todos",
    calcSelectAll: "Seleccionar todos",
    calcSearchPlaceholder: "Buscar jugador en la lista...",
    calcAdjustmentTooltip: "Descuento (ej: -1000) o Saldo adicional (ej: +1500)",
    calcSummary: "Resumen del reparto:",
    calcAmong: "entre",
    calcPlayersCount: "jugadores",
    close: "Cerrar",
    calcApplyBtn: "Aplicar y generar cobros",
    calcGenerating: "Generando...",
    pendingCard: "Pendiente",
    pendingSub: "jugadores con saldo",
    collectedCard: "Recaudado",
    collectedSub: "Pagos confirmados",
    totalCard: "Total Cobros",
    totalSub: "Registros en el sistema",
    playersCard: "Jugadores",
    playersSub: "Disponibles en el club",
    filterAll: "Todos",
    filterPending: "Pendientes",
    filterPaid: "Pagados",
    searchPlaceholder: "Buscar por jugador, concepto o ítem...",
    loading: "Cargando cobros del club...",
    noRecordsTitle: "No se encontraron cobros registrados",
    noRecordsStaff: "Utiliza la Calculadora de Torneo o el botón de Nuevo Cobro para registrar pagos pendientes.",
    noRecordsPlayer: "No tienes cobros pendientes en este momento.",
    thPlayer: "Jugador",
    thConcept: "¿Qué se está cobrando? (Detalle Ítems)",
    thReceipt: "Comprobante (Clip)",
    thAmount: "Monto",
    thStatus: "Estado",
    thActions: "Acciones",
    receiptBadge: "Comprobante",
    attachReceipt: "Adjuntar clip",
    noReceipt: "Sin comprobante",
    statusPaid: "Pagado",
    statusPending: "Pendiente",
    byUser: "por",
    underReview: "Por revisar",
    sendWhatsappTooltip: "Enviar detalle y cobro por WhatsApp",
    markPaidTooltip: "Marcar como pagado",
    revertPendingTooltip: "Revertir a pendiente",
    deleteTooltip: "Eliminar registro",
    receiptModalTitle: "Comprobante de Pago",
    receiptPreviewLabel: "Vista Previa del Comprobante",
    openOriginalImage: "Abrir imagen original en pestaña nueva",
    removeReceipt: "Quitar comprobante",
    uploadTransferLabel: "Subir captura de transferencia (Foto / Archivo)",
    uploadClickText: "Haz clic para seleccionar o tomar foto",
    uploadFormats: "PNG, JPG, WEBP hasta 8MB",
    pasteUrlLabel: "O pegar enlace web del comprobante",
    validateAndPayBtn: "Validar y Marcar como Pagado",
    saveReceiptBtn: "Guardar comprobante",
    savingReceipt: "Guardando...",
    newModalTitle: "Registrar nuevo cobro individual",
    selectPlayerPlaceholder: "Selecciona un jugador...",
    fieldWhatCharging: "¿Qué se está cobrando? (Concepto detallado) *",
    fieldWhatPlaceholder: "ej. Arriendo Cancha 2, Cuota torneo, Consumo hidratación",
    fieldAmount: "Monto ($) *",
    fieldNotes: "Observaciones adicionales (opcional)",
    fieldNotesPlaceholder: "ej. Cancha reservada de 19:00 a 20:30",
    cancel: "Cancelar",
    savePaymentBtn: "Guardar cobro",
    savingPayment: "Guardando...",
  },
  en: {
    title: "Payment Roster",
    subtitleStaff: "Track payments, item breakdown, court bookings and split tournament expenses",
    subtitlePlayer: "Check your exact payment details and upload proof of transfer",
    tournamentCalcBtn: "Split calculator",
    newPaymentBtn: "New payment",
    calcTitle: "Tournament Split Calculator",
    calcDescription: "Enter shared costs and select which players split them equally. If someone has a custom discount or credit, adjust it individually next to their name.",
    calcEventName: "Name (e.g. 3rd Tournament)",
    calcSharedCosts: "Shared costs",
    calcTotal: "Total",
    calcConceptPlaceholder: "Item (e.g. Court 1)",
    calcAmountPlaceholder: "Amount",
    calcAddConcept: "+ Add item",
    calcSplitPlayers: "Players sharing costs",
    calcBaseFee: "Base fee:",
    calcDeselectAll: "Deselect all",
    calcSelectAll: "Select all",
    calcSearchPlaceholder: "Search player in list...",
    calcAdjustmentTooltip: "Discount (e.g. -1000) or Extra (e.g. +1500)",
    calcSummary: "Split summary:",
    calcAmong: "among",
    calcPlayersCount: "players",
    close: "Close",
    calcApplyBtn: "Apply and create payments",
    calcGenerating: "Creating...",
    pendingCard: "Pending",
    pendingSub: "players with balance",
    collectedCard: "Collected",
    collectedSub: "Confirmed payments",
    totalCard: "Total Records",
    totalSub: "Entries in system",
    playersCard: "Players",
    playersSub: "Available in club",
    filterAll: "All",
    filterPending: "Pending",
    filterPaid: "Paid",
    searchPlaceholder: "Search by player, item or concept...",
    loading: "Loading club payments...",
    noRecordsTitle: "No payment records found",
    noRecordsStaff: "Use the Split Calculator or New Payment button to record pending payments.",
    noRecordsPlayer: "You have no pending payments at this time.",
    thPlayer: "Player",
    thConcept: "What is being charged? (Item Breakdown)",
    thReceipt: "Receipt (Clip)",
    thAmount: "Amount",
    thStatus: "Status",
    thActions: "Actions",
    receiptBadge: "Receipt",
    attachReceipt: "Attach receipt",
    noReceipt: "No receipt",
    statusPaid: "Paid",
    statusPending: "Pending",
    byUser: "by",
    underReview: "Under review",
    sendWhatsappTooltip: "Send breakdown & payment request via WhatsApp",
    markPaidTooltip: "Mark as paid",
    revertPendingTooltip: "Revert to pending",
    deleteTooltip: "Delete record",
    receiptModalTitle: "Payment Receipt",
    receiptPreviewLabel: "Receipt Preview",
    openOriginalImage: "Open original image in new tab",
    removeReceipt: "Remove receipt",
    uploadTransferLabel: "Upload transfer proof (Photo / File)",
    uploadClickText: "Click to select or take photo",
    uploadFormats: "PNG, JPG, WEBP up to 8MB",
    pasteUrlLabel: "Or paste receipt web link",
    validateAndPayBtn: "Validate and Mark as Paid",
    saveReceiptBtn: "Save receipt",
    savingReceipt: "Saving...",
    newModalTitle: "Record Individual Payment",
    selectPlayerPlaceholder: "Select a player...",
    fieldWhatCharging: "What is being charged? (Detailed concept) *",
    fieldWhatPlaceholder: "e.g. Court 2 rental, Tournament fee, Drinks",
    fieldAmount: "Amount ($) *",
    fieldNotes: "Additional notes (optional)",
    fieldNotesPlaceholder: "e.g. Court reserved 19:00 - 20:30",
    cancel: "Cancel",
    savePaymentBtn: "Save payment",
    savingPayment: "Saving...",
  },
  pt: {
    title: "Planilha de Cobranças",
    subtitleStaff: "Controle de pagamentos, detalhamento de itens, aluguel de quadras e divisão de torneios",
    subtitlePlayer: "Consulte o detalhe exato das suas cobranças e anexe o comprovante",
    tournamentCalcBtn: "Calculadora de divisão",
    newPaymentBtn: "Nova cobrança",
    calcTitle: "Calculadora de Torneio",
    calcDescription: "Insira os custos compartilhados e selecione quais jogadores dividem igualmente. Se alguém tiver desconto ou saldo pendente, ajuste individualmente ao lado do nome.",
    calcEventName: "Nome (ex: 3º Torneio)",
    calcSharedCosts: "Custos compartilhados",
    calcTotal: "Total",
    calcConceptPlaceholder: "Item (ex: Quadra 1)",
    calcAmountPlaceholder: "Valor",
    calcAddConcept: "+ Adicionar item",
    calcSplitPlayers: "Jogadores que dividem",
    calcBaseFee: "Cota base:",
    calcDeselectAll: "Desmarcar todos",
    calcSelectAll: "Selecionar todos",
    calcSearchPlaceholder: "Buscar jogador na lista...",
    calcAdjustmentTooltip: "Desconto (ex: -1000) ou Acréscimo (ex: +1500)",
    calcSummary: "Resumo da divisão:",
    calcAmong: "entre",
    calcPlayersCount: "jogadores",
    close: "Fechar",
    calcApplyBtn: "Aplicar e gerar cobranças",
    calcGenerating: "Gerando...",
    pendingCard: "Pendente",
    pendingSub: "jogadores com saldo",
    collectedCard: "Arrecadado",
    collectedSub: "Pagamentos confirmados",
    totalCard: "Total Registros",
    totalSub: "Registros no sistema",
    playersCard: "Jogadores",
    playersSub: "Disponíveis no clube",
    filterAll: "Todos",
    filterPending: "Pendentes",
    filterPaid: "Pagos",
    searchPlaceholder: "Buscar por jogador, item ou conceito...",
    loading: "Carregando cobranças do clube...",
    noRecordsTitle: "Nenhuma cobrança encontrada",
    noRecordsStaff: "Use a Calculadora de Torneio ou o botão Nova Cobrança para registrar pagamentos.",
    noRecordsPlayer: "Você não tem cobranças pendentes no momento.",
    thPlayer: "Jogador",
    thConcept: "O que está sendo cobrado? (Detalhe Itens)",
    thReceipt: "Comprovante (Clip)",
    thAmount: "Valor",
    thStatus: "Status",
    thActions: "Ações",
    receiptBadge: "Comprovante",
    attachReceipt: "Anexar comprovante",
    noReceipt: "Sem comprovante",
    statusPaid: "Pago",
    statusPending: "Pendente",
    byUser: "por",
    underReview: "A revisar",
    sendWhatsappTooltip: "Enviar detalhe e cobrança por WhatsApp",
    markPaidTooltip: "Marcar como pago",
    revertPendingTooltip: "Reverter para pendente",
    deleteTooltip: "Excluir registro",
    receiptModalTitle: "Comprovante de Pagamento",
    receiptPreviewLabel: "Pré-visualização do Comprovante",
    openOriginalImage: "Abrir imagem original em nova aba",
    removeReceipt: "Remover comprovante",
    uploadTransferLabel: "Enviar comprovante de transferência (Foto / Arquivo)",
    uploadClickText: "Clique para selecionar ou tirar foto",
    uploadFormats: "PNG, JPG, WEBP até 8MB",
    pasteUrlLabel: "Ou cole o link web do comprovante",
    validateAndPayBtn: "Validar e Marcar como Pago",
    saveReceiptBtn: "Salvar comprovante",
    savingReceipt: "Salvando...",
    newModalTitle: "Registrar Cobrança Individual",
    selectPlayerPlaceholder: "Selecione um jogador...",
    fieldWhatCharging: "O que está sendo cobrado? (Conceito detalhado) *",
    fieldWhatPlaceholder: "ex: Aluguel Quadra 2, Inscrição torneio, Bebidas",
    fieldAmount: "Valor ($) *",
    fieldNotes: "Observações adicionais (opcional)",
    fieldNotesPlaceholder: "ex: Quadra reservada das 19:00 às 20:30",
    cancel: "Cancelar",
    savePaymentBtn: "Salvar cobrança",
    savingPayment: "Salvando...",
  },
};

export default function Cobros() {
  const { user } = useAuth();
  const { data: allPlayers = [] } = useListPlayers();
  const { t, language } = useLanguage();
  const cT = (COBROS_I18N as any)[language] || COBROS_I18N.es;

  // Estados de datos
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [stats, setStats] = useState<CobroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<"todos" | "pendiente" | "pagado">("todos");

  // Estados de interfaz y modales
  const [showCalculator, setShowCalculator] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modal de Comprobante (Clip de pago)
  const [comprobanteModalCobro, setComprobanteModalCobro] = useState<Cobro | null>(null);
  const [comprobanteInput, setComprobanteInput] = useState("");
  const [comprobanteFilePreview, setComprobanteFilePreview] = useState<string | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);

  // Formulario Calculadora de Torneo
  const [torneoNombre, setTorneoNombre] = useState("");
  const [costosCompartidos, setCostosCompartidos] = useState<CostoItemInput[]>([
    { id: "1", concepto: "Cancha 14/9", monto: "" },
  ]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerAjustes, setPlayerAjustes] = useState<Record<number, string>>({});
  const [calcSearch, setCalcSearch] = useState("");

  // Formulario Nuevo Cobro Individual
  const [individualPlayerId, setIndividualPlayerId] = useState<number | "">("");
  const [individualConcepto, setIndividualConcepto] = useState("");
  const [individualMonto, setIndividualMonto] = useState("");
  const [individualNotas, setIndividualNotas] = useState("");

  // Determinar permisos de Staff
  const isStaff = useMemo(() => {
    if (!user) return false;
    const u = user as any;
    return (
      u.isAdmin === 1 ||
      u.isAdmin === true ||
      u.isClubAdmin === 1 ||
      u.isClubAdmin === true ||
      u.role === "superadmin" ||
      u.role === "admin" ||
      u.role === "colaborador" ||
      u.role === "adminclub" ||
      u.role === "club_admin" ||
      u.role === "SUPER_ADMIN"
    );
  }, [user]);

  const currentUserId = (user as any)?.playerId ?? null;

  // Cargar cobros y estadísticas
  const fetchData = async () => {
    try {
      setLoading(true);
      const [cobrosRes, statsRes] = await Promise.all([
        fetch("/api/cobros", { credentials: "include" }),
        fetch("/api/cobros/stats", { credentials: "include" }),
      ]);

      if (cobrosRes.ok) {
        const cobrosData = await cobrosRes.json();
        setCobros(Array.isArray(cobrosData) ? cobrosData : []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error al cargar planilla de cobros:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };
  const notifyError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 4000);
  };

  // --- CALCULADORA DE TORNEO ---
  const totalCostosCompartidos = useMemo(() => {
    return costosCompartidos.reduce((acc, c) => {
      const val = parseFloat(c.monto.replace(/\./g, "").replace(",", ".")) || 0;
      return acc + val;
    }, 0);
  }, [costosCompartidos]);

  const cuotaBasePorJugador = useMemo(() => {
    if (selectedPlayerIds.length === 0) return 0;
    return Math.round(totalCostosCompartidos / selectedPlayerIds.length);
  }, [totalCostosCompartidos, selectedPlayerIds.length]);

  const handleAddCostoItem = () => {
    setCostosCompartidos((prev) => [
      ...prev,
      { id: Date.now().toString(), concepto: "", monto: "" },
    ]);
  };

  const handleRemoveCostoItem = (id: string) => {
    if (costosCompartidos.length <= 1) return;
    setCostosCompartidos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateCostoItem = (id: string, field: "concepto" | "monto", value: string) => {
    setCostosCompartidos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleTogglePlayerSelection = (playerId: number) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSelectAllPlayers = () => {
    if (selectedPlayerIds.length === allPlayers.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(allPlayers.map((p) => p.id));
    }
  };

  const handleAjusteChange = (playerId: number, value: string) => {
    setPlayerAjustes((prev) => ({ ...prev, [playerId]: value }));
  };

  const handleCalcularYGenerarCobros = async () => {
    if (!torneoNombre.trim()) {
      notifyError("Ingresa el nombre del torneo o evento (ej. 3er Torneo)");
      return;
    }
    if (totalCostosCompartidos <= 0) {
      notifyError("Ingresa al menos un costo compartido con monto mayor a $0");
      return;
    }
    if (selectedPlayerIds.length === 0) {
      notifyError("Selecciona al menos un jugador para repartir los costos");
      return;
    }

    setActionLoading(true);
    try {
      const itemsPayload = costosCompartidos
        .map((c) => ({
          concepto: c.concepto.trim() || "Gasto compartido",
          monto: Math.round(parseFloat(c.monto.replace(/\./g, "").replace(",", ".")) || 0),
        }))
        .filter((c) => c.monto > 0);

      const jugadoresPayload = selectedPlayerIds.map((playerId) => {
        const rawAjuste = playerAjustes[playerId] || "0";
        const ajusteVal = Math.round(parseFloat(rawAjuste.replace(/\./g, "").replace(",", ".")) || 0);
        return {
          playerId,
          ajuste: ajusteVal,
        };
      });

      const res = await fetch("/api/cobros/torneo-calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre: torneoNombre.trim(),
          items: itemsPayload,
          jugadores: jugadoresPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar la calculadora");
      }

      notifySuccess(`¡Éxito! Se crearon ${data.count} cobros individuales en la planilla.`);
      setShowCalculator(false);
      setTorneoNombre("");
      setCostosCompartidos([{ id: "1", concepto: "Cancha 14/9", monto: "" }]);
      setSelectedPlayerIds([]);
      setPlayerAjustes({});
      await fetchData();
    } catch (err: any) {
      notifyError(err.message || "Error al generar cobros de torneo");
    } finally {
      setActionLoading(false);
    }
  };

  // --- NUEVO COBRO INDIVIDUAL ---
  const handleCrearCobroIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!individualPlayerId) {
      notifyError("Selecciona un jugador");
      return;
    }
    const monto = Math.round(parseFloat(individualMonto.replace(/\./g, "").replace(",", ".")) || 0);
    if (monto <= 0) {
      notifyError("Ingresa un monto válido");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          playerId: Number(individualPlayerId),
          monto,
          concepto: individualConcepto.trim() || "Cobro individual",
          notas: individualNotas.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear cobro");
      }

      notifySuccess("Cobro registrado exitosamente");
      setShowNewModal(false);
      setIndividualPlayerId("");
      setIndividualConcepto("");
      setIndividualMonto("");
      setIndividualNotas("");
      await fetchData();
    } catch (err: any) {
      notifyError(err.message || "Error al guardar el cobro");
    } finally {
      setActionLoading(false);
    }
  };

  // --- CONFIRMAR O REVERTIR PAGO ---
  const handleToggleEstado = async (cobroId: number, estadoActual: "pendiente" | "pagado") => {
    if (!isStaff) return;
    const nuevoEstado = estadoActual === "pagado" ? "pendiente" : "pagado";
    try {
      const res = await fetch(`/api/cobros/${cobroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        setCobros((prev) =>
          prev.map((c) =>
            c.id === cobroId
              ? {
                  ...c,
                  estado: nuevoEstado,
                  pagadoAt: nuevoEstado === "pagado" ? new Date().toISOString() : null,
                }
              : c
          )
        );
        notifySuccess(
          nuevoEstado === "pagado" ? "Pago marcado como Pagado ✓" : "Cobro revertido a Pendiente"
        );
        fetchData();
      }
    } catch {
      notifyError("Error al actualizar el estado");
    }
  };

  // --- ELIMINAR COBRO ---
  const handleDeleteCobro = async (cobroId: number) => {
    if (!isStaff) return;
    if (!confirm("¿Seguro que deseas eliminar este registro de cobro?")) return;
    try {
      const res = await fetch(`/api/cobros/${cobroId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setCobros((prev) => prev.filter((c) => c.id !== cobroId));
        notifySuccess("Cobro eliminado");
        fetchData();
      }
    } catch {
      notifyError("No se pudo eliminar el cobro");
    }
  };

  // --- CLIP Y COMPROBANTE DE PAGO ---
  const handleOpenComprobanteModal = (cobro: Cobro) => {
    setComprobanteModalCobro(cobro);
    setComprobanteInput(cobro.comprobanteUrl || "");
    setComprobanteFilePreview(null);
  };

  const handleComprobanteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      notifyError("La imagen no debe superar los 8MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setComprobanteFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveComprobante = async () => {
    if (!comprobanteModalCobro) return;
    const finalUrl = (comprobanteFilePreview || comprobanteInput).trim();
    if (!finalUrl) {
      notifyError("Debes seleccionar una imagen o ingresar un enlace de comprobante");
      return;
    }

    setUploadingComprobante(true);
    try {
      const res = await fetch(`/api/cobros/${comprobanteModalCobro.id}/comprobante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comprobanteUrl: finalUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al adjuntar comprobante");

      setCobros((prev) =>
        prev.map((c) =>
          c.id === comprobanteModalCobro.id ? { ...c, comprobanteUrl: finalUrl } : c
        )
      );
      notifySuccess("📎 ¡Comprobante adjuntado con éxito!");
      setComprobanteModalCobro(null);
      setComprobanteFilePreview(null);
      setComprobanteInput("");
      fetchData();
    } catch (err: any) {
      notifyError(err.message || "No se pudo adjuntar el comprobante");
    } finally {
      setUploadingComprobante(false);
    }
  };

  const handleRemoveComprobante = async (cobroId: number) => {
    if (!confirm("¿Deseas quitar este comprobante adjunto?")) return;
    try {
      const res = await fetch(`/api/cobros/${cobroId}/comprobante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comprobanteUrl: null }),
      });
      if (res.ok) {
        setCobros((prev) =>
          prev.map((c) => (c.id === cobroId ? { ...c, comprobanteUrl: null } : c))
        );
        notifySuccess("Comprobante removido");
        if (comprobanteModalCobro?.id === cobroId) {
          setComprobanteModalCobro(null);
        }
        fetchData();
      }
    } catch {
      notifyError("Error al remover comprobante");
    }
  };

  // --- ENVIAR WHATSAPP CON DETALLE CLARO ---
  const handleSendWhatsApp = (cobro: Cobro) => {
    const rawPhone = (cobro.playerPhone || "").replace(/\D/g, "");
    if (!rawPhone) {
      notifyError(`El jugador ${cobro.playerName || ""} no tiene un teléfono registrado.`);
      return;
    }

    let detalle = "";
    if (cobro.items && cobro.items.length > 0) {
      detalle = cobro.items
        .map((it) => `• ${it.concepto}: $${it.monto.toLocaleString("es-CL")}`)
        .join("\n");
    } else {
      detalle = `• ${cobro.notas || "Arriendo de Cancha / Cuota"}: $${cobro.monto.toLocaleString("es-CL")}`;
    }

    const msg = encodeURIComponent(
      `Hola ${cobro.playerName || "amigo"}! 🎾 Te escribimos desde el Club con el detalle exacto de lo que se te está cobrando:\n\n${detalle}\n\n👉 *Total a transferir: $${cobro.monto.toLocaleString(
        "es-CL"
      )}*\n\nPor favor adjunta tu comprobante de pago en la aplicación o reenvíanos la captura por aquí. ¡Muchas gracias!`
    );

    window.open(`https://wa.me/${rawPhone}?text=${msg}`, "_blank");
  };

  // Filtrado de la tabla
  const filteredCobros = useMemo(() => {
    return cobros.filter((c) => {
      const matchesSearch =
        (c.playerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.playerNickname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.notas || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.items && c.items.some((it) => it.concepto.toLowerCase().includes(searchTerm.toLowerCase())));
      const matchesEstado = filterEstado === "todos" ? true : c.estado === filterEstado;
      return matchesSearch && matchesEstado;
    });
  }, [cobros, searchTerm, filterEstado]);

  const filteredPlayersForCalc = useMemo(() => {
    return allPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(calcSearch.toLowerCase()) ||
        (p.nickname || "").toLowerCase().includes(calcSearch.toLowerCase())
    );
  }, [allPlayers, calcSearch]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Alertas */}
      {errorBanner && (
        <div className="flex items-center gap-3 p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm animate-in fade-in">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}
      {successBanner && (
        <div className="flex items-center gap-3 p-4 bg-green-950/80 border border-green-800 text-green-200 rounded-xl text-sm animate-in fade-in">
          <Check size={18} className="flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {cT.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStaff ? cT.subtitleStaff : cT.subtitlePlayer}
          </p>
        </div>

        {isStaff && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Botón Verde Parryn: Recordatorio WhatsApp */}
            <button
              onClick={() =>
                triggerParryn(
                  "Redacta un mensaje amable, amistoso y deportivo para enviar al grupo de WhatsApp recordando liquidar las cuotas pendientes del club"
                )
              }
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-400/40"
              title="Pedir a Parryn redactar recordatorio de pagos para WhatsApp"
            >
              <Sparkles size={15} className="text-yellow-300" />
              <span>Parryn WhatsApp</span>
            </button>

            {/* Botón Rojo: Calculadora de torneo */}
            <button
              onClick={() => setShowCalculator((prev) => !prev)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md active:scale-95 ${
                showCalculator
                  ? "bg-red-800 text-white ring-2 ring-red-400"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              <Calculator size={18} />
              <span>{cT.tournamentCalcBtn}</span>
            </button>

            {/* Botón Dorado: + Nuevo cobro */}
            <button
              onClick={() => setShowNewModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-500 hover:bg-yellow-400 text-zinc-950 transition-all shadow-md active:scale-95"
            >
              <Plus size={18} className="stroke-[2.5]" />
              <span>{cT.newPaymentBtn}</span>
            </button>
          </div>
        )}
      </div>

      {/* PANEL: CALCULADORA DE TORNEO (TAL CUAL LA CAPTURA DEL USUARIO) */}
      {showCalculator && isStaff && (
        <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="border-b border-border/60 pb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="text-red-500" size={22} />
              {cT.calcTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-4xl">
              {cT.calcDescription}
            </p>
          </div>

          {/* Campo: Nombre del evento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{cT.calcEventName}</label>
            <Input
              type="text"
              placeholder="3er Torneo, Americano Viernes, etc."
              value={torneoNombre}
              onChange={(e) => setTorneoNombre(e.target.value)}
              className="bg-background/80 border-input h-10 max-w-xl text-sm"
            />
          </div>

          {/* Sección: Costos compartidos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">{cT.calcSharedCosts}</label>
              <span className="text-sm font-semibold text-foreground">
                {cT.calcTotal}: ${totalCostosCompartidos.toLocaleString("es-CL")}
              </span>
            </div>

            <div className="space-y-2">
              {costosCompartidos.map((costo, index) => (
                <div key={costo.id} className="flex items-center gap-2 max-w-xl">
                  <Input
                    type="text"
                    placeholder={`${cT.calcConceptPlaceholder} ${index + 1}`}
                    value={costo.concepto}
                    onChange={(e) => handleUpdateCostoItem(costo.id, "concepto", e.target.value)}
                    className="flex-1 bg-background/80 h-10 text-sm"
                  />
                  <div className="relative w-40">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      placeholder={cT.calcAmountPlaceholder}
                      value={costo.monto}
                      onChange={(e) => handleUpdateCostoItem(costo.id, "monto", e.target.value)}
                      className="pl-7 bg-background/80 h-10 text-sm"
                    />
                  </div>
                  {costosCompartidos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCostoItem(costo.id)}
                      className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Eliminar fila"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddCostoItem}
              className="text-xs font-medium text-yellow-500 hover:text-yellow-400 flex items-center gap-1 mt-1 transition-colors"
            >
              {cT.calcAddConcept}
            </button>
          </div>

          {/* Sección: Jugadores que lo dividen */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-medium text-foreground">
                {cT.calcSplitPlayers} ({selectedPlayerIds.length})
                {selectedPlayerIds.length > 0 && totalCostosCompartidos > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({cT.calcBaseFee} ${cuotaBasePorJugador.toLocaleString("es-CL")} c/u)
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handleSelectAllPlayers}
                className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                {selectedPlayerIds.length === allPlayers.length
                  ? cT.calcDeselectAll
                  : cT.calcSelectAll}
              </button>
            </div>

            {/* Buscador rápido de jugadores en la calculadora */}
            {allPlayers.length > 8 && (
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={cT.calcSearchPlaceholder}
                  value={calcSearch}
                  onChange={(e) => setCalcSearch(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background/80"
                />
              </div>
            )}

            {/* Lista de Checkboxes de Jugadores con Ajuste Individual */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredPlayersForCalc.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                const rawAjuste = playerAjustes[player.id] || "";
                const numAjuste = parseFloat(rawAjuste) || 0;
                const finalParaEsteJugador = isSelected
                  ? Math.max(0, cuotaBasePorJugador + numAjuste)
                  : 0;

                return (
                  <div
                    key={player.id}
                    onClick={() => handleTogglePlayerSelection(player.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-sm transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-background/40 border-border/60 hover:bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-muted-foreground text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground">{player.name}</p>
                        {player.nickname && (
                          <p className="text-xs text-muted-foreground truncate">
                            &quot;{player.nickname}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="flex items-center gap-1.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-right">
                          <span className="block text-[11px] font-semibold text-yellow-500">
                            ${finalParaEsteJugador.toLocaleString("es-CL")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Total</span>
                        </div>
                        <Input
                          type="number"
                          placeholder="Ajuste (+/-)"
                          value={rawAjuste}
                          onChange={(e) => handleAjusteChange(player.id, e.target.value)}
                          className="w-20 h-7 text-xs bg-background border-input text-right"
                          title={cT.calcAdjustmentTooltip}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón de acción para aplicar el reparto */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60 flex-wrap gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">{cT.calcSummary} </span>
              <span className="font-semibold text-foreground">
                ${totalCostosCompartidos.toLocaleString("es-CL")}
              </span>
              <span className="text-muted-foreground"> {cT.calcAmong} </span>
              <span className="font-semibold text-foreground">
                {selectedPlayerIds.length} {cT.calcPlayersCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCalculator(false)}
                className="text-sm"
              >
                {cT.close}
              </Button>
              <Button
                type="button"
                disabled={actionLoading || selectedPlayerIds.length === 0 || totalCostosCompartidos <= 0}
                onClick={handleCalcularYGenerarCobros}
                className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-semibold text-sm shadow-md"
              >
                {actionLoading ? cT.calcGenerating : cT.calcApplyBtn}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* TARJETAS DE ESTADÍSTICAS FINANCIERAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <span>{cT.pendingCard}</span>
            <Clock size={16} className="text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-500">
            ${(stats?.totalPendiente ?? 0).toLocaleString("es-CL")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats?.deudoresCount ?? 0} {cT.pendingSub}
          </p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <span>{cT.collectedCard}</span>
            <Check size={16} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-500">
            ${(stats?.totalRecaudado ?? 0).toLocaleString("es-CL")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{cT.collectedSub}</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <span>{cT.totalCard}</span>
            <CreditCard size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {stats?.totalCobros ?? cobros.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{cT.totalSub}</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <span>{cT.playersCard}</span>
            <Users size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{allPlayers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{cT.playersSub}</p>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA DE LA PLANILLA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-2xl">
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl">
          <button
            onClick={() => setFilterEstado("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterEstado === "todos"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("all")} ({cobros.length})
          </button>
          <button
            onClick={() => setFilterEstado("pendiente")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterEstado === "pendiente"
                ? "bg-yellow-500 text-zinc-950 font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("unpaid")} ({cobros.filter((c) => c.estado === "pendiente").length})
          </button>
          <button
            onClick={() => setFilterEstado("pagado")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterEstado === "pagado"
                ? "bg-green-600 text-white font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("paid")} ({cobros.filter((c) => c.estado === "pagado").length})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={language === "en" ? "Search by player, item or concept..." : language === "pt" ? "Buscar por jogador, item ou conceito..." : "Buscar por jugador, concepto o ítem..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-xs bg-background/90"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL DE COBROS CON DESGLOSE VISIBLE Y CLIP DE PAGO */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p>{cT.loading}</p>
          </div>
        ) : filteredCobros.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
              <DollarSign size={24} />
            </div>
            <p className="font-medium text-foreground">{cT.noRecordsTitle}</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isStaff ? cT.noRecordsStaff : cT.noRecordsPlayer}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4">{cT.thPlayer}</th>
                  <th className="py-3.5 px-4 min-w-[260px]">
                    <div className="flex items-center gap-1.5">
                      <Receipt size={14} className="text-primary" />
                      <span>{cT.thConcept}</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">{cT.thReceipt}</th>
                  <th className="py-3.5 px-4 text-right">{cT.thAmount}</th>
                  <th className="py-3.5 px-4 text-center">{cT.thStatus}</th>
                  <th className="py-3.5 px-4 text-right">{cT.thActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCobros.map((cobro) => {
                  const initialLetters = (cobro.playerName || "J")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  const canManageReceipt = isStaff || (currentUserId && cobro.playerId === currentUserId);

                  return (
                    <tr
                      key={cobro.id}
                      className="hover:bg-muted/20 transition-colors group text-foreground"
                    >
                      {/* Jugador con Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary flex-shrink-0">
                            {initialLetters}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {cobro.playerName || `Jugador #${cobro.playerId}`}
                            </p>
                            {cobro.playerNickname && (
                              <p className="text-xs text-muted-foreground truncate">
                                &quot;{cobro.playerNickname}&quot;
                              </p>
                            )}
                            {cobro.playerPhone && (
                              <p className="text-[11px] text-muted-foreground/80 truncate">
                                {cobro.playerPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Concepto e Items desglosados explícitamente */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {cobro.items && cobro.items.length > 0 ? (
                            <div className="space-y-1">
                              {cobro.items.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs bg-muted/40 px-2.5 py-1 rounded-md border border-border/40 gap-2"
                                >
                                  <span className="font-medium text-foreground truncate">
                                    {it.concepto}
                                  </span>
                                  <span
                                    className={`font-mono text-xs font-semibold flex-shrink-0 ${
                                      it.monto < 0 ? "text-emerald-400" : "text-foreground"
                                    }`}
                                  >
                                    {it.monto < 0 ? "-" : ""}$
                                    {Math.abs(it.monto).toLocaleString("es-CL")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-foreground">
                              {cobro.notas || "Cobro / cuota"}
                            </div>
                          )}

                          {cobro.notas && cobro.items && cobro.items.length > 0 && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 italic truncate">
                              <Info size={11} className="flex-shrink-0 text-muted-foreground/70" />
                              {cobro.notas}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Comprobante con Clip de Adjuntar / Ver */}
                      <td className="py-3 px-4 text-center">
                        {cobro.comprobanteUrl ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenComprobanteModal(cobro)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all shadow-sm"
                              title={cT.receiptBadge}
                            >
                              <Paperclip size={13} className="stroke-[2.5]" />
                              <span>{cT.receiptBadge}</span>
                              <Eye size={12} className="opacity-80" />
                            </button>
                            {canManageReceipt && (
                              <button
                                onClick={() => handleRemoveComprobante(cobro.id)}
                                className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                                title={cT.removeReceipt}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        ) : canManageReceipt ? (
                          <button
                            onClick={() => handleOpenComprobanteModal(cobro)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground border border-dashed border-border/80 hover:text-foreground hover:bg-muted/80 hover:border-foreground/40 transition-all"
                            title={cT.attachReceipt}
                          >
                            <Paperclip size={13} />
                            <span>{cT.attachReceipt}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">{cT.noReceipt}</span>
                        )}
                      </td>

                      {/* Monto Total */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-base font-mono text-foreground">
                          ${cobro.monto.toLocaleString("es-CL")}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        {cobro.estado === "pagado" ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                              <Check size={12} className="stroke-[3]" />
                              {cT.statusPaid}
                            </span>
                            {cobro.confirmadoPor && (
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                {cT.byUser} {cobro.confirmadoPor}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                              <Clock size={12} />
                              {cT.statusPending}
                            </span>
                            {cobro.comprobanteUrl && (
                              <span className="text-[10px] text-blue-400 mt-0.5 font-medium">
                                {cT.underReview}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón WhatsApp */}
                          {cobro.playerPhone && cobro.estado === "pendiente" && (
                            <button
                              onClick={() => handleSendWhatsApp(cobro)}
                              className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                              title={cT.sendWhatsappTooltip}
                            >
                              <MessageSquare size={16} />
                            </button>
                          )}

                          {/* Botón Confirmar Pago / Revertir (Solo Staff) */}
                          {isStaff && (
                            <button
                              onClick={() => handleToggleEstado(cobro.id, cobro.estado)}
                              className={`p-2 rounded-lg transition-colors ${
                                cobro.estado === "pagado"
                                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                  : "bg-green-600 text-white hover:bg-green-500 shadow-sm"
                              }`}
                              title={
                                cobro.estado === "pagado"
                                  ? cT.revertPendingTooltip
                                  : cT.markPaidTooltip
                              }
                            >
                              <Check size={16} className="stroke-[2.5]" />
                            </button>
                          )}

                          {/* Botón Eliminar (Solo Staff) */}
                          {isStaff && (
                            <button
                              onClick={() => handleDeleteCobro(cobro.id)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-colors"
                              title={cT.deleteTooltip}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CLIP Y COMPROBANTE DE PAGO */}
      {comprobanteModalCobro && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Paperclip size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {cT.receiptModalTitle} — {comprobanteModalCobro.playerName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {cT.thAmount}: ${comprobanteModalCobro.monto.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComprobanteModalCobro(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Vista previa si ya existe un comprobante */}
            {(comprobanteFilePreview || comprobanteModalCobro.comprobanteUrl) && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {cT.receiptPreviewLabel}
                </label>
                <div className="max-h-64 overflow-hidden rounded-xl border border-border bg-black/40 flex items-center justify-center p-2">
                  <img
                    src={comprobanteFilePreview || comprobanteModalCobro.comprobanteUrl || ""}
                    alt="Comprobante de pago"
                    className="max-h-60 w-auto object-contain rounded-lg shadow-sm"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                </div>
                {comprobanteModalCobro.comprobanteUrl && !comprobanteFilePreview && (
                  <div className="flex items-center justify-between text-xs">
                    <a
                      href={comprobanteModalCobro.comprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> {cT.openOriginalImage}
                    </a>
                    <button
                      onClick={() => handleRemoveComprobante(comprobanteModalCobro.id)}
                      className="text-red-400 hover:underline"
                    >
                      {cT.removeReceipt}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Formulario para adjuntar / cambiar archivo o URL */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {cT.uploadTransferLabel}
                </label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-all bg-background/50">
                  <Upload size={22} className="text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-foreground">
                    {cT.uploadClickText}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{cT.uploadFormats}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleComprobanteFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {cT.pasteUrlLabel}
                </label>
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/comprobante.jpg"
                  value={comprobanteInput}
                  onChange={(e) => {
                    setComprobanteInput(e.target.value);
                    setComprobanteFilePreview(null);
                  }}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              {isStaff && comprobanteModalCobro.estado === "pendiente" ? (
                <Button
                  type="button"
                  onClick={() => {
                    handleToggleEstado(comprobanteModalCobro.id, "pendiente");
                    setComprobanteModalCobro(null);
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold gap-1.5"
                >
                  <FileCheck size={14} /> {cT.validateAndPayBtn}
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setComprobanteModalCobro(null)}
                >
                  {cT.close}
                </Button>
                <Button
                  type="button"
                  disabled={uploadingComprobante}
                  onClick={handleSaveComprobante}
                  className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-semibold text-sm"
                >
                  {uploadingComprobante ? cT.savingReceipt : cT.saveReceiptBtn}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO COBRO INDIVIDUAL */}
      {showNewModal && isStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus size={18} className="text-yellow-500" />
                {cT.newModalTitle}
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearCobroIndividual} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{cT.thPlayer} *</label>
                <select
                  value={individualPlayerId}
                  onChange={(e) => setIndividualPlayerId(Number(e.target.value) || "")}
                  required
                  className="w-full h-10 rounded-xl bg-background border border-input px-3 text-sm text-foreground focus:ring-2 focus:ring-primary"
                >
                  <option value="">{cT.selectPlayerPlaceholder}</option>
                  {allPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.nickname ? `("${p.nickname}")` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {cT.fieldWhatCharging}
                </label>
                <Input
                  type="text"
                  placeholder={cT.fieldWhatPlaceholder}
                  value={individualConcepto}
                  onChange={(e) => setIndividualConcepto(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{cT.fieldAmount}</label>
                <Input
                  type="number"
                  placeholder="ej. 7500"
                  value={individualMonto}
                  onChange={(e) => setIndividualMonto(e.target.value)}
                  required
                  min="1"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {cT.fieldNotes}
                </label>
                <Input
                  type="text"
                  placeholder={cT.fieldNotesPlaceholder}
                  value={individualNotas}
                  onChange={(e) => setIndividualNotas(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewModal(false)}
                >
                  {cT.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-semibold"
                >
                  {actionLoading ? cT.savingPayment : cT.savePaymentBtn}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
