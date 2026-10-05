import React, { Component, ErrorInfo, ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
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
import { SecretarioParryn } from "@/pages/SecretarioParryn";

import { LanguageProvider } from "./context/LanguageContext";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-red-400">Aviso del Sistema</h2>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || "Ocurrió un error al cargar la vista."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("padel_auth_user");
                    localStorage.removeItem("padel_auth_token");
                  } catch {}
                  window.location.href = "/";
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Restablecer Sesión
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
        <Route path="/cobros" component={Cobros} />
        <Route path="/secretario" component={SecretarioParryn} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/vincular" component={VincularJugador} />
        <Route path="/admin" component={Admin} />
        <Route path="/club/:slug" component={PublicClub} />
        <Route path="/c/:slug" component={PublicClub} />
        <Route path="/:slug" component={PublicClub} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
