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

function clearActiveClubCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "padel_tracker_active_club_id=; Max-Age=0; path=/";
}

function ContextGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [globalContextReady, setGlobalContextReady] = useState(false);
  const pathname = location.split("?")[0] || "/";

  useEffect(() => {
    if (pathname !== "/") {
      setGlobalContextReady(true);
      return;
    }

    const params = new URLSearchParams(location.split("?")[1] || "");
    if (params.get(CLUB_ENTRY_QUERY) === "1") {
      // Preserve the selected club for this explicit entry only. The marker is
      // immediately removed from the URL so a later normal visit is global.
      window.history.replaceState({}, "", "/");
      setGlobalContextReady(true);
      return;
    }

    let cancelled = false;
    setGlobalContextReady(false);
    clearActiveClubCookie();
    localStorage.removeItem("padel_tracker_public_club_return_to");
    sessionStorage.removeItem("padel_tracker_public_club_return_to");

    // The active-club cookie is httpOnly, so the browser cannot clear it with
    // document.cookie. Clear it server-side before mounting Dashboard; otherwise
    // a Super Admin returning to "/" could still inherit the last visited club.
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
  }, [location, pathname]);

  if (pathname === "/" && !globalContextReady) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Preparando tu panel...</div>;
  }

  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();
  const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);
  const pathname = location.split("?")[0] || "/";
  const isPublicClubPath = /^\/[^/]+$/.test(pathname) && !reservedSingleSegmentRoutes.has(pathname);

  // Public club pages must not mount Layout/AuthButton/useAuth. Visiting a
  // public club is intentionally anonymous; authentication happens only when
  // the user explicitly presses "Entrar al club".
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
