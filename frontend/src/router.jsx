import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext(null);
export function RouterProvider({ children }) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { const on = () => setPath(window.location.pathname); window.addEventListener("popstate", on); return () => window.removeEventListener("popstate", on); }, []);
  const go = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", to);
    setPath(to); window.scrollTo(0, 0);
  }, []);
  const back = useCallback((fallback = "/") => { if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back(); else go(fallback); }, [go]);
  const value = useMemo(() => ({ path, go, back }), [path, go, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useRouter = () => useContext(Ctx);
