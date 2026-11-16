import { CONSTRUCTION_GRADES, FINISHES, FLOOR_BY_ID, ITEM_BY_KEY, ROOM_TYPES, TYPES } from "./catalog.js";

export const SLAB = 0.2; // floor slab thickness (m)
export const WALL_T = 0.15; // wall thickness (m)
export const snap = (v, g = 0.05) => Math.round(v / g) * g;
export const r2 = (v) => Math.round(v * 100) / 100;

export const uid = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const clone = (v) => JSON.parse(JSON.stringify(v));

// ------------------------------------------------------------------ factories
export function createFloor(name = "Ground Floor", height = 3.0) {
  return { id: uid(), name, height, rooms: [] };
}

export function createRoom(type = "room", name, rooms = []) {
  const def = ROOM_TYPES[type] || ROOM_TYPES.room;
  const [w, l] = def.size;
  const room = {
    id: uid(), name: name || def.label, type, w, l, x: 0, z: 0,
    wallColor: def.wall, floorMat: def.floorMat, floorColor: FLOOR_BY_ID[def.floorMat]?.base || "#cccccc",
    tileSize: FLOOR_BY_ID[def.floorMat]?.size || 0.6, finish: "matt", walls: {}, objects: [],
    open: def.open || null,
  };
  const spot = findFreeSpot(rooms, w, l);
  room.x = spot.x; room.z = spot.z;
  return room;
}

export function defaultScene() {
  const floor = createFloor("Ground Floor", 3.0);
  floor.rooms.push(createRoom("living", "Living Room", []));
  return { version: 2, floors: [floor], exteriorColor: "#e9e2d6", showRoof: true, grade: "standard", ground: { color: "#4f8f55", size: 40 } };
}

export function normalizeScene(data) {
  const d = data && typeof data === "object" ? clone(data) : {};
  if (!Array.isArray(d.floors) || !d.floors.length) {
    // legacy single-room project -> convert
    const old = d.room || { width: 6, length: 7, height: 3 };
    const floor = createFloor("Ground Floor", Math.max(2.4, Number(old.height) || 3));
    const room = createRoom("living", "Living Room", []);
    room.w = Math.max(2, Number(old.width) || 5);
    room.l = Math.max(2, Number(old.length) || 5);
    floor.rooms.push(room);
    d.floors = [floor];
  }
  d.version = 2;
  d.exteriorColor ||= "#e9e2d6";
  d.grade ||= "standard";
  d.showRoof = d.showRoof !== false;
  d.ground ||= { color: "#4f8f55", size: 40 };
  d.floors = d.floors.map((f, fi) => ({
    ...f, id: f.id || uid(), name: f.name || `Floor ${fi + 1}`, height: Number(f.height) || 3,
    rooms: (Array.isArray(f.rooms) ? f.rooms : []).map((r, ri) => {
      const type = ROOM_TYPES[r.type] ? r.type : "room";
      const def = ROOM_TYPES[type];
      return {
        walls: {}, finish: "matt", ...r, id: r.id || uid(), name: r.name || `Room ${ri + 1}`, type,
        w: Number(r.width ?? r.w) || def.size[0], l: Number(r.length ?? r.l) || def.size[1],
        x: Number(r.x) || 0, z: Number(r.z) || 0, wallColor: r.wallColor || def.wall,
        floorMat: FLOOR_BY_ID[r.floorMat] ? r.floorMat : def.floorMat,
        floorColor: r.floorColor || FLOOR_BY_ID[def.floorMat]?.base || "#cccccc",
        tileSize: Number(r.tileSize) || FLOOR_BY_ID[def.floorMat]?.size || 0.6, open: r.open ?? def.open ?? null,
        objects: (Array.isArray(r.objects) ? r.objects : []).map(normalizeObject),
      };
    }),
  }));
  return d;
}

function normalizeObject(o) {
  const cat = ITEM_BY_KEY[o.key];
  const type = o.type && TYPES[o.type] ? o.type : cat?.type || "cube";
  const key = cat ? o.key : (Object.values(ITEM_BY_KEY).find((i) => i.type === type)?.key || "cube.cb1");
  const base = ITEM_BY_KEY[key];
  return {
    id: o.id || uid(), key, type, name: o.name || base.name, x: Number(o.x) || 0, z: Number(o.z) || 0, ry: Number(o.ry) || 0,
    y: o.y ?? base.y, dims: Array.isArray(o.dims) && o.dims.length === 3 ? o.dims.map(Number) : [...base.dims],
    color: o.color || base.p.c || "#b68b63", wall: o.wall, t: o.t, hidden: !!o.hidden,
  };
}

// ------------------------------------------------------------------ geometry
export function floorElevations(scene) {
  const out = [];
  let y = 0;
  for (const f of scene.floors) {
    out.push(y);
    y += f.height + SLAB;
  }
  return out;
}

export const roomRect = (r) => ({ x0: r.x - r.w / 2, x1: r.x + r.w / 2, z0: r.z - r.l / 2, z1: r.z + r.l / 2 });
const overlap = (a, b, gap = 0.001) => a.x0 < b.x1 - gap && a.x1 > b.x0 + gap && a.z0 < b.z1 - gap && a.z1 > b.z0 + gap;

export function roomOverlaps(room, rooms) {
  const a = roomRect(room);
  return rooms.some((o) => o.id !== room.id && overlap(a, roomRect(o)));
}

export function findFreeSpot(rooms, w, l) {
  if (!rooms.length) return { x: 0, z: 0 };
  const cand = [];
  for (const r of rooms) {
    cand.push({ x: r.x + r.w / 2 + w / 2, z: r.z - r.l / 2 + l / 2 }, { x: r.x - r.w / 2 - w / 2, z: r.z - r.l / 2 + l / 2 },
      { x: r.x - r.w / 2 + w / 2, z: r.z + r.l / 2 + l / 2 }, { x: r.x - r.w / 2 + w / 2, z: r.z - r.l / 2 - l / 2 });
  }
  const test = { w, l, id: "_" };
  const valid = cand.filter((c) => !roomOverlaps({ ...test, ...c }, rooms));
  valid.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  return valid[0] ? { x: r2(valid[0].x), z: r2(valid[0].z) } : { x: 0, z: 0 };
}

/** Snap a room to touch neighbours (magnetic edges) and stay out of overlaps. */
export function snapRoom(room, x, z, others) {
  let nx = snap(x, 0.1), nz = snap(z, 0.1);
  const T = 0.35;
  for (const o of others) {
    const edgesX = [[o.x + o.w / 2 + room.w / 2], [o.x - o.w / 2 - room.w / 2], [o.x + o.w / 2 - room.w / 2], [o.x - o.w / 2 + room.w / 2]];
    const edgesZ = [[o.z + o.l / 2 + room.l / 2], [o.z - o.l / 2 - room.l / 2], [o.z + o.l / 2 - room.l / 2], [o.z - o.l / 2 + room.l / 2]];
    for (const [e] of edgesX) if (Math.abs(nx - e) < T) nx = e;
    for (const [e] of edgesZ) if (Math.abs(nz - e) < T) nz = e;
  }
  const trial = { ...room, x: nx, z: nz };
  return roomOverlaps(trial, others) ? { x: room.x, z: room.z } : { x: r2(nx), z: r2(nz) };
}

export const isOpening = (o) => o.type === "door" || o.type === "window";

/** Wall opening extents (door/window) along a wall. */
export function openingsFor(room, wall) {
  return room.objects
    .filter((o) => isOpening(o) && (o.wall || "S") === wall && !o.hidden)
    .map((o) => {
      const [w, h] = o.dims;
      const bottom = o.type === "door" ? 0 : Math.max(0, o.y ?? 0.9);
      return { id: o.id, t: o.t ?? 0, w, bottom, top: Math.min(bottom + h, 99) };
    })
    .sort((a, b) => a.t - b.t);
}

/** Split a wall of `len` metres into solid rectangles around its openings: [{s0,s1,y0,y1}] */
export function wallPieces(len, height, openings) {
  const pieces = [];
  let cursor = -len / 2;
  const clamp = (v) => Math.max(-len / 2, Math.min(len / 2, v));
  for (const op of openings) {
    const a = clamp(op.t - op.w / 2), b = clamp(op.t + op.w / 2);
    if (a > cursor + 0.001) pieces.push({ s0: cursor, s1: a, y0: 0, y1: height });
    if (op.bottom > 0.001) pieces.push({ s0: a, s1: b, y0: 0, y1: Math.min(op.bottom, height) });
    if (op.top < height - 0.001) pieces.push({ s0: a, s1: b, y0: op.top, y1: height });
    cursor = Math.max(cursor, b);
  }
  if (cursor < len / 2 - 0.001) pieces.push({ s0: cursor, s1: len / 2, y0: 0, y1: height });
  return pieces.filter((p) => p.s1 - p.s0 > 0.001 && p.y1 - p.y0 > 0.001);
}

export function wallHeightOf(room, floorHeight) {
  if (room.open === "none") return 0;
  if (room.open === "parapet") return 1.0;
  if (room.open === "railing") return 1.0;
  return floorHeight;
}

/** Closest wall + offset for a point in room-local coordinates (used to place doors / windows). */
export function nearestWall(room, x, z) {
  const d = { N: Math.abs(z + room.l / 2), S: Math.abs(z - room.l / 2), W: Math.abs(x + room.w / 2), E: Math.abs(x - room.w / 2) };
  const wall = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
  const t = wall === "N" || wall === "S" ? x : z;
  return { wall, t };
}

export function clampOnWall(room, wall, t, w) {
  const len = wall === "N" || wall === "S" ? room.w : room.l;
  return snap(Math.max(-len / 2 + w / 2 + 0.1, Math.min(len / 2 - w / 2 - 0.1, t)), 0.05);
}

export function wallPose(room, wall, t) {
  // position (local) & rotation of an opening that sits in `wall`
  const hw = WALL_T / 2;
  switch (wall) {
    case "N": return { x: t, z: -room.l / 2 + hw, ry: 0 };
    case "S": return { x: t, z: room.l / 2 - hw, ry: 180 };
    case "W": return { x: -room.w / 2 + hw, z: t, ry: 90 };
    default: return { x: room.w / 2 - hw, z: t, ry: 270 };
  }
}

// ------------------------------------------------------------------ objects
export function createObject(key, room) {
  const base = ITEM_BY_KEY[key];
  const def = TYPES[base.type];
  const obj = {
    id: uid(), key, type: base.type, name: base.name, x: 0, z: 0, ry: 0, y: base.y,
    dims: [...base.dims], color: base.p.c || "#b68b63",
  };
  if (def.wall) {
    // pick a wall that has the fewest openings
    const walls = ["S", "N", "E", "W"];
    walls.sort((a, b) => openingsFor(room, a).length - openingsFor(room, b).length);
    obj.wall = walls[0];
    obj.t = clampOnWall(room, obj.wall, 0, obj.dims[0]);
    Object.assign(obj, { ...wallPose(room, obj.wall, obj.t), wall: obj.wall, t: obj.t });
  } else {
    // spread new items so they do not stack exactly
    const n = room.objects.filter((o) => !isOpening(o)).length;
    obj.x = snap(((n % 4) - 1.5) * 0.5, 0.05);
    obj.z = snap((Math.floor(n / 4) % 4 - 1.5) * 0.5, 0.05);
  }
  return obj;
}

export function clampInRoom(room, o, x, z) {
  const rot = ((Math.round(o.ry) % 180) + 180) % 180;
  const [w, , d] = o.dims;
  const [hw, hd] = rot === 90 ? [d / 2, w / 2] : [w / 2, d / 2];
  const mx = Math.max(0, room.w / 2 - hw), mz = Math.max(0, room.l / 2 - hd);
  return { x: Math.max(-mx, Math.min(mx, x)), z: Math.max(-mz, Math.min(mz, z)) };
}

// ------------------------------------------------------------------ cost
export const priceOf = (key, overrides = {}) => overrides[key] ?? ITEM_BY_KEY[key]?.price ?? 0;

export function computeCost(scene, overrides = {}) {
  const byCat = {};
  const add = (cat, v) => (byCat[cat] = (byCat[cat] || 0) + v);
  let area = 0, items = 0;
  const rooms = [];
  scene.floors.forEach((f) => {
    for (const r of f.rooms) {
      let roomTotal = 0;
      const a = r.w * r.l;
      const fl = FLOOR_BY_ID[r.floorMat];
      const floorCost = a * (overrides[`floor.${r.floorMat}`] ?? fl?.price ?? 0);
      add("Flooring", floorCost); roomTotal += floorCost;
      const h = wallHeightOf(r, f.height);
      if (h > 0) {
        const finish = FINISHES.find((x) => x.id === r.finish) || FINISHES[0];
        let wallArea = 2 * (r.w + r.l) * h;
        for (const o of r.objects) if (isOpening(o)) wallArea -= o.dims[0] * o.dims[1];
        const paint = Math.max(0, wallArea) * (overrides[`finish.${finish.id}`] ?? finish.price);
        add("Wall paint", paint); roomTotal += paint;
      }
      for (const o of r.objects) {
        const p = priceOf(o.key, overrides);
        const cat = TYPES[o.type]?.cat || "basic";
        add(cat, p); roomTotal += p; items++;
      }
      if (!["garden", "balcony", "terrace"].includes(r.type)) area += a;
      rooms.push({ id: r.id, name: r.name, floor: f.name, total: roomTotal });
    }
  });
  const grade = CONSTRUCTION_GRADES.find((g) => g.id === scene.grade) || CONSTRUCTION_GRADES[1];
  const structure = area * (overrides[`grade.${grade.id}`] ?? grade.perM2);
  const interiors = Object.values(byCat).reduce((s, v) => s + v, 0);
  return { byCat, interiors, structure, total: interiors + structure, area, items, rooms, grade };
}

export const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
export const sqft = (m2) => Math.round(m2 * 10.7639);

export function sceneStats(scene) {
  const rooms = scene.floors.flatMap((f) => f.rooms);
  return { floors: scene.floors.length, rooms: rooms.length, items: rooms.reduce((s, r) => s + r.objects.length, 0) };
}
