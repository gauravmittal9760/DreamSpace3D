import { createContext, useCallback, useContext, useEffect, useState } from "react";

const Ctx = createContext({ theme: "dark", toggle: () => {} });
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#070b18" : "#eef2fb");
    try { localStorage.setItem("ds-theme", theme); } catch { /* private mode */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Round sun/moon button, fixed in the top-right corner of every page. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button className={`theme-toggle ${dark ? "is-dark" : "is-light"}`} onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"}>
      <svg viewBox="0 0 24 24" className="ico sun" aria-hidden><circle cx="12" cy="12" r="4.2" fill="currentColor" />{[...Array(8)].map((_, i) => <line key={i} x1="12" y1="2.2" x2="12" y2="4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform={`rotate(${i * 45} 12 12)`} />)}</svg>
      <svg viewBox="0 0 24 24" className="ico moon" aria-hidden><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" fill="currentColor" /></svg>
    </button>
  );
}
