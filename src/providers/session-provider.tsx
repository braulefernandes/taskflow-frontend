"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from "@/lib/auth-token-storage";
import type { LoginFormValues } from "@/schemas/login";
import { authMeQueryKey, getCurrentSession, loginAccount, logoutSession } from "@/services/auth";
import type { AuthUser, MeResponse } from "@/types/auth";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  status: SessionStatus;
  session: MeResponse | null;
  signIn: (values: LoginFormValues) => Promise<MeResponse>;
  signOut: () => Promise<void>;
  clearSession: () => void;
  updateSessionUser: (user: AuthUser) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>(() =>
    getStoredAccessToken() ? "loading" : "unauthenticated",
  );
  const [session, setSession] = useState<MeResponse | null>(null);

  const clearSession = useCallback(() => {
    clearStoredAccessToken();
    queryClient.clear();
    setSession(null);
    setStatus("unauthenticated");
  }, [queryClient]);

  useEffect(() => {
    let isMounted = true;
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    getCurrentSession(token)
      .then((currentSession) => {
        if (!isMounted) {
          return;
        }

        setSession(currentSession);
        queryClient.setQueryData(authMeQueryKey, currentSession);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        clearSession();
      });

    return () => {
      isMounted = false;
    };
  }, [clearSession, queryClient]);

  const signIn = useCallback(async (values: LoginFormValues) => {
    const token = await loginAccount(values);
    setStoredAccessToken(token.access_token);

    try {
      const currentSession = await getCurrentSession(token.access_token);
      setSession(currentSession);
      queryClient.setQueryData(authMeQueryKey, currentSession);
      setStatus("authenticated");
      return currentSession;
    } catch (error) {
      clearStoredAccessToken();
      setSession(null);
      setStatus("unauthenticated");
      throw error;
    }
  }, [queryClient]);

  const updateSessionUser = useCallback((user: AuthUser) => {
    if (!session) return;
    const updated = { ...session, user };
    setSession(updated);
    queryClient.setQueryData(authMeQueryKey, updated);
  }, [queryClient, session]);

  const signOut = useCallback(async () => {
    try {
      await logoutSession();
    } catch {
      // Logout is stateless in Sprint 1; local cleanup is the source of truth.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      signIn,
      signOut,
      clearSession,
      updateSessionUser,
    }),
    [clearSession, session, signIn, signOut, status, updateSessionUser],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
}
