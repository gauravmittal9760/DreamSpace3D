import { useMemo, useState } from "react";
import { post } from "../api.js";
import { Btn } from "../components/ui.jsx";
import { CONSTRUCTION_GRADES, ITEM_BY_KEY, ROOM_TYPES, TYPES, itemsOfType, typeLabel } from "../scene/catalog.js";
import { clampOnWall, computeCost, inr, isOpening, sqft } from "../scene/sceneUtils.js";
import { ColorPicker, Num } from "./StudioPanels.jsx";

export function Inspector({ scene, room, obj, prices, actions }) {
  if (obj) {
    const base = ITEM_BY_KEY[obj.key];
    const open = isOpening(obj);
    const same = itemsOfType(obj.type);
    const up = (patch) => actions.patchObject(room.id, obj.id, patch, `o${obj.id}`);
    return (
      <>
        <div className="sec-title"><span>{typeLabel(obj.type)} · {room.name}</span><span className="badge ok">{inr(prices[obj.key] ?? base?.price)}</span></div>
        <input className="inp" value={obj.name} onChange={(e) => up({ name: e.target.value })} />
        <div className="sec-title"><span>Design ({same.length} options)</span></div>
        <select className="sel" value={obj.key} onChange={(e) => actions.swapVariant(room.id, obj.id, e.target.value)}>{same.map((i) => <option key={i.key} value={i.key}>{i.name} — {inr(prices[i.key] ?? i.price)}</option>)}</select>
        {open ? (<>
          <div className="sec-title"><span>Wall</span></div>
          <div className="cat-chips">{["N", "E", "S", "W"].map((w) => <button key={w} className={`chip ${obj.wall === w ? "on" : ""}`} onClick={() => up({ wall: w, t: clampOnWall(room, w, obj.t || 0, obj.dims[0]) })}>{{ N: "North", E: "East", S: "South", W: "West" }[w]}</button>)}</div>
          <div className="kv"><Num label="Position along wall (m)" value={obj.t || 0} step={0.05} onChange={(v) => up({ t: clampOnWall(room, obj.wall || "S", v, obj.dims[0]) })} />{obj.type === "window" && <Num label="Sill height (m)" value={obj.y ?? 0.9} step={0.05} min={0} onChange={(v) => up({ y: v })} />}</div>
        </>) : (<>
          <div className="sec-title"><span>Position &amp; rotation</span></div>
          <div className="kv three"><Num label="X (m)" value={obj.x} step={0.05} onChange={(v) => up({ x: v })} /><Num label="Z (m)" value={obj.z} step={0.05} onChange={(v) => up({ z: v })} /><Num label={TYPES[obj.type]?.hang ? "Drop from ceiling" : "Height above floor"} value={obj.y || 0} step={0.05} onChange={(v) => up({ y: v })} /></div>
          <div className="row wrap-row"><button className="ibtn" onClick={() => up({ ry: (obj.ry - 90 + 360) % 360 })}>⟲ 90°</button><button className="ibtn" onClick={() => up({ ry: (obj.ry + 90) % 360 })}>⟳ 90°</button><button className="ibtn" onClick={() => up({ ry: (obj.ry + 15) % 360 })}>+15°</button><Num label="Angle" value={obj.ry} step={5} onChange={(v) => up({ ry: ((v % 360) + 360) % 360 })} /></div>
        </>)}
        <div className="sec-title"><span>Size (m)</span><button className="chip" onClick={() => up({ dims: [...base.dims] })}>Reset</button></div>
        <div className="kv three">{["Width", "Height", "Depth"].map((l, i) => <Num key={l} label={l} value={obj.dims[i]} step={0.05} min={0.05} onChange={(v) => up({ dims: obj.dims.map((d, k) => (k === i ? Math.max(0.05, v) : d)) })} />)}</div>
        {!["rug", "plant", "tree"].includes(obj.type) && <small className="muted">Tip: change width / height / depth to fit your room exactly.</small>}
        <div className="sec-title"><span>Colour</span><button className="chip" onClick={() => up({ color: base?.p?.c || "#b68b63" })}>Original</button></div>
        <ColorPicker value={obj.color} onChange={(v) => up({ color: v })} />
        <div className="row wrap-row"><Btn kind="ghost" className="sm" onClick={() => actions.dupObject(room.id, obj.id)}>⧉ Duplicate</Btn><Btn kind="ghost" className="sm" onClick={() => up({ hidden: !obj.hidden })}>{obj.hidden ? "Show" : "Hide"}</Btn><Btn kind="danger" className="sm" onClick={() => actions.delObject(room.id, obj.id)}>🗑 Delete</Btn></div>
      </>
    );
  }
  if (room) {
    const up = (patch, k = `r${room.id}`) => actions.patchRoom(room.id, patch, k);
    const area = room.w * room.l;
    return (
      <>
        <div className="sec-title"><span>Room</span><span className="badge">{area.toFixed(1)} m² · {sqft(area)} sq ft</span></div>
        <input className="inp" value={room.name} onChange={(e) => up({ name: e.target.value })} />
        <select className="sel" value={room.type} onChange={(e) => up({ type: e.target.value, open: ROOM_TYPES[e.target.value]?.open || null })}>{Object.entries(ROOM_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
        <div className="sec-title"><span>Dimensions (m)</span></div>
        <div className="kv"><Num label="Width (X)" value={room.w} step={0.1} min={1} max={60} onChange={(v) => actions.resizeRoom(room.id, Math.max(1, Math.min(60, v)), room.l)} /><Num label="Length (Z)" value={room.l} step={0.1} min={1} max={60} onChange={(v) => actions.resizeRoom(room.id, room.w, Math.max(1, Math.min(60, v)))} /></div>
        <input type="range" className="range" min="1.5" max="20" step="0.1" value={Math.min(room.w, 20)} onChange={(e) => actions.resizeRoom(room.id, +e.target.value, room.l)} />
        <input type="range" className="range" min="1.5" max="20" step="0.1" value={Math.min(room.l, 20)} onChange={(e) => actions.resizeRoom(room.id, room.w, +e.target.value)} />
        <div className="sec-title"><span>Position</span></div>
        <div className="kv"><Num label="X (m)" value={room.x} step={0.1} onChange={(v) => actions.moveRoom(room.id, v, room.z)} /><Num label="Z (m)" value={room.z} step={0.1} onChange={(v) => actions.moveRoom(room.id, room.x, v)} /></div>
        <div className="cat-chips">{[["←", -0.5, 0], ["→", 0.5, 0], ["↑", 0, -0.5], ["↓", 0, 0.5]].map(([l, dx, dz]) => <button key={l} className="chip" onClick={() => actions.moveRoom(room.id, room.x + dx, room.z + dz)}>{l} 0.5 m</button>)}</div>
        <small className="muted">Tip: drag the selected room's floor in the 3D view – edges snap to neighbours.</small>
        <div className="row wrap-row"><Btn kind="ghost" className="sm" onClick={() => actions.dupRoom(room.id)}>⧉ Duplicate</Btn><Btn kind="danger" className="sm" onClick={() => actions.delRoom(room.id)}>🗑 Delete room</Btn></div>
        <div className="sec-title"><span>Items in this room ({room.objects.length})</span></div>
        <div className="col" style={{ gap: 4 }}>{room.objects.map((o) => <button key={o.id} className="ai-sug" onClick={() => actions.select({ kind: "object", roomId: room.id, objId: o.id })}><b className="grow">{o.name}</b><small className="muted">{typeLabel(o.type)}</small></button>)}</div>
      </>
    );
  }
  return <div className="empty"><div className="e">👆</div><p>Click a room or an item in the 3D view to edit it.<br /><small>Drag items to move them · <b>R</b> rotate · <b>Del</b> remove · <b>Ctrl+Z</b> undo</small></p></div>;
}

export function CostPanel({ scene, prices, actions }) {
  const c = useMemo(() => computeCost(scene, prices), [scene, prices]);
  const cats = Object.entries(c.byCat).sort((a, b) => b[1] - a[1]);
  const max = cats[0]?.[1] || 1;
  const catLabel = (k) => ({ bedroom: "Bedroom", living: "Living", dining: "Dining & Work", storage: "Storage", electric: "Electronics & Lights", kitchen: "Kitchen", bath: "Bathroom", decor: "Decor", arch: "Doors & Windows", outdoor: "Garden & Outdoor", basic: "Basic shapes" }[k] || k);
  const csv = () => {
    const rows = [["Floor", "Room", "Item", "Qty", "Price (INR)"]];
    scene.floors.forEach((f) => f.rooms.forEach((r) => { r.objects.forEach((o) => rows.push([f.name, r.name, o.name, 1, prices[o.key] ?? ITEM_BY_KEY[o.key]?.price ?? 0])); }));
    rows.push([], ["", "", "Interiors total", "", Math.round(c.interiors)], ["", "", "Structure estimate", "", Math.round(c.structure)], ["", "", "GRAND TOTAL", "", Math.round(c.total)]);
    const blob = new Blob([rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dreamspace-estimate.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="glass neon" style={{ padding: 16, borderRadius: 18, textAlign: "center" }}>
        <small className="muted">Estimated total</small>
        <div className="display" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--c4)" }}>{inr(c.total)}</div>
        <small className="muted">{c.items} items · built-up {c.area.toFixed(0)} m² ({sqft(c.area)} sq ft)</small>
      </div>
      <div className="sec-title"><span>Construction quality</span></div>
      <div className="cat-chips">{CONSTRUCTION_GRADES.map((g) => <button key={g.id} className={`chip ${c.grade.id === g.id ? "on" : ""}`} onClick={() => actions.patchScene({ grade: g.id })}>{g.label} · {inr(prices[`grade.${g.id}`] ?? g.perM2)}/m²</button>)}</div>
      <table className="cost-table"><tbody>
        <tr><td>Structure (shell, slabs, walls)</td><td>{inr(c.structure)}</td></tr>
        {cats.map(([k, v]) => <tr key={k}><td>{k === "Flooring" || k === "Wall paint" ? k : catLabel(k)}</td><td>{inr(v)}</td></tr>)}
        <tr className="tot"><td>Grand total</td><td>{inr(c.total)}</td></tr>
      </tbody></table>
      <div className="sec-title"><span>Spend by category</span></div>
      {cats.map(([k, v]) => <div key={k}><small className="muted">{k === "Flooring" || k === "Wall paint" ? k : catLabel(k)}</small><div className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></div></div>)}
      <div className="sec-title"><span>By room</span></div>
      <table className="cost-table"><tbody>{c.rooms.map((r) => <tr key={r.id}><td>{r.name} <small className="faint">· {r.floor}</small></td><td>{inr(r.total)}</td></tr>)}</tbody></table>
      <Btn kind="ghost" onClick={csv}>⬇ Download estimate (CSV)</Btn>
      <small className="muted">Prices are indicative (₹) and can be updated by the admin. Structure cost = built-up area × quality rate.</small>
    </>
  );
}

export function AIPanel({ scene, room, actions, toast }) {
  const [busy, setBusy] = useState("");
  const [sug, setSug] = useState(null);
  const [rev, setRev] = useState(null);
  const [arr, setArr] = useState(null);
  const call = async (key, fn) => { setBusy(key); try { await fn(); } finally { setBusy(""); } };
  const roomObjs = (r) => r.objects.map((o) => ({ id: o.id, type: o.type, name: o.name, dims: o.dims, x: o.x, z: o.z, ry: o.ry, wall: o.wall, t: o.t, color: o.color, floor: !!TYPES[o.type]?.floor }));
  const recommend = () => call("rec", async () => {
    const r = await post("/ai/recommend", { room_type: room.type, types: room.objects.map((o) => o.type), limit: 8 });
    if (!r.success) return toast(r.message, "error"); setSug(r);
  });
  const arrange = () => call("arr", async () => {
    const r = await post("/ai/arrange", { room: { w: room.w, l: room.l }, objects: roomObjs(room), movable_ids: room.objects.filter((o) => TYPES[o.type]?.floor && !["stairs", "rug", "pillar"].includes(o.type)).map((o) => o.id), seed: Math.floor(Math.random() * 9999) });
    if (!r.success) return toast(r.message, "error");
    actions.applyPlacements(room.id, r.placements); setArr(r); toast(`Arranged ${r.placements.length} items · layout score ${r.review.score}/100`, "success");
  });
  const review = () => call("rev", async () => {
    const r = await post("/ai/review", { scene: { floors: scene.floors.map((f) => ({ ...f, rooms: f.rooms.map((rm) => ({ ...rm, floorColor: rm.floorColor, objects: roomObjs(rm) })) })) } });
    if (!r.success) return toast(r.message, "error"); setRev(r);
  });
  return (
    <>
      <div className="glass neon" style={{ padding: 14, borderRadius: 16 }}><b>🧠 DreamSpace AI</b><p className="muted" style={{ fontSize: ".82rem" }}>Runs real algorithms on the server: PMI recommender trained on all saved designs, simulated-annealing layout optimiser, BFS walkability check and k-means colour analysis.</p></div>
      <div className="sec-title"><span>Smart suggestions</span></div>
      <Btn kind="soft" busy={busy === "rec"} disabled={!room} onClick={recommend}>✨ Suggest items for {room ? room.name : "a room"}</Btn>
      {sug && (<>
        {sug.suggestions.map((s) => (
          <button key={s.type} className="ai-sug" onClick={() => actions.addByType(s.type, s.popular_key)}>
            <span style={{ fontSize: "1.3rem" }}>＋</span>
            <div className="grow"><b>{typeLabel(s.type)}</b><div><small className="muted">{s.because.length ? `Goes with ${s.because.map((b) => `${typeLabel(b.type)} (${b.lift}×)`).join(", ")}` : `In ${s.room_frequency}% of similar rooms`}</small></div></div>
            <span className="pct">{s.relevance}%</span>
          </button>))}
        <small className="faint">Model: {sug.model.name} · trained on {sug.model.real_rooms} real rooms{sug.model.prior_rooms ? ` + ${sug.model.prior_rooms} bootstrap rooms (weight ${sug.model.prior_weight})` : ""}.</small>
      </>)}
      <div className="sec-title"><span>Auto-arrange</span></div>
      <Btn kind="soft" busy={busy === "arr"} disabled={!room || !room.objects.length} onClick={arrange}>🪄 Optimise layout of {room ? room.name : "room"}</Btn>
      {arr && <small className="muted">Cost {arr.cost} · coverage {arr.review.coverage_pct}% · free walkway {arr.review.circulation_pct}% · {arr.iterations} iterations. Undo with Ctrl+Z.</small>}
      <div className="sec-title"><span>Design review</span></div>
      <Btn kind="soft" busy={busy === "rev"} onClick={review}>📊 Analyse whole design</Btn>
      {rev && (<>
        <div className="row"><div className="score-ring" style={{ "--v": rev.overall }}><b>{rev.overall}</b></div><div><b>Overall design score</b><div className="muted" style={{ fontSize: ".82rem" }}>Layout {rev.layout_score} · Colour harmony {rev.harmony_score}</div></div></div>
        {!rev.palette.empty && (<>
          <div className="pal-row">{rev.palette.dominant.map((d) => <i key={d.hex} style={{ background: d.hex, width: `${d.share}%` }} title={`${d.hex} ${d.share}%`} />)}</div>
          <small className="muted">Palette is <b>{rev.palette.harmony.template}</b> ({rev.palette.harmony.score}% fit), mood <b>{rev.palette.mood}</b>. Accent ideas{room ? " (click to paint walls)" : ""}:</small>
          <div className="swatches" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>{rev.palette.suggestions.map((s) => <button key={s.hex} className="swatch" style={{ background: s.hex, height: 34, aspectRatio: "auto" }} title={s.label} onClick={() => room && actions.patchRoom(room.id, { wallColor: s.hex, walls: {} })} />)}</div>
        </>)}
        {rev.rooms.map((r) => (<div key={r.room_id} className="glass" style={{ padding: 10, borderRadius: 14 }}>
          <div className="row"><b className="grow">{r.room}</b><span className={`badge ${r.score > 75 ? "ok" : r.score > 50 ? "warn" : "bad"}`}>{r.score}/100</span></div>
          <small className="muted">{r.coverage_pct}% furnished · {r.circulation_pct}% walkable</small>
          {r.issues.slice(0, 4).map((i, k) => <div key={k}><small style={{ color: i.severity === "high" ? "var(--danger)" : "var(--warn)" }}>• {i.msg}</small></div>)}
        </div>))}
        <small className="faint">{rev.rooms[0]?.method}</small>
      </>)}
    </>
  );
}
