import { useState, useEffect, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

// Misma forma que exportaba @workspace/replit-auth-web — así ninguna de
// las pantallas que ya usan useAuth() necesita cambiar su propio código,
// solo de dónde importan el hook.
export interface AuthUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  playerId?: number | null;
  isAdmin?: number;
  isClubAdmin?: number;
  clubId?: number | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const { isSignedIn, isLoaded } = useUser();
  const clerk = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return; // Clerk todavía no resolvió si hay sesión

    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Autenticado según Clerk: buscamos el club/rol/jugador asociado en
    // nuestra propia base (authMiddleware ya creó/vinculó esa fila).
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isLoaded]);

  const login = useCallback(() => {
    clerk.openSignIn();
  }, [clerk]);

  const logout = useCallback(() => {
    clerk.signOut();
  }, [clerk]);

  return {
    user,
    isLoading: isLoading || !isLoaded,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
