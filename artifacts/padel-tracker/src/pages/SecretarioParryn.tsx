import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bot, Sparkles, Send, Calendar, Users, CloudRain, Copy, Check, ShieldCheck, Trophy, PhoneCall, ExternalLink } from "lucide-react";
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

  // Estados de simulación operativa
  const [clubName, setClubName] = useState("Club Pádel Central");
  const [coveredCourts, setCoveredCourts] = useState("2");
  const [openCourts, setOpenCourts] = useState("2");
  const [weatherCondition, setWeatherCondition] = useState("rain_risk");
  const [schedulingPlan, setSchedulingPlan] = useState<string | null>(null);

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
            ? "There was a brief connection hiccup, but I'm here! I suggest prioritizing indoor courts and checking attendance on WhatsApp."
            : language === "pt"
            ? "Houve uma breve oscilação de conexão, mas estou aqui! Sugiro priorizar quadras cobertas e confirmar a presença no WhatsApp."
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
      const res = await fetch("/api/parryn/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: `Diseña un plan de contingencia y distribución de turnos. Disponemos de ${coveredCourts} canchas techadas y ${openCourts} descubiertas. Condición climática prevista: ${
            weatherCondition === "rain_risk" ? "Riesgo de lluvia / viento" : "Clima despejado"
          }.`,
          clubContext: { clubName, lang: language },
        }),
      });
      const data = await res.json();
      setSchedulingPlan(data.answer);
    } catch {
      setSchedulingPlan(
        language === "en"
          ? "Parryn's Plan: Assign official ranking matches to indoor courts with 75-minute rotation blocks."
          : language === "pt"
          ? "Plano do Parryn: Alocar partidas oficiais em quadras cobertas com blocos de rotação de 75 min."
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
            🤖🎾
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
                              🎾
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-foreground">
                                {msg.createdEncuentro.title}
                              </h4>
                              <span className="text-[11px] text-muted-foreground">
                                📍 {msg.createdEncuentro.location} • 👥 {msg.createdEncuentro.maxSpots} cupos ({msg.createdEncuentro.courtsAvailable} canchas)
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
                placeholder={t("parryn.chatPlaceholder")}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !query.trim()} className="gap-1.5">
                <Send className="w-4 h-4" />
                {t("parryn.send")}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[11px] text-muted-foreground font-semibold">Ejemplos rápidos:</span>
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
              {t("parryn.courtDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t("parryn.coveredCourts")}</label>
                <Input
                  type="number"
                  value={coveredCourts}
                  onChange={(e) => setCoveredCourts(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t("parryn.openCourts")}</label>
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

      {/* Tab 3: Alertas Climáticas */}
      {activeTab === "clima" && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-blue-500" />
              {t("parryn.weatherTitle")}
            </CardTitle>
            <CardDescription>
              {t("parryn.weatherDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5">
                {t("parryn.goldenRuleTitle")}
              </h4>
              <p>
                {t("parryn.rule1")}
              </p>
              <p>
                {t("parryn.rule2")}
              </p>
              <p>
                {t("parryn.rule3")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
