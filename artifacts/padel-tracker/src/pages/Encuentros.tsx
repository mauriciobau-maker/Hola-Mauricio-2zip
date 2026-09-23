import { useListEncuentros } from "@workspace/api-client-react";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { format, isPast, isValid } from "date-fns";
import type { Locale } from "date-fns";
import { es, enUS, ptBR } from "date-fns/locale";
import { useLanguage, Language } from "@/context/LanguageContext";

const LOCALES = {
  es,
  en: enUS,
  pt: ptBR,
};

const TRANSLATIONS = {
  es: {
    title: "Encuentros",
    new: "Nuevo",
    create: "Crear",
    noEncuentros: "No hay encuentros todavía.",
    createFirst: "Crea el primero para organizar un partido.",
    upcoming: "Próximos",
    past: "Pasados",
    maxSpots: (num: number) => `Máx. ${num}`,
  },
  en: {
    title: "Matches & Events",
    new: "New",
    create: "Create",
    noEncuentros: "No matches yet.",
    createFirst: "Create the first one to organize a match.",
    upcoming: "Upcoming",
    past: "Past",
    maxSpots: (num: number) => `Max ${num}`,
  },
  pt: {
    title: "Encontros",
    new: "Novo",
    create: "Criar",
    noEncuentros: "Nenhum encontro ainda.",
    createFirst: "Crie o primeiro para organizar uma partida.",
    upcoming: "Próximos",
    past: "Passados",
    maxSpots: (num: number) => `Máx. ${num}`,
  },
};

type NormalizedEncuentro = {
  id: string | number | undefined;
  title: string;
  dateTime: string | number | Date | undefined;
  location: string;
  maxSpots: number | null;
};

// 🛠️ Función utilitaria para normalizar campos heterogéneos de la API
function normalizeEncuentro(raw: any): NormalizedEncuentro {
  const item = raw?.encuentro ?? raw?.data ?? raw?.item ?? raw ?? {};

  return {
    id:
      item?.id ??
      item?._id ??
      item?.encuentroId ??
      item?.id_encuentro ??
      raw?.id,

    title:
      item?.title ??
      item?.titulo ??
      item?.nombre ??
      item?.name ??
      raw?.title ??
      "Encuentro sin título",

    dateTime:
      item?.dateTime ??
      item?.fecha ??
      item?.date ??
      item?.fechaHora ??
      item?.date_time ??
      raw?.dateTime,

    location:
      item?.location ??
      item?.ubicacion ??
      item?.lugar ??
      raw?.location ??
      "Lugar a confirmar",

    maxSpots:
      item?.maxSpots ??
      item?.max_spots ??
      item?.cupos ??
      item?.maxJugadores ??
      raw?.maxSpots ??
      null,
  };
}

export function Encuentros() {
  const { data: rawEncuentros, isLoading } = useListEncuentros();
  const { user, login } = useAuth();
  const [, navigate] = useLocation();

  const { language } = useLanguage();
  const lang = (language as Language) || "es";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.es;
  const dateLocale = LOCALES[lang] || es;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Normalizamos todos los elementos recibidos.
  const rawList: any[] = Array.isArray(rawEncuentros)
    ? rawEncuentros
    : ((rawEncuentros as any)?.encuentros ??
      (rawEncuentros as any)?.data ??
      []);

  // Tipado explícito para evitar que TypeScript infiera any[].
  const encuentros: NormalizedEncuentro[] = rawList.map(
    (raw: any): NormalizedEncuentro => normalizeEncuentro(raw),
  );

  const upcoming: NormalizedEncuentro[] = encuentros.filter(
    (e: NormalizedEncuentro) => {
      if (!e.dateTime) return true;

      const d = new Date(e.dateTime);

      return isValid(d) ? !isPast(d) : true;
    },
  );

  const past: NormalizedEncuentro[] = encuentros.filter(
    (e: NormalizedEncuentro) => {
      if (!e.dateTime) return false;

      const d = new Date(e.dateTime);

      return isValid(d) && isPast(d);
    },
  );

  const handleCardClick = (id: string | number | undefined) => {
    if (id !== undefined && id !== null) {
      navigate(`/encuentros/${id}`);
    } else {
      console.warn(
        "No se pudo obtener un ID válido para navegar al encuentro:",
        id,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>

        {user ? (
          <Button
            size="sm"
            onClick={() => navigate("/encuentros/nuevo")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t.new}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={login}
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            {t.create}
          </Button>
        )}
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t.noEncuentros}</p>
          <p className="text-sm mt-1">{t.createFirst}</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t.upcoming}
          </h2>

          {upcoming.map(
            (e: NormalizedEncuentro, index: number) => (
              <EncuentroCard
                key={e.id ?? `upcoming-${index}`}
                encuentro={e}
                onClick={() => handleCardClick(e.id)}
                dateLocale={dateLocale}
                t={t}
              />
            ),
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t.past}
          </h2>

          {past.map(
            (e: NormalizedEncuentro, index: number) => (
              <EncuentroCard
                key={e.id ?? `past-${index}`}
                encuentro={e}
                onClick={() => handleCardClick(e.id)}
                faded
                dateLocale={dateLocale}
                t={t}
              />
            ),
          )}
        </section>
      )}
    </div>
  );
}

function EncuentroCard({
  encuentro,
  onClick,
  faded = false,
  dateLocale,
  t,
}: {
  encuentro: NormalizedEncuentro;
  onClick: () => void;
  faded?: boolean;
  dateLocale: Locale;
  t: typeof TRANSLATIONS.es;
}) {
  const date = encuentro.dateTime
    ? new Date(encuentro.dateTime)
    : null;

  const formattedDate =
    date && isValid(date)
      ? format(date, "EEEE d MMM, HH:mm", {
          locale: dateLocale,
        })
      : encuentro.dateTime
        ? String(encuentro.dateTime)
        : "Fecha a confirmar";

  return (
    <Card
      className={`cursor-pointer hover:border-primary/50 transition-all ${
        faded ? "opacity-60" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">
              {encuentro.title}
            </CardTitle>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formattedDate}
              </span>

              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {encuentro.location}
              </span>

              {encuentro.maxSpots !== null &&
                encuentro.maxSpots !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t.maxSpots(encuentro.maxSpots)}
                  </span>
                )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
      </CardHeader>
    </Card>
  );
}
