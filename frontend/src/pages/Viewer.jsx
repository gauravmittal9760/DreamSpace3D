import { useEffect, useRef, useState } from "react";
import { get } from "../api.js";
import { Btn, Spinner } from "../components/ui.jsx";
import { useRouter } from "../router.jsx";
import Scene3D from "../scene/Scene3D.jsx";
import { computeCost, inr, normalizeScene } from "../scene/sceneUtils.js";

/** Read-only 3D viewer - used for public share links (/view/:token) and inside the admin panel. */
export function SceneViewer({ scene: raw, title, subtitle, onClose }) {
  const scene = useRef(normalizeScene(raw)).current;
  const [plan, setPlan] = useState(false);
  const [time, setTime] = useState("day");
  const [wall, setWall] = useState("full");
  const [fit, setFit] = useState(0);
  const cost = computeCost(scene, {});
  return (
    <div className="viewer">
      <Scene3D scene={scene} readOnly planMode={plan} time={time} wallMode={wall} fitSignal={fit} showLabels />
      <div className="hud tl"><b style={{ padding: "0 8px", alignSelf: "center" }}>{title}</b>{subtitle && <small className="muted" style={{ alignSelf: "center" }}>{subtitle}</small>}</div>
      <div className="hud br">
        <button className={`ibtn ${!plan ? "on" : ""}`} onClick={() => setPlan(false)}>3D</button><button className={`ibtn ${plan ? "on" : ""}`} onClick={() => setPlan(true)}>Plan</button>
        {[["full", "Walls"], ["half", "Half"], ["glass", "X-ray"]].map(([k, l]) => <button key={k} className={`ibtn ${wall === k ? "on" : ""}`} onClick={() => setWall(k)}>{l}</button>)}
        {[["day", "☀️"], ["evening", "🌇"], ["night", "🌙"]].map(([k, l]) => <button key={k} className={`ibtn ${time === k ? "on" : ""}`} onClick={() => setTime(k)}>{l}</button>)}
        <button className="ibtn" onClick={() => setFit((n) => n + 1)}>⤢</button>
        {onClose && <button className="ibtn" onClick={onClose}>✕ Close</button>}
      </div>
      <div className="cost-pill" style={{ cursor: "default" }}>💰 <span className="muted">Estimated cost</span> <b>{inr(cost.total)}</b></div>
    </div>
  );
}

export default function SharedView({ token }) {
  const { go } = useRouter();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { get(`/projects/shared/${token}`).then((r) => (r.success ? setP(r.project) : setErr(r.message || "Not found"))); }, [token]);
  if (err) return <div className="page" style={{ placeItems: "center", textAlign: "center", paddingTop: "20vh" }}><h2>😕 {err}</h2><Btn onClick={() => go("/")}>Go to DreamSpace 3D</Btn></div>;
  if (!p) return <Spinner label="Loading design…" />;
  return <SceneViewer scene={p.project_data} title={p.name} subtitle={`by ${p.owner}`} onClose={() => go("/")} />;
}
