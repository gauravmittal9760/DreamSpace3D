import { ROOM_TYPES } from "./catalog.js";
import { createFloor, createObject, createRoom, defaultScene } from "./sceneUtils.js";

function room(type, name, x, z, w, l) {
  const r = createRoom(type, name, []);
  Object.assign(r, { x, z, w, l });
  return r;
}
function add(r, key, patch = {}) {
  const o = createObject(key, r);
  Object.assign(o, patch);
  r.objects.push(o);
  return o;
}
const scene = (floors, extra = {}) => ({ ...defaultScene(), floors, ...extra });

function livingSet(r) {
  add(r, "tv_unit.t01", { x: 0, z: -r.l / 2 + 0.4, ry: 0 });
  add(r, "tv.v55", { x: 0, z: -r.l / 2 + 0.38, y: 0.62 });
  add(r, "sofa.s02", { x: 0, z: 0.7, ry: 180 });
  add(r, "coffee_table.c01", { x: 0, z: -0.5 });
  add(r, "rug.rg1", { x: 0, z: -0.3 });
  add(r, "plant.pl2", { x: r.w / 2 - 0.5, z: -r.l / 2 + 0.5 });
  add(r, "fan.f02"); add(r, "door.dr2", { wall: "S", t: r.w / 4 }); add(r, "window.wn3", { wall: "W", t: 0 });
}
function bedSet(r, kid) {
  add(r, kid ? "bed.b10" : "bed.b03", { x: 0, z: -r.l / 2 + 1.15, ry: 0 });
  add(r, "bedside.n02", { x: -1.2, z: -r.l / 2 + 0.4 }); add(r, "bedside.n02", { x: 1.2, z: -r.l / 2 + 0.4 });
  add(r, kid ? "wardrobe.w13" : "wardrobe.w02", { x: r.w / 2 - 0.45, z: 0.4, ry: 270 });
  add(r, "fan.f01"); add(r, "door.dr1", { wall: "S", t: -r.w / 4 }); add(r, "window.wn1", { wall: "N", t: 1.2 });
}
function bathSet(r) {
  add(r, "toilet.wc4", { x: -0.6, z: -r.l / 2 + 0.4, ry: 0 }); add(r, "washbasin.ws2", { x: 0.5, z: -r.l / 2 + 0.35 });
  add(r, "shower.sh1", { x: r.w / 2 - 0.5, z: r.l / 2 - 0.5, ry: 180 }); add(r, "door.dr6", { wall: "S", t: -0.4 }); add(r, "window.wn6", { wall: "W", t: 0 });
}
function kitchenSet(r) {
  add(r, "kitchen_counter.u01", { x: 0, z: -r.l / 2 + 0.4, ry: 0 }); add(r, "fridge.y02", { x: -r.w / 2 + 0.5, z: r.l / 2 - 0.5, ry: 90 });
  add(r, "chimney.ch1", { x: 0, z: -r.l / 2 + 0.3 }); add(r, "door.dr1", { wall: "W", t: 0.6 }); add(r, "window.wn3", { wall: "N", t: 0 });
}

export const TEMPLATES = [
  { id: "blank", icon: "⬜", name: "Blank room", desc: "One empty 5 × 4.5 m room", build: () => { const s = defaultScene(); s.floors[0].rooms[0].objects = []; return s; } },
  {
    id: "2bhk", icon: "🏠", name: "2 BHK Home", desc: "Living, kitchen, 2 bedrooms, bathroom", build: () => {
      const f = createFloor("Ground Floor", 3);
      const lv = room("living", "Living Room", 0, 0, 5, 4.5), kt = room("kitchen", "Kitchen", 4.1, -0.75, 3.2, 3);
      const b1 = room("bedroom", "Master Bedroom", -1.5, 4.05, 4, 3.6), b2 = room("kids", "Bedroom 2", 2.3, 4.05, 3.6, 3.6), ba = room("bathroom", "Bathroom", 5.3, 3.35, 2.4, 2.2);
      livingSet(lv); kitchenSet(kt); bedSet(b1); bedSet(b2, true); bathSet(ba);
      f.rooms.push(lv, kt, b1, b2, ba);
      return scene([f]);
    },
  },
  {
    id: "villa", icon: "🏡", name: "Duplex Villa", desc: "2 floors, garden, balcony & terrace", build: () => {
      const g = createFloor("Ground Floor", 3.2), u = createFloor("First Floor", 3.0);
      const lv = room("living", "Living Hall", 0, 0, 6, 5), kt = room("kitchen", "Kitchen", 4.6, -1, 3.2, 3), dn = room("dining", "Dining", 4.6, 2.0, 3.2, 3), ba = room("bathroom", "Powder Room", -3.8, -1.3, 2.4, 2.4);
      livingSet(lv); kitchenSet(kt); bathSet(ba);
      add(lv, "stairs.st1", { x: -lv.w / 2 + 0.9, z: lv.l / 2 - 2.0, ry: 0 });
      add(dn, "table.t42", { x: 0, z: 0 }); [-0.9, 0.9].forEach((x) => [-0.7, 0.7].forEach((z) => add(dn, "chair.h01", { x, z: z * 1.0, ry: z > 0 ? 180 : 0 })));
      add(dn, "chandelier.a01"); add(dn, "door.dr1", { wall: "W", t: -1 });
      const garden = room("garden", "Front Garden", 0, 8.0, 14, 7);
      add(garden, "tree.tr1", { x: -5, z: 1 }); add(garden, "tree.tr4", { x: 5.5, z: 0 }); add(garden, "bench.be1", { x: 2, z: 2 }); add(garden, "fountain.fo1", { x: -1.5, z: 0.5 }); add(garden, "bush.bu2", { x: 0, z: 3.1 }); add(garden, "lamp_post.lp1", { x: -3, z: 2.5 });
      g.rooms.push(lv, kt, dn, ba, garden);
      const m = room("bedroom", "Master Bedroom", 0, 0, 5, 4.5), b2 = room("bedroom", "Bedroom 2", 4.4, -0.5, 3.8, 3.6), ba2 = room("bathroom", "Bathroom", -3.7, -1.1, 2.4, 2.4), bal = room("balcony", "Balcony", 0, 3.0, 5, 1.5), ter = room("terrace", "Terrace", 4.4, 3.3, 3.8, 3.0);
      bedSet(m); bedSet(b2); bathSet(ba2); add(bal, "plant.pl3", { x: 1.5, z: 0 }); add(bal, "chair.h04", { x: -1.2, z: 0.1 }); add(ter, "bench.be1", { x: 0, z: 0.8 }); add(ter, "plant.pl3", { x: 1.2, z: -0.8 });
      u.rooms.push(m, b2, ba2, bal, ter);
      return scene([g, u]);
    },
  },
  {
    id: "studio", icon: "🏢", name: "Studio Apartment", desc: "Open-plan 1 room + bath + balcony", build: () => {
      const f = createFloor("Floor 1", 2.9);
      const s = room("living", "Studio", 0, 0, 6, 4.5), ba = room("bathroom", "Bathroom", 4.2, 1.15, 2.4, 2.2), bal = room("balcony", "Balcony", 0, 3.0, 6, 1.5);
      livingSet(s); add(s, "bed.b02", { x: 2, z: -1.3 }); add(s, "wardrobe.w04", { x: 2.4, z: 1.5, ry: 270 }); bathSet(ba); add(bal, "plant.pl2", { x: 2, z: 0 });
      f.rooms.push(s, ba, bal);
      return scene([f]);
    },
  },
];
export const ROOM_TYPE_LIST = Object.entries(ROOM_TYPES).map(([id, v]) => ({ id, ...v }));
