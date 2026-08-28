import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
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
const CLUB_ENTRY_QUERY = "clubEntry";
const GLOBAL_CONTEXT_QUERY = "global";

function hasClubEntryQuery(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(CLUB_ENTRY_QUERY) === "1";
}

function hasExplicitGlobalQuery(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(GLOBAL_CONTEXT_QUERY) === "1";
}

function ContextGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [globalContextReady, setGlobalContextReady] = useState(true);
  const pathname = location.split("?")[0] || "/";
  const clubEntry = hasClubEntryQuery();
  const explicitGlobal = hasExplicitGlobalQuery();

  useEffect(() => {
    if (pathname !== "/") {
      setGlobalContextReady(true);
      return;
    }

    if (clubEntry) {
      setGlobalContextReady(true);
      return;
    }

    if (!explicitGlobal) {
      // A Super Admin may be operating inside a selected club. Navigating to
      // Dashboard ("/") is normal internal navigation and must NOT destroy
      // that context. Returning to the global Super Admin panel is explicit.
      setGlobalContextReady(true);
      return;
    }

    let cancelled = false;
    setGlobalContextReady(false);

    fetch("/api/clubs/active/clear", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .catch((error) => console.error("Error restableciendo contexto global:", error))
      .finally(() => {
        if (!cancelled) setGlobalContextReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [location, pathname, clubEntry, explicitGlobal]);

  if (pathname === "/" && !globalContextReady) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Preparando tu panel...</div>;
  }

  return <>{children}</>;
}

function ClubEntryContext() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The server has already selected the club in the httpOnly cookie. Remove
    // all cached club-facing data before mounting Dashboard so React Query
    // cannot render a previous global context while the new club is loading.
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "/api/auth/user",
    });

    queryClient.invalidateQueries().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Cargando el club...</div>;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function Router() {
  const [location] = useLocation();
  const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);
  const pathname = location.split("?")[0] || "/";
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams(location.split("?")[1] || "");
  const isClubEntry = pathname === "/" && params.get(CLUB_ENTRY_QUERY) === "1";
  const isPublicClubPath = /^\/[^/]+$/.test(pathname) && !reservedSingleSegmentRoutes.has(pathname);

  if (isClubEntry) {
    return <ClubEntryContext />;
  }

  if (isPublicClubPath) {
    return <PublicClub />;
  }

  return (
    <ContextGuard>
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
    </ContextGuard>
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
