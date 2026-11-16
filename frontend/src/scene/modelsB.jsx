// Electronics, kitchen, bathroom, decor, architecture, outdoor. Local frame: origin = bottom centre, front = +Z.
// Items marked `hang` are drawn downward from y = 0 (the ceiling mount point) - see Models.jsx.
import { B, Cone, Cy, GLASS, Glow, MIRROR, Sp, Torus, tone } from "./prims.jsx";

export function Fan({ id, dims: [w, h], p, color }) {
  const n = p.blades ?? 4, c = color;
  return (<group>
    <Cy p={[0, -0.02, 0]} r={0.05} h={0.04} c="#999" m={0.6} /><Cy p={[0, -0.14, 0]} r={0.012} h={0.24} c="#bbb" m={0.8} />
    <Cy p={[0, -h + 0.14, 0]} r={0.1} rb={0.12} h={0.1} c={tone(c, -0.3)} m={0.5} />
    {n === 0 ? <Torus p={[0, -h + 0.14, 0]} r={w / 2} t={0.04} c={c} rx={Math.PI / 2} /> : Array.from({ length: n }).map((_, i) => { const a = (i / n) * Math.PI * 2; return <group key={i} rotation={[0, a, 0]}><B p={[w / 4 + 0.07, -h + 0.13, 0]} s={[w / 2 - 0.08, 0.012, 0.15]} c={p.wood ? "#8b5e3c" : c} rz={0.05} /></group>; })}
    {p.light && <><Sp p={[0, -h + 0.04, 0]} r={0.1} sy={0.6} c="#fff6d6" e="#ffe9a6" /><Glow id={id} p={[0, -h, 0]} intensity={3} dist={6} /></>}
  </group>);
}
export function Light({ id, dims: [w, h, d], p, color }) {
  const k = p.kind, c = color;
  return (<group>
    {k === "panel" && <Cy p={[0, -0.02, 0]} r={w / 2} h={0.04} c="#fffdf2" e="#fff3c4" />}
    {k === "square" && <B p={[0, -0.02, 0]} s={[w, 0.04, d]} c="#fffdf2" e="#fff3c4" />}
    {k === "dome" && <><Cy p={[0, -0.3, 0]} r={0.004} h={0.6} c="#111" /><Sp p={[0, -0.6, 0]} r={w / 2} sy={0.55} c={c} /><Sp p={[0, -0.62, 0]} r={0.08} c="#fff3c4" e="#ffe08a" /></>}
    {k === "cluster" && [[-0.2, 0.3], [0.1, 0.55], [0.22, 0.4]].map(([x, l], i) => <group key={i}><Cy p={[x, -l / 2, 0]} r={0.003} h={l} c="#222" /><Sp p={[x, -l, 0]} r={0.1} c={c} e="#ffd27d" /></group>)}
    {k === "track" && <><B p={[0, -0.02, 0]} s={[w, 0.03, 0.04]} c={c} />{[-0.4, 0, 0.4].map((x) => <Cy key={x} p={[x, -0.1, 0]} r={0.04} h={0.1} c={c} />)}</>}
    {k === "strip" && <B p={[0, -0.02, 0]} s={[w, 0.03, 0.04]} c="#7df9ff" e="#2de2ff" />}
    {k === "spot" && <Cy p={[0, -0.02, 0]} r={0.06} h={0.04} c="#fffdf2" e="#fff3c4" />}
    {k === "drum" && <><Cy p={[0, -0.3, 0]} r={0.003} h={0.6} c="#222" /><Cy p={[0, -0.62, 0]} r={w / 2} h={0.3} c={c} o={0.92} open e="#ffe8b0" /></>}
    <Glow id={id} p={[0, -0.5, 0]} intensity={k === "strip" ? 2 : 4} />
  </group>);
}
export function Chandelier({ id, dims: [w, h], p, color }) {
  const arms = p.arms || 6;
  if (p.ring) return (<group><Torus p={[0, -h * 0.8, 0]} r={w / 2} t={0.025} c="#d4af37" e="#ffe08a" m={0.9} />{[-0.3, 0.3].map((x) => <Cy key={x} p={[x, -h * 0.4, 0]} r={0.003} h={h * 0.8} c="#444" />)}<Glow id={id} p={[0, -h, 0]} intensity={8} dist={9} /></group>);
  if (p.globes) return (<group>{[[0, 0.35], [0.28, 0.55], [-0.28, 0.5], [0.1, 0.75], [-0.1, 0.25]].map(([x, l], i) => <group key={i}><Cy p={[x, -l / 2, 0]} r={0.003} h={l} c="#333" /><Sp p={[x, -l - 0.1, 0]} r={0.1} c="#fffdf2" e="#ffe9a6" o={0.9} /></group>)}<Glow id={id} p={[0, -h * 0.8, 0]} intensity={8} dist={9} /></group>);
  return (<group>
    <Cy p={[0, -0.2, 0]} r={0.015} h={0.4} c="#d4af37" m={0.9} />
    {Array.from({ length: p.tiers || 1 }).map((_, t) => (<group key={t} position={[0, -h * 0.45 - t * 0.24, 0]}>
      <Torus p={[0, 0, 0]} r={(w / 2) * (1 - t * 0.28)} t={0.014} c="#d4af37" m={0.9} />
      {Array.from({ length: arms }).map((_, i) => { const a = (i / arms) * Math.PI * 2, rr = (w / 2) * (1 - t * 0.28); return (<group key={i}><Cy p={[Math.cos(a) * rr, 0.07, Math.sin(a) * rr]} r={0.012} h={0.12} c="#fff3c4" e="#ffe08a" />{!p.spiky ? <Sp p={[Math.cos(a) * rr, -0.1, Math.sin(a) * rr]} r={0.03} c="#e8f6ff" o={0.7} m={0.2} /> : <Cy p={[Math.cos(a) * rr * 1.2, 0.0, Math.sin(a) * rr * 1.2]} r={0.004} h={0.2} c="#d4af37" />}</group>); })}
    </group>))}
    <Glow id={id} p={[0, -h * 0.7, 0]} intensity={10} dist={10} />
  </group>);
}
export function Lamp({ id, dims: [w, h], p, color }) {
  const c = color, k = p.kind;
  if (k === "table" || k === "desk") return (<group><Cy p={[0, 0.03, 0]} r={w * 0.35} h={0.06} c="#2b2b2e" />{k === "desk" ? <><B p={[0, h / 2, 0]} s={[0.025, h, 0.025]} c="#666" /><B p={[0.08, h, 0]} s={[0.2, 0.05, 0.1]} c={c} e="#ffe9a6" /></> : <><Cy p={[0, h * 0.4, 0]} r={0.03} h={h * 0.7} c="#999" /><Cy p={[0, h * 0.85, 0]} r={w / 2} rb={w / 2 + 0.05} h={0.2} c={c} e="#ffe9b0" open /></>}<Glow id={id} p={[0, h, 0]} intensity={2} dist={5} /></group>);
  if (k === "lantern") return (<group><Sp p={[0, h / 2, 0]} r={w / 2} c={c} e="#ffe9b0" /><Glow id={id} p={[0, h / 2, 0]} intensity={2} dist={5} /></group>);
  if (k === "arc") return (<group><Cy p={[0, 0.03, 0]} r={0.2} h={0.06} c="#2b2b2e" m={0.5} /><Cy p={[0, h / 2, 0]} r={0.012} h={h} c={c} m={0.8} /><Cy p={[0.3, h - 0.02, 0]} r={0.2} rb={0.08} h={0.2} c="#f4f1ea" e="#ffe9b0" open /><B p={[0.15, h, 0]} s={[0.3, 0.016, 0.016]} c={c} /><Glow id={id} p={[0.3, h - 0.1, 0]} intensity={3} dist={6} /></group>);
  if (k === "tripod") return (<group>{[0, 1, 2].map((i) => <B key={i} p={[Math.cos(i * 2.09) * 0.1, h * 0.4, Math.sin(i * 2.09) * 0.1]} s={[0.02, h * 0.8, 0.02]} c={c} rx={Math.sin(i * 2.09) * 0.22} rz={-Math.cos(i * 2.09) * 0.22} />)}<Cy p={[0, h - 0.18, 0]} r={0.16} rb={0.12} h={0.28} c="#f4f1ea" e="#ffe9b0" open /><Glow id={id} p={[0, h - 0.15, 0]} intensity={3} dist={6} /></group>);
  return (<group><Cy p={[0, 0.02, 0]} r={0.14} h={0.04} c="#222" /><Cy p={[0, h / 2, 0]} r={0.012} h={h} c={c} m={0.8} /><Cy p={[0, h - 0.08, 0]} r={0.12} rb={0.06} h={0.18} c="#fff3c4" e="#ffe08a" open /><Glow id={id} p={[0, h, 0]} intensity={3} dist={6} /></group>);
}
export function Ac({ dims: [w, h, d], p, color }) {
  if (p.kind === "cassette") return (<group><B p={[0, -0.04, 0]} s={[w, 0.08, d]} c={color} /><B p={[0, -0.085, 0]} s={[w * 0.7, 0.01, d * 0.7]} c="#cfd4da" /></group>);
  if (p.kind === "window") return (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} /><B p={[0, h * 0.35, d / 2 + 0.005]} s={[w - 0.1, h * 0.5, 0.01]} c="#9aa0a6" />{[0, 1, 2, 3, 4].map((i) => <B key={i} p={[0, 0.06 + i * 0.03, d / 2 + 0.012]} s={[w - 0.12, 0.008, 0.004]} c="#555" />)}</group>);
  return (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} r={0.4} /><B p={[0, 0.04, d / 2 + 0.003]} s={[w - 0.06, 0.04, 0.01]} c="#cfd4da" /><Sp p={[w / 2 - 0.08, h * 0.6, d / 2 + 0.003]} r={0.012} c="#38bdf8" e="#38bdf8" /><B p={[0, h * 0.7, d / 2 + 0.003]} s={[w - 0.1, 0.01, 0.004]} c="#e5e7eb" /></group>);
}
export function Fridge({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind;
  return (<group>
    <B p={[0, h / 2, 0]} s={[w, h, d]} c={c} m={0.6} r={0.3} />
    {k === "single" && <><B p={[0, h * 0.82, d / 2 + 0.003]} s={[w - 0.02, h * 0.34, 0.006]} c={tone(c, 0.05)} /><B p={[w / 2 - 0.05, h * 0.55, d / 2 + 0.02]} s={[0.02, 0.4, 0.02]} c="#555" /></>}
    {k === "double" && <><B p={[0, h * 0.5, d / 2 + 0.003]} s={[w - 0.02, 0.01, 0.006]} c="#444" /><B p={[w / 2 - 0.06, h * 0.75, d / 2 + 0.02]} s={[0.02, 0.5, 0.02]} c="#555" /><B p={[w / 2 - 0.06, h * 0.3, d / 2 + 0.02]} s={[0.02, 0.4, 0.02]} c="#555" /></>}
    {(k === "side" || k === "french") && <><B p={[0, h / 2, d / 2 + 0.003]} s={[0.01, h - 0.02, 0.006]} c="#444" />{[-1, 1].map((s) => <B key={s} p={[s * 0.06, h * 0.55, d / 2 + 0.02]} s={[0.02, 0.6, 0.02]} c="#999" />)}{k === "french" && <B p={[0, h * 0.3, d / 2 + 0.003]} s={[w - 0.02, 0.01, 0.006]} c="#444" />}<B p={[-w / 4, h * 0.7, d / 2 + 0.005]} s={[0.15, 0.1, 0.006]} c="#111" e="#15357a" /></>}
  </group>);
}
export function Washer({ dims: [w, h, d], p, color }) {
  return (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} r={0.3} />{p.kind === "front" ? <><Cy p={[0, h * 0.5, d / 2 + 0.005]} r={0.2} h={0.02} rx={Math.PI / 2} c="#9fd8ef" o={0.7} /><Torus p={[0, h * 0.5, d / 2 + 0.01]} r={0.2} t={0.02} c="#c7ccd1" rx={0} m={0.9} /><B p={[0, h * 0.9, d / 2 + 0.005]} s={[w - 0.1, 0.08, 0.01]} c="#222" /></> : <><B p={[0, h + 0.02, -d / 2 + 0.06]} s={[w, 0.04, 0.12]} c="#222" /><Cy p={[0, h + 0.005, 0.02]} r={0.22} h={0.01} c="#9fd8ef" o={0.7} /></>}</group>);
}
export const Microwave = ({ dims: [w, h, d], color }) => (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} r={0.3} /><B p={[-w * 0.12, h / 2, d / 2 + 0.003]} s={[w * 0.6, h - 0.06, 0.006]} c="#111a24" o={0.9} /><B p={[w * 0.35, h / 2, d / 2 + 0.003]} s={[w * 0.18, h - 0.06, 0.006]} c="#888" /></group>);
export const Geyser = ({ dims: [w, h, d], color }) => (<group><Cy p={[0, h / 2, 0]} r={w / 2} h={h} c={color} rough={0.3} /><Sp p={[0, h, 0]} r={w / 2} sy={0.3} c={color} /><Sp p={[0, 0.02, d / 2 - 0.1]} r={0.02} c="#38bdf8" e="#38bdf8" /></group>);

export function KitchenCounter({ dims: [w, h, D], p, color }) {
  const c = color, topC = p.wood ? "#c8a272" : "#2b2b2e", cd = 0.62;
  const run = (len, x, z, ry = 0) => (<group position={[x, 0, z]} rotation={[0, ry, 0]}>
    <B p={[0, (h - 0.04) / 2 + 0.06, 0]} s={[len, h - 0.1, cd]} c={c} />
    <B p={[0, 0.03, cd / 2 - 0.04]} s={[len, 0.06, cd - 0.08]} c="#1b1b1f" />
    <B p={[0, h - 0.02, 0.01]} s={[len + 0.02, 0.04, cd + 0.04]} c={topC} r={0.25} m={0.1} />
    {Array.from({ length: Math.max(2, Math.round(len / 0.6)) }).map((_, i, a) => { const x0 = -len / 2 + (len / a.length) * (i + 0.5); return (<group key={i}><B p={[x0, 0.5, cd / 2 + 0.005]} s={[len / a.length - 0.02, h - 0.35, 0.02]} c={tone(c, 0.08)} /><B p={[x0, h - 0.18, cd / 2 + 0.025]} s={[0.12, 0.014, 0.014]} c="#c7ccd1" m={0.9} /></group>); })}
  </group>);
  if (p.kind === "L") return (<group>{run(w, 0, -D / 2 + cd / 2)}{run(D - cd, w / 2 - cd / 2, cd / 2, -Math.PI / 2)}</group>);
  return run(w, 0, 0);
}
export function KitchenIsland({ dims: [w, h, d], p, color }) {
  return (<group><B p={[0, h / 2 - 0.02, -0.1]} s={[w - 0.2, h - 0.04, d - 0.3]} c={color} /><B p={[0, h - 0.02, 0]} s={[w, 0.05, d]} c={p.wood ? "#c8a272" : "#f1f1f0"} r={0.2} />{[-1, 0, 1].map((x) => <B key={x} p={[x * (w / 3), 0.35, -0.1 + (d - 0.3) / 2 + 0.005]} s={[w / 3 - 0.04, 0.55, 0.01]} c={tone(color, 0.08)} />)}</group>);
}
export function KitchenSink({ dims: [w, h, d], p, color }) {
  const n = p.bowls || 1;
  return (<group><B p={[0, (h - 0.04) / 2, 0]} s={[w, h - 0.04, d]} c={color} /><B p={[0, h - 0.02, 0]} s={[w + 0.02, 0.04, d + 0.02]} c="#2b2b2e" r={0.25} />{Array.from({ length: n }).map((_, i) => <B key={i} p={[-w / 2 + 0.3 + i * 0.45, h + 0.001, 0]} s={[0.38, 0.01, d - 0.2]} c="#aeb4bb" m={0.9} r={0.2} />)}<Cy p={[0, h + 0.16, -d / 2 + 0.07]} r={0.012} h={0.3} c="#c7ccd1" m={0.9} /><B p={[0, h + 0.3, -d / 2 + 0.14]} s={[0.012, 0.012, 0.15]} c="#c7ccd1" m={0.9} /></group>);
}
export const Hob = ({ dims: [w, h, d], p, color }) => (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} m={0.3} r={0.2} />{(p.burners === 2 ? [[-w / 4, 0], [w / 4, 0]] : [[-w / 4, -d / 4], [w / 4, -d / 4], [-w / 4, d / 4], [w / 4, d / 4]]).map(([x, z], i) => <Torus key={i} p={[x, h + 0.003, z]} r={p.induction ? 0.09 : 0.05} t={p.induction ? 0.005 : 0.012} c={p.induction ? "#ff6a3d" : "#888"} rx={Math.PI / 2} />)}</group>);
export function Chimney({ dims: [w, h, d], p, color }) {
  if (p.kind === "slim") return (<group><B p={[0, h - 0.08, 0]} s={[w, 0.16, d]} c={color} m={0.6} r={0.3} /><B p={[0, h / 2 + 0.2, -d / 2 + 0.1]} s={[0.25, h - 0.2, 0.2]} c={color} m={0.6} /></group>);
  return (<group><Cone p={[0, h * 0.2, 0]} r={w / 2} h={h * 0.4} c={color} seg={4} /><B p={[0, h * 0.7, 0]} s={[0.28, h * 0.6, 0.28]} c={color} m={0.7} r={0.3} /></group>);
}
export const WallCabinet = (props) => { const { dims: [w, h, d], p, color } = props; return p.open ? (<group><B p={[0, 0.01, 0]} s={[w, 0.03, d]} c={color} /><B p={[0, h, 0]} s={[w, 0.03, d]} c={color} /></group>) : (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} />{Array.from({ length: Math.max(2, Math.round(w / 0.6)) }).map((_, i, a) => <B key={i} p={[-w / 2 + (w / a.length) * (i + 0.5), h / 2, d / 2 + 0.005]} s={[w / a.length - 0.02, h - 0.03, 0.02]} c={tone(color, 0.08)} />)}</group>); };

const WHITE = "#fbfbfb";
export function Bathtub({ dims: [w, h, d], p, color }) {
  const c = color;
  return (<group>
    <B p={[0, h / 2, 0]} s={[w, h, d]} c={p.kind === "built" ? c : tone(c, -0.02)} r={0.15} />
    <B p={[0, h + 0.002, 0]} s={[w - 0.2, 0.005, d - 0.2]} c="#7fd0f2" o={0.65} r={0.05} />
    <B p={[0, h - 0.02, 0]} s={[w - 0.12, 0.05, d - 0.12]} c={tone(c, -0.06)} />
    <Cy p={[-w / 2 + 0.2, h + 0.18, 0]} r={0.012} h={0.36} c="#c7ccd1" m={0.9} /><B p={[-w / 2 + 0.2, h + 0.35, 0.05]} s={[0.012, 0.012, 0.12]} c="#c7ccd1" m={0.9} />
    {p.kind === "free" && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Cy key={i} p={[a * (w / 2 - 0.2), -0.0, b * (d / 2 - 0.15)]} r={0.03} h={0.04} c="#d4af37" m={0.8} />)}
    {p.kind === "corner" && [0.3, 0.7, 1.1].map((x) => <Sp key={x} p={[-w / 2 + x, h + 0.02, d / 2 - 0.05]} r={0.015} c="#ddd" />)}
  </group>);
}
export function Toilet({ dims: [w, h, d], p }) {
  if (p.kind === "indian") return (<group><B p={[0, 0.03, 0]} s={[w, 0.06, d]} c="#f2f2f2" /><B p={[0, 0.062, 0.05]} s={[w - 0.12, 0.01, d - 0.2]} c="#cfd4da" /><B p={[-w / 2 - 0.05, 0.04, 0]} s={[0.1, 0.04, 0.2]} c="#e8e8e8" /></group>);
  const wall = p.kind === "wall";
  return (<group position={[0, wall ? 0.15 : 0, 0]}>
    <B p={[0, 0.4, -d / 2 + 0.11]} s={[w, p.kind === "smart" ? 0.65 : 0.7 - 0.3, 0.22]} c={WHITE} r={0.12} />
    <Cy p={[0, 0.2, 0.05]} r={w / 2} h={0.4} c={WHITE} rough={0.12} />
    <Cy p={[0, 0.41, 0.05]} r={w / 2 + 0.01} h={0.03} c="#f4f4f4" rough={0.2} />
    <Cy p={[0, 0.44, -d / 2 + 0.11]} r={0.02} h={0.02} c="#c7ccd1" m={0.9} />
    {!wall && <B p={[0, 0.02, 0.05]} s={[w - 0.08, 0.04, d - 0.3]} c={WHITE} />}
    {p.kind === "smart" && <B p={[0.25, 0.4, -0.1]} s={[0.05, 0.1, 0.08]} c="#38bdf8" e="#38bdf8" />}
  </group>);
}
export function Washbasin({ dims: [w, h, d], p, color }) {
  const c = color;
  const tap = (x) => (<group position={[x, 0, -d / 2 + 0.08]}><Cy p={[0, h + 0.11, 0]} r={0.012} h={0.2} c="#c7ccd1" m={0.9} /><B p={[0, h + 0.2, 0.05]} s={[0.012, 0.012, 0.11]} c="#c7ccd1" m={0.9} /></group>);
  if (p.kind === "pedestal") return (<group><Cy p={[0, h / 2 - 0.1, -0.02]} r={0.1} h={h - 0.3} c={c} /><B p={[0, h - 0.07, 0]} s={[w, 0.14, d]} c={c} r={0.12} /><B p={[0, h + 0.0, 0.0]} s={[w - 0.14, 0.01, d - 0.14]} c="#d8dde2" />{tap(0)}</group>);
  if (p.kind === "wall") return (<group position={[0, 0.75, 0]}><B p={[0, 0.07, 0]} s={[w, 0.14, d]} c={c} r={0.12} />{tap(0)}</group>);
  if (p.kind === "double") return (<group><B p={[0, (h - 0.06) / 2, 0]} s={[w, h - 0.06, d]} c="#2f3640" /><B p={[0, h - 0.03, 0]} s={[w + 0.02, 0.06, d + 0.02]} c="#f1f1f0" r={0.2} />{[-0.35, 0.35].map((x) => <group key={x}><B p={[x * w / 0.75 * 0.5, h + 0.02, 0.02]} s={[0.4, 0.04, 0.32]} c={WHITE} />{tap(x * w / 0.75 * 0.5)}</group>)}</group>);
  return (<group><B p={[0, (h - 0.03) / 2, 0]} s={[w, h - 0.03, d]} c={tone("#8b5e3c", 0)} /><B p={[0, h - 0.015, 0]} s={[w + 0.02, 0.03, d + 0.02]} c="#2b2b2e" />{p.round ? <Sp p={[0, h + 0.07, 0.02]} r={0.2} sy={0.5} c={c} /> : <B p={[0, h + 0.07, 0.02]} s={[0.42, 0.14, 0.32]} c={c} r={0.12} />}{tap(0)}</group>);
}
export function Shower({ dims: [w, h, d], p, color }) {
  const glass = { c: GLASS, o: 0.22 };
  return (<group>
    <B p={[0, 0.03, 0]} s={[w, 0.06, d]} c="#e5e7eb" />
    {p.kind !== "rain" && <><B p={[0, h / 2, d / 2 - 0.01]} s={[w, h, 0.012]} {...glass} shadow={false} /><B p={[w / 2 - 0.01, h / 2, 0]} s={[0.012, h, d]} {...glass} shadow={false} /></>}
    {p.kind === "cabin" && <><B p={[0, h - 0.02, 0]} s={[w, 0.04, d]} c="#e5e7eb" /><B p={[-w / 2 + 0.01, h / 2, 0]} s={[0.012, h, d]} {...glass} shadow={false} /></>}
    {p.kind === "walkin" && <B p={[w / 2 - 0.01, h / 2, 0]} s={[0.012, h, d]} {...glass} shadow={false} />}
    <Cy p={[-w / 2 + 0.1, h - 0.3, -d / 2 + 0.05]} r={0.012} h={0.6} c="#c7ccd1" m={0.9} /><Cy p={[-w / 2 + 0.15, h - 0.02, -d / 2 + 0.2]} r={0.12} h={0.02} c="#c7ccd1" m={0.9} />
  </group>);
}
export function Mirror({ dims: [w, h, d], p, color }) {
  const round = p.kind === "round";
  return (<group position={[0, h / 2, 0]}>
    {round ? <><Cy p={[0, 0, 0]} r={w / 2 + 0.02} h={d} rx={Math.PI / 2} c={color} m={0.6} /><Cy p={[0, 0, d / 2 + 0.002]} r={w / 2} h={0.004} rx={Math.PI / 2} c={MIRROR} m={0.95} rough={0.04} /></> :
      <><B p={[0, 0, 0]} s={[w + 0.05, h + 0.05, d]} c={p.kind === "led" ? "#fffdf2" : color} e={p.kind === "led" ? "#d9f7ff" : null} m={0.5} /><B p={[0, 0, d / 2 + 0.002]} s={[w, h, 0.004]} c={MIRROR} m={0.95} r={0.04} />{p.kind === "arch" && <Sp p={[0, h / 2, d / 2]} r={w / 2} sy={0.4} c={MIRROR} m={0.9} />}</>}
  </group>);
}
export const Vanity = (props) => { const { dims: [w, h, d], p } = props; return (<group><CabinetBody {...props} /><B p={[0, h + 0.015, 0]} s={[w + 0.02, 0.03, d + 0.02]} c="#f1f1f0" r={0.2} /><B p={[0, h + 0.07, 0.0]} s={[0.4, 0.12, 0.3]} c={WHITE} />{p.doors > 2 && <B p={[0, h + 0.07, 0]} s={[0.4, 0.12, 0.3]} c={WHITE} />}</group>); };
function CabinetBody({ dims: [w, h, d], p, color }) { const y0 = p.float ? 0.4 : 0; return (<group><B p={[0, y0 + (h - y0) / 2, 0]} s={[w, h - y0, d]} c={color} />{Array.from({ length: p.doors || 2 }).map((_, i, a) => <B key={i} p={[-w / 2 + (w / a.length) * (i + 0.5), y0 + (h - y0) / 2, d / 2 + 0.01]} s={[w / a.length - 0.015, h - y0 - 0.03, 0.02]} c={tone(color, 0.07)} />)}</group>); }

export function Plant({ dims: [w, h], p, color }) {
  const c = color, k = p.kind, potC = "#b5651d";
  const pot = (r, hh) => <Cy p={[0, hh / 2, 0]} r={r} rb={r * 0.7} h={hh} c={potC} rough={0.9} />;
  if (k === "snake") return (<group>{pot(0.14, 0.25)}{Array.from({ length: 9 }).map((_, i) => <B key={i} p={[Math.cos(i * 2.3) * 0.07, 0.25 + h * 0.3 + (i % 3) * 0.08, Math.sin(i * 2.3) * 0.07]} s={[0.05, h * 0.65 - (i % 3) * 0.1, 0.015]} c={i % 2 ? c : tone(c, 0.1)} ry={i * 0.7} rz={Math.cos(i) * 0.08} />)}</group>);
  if (k === "palm") return (<group>{pot(0.22, 0.4)}<Cy p={[0, 0.4 + (h - 0.4) / 2, 0]} r={0.03} h={h - 0.4} c="#8b6f47" />{Array.from({ length: 8 }).map((_, i) => <B key={i} p={[Math.cos(i * 0.785) * 0.28, h - 0.1, Math.sin(i * 0.785) * 0.28]} s={[0.55, 0.012, 0.12]} c={c} ry={-i * 0.785} rz={-0.35} />)}</group>);
  if (k === "bonsai" || k === "succ") return (<group>{pot(k === "succ" ? 0.07 : 0.16, k === "succ" ? 0.09 : 0.1)}<Cy p={[0, 0.2, 0]} r={0.018} h={0.2} c="#6b4f3a" /><Sp p={[0, 0.34, 0]} r={k === "succ" ? 0.07 : 0.16} sy={0.7} c={c} /></group>);
  if (k === "hang") return (<group position={[0, 0, 0]}><Cy p={[0, h - 0.02, 0]} r={0.003} h={0.4} c="#555" /><Cy p={[0, h - 0.45, 0]} r={0.12} rb={0.07} h={0.14} c={potC} />{[0, 1, 2, 3, 4].map((i) => <B key={i} p={[Math.cos(i * 1.2) * 0.1, h - 0.65 - (i % 2) * 0.1, Math.sin(i * 1.2) * 0.1]} s={[0.04, 0.3, 0.02]} c={c} />)}</group>);
  if (k === "vine") return (<group>{pot(0.14, 0.2)}<Cy p={[0, h / 2, 0]} r={0.01} h={h} c="#6b4f3a" />{Array.from({ length: 10 }).map((_, i) => <Sp key={i} p={[Math.cos(i * 2) * 0.1, 0.25 + (i * h) / 12, Math.sin(i * 2) * 0.1]} r={0.07} c={c} sy={0.5} />)}</group>);
  return (<group>{pot(Math.min(0.22, w * 0.4), 0.3)}<Cy p={[0, 0.3 + (h - 0.6) / 2, 0]} r={0.025} h={h - 0.6} c="#8b6f47" />{[[0, 0], [0.18, 0.1], [-0.15, 0.12], [0.05, -0.18], [-0.1, -0.1]].map(([x, z], i) => <Sp key={i} p={[x, h - 0.3 + (i % 2) * 0.12, z]} r={w * 0.28} sy={0.85} c={i % 2 ? c : tone(c, 0.08)} />)}</group>);
}
export function Rug({ dims: [w, h, d], p, color }) {
  const c = color;
  if (p.shape === "round") return (<group><Cy p={[0, h / 2, 0]} r={w / 2} h={h} c={c} rough={1} /><Cy p={[0, h + 0.002, 0]} r={w / 2 - 0.12} h={0.004} c={tone(c, 0.15)} rough={1} /></group>);
  return (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={c} r={1} />{p.pattern ? <><B p={[0, h + 0.002, 0]} s={[w - 0.2, 0.004, d - 0.2]} c={tone(c, 0.2)} r={1} /><B p={[0, h + 0.004, 0]} s={[w - 0.5, 0.004, d - 0.5]} c={tone(c, -0.15)} r={1} /><B p={[0, h + 0.006, 0]} s={[w * 0.3, 0.004, d * 0.3]} c="#e9c46a" r={1} ry={0.78} /></> : <B p={[0, h + 0.002, 0]} s={[w - 0.12, 0.004, d - 0.12]} c={tone(c, 0.12)} r={1} />}</group>);
}
export function Curtain({ dims: [w, h, d], p, color }) {
  const c = color;
  if (p.kind === "roman") return (<group position={[0, 0, 0]}>{[0, 1, 2, 3].map((i) => <B key={i} p={[0, h - 0.18 - i * 0.28, 0]} s={[w, 0.25, d]} c={tone(c, i % 2 ? -0.04 : 0.02)} r={1} />)}<B p={[0, h + 0.01, 0]} s={[w + 0.06, 0.03, 0.06]} c="#555" /></group>);
  const folds = Math.round(w * 10);
  return (<group>
    <Cy p={[0, h + 0.03, 0]} r={0.015} h={w + 0.2} rz={Math.PI / 2} c="#444" m={0.8} />
    {Array.from({ length: folds }).map((_, i) => <B key={i} p={[-w / 2 + (w / folds) * (i + 0.5), h / 2, (i % 2) * 0.03]} s={[w / folds + 0.005, h, 0.025]} c={tone(c, i % 2 ? -0.05 : 0.03)} o={p.kind === "sheer" ? 0.45 : 1} r={1} />)}
  </group>);
}
export function Painting({ dims: [w, h, d], p, color }) {
  const frame = "#2b2b2e", c = color;
  const art = (x, ww, hh, col) => (<group position={[x, 0, 0]}><B p={[0, 0, 0]} s={[ww, hh, d]} c={frame} /><B p={[0, 0, d / 2 + 0.002]} s={[ww - 0.06, hh - 0.06, 0.004]} c={col} r={0.8} /><B p={[0, -hh * 0.2, d / 2 + 0.004]} s={[ww - 0.06, (hh - 0.06) * 0.4, 0.004]} c={tone(col, -0.2)} /><Sp p={[ww * 0.2, hh * 0.18, d / 2 + 0.006]} r={Math.min(ww, hh) * 0.12} c="#f4d35e" sz={0.05} /></group>);
  if (p.kind === "neon") return (<group><B p={[0, 0, 0]} s={[w, h, 0.01]} c="#111" o={0.5} /><Torus p={[-w * 0.22, 0, 0.03]} r={h * 0.3} t={0.012} c={c} rx={0} e={c} /><B p={[w * 0.15, 0, 0.03]} s={[w * 0.4, 0.025, 0.02]} c={c} e={c} /><Glow id="neon" p={[0, 0, 0.3]} color={c} intensity={1.5} dist={3} /></group>);
  if (p.kind === "tri") return (<group>{[-1, 0, 1].map((i) => <group key={i} position={[0, 0, 0]}>{(() => { const ww = w / 3 - 0.04; return art(i * (ww + 0.04), ww, h, tone(c, i * 0.12)); })()}</group>)}</group>);
  if (p.kind === "set") return (<group>{art(-w / 4, w / 2 - 0.05, h * 0.6, c)}{art(w / 4, w / 2 - 0.05, h * 0.9, tone(c, 0.2))}</group>);
  return art(0, w, h, c);
}
export function Clock({ dims: [w, h, d], p, color }) {
  if (p.pendulum) return (<group><B p={[0, h / 2, 0]} s={[w, h, d]} c={color} /><Cy p={[0, h * 0.78, d / 2 + 0.003]} r={w * 0.35} h={0.008} rx={Math.PI / 2} c="#f6f1e7" /><Cy p={[0, h * 0.32, d / 2 + 0.01]} r={0.04} h={0.01} rx={Math.PI / 2} c="#d4af37" m={0.8} /><B p={[0, h * 0.5, d / 2 + 0.008]} s={[0.01, 0.3, 0.005]} c="#d4af37" /></group>);
  return (<group position={[0, h / 2, 0]}><Cy p={[0, 0, 0]} r={w / 2} h={d} rx={Math.PI / 2} c={color} m={0.3} /><Cy p={[0, 0, d / 2 + 0.002]} r={w / 2 - 0.02} h={0.004} rx={Math.PI / 2} c="#f6f1e7" /><B p={[0, w * 0.12, d / 2 + 0.006]} s={[0.012, w * 0.26, 0.004]} c="#222" /><B p={[w * 0.08, 0, d / 2 + 0.006]} s={[w * 0.18, 0.012, 0.004]} c="#222" /></group>);
}
export function Vase({ dims: [w, h], p, color }) {
  if (p.bowl) return (<group><Cy p={[0, h / 2, 0]} r={w / 2} rb={w * 0.25} h={h} c={color} rough={0.3} /><Sp p={[0, h, 0]} r={w * 0.4} c="#e84a8a" sy={0.5} /></group>);
  return (<group><Cy p={[0, h * 0.4, 0]} r={w * 0.45} rb={w * 0.3} h={h * 0.8} c={color} rough={0.25} /><Cy p={[0, h * 0.9, 0]} r={w * 0.18} rb={w * 0.3} h={h * 0.2} c={color} rough={0.25} />{[0, 1, 2].map((i) => <Cy key={i} p={[(i - 1) * 0.04, h + 0.1, 0]} r={0.004} h={0.25} c="#3a8d55" rz={(i - 1) * 0.2} />)}</group>);
}

// ---------------------------------------------------------------- architecture (origin: centre of wall thickness, bottom)
export function Door({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind, f = "#e8e3da";
  const frame = (<>
    <B p={[-w / 2 + 0.03, h / 2, 0]} s={[0.06, h, d + 0.02]} c={f} /><B p={[w / 2 - 0.03, h / 2, 0]} s={[0.06, h, d + 0.02]} c={f} /><B p={[0, h - 0.03, 0]} s={[w, 0.06, d + 0.02]} c={f} />
  </>);
  if (k === "glass") return (<group>{frame}<B p={[-w / 4, h / 2, 0]} s={[w / 2 - 0.04, h - 0.1, 0.02]} c={GLASS} o={0.28} shadow={false} /><B p={[w / 4, h / 2, 0.03]} s={[w / 2 - 0.04, h - 0.1, 0.02]} c={GLASS} o={0.28} shadow={false} />{[-0.02, 0.5].map((x, i) => <B key={i} p={[x, h / 2, 0.03]} s={[0.03, h - 0.1, 0.03]} c="#2b2b2e" />)}</group>);
  if (k === "double" || k === "french") return (<group>{frame}{[-1, 1].map((s) => <group key={s}><B p={[s * (w / 4), h / 2 - 0.02, 0]} s={[w / 2 - 0.05, h - 0.1, 0.045]} c={k === "french" ? "#f2efe9" : c} />{k === "french" ? [0.6, 1.1, 1.6].map((y) => <B key={y} p={[s * w / 4, y, 0.03]} s={[w / 2 - 0.12, 0.3, 0.012]} c={GLASS} o={0.35} shadow={false} />) : [0.55, 1.5].map((y) => <B key={y} p={[s * w / 4, y, 0.03]} s={[w / 2 - 0.2, 0.7, 0.015]} c={tone(c, 0.08)} />)}<B p={[s * 0.06, h * 0.48, 0.05]} s={[0.025, 0.14, 0.025]} c="#d4af37" m={0.9} /></group>)}</group>);
  if (k === "arch") return (<group><B p={[0, (h - w / 2) / 2, 0]} s={[w, h - w / 2, 0.05]} c={c} /><Cy p={[0, h - w / 2, 0]} r={w / 2} h={0.05} rx={Math.PI / 2} c={c} /><B p={[0, 1.0, 0.03]} s={[w - 0.2, 1.6, 0.02]} c={tone(c, 0.08)} /><B p={[w * 0.35, 1.0, 0.06]} s={[0.025, 0.14, 0.025]} c="#d4af37" m={0.9} /></group>);
  if (k === "barn") return (<group><B p={[0, h + 0.03, 0.08]} s={[w * 2 + 0.1, 0.03, 0.03]} c="#222" m={0.8} /><B p={[w * 0.35, h / 2, 0.07]} s={[w, h - 0.05, 0.04]} c={c} />{[0.3, 0.7].map((t, i) => <B key={i} p={[w * 0.35, h * t, 0.1]} s={[w - 0.1, 0.03, 0.01]} c={tone(c, -0.2)} />)}</group>);
  if (k === "grill") return (<group>{frame}{Array.from({ length: 9 }).map((_, i) => <B key={i} p={[-w / 2 + 0.1 + i * ((w - 0.2) / 8), h / 2, 0.02]} s={[0.02, h - 0.1, 0.02]} c={c} m={0.8} />)}{[0.3, 1.0, 1.8].map((y) => <B key={y} p={[0, y, 0.02]} s={[w - 0.1, 0.025, 0.025]} c={c} m={0.8} />)}</group>);
  if (k === "steel") return (<group>{frame}<B p={[0, h / 2 - 0.02, 0]} s={[w - 0.1, h - 0.1, 0.05]} c={c} m={0.6} r={0.4} />{[0.3, 0.9, 1.5].map((y) => <B key={y} p={[0, y, 0.03]} s={[w - 0.2, 0.012, 0.01]} c="#4b5563" />)}<B p={[w / 2 - 0.12, h * 0.48, 0.05]} s={[0.025, 0.4, 0.025]} c="#c7ccd1" m={0.9} /></group>);
  return (<group>{frame}<B p={[0, h / 2 - 0.02, 0]} s={[w - 0.1, h - 0.1, 0.045]} c={c} />{k === "panel" && [[0.55, 0.7], [1.5, 0.7]].map(([y, hh], i) => <B key={i} p={[0, y, 0.026]} s={[w - 0.3, hh, 0.012]} c={tone(c, 0.07)} />)}<Cy p={[w / 2 - 0.12, h * 0.48, 0.045]} r={0.018} h={0.04} rx={Math.PI / 2} c="#d4af37" m={0.9} /><B p={[w / 2 - 0.18, h * 0.48, 0.065]} s={[0.1, 0.014, 0.014]} c="#d4af37" m={0.9} /></group>);
}
export function Window({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind, t = 0.05;
  const glass = <B p={[0, h / 2, 0]} s={[w - 0.06, h - 0.06, 0.012]} c={GLASS} o={0.22} r={0.05} shadow={false} />;
  const frame = (<><B p={[0, h - t / 2, 0]} s={[w, t, d + 0.04]} c={c} /><B p={[0, t / 2, 0]} s={[w, t, d + 0.08]} c={c} /><B p={[-w / 2 + t / 2, h / 2, 0]} s={[t, h, d + 0.04]} c={c} /><B p={[w / 2 - t / 2, h / 2, 0]} s={[t, h, d + 0.04]} c={c} /></>);
  if (k === "round") return (<group position={[0, h / 2, 0]}><Cy p={[0, 0, 0]} r={w / 2} h={0.012} rx={Math.PI / 2} c={GLASS} o={0.22} /><Torus p={[0, 0, 0]} r={w / 2} t={0.04} c={c} rx={0} /><B p={[0, 0, 0]} s={[w, 0.025, 0.03]} c={c} /><B p={[0, 0, 0]} s={[0.025, h, 0.03]} c={c} /></group>);
  if (k === "arch") return (<group>{frame}<B p={[0, (h - w / 2) / 2, 0]} s={[w - 0.06, h - w / 2, 0.012]} c={GLASS} o={0.22} shadow={false} /><Cy p={[0, h - w / 2, 0]} r={w / 2 - 0.03} h={0.012} rx={Math.PI / 2} c={GLASS} o={0.22} /><B p={[0, h / 2, 0]} s={[0.03, h - 0.06, 0.03]} c={c} /></group>);
  if (k === "louver") return (<group>{frame}{Array.from({ length: Math.floor(h / 0.1) }).map((_, i) => <B key={i} p={[0, 0.08 + i * 0.1, 0]} s={[w - 0.1, 0.06, 0.012]} c={GLASS} o={0.45} rx={-0.7} />)}</group>);
  return (<group>{frame}{glass}
    {(k === "case" || k === "french") && <><B p={[0, h / 2, 0]} s={[0.03, h - 0.06, 0.03]} c={c} />{k === "case" && <B p={[0, h / 2, 0]} s={[w - 0.06, 0.03, 0.03]} c={c} />}</>}
    {k === "slide" && <><B p={[0, h / 2, 0.02]} s={[0.04, h - 0.06, 0.03]} c={c} /><B p={[w / 4, h / 2, 0.02]} s={[w / 2 - 0.06, h - 0.12, 0.012]} c={GLASS} o={0.3} /></>}
    {k === "pic" && <B p={[w * 0.22, h / 2, 0]} s={[0.03, h - 0.06, 0.03]} c={c} />}
    {k === "wall" && [-1, 0, 1].map((i) => <B key={i} p={[i * (w / 3) + (i ? 0 : 0.0), h / 2, 0]} s={[0.03, h, 0.03]} c={c} />)}
    {k !== "vent" && <B p={[0, 0.0, d / 2 + 0.05]} s={[w + 0.12, 0.05, 0.14]} c="#e8e3da" />}
  </group>);
}
export function Stairs({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind, n = Math.max(8, Math.round(h / 0.18)), rise = h / n;
  if (k === "spiral") return (<group><Cy p={[0, h / 2, 0]} r={0.08} h={h} c="#2b2b2e" m={0.7} />{Array.from({ length: n }).map((_, i) => <B key={i} p={[Math.cos(i * 0.5) * w * 0.22, rise * (i + 1) - 0.02, Math.sin(i * 0.5) * w * 0.22]} s={[w / 2, 0.04, 0.3]} c={c} ry={-i * 0.5} />)}</group>);
  const flight = (len, x, z, ry, steps, y0) => (<group position={[x, y0, z]} rotation={[0, ry, 0]}>{Array.from({ length: steps }).map((_, i) => (<group key={i}><B p={[0, rise * (i + 0.5), -len / 2 + (len / steps) * (i + 0.5)]} s={[w, rise, len / steps]} c={tone(c, i % 2 ? 0 : 0.03)} />{k !== "float" && <B p={[0, rise * (i + 0.5) / 2, -len / 2 + (len / steps) * (i + 0.5)]} s={[w * 0.9, rise * (i + 0.5), len / steps]} c="#cfc6b8" />}</group>))}{[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.02), rise * steps / 2 + 0.45, 0]} s={[0.03, 0.04, len]} c="#2b2b2e" rx={-Math.atan2(rise * steps, len)} />)}</group>);
  if (k === "L") return (<group>{flight(d - w, -(w) / 2 + 0.0, 0, 0, Math.floor(n / 2), 0)}</group>);
  if (k === "U") return (<group>{flight(d, -w / 2 + 0.0, 0, 0, Math.floor(n / 2), 0)}{flight(d, w / 2 - 0.0, 0, Math.PI, Math.ceil(n / 2), rise * Math.floor(n / 2))}</group>);
  return flight(d, 0, 0, 0, n, 0);
}
export function Railing({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind;
  if (k === "glass") return (<group><B p={[0, h / 2, 0]} s={[w, h - 0.06, 0.02]} c={GLASS} o={0.28} shadow={false} /><B p={[0, h, 0]} s={[w, 0.05, 0.05]} c="#c7ccd1" m={0.9} /></group>);
  const n = Math.round(w / 0.12);
  return (<group><B p={[0, h, 0]} s={[w, 0.05, 0.06]} c={c} m={k === "wood" ? 0 : 0.8} />{Array.from({ length: n + 1 }).map((_, i) => <B key={i} p={[-w / 2 + (w / n) * i, h / 2, 0]} s={[0.02, h, 0.02]} c={c} m={k === "wood" ? 0 : 0.8} />)}<B p={[0, 0.1, 0]} s={[w, 0.03, 0.03]} c={c} /></group>);
}
export function Pillar({ dims: [w, h], p, color }) {
  return p.kind === "square" ? (<group><B p={[0, h / 2, 0]} s={[w, h, w]} c={color} /><B p={[0, 0.06, 0]} s={[w + 0.08, 0.12, w + 0.08]} c={tone(color, -0.05)} /><B p={[0, h - 0.06, 0]} s={[w + 0.08, 0.12, w + 0.08]} c={tone(color, -0.05)} /></group>) : (<group><Cy p={[0, h / 2, 0]} r={w / 2} h={h} c={color} />{p.kind === "roman" && Array.from({ length: 12 }).map((_, i) => <B key={i} p={[Math.cos(i * 0.52) * w / 2, h / 2, Math.sin(i * 0.52) * w / 2]} s={[0.02, h - 0.3, 0.02]} c={tone(color, -0.08)} ry={-i * 0.52} />)}<Cy p={[0, 0.08, 0]} r={w / 2 + 0.06} h={0.16} c={tone(color, -0.05)} /><Cy p={[0, h - 0.08, 0]} r={w / 2 + 0.06} h={0.16} c={tone(color, -0.05)} /></group>);
}

// ---------------------------------------------------------------- outdoor
export function Tree({ dims: [w, h], p, color }) {
  const c = color, k = p.kind;
  if (k === "palm") return (<group><Cy p={[0, h / 2, 0]} r={0.12} rb={0.18} h={h} c="#8b6f47" />{Array.from({ length: 9 }).map((_, i) => <B key={i} p={[Math.cos(i * 0.7) * w * 0.3, h - 0.1, Math.sin(i * 0.7) * w * 0.3]} s={[w * 0.55, 0.02, 0.3]} c={tone(c, (i % 2) * 0.05)} ry={-i * 0.7} rz={-0.4} />)}{[0, 1, 2].map((i) => <Sp key={i} p={[Math.cos(i * 2.1) * 0.12, h - 0.2, Math.sin(i * 2.1) * 0.12]} r={0.09} c="#6b4f3a" />)}</group>);
  if (k === "pine") return (<group><Cy p={[0, 0.5, 0]} r={0.1} rb={0.14} h={1} c="#6b4f3a" />{[0, 1, 2, 3].map((i) => <Cone key={i} p={[0, 1.2 + i * (h * 0.2), 0]} r={w * (0.5 - i * 0.1)} h={h * 0.4} c={tone(c, i * 0.03)} />)}</group>);
  return (<group><Cy p={[0, h * 0.3, 0]} r={0.12} rb={0.2} h={h * 0.6} c="#6b4f3a" />{[[0, 0.72, 0, 0.5], [0.4, 0.62, 0.15, 0.36], [-0.38, 0.64, -0.1, 0.36], [0.1, 0.84, -0.3, 0.32], [-0.1, 0.58, 0.4, 0.3]].map(([x, y, z, s], i) => <Sp key={i} p={[x * w, y * h, z * w]} r={w * s} sy={0.85} c={tone(c, (i % 3) * 0.04)} rough={1} />)}</group>);
}
export function Bush({ dims: [w, h, d], p, color }) {
  if (p.kind === "hedge") return <B p={[0, h / 2, 0]} s={[w, h, d]} c={color} r={1} />;
  if (p.kind === "flower") return (<group><B p={[0, 0.1, 0]} s={[w, 0.2, d]} c="#6b4f3a" r={1} />{Array.from({ length: 24 }).map((_, i) => <Sp key={i} p={[((i * 37) % 100) / 100 * (w - 0.1) - w / 2 + 0.05, 0.25, (((i * 53) % 100) / 100) * (d - 0.1) - d / 2 + 0.05]} r={0.07} c={i % 3 ? color : "#f4d35e"} sy={0.8} />)}</group>);
  return (<group><Sp p={[0, h * 0.45, 0]} r={w / 2} sy={h / w} c={color} rough={1} /><Sp p={[w * 0.25, h * 0.4, 0.1]} r={w * 0.35} sy={h / w} c={tone(color, 0.05)} rough={1} /></group>);
}
export function Bench({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind;
  if (k === "picnic") return (<group><B p={[0, h - 0.025, 0]} s={[w, 0.05, d * 0.5]} c={c} />{[-1, 1].map((s) => <group key={s}><B p={[0, 0.45, s * d * 0.42]} s={[w, 0.05, 0.25]} c={c} /><B p={[s * (w / 2 - 0.2), 0.3, 0]} s={[0.06, 0.8, d]} c={tone(c, -0.1)} rx={0} /></group>)}</group>);
  if (k === "stone") return (<group><B p={[0, h - 0.04, 0]} s={[w, 0.08, d]} c={c} r={0.9} />{[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.12), (h - 0.08) / 2, 0]} s={[0.2, h - 0.08, d - 0.05]} c={tone(c, -0.1)} r={0.9} />)}</group>);
  return (<group>{[0, 1, 2, 3].map((i) => <B key={i} p={[0, 0.45, -d / 2 + 0.07 + i * 0.12]} s={[w, 0.03, 0.1]} c={c} />)}{[0, 1, 2].map((i) => <B key={i} p={[0, 0.55 + i * 0.12, -d / 2 + 0.04]} s={[w, 0.09, 0.025]} c={c} rx={-0.15} />)}{[-1, 1].map((s) => <group key={s}><B p={[s * (w / 2 - 0.05), 0.22, 0]} s={[0.05, 0.45, d - 0.05]} c={k === "iron" ? "#2b2b2e" : tone(c, -0.15)} m={k === "iron" ? 0.8 : 0} /><B p={[s * (w / 2 - 0.05), 0.65, -d / 2 + 0.04]} s={[0.05, 0.4, 0.05]} c={tone(c, -0.15)} /></group>)}</group>);
}
export function Swing({ dims: [w, h, d], p, color }) {
  if (p.kind === "egg") return (<group><Cy p={[0, h - 0.01, 0]} r={0.02} h={0.02} c="#555" /><Cy p={[0, h - 0.5, 0]} r={0.004} h={1} c="#555" /><Sp p={[0, h - 1.25, 0]} r={0.45} c={color} sy={1.1} o={0.8} /><Sp p={[0, h - 1.4, 0.05]} r={0.3} c="#fdf2f8" sy={0.7} rough={1} /></group>);
  return (<group>{[-1, 1].map((s) => <group key={s}><B p={[s * (w / 2 - 0.05), h / 2, -d / 2 + 0.05]} s={[0.07, h, 0.07]} c={color} rx={0} rz={s * -0.08} /><B p={[s * (w / 2 - 0.05), h / 2, d / 2 - 0.05]} s={[0.07, h, 0.07]} c={color} rz={s * -0.08} /></group>)}<B p={[0, h - 0.03, 0]} s={[w + 0.1, 0.08, 0.08]} c={color} />{[-1, 1].map((s) => <Cy key={s} p={[s * (w / 2 - 0.35), h / 2 - 0.0, 0]} r={0.006} h={h - 0.5} c="#555" />)}<B p={[0, 0.5, 0]} s={[w - 0.5, 0.05, 0.4]} c={tone(color, 0.1)} /></group>);
}
export function Fountain({ dims: [w, h, d], p, color }) {
  const c = color;
  if (p.kind === "wall") return (<group><B p={[0, h / 2, -d / 2 + 0.05]} s={[w, h, 0.1]} c={c} /><B p={[0, 0.1, 0]} s={[w, 0.2, d]} c={c} /><B p={[0, 0.2, 0]} s={[w - 0.1, 0.01, d - 0.1]} c="#38bdf8" o={0.8} />{[-0.3, 0, 0.3].map((x) => <B key={x} p={[x, h * 0.5, -d / 2 + 0.12]} s={[0.04, h * 0.7, 0.02]} c="#9fd8ef" o={0.6} />)}</group>);
  if (p.kind === "pond") return (<group><Cy p={[0, 0.2, 0]} r={w / 2} h={0.4} c="#8d8d8d" /><Cy p={[0, 0.36, 0]} r={w / 2 - 0.1} h={0.05} c="#38bdf8" o={0.85} rough={0.1} />{[[0.3, 0.2], [-0.4, -0.2], [0.0, -0.45]].map(([x, z], i) => <Cy key={i} p={[x, 0.4, z]} r={0.16} h={0.01} c="#3a8d55" />)}</group>);
  return (<group><Cy p={[0, 0.2, 0]} r={w / 2} h={0.4} c={c} /><Cy p={[0, 0.36, 0]} r={w / 2 - 0.08} h={0.05} c="#38bdf8" o={0.85} /><Cy p={[0, 0.7, 0]} r={0.1} h={0.6} c={c} /><Cy p={[0, 1.0, 0]} r={0.4} rb={0.1} h={0.12} c={c} /><Cy p={[0, 1.08, 0]} r={0.33} h={0.04} c="#38bdf8" o={0.85} /><Cy p={[0, 1.25, 0]} r={0.015} h={0.35} c="#bfe9ff" o={0.7} /></group>);
}
export function Pool({ dims: [w, h, d], p, color }) {
  return (<group><B p={[0, 0.03, 0]} s={[w + 0.5, 0.06, d + 0.5]} c="#e5e7eb" r={0.8} /><B p={[0, 0.12, 0]} s={[w, 0.12, d]} c={color} o={0.8} r={0.05} m={0.1} shadow={false} />{p.kind === "kidney" && <Cy p={[w * 0.25, 0.12, d * 0.1]} r={d * 0.45} h={0.12} c={color} o={0.8} rough={0.05} />}{[[-1, -1], [1, -1]].map(([a, b], i) => <Cy key={i} p={[a * (w / 2 - 0.5), 0.12, b * (d / 2) - 0.05]} r={0.015} h={0.5} c="#c7ccd1" m={0.9} />)}</group>);
}
export function Fence({ dims: [w, h, d], p, color }) {
  if (p.kind === "wall") return <B p={[0, h / 2, 0]} s={[w, h, d]} c={color} r={0.95} />;
  const n = Math.round(w / 0.14);
  return (<group>{[0.3, 0.7].map((y) => <B key={y} p={[0, h * y, 0]} s={[w, 0.05, d]} c={color} m={p.kind === "iron" ? 0.7 : 0} />)}{Array.from({ length: n + 1 }).map((_, i) => <group key={i} position={[-w / 2 + (w / n) * i, 0, 0]}><B p={[0, h / 2, 0]} s={[p.kind === "iron" ? 0.02 : 0.07, h, d]} c={color} m={p.kind === "iron" ? 0.7 : 0} />{p.kind === "iron" && <Cone p={[0, h + 0.04, 0]} r={0.02} h={0.08} c={color} seg={4} />}</group>)}</group>);
}
export function Gate({ dims: [w, h, d], p, color }) {
  const n = Math.round(w / 0.16);
  return (<group>{[-1, 1].map((s) => <B key={s} p={[s * (w / 2 + 0.1), h / 2 + 0.1, 0]} s={[0.22, h + 0.2, 0.22]} c="#b8b0a4" />)}<B p={[0, h - 0.04, 0]} s={[w, 0.06, d]} c={color} m={0.7} /><B p={[0, 0.2, 0]} s={[w, 0.06, d]} c={color} m={0.7} />{Array.from({ length: n + 1 }).map((_, i) => <B key={i} p={[-w / 2 + (w / n) * i, h / 2, 0]} s={[0.03, h - 0.1, d]} c={color} m={0.7} />)}{p.kind === "slide" && <B p={[0, 0.05, 0]} s={[w + 1, 0.04, 0.05]} c="#555" />}</group>);
}
export function Pergola({ dims: [w, h, d], p, color }) {
  return (<group>{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.1), h / 2, b * (d / 2 - 0.1)]} s={[0.16, h, 0.16]} c={color} m={p.gazebo ? 0.6 : 0} />)}{[-1, 1].map((s) => <B key={s} p={[0, h - 0.1, s * (d / 2 - 0.1)]} s={[w + 0.4, 0.14, 0.12]} c={color} />)}{Array.from({ length: 9 }).map((_, i) => <B key={i} p={[-w / 2 + (w / 8) * i, h, 0]} s={[0.06, 0.08, d + 0.4]} c={tone(color, -0.05)} />)}{p.gazebo && <Cone p={[0, h + 0.5, 0]} r={Math.max(w, d) * 0.72} h={1} c="#2f3640" seg={4} />}</group>);
}
export function LampPost({ id, dims: [w, h], p, color }) {
  const k = p.kind;
  return (<group><Cy p={[0, k === "bollard" ? h / 2 : h / 2, 0]} r={k === "bollard" ? 0.09 : 0.03} rb={k === "bollard" ? 0.1 : 0.05} h={h} c={color} m={0.6} />{k === "bollard" ? <Cy p={[0, h - 0.1, 0]} r={0.092} h={0.1} c="#fff3c4" e="#ffe08a" /> : <><Sp p={[0, h + 0.05, 0]} r={0.14} c="#fff3c4" e="#ffe08a" /><Cone p={[0, h + 0.2, 0]} r={0.18} h={0.12} c={color} /></>}<Glow id={id} p={[0, h, 0]} intensity={5} dist={8} /></group>);
}
export function Sunbed({ dims: [w, h, d], p, color }) {
  if (p.hammock) return (<group>{[-1, 1].map((s) => <B key={s} p={[0, h / 2, s * (d / 2 - 0.05)]} s={[0.07, h, 0.07]} c="#6b4f3a" />)}<B p={[0, h * 0.45, 0]} s={[w * 0.4, 0.04, d - 0.3]} c={color} r={1} rx={0} /><Sp p={[0, h * 0.4, 0]} r={0.45} sy={0.25} sz={2.2} c={color} rough={1} /></group>);
  return (<group><B p={[0, 0.22, 0.0]} s={[w, 0.1, d * 0.6]} c={color} r={1} /><B p={[0, 0.4, -d / 2 + 0.3]} s={[w, 0.1, 0.7]} c={color} r={1} rx={-0.9} /><B p={[0, 0.1, 0]} s={[w - 0.1, 0.2, d * 0.6 - 0.05]} c="#c7ccd1" m={0.7} /></group>);
}
export function Basic({ dims: [w, h, d], type, color }) {
  if (type === "sphere") return <Sp p={[0, h / 2, 0]} r={w / 2} sy={h / w} sz={d / w} c={color} />;
  if (type === "cylinder") return <Cy p={[0, h / 2, 0]} r={w / 2} h={h} c={color} />;
  if (type === "cone") return <Cone p={[0, h / 2, 0]} r={w / 2} h={h} c={color} />;
  return <B p={[0, h / 2, 0]} s={[w, h, d]} c={color} />;
}
