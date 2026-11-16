// Bedroom / living / dining / storage models. Local frame: origin = bottom centre, front = +Z.
import { B, Cone, Cy, Sp, Torus, GLASS, MIRROR, tone } from "./prims.jsx";

function Handle({ x, y, z, v = false, kind = "bar" }) {
  if (kind === "none") return null;
  if (kind === "knob") return <Cy p={[x, y, z]} r={0.018} h={0.03} rx={Math.PI / 2} c="#d4af37" m={0.9} rough={0.3} />;
  return <B p={[x, y, z]} s={v ? [0.016, 0.16, 0.016] : [0.16, 0.016, 0.016]} c="#c7ccd1" m={0.9} r={0.25} />;
}

export function Wardrobe({ dims: [w, h, d], p, color }) {
  const { kind = "hinged", doors = 2, loft, two, handle = "bar" } = p;
  const c = color;
  const open = ["open", "rail", "walkin"].includes(kind);
  const main = loft ? h * 0.76 : h;
  const dw = doors ? w / doors : w;
  const door = (i, y0, hh, k) => {
    const x = -w / 2 + dw * (i + 0.5);
    const z = d / 2 + (kind === "sliding" || kind === "mirror" && !p.hinged ? (i % 2 ? 0.02 : -0.02) : 0.012);
    const col = two && i % 2 ? tone(c, -0.35) : c;
    const mat = kind === "mirror" ? { c: MIRROR, m: 0.9, r: 0.06 } : kind === "glass" ? { c: "#222a33", o: 0.55, r: 0.1 } : { c: col, r: 0.6 };
    return (
      <group key={`${k}${i}`}>
        <B p={[x, y0 + hh / 2, z]} s={[dw - 0.012, hh - 0.03, 0.024]} {...mat} />
        {kind === "louvre" && Array.from({ length: Math.floor(hh / 0.07) }).map((_, j) => <B key={j} p={[x, y0 + 0.05 + j * 0.07, z + 0.014]} s={[dw - 0.08, 0.012, 0.012]} c={tone(c, -0.15)} />)}
        {kind === "fluted" && Array.from({ length: Math.floor(dw / 0.05) }).map((_, j) => <B key={j} p={[x - dw / 2 + 0.04 + j * 0.05, y0 + hh / 2, z + 0.014]} s={[0.02, hh - 0.08, 0.012]} c={tone(c, -0.1)} />)}
        {kind === "glass" && <B p={[x, y0 + hh / 2, z]} s={[dw, hh, 0.012]} c={tone(c, 0.1)} o={0.01} shadow={false} />}
        {handle !== "none" && (kind !== "flat") && <Handle x={x + (i % 2 ? -dw / 2 + 0.06 : dw / 2 - 0.06)} y={y0 + hh * 0.5} z={z + 0.02} v kind={handle} />}
      </group>
    );
  };
  if (kind === "corner") {
    return (<group>
      <B p={[0, h / 2, -d / 2 + 0.01]} s={[w, h, d]} c={c} />
      <B p={[-w / 2 + d / 2, h / 2, d / 2 + 0.01]} s={[d, h, w - d]} c={c} />
      {[0, 1].map((i) => <B key={i} p={[-w / 2 + (0.1 + i * 0.6), h / 2, d + 0.02 - 0.0]} s={[0.55, h - 0.05, 0.02]} c={tone(c, -0.08)} />)}
      <Handle x={0.1} y={h / 2} z={d + 0.04} v />
    </group>);
  }
  if (kind === "combo") {
    const ww = w * 0.62;
    return (<group>
      <B p={[-w / 2 + ww / 2, h / 2, 0]} s={[ww, h, d]} c={c} />
      {[0, 1].map((i) => <B key={i} p={[-w / 2 + ww * (0.25 + 0.5 * i), h / 2, d / 2 + 0.012]} s={[ww / 2 - 0.01, h - 0.03, 0.024]} c={tone(c, 0.05)} />)}
      <B p={[w / 2 - (w - ww) / 2, 0.45, 0.04]} s={[w - ww, 0.9, d - 0.1]} c={tone(c, -0.1)} />
      {[0, 1, 2].map((i) => <B key={i} p={[w / 2 - (w - ww) / 2, 0.15 + i * 0.28, d / 2 - 0.04]} s={[w - ww - 0.04, 0.25, 0.02]} c={tone(c, 0.1)} />)}
      <B p={[w / 2 - (w - ww) / 2, 1.4, -d / 2 + 0.03]} s={[w - ww - 0.1, 0.8, 0.02]} c={MIRROR} m={0.9} r={0.05} />
    </group>);
  }
  if (open) {
    const rail = kind === "rail" || kind === "walkin";
    return (<group>
      {[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.02), h / 2, 0]} s={[0.04, h, d]} c={c} m={rail ? 0.7 : 0} />)}
      <B p={[0, h - 0.02, 0]} s={[w, 0.04, d]} c={c} m={rail ? 0.7 : 0} />
      <B p={[0, 0.04, 0]} s={[w, 0.08, d]} c={c} m={rail ? 0.7 : 0} />
      <B p={[0, h / 2, -d / 2 + 0.01]} s={[w, h, 0.02]} c={tone(c, -0.08)} />
      {kind === "open" && [0.45, 0.9, 1.35, 1.7].filter((y) => y < h - 0.1).map((y) => <B key={y} p={[0, y, 0]} s={[w - 0.06, 0.03, d - 0.02]} c={c} />)}
      {rail && <Cy p={[0, h * 0.82, 0]} r={0.012} h={w - 0.08} rz={Math.PI / 2} c="#c7ccd1" m={0.9} />}
      {rail && [0.25, 0.45].map((s) => <B key={s} p={[-w / 4 + s * 0.2, h * 0.5, 0]} s={[0.35, 0.8, 0.02]} c="#6b7280" />)}
      {kind === "walkin" && <B p={[0, 0.05, 0]} s={[w - 0.1, 0.02, d - 0.05]} c="#e5e5e5" />}
    </group>);
  }
  return (<group>
    <B p={[0, main / 2, 0]} s={[w, main, d]} c={tone(c, -0.12)} />
    {Array.from({ length: doors || 1 }).map((_, i) => door(i, 0.02, main - 0.02, "d"))}
    {loft && Array.from({ length: Math.max(2, doors) }).map((_, i) => {
      const lw = w / Math.max(2, doors);
      return <B key={i} p={[-w / 2 + lw * (i + 0.5), main + (h - main) / 2, d / 2 + 0.012]} s={[lw - 0.012, h - main - 0.02, 0.024]} c={tone(c, 0.05)} />;
    })}
    {loft && <B p={[0, main + (h - main) / 2, 0]} s={[w, h - main, d]} c={tone(c, -0.12)} />}
  </group>);
}

export function Bed({ dims: [w, h, l], p, color }) {
  const { size, head = "panel", storage, bunk, posts, low, day, kids } = p;
  const c = color;
  if (size === "cot") {
    return (<group>
      <B p={[0, 0.3, 0]} s={[w, 0.06, l]} c={tone(c, -0.05)} />
      {Array.from({ length: 11 }).map((_, i) => <B key={i} p={[-w / 2 + 0.04 + i * ((w - 0.08) / 10), 0.62, l / 2 - 0.02]} s={[0.02, 0.6, 0.02]} c={c} />)}
      {Array.from({ length: 11 }).map((_, i) => <B key={i} p={[-w / 2 + 0.04 + i * ((w - 0.08) / 10), 0.62, -l / 2 + 0.02]} s={[0.02, 0.6, 0.02]} c={c} />)}
      {[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.02), 0.62, 0]} s={[0.03, 0.6, l]} c={c} />)}
      <B p={[0, 0.4, 0]} s={[w - 0.06, 0.1, l - 0.06]} c="#fdf2f8" r={1} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.02), 0.45, b * (l / 2 - 0.02)]} s={[0.05, 0.9, 0.05]} c={tone(c, -0.1)} />)}
    </group>);
  }
  if (size === "round") {
    return (<group>
      <Cy p={[0, 0.2, 0]} r={w / 2} h={0.4} c={tone(c, -0.15)} />
      <Cy p={[0, 0.5, 0]} r={w / 2 - 0.06} h={0.25} c="#f4f1ea" rough={1} />
      <Cy p={[0, 0.65, 0]} r={w / 2 - 0.5} h={0.04} c={c} rough={1} />
      {[-0.4, 0.4].map((x) => <Sp key={x} p={[x, 0.75, -w / 2 + 0.35]} r={0.22} sy={0.4} c="#fafafa" rough={1} />)}
      <Cy p={[0, 0.9, -w / 2 + 0.07]} r={w / 2} h={0.9} c={c} open seg={40} />
    </group>);
  }
  const mat = (y) => (
    <>
      <B p={[0, y, 0.0]} s={[w - 0.06, 0.2, l - 0.1]} c="#f4f1ea" r={1} />
      <B p={[0, y + 0.1, 0.18]} s={[w - 0.04, 0.05, l * 0.55]} c={kids ? "#ffd6e0" : "#6b83b5"} r={1} />
      {[-1, 1].map((s) => <B key={s} p={[s * w * 0.22, y + 0.17, -l / 2 + 0.3]} s={[w * 0.38, 0.12, 0.38]} c="#fafafa" r={1} />)}
    </>
  );
  const baseH = low ? 0.22 : storage ? 0.42 : 0.3;
  const legsH = low || storage ? 0 : 0.18;
  const matY = baseH + (low || storage ? 0.12 : 0.22);
  const headH = head === "none" ? 0 : head === "tall" ? 1.15 : head === "tufted" ? 1.2 : 0.95;
  return (<group>
    <B p={[0, legsH + baseH / 2, 0]} s={[w, baseH, l]} c={c} />
    {!low && !storage && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.05), legsH / 2, b * (l / 2 - 0.05)]} s={[0.07, legsH, 0.07]} c={tone(c, -0.15)} />)}
    {storage && [0, 1].map((i) => <B key={i} p={[0, 0.2, l / 2 + 0.003]} s={[w - 0.1, 0.3, 0.01]} c={tone(c, 0.08)} />)}
    {mat(matY)}
    {head !== "none" && <B p={[0, headH / 2 + 0.05, -l / 2 + 0.04]} s={[w + 0.04, headH, 0.08]} c={head === "tufted" ? "#5b6c8f" : tone(c, -0.05)} r={head === "tufted" ? 1 : 0.6} />}
    {head === "tufted" && [-0.6, -0.2, 0.2, 0.6].flatMap((x) => [0.55, 0.9]).length > 0 && [-0.6, -0.2, 0.2, 0.6].map((k) => [0.55, 0.9].map((y) => <Sp key={`${k}${y}`} p={[k * (w / 2.2), y, -l / 2 + 0.09]} r={0.02} c="#d4af37" m={0.8} />))}
    {head === "slat" && [0.3, 0.5, 0.7].map((y) => <B key={y} p={[0, y, -l / 2 + 0.085]} s={[w - 0.1, 0.05, 0.02]} c={tone(c, 0.1)} />)}
    {day && [-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.03), 0.55, 0]} s={[0.05, 0.5, l - 0.2]} c={c} />)}
    {posts && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.04), h / 2, b * (l / 2 - 0.04)]} s={[0.07, h, 0.07]} c={tone(c, -0.1)} />)}
    {posts && <B p={[0, h - 0.04, 0]} s={[w, 0.05, l]} c="#f4f1ea" o={0.5} />}
    {bunk && <>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.03), h / 2, b * (l / 2 - 0.03)]} s={[0.06, h, 0.06]} c={c} />)}
      <B p={[0, 1.2, 0]} s={[w - 0.06, 0.12, l - 0.08]} c={c} />
      <B p={[0, 1.36, 0]} s={[w - 0.12, 0.16, l - 0.16]} c="#f4f1ea" r={1} />
      {[0.4, 0.7, 1.0].map((y) => <B key={y} p={[w / 2 - 0.04, y + 0.3, l / 2 - 0.45]} s={[0.04, 0.04, 0.3]} c={tone(c, -0.1)} rz={0} />)}
    </>}
  </group>);
}

export function Bedside({ dims: [w, h, d], p, color }) {
  const c = color;
  if (p.round) return (<group><Cy p={[0, h - 0.02, 0]} r={w / 2} h={0.04} c={c} />{[0, 1, 2].map((i) => <Cy key={i} p={[Math.cos(i * 2.1) * w * 0.28, h / 2, Math.sin(i * 2.1) * w * 0.28]} r={0.018} h={h} c={tone(c, -0.1)} />)}</group>);
  const y0 = p.float ? 0.35 : 0;
  return (<group>
    <B p={[0, y0 + (h - y0) / 2, 0]} s={[w, h - y0, d]} c={c} />
    {p.open ? <B p={[0, y0 + (h - y0) / 2, d / 2 - 0.01]} s={[w - 0.08, h - y0 - 0.08, 0.02]} c="#222" /> :
      Array.from({ length: p.drawers || 1 }).map((_, i) => { const dh = (h - y0 - 0.06) / (p.drawers || 1); return (<group key={i}><B p={[0, y0 + 0.03 + dh * (i + 0.5), d / 2 + 0.005]} s={[w - 0.04, dh - 0.02, 0.02]} c={tone(c, 0.07)} /><B p={[0, y0 + 0.03 + dh * (i + 0.5), d / 2 + 0.025]} s={[0.12, 0.014, 0.014]} c="#c7ccd1" m={0.9} /></group>); })}
    {!p.float && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.03), -0.0, b * (d / 2 - 0.03)]} s={[0.04, 0.02, 0.04]} c="#000" />)}
  </group>);
}

export function Sofa({ dims: [w, h, d], p, color }) {
  const c = color, dark = tone(c, -0.1), light = tone(c, 0.07);
  if (p.kind === "bean") return (<group><Sp p={[0, 0.3, 0]} r={w / 2} sy={0.62} c={c} rough={1} /><Sp p={[0, 0.6, -0.2]} r={w / 3} sy={0.9} c={light} rough={1} /></group>);
  if (p.kind === "diwan") return (<group>
    <B p={[0, 0.2, 0]} s={[w, 0.4, d]} c={tone(c, -0.2)} />
    <B p={[0, 0.46, 0]} s={[w - 0.04, 0.14, d - 0.04]} c="#e8d9b5" r={1} />
    {[-1, 1].map((s) => <Cy key={s} p={[s * (w / 2 - 0.15), 0.72, 0]} r={0.12} h={d - 0.1} rx={Math.PI / 2} c="#c1121f" rough={1} />)}
    <B p={[0, 0.7, -d / 2 + 0.1]} s={[w - 0.1, 0.4, 0.14]} c="#d4af37" r={1} />
  </group>);
  const seatH = 0.42, armW = 0.18;
  const lin = (x0, ww, seats, depth, z0 = 0) => (<group position={[x0, 0, z0]}>
    <B p={[0, seatH / 2 + 0.08, 0]} s={[ww, seatH, depth]} c={dark} r={0.9} />
    {Array.from({ length: seats }).map((_, i) => <B key={i} p={[-ww / 2 + armW + ((ww - 2 * armW) / seats) * (i + 0.5), seatH + 0.14, 0.06]} s={[(ww - 2 * armW) / seats - 0.02, 0.14, depth - 0.2]} c={light} r={1} />)}
    <B p={[0, h / 2 + 0.1, -depth / 2 + 0.11]} s={[ww, h - 0.1, 0.2]} c={c} r={1} />
    {[-1, 1].map((s) => <B key={s} p={[s * (ww / 2 - armW / 2), seatH + 0.2, 0]} s={[armW, 0.36, depth]} c={c} r={1} />)}
    {p.recline && <B p={[0, 0.12, 0.45]} s={[ww - 0.2, 0.1, 0.4]} c={dark} />}
  </group>);
  if (p.kind === "L") return (<group>{lin(0, w, Math.max(2, Math.round(w / 0.8)), d < 1 ? d : 0.9, -(w > 2.5 ? 0.5 : 0.3))}<B p={[w / 2 - 0.5, seatH / 2 + 0.08, 0.55]} s={[1.0, seatH, 1.1]} c={dark} /><B p={[w / 2 - 0.5, seatH + 0.14, 0.6]} s={[0.9, 0.14, 1.0]} c={light} r={1} /></group>);
  if (p.kind === "U") return (<group>{lin(0, w, 4, 0.9, -d / 2 + 0.45)}{[-1, 1].map((s) => <group key={s}><B p={[s * (w / 2 - 0.5), seatH / 2 + 0.08, 0.1]} s={[1.0, seatH, d - 0.9]} c={dark} /><B p={[s * (w / 2 - 0.5), seatH + 0.14, 0.1]} s={[0.9, 0.14, d - 1]} c={light} r={1} /></group>)}</group>);
  return (<group>
    {lin(0, w, p.seats || 2, d)}
    {p.tufted && Array.from({ length: (p.seats || 3) * 3 }).map((_, i) => <Sp key={i} p={[-w / 2 + 0.3 + i * ((w - 0.6) / ((p.seats || 3) * 3 - 1)), 0.6, -d / 2 + 0.22]} r={0.02} c="#d4af37" m={0.8} />)}
    {(p.seats || 2) >= 2 && [-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.35), 0.62, -0.05]} s={[0.4, 0.4, 0.12]} c={tone(c, 0.25)} r={1} rx={-0.25} />)}
  </group>);
}

export function CoffeeTable({ dims: [w, h, d], p, color }) {
  const c = color, top = p.top === "glass" ? { c: GLASS, o: 0.45, r: 0.05 } : p.top === "marble" ? { c: "#eceff1", r: 0.2, m: 0.1 } : { c, r: 0.5 };
  if (p.shape === "round") return (<group><Cy p={[0, h - 0.02, 0]} r={w / 2} h={0.04} c={top.c} rough={top.r} />{[0, 1, 2].map((i) => <Cy key={i} p={[Math.cos(i * 2.09) * w * 0.3, h / 2, Math.sin(i * 2.09) * w * 0.3]} r={0.02} h={h} c={c} m={0.8} />)}</group>);
  if (p.shape === "nest") return (<group>{[[0, 0.45, 0.6], [0.2, 0.36, 0.45]].map(([x, hh, ww], i) => (<group key={i}><B p={[x - 0.2 + i * 0.1, hh, i * 0.05]} s={[ww, 0.035, 0.45]} c={i ? tone(c, 0.2) : c} />{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], j) => <B key={j} p={[x - 0.2 + i * 0.1 + a * (ww / 2 - 0.03), hh / 2, i * 0.05 + b * 0.19]} s={[0.025, hh, 0.025]} c="#2b2b2e" m={0.8} />)}</group>))}</group>);
  if (p.shape === "slab") return (<group><B p={[0, h - 0.04, 0]} s={[w, 0.07, d]} c={c} r={0.4} />{[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.12), (h - 0.07) / 2, 0]} s={[0.05, h - 0.07, d - 0.1]} c="#2b2b2e" m={0.8} />)}</group>);
  return (<group><B p={[0, h - 0.02, 0]} s={[w, 0.04, d]} c={top.c} r={top.r} o={top.o || 1} m={top.m || 0} />{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.04), (h - 0.04) / 2, b * (d / 2 - 0.04)]} s={[0.045, h - 0.04, 0.045]} c={p.top ? "#2b2b2e" : tone(c, -0.1)} m={p.top ? 0.8 : 0} />)}{!p.low && <B p={[0, 0.12, 0]} s={[w - 0.12, 0.025, d - 0.12]} c={tone(c, -0.1)} />}</group>);
}

export function Table({ dims: [w, h, d], p, color }) {
  const c = color, glass = p.top === "glass", marble = p.top === "marble";
  const topM = glass ? { c: GLASS, o: 0.4, r: 0.05 } : marble ? { c: "#f1f1f0", r: 0.15, m: 0.1 } : { c, r: 0.45 };
  if (p.shape === "round") return (<group><Cy p={[0, h - 0.025, 0]} r={w / 2} h={0.05} c={topM.c} rough={topM.r} o={topM.o || 1} /><Cy p={[0, h / 2 - 0.02, 0]} r={0.07} h={h - 0.05} c={tone(c, -0.15)} /><Cy p={[0, 0.02, 0]} r={w * 0.28} h={0.04} c={tone(c, -0.15)} /></group>);
  return (<group>
    <B p={[0, h - 0.025, 0]} s={[w, 0.05, d]} c={topM.c} r={topM.r} o={topM.o || 1} m={topM.m || 0} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.06), (h - 0.05) / 2, b * (d / 2 - 0.06)]} s={[0.07, h - 0.05, 0.07]} c={glass || marble ? "#2b2b2e" : tone(c, -0.12)} m={glass || marble ? 0.8 : 0} />)}
    <B p={[0, h - 0.1, 0]} s={[w - 0.14, 0.08, d - 0.14]} c={tone(c, -0.2)} />
  </group>);
}

export function Desk({ dims: [w, h, d], p, color }) {
  const c = color;
  const leg = (x, z) => <B key={`${x}${z}`} p={[x, h / 2, z]} s={[0.05, h, 0.05]} c="#2b2b2e" m={0.8} />;
  return (<group>
    <B p={[0, h - 0.02, 0]} s={[w, 0.04, d]} c={c} r={0.5} />
    {p.kind === "L" && <B p={[w / 2 - 0.35, h - 0.02, d / 2 - 0.35]} s={[0.7, 0.04, d]} c={c} />}
    {p.kind === "drawers" && <><B p={[w / 2 - 0.22, (h - 0.04) / 2, 0]} s={[0.4, h - 0.04, d - 0.04]} c={tone(c, -0.08)} />{[0, 1, 2].map((i) => <B key={i} p={[w / 2 - 0.22, 0.15 + i * 0.22, d / 2 - 0.015]} s={[0.36, 0.18, 0.02]} c={tone(c, 0.08)} />)}{leg(-w / 2 + 0.05, -d / 2 + 0.05)}{leg(-w / 2 + 0.05, d / 2 - 0.05)}</>}
    {p.kind === "shelf" && <><B p={[0, h - 0.2, -d / 2 + 0.02]} s={[w, 0.5, 0.03]} c={c} /><B p={[0, 1.15, -d / 2 + 0.15]} s={[w, 0.03, 0.28]} c={c} /></>}
    {p.kind === "float" ? <B p={[0, h - 0.03, -d / 2 + 0.02]} s={[w, 0.06, 0.04]} c="#2b2b2e" /> : p.kind !== "drawers" && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => leg(a * (w / 2 - 0.05), b * (d / 2 - 0.05)))}
    {p.kind === "stand" && <B p={[0, 0.04, 0]} s={[w - 0.1, 0.06, 0.06]} c="#2b2b2e" m={0.8} />}
  </group>);
}

export function Chair({ dims: [w, h, d], p, color }) {
  const c = color, k = p.kind;
  const legs = (sh, rad = 0.02, col = tone(c, -0.15)) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.04), sh / 2, b * (d / 2 - 0.04)]} s={[rad * 2, sh, rad * 2]} c={col} />);
  if (k === "office" || k === "gaming") return (<group>
    <Cy p={[0, 0.05, 0]} r={0.3} h={0.04} c="#2b2b2e" m={0.8} /><Cy p={[0, 0.28, 0]} r={0.03} h={0.45} c="#c7ccd1" m={0.9} />
    <B p={[0, 0.52, 0]} s={[0.5, 0.1, 0.5]} c={c} r={0.9} /><B p={[0, 0.85, -0.22]} s={[0.46, k === "gaming" ? 0.9 : 0.6, 0.08]} c={k === "gaming" ? tone(c, -0.1) : c} r={0.9} rx={-0.1} />
    {[-1, 1].map((s) => <B key={s} p={[s * 0.27, 0.68, 0]} s={[0.04, 0.04, 0.35]} c="#2b2b2e" />)}
  </group>);
  if (k === "bar" || k === "stool") { const sh = h - 0.04; return (<group><Cy p={[0, h - 0.03, 0]} r={w / 2} h={0.06} c={c} />{[0, 1, 2, 3].map((i) => <Cy key={i} p={[Math.cos(i * 1.57 + 0.78) * w * 0.3, sh / 2, Math.sin(i * 1.57 + 0.78) * w * 0.3]} r={0.016} h={sh} c={tone(c, -0.2)} m={0.6} />)}<Torus p={[0, sh * 0.35, 0]} r={w * 0.3} t={0.01} c="#c7ccd1" /></group>); }
  if (k === "arm" || k === "accent" || k === "lounge") return (<group>
    <B p={[0, 0.22, 0]} s={[w, 0.3, d]} c={tone(c, -0.1)} r={0.9} /><B p={[0, 0.42, 0.05]} s={[w - 0.2, 0.14, d - 0.2]} c={c} r={1} />
    <B p={[0, 0.62, -d / 2 + 0.08]} s={[w, 0.7, 0.16]} c={c} r={1} rx={-0.12} />{[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.06), 0.46, 0]} s={[0.12, 0.3, d]} c={tone(c, -0.05)} r={1} />)}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Cy key={i} p={[a * (w / 2 - 0.08), 0.04, b * (d / 2 - 0.08)]} r={0.02} rb={0.012} h={0.1} c="#d4af37" m={0.8} />)}
  </group>);
  if (k === "rock") return (<group>
    <B p={[0, 0.45, 0]} s={[w - 0.1, 0.05, d - 0.4]} c={c} /><B p={[0, 0.8, -0.2]} s={[w - 0.1, 0.7, 0.04]} c={c} rx={-0.15} />
    {[-1, 1].map((s) => <group key={s}><B p={[s * (w / 2 - 0.04), 0.1, 0]} s={[0.04, 0.04, d]} c={tone(c, -0.1)} /><B p={[s * (w / 2 - 0.04), 0.27, 0.2]} s={[0.04, 0.35, 0.04]} c={c} /><B p={[s * (w / 2 - 0.04), 0.27, -0.2]} s={[0.04, 0.35, 0.04]} c={c} /></group>)}
  </group>);
  return (<group>
    <B p={[0, 0.45, 0]} s={[w, 0.05, d]} c={c} />{p.cushion && <B p={[0, 0.49, 0]} s={[w - 0.06, 0.04, d - 0.06]} c="#e0d7c8" r={1} />}
    <B p={[0, 0.72, -d / 2 + 0.025]} s={[w, 0.5, 0.04]} c={c} />{legs(0.45)}
  </group>);
}

export function Bookshelf({ dims: [w, h, d], p, color }) {
  const c = color, t = p.tiers || 5, metal = p.metal;
  const bookCols = ["#c1121f", "#2a6f97", "#e0a458", "#3a8d55", "#6d597a", "#e07a5f", "#355070"];
  return (<group>
    {[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.015), h / 2, 0]} s={[0.03, h, d]} c={c} m={metal ? 0.8 : 0} />)}
    {!p.ladder && <B p={[0, h / 2, -d / 2 + 0.008]} s={[w, h, 0.015]} c={tone(c, -0.1)} />}
    {Array.from({ length: t + 1 }).map((_, i) => { const y = 0.02 + (i * (h - 0.04)) / t; return (<group key={i}><B p={[0, y, 0]} s={[w, 0.03, d]} c={c} m={metal ? 0.8 : 0} />
      {i < t && !p.cubes && Array.from({ length: Math.floor((w - 0.1) / 0.06) }).map((_, j) => (j * 7 + i * 3) % 5 === 0 ? null : <B key={j} p={[-w / 2 + 0.07 + j * 0.06, y + 0.015 + 0.13, 0]} s={[0.045, 0.22 + ((j * 13 + i) % 4) * 0.03, d - 0.08]} c={bookCols[(i * 5 + j) % bookCols.length]} />)}</group>); })}
    {p.cubes && <B p={[0, h / 2, 0]} s={[0.025, h, d]} c={c} />}
    {p.glass && <B p={[0, h / 2, d / 2 - 0.005]} s={[w - 0.04, h - 0.04, 0.01]} c={GLASS} o={0.18} shadow={false} />}
    {p.ladder && [-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.015), h / 2, -0.12]} s={[0.04, h, 0.04]} c={c} rx={0.25} />)}
  </group>);
}

export function CabinetLike({ dims: [w, h, d], p, color, kind }) {
  const c = color;
  const legs = !p.float && ["cabinet", "tv_unit", "dresser", "bedside"].includes(kind) && h < 1.1;
  const ly = legs ? 0.1 : p.float ? 0.0 : 0;
  const bodyH = h - ly;
  const doors = p.doors || 0, drawers = p.drawers || 0;
  const doorW = doors ? w / doors : 0;
  return (<group>
    <B p={[0, ly + bodyH / 2, 0]} s={[w, bodyH, d]} c={p.open ? tone(c, -0.1) : c} />
    {p.open && <><B p={[0, ly + bodyH / 2, d / 2 - 0.012]} s={[w - 0.06, bodyH - 0.06, 0.02]} c="#1b1b1f" />{[1, 2].map((i) => <B key={i} p={[0, ly + (bodyH / 3) * i, 0]} s={[w - 0.04, 0.025, d - 0.02]} c={c} />)}</>}
    {!p.open && Array.from({ length: doors }).map((_, i) => (<group key={i}><B p={[-w / 2 + doorW * (i + 0.5), ly + bodyH / 2, d / 2 + 0.01]} s={[doorW - 0.012, bodyH - 0.03, 0.022]} c={p.glass ? "#222a33" : tone(c, 0.06)} o={p.glass ? 0.6 : 1} /><B p={[-w / 2 + doorW * (i + 0.5) + (i % 2 ? -1 : 1) * (doorW / 2 - 0.05), ly + bodyH * 0.55, d / 2 + 0.03]} s={[0.014, 0.12, 0.014]} c="#c7ccd1" m={0.9} /></group>))}
    {!p.open && !doors && Array.from({ length: drawers }).map((_, i) => { const dh = bodyH / drawers; return (<group key={i}><B p={[0, ly + dh * (i + 0.5), d / 2 + 0.01]} s={[w - 0.03, dh - 0.02, 0.022]} c={tone(c, 0.06)} /><B p={[0, ly + dh * (i + 0.5), d / 2 + 0.03]} s={[0.14, 0.014, 0.014]} c="#c7ccd1" m={0.9} /></group>); })}
    {legs && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Cy key={i} p={[a * (w / 2 - 0.06), 0.05, b * (d / 2 - 0.06)]} r={0.02} rb={0.014} h={0.1} c={tone(c, -0.25)} />)}
    {p.pooja && <><B p={[0, h + 0.06, 0]} s={[w, 0.12, d]} c="#d4af37" m={0.6} /><Cone p={[0, h + 0.2, 0]} r={0.2} h={0.16} c="#d4af37" /></>}
    {p.mirror && <B p={[0, h + 0.4, -d / 2 + 0.02]} s={[w * 0.8, 0.7, 0.03]} c={MIRROR} m={0.9} r={0.05} />}
  </group>);
}
export const TvUnit = (props) => {
  const { dims: [w, h, d], p, color } = props, c = color;
  if (p.kind === "wall") return (<group>
    <B p={[0, h / 2, -d / 2 + 0.03]} s={[w, h, 0.06]} c={tone(c, -0.08)} />
    <B p={[0, 0.25, 0.0]} s={[w * 0.7, 0.45, d]} c={c} />{[-1, 1].map((s) => <B key={s} p={[s * (w / 2 - 0.2), h / 2, 0.02]} s={[0.4, h - 0.1, d - 0.04]} c={c} />)}
    {p.shelves && [1.3, 1.7, 2.1].map((y) => <B key={y} p={[w / 2 - 0.2, y, 0.04]} s={[0.36, 0.03, d - 0.06]} c={tone(c, 0.12)} />)}
    <B p={[0, 1.3, -d / 2 + 0.065]} s={[w * 0.4, 0.8, 0.02]} c="#111" r={0.3} /><B p={[0, 0.25, d / 2 + 0.01]} s={[w * 0.7 - 0.04, 0.4, 0.02]} c={tone(c, 0.08)} />
  </group>);
  return <CabinetLike {...props} kind="tv_unit" p={{ ...p, drawers: p.kind === "open" ? 0 : 0, doors: p.kind === "open" ? 0 : 3, open: p.kind === "open", float: p.kind === "float" }} />;
};
export function Tv({ dims: [w, h, d], p }) {
  if (p.screen) return (<group><B p={[0, h / 2 + 0.1, 0]} s={[w, h, d]} c="#f4f4f4" r={0.9} /><B p={[0, h + 0.14, 0]} s={[w + 0.1, 0.08, 0.1]} c="#2b2b2e" /></group>);
  const curve = p.curved ? 0.12 : 0;
  return (<group>
    <B p={[0, h / 2 + 0.05, 0]} s={[w, h, d]} c="#0b0b0e" r={0.2} m={0.4} rx={0} />
    <B p={[0, h / 2 + 0.05, d / 2 + 0.001]} s={[w - 0.04, h - 0.04, 0.004]} c="#111a2e" e="#1a2a55" r={0.1} />
    {curve > 0 && <B p={[0, h / 2 + 0.05, -0.02]} s={[w * 0.5, h * 0.8, 0.06]} c="#1b1b1f" />}
    <B p={[0, 0.02, 0.0]} s={[0.4, 0.03, 0.2]} c="#2b2b2e" m={0.7} /><B p={[0, 0.05 + 0.02, -0.02]} s={[0.04, 0.08, 0.04]} c="#2b2b2e" />
  </group>);
}
