import React, { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  Sparkles,
  Building2,
  Calendar,
  Trophy,
  DollarSign,
  CloudRain,
  MessageSquare,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Search,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";

interface SectionContent {
  id: string;
  icon: any;
  title: string;
  badge: string;
  desc: string;
  steps: Array<{
    number: string;
    title: string;
    detail: string;
    tip?: string;
  }>;
  quickAction?: {
    label: string;
    href: string;
  };
}

export default function Manual() {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const isEn = language === "en";
  const isPt = language === "pt";

  const categories = [
    { id: "all", label: isEn ? "All Guides" : isPt ? "Todos os Guias" : "Todos los Módulos" },
    { id: "setup", label: isEn ? "Club Setup" : isPt ? "Configuração" : "Primeros Pasos" },
    { id: "matches", label: isEn ? "Events & Matches" : isPt ? "Eventos e Jogos" : "Convocatorias & Partidos" },
    { id: "ranking", label: isEn ? "Elo Ranking" : isPt ? "Ranking Elo" : "Ranking & Puntos" },
    { id: "payments", label: isEn ? "Court Splitting" : isPt ? "Cobranças & Rateio" : "Cobros & Gastos" },
    { id: "ai", label: isEn ? "AI Secretary & Weather" : isPt ? "Secretário IA & Clima" : "Secretario IA Parryn" },
  ];

  const sections: SectionContent[] = [
    {
      id: "setup",
      icon: Building2,
      title: isEn ? "1. Setup & Brand Identity" : isPt ? "1. Configuração e Identidade do Clube" : "1. Configuración de tu Club",
      badge: isEn ? "3 minutes setup" : isPt ? "3 minutos de setup" : "Puesta en marcha rápida",
      desc: isEn
        ? "Personalize your club's visual brand, logo, primary color, and invite players via WhatsApp."
        : isPt
        ? "Personalize a marca do clube, escudo, cor principal e convide os jogadores via WhatsApp."
        : "Personaliza el escudo de tu club, colores corporativos, ciudad para el radar de clima e invita a tus socios.",
      steps: [
        {
          number: "1",
          title: isEn ? "Go to 'My Club'" : isPt ? "Acesse 'Meu Clube'" : "Entra a 'Mi Club'",
          detail: isEn
            ? "Click 'My Club' in the top right navigation bar to open your visual configuration."
            : isPt
            ? "Clique em 'Meu Clube' na barra superior para abrir as configurações visuais."
            : "Haz clic en 'Mi Club' en la barra superior para acceder al panel de administración y diseño.",
        },
        {
          number: "2",
          title: isEn ? "Upload Logo & Pick Colors" : isPt ? "Envie o Escudo e Cores" : "Sube el Escudo y Colores",
          detail: isEn
            ? "Upload your club emblem directly from your phone or PC and choose your corporate brand color."
            : isPt
            ? "Envie o escudo do clube direto do celular ou computador e selecione a cor corporativa."
            : "Carga la insignia del club desde tu teléfono o computador y selecciona el color que identificará a tus canchas.",
        },
        {
          number: "3",
          title: isEn ? "Set City & Share WhatsApp Link" : isPt ? "Defina a Cidade e Convide" : "Indica tu Ciudad y Comparte el Enlace",
          detail: isEn
            ? "Entering your city activates real-time Open-Meteo satellite weather alerts. Copy the member invite link and send it to your WhatsApp group."
            : isPt
            ? "Informar a cidade ativa o radar meteorológico via satélite. Copie o link de convite e compartilhe no WhatsApp do clube."
            : "Tu ciudad conecta el radar satelital meteorológico. Copia el link de invitación y compártelo en el grupo de WhatsApp de tus jugadores.",
          tip: isEn
            ? "Pro Tip: New players can join with 1 click without needing complex passwords."
            : isPt
            ? "Dica Pro: Novos membros entram com 1 clique, sem cadastros complicados."
            : "Consejo Pro: Los socios se suman al club en 1 segundo con su cuenta de Google o número de teléfono.",
        },
      ],
      quickAction: {
        label: isEn ? "Configure My Club →" : isPt ? "Configurar Meu Clube →" : "Ir a Mi Club →",
        href: "/mi-club",
      },
    },
    {
      id: "matches",
      icon: Calendar,
      title: isEn ? "2. Match Call-ups & Event Organization" : isPt ? "2. Convocações e Organização de Jogos" : "2. Convocatorias y Partidos",
      badge: isEn ? "Zero spreadsheet hassle" : isPt ? "Sem planilhas manuais" : "Adiós planillas Excel",
      desc: isEn
        ? "Organize Americano tournaments, fixed pair matches, or 5-a-side football with automated WhatsApp call-ups."
        : isPt
        ? "Organize torneios americanos, jogos de duplas ou futebol 5/7 com mensagens automáticas para WhatsApp."
        : "Crea eventos de Pádel, Tenis o Fútbol. El sistema genera el mensaje para WhatsApp con enlace directo para anotarse.",
      steps: [
        {
          number: "1",
          title: isEn ? "Create an Event" : isPt ? "Criar um Encontro" : "Crear un Encuentro",
          detail: isEn
            ? "Go to 'Events' → 'New Event'. Set date, time, available courts, and max player spots."
            : isPt
            ? "Vá em 'Eventos' → 'Novo Encontro'. Defina dia, horário, quadras disponíveis e total de vagas."
            : "Ve a 'Encuentros' → 'Nuevo Encuentro'. Define fecha, hora, pistas disponibles y cupos máximos.",
        },
        {
          number: "2",
          title: isEn ? "Share on WhatsApp" : isPt ? "Compartilhe no WhatsApp" : "Compartir en WhatsApp",
          detail: isEn
            ? "Click 'Copy for WhatsApp'. The formatted call-up contains all match details and a 1-click registration link."
            : isPt
            ? "Toque em 'Copiar para WhatsApp'. A mensagem formatada traz local, horário e link direto para inscrição."
            : "Haz clic en 'Copiar para WhatsApp'. El mensaje viene con emojis, cupos y el link directo de inscripción.",
        },
        {
          number: "3",
          title: isEn ? "Record Scores with Fair Play" : isPt ? "Registrar Placar com Fair Play" : "Cargar Resultados con Fair Play",
          detail: isEn
            ? "During or after the games, enter sets and game scores. Opponents can cross-validate from their phones to confirm accuracy."
            : isPt
            ? "Após os jogos, insira os sets ou gols. O time adversário pode confirmar pelo celular para validar a pontuação."
            : "Al terminar el juego, anota los sets o goles. El rival o compañeros pueden confirmar el resultado desde su móvil.",
          tip: isEn
            ? "Tournament Fixtures can be printed or exported to PDF using the 'Print Fixture' button."
            : isPt
            ? "A tabela de jogos pode ser impressa em PDF usando o botão 'Imprimir Fixture'."
            : "Puedes imprimir las planillas de juego o guardarlas en PDF con el botón 'Imprimir Fixture'.",
        },
      ],
      quickAction: {
        label: isEn ? "Create Event →" : isPt ? "Criar Encontro →" : "Crear Encuentro →",
        href: "/encuentros/nuevo",
      },
    },
    {
      id: "ranking",
      icon: Trophy,
      title: isEn ? "3. Dynamic Elo Ranking & Standings" : isPt ? "3. Ranking Elo Dinâmico e Tabela" : "3. Ranking Oficial & Sistema Elo",
      badge: isEn ? "Automatic rating calculation" : isPt ? "Cálculo automático" : "Puntaje inteligente",
      desc: isEn
        ? "Understand how skill rating progresses based on opponent difficulty, set ratios, and fair competition."
        : isPt
        ? "Entenda como a pontuação evolui segundo o nível dos adversários, saldo de sets e partidas disputadas."
        : "Descubre cómo funciona la tabla oficial. Cada set y game suma puntos según el nivel de los rivales.",
      steps: [
        {
          number: "1",
          title: isEn ? "1,500 Starting Base Rating" : isPt ? "1.500 Pontos Iniciais" : "1.500 Puntos Base de Inicio",
          detail: isEn
            ? "Every registered player starts with 1,500 baseline Elo points, ensuring fairness across all levels."
            : isPt
            ? "Todos os novos atletas iniciam com 1.500 pontos base, garantindo equilíbrio desde o primeiro jogo."
            : "Todos los jugadores comienzan con 1.500 puntos base oficiales para equilibrar las categorías.",
        },
        {
          number: "2",
          title: isEn ? "Reward for Beating Stronger Pairs" : isPt ? "Recompensa por Vencer Favoritos" : "Mérito por Ganar a Rivales Superiores",
          detail: isEn
            ? "Defeating higher-ranked players awards significantly higher Elo points. Losing against favorites incurs a minimal deduction."
            : isPt
            ? "Vencer duplas com maior pontuação rende muito mais pontos no ranking. Perder para favoritos desconta muito pouco."
            : "Ganar a una dupla con más Elo te premia con un salto significativo en la tabla. Caer ante los favoritos resta poco.",
        },
        {
          number: "3",
          title: isEn ? "Football League Standings" : isPt ? "Tabela de Futebol Estilo Liga" : "Tabla de Fútbol (Puntos, GF y GC)",
          detail: isEn
            ? "In football mode, standings follow official league rules: 3 points for win, 1 for draw, with goal difference tiebreakers."
            : isPt
            ? "No futebol, a tabela computa 3 pontos por vitória e 1 por empate, ordenando por saldo de gols e gols marcados."
            : "En fútbol, la tabla suma 3 puntos por victoria y 1 por empate, con desempates por diferencia de goles.",
        },
      ],
      quickAction: {
        label: isEn ? "View Standings →" : isPt ? "Ver Ranking →" : "Ver Ranking Oficial →",
        href: "/ranking",
      },
    },
    {
      id: "payments",
      icon: DollarSign,
      title: isEn ? "4. Court Splitting & Payment Reminders" : isPt ? "4. Divisão de Quadras e Cobrança" : "4. Cobros y Prorrateo de Canchas",
      badge: isEn ? "Friendly WhatsApp alerts" : isPt ? "Lembretes amigáveis" : "Cobranza sin incomodidades",
      desc: isEn
        ? "Split court rental, balls, and refreshments fairly among attendees with gentle 1-click WhatsApp reminders."
        : isPt
        ? "Divida o aluguel das quadras, bolas e consumos entre os participantes com mensagens gentis no WhatsApp."
        : "Divide el arriendo de las pistas y pelotas de forma exacta entre los asistentes y envía recordatorios amables.",
      steps: [
        {
          number: "1",
          title: isEn ? "Enter Total Court Cost" : isPt ? "Informe o Valor Total da Quadra" : "Ingresar Costo de Cancha",
          detail: isEn
            ? "Go to 'Payments', select the match or enter the rental fee. The app calculates each player's exact equal share."
            : isPt
            ? "Acesse 'Cobranças', escolha o jogo e informe o valor. O sistema calcula a cota exata por atleta."
            : "En 'Cobros', introduce el total del arriendo. El sistema divide automáticamente el costo exacto por persona.",
        },
        {
          number: "2",
          title: isEn ? "Send WhatsApp Payment Notice" : isPt ? "Enviar Lembrete por WhatsApp" : "Enviar Mensaje de Pago por WhatsApp",
          detail: isEn
            ? "Click 'WhatsApp Reminder' to generate a polite, clear breakdown including your bank transfer info."
            : isPt
            ? "Clique em 'Lembrete de Cobrança' para gerar o texto com a chave Pix ou dados bancários do organizador."
            : "Toca 'Recordatorio de Cobro' para enviar un mensaje cordial con tus datos de transferencia bancaria.",
        },
        {
          number: "3",
          title: isEn ? "Mark as Paid with 1 Click" : isPt ? "Marcar como Pago em 1 Clique" : "Registrar Pago con 1 Clic",
          detail: isEn
            ? "As bank transfers arrive, check off players to keep your event balance at $0 pending."
            : isPt
            ? "Conforme os pagamentos caem na conta, dê baixa no sistema para zerar as pendências."
            : "A medida que te transfieren, marcas al jugador como pagado para mantener las cuentas claras.",
        },
      ],
      quickAction: {
        label: isEn ? "Manage Payments →" : isPt ? "Gerenciar Cobranças →" : "Gestionar Cobros →",
        href: "/cobros",
      },
    },
    {
      id: "ai",
      icon: Sparkles,
      title: isEn ? "5. AI Sports Secretary (Parryn) & Live Weather" : isPt ? "5. Secretário Esportivo IA (Parryn) e Clima" : "5. Secretario IA (Parryn) & Radar Climático",
      badge: isEn ? "Smart assistant 24/7" : isPt ? "Assistente inteligente 24/7" : "Tu copiloto organizador",
      desc: isEn
        ? "Automate operations, schedule rain contingencies, and query sports rules with your intelligent assistant."
        : isPt
        ? "Automatize operações, consulte regras e acione planos de contingência para chuva com IA."
        : "Pídele a Parryn que redacte llamados, arme equipos equilibrados o revise el satélite ante amenaza de lluvia.",
      steps: [
        {
          number: "1",
          title: isEn ? "Ask Anything in Plain Language" : isPt ? "Pergunte em Linguagem Natural" : "Habla en Lenguaje Natural",
          detail: isEn
            ? "Click the floating 🤖 button or open 'Secretary'. Say: 'Draft a call-up for Friday 8pm for 12 players across 3 courts' and Parryn will create it."
            : isPt
            ? "Toque no botão 🤖 ou abra 'Secretaria'. Peça: 'Crie um jogo sexta às 20h para 14 jogadores' e o Parryn cria tudo."
            : "Abre 'Secretaría' o toca el botón 🤖 flotante. Pídele: 'Hazme una convocatoria para el viernes a las 20:00 para 12 jugadores' y Parryn la creará.",
        },
        {
          number: "2",
          title: isEn ? "Satellite Weather Contingency" : isPt ? "Contingência Climática por Satélite" : "Radar Satelital y Alertas de Lluvia",
          detail: isEn
            ? "Parryn monitors real-time rain probability and wind speed, advising when to shift matches to covered courts."
            : isPt
            ? "O Parryn monitora chuva e vento em tempo real, sugerindo quando transferir as partidas para quadras cobertas."
            : "Parryn evalúa viento y riesgo de precipitaciones en vivo, recomendando con anticipación usar pistas techadas.",
        },
        {
          number: "3",
          title: isEn ? "Instant WhatsApp Chronicles" : isPt ? "Crônicas Esportivas para WhatsApp" : "Crónicas Épicas de la Jornada",
          detail: isEn
            ? "After a tournament, ask Parryn for a matchday summary praising the champions and sportsmanship."
            : isPt
            ? "Após o torneio, peça ao Parryn uma crônica para parabenizar os campeões no grupo do WhatsApp."
            : "Al terminar una fecha, pídele un resumen de la jornada para felicitar a los campeones en el grupo del club.",
        },
      ],
      quickAction: {
        label: isEn ? "Open Parryn AI →" : isPt ? "Abrir Parryn IA →" : "Abrir Secretario Parryn →",
        href: "/secretario",
      },
    },
  ];

  const filteredSections = sections.filter((s) => {
    const matchesCat = activeCategory === "all" || s.id === activeCategory;
    const matchesSearch =
      searchTerm === "" ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30 p-6 sm:p-10 shadow-lg">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold">
            <BookOpen className="w-4 h-4" />
            <span>{isEn ? "Parryn Sport Hub User Guide" : isPt ? "Manual de Uso do Parryn Sport Hub" : "Manual de Uso · Parryn Sport Hub IA"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {isEn
              ? "Everything you need to master your sports club"
              : isPt
              ? "Tudo o que você precisa para dominar a gestão do seu clube"
              : "Todo lo que necesitas para gestionar tu club sin complicaciones"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            {isEn
              ? "Simple, step-by-step instructions to organize matches, automate WhatsApp call-ups, calculate Elo points, and split court fees in minutes."
              : isPt
              ? "Instruções simples e diretas para organizar jogos, automatizar convocações no WhatsApp, atualizar o ranking e dividir os custos das quadras."
              : "Guía paso a paso para organizar convocatorias de Pádel, Tenis y Fútbol por WhatsApp, actualizar el ranking oficial y dividir pagos de canchas sin fricción."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/secretario"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEn ? "Ask Parryn AI directly" : isPt ? "Pergunte ao Parryn IA" : "Consultar a Parryn IA"}</span>
            </Link>
            <Link
              href="/mi-club"
              className="inline-flex items-center gap-2 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-border transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>{isEn ? "Club Settings" : isPt ? "Configuração do Clube" : "Configurar mi Club"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isEn ? "Search instructions..." : isPt ? "Buscar no manual..." : "Buscar tema o función..."}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* 3. Secciones del Manual */}
      <div className="space-y-6">
        {filteredSections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.id}
              id={sec.id}
              className="bg-card border border-border/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span>{sec.title}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{sec.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
                    {sec.badge}
                  </span>
                  {sec.quickAction && (
                    <Link
                      href={sec.quickAction.href}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-2"
                    >
                      <span>{sec.quickAction.label}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sec.steps.map((st) => (
                  <div
                    key={st.number}
                    className="flex flex-col justify-between bg-muted/20 border border-border/70 rounded-xl p-4 space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary font-black text-xs flex items-center justify-center">
                          {st.number}
                        </span>
                        <h3 className="font-bold text-sm text-foreground">{st.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{st.detail}</p>
                    </div>

                    {st.tip && (
                      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-primary font-medium">
                        {st.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Cheat Sheet de WhatsApp */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-foreground font-bold text-base">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          <span>{isEn ? "WhatsApp Call-up Template (Ready to Copy)" : isPt ? "Modelo de Convocação WhatsApp" : "Plantilla de Convocatoria WhatsApp"}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isEn
            ? "This is the clean format generated when you share events with your players:"
            : isPt
            ? "Este é o formato automático gerado para enviar aos grupos de jogadores:"
            : "Así es como tus jugadores reciben las convocatorias oficiales del club:"}
        </p>

        <div className="bg-background/80 border border-border rounded-xl p-4 font-mono text-xs text-foreground/90 whitespace-pre-line relative">
          {isEn
            ? `🎾 *MATCH CALL-UP: SATURDAY PADEL TOURNAMENT*
📍 *Location:* Club Padel Central (3 courts)
⏰ *Time:* Saturday at 19:00 hrs
👥 *Spots:* Max 12 players (continuous rotation)

👉 *Sign up with 1-click and secure your spot here:*
https://ais-dev-vfsatxp7kgzrivkdaexirs-102184534662.us-east1.run.app/encuentros/1

_Organized with Parryn Sport Hub AI_`
            : isPt
            ? `⚽ *CONVOCAÇÃO: PELADA DE FUTEBOL 7*
📍 *Local:* Arena Central (Campo sintético)
⏰ *Horário:* Sábado às 20:00 hrs
👥 *Vagas:* Máximo 14 jogadores (2 times de 7)

👉 *Garanta sua vaga com 1 clique aqui:*
https://ais-dev-vfsatxp7kgzrivkdaexirs-102184534662.us-east1.run.app/encuentros/1

_Organizado com Parryn Sport Hub IA_`
            : `🎾 *CONVOCATORIA: TORNEO AMERICANO DE PÁDEL*
📍 *Lugar:* Club Pádel Central (3 canchas de cristal)
⏰ *Horario:* Sábado a las 19:00 hrs
👥 *Cupos:* Máximo 12 jugadores (Punto de oro sin esperas)

👉 *Inscríbete y asegura tu cupo con 1 clic aquí:*
https://ais-dev-vfsatxp7kgzrivkdaexirs-102184534662.us-east1.run.app/encuentros/1

_Organizado con Parryn Sport Hub IA_`}

          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleCopy(
                  isEn
                    ? "🎾 *MATCH CALL-UP: SATURDAY PADEL TOURNAMENT*\n📍 *Location:* Club Padel Central..."
                    : "🎾 *CONVOCATORIA: TORNEO AMERICANO DE PÁDEL*\n📍 *Lugar:* Club Pádel Central...",
                  "whatsapp-template"
                )
              }
              className="text-xs gap-1.5 h-8 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              {copiedText === "whatsapp-template" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isEn ? "Copied!" : isPt ? "Copiado!" : "¡Copiado!"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? "Copy Template" : isPt ? "Copiar Modelo" : "Copiar Plantilla"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
