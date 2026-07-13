"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isApiError } from "@/lib/api-error";
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from "@/lib/auth-token-storage";
import type { LoginFormValues } from "@/schemas/login";
import { getCurrentSession, loginAccount } from "@/services/auth";
import type { MeResponse } from "@/types/auth";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  status: SessionStatus;
  session: MeResponse | null;
  signIn: (values: LoginFormValues) => Promise<MeResponse>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [status, setStatus] = useState<SessionStatus>(() =>
    getStoredAccessToken() ? "loading" : "unauthenticated",
  );
  const [session, setSession] = useState<MeResponse | null>(null);

  const clearSession = useCallback(() => {
    clearStoredAccessToken();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

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
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        if (isApiError(error) && error.status === 401) {
          clearSession();
          return;
        }

        setSession(null);
        setStatus("unauthenticated");
      });

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const signIn = useCallback(async (values: LoginFormValues) => {
    const token = await loginAccount(values);
    setStoredAccessToken(token.access_token);

    try {
      const currentSession = await getCurrentSession(token.access_token);
      setSession(currentSession);
      setStatus("authenticated");
      return currentSession;
    } catch (error) {
      clearStoredAccessToken();
      setSession(null);
      setStatus("unauthenticated");
      throw error;
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      signIn,
      clearSession,
    }),
    [clearSession, session, signIn, status],
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
