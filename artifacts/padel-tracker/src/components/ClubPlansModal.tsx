import { useState } from "react";
import { Check, X, Shield, Sparkles, Zap, Building2, Users, Trophy, DollarSign, Bot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLUB_PLANS, getPlanConfig, type ClubPlan } from "@/lib/plans";
import { useLanguage } from "@/context/LanguageContext";

interface ClubPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: {
    id: number;
    name: string;
    plan: string;
    playerCount?: number;
    sportCount?: number;
  };
  isSuperAdmin: boolean;
  onPlanChange?: (newPlan: "basic" | "pro" | "elite") => Promise<void>;
}

export function ClubPlansModal({
  isOpen,
  onClose,
  club,
  isSuperAdmin,
  onPlanChange,
}: ClubPlansModalProps) {
  const { t, language } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | "elite">(
    (club.plan as any) || "basic"
  );
  const [isSaving, setIsSaving] = useState(false);

  const currentPlanConfig = getPlanConfig(club.plan);

  const handleApplyPlan = async (planKey: "basic" | "pro" | "elite") => {
    if (!onPlanChange) return;
    setIsSaving(true);
    try {
      await onPlanChange(planKey);
      setSelectedPlan(planKey);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const planKeys: ("basic" | "pro" | "elite")[] = ["basic", "pro", "elite"];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 bg-card border border-border">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Zap size={20} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span>{language === "en" ? "Plans & Limits Engine" : language === "pt" ? "Motor de Planos e Limites" : "Motor de Planes y Límites"}</span>
                  <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
                    Parryn Hub
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {language === "en"
                    ? `Managing subscriptions and automatic feature limits for ${club.name}`
                    : language === "pt"
                    ? `Gerenciando assinaturas e limites de recursos para ${club.name}`
                    : `Gestión de suscripción y activación automática de funciones para ${club.name}`}
                </DialogDescription>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">
                {language === "en" ? "Current Tier:" : language === "pt" ? "Plano Atual:" : "Plan Actual:"}
              </span>
              <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                {currentPlanConfig.name}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen de Consumo / Métricas del Club */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users size={16} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                {language === "en" ? "Players Limit" : language === "pt" ? "Limite de Jogadores" : "Límite Jugadores"}
              </span>
              <span className="font-bold text-sm font-mono">
                {club.playerCount !== undefined ? `${club.playerCount} / ` : ""}
                {currentPlanConfig.maxPlayers === 0
                  ? (language === "en" ? "Unlimited" : language === "pt" ? "Ilimitado" : "Ilimitados")
                  : currentPlanConfig.maxPlayers}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Trophy size={16} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                {language === "en" ? "Sports Active" : language === "pt" ? "Esportes Ativos" : "Deportes Activos"}
              </span>
              <span className="font-bold text-sm font-mono">
                {club.sportCount !== undefined ? `${club.sportCount} / ` : ""}
                {currentPlanConfig.maxSports === 0
                  ? (language === "en" ? "Unlimited" : language === "pt" ? "Ilimitado" : "Ilimitados")
                  : currentPlanConfig.maxSports}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
              <Bot size={16} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                Parryn IA
              </span>
              <span className="font-bold text-xs text-foreground">
                {currentPlanConfig.features.parrynAiFull
                  ? (language === "en" ? "Pro Assistant" : language === "pt" ? "Assistente Pro" : "Pro Completo")
                  : (language === "en" ? "Standard" : language === "pt" ? "Padrão" : "Básico")}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <DollarSign size={16} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                {language === "en" ? "Billing Engine" : language === "pt" ? "Sistema de Cobrança" : "Motor Cobros"}
              </span>
              <span className="font-bold text-xs text-foreground">
                {currentPlanConfig.features.advancedBilling
                  ? (language === "en" ? "Pro Split & Receipts" : language === "pt" ? "Rateio e Comprovantes" : "Prorrateo & Comprobantes")
                  : (language === "en" ? "Standard Fee" : language === "pt" ? "Cobrança Simples" : "Cobro Simple")}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjetas Comparativas de los 3 Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
          {planKeys.map((key) => {
            const plan = CLUB_PLANS[key];
            const isCurrent = club.plan === key;
            const isRecommended = plan.highlight;

            return (
              <div
                key={key}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/40"
                    : isRecommended
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-zinc-950 font-bold text-[10px] px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles size={11} /> {language === "en" ? "Most Popular" : language === "pt" ? "Mais Popular" : "Más Elegido"}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold">
                        {language === "en" ? "Active" : language === "pt" ? "Ativo" : "Activo"}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground min-h-[32px] leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="py-2 border-y border-border/60">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono text-foreground">
                        ${plan.priceMonthly.toLocaleString("es-CL")}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        / {language === "en" ? "month" : language === "pt" ? "mês" : "mes"}
                      </span>
                    </div>
                  </div>

                  {/* Checklist de Funcionalidades */}
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center gap-2 text-foreground">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>
                        {plan.maxPlayers === 0
                          ? (language === "en" ? "Unlimited Players" : language === "pt" ? "Jogadores Ilimitados" : "Jugadores Ilimitados")
                          : (language === "en" ? `Up to ${plan.maxPlayers} Players` : language === "pt" ? `Até ${plan.maxPlayers} Jogadores` : `Hasta ${plan.maxPlayers} Jugadores`)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-foreground">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>
                        {plan.maxSports === 0
                          ? (language === "en" ? "Unlimited Sports" : language === "pt" ? "Esportes Ilimitados" : "Deportes Ilimitados")
                          : (language === "en" ? `Up to ${plan.maxSports} Sports` : language === "pt" ? `Até ${plan.maxSports} Esportes` : `${plan.maxSports} Deporte${plan.maxSports > 1 ? "s" : ""}`)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-foreground">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>{language === "en" ? "Elo Ranking & Match Tracking" : language === "pt" ? "Ranking Elo e Partidas" : "Ranking Elo y Registro de Partidos"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.features.courtRotationAndPdf ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={plan.features.courtRotationAndPdf ? "text-foreground" : "text-muted-foreground/60"}>
                        {language === "en" ? "Official American Tournament & PDF" : language === "pt" ? "Torneio Americano e PDF" : "Torneo Americano & Fixture PDF"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.features.advancedBilling ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={plan.features.advancedBilling ? "text-foreground" : "text-muted-foreground/60"}>
                        {language === "en" ? "Expense Split & Payment Receipts" : language === "pt" ? "Rateio de Custos e Comprovantes" : "Prorrateo de Gastos & Comprobantes"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.features.parrynAiFull ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={plan.features.parrynAiFull ? "text-foreground" : "text-muted-foreground/60"}>
                        {language === "en" ? "Parryn IA Weather & Court Scheduling" : language === "pt" ? "Parryn IA Clima e Quadras" : "Parryn IA Clima & Canchas Techadas"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.features.customBranding ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={plan.features.customBranding ? "text-foreground" : "text-muted-foreground/60"}>
                        {language === "en" ? "Custom Club Colors & Logo" : language === "pt" ? "Cores e Logo Personalizados" : "Colores y Logo del Club"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.features.financialAudit ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <X size={14} className="text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={plan.features.financialAudit ? "text-foreground" : "text-muted-foreground/60"}>
                        {language === "en" ? "Financial Audit & Export" : language === "pt" ? "Auditoria Financeira e Exportação" : "Auditoría Financiera y Reportes"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de Acción según Rol */}
                <div className="pt-5 mt-4 border-t border-border/60">
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold cursor-default border-primary/30 text-primary"
                      disabled
                    >
                      ✓ {language === "en" ? "Current Plan" : language === "pt" ? "Plano Atual" : "Plan Actual del Club"}
                    </Button>
                  ) : isSuperAdmin ? (
                    <Button
                      onClick={() => handleApplyPlan(key)}
                      disabled={isSaving}
                      className={`w-full text-xs font-semibold shadow-sm ${
                        key === "pro"
                          ? "bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold"
                          : key === "elite"
                          ? "bg-purple-600 hover:bg-purple-500 text-white"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      {isSaving
                        ? (language === "en" ? "Updating..." : language === "pt" ? "Atualizando..." : "Aplicando...")
                        : (language === "en" ? `Switch to ${plan.name}` : language === "pt" ? `Mudar para ${plan.name}` : `Asignar ${plan.name}`)}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const msg = `Hola, soy administrador de ${club.name} y deseo solicitar la actualización de nuestro plan a ${plan.name} en Parryn Sport Hub IA.`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                      }}
                      className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {language === "en" ? "Request Upgrade" : language === "pt" ? "Solicitar Upgrade" : "Solicitar Upgrade"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center text-xs text-muted-foreground">
          {language === "en"
            ? "🛡️ All plans include automatic backup, SSL security, and updates in Parryn Sport Hub IA."
            : language === "pt"
            ? "🛡️ Todos os planos incluem backup automático, segurança SSL e atualizações no Parryn Sport Hub IA."
            : "🛡️ Todos los planes incluyen respaldo automático en Neon PostgreSQL, seguridad SSL y soporte en Parryn Sport Hub IA."}
        </div>
      </DialogContent>
    </Dialog>
  );
}
