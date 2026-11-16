import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { get, post } from "./api.js";

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const r = await get("/auth/me");
    setUser(r.success ? r.user : null);
    setReady(true);
    return r;
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const logout = useCallback(async () => { await post("/auth/logout"); setUser(null); }, []);
  return <Ctx.Provider value={{ user, setUser, ready, refresh, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
