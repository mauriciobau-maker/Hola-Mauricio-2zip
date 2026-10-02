import { useState, useEffect } from "react";
import { Bot, Sparkles, Send, Calendar, Users, CloudRain, Copy, Check, ShieldCheck, Trophy, PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@workspace/replit-auth-web";
import { useLanguage } from "../context/LanguageContext";

export function SecretarioParryn() {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"chat" | "canchas" | "clima" | "matchmaking">("chat");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "parryn"; text: string }>>([
    {
      sender: "parryn",
      text: "¡Hola! Soy Parryn, tu Secretario Deportivo. ¿En qué te puedo ayudar hoy? Puedo asistirte en la distribución de turnos, convocatorias urgentes para WhatsApp, canchas techadas ante riesgo de clima o emparejamientos equilibrados.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
        },
      ]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          sender: "parryn",
          text: "Hubo una breve interrupción de conexión, pero aquí estoy. Te sugiero priorizar canchas techadas y confirmar la asistencia de tus jugadores por WhatsApp.",
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
      setSchedulingPlan("Plan de Parryn: Asignar partidos oficiales a pistas techadas con rotación en bloques de 75 min.");
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
              Secretario Deportivo Oficial
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Parryn</h1>
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
              "No juega mejor. No gana partidos. Hace que todos puedan jugar."
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-emerald-200">
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ Siempre disponible</span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ Recuerda todo</span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ Organiza todo</span>
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md">✓ Respeta el Fair Play</span>
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
          Asistente Conversacional
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
          Turnos & Canchas
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
          Alertas Climáticas (Techadas vs Abiertas)
        </button>
      </div>

      {/* Tab 1: Chat Activo */}
      {activeTab === "chat" && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-500" />
              Conversación Directa con Parryn
            </CardTitle>
            <CardDescription>
              Pregúntale sobre cualquier aspecto organizativo de tu club: convocatorias, desempates, cobros o turnos.
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
                  </div>
                  {msg.sender === "parryn" && (
                    <button
                      onClick={() => handleCopyText(msg.text, idx)}
                      className="text-[11px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 px-1"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar texto
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span>Parryn está analizando tu consulta...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe tu consulta a Parryn (ej: '¿Cómo armo un torneo americano de 8 jugadores?')"
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !query.trim()} className="gap-1.5">
                <Send className="w-4 h-4" />
                Enviar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Turnos & Canchas */}
      {activeTab === "canchas" && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Distribución Inteligente de Pistas
            </CardTitle>
            <CardDescription>
              Configura la infraestructura de tu club para que Parryn distribuya los horarios sin colisiones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Pistas Techadas / Indoor</label>
                <Input
                  type="number"
                  value={coveredCourts}
                  onChange={(e) => setCoveredCourts(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Pistas Abiertas / Outdoor</label>
                <Input
                  type="number"
                  value={openCourts}
                  onChange={(e) => setOpenCourts(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Pronóstico Actual</label>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="good">☀️ Despejado / Óptimo</option>
                  <option value="rain_risk">🌧️ Riesgo de Lluvia / Viento</option>
                </select>
              </div>
            </div>

            <Button onClick={handlePlanScheduling} disabled={loading} className="gap-2">
              <Sparkles className="w-4 h-4" />
              {loading ? "Calculando plan óptimo..." : "Generar Plan con Parryn"}
            </Button>

            {schedulingPlan && (
              <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-sm whitespace-pre-line font-mono">
                <div className="font-sans font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Estrategia Sugerida por Parryn:
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
              Protección de Jornada (Techadas vs Abiertas)
            </CardTitle>
            <CardDescription>
              Protocolos de contingencia automáticos para no suspender partidos por lluvia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5">
                🛡️ Regla de Oro de Parryn para Días de Clima Incierto
              </h4>
              <p>
                1. <strong>Priorización de Pistas:</strong> Los encuentros con marcador oficial o puntos de ranking Elo se programan primero en las canchas techadas.
              </p>
              <p>
                2. <strong>Turnos escalonados:</strong> En caso de lluvia que inhabilite las canchas exteriores, los turnos pasan a formato de 60 minutos con desempate rápido para que ningún jugador se quede sin jugar.
              </p>
              <p>
                3. <strong>Aviso oportuno por WhatsApp:</strong> Parryn puede redactar el comunicado con 2 horas de anticipación para evitar traslados innecesarios.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
