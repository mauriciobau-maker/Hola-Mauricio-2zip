import { useState } from "react";
import { Link } from "wouter";
import {
  Sparkles,
  ShieldCheck,
  CloudRain,
  Users,
  Trophy,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Zap,
  TrendingUp,
  ChevronDown,
  Building2,
  Check,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, Language } from "@/context/LanguageContext";

const LANDING_TEXTS: Record<Language, any> = {
  es: {
    nav: {
      features: "Funcionalidades",
      sports: "Pádel, Fútbol & Tenis",
      pricing: "Planes y Precios",
      faq: "Preguntas Frecuentes",
      login: "Iniciar Sesión",
      createClub: "Crear mi Club Gratis",
    },
    hero: {
      badge: "Software Oficial de Organización Deportiva con Inteligencia Artificial",
      titlePre: "Organiza tus Clubes de",
      sportsHighlight: "Pádel, Fútbol y Tenis",
      titlePost: "sin el caos de WhatsApp",
      subtitle:
        "Automatiza convocatorias, balancea partidos con ranking Elo o tablas oficiales, anticipa la lluvia con alertas meteorológicas por satélite y cobra las cuotas a tiempo sin morosidad.",
      ctaTrial: "Comenzar Prueba Gratis (14 Días)",
      ctaDemo: "Ver Demo Interactiva",
      bullets: [
        "Sin tarjeta de crédito requerida",
        "Listo en menos de 2 minutos",
        "100% adaptable a Pádel, Fútbol y Tenis",
      ],
    },
    cards: {
      card1: {
        tag: "🎾 Pádel & Americanas",
        badge: "Ranking Elo",
        title: "Cruces Equilibrados Automáticos",
        desc: "El sistema evalúa el historial y el nivel Elo de cada jugador para armar parejas balanceadas y evitar partidos desnivelados.",
        matchA: "Pareja A (Elo 1350)",
        matchB: "Pareja B (Elo 1340)",
        matchResult: "✓ Paridad estimada: 98% (Partido de alta competitividad)",
      },
      card2: {
        tag: "🌦️ Satélite en Tiempo Real",
        badge: "Alerta de Lluvia",
        title: "Cero Suspensiones de Último Minuto",
        desc: "Monitorea el pronóstico por hora en la sede de tu club. Si hay riesgo de lluvia, reubica de inmediato turnos a canchas techadas o avisa por WhatsApp.",
        location: "Santiago de Chile (18°C)",
        prob: "Prob. 90% Lluvia",
        tip: "Recomendación: Mover turnos a Pistas 1 y 2 (Techadas).",
      },
      card3: {
        tag: "⚽ Fútbol & Finanzas",
        badge: "Cuentas Claras",
        title: "Cobros y Prorrateos Automatizados",
        desc: "Divide el arriendo de la cancha entre los 10 o 14 jugadores, registra comprobantes de transferencia y envía recordatorios amables con 1 clic.",
        courtInfo: "Cancha Fútbol 7 ($42.000)",
        perPlayer: "$3.000 c/u",
        confirmed: "✓ 12/14 Confirmados con comprobante",
      },
    },
    metrics: [
      { num: "10 hrs", text: "Ahorradas por semana en WhatsApp" },
      { num: "0", text: "Canchas vacías por desorganización" },
      { num: "98%", text: "Cobros al día sin deudores morosos" },
      { num: "3 en 1", text: "Pádel, Tenis y Fútbol en una sola app" },
    ],
    features: {
      tag: "Plataforma Completa",
      title: "Todo lo que necesitas para profesionalizar tu club",
      desc: "Diseñado pensando tanto en el administrador que gestiona canchas como en el jugador que solo quiere saber a qué hora juega y contra quién.",
      list: [
        {
          title: "Convocatorias Rápidas para WhatsApp",
          desc: "Redacta invitaciones automáticas con fecha, canchas, cupos y valor por persona. Los jugadores se inscriben directamente desde su teléfono.",
        },
        {
          title: "Validación Cruzada Fair Play",
          desc: "Los resultados anotados por un jugador quedan pendientes hasta que un rival o el delegado los confirme. Tablas limpias y sin controversias.",
        },
        {
          title: "Semáforo Meteorológico Satelital",
          desc: "Integración directa con satélite meteorológico para anticipar lluvia, viento y temperatura. El sistema sugiere reubicar partidos a pistas techadas con antelación.",
        },
        {
          title: "Control de Cuotas y Arriendos",
          desc: "Seguimiento de transferencias bancarias, saldo a favor o deuda por jugador y exportación de resúmenes financieros del club.",
        },
      ],
    },
    pricing: {
      tag: "Precios Transparentes",
      title: "Comienza gratis, escala cuando tu club crezca",
      desc: "Todos los planes incluyen 14 días de prueba con todas las funciones desbloqueadas. Cancela en cualquier momento.",
      plans: [
        {
          name: "Prueba Inicial",
          forWhom: "Para probar con tu grupo o liga",
          price: "$0",
          period: "/ 14 días",
          features: [
            "Hasta 20 jugadores",
            "1 Deporte activo",
            "Convocatorias para WhatsApp",
            "Ranking y Tabla oficial",
          ],
          cta: "Comenzar Gratis",
          featured: false,
        },
        {
          name: "Club Pro",
          forWhom: "Para clubes medianos y organizadores habituales",
          price: "$29.000",
          period: "CLP (~$30 USD) / mes",
          features: [
            "Jugadores ilimitados",
            "Hasta 4 canchas",
            "Asistente Parryn para convocatorias",
            "Módulo completo de cobros y deudas",
            "Alertas climáticas en tiempo real",
          ],
          cta: "Elegir Club Pro",
          featured: true,
          badge: "MÁS POPULAR",
        },
        {
          name: "Complejo Multi-Sport",
          forWhom: "Para centros deportivos y ligas de gran escala",
          price: "$59.000",
          period: "CLP (~$60 USD) / mes",
          features: [
            "Canchas y deportes ilimitados",
            "Pádel, Tenis y Fútbol simultáneos",
            "Múltiples administradores y roles",
            "Soporte prioritario por WhatsApp",
          ],
          cta: "Contactar Ventas",
          featured: false,
        },
      ],
    },
    faq: {
      title: "Preguntas Frecuentes",
      subtitle: "Respuestas rápidas a las dudas comunes de los organizadores",
      items: [
        {
          q: "¿Mis jugadores necesitan instalar una aplicación desde la Play Store o App Store?",
          a: "No obligatoriamente. Parryn funciona directamente desde el navegador de cualquier teléfono (PWA). Los jugadores pueden ingresar a través de los enlaces de WhatsApp, ver sus partidos, confirmar asistencia y anotar resultados sin descargas pesadas.",
        },
        {
          q: "¿Cómo funciona la prueba gratuita de 14 días?",
          a: "Al registrar tu club, obtienes acceso inmediato a todas las herramientas Pro por 14 días sin necesidad de ingresar tarjeta de crédito. Puedes organizar tus torneos y convocatorias con total libertad.",
        },
        {
          q: "¿Puedo manejar más de un deporte en el mismo club?",
          a: "Sí. Puedes habilitar Pádel, Fútbol y Tenis. Cada deporte tiene sus propias reglas, modalidades (ej: Fútbol 5, Fútbol 7, Pádel Americano) y sus tablas de puntuación independientes.",
        },
        {
          q: "¿Cómo predice el clima para las canchas descubiertas?",
          a: "La plataforma se conecta en tiempo real al satélite meteorológico según la ciudad o comuna de tu club. Evalúa la probabilidad de lluvia y velocidad del viento en las próximas horas y te sugiere automáticamente reubicar turnos a pistas techadas con antelación.",
        },
      ],
    },
    cta: {
      title: "¿Listo para llevar la organización de tu club al siguiente nivel?",
      subtitle:
        "Únete a los organizadores que ya no pierden tiempo persiguiendo confirmaciones en WhatsApp ni discutiendo cobros.",
      button: "Crear mi Club Gratis Ahora",
    },
    footer: {
      rights: "Todos los derechos reservados.",
      login: "Acceder al Club",
      register: "Registro de Clubes",
      support: "Soporte y Contacto",
    },
  },
  en: {
    nav: {
      features: "Features",
      sports: "Padel, Football & Tennis",
      pricing: "Plans & Pricing",
      faq: "FAQ",
      login: "Log In",
      createClub: "Create Free Club",
    },
    hero: {
      badge: "Official Sports Organization Software with Artificial Intelligence",
      titlePre: "Organize your Clubs for",
      sportsHighlight: "Padel, Football and Tennis",
      titlePost: "without the WhatsApp chaos",
      subtitle:
        "Automate call-ups, balance matchups with dynamic Elo rating or official league standings, predict rain with satellite weather radar, and collect player fees on time.",
      ctaTrial: "Start Free Trial (14 Days)",
      ctaDemo: "View Interactive Demo",
      bullets: [
        "No credit card required",
        "Ready in less than 2 minutes",
        "100% adaptable for Padel, Football & Tennis",
      ],
    },
    cards: {
      card1: {
        tag: "🎾 Padel & Americanas",
        badge: "Elo Rating",
        title: "Balanced Automated Matchups",
        desc: "The algorithm calculates each player's history and Elo rating to form fair pairs and avoid lopsided games.",
        matchA: "Pair A (Elo 1350)",
        matchB: "Pair B (Elo 1340)",
        matchResult: "✓ Estimated parity: 98% (High competition match)",
      },
      card2: {
        tag: "🌦️ Real-Time Weather Satellite",
        badge: "Rain Warning",
        title: "Zero Last-Minute Cancellations",
        desc: "Check hourly forecasts right at your club's venue. If rain threatens, immediately relocate slots to covered courts or notify via WhatsApp.",
        location: "Santiago (18°C)",
        prob: "90% Rain Prob.",
        tip: "Recommendation: Shift bookings to Courts 1 & 2 (Covered).",
      },
      card3: {
        tag: "⚽ Football & Finances",
        badge: "Transparent Ledgers",
        title: "Automated Fee Splits & Payments",
        desc: "Split pitch rental easily among 10 or 14 players, log transfer receipts, and send friendly payment reminders with 1 tap.",
        courtInfo: "Football 7 Pitch ($42.000)",
        perPlayer: "$3.000 each",
        confirmed: "✓ 12/14 Confirmed with receipt",
      },
    },
    metrics: [
      { num: "10 hrs", text: "Saved per week on WhatsApp" },
      { num: "0", text: "Empty courts caused by disorganization" },
      { num: "98%", text: "On-time fee collection without overdue debts" },
      { num: "3 in 1", text: "Padel, Tennis and Football in a single app" },
    ],
    features: {
      tag: "Complete Platform",
      title: "Everything you need to professionalize your club",
      desc: "Built for both managers running multi-court facilities and players who simply want to know when and against whom they play.",
      list: [
        {
          title: "Instant WhatsApp Convocations",
          desc: "Generate smart invitations with date, court numbers, available spots, and per-person cost. Players confirm right from their smartphones.",
        },
        {
          title: "Fair Play Cross-Validation",
          desc: "Match scores submitted by players stay pending until confirmed by their opponent or the tournament referee. Clean leaderboards with no disputes.",
        },
        {
          title: "Satellite Weather Warning Radar",
          desc: "Direct satellite meteorological connection predicting precipitation, wind, and heat index. Suggests shifting matches to indoor courts hours before.",
        },
        {
          title: "Fee Tracking and Court Rent Splits",
          desc: "Keep accurate track of player balances, bank transfers, outstanding dues, and export complete club financial spreadsheets.",
        },
      ],
    },
    pricing: {
      tag: "Transparent Pricing",
      title: "Start free, scale as your sports community grows",
      desc: "All plans include a 14-day free trial with every feature fully unlocked. Cancel anytime.",
      plans: [
        {
          name: "Starter Trial",
          forWhom: "To test with your friendly group or league",
          price: "$0",
          period: "/ 14 days",
          features: [
            "Up to 20 players",
            "1 Active sport",
            "WhatsApp call-up generator",
            "Official ranking & standings",
          ],
          cta: "Start Free",
          featured: false,
        },
        {
          name: "Club Pro",
          forWhom: "For medium-sized clubs and recurring organizers",
          price: "$29.000",
          period: "CLP (~$30 USD) / month",
          features: [
            "Unlimited players",
            "Up to 4 courts / pitches",
            "Parryn AI assistant for WhatsApp call-ups",
            "Full fee collection and debt manager",
            "Real-time satellite weather alerts",
          ],
          cta: "Choose Club Pro",
          featured: true,
          badge: "MOST POPULAR",
        },
        {
          name: "Multi-Sport Complex",
          forWhom: "For large sports facilities and multi-court leagues",
          price: "$59.000",
          period: "CLP (~$60 USD) / month",
          features: [
            "Unlimited courts and sports",
            "Simultaneous Padel, Tennis & Football",
            "Multiple staff roles and club admins",
            "Priority WhatsApp concierge support",
          ],
          cta: "Contact Sales",
          featured: false,
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Quick answers to common questions from sports organizers",
      items: [
        {
          q: "Do players need to install an app from Play Store or App Store?",
          a: "Not necessarily. Parryn runs natively in any mobile browser (PWA). Players open WhatsApp links, view their matches, confirm attendance, and log scores without heavy downloads.",
        },
        {
          q: "How does the 14-day free trial work?",
          a: "When you register your club, you get full access to all Pro features for 14 days without entering a credit card. Organize tournaments and call-ups with total freedom.",
        },
        {
          q: "Can I manage more than one sport in the same club?",
          a: "Yes. You can activate Padel, Football, and Tennis. Each sport has its own rules, formats (e.g. 5-a-side, 7-a-side, Padel Americano), and independent standings.",
        },
        {
          q: "How does it predict weather for outdoor courts?",
          a: "The system connects in real time to meteorological satellite data for your club's city. It calculates hourly rain probabilities and wind speeds, recommending court reallocations in advance.",
        },
      ],
    },
    cta: {
      title: "Ready to elevate your club's organization to the next level?",
      subtitle:
        "Join organizers who no longer waste time chasing WhatsApp confirmations or arguing over unpaid court fees.",
      button: "Create My Free Club Now",
    },
    footer: {
      rights: "All rights reserved.",
      login: "Access Club",
      register: "Club Registration",
      support: "Support & Contact",
    },
  },
  pt: {
    nav: {
      features: "Recursos",
      sports: "Pádel, Futebol & Tênis",
      pricing: "Planos e Preços",
      faq: "Perguntas Frequentes",
      login: "Entrar",
      createClub: "Criar Clube Grátis",
    },
    hero: {
      badge: "Software Oficial de Gestão Esportiva com Inteligência Artificial",
      titlePre: "Organize seus Clubes de",
      sportsHighlight: "Pádel, Futebol e Tênis",
      titlePost: "sem o caos do WhatsApp",
      subtitle:
        "Automatize convocações, equilibre partidas com ranking Elo ou tabelas oficiais, antecipe chuvas com alertas meteorológicos por satélite e cobre mensalidades em dia.",
      ctaTrial: "Começar Teste Grátis (14 Dias)",
      ctaDemo: "Ver Demonstração Interativa",
      bullets: [
        "Sem necessidade de cartão de crédito",
        "Pronto em menos de 2 minutos",
        "100% adaptável para Pádel, Futebol e Tênis",
      ],
    },
    cards: {
      card1: {
        tag: "🎾 Pádel & Americanas",
        badge: "Ranking Elo",
        title: "Cruzamentos Equilibrados Automáticos",
        desc: "O sistema avalia o histórico e o nível Elo de cada atleta para montar duplas balanceadas e evitar partidas desiguais.",
        matchA: "Dupla A (Elo 1350)",
        matchB: "Dupla B (Elo 1340)",
        matchResult: "✓ Paridade estimada: 98% (Partida de alta competitividade)",
      },
      card2: {
        tag: "🌦️ Satélite em Tempo Real",
        badge: "Alerta de Chuva",
        title: "Zero Cancelamentos de Última Hora",
        desc: "Monitore a previsão horária na sede do seu clube. Se houver risco de chuva, transfira imediatamente partidas para quadras cobertas ou avise por WhatsApp.",
        location: "Santiago (18°C)",
        prob: "90% Prob. Chuva",
        tip: "Recomendação: Mover horários para Quadras 1 e 2 (Cobertas).",
      },
      card3: {
        tag: "⚽ Futebol & Finanças",
        badge: "Contas Claras",
        title: "Cobranças e Rateios Automatizados",
        desc: "Divida o aluguel da quadra entre os 10 ou 14 jogadores, registre comprovantes de transferência e envie lembretes cordiais com 1 clique.",
        courtInfo: "Campo Futebol 7 ($42.000)",
        perPlayer: "$3.000 cada",
        confirmed: "✓ 12/14 Confirmados com comprovante",
      },
    },
    metrics: [
      { num: "10 hrs", text: "Economizadas por semana no WhatsApp" },
      { num: "0", text: "Quadras vazias por desorganização" },
      { num: "98%", text: "Cobranças em dia sem inadimplência" },
      { num: "3 em 1", text: "Pádel, Tênis e Futebol em um só aplicativo" },
    ],
    features: {
      tag: "Plataforma Completa",
      title: "Tudo o que você precisa para profissionalizar seu clube",
      desc: "Projetado pensando tanto no gestor que administra quadras quanto no atleta que só quer saber que horas joga e contra quem.",
      list: [
        {
          title: "Convocações Rápidas para WhatsApp",
          desc: "Elabore convites automáticos com data, quadras, vagas e valor por atleta. Os jogadores confirmam presença direto pelo celular.",
        },
        {
          title: "Validação Cruzada Fair Play",
          desc: "Os placares registrados por um jogador ficam pendentes até confirmação do adversário ou administrador. Tabelas limpas e sem controvérsias.",
        },
        {
          title: "Semáforo Meteorológico via Satélite",
          desc: "Integração direta com satélite meteorológico para prever chuva, vento e temperatura. O sistema sugere transferir jogos para quadras cobertas com antecedência.",
        },
        {
          title: "Controle de Mensalidades e Aluguéis",
          desc: "Acompanhe transferências bancárias, saldos ou pendências de cada atleta e exporte relatórios financeiros completos.",
        },
      ],
    },
    pricing: {
      tag: "Preços Transparentes",
      title: "Comece grátis, expanda quando seu clube crescer",
      desc: "Todos os planos incluem 14 dias de teste com todos os recursos liberados. Cancele a qualquer momento.",
      plans: [
        {
          name: "Teste Inicial",
          forWhom: "Para testar com seu grupo ou liga",
          price: "$0",
          period: "/ 14 dias",
          features: [
            "Até 20 jogadores",
            "1 Esporte ativo",
            "Convocações para WhatsApp",
            "Ranking e Tabela oficial",
          ],
          cta: "Começar Grátis",
          featured: false,
        },
        {
          name: "Clube Pro",
          forWhom: "Para clubes médios e organizadores regulares",
          price: "$29.000",
          period: "CLP (~$30 USD) / mês",
          features: [
            "Jogadores ilimitados",
            "Até 4 quadras / campos",
            "Assistente Parryn para convocações",
            "Módulo completo de cobranças e dívidas",
            "Alertas climáticos em tempo real",
          ],
          cta: "Escolher Clube Pro",
          featured: true,
          badge: "MAIS POPULAR",
        },
        {
          name: "Complexo Multi-Esporte",
          forWhom: "Para centros esportivos e ligas de grande porte",
          price: "$59.000",
          period: "CLP (~$60 USD) / mês",
          features: [
            "Quadras e esportes ilimitados",
            "Pádel, Tênis e Futebol simultâneos",
            "Múltiplos administradores e funções",
            "Suporte prioritário via WhatsApp",
          ],
          cta: "Falar com Vendas",
          featured: false,
        },
      ],
    },
    faq: {
      title: "Perguntas Frequentes",
      subtitle: "Respostas rápidas às dúvidas comuns dos organizadores",
      items: [
        {
          q: "Meus jogadores precisam instalar um aplicativo da Play Store ou App Store?",
          a: "Não obrigatoriamente. O Parryn funciona diretamente no navegador de qualquer celular (PWA). Os atletas acessam pelos links do WhatsApp, conferem partidas, confirmam presença e anotam resultados sem downloads pesados.",
        },
        {
          q: "Como funciona o teste gratuito de 14 dias?",
          a: "Ao cadastrar seu clube, você recebe acesso imediato a todas as ferramentas Pro por 14 dias sem necessidade de cartão de crédito. Organize torneios e convocações com total liberdade.",
        },
        {
          q: "Posso gerenciar mais de um esporte no mesmo clube?",
          a: "Sim. Você pode habilitar Pádel, Futebol e Tênis. Cada esporte tem suas próprias regras, modalidades (ex: Futebol 5, Futebol 7, Pádel Americano) e tabelas de pontuação independentes.",
        },
        {
          q: "Como o sistema prevê o clima para quadras abertas?",
          a: "A plataforma se conecta em tempo real ao satélite meteorológico de acordo com a cidade do clube. Calcula a probabilidade de chuva e vento nas próximas horas e sugere automaticamente a realocação para quadras cobertas com antecedência.",
        },
      ],
    },
    cta: {
      title: "Pronto para levar a gestão do seu clube ao próximo nível?",
      subtitle:
        "Junte-se aos organizadores que não perdem mais tempo cobrando presenças no WhatsApp nem discutindo rateios.",
      button: "Criar Meu Clube Grátis Agora",
    },
    footer: {
      rights: "Todos os direitos reservados.",
      login: "Acessar o Clube",
      register: "Registro de Clubes",
      support: "Suporte e Contato",
    },
  },
};

export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const t = LANDING_TEXTS[language] || LANDING_TEXTS.es;

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm">
              P
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-foreground">
                Parryn Sport Hub
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                SaaS Deportivo IA
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#beneficios" className="hover:text-foreground transition-colors">
              {t.nav.features}
            </a>
            <a href="#deportes" className="hover:text-foreground transition-colors">
              {t.nav.sports}
            </a>
            <a href="#precios" className="hover:text-foreground transition-colors">
              {t.nav.pricing}
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              {t.nav.faq}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 border border-border px-2 py-1 rounded-lg text-xs">
              <Globe size={13} className="text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any, true)}
                className="bg-transparent text-foreground text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="es" className="bg-background text-foreground">ES</option>
                <option value="en" className="bg-background text-foreground">EN</option>
                <option value="pt" className="bg-background text-foreground">PT</option>
              </select>
            </div>
            <Link
              href="/"
              className="text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/crear-club"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              {t.nav.createClub}
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {t.hero.badge}
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            {t.hero.titlePre} <span className="text-primary">{t.hero.sportsHighlight}</span> {t.hero.titlePost}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/crear-club"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{t.hero.ctaTrial}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto bg-card hover:bg-muted border border-border text-foreground font-semibold text-sm px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>{t.hero.ctaDemo}</span>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium">
            {t.hero.bullets.map((b: string, i: number) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> {b}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Interactive Teaser Cards Mockup */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Pádel & Elo */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {t.cards.card1.tag}
                </span>
                <span className="text-[11px] font-bold text-primary">{t.cards.card1.badge}</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t.cards.card1.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.cards.card1.desc}
              </p>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span>{t.cards.card1.matchA}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span>{t.cards.card1.matchB}</span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {t.cards.card1.matchResult}
                </div>
              </div>
            </div>

            {/* Card 2: Alerta Climática */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {t.cards.card2.tag}
                </span>
                <span className="text-[11px] font-bold text-amber-500">{t.cards.card2.badge}</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t.cards.card2.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.cards.card2.desc}
              </p>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{t.cards.card2.location}</span>
                  <span className="text-[11px] bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                    {t.cards.card2.prob}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t.cards.card2.tip}
                </div>
              </div>
            </div>

            {/* Card 3: Fútbol & Cobros */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {t.cards.card3.tag}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{t.cards.card3.badge}</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t.cards.card3.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.cards.card3.desc}
              </p>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span>{t.cards.card3.courtInfo}</span>
                  <span className="font-bold text-foreground">{t.cards.card3.perPlayer}</span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {t.cards.card3.confirmed}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Métricas / Impacto */}
      <section className="py-12 bg-muted/30 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {t.metrics.map((m: any, i: number) => (
              <div key={i} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground">{m.num}</div>
                <p className="text-xs text-muted-foreground font-medium">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Funcionalidades Detalladas */}
      <section id="beneficios" className="py-16 md:py-24 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t.features.tag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t.features.title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {t.features.desc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">{t.features.list[0].title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.features.list[0].desc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">{t.features.list[1].title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.features.list[1].desc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CloudRain className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">{t.features.list[2].title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.features.list[2].desc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">{t.features.list[3].title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.features.list[3].desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Planes y Precios */}
      <section id="precios" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t.pricing.tag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t.pricing.title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {t.pricing.desc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.pricing.plans.map((plan: any, idx: number) => (
              <div
                key={idx}
                className={`bg-card rounded-2xl p-6 flex flex-col justify-between space-y-6 relative ${
                  plan.featured
                    ? "border-2 border-primary shadow-lg"
                    : "border border-border"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider">
                    {plan.badge}
                  </span>
                )}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.forWhom}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {plan.features.map((f: string, fIdx: number) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/crear-club"
                  className={`w-full text-center py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    plan.featured
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
                      : "border border-border bg-muted/50 hover:bg-muted text-foreground"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="py-16 md:py-24 border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t.faq.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.faq.subtitle}
            </p>
          </div>

          <div className="space-y-3">
            {t.faq.items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="border border-border rounded-xl bg-card overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between font-semibold text-sm text-foreground hover:bg-muted/40 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      openFaq === idx ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/50">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA Final */}
      <section className="py-16 md:py-20 text-center bg-card border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            {t.cta.title}
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {t.cta.subtitle}
          </p>
          <div className="pt-2">
            <Link
              href="/crear-club"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-8 py-3.5 rounded-xl shadow-md transition-all"
            >
              <span>{t.cta.button}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-8 bg-background text-xs text-muted-foreground border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Parryn Sport Hub IA</span>
            <span>© {new Date().getFullYear()} — {t.footer.rights}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              {t.footer.login}
            </Link>
            <Link href="/crear-club" className="hover:text-foreground transition-colors">
              {t.footer.register}
            </Link>
            <a href="mailto:contacto@parrynsport.com" className="hover:text-foreground transition-colors">
              {t.footer.support}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
