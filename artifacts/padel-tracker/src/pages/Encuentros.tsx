import { useListEncuentros } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, Plus, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";

export function Encuentros() {
  const { data: encuentros, isLoading } = useListEncuentros();
  const { user, login } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const upcoming = encuentros?.filter((e) => !isPast(new Date(e.dateTime))) ?? [];
  const past = encuentros?.filter((e) => isPast(new Date(e.dateTime))) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encuentros</h1>
        {user ? (
          <Button
            size="sm"
            onClick={() => navigate("/encuentros/nuevo")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={login} className="gap-2 border-white/20 text-white hover:bg-white/10">
            <Plus className="h-4 w-4" />
            Crear
          </Button>
        )}
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No hay encuentros todavía.</p>
          <p className="text-sm mt-1">Crea el primero para organizar un partido.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Próximos</h2>
          {upcoming.map((e) => (
            <EncuentroCard key={e.id} encuentro={e} onClick={() => navigate(`/encuentros/${e.id}`)} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pasados</h2>
          {past.map((e) => (
            <EncuentroCard key={e.id} encuentro={e} onClick={() => navigate(`/encuentros/${e.id}`)} faded />
          ))}
        </section>
      )}
    </div>
  );
}

function EncuentroCard({
  encuentro,
  onClick,
  faded = false,
}: {
  encuentro: { id: number; title: string; dateTime: string; location: string; maxSpots?: number | null };
  onClick: () => void;
  faded?: boolean;
}) {
  const date = new Date(encuentro.dateTime);

  return (
    <Card
      className={`cursor-pointer hover:border-primary/50 transition-all ${faded ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{encuentro.title}</CardTitle>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(date, "EEEE d MMM, HH:mm", { locale: es })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {encuentro.location}
              </span>
              {encuentro.maxSpots && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Máx. {encuentro.maxSpots}
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
