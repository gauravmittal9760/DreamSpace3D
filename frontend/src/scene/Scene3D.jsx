import { Html, OrbitControls, OrthographicCamera, PerspectiveCamera, Sky, Stars } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FINISHES, TYPES } from "./catalog.js";
import { ItemModel } from "./Models.jsx";
import { LightCtx } from "./prims.jsx";
import { SLAB, WALL_T, clampInRoom, clampOnWall, floorElevations, isOpening, nearestWall, openingsFor, roomRect, snap, snapRoom, wallHeightOf, wallPieces, wallPose } from "./sceneUtils.js";
import { floorTexture } from "./textures.js";

const CYAN = "#22e1ff";

function bounds(scene) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, top = 3;
  const elev = floorElevations(scene);
  scene.floors.forEach((f, i) => {
    top = Math.max(top, elev[i] + f.height);
    for (const r of f.rooms) { const b = roomRect(r); x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); z0 = Math.min(z0, b.z0); z1 = Math.max(z1, b.z1); }
  });
  if (!isFinite(x0)) { x0 = -3; x1 = 3; z0 = -3; z1 = 3; }
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, l: z1 - z0, top, r: Math.max(4, Math.hypot(x1 - x0, z1 - z0) / 2) };
}

function Wall({ room, side, height, inner, outer, glass, rail }) {
  const horiz = side === "N" || side === "S";
  const len = horiz ? room.w : room.l - 2 * WALL_T;
  const pieces = useMemo(() => wallPieces(len, height, openingsFor(room, side)), [len, height, room, side]);
  const mats = useMemo(() => {
    const mk = (c) => c;
    const i = inner, o = outer;
    // BoxGeometry face order: +x -x +y -y +z -z
    const faces = { N: [o, o, o, o, i, o], S: [o, o, o, o, o, i], W: [i, o, o, o, o, o], E: [o, i, o, o, o, o] }[side];
    return faces.map(mk);
  }, [inner, outer, side]);
  const T = WALL_T;
  return pieces.map((pc, k) => {
    const mid = (pc.s0 + pc.s1) / 2, size = pc.s1 - pc.s0, hh = pc.y1 - pc.y0, y = (pc.y0 + pc.y1) / 2;
    const pos = horiz ? [mid, y, side === "N" ? -room.l / 2 + T / 2 : room.l / 2 - T / 2] : [side === "W" ? -room.w / 2 + T / 2 : room.w / 2 - T / 2, y, mid];
    const args = horiz ? [size, hh, T] : [T, hh, size];
    return (
      <mesh key={k} position={pos} castShadow={!glass} receiveShadow material={glass ? undefined : mats}>
        <boxGeometry args={args} />
        {glass && <meshStandardMaterial color="#bfe6f5" transparent opacity={0.28} roughness={0.05} depthWrite={false} />}
      </mesh>
    );
  }).concat(rail ? [<mesh key="rail" position={horiz ? [0, height, side === "N" ? -room.l / 2 + T / 2 : room.l / 2 - T / 2] : [side === "W" ? -room.w / 2 + T / 2 : room.w / 2 - T / 2, height, 0]}><boxGeometry args={horiz ? [room.w, 0.05, 0.08] : [0.08, 0.05, room.l]} /><meshStandardMaterial color="#c7ccd1" metalness={0.9} roughness={0.25} /></mesh>] : []);
}

const Room = memo(function Room({ room, elev, height, exterior, wallMode, selected, readOnly, onPick, onDown, showLabel, planMode, hasRoof, showRoof }) {
  const tex = useMemo(() => floorTexture(room.floorMat, room.floorColor, room.tileSize, room.w, room.l), [room.floorMat, room.floorColor, room.tileSize, room.w, room.l]);
  useEffect(() => () => tex.dispose(), [tex]);
  const finish = FINISHES.find((f) => f.id === room.finish) || FINISHES[0];
  const wallH0 = wallHeightOf(room, height);
  const wallH = wallMode === "half" && wallH0 > 1.2 ? 1.15 : wallH0;
  const xray = wallMode === "glass" && wallH0 > 1.2;
  const mk = (c, side) => new THREE.MeshStandardMaterial({ color: c, roughness: finish.rough, metalness: finish.id === "metallic" ? 0.45 : 0, transparent: xray, opacity: xray ? 0.22 : 1, depthWrite: !xray, side: THREE.FrontSide });
  const outerMat = useMemo(() => mk(exterior), [exterior, finish.id, xray]); // eslint-disable-line react-hooks/exhaustive-deps
  const inner = useMemo(() => Object.fromEntries(["N", "E", "S", "W"].map((s) => [s, mk(room.walls?.[s]?.color || room.wallColor)])), [room.wallColor, room.walls, finish.id, xray]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { outerMat.dispose(); Object.values(inner).forEach((m) => m.dispose()); }, [outerMat, inner]);
  const slabMats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: "#8d8d92", roughness: 1 });
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: FLOOR_ROUGH(room.floorMat), metalness: 0.02 });
    return [side, side, top, side, side, side];
  }, [tex, room.floorMat]);
  useEffect(() => () => slabMats[2].dispose(), [slabMats]);
  const isOpen = room.open === "none";
  const glassRail = room.open === "railing";
  return (
    <group position={[room.x, elev, room.z]}>
      <mesh position={[0, -SLAB / 2, 0]} material={slabMats} receiveShadow castShadow
        onClick={(e) => { if (readOnly) return; e.stopPropagation(); onPick(room.id); }}
        onPointerDown={(e) => { if (readOnly || !selected) return; e.stopPropagation(); onDown(room, e); }}>
        <boxGeometry args={[room.w, SLAB, room.l]} />
      </mesh>
      {!isOpen && ["N", "E", "S", "W"].map((s) => <Wall key={s} room={room} side={s} height={wallH} inner={inner[s]} outer={outerMat} glass={glassRail} rail={glassRail} />)}
      {showRoof && hasRoof && !isOpen && !glassRail && wallH0 > 1.5 && wallMode === "full" && (
        <mesh position={[0, height + 0.07, 0]} castShadow receiveShadow><boxGeometry args={[room.w + 0.1, 0.14, room.l + 0.1]} /><meshStandardMaterial color={exterior} roughness={0.9} /></mesh>
      )}
      {selected && (<lineSegments position={[0, 0.03, 0]}><edgesGeometry args={[new THREE.BoxGeometry(room.w, 0.02, room.l)]} /><lineBasicMaterial color={CYAN} linewidth={2} /></lineSegments>)}
      {(showLabel || planMode) && (
        <Html position={[0, 0.05, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div className={`room-tag ${selected ? "sel" : ""}`}><b>{room.name}</b><span>{room.w.toFixed(1)} × {room.l.toFixed(1)} m</span></div>
        </Html>
      )}
      {room.objects.filter((o) => !o.hidden).map((o) => (
        <Obj key={o.id} o={o} room={room} height={height} selectedId={selected === "obj" ? null : null} readOnly={readOnly} />
      ))}
    </group>
  );
});
const FLOOR_ROUGH = (id) => (["vitrified", "marble_w", "marble_b", "marble_g", "granite_k", "checker"].includes(id) ? 0.18 : id === "carpet" ? 1 : 0.7);

function Obj({ o, room, height }) {
  const def = TYPES[o.type] || {};
  const open = isOpening(o);
  let pos, ry = o.ry;
  if (open) {
    const pose = wallPose(room, o.wall || "S", o.t || 0);
    pos = [pose.x, o.type === "door" ? 0 : (o.y ?? 0.9), pose.z];
    ry = pose.ry;
  } else {
    pos = [o.x, def.hang ? height - (o.y || 0) : (o.y || 0), o.z];
  }
  return (
    <group position={pos} rotation={[0, THREE.MathUtils.degToRad(ry), 0]} userData={{ oid: o.id }}>
      <ItemModel item={o} />
    </group>
  );
}

// Interactive wrappers (pick / drag) around objects live here so that Room can stay memoised.
function Pickables({ scene, elev, activeRoomId, selObjId, readOnly, onPickObject, onDownObject }) {
  if (readOnly) return null;
  return scene.floors.flatMap((f, fi) => f.rooms.flatMap((r) => r.objects.filter((o) => !o.hidden).map((o) => {
    const def = TYPES[o.type] || {};
    const open = isOpening(o);
    const pose = open ? wallPose(r, o.wall || "S", o.t || 0) : null;
    const [w, h, d] = o.dims;
    const base = open ? (o.type === "door" ? 0 : (o.y ?? 0.9)) : def.hang ? f.height - (o.y || 0) - h : (o.y || 0);
    const rot = open ? pose.ry : o.ry;
    const px = r.x + (open ? pose.x : o.x), pz = r.z + (open ? pose.z : o.z);
    const sel = selObjId === o.id;
    return (
      <group key={o.id} position={[px, elev[fi] + base + h / 2, pz]} rotation={[0, THREE.MathUtils.degToRad(rot), 0]}>
        <mesh visible={true} onClick={(e) => { e.stopPropagation(); onPickObject(r.id, o.id); }} onPointerDown={(e) => { e.stopPropagation(); onDownObject(r, o, e); }}>
          <boxGeometry args={[Math.max(0.1, w), Math.max(0.05, h), Math.max(0.1, d)]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {sel && (<lineSegments><edgesGeometry args={[new THREE.BoxGeometry(w + 0.04, h + 0.04, d + 0.04)]} /><lineBasicMaterial color={CYAN} /></lineSegments>)}
      </group>
    );
  })));
}

function Rig({ scene, fitSignal, planMode, controlsRef, captureRef }) {
  const { camera, gl } = useThree();
  const b = useMemo(() => bounds(scene), [scene]);
  const first = useRef(true);
  useEffect(() => {
    if (captureRef) captureRef.current = () => {
      const src = gl.domElement;
      const c = document.createElement("canvas");
      const k = 640 / src.width;
      c.width = 640; c.height = Math.max(1, Math.round(src.height * k));
      c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.78);
    };
  }, [gl, captureRef]);
  useEffect(() => {
    const ctl = controlsRef.current;
    const d = b.r * (planMode ? 1 : 1.5);
    if (planMode) {
      camera.position.set(b.cx, 80, b.cz + 0.001);
      camera.zoom = Math.max(8, Math.min(120, 520 / (Math.max(b.w, b.l) + 6)));
      camera.updateProjectionMatrix();
    } else {
      camera.position.set(b.cx + d * 0.9, b.top + d * 0.75, b.cz + d * 1.15);
    }
    if (ctl) { ctl.target.set(b.cx, planMode ? 0 : b.top / 3, b.cz); ctl.update(); }
    first.current = false;
  }, [fitSignal, planMode]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Lights({ time, b }) {
  const night = time === "night", eve = time === "evening";
  const sun = eve ? [-b.r * 2, b.r * 0.7, b.r] : [b.r * 1.2, b.r * 2.2, b.r * 0.8];
  const R = b.r * 1.6;
  return (
    <>
      <hemisphereLight args={[night ? "#3a4a88" : eve ? "#ffd2a8" : "#dbe9ff", night ? "#10131f" : "#6b5a48", night ? 0.35 : eve ? 0.55 : 0.75]} position={[0, 20, 0]} />
      <ambientLight intensity={night ? 0.12 : 0.25} />
      <directionalLight position={[b.cx + sun[0], sun[1], b.cz + sun[2]]} intensity={night ? 0.35 : eve ? 1.5 : 2.3} color={night ? "#9db4ff" : eve ? "#ff9d5c" : "#fff6e8"} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-R} shadow-camera-right={R} shadow-camera-top={R} shadow-camera-bottom={-R} shadow-camera-near={1} shadow-camera-far={R * 6} target-position={[b.cx, 0, b.cz]} />
    </>
  );
}

export default function Scene3D({
  scene, activeFloor = 0, floorMode = "all", selection = {}, readOnly = false, planMode = false, wallMode = "full", time = "day",
  showGrid = true, showLabels = true, fitSignal = 0, captureRef, onSelect, onDragStart, onRoomMove, onObjectPatch,
}) {
  const controls = useRef();
  const [drag, setDrag] = useState(null);
  const elev = useMemo(() => floorElevations(scene), [scene]);
  const b = useMemo(() => bounds(scene), [scene]);
  const night = time === "night";

  // lights budget: first 12 light emitters get real point lights at night
  const allowed = useMemo(() => {
    const ids = [];
    scene.floors.forEach((f) => f.rooms.forEach((r) => r.objects.forEach((o) => { if (["light", "chandelier", "lamp", "lamp_post", "fan"].includes(o.type)) ids.push(o.id); })));
    return new Set(ids.slice(0, 12));
  }, [scene]);

  const visible = (i) => floorMode === "all" || (floorMode === "upto" && i <= activeFloor) || (floorMode === "only" && i === activeFloor);
  const roofOf = (fi, room) => !scene.floors.slice(fi + 1).some((f) => f.rooms.some((o) => {
    const a = roomRect(room), c = roomRect(o);
    return a.x0 < c.x1 && a.x1 > c.x0 && a.z0 < c.z1 && a.z1 > c.z0;
  }));

  const startRoomDrag = (room, e) => { if (!planMode && e.pointerType === "touch") { /* orbit with touch unless selected */ } onDragStart?.(); setDrag({ kind: "room", id: room.id, fi: scene.floors.findIndex((f) => f.rooms.some((r) => r.id === room.id)), dx: e.point.x - room.x, dz: e.point.z - room.z }); };
  const startObjDrag = (room, o, e) => {
    if (selection.objId !== o.id) { onSelect?.({ kind: "object", roomId: room.id, objId: o.id }); }
    onDragStart?.();
    const fi = scene.floors.findIndex((f) => f.rooms.some((r) => r.id === room.id));
    setDrag({ kind: "obj", roomId: room.id, id: o.id, fi, dx: e.point.x - room.x - o.x, dz: e.point.z - room.z - o.z });
  };
  useEffect(() => {
    if (controls.current) controls.current.enabled = !drag;
    if (!drag) return undefined;
    const up = () => setDrag(null);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [drag]);

  const onMove = (e) => {
    if (!drag) return;
    const fl = scene.floors[drag.fi];
    const room = fl?.rooms.find((r) => r.id === (drag.kind === "room" ? drag.id : drag.roomId));
    if (!room) return;
    if (drag.kind === "room") {
      const others = fl.rooms.filter((r) => r.id !== room.id);
      const p = snapRoom(room, e.point.x - drag.dx, e.point.z - drag.dz, others);
      if (p.x !== room.x || p.z !== room.z) onRoomMove?.(room.id, p.x, p.z);
    } else {
      const o = room.objects.find((x) => x.id === drag.id);
      if (!o) return;
      const lx = e.point.x - room.x, lz = e.point.z - room.z;
      if (isOpening(o)) {
        const { wall, t } = nearestWall(room, lx, lz);
        const tt = clampOnWall(room, wall, t, o.dims[0]);
        if (wall !== o.wall || tt !== o.t) onObjectPatch?.(room.id, o.id, { wall, t: tt });
      } else {
        const c = clampInRoom(room, o, snap(lx - drag.dx), snap(lz - drag.dz));
        if (c.x !== o.x || c.z !== o.z) onObjectPatch?.(room.id, o.id, c);
      }
    }
  };

  const dragElev = drag ? elev[drag.fi] || 0 : 0;
  const bg = night ? "#060913" : time === "evening" ? "#2a1b30" : "#bcd9f2";
  const lightCtx = useMemo(() => ({ night, allowed }), [night, allowed]);

  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ preserveDrawingBuffer: true, antialias: true }} onPointerMissed={() => !drag && onSelect?.({})} style={{ touchAction: "none" }}>
      <color attach="background" args={[bg]} />
      {!planMode && !night && <Sky sunPosition={time === "evening" ? [-100, 8, 40] : [60, 80, 40]} turbidity={time === "evening" ? 8 : 3} rayleigh={time === "evening" ? 3 : 1.2} />}
      {!planMode && night && <Stars radius={120} depth={40} count={2200} factor={4} fade />}
      {!planMode && <fog attach="fog" args={[bg, b.r * 5, b.r * 14]} />}
      {planMode ? <OrthographicCamera makeDefault position={[0, 80, 0.001]} zoom={40} near={0.1} far={400} /> : <PerspectiveCamera makeDefault fov={48} near={0.1} far={600} position={[10, 9, 12]} />}
      <OrbitControls ref={controls} makeDefault enableRotate={!planMode} maxPolarAngle={Math.PI / 2.02} minDistance={1.5} maxDistance={planMode ? 400 : 160} enableDamping dampingFactor={0.12} screenSpacePanning={planMode} />
      <Rig scene={scene} fitSignal={fitSignal} planMode={planMode} controlsRef={controls} captureRef={captureRef} />
      <Lights time={time} b={b} />
      <LightCtx.Provider value={lightCtx}>
        {/* ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[b.cx, -0.03, b.cz]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color={scene.ground?.color || "#4f8f55"} roughness={1} />
        </mesh>
        {showGrid && <gridHelper args={[120, 120, planMode ? "#2a8bff" : "#5a7a5e", planMode ? "#3a4a66" : "#4a6a4e"]} position={[Math.round(b.cx), 0.002, Math.round(b.cz)]} />}
        {scene.floors.map((f, fi) => visible(fi) && (
          <group key={f.id} visible>
            {f.rooms.map((r) => (
              <Room key={r.id} room={r} elev={elev[fi]} height={f.height} exterior={scene.exteriorColor} wallMode={wallMode}
                selected={selection.roomId === r.id && !selection.objId} readOnly={readOnly}
                onPick={(id) => onSelect?.({ kind: "room", roomId: id })} onDown={startRoomDrag}
                showLabel={showLabels} planMode={planMode} hasRoof={roofOf(fi, r)} showRoof={scene.showRoof} />
            ))}
            <Pickables scene={{ floors: [f] }} elev={[elev[fi]]} activeRoomId={selection.roomId} selObjId={selection.objId} readOnly={readOnly}
              onPickObject={(roomId, objId) => onSelect?.({ kind: "object", roomId, objId })} onDownObject={(r, o, e) => startObjDrag(r, o, e)} />
          </group>
        ))}
        {drag && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[b.cx, dragElev + (drag.kind === "room" ? 0 : 0.0), b.cz]} onPointerMove={onMove} onPointerUp={() => setDrag(null)}>
            <planeGeometry args={[600, 600]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </LightCtx.Provider>
    </Canvas>
  );
}
