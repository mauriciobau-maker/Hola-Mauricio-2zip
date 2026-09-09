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
import EditarJugador from "@/pages/EditarJugadorV2";
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
const ACTIVE_CLUB_COOKIE = "padel_tracker_active_club_id";

function getActiveClubIdFromCookie(): number | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ACTIVE_CLUB_COOKIE}=`));
  if (!match) return null;
  const value = Number(decodeURIComponent(match.slice(ACTIVE_CLUB_COOKIE.length + 1)));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function installActiveClubContextFetch(): void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  const marker = "__padelTrackerActiveClubFetchInstalled";
  const globalWindow = window as unknown as Window & Record<string, boolean | undefined>;
  if (globalWindow[marker]) return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    let url: URL;
    try { url = new URL(rawUrl, window.location.origin); } catch { return originalFetch(input, init); }

    const isApiRequest = url.origin === window.location.origin && url.pathname.startsWith("/api/");
    const excluded = url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/login") || url.pathname.startsWith("/api/logout") || url.pathname.startsWith("/api/clubs/public/");
    const activeClubId = getActiveClubIdFromCookie();
    if (!isApiRequest || excluded || !activeClubId || url.searchParams.has("clubId")) {
      return originalFetch(input, init);
    }

    url.searchParams.set("clubId", String(activeClubId));
    if (typeof input === "string" || input instanceof URL) return originalFetch(url.toString(), init);
    return originalFetch(new Request(url.toString(), input), init);
  };

  globalWindow[marker] = true;
}

installActiveClubContextFetch();

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
    if (pathname !== "/") { setGlobalContextReady(true); return; }
    if (clubEntry) { setGlobalContextReady(true); return; }
    if (!explicitGlobal) { setGlobalContextReady(true); return; }

    let cancelled = false;
    setGlobalContextReady(false);
    fetch("/api/clubs/active/clear", { method: "POST", credentials: "include", headers: { Accept: "application/json" } })
      .catch((error) => console.error("Error restableciendo contexto global:", error))
      .finally(() => { if (!cancelled) setGlobalContextReady(true); });
    return () => { cancelled = true; };
  }, [location, pathname, clubEntry, explicitGlobal]);

  if (pathname === "/" && !globalContextReady) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Preparando tu panel...</div>;
  return <>{children}</>;
}

function ClubEntryContext() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "/api/auth/user" });
    queryClient.invalidateQueries().finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);
  if (!ready) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Cargando el club...</div>;
  return <Layout><Dashboard /></Layout>;
}

function Router() {
  const [location] = useLocation();
  const reservedSingleSegmentRoutes = new Set(["/admin", "/onboarding", "/vincular", "/jugadores", "/partidos", "/ranking", "/parejas", "/encuentros", "/cobros"]);
  const pathname = location.split("?")[0] || "/";
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams(location.split("?")[1] || "");
  const isClubEntry = pathname === "/" && params.get(CLUB_ENTRY_QUERY) === "1";
  const isPublicClubPath = /^\/[^/]+$/.test(pathname) && !reservedSingleSegmentRoutes.has(pathname);

  if (isClubEntry) return <ClubEntryContext />;
  if (isPublicClubPath) return <PublicClub />;

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
