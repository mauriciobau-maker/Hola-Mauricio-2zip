import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Copy,
  Check,
  CalendarDays,
  DollarSign,
  Trophy,
  Swords,
  Shield,
  ArrowUpRight,
  MessageCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";

const WIDGET_TEXTS = {
  es: {
    floatingButton: "Parryn IA",
    role: "Secretario Deportivo IA",
    statusOnline: "En línea",
    welcome: "¡Hola! Soy Parryn, tu Secretario Deportivo. ¿Qué necesitas resolver ahora?",
    inputPlaceholder: "Escribe a Parryn (ej: '¿Cómo armo los turnos si llueve?')...",
    sending: "Pensando...",
    copied: "¡Copiado para WhatsApp!",
    copyAction: "Copiar para WhatsApp",
    openFull: "Abrir Centro de Operaciones",
    contextActionsTitle: "Acciones rápidas para esta pantalla:",
    askAbout: "Consultar",
    screenHints: {
      encuentros: [
        { label: "📢 Convocatoria WhatsApp", query: "Redáctame un mensaje para el grupo de WhatsApp convocando al próximo encuentro e instando a confirmar asistencia." },
        { label: "🌧️ Plan por Lluvia", query: "Tengo riesgo de lluvia. ¿Cómo reubico los partidos entre canchas techadas y descubiertas sin suspender?" },
      ],
      cobros: [
        { label: "💳 Recordatorio de Cobro", query: "Redacta un recordatorio muy amable y positivo para el grupo recordando pagar la cuota de cancha y pelotas." },
        { label: "💰 Prorrateo Justo", query: "¿Cómo calculo el prorrateo de cancha y pelotas si un jugador llegó solo para un partido corto?" },
      ],
      partidos: [
        { label: "⚖️ Regla Fair Play", query: "Explícame cómo funciona la validación cruzada de resultados y por qué el rival debe aprobar el marcador." },
        { label: "🏆 Crónica de la Jornada", query: "Redacta la crónica oficial de cierre de la jornada para WhatsApp felicitando a los ganadores y destacando el Fair Play." },
      ],
      ranking: [
        { label: "📈 Sistema ELO", query: "Explica cómo sube o baja el ELO tras una victoria o derrota contra rivales de distinto nivel." },
        { label: "🎾 Equilibrio Drive/Revés", query: "¿Por qué es clave no juntar dos jugadores exclusivos de drive en la misma pareja de pádel?" },
      ],
      admin: [
        { label: "📲 Invitación WhatsApp al Club", query: "Redacta la invitación oficial de bienvenida con el enlace y código del club para sumar socios por WhatsApp." },
        { label: "🛡️ Buenas Prácticas", query: "¿Cuáles son las 3 mejores prácticas para mantener activa a la comunidad de socios todas las semanas?" },
      ],
      general: [
        { label: "🎾 Dinámica Americana", query: "¿Cómo funciona un torneo o jornada en formato americana y cuánto debe durar cada turno?" },
        { label: "⚡ Tips para el Organizador", query: "Dame 3 consejos clave para que la jornada deportiva de hoy salga perfecta y a horario." },
      ],
    },
  },
  en: {
    floatingButton: "Parryn AI",
    role: "AI Sports Secretary",
    statusOnline: "Online",
    welcome: "Hi! I'm Parryn, your AI Sports Secretary. What do you need help with right now?",
    inputPlaceholder: "Ask Parryn (e.g. 'How to handle court schedule in rain?')...",
    sending: "Thinking...",
    copied: "Copied for WhatsApp!",
    copyAction: "Copy for WhatsApp",
    openFull: "Open Operations Center",
    contextActionsTitle: "Quick actions for this screen:",
    askAbout: "Ask",
    screenHints: {
      encuentros: [
        { label: "📢 WhatsApp Callout", query: "Draft a WhatsApp message to invite players to the upcoming event and urge them to confirm." },
        { label: "🌧️ Rain Contingency", query: "How should I reschedule matches between covered and outdoor courts due to rain risk?" },
      ],
      cobros: [
        { label: "💳 Friendly Payment Reminder", query: "Draft a polite and warm WhatsApp reminder asking players to settle their court share." },
        { label: "💰 Fair Cost Splitting", query: "How to fairly calculate court fees when someone joined late?" },
      ],
      partidos: [
        { label: "⚖️ Fair Play Rules", query: "Explain how cross-validation works and why opponents must confirm the score." },
        { label: "🏆 Matchday Chronicle", query: "Draft an official matchday recap for WhatsApp praising winners and fair play." },
      ],
      ranking: [
        { label: "📈 ELO System", query: "How does the ELO rating change after wins/losses against different level players?" },
        { label: "🎾 Drive / Backhand Balance", query: "Why is it important to balance Drive and Backhand court sides in padel?" },
      ],
      admin: [
        { label: "📲 Club WhatsApp Invite", query: "Draft an official WhatsApp welcome invitation with the club link and code for members." },
        { label: "🛡️ Best Practices", query: "What are 3 best practices to keep community members engaged every week?" },
      ],
      general: [
        { label: "🎾 Americano Format", query: "How does an Americano tournament work and what rotation is best?" },
        { label: "⚡ Organizer Tips", query: "Give me 3 practical tips for running a smooth and on-time sports event." },
      ],
    },
  },
  pt: {
    floatingButton: "Parryn IA",
    role: "Secretário Esportivo IA",
    statusOnline: "Online",
    welcome: "Olá! Sou o Parryn, seu Secretário Esportivo. Como posso te ajudar agora?",
    inputPlaceholder: "Pergunte ao Parryn (ex: 'Como organizar os jogos se chover?')...",
    sending: "Pensando...",
    copied: "Copiado para o WhatsApp!",
    copyAction: "Copiar para o WhatsApp",
    openFull: "Abrir Centro de Operações",
    contextActionsTitle: "Ações rápidas para esta tela:",
    askAbout: "Consultar",
    screenHints: {
      encuentros: [
        { label: "📢 Convocação WhatsApp", query: "Redija uma mensagem para o WhatsApp convidando para o próximo encontro e pedindo confirmações." },
        { label: "🌧️ Plano para Chuva", query: "Como remanejar os jogos entre quadras cobertas e descobertas em caso de chuva?" },
      ],
      cobros: [
        { label: "💳 Lembrete Amigável de Pagamento", query: "Redija um lembrete gentil para o WhatsApp cobrando a taxa da quadra e bolinhas." },
        { label: "💰 Divisão Justa", query: "Como calcular a divisão dos custos quando alguém jogou apenas uma partida?" },
      ],
      partidos: [
        { label: "⚖️ Fair Play e Validação", query: "Explique como funciona a validação cruzada e por que o adversário deve confirmar o placar." },
        { label: "🏆 Resumo da Rodada", query: "Redija uma crônica oficial para o WhatsApp parabenizando os vencedores e destacando o Fair Play." },
      ],
      ranking: [
        { label: "📈 Sistema ELO", query: "Como funciona a variação de ELO após vitórias e derrotas contra adversários de níveis diferentes?" },
        { label: "🎾 Lado Direito / Esquerdo", query: "Por que é fundamental equilibrar jogadores de Drive e Revés no padel?" },
      ],
      admin: [
        { label: "📲 Convite WhatsApp para o Clube", query: "Redija o convite oficial para o WhatsApp com o link e código do clube para novos sócios." },
        { label: "🛡️ Melhores Práticas", query: "Quais são as 3 melhores práticas para manter a comunidade ativa toda semana?" },
      ],
      general: [
        { label: "🎾 Formato Americana", query: "Como funciona uma americana de padel e quanto tempo deve durar cada rodada?" },
        { label: "⚡ Dicas para o Organizador", query: "Dê 3 dicas para que o evento esportivo de hoje ocorra no horário e com harmonia." },
      ],
    },
  },
};

const FOOTBALL_HINTS = {
  es: {
    encuentros: [
      { label: "📢 Convocatoria Pichanga", query: "Redáctame un mensaje para el grupo de WhatsApp convocando al próximo partido de fútbol para completar los equipos de 5 o 7." },
      { label: "🌧️ Cancha Sintética y Clima", query: "¿Cómo coordinar si hay lluvia para el partido de fútbol en cancha sintética?" },
    ],
    cobros: [
      { label: "💳 Cuota Cancha y Balón", query: "Redacta un recordatorio amable para el grupo de WhatsApp recordando transferir la cuota de la cancha de fútbol." },
      { label: "💰 División 10/14 Jugadores", query: "¿Cómo dividir el costo del arriendo de la cancha entre los jugadores de la pichanga?" },
    ],
    partidos: [
      { label: "⚖️ Fair Play en Fútbol", query: "Explícame las reglas de Fair Play y cómo registrar el marcador del partido de fútbol." },
      { label: "🏆 Crónica de la Pichanga", query: "Redacta la crónica del partido de fútbol para WhatsApp destacando los goles y el Fair Play." },
    ],
    ranking: [
      { label: "⚽ Puntos y Tabla de Liga", query: "Explica cómo se calculan los puntos en la tabla de posiciones de fútbol (3 por victoria, 1 por empate)." },
      { label: "🥅 Balance Equipo A vs B", query: "¿Cómo armar los dos equipos de fútbol para que la pichanga sea pareja y competitiva?" },
    ],
    admin: [
      { label: "📲 Invitación WhatsApp al Club", query: "Redacta la invitación oficial de bienvenida con el enlace y código del club para sumar socios por WhatsApp." },
      { label: "🛡️ Buenas Prácticas", query: "¿Cuáles son las 3 mejores prácticas para mantener activa a la comunidad de socios todas las semanas?" },
    ],
    general: [
      { label: "⚽ Consejos para la Pichanga", query: "¿Cuáles son las mejores recomendaciones para organizar un partido de fútbol 5 o 7 a tiempo y sin roces?" },
      { label: "⚡ Tips para el Organizador", query: "Dame 3 consejos clave para que el partido de fútbol salga excelente." },
    ],
  },
  en: {
    encuentros: [
      { label: "📢 Soccer Match Invite", query: "Draft a WhatsApp invite for our next soccer match to complete 5v5 or 7v7 teams." },
      { label: "🌧️ Turf & Weather Check", query: "How to handle rain contingency for synthetic turf matches?" },
    ],
    cobros: [
      { label: "💳 Pitch Fee Reminder", query: "Draft a polite WhatsApp reminder to collect pitch rental fees." },
      { label: "💰 Cost Splitting", query: "How to split the pitch rental fairly among all players?" },
    ],
    partidos: [
      { label: "⚖️ Fair Play Rules", query: "Explain soccer match confirmation and Fair Play rules." },
      { label: "🏆 Match Recap", query: "Draft a soccer matchday recap for WhatsApp celebrating goals and sportsmanship." },
    ],
    ranking: [
      { label: "⚽ League Table Points", query: "Explain how football league points work (3 for win, 1 for draw)." },
      { label: "🥅 Team A vs B Balance", query: "How to balance two soccer teams for a fair and competitive match?" },
    ],
    admin: [
      { label: "📲 Club WhatsApp Invite", query: "Draft an official WhatsApp welcome invitation for new club members." },
      { label: "🛡️ Best Practices", query: "What are 3 best practices to keep members engaged every week?" },
    ],
    general: [
      { label: "⚽ Match Organizer Tips", query: "What are the best tips to run a friendly 5v5 match on time?" },
      { label: "⚡ Tips for Organizer", query: "Give me 3 practical tips for organizing today's soccer event." },
    ],
  },
  pt: {
    encuentros: [
      { label: "📢 Convocação Pelada", query: "Redija uma mensagem para o WhatsApp convocando para o futebol e completando os times de 5 ou 7." },
      { label: "🌧️ Quadra Sintética e Chuva", query: "Como coordenar em caso de chuva para a pelada na quadra sintética?" },
    ],
    cobros: [
      { label: "💳 Taxa da Quadra e Bola", query: "Redija um lembrete gentil para o WhatsApp cobrando a taxa do aluguel da quadra de futebol." },
      { label: "💰 Divisão entre Jogadores", query: "Como dividir o valor do aluguel da quadra entre os jogadores da pelada?" },
    ],
    partidos: [
      { label: "⚖️ Fair Play no Futebol", query: "Explique como funciona a confirmação de placar e Fair Play no futebol." },
      { label: "🏆 Resumo da Pelada", query: "Redija a crônica do futebol para o WhatsApp destacando os gols e o Fair Play." },
    ],
    ranking: [
      { label: "⚽ Pontos e Tabela da Liga", query: "Explique como são calculados os pontos na tabela de futebol (3 por vitória, 1 por empate)." },
      { label: "🥅 Equilíbrio Time A vs B", query: "Como dividir os times de futebol para que o jogo seja equilibrado e competitivo?" },
    ],
    admin: [
      { label: "📲 Convite WhatsApp para o Clube", query: "Redija o convite oficial de boas-vindas com o link e código do clube para novos sócios." },
      { label: "🛡️ Melhores Práticas", query: "Quais são as 3 melhores práticas para manter a comunidade ativa toda semana?" },
    ],
    general: [
      { label: "⚽ Dicas para a Pelada", query: "Quais são as melhores dicas para organizar um futebol de 5 ou 7 no horário e com harmonia?" },
      { label: "⚡ Dicas para o Organizador", query: "Dê 3 dicas para que o evento esportivo de hoje ocorra no horário e com harmonia." },
    ],
  },
};

export function ParrynFloatingWidget({ club }: { club?: any }) {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [createdEncuentro, setCreatedEncuentro] = useState<{
    id: number;
    title: string;
    dateTime: string;
    location: string;
    maxSpots?: number | null;
    courtsAvailable?: number | null;
    url: string;
  } | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // No mostrar en login / onboarding inicial si aún no hay club
  if (location === "/onboarding" || location === "/vincular") {
    return null;
  }

  const langKey = (language as "es" | "en" | "pt") || "es";
  const texts = WIDGET_TEXTS[langKey] || WIDGET_TEXTS.es;

  const isFutbolClub =
    club?.isFootball ||
    club?.sports?.some((s: any) => s.slug === "futbol" || s.name?.toLowerCase().includes("fútbol")) ||
    club?.name?.toLowerCase().includes("fútbol") ||
    club?.name?.toLowerCase().includes("futbol") ||
    (user as any)?.clubId === 3 ||
    (user as any)?.email?.includes("futbol");

  const widgetEmoji = isFutbolClub ? "⚽" : "🎾";

  // Detección contextual de la pantalla actual
  const getScreenCategory = (): keyof typeof texts.screenHints => {
    if (location.startsWith("/encuentros")) return "encuentros";
    if (location.startsWith("/cobros")) return "cobros";
    if (location.startsWith("/partidos")) return "partidos";
    if (location.startsWith("/ranking") || location.startsWith("/jugadores") || location.startsWith("/parejas")) return "ranking";
    if (location.startsWith("/admin")) return "admin";
    return "general";
  };

  const currentCategory = getScreenCategory();
  const activeHintsSource = isFutbolClub
    ? (FOOTBALL_HINTS[langKey] || FOOTBALL_HINTS.es)
    : texts.screenHints;
  const hints = activeHintsSource[currentCategory] || activeHintsSource.general;

  const handleAsk = async (textToAsk: string) => {
    if (!textToAsk.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setCurrentQuestion(textToAsk.trim());

    try {
      const res = await fetch("/api/parryn/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: textToAsk,
          clubContext: {
            screen: location,
            userRole: (user as any)?.isAdmin === 1 ? "Admin" : "Jugador",
            lang: language,
            clubId: (user as any)?.clubId,
          },
        }),
      });

      const data = await res.json();
      setResponse(data.answer || "He tomado nota de tu consulta.");
      setCreatedEncuentro(data.createdEncuentro || null);
      setWhatsappMessage(data.whatsappMessage || null);
    } catch {
      setResponse("Hubo una breve interrupción, pero aquí sigo a tu disposición para organizar los encuentros deportivos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* Botón Flotante Persistente en Cada Pantalla */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs md:text-sm shadow-xl shadow-emerald-950/30 border border-emerald-400/40 transition-all transform hover:scale-105 active:scale-95 group"
            title="Abrir Secretario Parryn IA"
          >
            <span className="text-base group-hover:rotate-12 transition-transform">{widgetEmoji}</span>
            <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span className="font-bold tracking-tight">{texts.floatingButton}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping ml-0.5" />
          </button>
        ) : null}

        {/* Modal / Ventana Emergente de Parryn */}
        {isOpen && (
          <div className="bg-card border border-emerald-500/30 rounded-2xl w-[92vw] max-w-[400px] shadow-2xl p-4 space-y-3.5 animate-in fade-in zoom-in-95 text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm">
                  {widgetEmoji}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground">Parryn</h3>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-medium">
                      IA
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {texts.role} ({texts.statusOnline})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Acciones Rápidas Contextuales según la pantalla */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {texts.contextActionsTitle}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {hints.map((hint, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(hint.query);
                      handleAsk(hint.query);
                    }}
                    className="text-xs bg-muted/60 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 border border-border/60 px-2.5 py-1 rounded-lg transition-all text-left"
                  >
                    {hint.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Consulta Actual */}
            {currentQuestion && (
              <div className="p-2 rounded-xl bg-muted/60 border border-border/50 text-[11px] text-foreground flex items-start gap-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Pregunta:</span>
                <span className="line-clamp-2 italic">{currentQuestion}</span>
              </div>
            )}

            {/* Área de Respuesta de Parryn */}
            {loading && (
              <div className="p-3 bg-muted/40 rounded-xl flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                <span>Parryn está redactando la respuesta...</span>
              </div>
            )}

            {response && !loading && (
              <div className="bg-muted/40 border border-emerald-500/20 rounded-xl p-3 space-y-2 text-xs text-foreground">
                <div className="max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed text-xs">
                  {response}
                </div>

                {createdEncuentro && (
                  <div className="p-2.5 rounded-lg bg-background border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        🎾 {createdEncuentro.title}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                        Creado en BBDD
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <Link
                        href={createdEncuentro.url}
                        onClick={() => setIsOpen(false)}
                        className="flex-1 py-1 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] text-center transition-colors"
                      >
                        Ver Encuentro
                      </Link>

                      {whatsappMessage && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
                            window.open(url, "_blank");
                          }}
                          className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] text-center transition-colors shadow-xs"
                        >
                          📲 WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/50 pt-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? texts.copied : texts.copyAction}
                  </button>
                  <span className="text-[10px] text-muted-foreground">Parryn Sport Hub IA</span>
                </div>
              </div>
            )}

            {/* Input de Consulta al Asistente */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(query);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isFutbolClub
                    ? langKey === "en"
                      ? "Ask Parryn (e.g. 'How to balance teams for 5v5?')..."
                      : langKey === "pt"
                      ? "Pergunte ao Parryn (ex: 'Como dividir os times para 5v5?')..."
                      : "Escribe a Parryn (ej: '¿Cómo armo los equipos para 5v5?')..."
                    : texts.inputPlaceholder
                }
                className="flex-1 bg-background border border-border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
              />
              <Button
                type="submit"
                disabled={!query.trim() || loading}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-2.5 rounded-xl shrink-0"
              >
                <Send size={13} />
              </Button>
            </form>

            {/* Link al Centro de Operaciones Completo */}
            <div className="text-center pt-1 border-t border-border/40">
              <Link
                href="/secretario"
                onClick={() => setIsOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-emerald-500 flex items-center justify-center gap-1 transition-colors"
              >
                <span>{texts.openFull}</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
