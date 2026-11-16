import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { get, post, put } from "../api.js";
import { Btn, Confirm, Modal, Spinner, useToast } from "../components/ui.jsx";
import { useRouter } from "../router.jsx";
import { ITEM_BY_KEY, ROOM_TYPES, itemsOfType } from "../scene/catalog.js";
import Scene3D from "../scene/Scene3D.jsx";
import { clampInRoom, clampOnWall, computeCost, createFloor, createObject, createRoom, inr, isOpening, normalizeScene, roomOverlaps, sceneStats, snapRoom, uid } from "../scene/sceneUtils.js";
import { CostPanel, AIPanel, Inspector } from "./StudioRight.jsx";
import { ItemsPanel, RoomsPanel, StylePanel } from "./StudioPanels.jsx";

const mapFloor = (s, fid, fn) => ({ ...s, floors: s.floors.map((f) => (f.id === fid ? fn(f) : f)) });
const mapRoom = (s, rid, fn) => ({ ...s, floors: s.floors.map((f) => (f.rooms.some((r) => r.id === rid) ? { ...f, rooms: f.rooms.map((r) => (r.id === rid ? fn(r) : r)) } : f)) });
const mapObj = (s, rid, oid, fn) => mapRoom(s, rid, (r) => ({ ...r, objects: r.objects.map((o) => (o.id === oid ? fn(o) : o)) }));
const findRoom = (s, rid) => { for (let i = 0; i < s.floors.length; i++) { const r = s.floors[i].rooms.find((x) => x.id === rid); if (r) return { room: r, fi: i }; } return null; };

export default function Studio({ id }) {
  const { go } = useRouter();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [scene, setScene] = useState(null);
  const sceneRef = useRef(null);
  const hist = useRef({ past: [], future: [], key: null, at: 0 });
  const [, bump] = useState(0);
  const [selection, setSelection] = useState({});
  const [activeFloor, setActiveFloor] = useState(0);
  const [floorMode, setFloorMode] = useState("all");
  const [wallMode, setWallMode] = useState("full");
  const [time, setTime] = useState("day");
  const [planMode, setPlanMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [fit, setFit] = useState(0);
  const [leftTab, setLeftTab] = useState("items");
  const [rightTab, setRightTab] = useState("inspect");
  const [mobile, setMobile] = useState(null);
  const [search, setSearch] = useState("");
  const [prices, setPrices] = useState({});
  const popular = {};
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [ask, setAsk] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const captureRef = useRef(null);
  const saveCount = useRef(0);

  // ---------------------------------------------------------------- load
  useEffect(() => {
    let alive = true;
    (async () => {
      const [r, p] = await Promise.all([get(`/projects/${id}`), get("/catalog/prices")]);
      if (!alive) return;
      if (!r.success) { toast(r.message || "Project not found.", "error"); return go("/"); }
      const s = normalizeScene(r.project.project_data);
      sceneRef.current = s; setScene(s); setMeta({ name: r.project.name, share: r.project.share_token });
      if (p.success) setPrices(p.prices || {});
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- state helpers (immutable, history by reference)
  const commit = useCallback((next, { key = null, transient = false } = {}) => {
    const h = hist.current, now = Date.now();
    if (!transient && !(key && key === h.key && now - h.at < 900)) { h.past.push(sceneRef.current); if (h.past.length > 80) h.past.shift(); h.future = []; }
    if (!transient) { h.key = key; h.at = now; }
    sceneRef.current = next; setScene(next); setDirty(true); bump((n) => n + 1);
  }, []);
  const pushHistory = useCallback(() => { const h = hist.current; h.past.push(sceneRef.current); if (h.past.length > 80) h.past.shift(); h.future = []; h.key = null; bump((n) => n + 1); }, []);
  const undo = useCallback(() => { const h = hist.current; if (!h.past.length) return; h.future.push(sceneRef.current); const p = h.past.pop(); sceneRef.current = p; setScene(p); setDirty(true); bump((n) => n + 1); }, []);
  const redo = useCallback(() => { const h = hist.current; if (!h.future.length) return; h.past.push(sceneRef.current); const n = h.future.pop(); sceneRef.current = n; setScene(n); setDirty(true); bump((x) => x + 1); }, []);

  const cur = () => sceneRef.current;
  const selRoom = scene && selection.roomId ? findRoom(scene, selection.roomId)?.room : null;
  const selObj = selRoom && selection.objId ? selRoom.objects.find((o) => o.id === selection.objId) : null;
  const targetRoom = () => { const s = cur(); return (selection.roomId && findRoom(s, selection.roomId)?.room) || s.floors[Math.min(activeFloor, s.floors.length - 1)]?.rooms[0] || null; };

  const actions = useMemo(() => ({
    select: setSelection,
    patchScene: (patch) => commit({ ...cur(), ...patch }, { key: `sc${Object.keys(patch)[0]}` }),
    patchFloor: (fid, patch) => commit(mapFloor(cur(), fid, (f) => ({ ...f, ...patch })), { key: `f${fid}${Object.keys(patch)[0]}` }),
    addFloor: () => { const s = cur(); const f = createFloor(`Floor ${s.floors.length}`, s.floors[s.floors.length - 1]?.height || 3); commit({ ...s, floors: [...s.floors, f] }); setActiveFloor(s.floors.length); toast("Floor added. Add rooms to it from the Rooms tab.", "success"); },
    dupFloor: (fid) => { const s = cur(); const src = s.floors.find((f) => f.id === fid); const nf = { ...JSON.parse(JSON.stringify(src)), id: uid(), name: `${src.name} (copy)` }; nf.rooms.forEach((r) => { r.id = uid(); r.objects.forEach((o) => { o.id = uid(); }); }); commit({ ...s, floors: [...s.floors, nf] }); setActiveFloor(s.floors.length); },
    delFloor: (fid) => { const f = cur().floors.find((x) => x.id === fid); setAsk({ title: "Delete floor?", text: `“${f.name}” with ${f.rooms.length} room(s) will be removed.`, run: () => { const s = cur(); commit({ ...s, floors: s.floors.filter((x) => x.id !== fid) }); setActiveFloor(0); setSelection({}); } }); },
    addRoom: (type) => {
      const s = cur(); const fi = Math.min(activeFloor, s.floors.length - 1); const f = s.floors[fi];
      const r = createRoom(type, ROOM_TYPES[type].label, f.rooms);
      commit(mapFloor(s, f.id, (fl) => ({ ...fl, rooms: [...fl.rooms, r] }))); setSelection({ kind: "room", roomId: r.id }); setFit((n) => n + 1);
    },
    patchRoom: (rid, patch, key) => commit(mapRoom(cur(), rid, (r) => ({ ...r, ...patch })), { key: key || `r${rid}${Object.keys(patch)[0]}` }),
    applyAllRooms: (patch) => { const s = cur(); commit({ ...s, floors: s.floors.map((f) => ({ ...f, rooms: f.rooms.map((r) => ({ ...r, ...patch, ...(patch.wallColor ? { walls: {} } : {}) })) })) }); toast("Applied to all rooms.", "success"); },
    resizeRoom: (rid, w, l) => commit(mapRoom(cur(), rid, (r) => {
      const nr = { ...r, w, l };
      nr.objects = r.objects.map((o) => (isOpening(o) ? { ...o, t: clampOnWall(nr, o.wall || "S", o.t || 0, o.dims[0]) } : { ...o, ...clampInRoom(nr, o, o.x, o.z) }));
      return nr;
    }), { key: `rs${rid}` }),
    moveRoom: (rid, x, z) => { const s = cur(); const { room, fi } = findRoom(s, rid); const p = snapRoom(room, x, z, s.floors[fi].rooms.filter((r) => r.id !== rid)); commit(mapRoom(s, rid, (r) => ({ ...r, ...p })), { key: `mv${rid}` }); },
    dupRoom: (rid) => { const s = cur(); const { room } = findRoom(s, rid); const nr = JSON.parse(JSON.stringify(room)); nr.id = uid(); nr.name = `${room.name} (copy)`; nr.objects.forEach((o) => { o.id = uid(); }); const fi = findRoom(s, rid).fi; const sp = createRoom("room", "", s.floors[fi].rooms); nr.x = sp.x; nr.z = sp.z; const tmp = { ...nr, w: room.w, l: room.l }; if (roomOverlaps(tmp, s.floors[fi].rooms)) { nr.x = room.x + room.w + 0.2; } commit(mapFloor(s, s.floors[fi].id, (f) => ({ ...f, rooms: [...f.rooms, nr] }))); setSelection({ kind: "room", roomId: nr.id }); },
    delRoom: (rid) => { const { room } = findRoom(cur(), rid); setAsk({ title: "Delete room?", text: `“${room.name}” and its ${room.objects.length} item(s) will be removed.`, run: () => { commit({ ...cur(), floors: cur().floors.map((f) => ({ ...f, rooms: f.rooms.filter((r) => r.id !== rid) })) }); setSelection({}); } }); },
    patchObject: (rid, oid, patch, key) => commit(mapObj(cur(), rid, oid, (o) => ({ ...o, ...patch })), { key: key || `o${oid}` }),
    swapVariant: (rid, oid, key) => { const b = ITEM_BY_KEY[key]; commit(mapObj(cur(), rid, oid, (o) => ({ ...o, key, type: b.type, name: b.name, dims: [...b.dims], color: b.p.c || o.color, y: o.y === ITEM_BY_KEY[o.key]?.y ? b.y : o.y }))); },
    dupObject: (rid, oid) => { const { room } = findRoom(cur(), rid); const o = room.objects.find((x) => x.id === oid); const n = { ...o, id: uid(), x: (o.x || 0) + 0.3, z: (o.z || 0) + 0.3, t: o.t != null ? o.t + 0.5 : o.t }; commit(mapRoom(cur(), rid, (r) => ({ ...r, objects: [...r.objects, n] }))); setSelection({ kind: "object", roomId: rid, objId: n.id }); },
    delObject: (rid, oid) => { commit(mapRoom(cur(), rid, (r) => ({ ...r, objects: r.objects.filter((o) => o.id !== oid) }))); setSelection({ kind: "room", roomId: rid }); },
    applyPlacements: (rid, pl) => { const by = Object.fromEntries(pl.map((p) => [p.id, p])); commit(mapRoom(cur(), rid, (r) => ({ ...r, objects: r.objects.map((o) => (by[o.id] ? { ...o, x: by[o.id].x, z: by[o.id].z, ry: by[o.id].ry } : o)) }))); },
    addByType: (type, popularKey) => { const key = ITEM_BY_KEY[popularKey] ? popularKey : itemsOfType(type)[0]?.key; if (key) addItem(key); },
  }), [activeFloor]); // eslint-disable-line react-hooks/exhaustive-deps

  function addItem(key) {
    const r = targetRoom();
    if (!r) return toast("Add a room first (Rooms tab).", "error");
    const o = createObject(key, r);
    commit(mapRoom(cur(), r.id, (rm) => ({ ...rm, objects: [...rm.objects, o] })));
    setSelection({ kind: "object", roomId: r.id, objId: o.id }); setRightTab("inspect"); setMobile(null);
  }

  // ---------------------------------------------------------------- save
  const save = useCallback(async (manual = false) => {
    if (!sceneRef.current || saving) return;
    setSaving(true);
    const r = await put(`/projects/${id}`, { name: meta.name, project_data: sceneRef.current });
    setSaving(false);
    if (!r.success) { toast(r.message || "Save failed.", "error"); return; }
    setDirty(false); setSavedAt(new Date());
    if (manual) toast("Project saved ✔", "success");
    saveCount.current += 1;
    if (manual || saveCount.current % 4 === 1) { const img = captureRef.current?.(); if (img) post(`/projects/${id}/thumbnail`, { image: img }); }
  }, [id, meta, saving, toast]);
  useEffect(() => { if (!dirty || !meta) return undefined; const t = setTimeout(() => save(false), 3000); return () => clearTimeout(t); }, [dirty, scene, meta]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && k === "y") { e.preventDefault(); redo(); }
      else if (mod && k === "s") { e.preventDefault(); save(true); }
      else if (k === "escape") setSelection({});
      else if ((k === "delete" || k === "backspace") && selObj) actions.delObject(selRoom.id, selObj.id);
      else if (k === "r" && selObj && !isOpening(selObj)) actions.patchObject(selRoom.id, selObj.id, { ry: ((selObj.ry || 0) + 90) % 360 }, null);
      else if (k === "d" && selObj) actions.dupObject(selRoom.id, selObj.id);
      else if (k.startsWith("arrow") && selObj && !isOpening(selObj)) {
        e.preventDefault(); const s = e.shiftKey ? 0.25 : 0.05;
        const c = clampInRoom(selRoom, selObj, selObj.x + (k === "arrowright" ? s : k === "arrowleft" ? -s : 0), selObj.z + (k === "arrowdown" ? s : k === "arrowup" ? -s : 0));
        actions.patchObject(selRoom.id, selObj.id, c, `nudge${selObj.id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selObj, selRoom, actions, undo, redo, save]);

  const toggleShare = async (enabled) => {
    const r = await post(`/projects/${id}/share`, { enabled });
    if (r.success) setMeta((m) => ({ ...m, share: r.share_token })); else toast(r.message, "error");
  };

  if (!scene || !meta) return <div className="studio" style={{ display: "grid", placeItems: "center" }}><Spinner label="Loading your design…" /></div>;
  const cost = computeCost(scene, prices);
  const stats = sceneStats(scene);
  const h = hist.current;
  const shareUrl = meta.share ? `${window.location.origin}/view/${meta.share}` : "";

  return (
    <div className="studio">
      <div className="st-top">
        <button className="ibtn" onClick={() => go("/")}>← Projects</button>
        <input className="name" value={meta.name} maxLength={120} onChange={(e) => { setMeta({ ...meta, name: e.target.value }); setDirty(true); }} />
        <span className="st-sep" />
        <button className="ibtn" onClick={undo} disabled={!h.past.length} title="Undo (Ctrl+Z)">↶ Undo</button>
        <button className="ibtn" onClick={redo} disabled={!h.future.length} title="Redo (Ctrl+Y)">↷ Redo</button>
        <button className="ibtn on" onClick={() => save(true)} disabled={saving}>{saving ? "Saving…" : dirty ? "💾 Save" : "✔ Saved"}</button>
        <small className="muted" style={{ whiteSpace: "nowrap" }}>{savedAt ? `at ${savedAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST` : dirty ? "unsaved changes" : ""}</small>
        <span className="st-sep" />
        <button className="ibtn" onClick={() => setShareOpen(true)}>🔗 Share</button>
        <small className="muted" style={{ whiteSpace: "nowrap" }}>{stats.floors} fl · {stats.rooms} rooms · {stats.items} items</small>
      </div>

      <aside className={`st-left ${mobile === "left" ? "open" : ""}`}>
        <div className="panel-tabs">{[["items", "🛋️ Items"], ["rooms", "🏗️ Rooms"], ["style", "🎨 Paint & Floor"]].map(([k, l]) => <button key={k} className={leftTab === k ? "on" : ""} onClick={() => setLeftTab(k)}>{l}</button>)}</div>
        <div className="panel-body">
          {leftTab === "items" && <ItemsPanel onAdd={addItem} prices={prices} search={search} setSearch={setSearch} popular={popular} />}
          {leftTab === "rooms" && <RoomsPanel scene={scene} activeFloor={activeFloor} setActiveFloor={setActiveFloor} selection={selection} onSelect={setSelection} actions={actions} />}
          {leftTab === "style" && <StylePanel scene={scene} room={selRoom} prices={prices} actions={actions} />}
        </div>
      </aside>

      <section className="st-main">
        <Scene3D scene={scene} activeFloor={activeFloor} floorMode={floorMode} selection={selection} planMode={planMode} wallMode={wallMode} time={time} showGrid={showGrid} showLabels={showLabels} fitSignal={fit} captureRef={captureRef}
          onSelect={(s) => { setSelection(s); if (s.roomId) { const f = findRoom(cur(), s.roomId)?.fi; if (f != null) setActiveFloor(f); setRightTab("inspect"); } }}
          onDragStart={pushHistory}
          onRoomMove={(rid, x, z) => commit(mapRoom(cur(), rid, (r) => ({ ...r, x, z })), { transient: true })}
          onObjectPatch={(rid, oid, patch) => commit(mapObj(cur(), rid, oid, (o) => ({ ...o, ...patch })), { transient: true })} />
        <div className="hud tl">
          <button className={`ibtn ${!planMode ? "on" : ""}`} onClick={() => setPlanMode(false)}>🧊 3D</button>
          <button className={`ibtn ${planMode ? "on" : ""}`} onClick={() => setPlanMode(true)}>📐 Plan</button>
          <span className="st-sep" />
          {[["full", "Walls"], ["half", "Half"], ["glass", "X-ray"]].map(([k, l]) => <button key={k} className={`ibtn ${wallMode === k ? "on" : ""}`} onClick={() => setWallMode(k)}>{l}</button>)}
        </div>
        <div className="hud tr">
          {[["day", "☀️"], ["evening", "🌇"], ["night", "🌙"]].map(([k, l]) => <button key={k} className={`ibtn ${time === k ? "on" : ""}`} title={k} onClick={() => setTime(k)}>{l}</button>)}
          <button className={`ibtn ${showGrid ? "on" : ""}`} onClick={() => setShowGrid((v) => !v)} title="Grid">▦</button>
          <button className={`ibtn ${showLabels ? "on" : ""}`} onClick={() => setShowLabels((v) => !v)} title="Room labels">🏷</button>
          <button className="ibtn" onClick={() => setFit((n) => n + 1)} title="Fit view">⤢ Fit</button>
        </div>
        <div className="hud bl"><small className="muted">Click to select · drag items · <b>R</b> rotate · <b>Del</b> remove · selected room: drag floor to move</small></div>
        <button className="cost-pill" onClick={() => { setRightTab("cost"); setMobile("right"); }}>💰 <span className="muted">Estimate</span> <b>{inr(cost.total)}</b></button>
      </section>

      <aside className={`st-right ${mobile === "right" ? "open" : ""}`}>
        <div className="panel-tabs">{[["inspect", "🔧 Edit"], ["cost", "💰 Cost"], ["ai", "🧠 AI"]].map(([k, l]) => <button key={k} className={rightTab === k ? "on" : ""} onClick={() => setRightTab(k)}>{l}</button>)}</div>
        <div className="panel-body">
          {rightTab === "inspect" && <Inspector scene={scene} room={selRoom} obj={selObj} prices={prices} actions={actions} />}
          {rightTab === "cost" && <CostPanel scene={scene} prices={prices} actions={actions} />}
          {rightTab === "ai" && <AIPanel scene={scene} room={selRoom} actions={actions} toast={toast} />}
        </div>
      </aside>

      <div className="st-floors">
        <small className="muted">Floors:</small>
        {scene.floors.map((f, i) => (
          <span key={f.id} className={`floor-chip ${i === activeFloor ? "on" : ""}`}>
            <button onClick={() => setActiveFloor(i)}>{f.name} · {f.height} m</button>
          </span>
        ))}
        <button className="ibtn" onClick={actions.addFloor}>＋ Add floor</button>
        <span className="st-sep" />
        <small className="muted">Show:</small>
        {[["all", "All floors"], ["upto", "Up to active"], ["only", "Active only"]].map(([k, l]) => <button key={k} className={`ibtn ${floorMode === k ? "on" : ""}`} onClick={() => setFloorMode(k)}>{l}</button>)}
      </div>
      <nav className="mobile-tabs">
        <button className={mobile === "left" ? "on" : ""} onClick={() => setMobile(mobile === "left" ? null : "left")}>🛋️ Build</button>
        <button className={!mobile ? "on" : ""} onClick={() => setMobile(null)}>🧊 3D View</button>
        <button className={mobile === "right" ? "on" : ""} onClick={() => setMobile(mobile === "right" ? null : "right")}>🔧 Edit / Cost</button>
      </nav>

      {ask && <Confirm danger title={ask.title} text={ask.text} confirmLabel="Delete" onClose={() => setAsk(null)} onConfirm={ask.run} />}
      {shareOpen && (
        <Modal title="Share this design" onClose={() => setShareOpen(false)}>
          <p className="muted">Anyone with the link can <b>view</b> your design in 3D (read-only). They cannot edit it.</p>
          {meta.share ? (<>
            <input className="inp" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            <div className="row wrap-row"><Btn onClick={() => { navigator.clipboard?.writeText(shareUrl); toast("Link copied!", "success"); }}>Copy link</Btn><Btn kind="danger" onClick={() => toggleShare(false)}>Stop sharing</Btn></div>
          </>) : <Btn onClick={() => toggleShare(true)}>Create share link</Btn>}
        </Modal>
      )}
    </div>
  );
}
