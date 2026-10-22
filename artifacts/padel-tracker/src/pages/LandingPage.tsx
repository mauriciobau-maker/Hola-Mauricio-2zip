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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
              Funcionalidades
            </a>
            <a href="#deportes" className="hover:text-foreground transition-colors">
              Pádel, Fútbol & Tenis
            </a>
            <a href="#precios" className="hover:text-foreground transition-colors">
              Planes y Precios
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              Preguntas Frecuentes
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/crear-club"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              Crear mi Club Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/40">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Software Oficial de Organización Deportiva con Inteligencia Artificial
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Organiza tus Clubes de <span className="text-primary">Pádel, Fútbol y Tenis</span> sin el caos de WhatsApp
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Automatiza convocatorias, balancea partidos con ranking Elo o tablas oficiales, anticipa la lluvia con alertas meteorológicas por satélite y cobra las cuotas a tiempo sin morosidad.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/crear-club"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Comenzar Prueba Gratis (14 Días)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto bg-card hover:bg-muted border border-border text-foreground font-semibold text-sm px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Ver Demo Interactiva</span>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Sin tarjeta de crédito requerida
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Listo en menos de 2 minutos
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" /> 100% adaptable a Pádel, Fútbol y Tenis
            </span>
          </div>
        </div>

        {/* 3. Interactive Teaser Cards Mockup */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Pádel & Elo */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  🎾 Pádel & Americanas
                </span>
                <span className="text-[11px] font-bold text-primary">Ranking Elo</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Cruces Equilibrados Automáticos
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El sistema evalúa el historial y el nivel Elo de cada jugador para armar parejas balanceadas y evitar partidos desnivelados.
              </p>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span>Pareja A (Elo 1350)</span>
                  <span className="text-muted-foreground">vs</span>
                  <span>Pareja B (Elo 1340)</span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Paridad estimada: 98% (Partido de alta competitividad)
                </div>
              </div>
            </div>

            {/* Card 2: Alerta Climática */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  🌦️ Satélite en Tiempo Real
                </span>
                <span className="text-[11px] font-bold text-amber-500">Alerta de Lluvia</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Cero Suspensiones de Último Minuto
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Monitorea el pronóstico por hora en la sede de tu club. Si hay riesgo de lluvia, reubica de inmediato turnos a canchas techadas o avisa por WhatsApp.
              </p>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Santiago de Chile (18°C)</span>
                  <span className="text-[11px] bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                    Prob. 90% Lluvia
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Recomendación: Mover turnos a Pistas 1 y 2 (Techadas).
                </div>
              </div>
            </div>

            {/* Card 3: Fútbol & Cobros */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  ⚽ Fútbol & Finanzas
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Cuentas Claras</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Cobros y Prorrateos Automatizados
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Divide el arriendo de la cancha entre los 10 o 14 jugadores, registra comprobantes de transferencia y envía recordatorios amables con 1 clic.
              </p>
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span>Cancha Fútbol 7 ($42.000)</span>
                  <span className="font-bold text-foreground">$3.000 c/u</span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ 12/14 Confirmados con comprobante
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
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground">10 hrs</div>
              <p className="text-xs text-muted-foreground font-medium">Ahorradas por semana en WhatsApp</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">0</div>
              <p className="text-xs text-muted-foreground font-medium">Canchas vacías por desorganización</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-foreground">98%</div>
              <p className="text-xs text-muted-foreground font-medium">Cobros al día sin deudores morosos</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary">3 en 1</div>
              <p className="text-xs text-muted-foreground font-medium">Pádel, Tenis y Fútbol en una sola app</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Funcionalidades Detalladas */}
      <section id="beneficios" className="py-16 md:py-24 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Plataforma Completa
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Todo lo que necesitas para profesionalizar tu club
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Diseñado pensando tanto en el administrador que gestiona canchas como en el jugador que solo quiere saber a qué hora juega y contra quién.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">Convocatorias Rápidas para WhatsApp</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Redacta invitaciones automáticas con fecha, canchas, cupos y valor por persona. Los jugadores se inscriben directamente desde su teléfono.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">Validación Cruzada Fair Play</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Los resultados anotados por un jugador quedan pendientes hasta que un rival o el delegado los confirme. Tablas limpias y sin controversias.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CloudRain className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">Semáforo Meteorológico Satelital</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Integración directa con satélite meteorológico para anticipar lluvia, viento y temperatura. El sistema sugiere reubicar partidos a pistas techadas con 2 horas de antelación.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-foreground">Control de Cuotas y Arriendos</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Seguimiento de transferencias bancarias, saldo a favor o deuda por jugador y exportación de resúmenes financieros del club.
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
              Precios Transparentes
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Comienza gratis, escala cuando tu club crezca
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Todos los planes incluyen 14 días de prueba con todas las funciones desbloqueadas. Cancela en cualquier momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan 1: Prueba */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Prueba Inicial</h3>
                  <p className="text-xs text-muted-foreground">Para probar con tu grupo o liga</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground">/ 14 días</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Hasta 20 jugadores
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> 1 Deporte activo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Convocatorias para WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Ranking y Tabla oficial
                  </li>
                </ul>
              </div>
              <Link
                href="/crear-club"
                className="w-full text-center py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground font-semibold text-xs transition-all"
              >
                Comenzar Gratis
              </Link>
            </div>

            {/* Plan 2: Club Pro (Destacado) */}
            <div className="bg-card border-2 border-primary rounded-2xl p-6 flex flex-col justify-between space-y-6 relative shadow-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider">
                MÁS POPULAR
              </span>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Club Pro</h3>
                  <p className="text-xs text-muted-foreground">Para clubes medianos y organizadores habituales</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">$29.000</span>
                  <span className="text-xs text-muted-foreground">CLP (~$30 USD) / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-foreground/90">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Jugadores ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Hasta 4 canchas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Asistente Parryn para convocatorias
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Módulo completo de cobros y deudas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Alertas climáticas en tiempo real
                  </li>
                </ul>
              </div>
              <Link
                href="/crear-club"
                className="w-full text-center py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm transition-all"
              >
                Elegir Club Pro
              </Link>
            </div>

            {/* Plan 3: Complejo Multi-Sport */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Complejo Multi-Sport</h3>
                  <p className="text-xs text-muted-foreground">Para centros deportivos y ligas de gran escala</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">$59.000</span>
                  <span className="text-xs text-muted-foreground">CLP (~$60 USD) / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Canchas y deportes ilimitados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Pádel, Tenis y Fútbol simultáneos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Múltiples administradores y roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" /> Soporte prioritario por WhatsApp
                  </li>
                </ul>
              </div>
              <Link
                href="/crear-club"
                className="w-full text-center py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground font-semibold text-xs transition-all"
              >
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="py-16 md:py-24 border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Preguntas Frecuentes
            </h2>
            <p className="text-sm text-muted-foreground">
              Respuestas rápidas a las dudas comunes de los organizadores
            </p>
          </div>

          <div className="space-y-3">
            {[
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
            ].map((item, idx) => (
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
            ¿Listo para llevar la organización de tu club al siguiente nivel?
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Únete a los organizadores que ya no pierden tiempo persiguiendo confirmaciones en WhatsApp ni discutiendo cobros.
          </p>
          <div className="pt-2">
            <Link
              href="/crear-club"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-8 py-3.5 rounded-xl shadow-md transition-all"
            >
              <span>Crear mi Club Gratis Ahora</span>
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
            <span>© {new Date().getFullYear()} — Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Acceder al Club
            </Link>
            <Link href="/crear-club" className="hover:text-foreground transition-colors">
              Registro de Clubes
            </Link>
            <a href="mailto:contacto@parrynsport.com" className="hover:text-foreground transition-colors">
              Soporte y Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
