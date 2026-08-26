import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Jugadores from "@/pages/Jugadores";
import NuevoJugador from "@/pages/NuevoJugador";
import JugadorDetalle from "@/pages/JugadorDetalle";
import Partidos from "@/pages/Partidos";
import NuevoPartido from "@/pages/NuevoPartido";
import EditarJugador from "@/pages/EditarJugador";
import EditarPartido from "@/pages/EditarPartido";
import Ranking from "@/pages/Ranking";
import Parejas from "@/pages/Parejas";
import ParejaDetalle from "@/pages/ParejaDetalle";
import { Encuentros } from "@/pages/Encuentros";
import { EncuentroDetalle } from "@/pages/EncuentroDetalle";
import { NuevoEncuentro } from "@/pages/NuevoEncuentro";
import { VincularJugador } from "@/pages/VincularJugador";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { Onboarding } from "@/pages/Onboarding";
import Cobros from "@/pages/Cobros";
import PublicClub from "@/pages/PublicClub";
import { LanguageProvider } from "./context/LanguageContext";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

const PUBLIC_CLUB_RETURN_TO_KEY = "padel_tracker_public_club_return_to";

function normalizePublicClubPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  const normalized = value.replace(/\/+$/, "") || "/";
  if (!/^\/[^/]+$/.test(normalized)) return null;
  const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);
  if (reservedSingleSegmentRoutes.has(normalized)) return null;
  return normalized;
}

function Router() {
  const [location, navigate] = useLocation();
  const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);
  const isPublicClubPath = /^\/[^/]+$/.test(location) && !reservedSingleSegmentRoutes.has(location);

  useEffect(() => {
    if (location !== "/") return;

    const returnTo = normalizePublicClubPath(
      localStorage.getItem(PUBLIC_CLUB_RETURN_TO_KEY) ||
      sessionStorage.getItem(PUBLIC_CLUB_RETURN_TO_KEY),
    );
    if (!returnTo) return;

    localStorage.removeItem(PUBLIC_CLUB_RETURN_TO_KEY);
    sessionStorage.removeItem(PUBLIC_CLUB_RETURN_TO_KEY);
    navigate(returnTo);
  }, [location, navigate]);

  if (isPublicClubPath) {
    return <Layout><PublicClub /></Layout>;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/jugadores" component={Jugadores} />
        <Route path="/jugadores/nuevo" component={NuevoJugador} />
        <Route path="/jugadores/:id/editar" component={EditarJugador} />
        <Route path="/jugadores/:id" component={JugadorDetalle} />
        <Route path="/partidos" component={Partidos} />
        <Route path="/partidos/nuevo" component={NuevoPartido} />
        <Route path="/partidos/:id/editar" component={EditarPartido} />
        <Route path="/ranking" component={Ranking} />
        <Route path="/parejas" component={Parejas} />
        <Route path="/parejas/:player1Id/:player2Id" component={ParejaDetalle} />
        <Route path="/encuentros" component={Encuentros} />
        <Route path="/encuentros/nuevo" component={NuevoEncuentro} />
        <Route path="/encuentros/:id" component={EncuentroDetalle} />
        <Route path="/cobros" component={Cobros} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/vincular" component={VincularJugador} />
        <Route path="/admin" component={Admin} />
        <Route path="/:slug" component={PublicClub} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
