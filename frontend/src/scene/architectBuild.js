import { itemsOfType } from "./catalog.js";
import { createFloor, createObject, createRoom, defaultScene } from "./sceneUtils.js";

const tierKey = (type, tier) => {
  const list = itemsOfType(type).slice().sort((a, b) => a.price - b.price);
  if (!list.length) return null;
  const f = { budget: 0.1, standard: 0.45, premium: 0.85 }[tier] ?? 0.45;
  return list[Math.min(list.length - 1, Math.round(f * (list.length - 1)))].key;
};
const PLAN = {
  bedroom: ["bed", "bedside", "bedside", "wardrobe", "fan", "light"], kids: ["bed", "wardrobe", "desk", "chair", "fan"],
  living: ["sofa", "coffee_table", "tv_unit", "tv", "rug", "plant", "fan", "light"], dining: ["table", "chair", "chair", "chair", "chair", "fan", "chandelier"],
  kitchen: ["kitchen_counter", "fridge", "chimney", "light"], bathroom: ["toilet", "washbasin", "shower", "mirror", "geyser"],
  study: ["desk", "chair", "bookshelf", "lamp"], hall: ["stairs", "shoe_rack", "plant"], balcony: ["plant", "chair", "chair", "coffee_table"],
  garden: ["tree", "tree", "bush", "bench", "lamp_post"],
};
const PREMIUM = { bedroom: ["dresser", "ac"], living: ["cabinet", "ac", "chandelier"], garden: ["fountain"], study: ["ac"] };
const DOOR = { entrance: "dr3", main: "dr2", bath: "dr6", glass: "dr4" };

/** Convert an /ai/architect plan into a DreamSpace scene (rooms, doors, windows, furniture). */
export function buildSceneFromPlan(plan, { tier = "standard" } = {}) {
  const scene = { ...defaultScene(), floors: [], grade: tier === "premium" ? "premium" : tier === "budget" ? "basic" : "standard" };
  const byId = {};
  plan.floors.forEach((pf, fi) => {
    const f = createFloor(pf.name, pf.height);
    for (const pr of pf.rooms) {
      const r = createRoom(pr.type, pr.name, []);
      Object.assign(r, { id: pr.id, x: pr.x, z: pr.z, w: pr.w, l: pr.l, name: pr.name });
      const list = [...(PLAN[pr.type] || []), ...(tier === "premium" ? PREMIUM[pr.type] || [] : [])];
      if (pr.type === "hall" && fi > 0 && list.includes("shoe_rack")) list.splice(list.indexOf("shoe_rack"), 1);
      if (pr.type === "bathroom" && pr.w * pr.l < 3.2 && list.includes("geyser")) list.splice(list.indexOf("geyser"), 1);
      for (const t of list) { const k = tierKey(t, tier); if (k) r.objects.push(createObject(k, r)); }
      f.rooms.push(r); byId[r.id] = r;
    }
    scene.floors.push(f);
  });
  if (plan.garden) {
    const g = createRoom("garden", plan.garden.name, []);
    Object.assign(g, { id: plan.garden.id, x: plan.garden.x, z: plan.garden.z, w: plan.garden.w, l: plan.garden.l });
    for (const t of [...PLAN.garden, ...(tier === "premium" ? PREMIUM.garden : [])]) { const k = tierKey(t, tier); if (k) g.objects.push(createObject(k, g)); }
    scene.floors[0].rooms.push(g);
  }
  const put = (rid, key, patch) => { const r = byId[rid]; if (!r) return; const o = createObject(key, r); Object.assign(o, patch); r.objects.push(o); };
  for (const d of plan.doors) put(d.room, `door.${DOOR[d.kind] || "dr1"}`, { wall: d.wall, t: d.t });
  for (const w of plan.windows) put(w.room, w.kind === "vent" ? "window.wn6" : "window.wn1", { wall: w.wall, t: w.t });
  return scene;
}

/** Attach wall-mounted items to the furniture they belong with, after the AI arranged the floor furniture. */
export function attachWallItems(room) {
  const find = (t) => room.objects.find((o) => o.type === t);
  const tvu = find("tv_unit"), tv = find("tv");
  if (tvu && tv) Object.assign(tv, { x: tvu.x, z: tvu.z, ry: tvu.ry, y: tvu.dims[1] + 0.05 });
  const basin = find("washbasin"), mir = find("mirror");
  if (basin && mir) { const rot = (basin.ry * Math.PI) / 180; Object.assign(mir, { x: basin.x - Math.sin(rot) * 0.2, z: basin.z - Math.cos(rot) * 0.2, ry: basin.ry, y: 1.25 }); }
  const counter = find("kitchen_counter"), chim = find("chimney");
  if (counter && chim) Object.assign(chim, { x: counter.x, z: counter.z, ry: counter.ry, y: 1.6 });
  const toilet = find("toilet"), gey = find("geyser");
  if (toilet && gey) Object.assign(gey, { x: toilet.x, z: toilet.z, ry: toilet.ry, y: 1.9 });
  const bed = find("bed"), ac = find("ac");
  if (bed && ac) { const rot = (bed.ry * Math.PI) / 180; Object.assign(ac, { x: bed.x - Math.sin(rot) * (bed.dims[2] / 2 - 0.2), z: bed.z - Math.cos(rot) * (bed.dims[2] / 2 - 0.2), ry: bed.ry, y: 2.2 }); }
  const st = find("stairs"); if (st) { st.ry = 0; st.x = 0; st.z = -room.l / 2 + st.dims[2] / 2 + 0.2; }
  return room;
}
