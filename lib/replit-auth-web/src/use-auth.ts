import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export function updateStoredUser(updatedUser: Partial<AuthUser>) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("padel_auth_user");
    let current = stored ? JSON.parse(stored) : {};
    if (typeof current === "string") current = JSON.parse(current);
    const merged = { ...current, ...updatedUser };
    localStorage.setItem("padel_auth_user", JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("padel_auth_update", { detail: merged }));
  } catch (err) {
    console.error("Error updating stored user:", err);
  }
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("padel_auth_user");
      if (!stored) return null;
      let parsed = JSON.parse(stored);
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return null;
        }
      }
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!user);

  useEffect(() => {
    let cancelled = false;

    const handleAuthUpdate = () => {
      try {
        const stored = localStorage.getItem("padel_auth_user");
        if (stored) {
          let parsed = JSON.parse(stored);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          if (typeof parsed === "object" && parsed !== null) {
            setUser(parsed);
          }
        }
      } catch {}
    };
    window.addEventListener("padel_auth_update", handleAuthUpdate);

    const token = typeof window !== "undefined" ? localStorage.getItem("padel_auth_token") : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch("/api/auth/user", { credentials: "include", headers })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          if (data.user) {
            setUser(data.user);
            try {
              localStorage.setItem("padel_auth_user", JSON.stringify(data.user));
            } catch {}
          } else {
            // Keep existing localStorage user if no server user
            const stored = localStorage.getItem("padel_auth_user");
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed) setUser(parsed);
              } catch {}
            } else {
              setUser(null);
            }
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const stored = localStorage.getItem("padel_auth_user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed) setUser(parsed);
            } catch {}
          }
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.removeEventListener("padel_auth_update", handleAuthUpdate);
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent("/")}`;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("padel_auth_user");
      localStorage.removeItem("padel_auth_token");
    } catch {}
    setUser(null);
    window.location.reload();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
