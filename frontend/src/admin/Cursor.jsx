import { useEffect, useRef, useState } from "react";

/** Advanced neon cursor: glowing dot + lagging magnetic ring + particle comet trail. Desktop (fine pointer) only. */
export default function Cursor() {
  const dot = useRef(), ring = useRef(), cv = useRef();
  const [mode, setMode] = useState("");
  const fine = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;
  useEffect(() => {
    if (!fine) return undefined;
    document.querySelector(".adm")?.classList.add("hide-cursor");
    const c = cv.current, ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth * devicePixelRatio; c.height = window.innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const m = { x: -100, y: -100 }, r = { x: -100, y: -100 }, parts = [];
    let raf, last = { x: -100, y: -100 };
    const col = () => getComputedStyle(document.querySelector(".adm")).getPropertyValue("--a1").trim() || "#b8ff3d";
    const move = (e) => {
      m.x = e.clientX; m.y = e.clientY;
      dot.current.style.transform = `translate(${m.x}px,${m.y}px)`;
      const t = e.target.closest?.("a,button,[role=button],.acard,select,summary,label,tr[data-click],.adm-nav,.swatch");
      const txt = e.target.closest?.("input[type=text],input[type=search],input[type=email],input[type=password],input[type=number],textarea");
      setMode(txt ? "txt" : t ? "hov" : "");
      const dist = Math.hypot(m.x - last.x, m.y - last.y);
      for (let i = 0; i < Math.min(4, dist / 6); i++) parts.push({ x: m.x + (Math.random() - .5) * 6, y: m.y + (Math.random() - .5) * 6, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .5) * 1.2, life: 1, s: 1.5 + Math.random() * 2.5 });
      last = { x: m.x, y: m.y };
    };
    const down = () => setMode((s) => s + " down"), up = () => setMode((s) => s.replace(" down", ""));
    const loop = () => {
      r.x += (m.x - r.x) * 0.16; r.y += (m.y - r.y) * 0.16;
      ring.current.style.transform = `translate(${r.x}px,${r.y}px)`;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const color = col();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.035;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.8; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * p.life, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("mousemove", move); window.addEventListener("mousedown", down); window.addEventListener("mouseup", up);
    return () => { cancelAnimationFrame(raf); document.querySelector(".adm")?.classList.remove("hide-cursor"); window.removeEventListener("mousemove", move); window.removeEventListener("mousedown", down); window.removeEventListener("mouseup", up); window.removeEventListener("resize", resize); };
  }, [fine]);
  if (!fine) return null;
  return (<><canvas ref={cv} className="cur-trail" /><div ref={ring} className={`cur-ring ${mode}`} /><div ref={dot} className="cur-dot" /></>);
}
