import { useMemo, useState } from "react";
import { ALL_PAINTS, CATEGORIES, FINISHES, FLOORS, FLOOR_BY_ID, FLOOR_PRESETS, ITEMS, PAINT_FAMILIES, ROOM_TYPES, TILE_SIZES, TYPES, CONSTRUCTION_GRADES } from "../scene/catalog.js";
import { inr, priceOf } from "../scene/sceneUtils.js";

export const Num = ({ label, value, onChange, step = 0.1, min, max }) => (
  <label className="num">{label}
    <input type="number" step={step} min={min} max={max} value={Number.isFinite(value) ? Math.round(value * 1000) / 1000 : ""} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }} />
  </label>
);

export function ColorPicker({ value, onChange }) {
  const [fam, setFam] = useState(PAINT_FAMILIES.find((f) => f.shades.some((s) => s.hex.toLowerCase() === (value || "").toLowerCase()))?.id || "neutral");
  const family = PAINT_FAMILIES.find((f) => f.id === fam) || PAINT_FAMILIES[0];
  const cur = ALL_PAINTS.find((p) => p.hex.toLowerCase() === (value || "").toLowerCase());
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="cat-chips">{PAINT_FAMILIES.map((f) => <button key={f.id} className={`chip ${fam === f.id ? "on" : ""}`} onClick={() => setFam(f.id)} style={{ borderColor: f.shades[4].hex }}>{f.label}</button>)}</div>
      <div className="swatches" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>{family.shades.map((s) => <button key={s.hex} className={`swatch ${value?.toLowerCase() === s.hex.toLowerCase() ? "on" : ""}`} style={{ background: s.hex }} title={`${s.name} ${s.hex}`} onClick={() => onChange(s.hex)} />)}</div>
      <div className="row"><input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#cccccc"} onChange={(e) => onChange(e.target.value)} style={{ width: 44, height: 34, border: 0, background: "none" }} /><small className="muted">{cur ? `${cur.name} · ` : "Custom · "}<span className="mono">{value}</span></small></div>
    </div>
  );
}

export function ItemsPanel({ onAdd, prices, search, setSearch, popular }) {
  const [cat, setCat] = useState("bedroom");
  const q = search.trim().toLowerCase();
  const list = useMemo(() => ITEMS.filter((i) => (q ? (i.name + " " + TYPES[i.type].label).toLowerCase().includes(q) : i.cat === cat)), [cat, q]);
  const groups = useMemo(() => { const m = new Map(); list.forEach((i) => { if (!m.has(i.type)) m.set(i.type, []); m.get(i.type).push(i); }); return [...m]; }, [list]);
  return (
    <>
      <div className="search"><input className="inp" placeholder="Search 290+ items…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {!q && <div className="cat-chips">{CATEGORIES.map((c) => <button key={c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.icon} {c.label}</button>)}</div>}
      {groups.length === 0 && <p className="muted">No items match “{search}”.</p>}
      {groups.map(([type, items]) => (
        <div key={type} className="col" style={{ gap: 8 }}>
          <div className="sec-title"><span>{TYPES[type].label}</span><span>{items.length} designs</span></div>
          <div className="item-grid">{items.map((i) => (
            <button key={i.key} className="item-card" onClick={() => onAdd(i.key)} title={`Add ${i.name}`} style={{ "--sw": i.p.c || "#888" }}>
              <div className="sw">{CATEGORIES.find((c) => c.id === i.cat)?.icon}</div><b>{i.name}</b><span>{inr(priceOf(i.key, prices))}</span>
              {popular?.[i.key] > 0 && <small className="badge pop">🔥 {popular[i.key]}</small>}
            </button>))}</div>
        </div>))}
    </>
  );
}

export function RoomsPanel({ scene, activeFloor, setActiveFloor, selection, onSelect, actions }) {
  return (
    <>
      <div className="sec-title"><span>Add room to “{scene.floors[activeFloor]?.name}”</span></div>
      <div className="item-grid">{Object.entries(ROOM_TYPES).map(([id, r]) => <button key={id} className="item-card" onClick={() => actions.addRoom(id)}><div className="sw" style={{ "--sw": "#6366f1" }}>{r.icon}</div><b>{r.label}</b><small className="muted">{r.size[0]} × {r.size[1]} m</small></button>)}</div>
      <div className="sec-title"><span>Floors &amp; rooms</span><button className="chip" onClick={actions.addFloor}>＋ Floor</button></div>
      {scene.floors.map((f, fi) => (
        <div key={f.id} className="glass" style={{ padding: 10, borderRadius: 16, borderColor: fi === activeFloor ? "var(--c1)" : undefined }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input className="inp" value={f.name} onChange={(e) => actions.patchFloor(f.id, { name: e.target.value })} onFocus={() => setActiveFloor(fi)} />
            <button className="ibtn" title="Duplicate floor" onClick={() => actions.dupFloor(f.id)}>⧉</button>
            <button className="ibtn" title="Delete floor" onClick={() => actions.delFloor(f.id)} disabled={scene.floors.length < 2}>🗑</button>
          </div>
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="num grow">Floor height (m)<input type="number" step="0.1" min="2" max="8" value={f.height} onChange={(e) => { const v = parseFloat(e.target.value); if (v >= 2 && v <= 8) actions.patchFloor(f.id, { height: v }); }} /></label>
          </div>
          <div className="cat-chips" style={{ marginBottom: 8 }}>{FLOOR_PRESETS.map((h) => <button key={h} className={`chip ${f.height === h ? "on" : ""}`} onClick={() => actions.patchFloor(f.id, { height: h })}>{h} m</button>)}</div>
          <div className="col" style={{ gap: 4 }}>{f.rooms.map((r) => (
            <button key={r.id} className={`ai-sug ${selection.roomId === r.id ? "on" : ""}`} style={selection.roomId === r.id ? { borderColor: "var(--c1)" } : null} onClick={() => { setActiveFloor(fi); onSelect({ kind: "room", roomId: r.id }); }}>
              <span>{ROOM_TYPES[r.type]?.icon}</span><b className="grow">{r.name}</b><small className="muted">{r.w.toFixed(1)}×{r.l.toFixed(1)} · {r.objects.length}</small>
            </button>))}{!f.rooms.length && <small className="muted">No rooms yet.</small>}</div>
        </div>))}
      <div className="sec-title"><span>Whole building</span></div>
      <div className="col" style={{ gap: 8 }}>
        <div className="num">Exterior wall colour</div><ColorPicker value={scene.exteriorColor} onChange={(v) => actions.patchScene({ exteriorColor: v })} />
        <div className="num">Ground / lawn colour</div><div className="row"><input type="color" value={scene.ground?.color || "#4f8f55"} onChange={(e) => actions.patchScene({ ground: { ...scene.ground, color: e.target.value } })} /></div>
        <label className="row"><input type="checkbox" checked={scene.showRoof} onChange={(e) => actions.patchScene({ showRoof: e.target.checked })} /> Show roof slabs</label>
      </div>
    </>
  );
}

export function StylePanel({ scene, room, prices, actions }) {
  const [target, setTarget] = useState("all");
  if (!room) return <div className="empty"><div className="e">🎨</div><p>Click a room in the 3D view (or the Rooms tab) to paint its walls and choose a floor.</p></div>;
  const wallVal = target === "all" ? room.wallColor : room.walls?.[target]?.color || room.wallColor;
  const fl = FLOOR_BY_ID[room.floorMat];
  const sets = (patch) => actions.patchRoom(room.id, patch);
  return (
    <>
      <div className="sec-title"><span>Walls · {room.name}</span></div>
      <div className="cat-chips">{[["all", "All walls"], ["N", "North"], ["E", "East"], ["S", "South"], ["W", "West"]].map(([k, l]) => <button key={k} className={`chip ${target === k ? "on" : ""}`} onClick={() => setTarget(k)}>{l}</button>)}</div>
      <ColorPicker value={wallVal} onChange={(v) => (target === "all" ? sets({ wallColor: v, walls: {} }) : sets({ walls: { ...room.walls, [target]: { color: v } } }))} />
      <div className="row wrap-row"><button className="chip" onClick={() => actions.applyAllRooms({ wallColor: room.wallColor })}>Apply colour to all rooms</button>{room.walls && Object.keys(room.walls).length > 0 && <button className="chip" onClick={() => sets({ walls: {} })}>Reset accent walls</button>}</div>
      <div className="sec-title"><span>Paint finish</span></div>
      <select className="sel" value={room.finish} onChange={(e) => sets({ finish: e.target.value })}>{FINISHES.map((f) => <option key={f.id} value={f.id}>{f.label} — {inr(prices[`finish.${f.id}`] ?? f.price)}/m²</option>)}</select>
      <div className="sec-title"><span>Floor material</span><span>{inr(prices[`floor.${room.floorMat}`] ?? fl?.price)}/m²</span></div>
      <div className="item-grid">{FLOORS.map((f) => (
        <button key={f.id} className="item-card" style={{ outline: room.floorMat === f.id ? "2px solid var(--c1)" : "none", "--sw": f.base }} onClick={() => sets({ floorMat: f.id, floorColor: f.base, tileSize: f.size })}>
          <div className="sw" style={{ fontSize: ".7rem" }}>{f.pattern}</div><b>{f.label}</b><span>{inr(prices[`floor.${f.id}`] ?? f.price)}/m²</span>
        </button>))}</div>
      <div className="sec-title"><span>Floor tint</span></div>
      <div className="row"><input type="color" value={room.floorColor} onChange={(e) => sets({ floorColor: e.target.value })} style={{ width: 44, height: 34, border: 0, background: "none" }} /><button className="chip" onClick={() => sets({ floorColor: fl?.base || "#cccccc" })}>Reset tint</button></div>
      <div className="sec-title"><span>Tile / plank size</span></div>
      <div className="cat-chips">{TILE_SIZES.map((t) => <button key={t.id} className={`chip ${room.tileSize === t.id ? "on" : ""}`} onClick={() => sets({ tileSize: t.id })}>{t.label}</button>)}</div>
      <button className="chip" onClick={() => actions.applyAllRooms({ floorMat: room.floorMat, floorColor: room.floorColor, tileSize: room.tileSize })}>Apply this floor to all rooms</button>
      {room.open && <small className="muted">Open-air space ({room.open}) – walls are replaced by {room.open === "railing" ? "a glass railing" : room.open === "parapet" ? "a low parapet" : "nothing"}.</small>}
    </>
  );
}

export { CONSTRUCTION_GRADES };
