import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

interface ServerConnectionContextType {
  isOnline: boolean;
  isInitialCheck: boolean;
  reconnect: () => void;
}

const ServerConnectionContext = createContext<ServerConnectionContextType | null>(null);

function getApiUrl(): string {
  if (window.appConfig?.serverUrl) return window.appConfig.serverUrl;
  return import.meta.env.VITE_API_URL || "http://localhost:3001";
}

const POLL_INTERVAL = 30_000;

export function ServerConnectionProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error("Health check failed");
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsInitialCheck(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    check();
  }, [check]);

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  return (
    <ServerConnectionContext.Provider value={{ isOnline, isInitialCheck, reconnect }}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

export function useServerConnection() {
  const ctx = useContext(ServerConnectionContext);
  if (!ctx) throw new Error("useServerConnection must be used within ServerConnectionProvider");
  return ctx;
}
