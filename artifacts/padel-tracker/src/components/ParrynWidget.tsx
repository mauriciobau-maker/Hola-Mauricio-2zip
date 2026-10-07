import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  Send,
  Calendar,
  DollarSign,
  Trophy,
  Users,
  MessageCircle,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function triggerParryn(prompt?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-parryn", { detail: { prompt } }));
  }
}

interface ChatMessage {
  id: string;
  sender: "user" | "parryn";
  text: string;
  timestamp: Date;
  encuentroCreated?: {
    id: number;
    title: string;
    dateTime: string;
    location: string;
    maxSpots: number;
  };
}

export default function ParrynWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  // Textos según idioma
  const t = {
    es: {
      name: "Parryn",
      title: "Secretario del Club",
      subtitle: "La IA que organiza todo y no se enoja",
      welcome: "¡Hola! Soy Parryn, el secretario del club. 🎾 Recuerda todo, organiza todo y nunca se enoja. ¿Quieres que creemos un nuevo encuentro, revisemos asistencias o armemos un comunicado para WhatsApp?",
      placeholder: "Pídele a Parryn (ej. 'Crea un encuentro el viernes a las 19:00 con 8 cupos')...",
      quickCreate: "⚡ Crear encuentro para este viernes",
      quickCreateTorneo: "🏆 Crear torneo americano (8 cupos)",
      quickWho: "📋 ¿Quién falta confirmar?",
      quickMoney: "💰 ¿Cómo van los cobros?",
      quickRank: "🏆 ¿Quién lidera el ranking?",
      quickWhatsapp: "✍️ Redactar convocatoria WhatsApp",
      quickSummary: "📝 Resumen oficial de la jornada",
      typing: "Parryn está procesando...",
      copy: "Copiar mensaje",
      copied: "¡Copiado!",
      send: "Enviar",
      openTooltip: "Hablar con Parryn (Secretario IA)",
      badgeOnline: "En línea",
    },
    en: {
      name: "Parryn",
      title: "Club Secretary",
      subtitle: "The AI that organizes everything and never complains",
      welcome: "Hi! I'm Parryn, your sports club secretary. 🎾 I remember everything, organize matches, and keep everyone playing. Want me to create a new match event, check RSVP rosters, or draft a WhatsApp message?",
      placeholder: "Ask Parryn (e.g. 'Create an event this Friday at 7 PM with 8 spots')...",
      quickCreate: "⚡ Create match event for this Friday",
      quickCreateTorneo: "🏆 Create americana tournament (8 spots)",
      quickWho: "📋 Who is missing to confirm?",
      quickMoney: "💰 How are payments going?",
      quickRank: "🏆 Who leads the ELO ranking?",
      quickWhatsapp: "✍️ Draft WhatsApp invitation",
      quickSummary: "📝 Official matchday summary",
      typing: "Parryn is processing...",
      copy: "Copy text",
      copied: "Copied!",
      send: "Send",
      openTooltip: "Talk with Parryn (AI Secretary)",
      badgeOnline: "Online",
    },
    pt: {
      name: "Parryn",
      title: "Secretário do Clube",
      subtitle: "A IA que organiza tudo e nunca se irrita",
      welcome: "Olá! Sou o Parryn, o secretário do clube. 🎾 Lembro de tudo, organizo tudo e ajudo todos a jogarem. Quer que eu crie um novo encontro, confira presenças ou redija uma mensagem para WhatsApp?",
      placeholder: "Peça ao Parryn (ex: 'Crie um encontro na sexta às 19:00 com 8 vagas')...",
      quickCreate: "⚡ Criar encontro para esta sexta",
      quickCreateTorneo: "🏆 Criar torneio americano (8 vagas)",
      quickWho: "📋 Quem falta confirmar?",
      quickMoney: "💰 Como estão as cobranças?",
      quickRank: "🏆 Quem lidera o ranking ELO?",
      quickWhatsapp: "✍️ Redigir convocação WhatsApp",
      quickSummary: "📝 Resumo oficial da rodada",
      typing: "Parryn está processando...",
      copy: "Copiar texto",
      copied: "Copiado!",
      send: "Enviar",
      openTooltip: "Falar com Parryn (Secretário IA)",
      badgeOnline: "Online",
    },
  }[language] || {
    name: "Parryn",
    title: "Secretario del Club",
    subtitle: "La IA que organiza todo",
    welcome: "¡Hola! Soy Parryn, el secretario del club. 🎾 ¿En qué te ayudo hoy?",
    placeholder: "Pregúntale a Parryn...",
    quickCreate: "⚡ Crear encuentro para este viernes",
    quickCreateTorneo: "🏆 Crear torneo americano (8 cupos)",
    quickWho: "📋 ¿Quién falta confirmar?",
    quickMoney: "💰 ¿Cómo van los cobros?",
    quickRank: "🏆 ¿Quién lidera el ranking?",
    quickWhatsapp: "✍️ Redactar convocatoria WhatsApp",
    quickSummary: "📝 Resumen oficial de la jornada",
    typing: "Parryn está procesando...",
    copy: "Copiar mensaje",
    copied: "¡Copiado!",
    send: "Enviar",
    openTooltip: "Hablar con Parryn (Secretario IA)",
    badgeOnline: "En línea",
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "parryn",
          text: t.welcome,
          timestamp: new Date(),
        },
      ]);
    }
  }, [language, messages.length, t.welcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text,
      }));

      const res = await fetch("/api/parryn/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        "¡Aquí estoy! Cuéntame qué necesitas organizar y lo dejamos listo de inmediato. 🎾";

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "parryn",
          text: replyText,
          timestamp: new Date(),
          encuentroCreated: data.encuentroCreated || undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "parryn",
          text: "¡Aquí estoy! Todo el registro del club está al día. Puedes pedirme crear un nuevo encuentro diciendo: 'Parryn, crea un encuentro este viernes a las 19:00 con 8 cupos'. 🎾",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Escuchar eventos globales para abrir Parryn desde cualquier botón o pantalla
  useEffect(() => {
    const handleOpenParryn = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        handleSendMessage(customEvent.detail.prompt);
      }
    };
    window.addEventListener("open-parryn", handleOpenParryn);
    return () => window.removeEventListener("open-parryn", handleOpenParryn);
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Botón Flotante Permanente */}
      <div className="fixed bottom-20 xl:bottom-6 right-5 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            title={t.openTooltip}
            className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 group border border-emerald-400/40 cursor-pointer"
          >
            <div className="relative">
              <span className="w-8 h-8 rounded-full bg-white text-emerald-700 flex items-center justify-center font-black text-sm shadow-inner">
                P
              </span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-emerald-700 rounded-full animate-pulse" />
            </div>
            <div className="text-left flex flex-col">
              <p className="text-xs font-black uppercase tracking-wider leading-none text-emerald-100 flex items-center gap-1">
                {t.name} <Sparkles size={11} className="text-yellow-300" />
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-emerald-200/90 leading-tight">
                {t.title}
              </p>
            </div>
          </button>
        ) : null}
      </div>

      {/* Ventana de Diálogo de Parryn */}
      {isOpen && (
        <div className="fixed bottom-20 xl:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[460px] h-[590px] max-h-[85vh] bg-card/95 backdrop-blur-xl border border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header de la ventana */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-zinc-900 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white text-emerald-800 font-extrabold flex items-center justify-center text-lg shadow-inner">
                  P
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-zinc-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-base tracking-tight leading-none text-white">
                    {t.name}
                  </h3>
                  <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-bold border border-yellow-400/30">
                    IA
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                    {t.badgeOnline}
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  {t.title} — {t.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Minimizar"
            >
              <ChevronDown size={22} />
            </button>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "parryn" && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    P
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 space-y-2 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-br-none shadow-sm"
                      : "bg-muted/80 border border-border text-foreground rounded-bl-none shadow-sm whitespace-pre-wrap"
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Tarjeta interactiva si Parryn ha creado un encuentro */}
                  {msg.encuentroCreated && (
                    <div className="mt-2.5 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-foreground">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          🎾 {msg.encuentroCreated.title}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px]">
                          {msg.encuentroCreated.maxSpots} cupos
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        <p>📍 {msg.encuentroCreated.location}</p>
                        <p>
                          📅{" "}
                          {new Date(msg.encuentroCreated.dateTime).toLocaleString(
                            "es-ES",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <div className="pt-1">
                        <a
                          href={`/encuentros/${msg.encuentroCreated.id}`}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                        >
                          <span>Ver Encuentro & Confirmar</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Botón copiar para comunicados o mensajes generados por Parryn */}
                  {msg.sender === "parryn" && msg.text.length > 50 && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="text-[11px] flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors bg-background/70 px-2.5 py-1 rounded-md border border-border cursor-pointer"
                        title={t.copy}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">
                              {t.copied}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>{t.copy}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse pl-9 py-2">
                <Sparkles size={14} className="text-emerald-400 animate-spin" />
                <span>{t.typing}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips de Preguntas Rápidas */}
          <div className="px-3 py-2 border-t border-border/50 bg-muted/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendMessage(t.quickCreate)}
              className="text-[11px] whitespace-nowrap bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full transition-colors font-bold flex-shrink-0 cursor-pointer"
            >
              {t.quickCreate}
            </button>
            <button
              onClick={() => handleSendMessage(t.quickCreateTorneo)}
              className="text-[11px] whitespace-nowrap bg-background hover:bg-muted text-foreground border border-border px-2.5 py-1 rounded-full transition-colors font-medium flex-shrink-0 cursor-pointer"
            >
              {t.quickCreateTorneo}
            </button>
            <button
              onClick={() => handleSendMessage(t.quickWho)}
              className="text-[11px] whitespace-nowrap bg-background hover:bg-muted text-foreground border border-border px-2.5 py-1 rounded-full transition-colors font-medium flex-shrink-0 cursor-pointer"
            >
              {t.quickWho}
            </button>
            <button
              onClick={() => handleSendMessage(t.quickWhatsapp)}
              className="text-[11px] whitespace-nowrap bg-background hover:bg-muted text-foreground border border-border px-2.5 py-1 rounded-full transition-colors font-medium flex-shrink-0 cursor-pointer"
            >
              {t.quickWhatsapp}
            </button>
            <button
              onClick={() => handleSendMessage(t.quickMoney)}
              className="text-[11px] whitespace-nowrap bg-background hover:bg-muted text-foreground border border-border px-2.5 py-1 rounded-full transition-colors font-medium flex-shrink-0 cursor-pointer"
            >
              {t.quickMoney}
            </button>
          </div>

          {/* Formulario de Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-card border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 bg-muted/60 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-muted-foreground/70"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
