import { useEffect, useId, useRef, useState } from "react";

export function useCount(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const to = Number(target) || 0; const from = 0; const t0 = performance.now(); let raf;
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3); setV(from + (to - from) * e); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
export const Count = ({ value, fmt = (n) => Math.round(n).toLocaleString("en-IN") }) => <>{fmt(useCount(value))}</>;

/** Card with a cursor-following spotlight */
export function Spot({ className = "", children, ...p }) {
  const ref = useRef();
  return (
    <div ref={ref} className={`acard ${className}`} {...p}
      onMouseMove={(e) => { const b = ref.current.getBoundingClientRect(); ref.current.style.setProperty("--mx", `${e.clientX - b.left}px`); ref.current.style.setProperty("--my", `${e.clientY - b.top}px`); }}>
      {children}
    </div>
  );
}

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function AreaChart({ labels, series, forecast, height = 240, fmtLabel = (s) => s }) {
  const W = 760, H = height, P = { l: 34, r: 12, t: 12, b: 26 };
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState(null);
  const ref = useRef();
  const n = labels.length, extra = forecast?.future?.length || 0, total = n + extra;
  const max = Math.max(1, ...series.flatMap((s) => s.data), ...(forecast ? forecast.future.map((f) => f.high) : [])) * 1.12;
  const x = (i) => P.l + (i / Math.max(1, total - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const onMove = (e) => { const b = ref.current.getBoundingClientRect(); const px = ((e.clientX - b.left) / b.width) * W; setHover(Math.max(0, Math.min(total - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (total - 1))))); };
  const fc = forecast ? [[x(n - 1), y(series[0].data[n - 1])], ...forecast.future.map((f, i) => [x(n + i), y(f.value)])] : null;
  return (
    <div className="chart" style={{ position: "relative" }} ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>{series.map((s, k) => <linearGradient key={k} id={`${gid}g${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".45" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
        {ticks.map((t) => <g key={t}><line className="gridl" x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} /><text className="axis" x={P.l - 6} y={y(t) + 3} textAnchor="end">{t}</text></g>)}
        {labels.map((l, i) => (i % Math.ceil(n / 7) === 0 ? <text key={i} className="axis" x={x(i)} y={H - 6} textAnchor="middle">{fmtLabel(l)}</text> : null))}
        {forecast && <rect x={x(n - 1)} y={P.t} width={x(total - 1) - x(n - 1)} height={H - P.t - P.b} fill="currentColor" opacity=".05" />}
        {forecast && <path d={`M${x(n)},${y(forecast.future[0].high)} ${forecast.future.map((f, i) => `L${x(n + i)},${y(f.high)}`).join(" ")} ${[...forecast.future].reverse().map((f, i) => `L${x(n + forecast.future.length - 1 - i)},${y(f.low)}`).join(" ")}Z`} fill={series[0].color} opacity=".14" />}
        {series.map((s, k) => {
          const pts = s.data.map((v, i) => [x(i), y(v)]);
          return (<g key={k}><path d={`${smooth(pts)} L${pts[pts.length - 1][0]},${H - P.b} L${pts[0][0]},${H - P.b}Z`} fill={`url(#${gid}g${k})`} /><path className="ln" d={smooth(pts)} stroke={s.color} style={{ color: s.color }} /></g>);
        })}
        {fc && <path d={smooth(fc)} fill="none" stroke={series[0].color} strokeWidth="2.5" strokeDasharray="6 6" opacity=".9" />}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="currentColor" strokeOpacity=".4" strokeDasharray="3 3" />}
        {hover != null && hover < n && series.map((s, k) => <circle key={k} cx={x(hover)} cy={y(s.data[hover])} r="4.5" fill={s.color} stroke="#000" strokeOpacity=".4" />)}
        {hover != null && hover >= n && forecast && <circle cx={x(hover)} cy={y(forecast.future[hover - n].value)} r="4.5" fill={series[0].color} />}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hover < n ? Math.max(...series.map((s) => s.data[hover])) : forecast.future[hover - n].value) / H) * 100}%` }}>
          {hover < n ? <>{fmtLabel(labels[hover])}{series.map((s) => <div key={s.label} style={{ color: s.color }}>{s.label}: <b>{s.data[hover]}</b></div>)}</> : <>Forecast +{hover - n + 1}d<div style={{ color: series[0].color }}>{forecast.future[hover - n].value} <small>({forecast.future[hover - n].low}–{forecast.future[hover - n].high})</small></div></>}
        </div>
      )}
    </div>
  );
}

export function Donut({ parts, size = 170, center }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 62, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
        <svg viewBox="0 0 160 160" width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="currentColor" strokeOpacity=".08" strokeWidth="18" />
          {parts.map((p, i) => { const len = (p.value / total) * C; const el = <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} style={{ filter: `drop-shadow(0 0 5px ${p.color})`, transition: "stroke-dasharray 1s" }} />; acc += len; return el; })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", fontWeight: 700, fontSize: "1.3rem" }}>{center}</div>
      </div>
      <div className="col" style={{ gap: 6, fontSize: ".8rem" }}>{parts.map((p) => <div key={p.label} className="row" style={{ gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} /><span>{p.label}</span><b style={{ marginLeft: "auto", paddingLeft: 14 }}>{p.value}</b></div>)}</div>
    </div>
  );
}

export function RankList({ rows, max, tone = "" }) {
  const m = max || Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rank">{rows.map((r, i) => (
      <div className="r" key={r.key || r.label}>
        <span className="n">{i + 1}</span>
        <div style={{ minWidth: 0 }}><div className="nm" title={r.label}>{r.label}</div><div className={`abar ${tone}`}><i style={{ "--w": `${(r.value / m) * 100}%`, animationDelay: `${i * 60}ms` }} /></div>{r.sub && <small>{r.sub}</small>}</div>
        <b>{r.value}</b>
      </div>))}</div>
  );
}

export function Gauge({ pct, label, sub }) {
  return (
    <div className="gauge-wrap">
      <div className="gauge" style={{ "--v": Math.min(100, Math.max(0, pct)) }} />
      <div className="gv"><div>{Math.round(pct)}%<small>{label}</small>{sub && <small>{sub}</small>}</div></div>
    </div>
  );
}
