import { createContext, useContext, type ReactNode } from "react";

interface ServerConnectionContextType {
  isOnline: boolean;
  isInitialCheck: boolean;
  reconnect: () => void;
}

const ServerConnectionContext = createContext<ServerConnectionContextType | null>(null);

export function ServerConnectionProvider({ children }: { children: ReactNode }) {
  return (
    <ServerConnectionContext.Provider value={{ isOnline: true, isInitialCheck: false, reconnect: () => {} }}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

export function useServerConnection() {
  const ctx = useContext(ServerConnectionContext);
  if (!ctx) throw new Error("useServerConnection must be used within ServerConnectionProvider");
  return ctx;
}
