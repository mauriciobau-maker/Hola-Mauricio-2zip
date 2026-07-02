import { Switch, Route, Router as WouterRouter } from "wouter";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
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
        <Route path="/vincular" component={VincularJugador} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;