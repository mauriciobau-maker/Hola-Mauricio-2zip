export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  includedIn: ("basic" | "pro" | "elite")[];
}

export interface ClubPlan {
  id: "basic" | "pro" | "elite";
  name: string;
  badge: string;
  priceMonthly: number; // en CLP o USD referencial
  currency: string;
  description: string;
  maxPlayers: number; // 0 para ilimitado
  maxSports: number; // 0 para ilimitado
  features: {
    multisport: boolean;
    unlimitedPlayers: boolean;
    americanTournaments: boolean;
    courtRotationAndPdf: boolean;
    advancedBilling: boolean; // prorrateo + comprobantes adjuntos
    parrynAiFull: boolean; // secretario de turnos y clima
    whatsappTemplates: boolean;
    customBranding: boolean;
    multiAdmin: boolean;
    financialAudit: boolean;
  };
  highlight?: boolean;
}

export const CLUB_PLANS: Record<"basic" | "pro" | "elite", ClubPlan> = {
  basic: {
    id: "basic",
    name: "Starter Club",
    badge: "Básico",
    priceMonthly: 19990,
    currency: "CLP",
    description: "Ideal para comunidades deportivas pequeñas o canchas que inician.",
    maxPlayers: 25,
    maxSports: 1,
    features: {
      multisport: false,
      unlimitedPlayers: false,
      americanTournaments: true, // formato básico
      courtRotationAndPdf: false,
      advancedBilling: false,
      parrynAiFull: false,
      whatsappTemplates: false,
      customBranding: false,
      multiAdmin: false,
      financialAudit: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro Sport Hub",
    badge: "Recomendado",
    priceMonthly: 44990,
    currency: "CLP",
    description: "Para clubes activos con múltiples canchas, torneos y cobros automatizados.",
    maxPlayers: 150,
    maxSports: 3,
    highlight: true,
    features: {
      multisport: true,
      unlimitedPlayers: true,
      americanTournaments: true,
      courtRotationAndPdf: true,
      advancedBilling: true,
      parrynAiFull: true,
      whatsappTemplates: true,
      customBranding: true,
      multiAdmin: true,
      financialAudit: false,
    },
  },
  elite: {
    id: "elite",
    name: "Elite Enterprise",
    badge: "Completo",
    priceMonthly: 89990,
    currency: "CLP",
    description: "Para complejos deportivos de alto volumen, cadenas y clubes multisede.",
    maxPlayers: 0, // ilimitado
    maxSports: 0, // ilimitado
    features: {
      multisport: true,
      unlimitedPlayers: true,
      americanTournaments: true,
      courtRotationAndPdf: true,
      advancedBilling: true,
      parrynAiFull: true,
      whatsappTemplates: true,
      customBranding: true,
      multiAdmin: true,
      financialAudit: true,
    },
  },
};

export function getPlanConfig(planId?: string | null): ClubPlan {
  const norm = (planId || "basic").toLowerCase() as "basic" | "pro" | "elite";
  return CLUB_PLANS[norm] || CLUB_PLANS.basic;
}

export function canClubAccessFeature(
  planId: string | null | undefined,
  feature: keyof ClubPlan["features"]
): boolean {
  const plan = getPlanConfig(planId);
  return !!plan.features[feature];
}
