import React, { useState } from "react";
import { Bot, Sparkles, Send, Copy, Check, MessageSquare, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../context/LanguageContext";

interface ParrynAssistantProps {
  mode: "convocatoria" | "matchmaking" | "cierre" | "recordatorio-cobro" | "general";
  payload?: any;
  buttonLabel?: string;
  className?: string;
}

export function ParrynAssistant({ mode, payload = {}, buttonLabel, className = "" }: ParrynAssistantProps) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLabels = {
    convocatoria: language === "en" ? "🤖 Parryn: Draft WhatsApp Invite" : language === "pt" ? "🤖 Parryn: Redigir Convocação WhatsApp" : "🤖 Parryn: Redactar Convocatoria WhatsApp",
    matchmaking: language === "en" ? "🤖 Parryn: Analyze Match Balance" : language === "pt" ? "🤖 Parryn: Analisar Equilíbrio dos Jogos" : "🤖 Parryn: Analizar Equilibrio de Cruces",
    cierre: language === "en" ? "🤖 Parryn: Draft WhatsApp Matchday Recap" : language === "pt" ? "🤖 Parryn: Redigir Crônica WhatsApp" : "🤖 Parryn: Redactar Crónica Oficial WhatsApp",
    "recordatorio-cobro": language === "en" ? "🤖 Parryn: Friendly Payment Reminder" : language === "pt" ? "🤖 Parryn: Lembrete Amigável de Pagamento" : "🤖 Parryn: Recordatorio Amable de Cobro",
    general: language === "en" ? "🤖 Consult Secretary Parryn" : language === "pt" ? "🤖 Consultar o Secretário Parryn" : "🤖 Consultar al Secretario Parryn",
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const endpoints: Record<string, string> = {
      convocatoria: "/api/parryn/convocatoria",
      matchmaking: "/api/parryn/matchmaking",
      cierre: "/api/parryn/cierre",
      "recordatorio-cobro": "/api/parryn/recordatorio-cobro",
      general: "/api/parryn/asistente",
    };

    try {
      const res = await fetch(endpoints[mode], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...payload, lang: language }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al contactar a Parryn");
      }

      setResult(data.text || data.analysis || data.answer || "Respuesta generada con éxito.");
    } catch (err: any) {
      setError(err.message || "No se pudo generar la respuesta en este momento.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={className}>
      {!isOpen ? (
        <Button
          onClick={() => {
            setIsOpen(true);
            if (!result) handleGenerate();
          }}
          variant="outline"
          size="sm"
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium transition-all"
        >
          <Sparkles className="w-4 h-4 text-emerald-500" />
          {buttonLabel || defaultLabels[mode]}
        </Button>
      ) : (
        <div className="bg-card border border-emerald-500/30 rounded-xl p-4 shadow-lg space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-xs">
                🎾
              </div>
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  Parryn
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-normal">
                    {t("parryn.role")}
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  {language === "en"
                    ? "Your assistant to organize, remind and communicate"
                    : language === "pt"
                    ? "Seu assistente para organizar, lembrar e comunicar"
                    : "Tu asistente para organizar, recordar y comunicar"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Sparkles className="w-6 h-6 text-emerald-500 animate-spin" />
              <p className="text-xs font-medium">{t("parryn.analyzing")}</p>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Parryn</p>
                <p>{error}</p>
                <Button onClick={handleGenerate} variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                  {language === "en" ? "Retry" : language === "pt" ? "Tentar novamente" : "Reintentar"}
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg text-xs text-foreground whitespace-pre-line font-mono max-h-60 overflow-y-auto border border-border/40">
                {result}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  onClick={handleGenerate}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  {language === "en" ? "Regenerate" : language === "pt" ? "Regenerar" : "Regenerar"}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {t("copySuccess")}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        {language === "en" ? "Copy for WhatsApp" : language === "pt" ? "Copiar para WhatsApp" : "Copiar para WhatsApp"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
