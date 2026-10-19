import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Bot, 
  Sparkles, 
  Send, 
  Calendar, 
  Users, 
  CloudRain, 
  Copy, 
  Check, 
  ShieldCheck, 
  Trophy, 
  PhoneCall, 
  ExternalLink,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  Sun,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "../context/LanguageContext";

interface ChatMessage {
  sender: "user" | "parryn";
  text: string;
  createdEncuentro?: {
    id: number;
    title: string;
    dateTime: string;
    location: string;
    maxSpots?: number | null;
    courtsAvailable?: number | null;
    url: string;
  };
  whatsappMessage?: string;
}

export function SecretarioParryn() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"chat" | "canchas" | "clima">("chat");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState<Array<ChatMessage>>([
    {
      sender: "parryn",
      text: t("parryn.initialGreeting"),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Actualizar saludo de Parryn si cambia el idioma y no hay historial de usuario
  useEffect(() => {
    setChatLog((prev) => {
      if (prev.length === 1 && prev[0].sender === "parryn") {
        return [{ sender: "parryn", text: t("parryn.initialGreeting") }];
      }
      return prev;
    });
  }, [language, t]);

  // Estados de simulación y clima real
  const [club, setClub] = useState<any>(null);
  const [clubName, setClubName] = useState("Club Pádel Central");
  const [coveredCourts, setCoveredCourts] = useState("2");
  const [openCourts, setOpenCourts] = useState("2");
  const [weatherCondition, setWeatherCondition] = useState("good");
  const [schedulingPlan, setSchedulingPlan] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const loadLiveWeather = async (clubId?: number) => {
    try {
      setLoadingWeather(true);
      const res = await fetch(`/api/weather?clubId=${clubId || 1}`);
      if (res.ok) {
        const data = await res.json();
        setWeatherData(data);
        if (data.sportSuitability?.coveredCourtsRecommended) {
          setWeatherCondition("rain_risk");
        } else {
          setWeatherCondition("good");
        }
      }
    } catch (e) {
      console.error("Error al cargar clima en vivo:", e);
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetch("/api/clubs/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setClub(data);
          if (data.name) setClubName(data.name);
          loadLiveWeather(data.id);
        } else {
          loadLiveWeather(1);
        }
      })
      .catch(() => {
        loadLiveWeather(1);
      });
  }, []);

  const isFutbolClub =
    club?.isFootball ||
    club?.sports?.some((s: any) => s.slug === "futbol" || s.name?.toLowerCase().includes("fútbol")) ||
    club?.name?.toLowerCase().includes("fútbol") ||
    club?.name?.toLowerCase().includes("futbol") ||
    (user as any)?.clubId === 3 ||
    (user as any)?.email?.includes("futbol");

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query.trim();
    setQuery("");
    setChatLog((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/parryn/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: userText,
          clubContext: {
            clubName,
            userRole: (user as any)?.isAdmin === 1 ? "SuperAdmin" : "ClubAdmin",
            lang: language,
            clubId: club?.id || (user as any)?.clubId,
            isFootball: isFutbolClub,
          },
        }),
      });

      const data = await res.json();
      setChatLog((prev) => [
        ...prev,
        {
          sender: "parryn",
          text: data.answer || "He tomado nota. Cuéntame si necesitas redactar un mensaje o ajustar los horarios.",
          createdEncuentro: data.createdEncuentro,
          whatsappMessage: data.whatsappMessage,
        },
      ]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          sender: "parryn",
          text: language === "en"
            ? "There was a brief connection hiccup, but I'm here! I suggest checking match attendance and team lineups on WhatsApp."
            : language === "pt"
            ? "Houve uma breve oscilação de conexão, mas estou aqui! Sugiro confirmar os times e a presença dos atletas no WhatsApp."
            : isFutbolClub
            ? "Hubo una breve interrupción de conexión, pero aquí estoy. Te sugiero confirmar los equipos y la asistencia de los jugadores para la pichanga por WhatsApp."
            : "Hubo una breve interrupción de conexión, pero aquí estoy. Te sugiero priorizar canchas techadas y confirmar la asistencia de tus jugadores por WhatsApp.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanScheduling = async () => {
    setLoading(true);
    try {
      const promptQuery = isFutbolClub
        ? `Diseña un plan de contingencia y distribución de turnos para partidos de fútbol 5 o 7. Disponemos de ${coveredCourts} canchas techadas y ${openCourts} al aire libre. Condición climática prevista: ${
            weatherCondition === "rain_risk" ? "Riesgo de lluvia / viento" : "Clima despejado"
          }.`
        : `Diseña un plan de contingencia y distribución de turnos. Disponemos de ${coveredCourts} canchas techadas y ${openCourts} descubiertas. Condición climática prevista: ${
            weatherCondition === "rain_risk" ? "Riesgo de lluvia / viento" : "Clima despejado"
          }.`;

      const res = await fetch("/api/parryn/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: promptQuery,
          clubContext: { clubName, lang: language, clubId: club?.id || (user as any)?.clubId, isFootball: isFutbolClub },
        }),
      });
      const data = await res.json();
      setSchedulingPlan(data.answer);
    } catch {
      setSchedulingPlan(
        language === "en"
          ? isFutbolClub
            ? "Parryn's Plan: Assign official soccer matches to covered turf with 60-minute match slots and 15-min warmups."
            : "Parryn's Plan: Assign official ranking matches to indoor courts with 75-minute rotation blocks."
          : language === "pt"
          ? isFutbolClub
            ? "Plano do Parryn: Alocar partidas oficiais de futebol em quadras cobertas com blocos de 60 min."
            : "Plano do Parryn: Alocar partidas oficiais em quadras cobertas com blocos de rotação de 75 min."
          : isFutbolClub
          ? "Plan de Parryn: Asignar partidos oficiales de fútbol a canchas techadas con bloques de 60 min y 15 min de descanso entre turnos."
          : "Plan de Parryn: Asignar partidos oficiales a pistas techadas con rotación en bloques de 75 min."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              {t("parryn.role")}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Parryn</h1>
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
              {t("parryn.motto")}
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-emerald-200">
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ {t("parryn.badgeAlwaysAvailable")}</span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ {t("parryn.badgeRemembersAll")}</span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ {t("parryn.badgeOrganizesAll")}</span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ {t("parryn.badgeFairPlay")}</span>
            </div>
          </div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center text-4xl shadow-inner shrink-0">
            {isFutbolClub ? "🤖⚽" : "🤖🎾"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "chat"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Bot className="w-4 h-4" />
          {t("parryn.conversationalAssistant")}
        </button>
        <button
          onClick={() => setActiveTab("canchas")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "canchas"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Calendar className="w-4 h-4" />
          {t("parryn.courtScheduling")}
        </button>
        <button
          onClick={() => setActiveTab("clima")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === "clima"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <CloudRain className="w-4 h-4" />
          {t("parryn.weatherAlerts")}
        </button>
      </div>

      {/* Tab 1: Chat Activo */}
      {activeTab === "chat" && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-500" />
              {t("parryn.directChat")}
            </CardTitle>
            <CardDescription>
              {t("parryn.chatDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-3 min-h-[280px] max-h-[420px] overflow-y-auto p-3 bg-muted/20 rounded-xl border border-border/30">
              {chatLog.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/70 text-card-foreground shadow-sm whitespace-pre-line"
                    }`}
                  >
                    {msg.sender === "parryn" && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                        <span>🤖 Parryn</span>
                      </div>
                    )}
                    {msg.text}

                    {msg.createdEncuentro && (
                      <div className="mt-3 p-3.5 rounded-xl bg-background/90 border border-emerald-500/40 shadow-sm space-y-2.5 not-prose">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                              {isFutbolClub ? "⚽" : "🎾"}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-foreground">
                                {msg.createdEncuentro.title}
                              </h4>
                              <span className="text-[11px] text-muted-foreground">
                                📍 {msg.createdEncuentro.location} • 👥 {msg.createdEncuentro.maxSpots} cupos ({msg.createdEncuentro.courtsAvailable} {isFutbolClub ? "cancha sintética" : "canchas"})
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                            ✓ Guardado en BBDD
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(msg.createdEncuentro!.url)}
                            className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                          >
                            <Trophy size={13} />
                            Ver Encuentro
                          </Button>

                          {msg.whatsappMessage && (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(msg.whatsappMessage!)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 shadow-sm px-3 py-1.5 rounded-md transition-colors"
                            >
                              <PhoneCall size={13} />
                              Enviar a WhatsApp
                            </a>
                          )}

                          {msg.whatsappMessage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.whatsappMessage!);
                                setCopiedIndex(idx);
                                setTimeout(() => setCopiedIndex(null), 2500);
                              }}
                              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                              {copiedIndex === idx ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              {copiedIndex === idx ? "¡Copiado!" : "Copiar Texto"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.sender === "parryn" && (
                    <button
                      onClick={() => handleCopyText(msg.text, idx)}
                      className="text-[11px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 px-1"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" /> {t("parryn.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> {t("parryn.copyText")}
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span>{t("parryn.analyzing")}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isFutbolClub
                    ? "Escribe a Parryn (ej: 'Convoca para fútbol 7 este viernes con 14 cupos')..."
                    : t("parryn.chatPlaceholder")
                }
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !query.trim()} className="gap-1.5">
                <Send className="w-4 h-4" />
                {t("parryn.send")}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[11px] text-muted-foreground font-semibold">
                {isFutbolClub ? "Ejemplos rápidos (Fútbol):" : "Ejemplos rápidos:"}
              </span>
              {isFutbolClub ? (
                <>
                  <button
                    type="button"
                    onClick={() => setQuery("Hazme una convocatoria para este viernes a las 20:00 para 14 jugadores en cancha sintética")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all text-[11px] text-left cursor-pointer"
                  >
                    ⚽ "Hazme una convocatoria para este viernes a las 20:00 para 14 jugadores en cancha sintética"
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuery("Arma los dos equipos parejos (Equipo A y B) para la pichanga de fútbol 5")}
                    className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all text-[11px] text-left cursor-pointer"
                  >
                    🥅 "Arma los dos equipos parejos (Equipo A y B) para la pichanga de fútbol 5"
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setQuery("Hazme una convocatoria para mañana a las 19:00 horas para 12 jugadores en tres canchas en el club starpadel")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all text-[11px] text-left cursor-pointer"
                  >
                    🎾 "Hazme una convocatoria para mañana a las 19:00 horas para 12 jugadores en tres canchas en el club starpadel"
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuery("Arma un torneo americano este viernes a las 20:00 para 8 jugadores en 2 canchas")}
                    className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all text-[11px] text-left cursor-pointer"
                  >
                    ⚡ "Arma un torneo americano este viernes a las 20:00 para 8 jugadores en 2 canchas"
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Turnos & Canchas */}
      {activeTab === "canchas" && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              {t("parryn.courtTitle")}
            </CardTitle>
            <CardDescription>
              {isFutbolClub
                ? "Optimiza la distribución de canchas de fútbol, horarios de pichangas y contingencia climática."
                : t("parryn.courtDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  {isFutbolClub ? "Canchas Techadas / Sintéticas" : t("parryn.coveredCourts")}
                </label>
                <Input
                  type="number"
                  value={coveredCourts}
                  onChange={(e) => setCoveredCourts(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  {isFutbolClub ? "Canchas al Aire Libre" : t("parryn.openCourts")}
                </label>
                <Input
                  type="number"
                  value={openCourts}
                  onChange={(e) => setOpenCourts(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t("parryn.currentWeather")}</label>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="good">{t("parryn.weatherGood")}</option>
                  <option value="rain_risk">{t("parryn.weatherRain")}</option>
                </select>
              </div>
            </div>

            {weatherData && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{weatherData.icon}</span>
                  <div>
                    <span className="font-semibold text-foreground">
                      Clima detectado en {weatherData.city}: {weatherData.temperature}°C, {weatherData.condition}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      (Prob. lluvia máx: {weatherData.maxRainNextHours}%, Viento: {weatherData.windSpeed} km/h)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("clima")}
                  className="text-primary hover:underline font-semibold text-[11px] cursor-pointer"
                >
                  Ver pronóstico completo →
                </button>
              </div>
            )}

            <Button onClick={handlePlanScheduling} disabled={loading} className="gap-2">
              <Sparkles className="w-4 h-4" />
              {loading ? t("parryn.calculatingPlan") : t("parryn.generatePlan")}
            </Button>

            {schedulingPlan && (
              <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-sm whitespace-pre-line font-mono">
                <div className="font-sans font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {t("parryn.strategySuggested")}
                </div>
                {schedulingPlan}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Alertas Climáticas en Vivo */}
      {activeTab === "clima" && (
        <Card className="border shadow-sm space-y-4">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-blue-500" />
                  Pronóstico Meteorológico y Alertas Deportivas
                </CardTitle>
                <CardDescription>
                  {weatherData
                    ? `Monitoreo meteorológico en tiempo real para ${weatherData.city}, ${weatherData.country}`
                    : t("parryn.weatherDesc")}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => loadLiveWeather(club?.id)}
                disabled={loadingWeather}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer w-fit"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingWeather && "animate-spin text-primary")} />
                {loadingWeather ? "Actualizando..." : "Actualizar Clima"}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {weatherData ? (
              <>
                {/* 1. Tarjeta Principal de Clima Actual */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent border border-blue-500/20 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {weatherData.city}
                        </span>
                        <div className="text-4xl font-black text-foreground mt-1 flex items-baseline gap-1">
                          {weatherData.temperature}°C
                          <span className="text-xs font-medium text-muted-foreground">
                            / Sens. {weatherData.apparentTemperature}°C
                          </span>
                        </div>
                      </div>
                      <span className="text-4xl">{weatherData.icon}</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-blue-500/15 flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>{weatherData.condition}</span>
                      <span>{weatherData.country}</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                        <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                        <span>Prob. Lluvia</span>
                      </div>
                      <div className="text-xl font-bold text-foreground mt-2">
                        {weatherData.maxRainNextHours}%
                      </div>
                      <span className="text-[10px] text-muted-foreground">próximas horas</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                        <Wind className="w-3.5 h-3.5 text-teal-500" />
                        <span>Viento</span>
                      </div>
                      <div className="text-xl font-bold text-foreground mt-2">
                        {weatherData.windSpeed} <span className="text-xs font-normal">km/h</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {weatherData.windSpeed > 25 ? "Viento moderado" : "Viento calmo"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                        <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Humedad</span>
                      </div>
                      <div className="text-xl font-bold text-foreground mt-2">
                        {weatherData.humidity}%
                      </div>
                      <span className="text-[10px] text-muted-foreground">relativa</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                        <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                        <span>Precipitación</span>
                      </div>
                      <div className="text-xl font-bold text-foreground mt-2">
                        {weatherData.precipitationMm} <span className="text-xs font-normal">mm</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">acumulada hoy</span>
                    </div>
                  </div>
                </div>

                {/* 2. Semáforo Deportivo de Parryn */}
                <div
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border transition-all",
                    weatherData.sportSuitability.status === "danger"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                      : weatherData.sportSuitability.status === "warning"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {weatherData.sportSuitability.status === "danger" ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      ) : weatherData.sportSuitability.status === "warning" ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider">
                          Semáforo Deportivo Parryn:
                        </span>
                        <h4 className="text-base font-extrabold">
                          {weatherData.sportSuitability.badge}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("chat");
                        setQuery(
                          `Redacta un aviso de WhatsApp para los socios sobre las condiciones climáticas de hoy (${weatherData.condition}, ${weatherData.temperature}°C, prob. lluvia ${weatherData.maxRainNextHours}%) informando la asignación de canchas.`
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-background/80 hover:bg-background border border-current text-xs font-bold transition-all shadow-xs cursor-pointer w-fit"
                    >
                      💬 Redactar Aviso WhatsApp con Parryn
                    </button>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm leading-relaxed opacity-90 font-medium">
                    {weatherData.sportSuitability.recommendation}
                  </p>
                </div>

                {/* 3. Pronóstico por Horas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Evolución Próximas Horas
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 overflow-x-auto pb-1">
                    {weatherData.hourly.map((h: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center flex flex-col items-center gap-1 min-w-[70px]"
                      >
                        <span className="text-[11px] font-semibold text-muted-foreground">{h.hour}</span>
                        <span className="text-xl my-0.5">{h.icon}</span>
                        <span className="text-xs font-bold text-foreground">{h.temp}°C</span>
                        <div className="w-full bg-border rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              h.rainProb > 50 ? "bg-blue-500" : h.rainProb > 20 ? "bg-amber-400" : "bg-emerald-400"
                            )}
                            style={{ width: `${Math.min(100, Math.max(10, h.rainProb))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{h.rainProb}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Pronóstico para los próximos 3 días */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pronóstico Próximos 3 Días
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {weatherData.daily.map((d: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{d.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-foreground">{d.dayName}</div>
                            <div className="text-[11px] text-muted-foreground">{d.condition}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-foreground">
                            {d.maxTemp}° / <span className="text-muted-foreground font-normal">{d.minTemp}°</span>
                          </div>
                          <div className="text-[10px] text-blue-500 font-medium">
                            🌧️ {d.rainProb}% prob.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
                Obteniendo pronóstico meteorológico en tiempo real...
              </div>
            )}

            {/* Reglas de Oro Comunitarias */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
              <h4 className="font-bold flex items-center gap-1.5 text-xs">
                {t("parryn.goldenRuleTitle")}
              </h4>
              <p>• {t("parryn.rule1")}</p>
              <p>• {t("parryn.rule2")}</p>
              <p>• {t("parryn.rule3")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
