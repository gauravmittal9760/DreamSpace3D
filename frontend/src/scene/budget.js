import { CONSTRUCTION_GRADES, FLOORS, FLOOR_BY_ID, ITEMS, ITEM_BY_KEY } from "./catalog.js";
import { computeCost, priceOf } from "./sceneUtils.js";

const area = (d) => d[0] * d[2];

/** Smart Budget Optimizer: cheapest look-alike swaps (same type, similar footprint) until the total fits the budget. */
export function optimizeBudget(scene, target, prices = {}) {
  const base = computeCost(scene, prices);
  if (base.total <= target) return { reached: true, swaps: [], floorChanges: [], grade: null, newTotal: base.total, oldTotal: base.total };
  const swaps = [];
  for (const f of scene.floors) for (const r of f.rooms) for (const o of r.objects) {
    const cur = priceOf(o.key, prices);
    if (cur <= 0 || o.type === "door" || o.type === "window") continue;
    const alts = ITEMS.filter((i) => i.type === o.type && i.key !== o.key && priceOf(i.key, prices) < cur && area(i.dims) / area(o.dims) > 0.7 && area(i.dims) / area(o.dims) < 1.35);
    if (!alts.length) continue;
    alts.sort((a, b) => (priceOf(a.key, prices) + 4000 * Math.abs(1 - area(a.dims) / area(o.dims))) - (priceOf(b.key, prices) + 4000 * Math.abs(1 - area(b.dims) / area(o.dims))));
    const to = alts[0];
    swaps.push({ roomId: r.id, objId: o.id, name: o.name, from: o.key, to: to.key, toName: to.name, saving: cur - priceOf(to.key, prices) });
  }
  swaps.sort((a, b) => b.saving - a.saving);
  let total = base.total; const chosen = [];
  for (const s of swaps) { if (total <= target) break; chosen.push(s); total -= s.saving; }
  const floorChanges = [];
  if (total > target) {
    for (const r of scene.floors.flatMap((f) => f.rooms).sort((a, b) => b.w * b.l - a.w * a.l)) {
      if (total <= target) break;
      const cur = FLOOR_BY_ID[r.floorMat]; if (!cur) continue;
      const cheaper = FLOORS.filter((x) => x.price < cur.price && x.pattern !== "grass" && x.id !== "gravel").sort((a, b) => b.price - a.price)[0];
      if (!cheaper) continue;
      const save = r.w * r.l * ((prices[`floor.${cur.id}`] ?? cur.price) - (prices[`floor.${cheaper.id}`] ?? cheaper.price));
      if (save > 0) { floorChanges.push({ roomId: r.id, name: r.name, to: cheaper.id, toName: cheaper.label, saving: save }); total -= save; }
    }
  }
  let grade = null;
  if (total > target) {
    const idx = CONSTRUCTION_GRADES.findIndex((g) => g.id === scene.grade);
    for (let i = idx - 1; i >= 0 && total > target; i--) {
      const save = base.area * ((prices[`grade.${CONSTRUCTION_GRADES[idx].id}`] ?? CONSTRUCTION_GRADES[idx].perM2) - (prices[`grade.${CONSTRUCTION_GRADES[i].id}`] ?? CONSTRUCTION_GRADES[i].perM2));
      if (save > 0) { grade = { to: CONSTRUCTION_GRADES[i].id, label: CONSTRUCTION_GRADES[i].label, saving: save }; total -= save; }
    }
  }
  return { reached: total <= target, swaps: chosen, floorChanges, grade, newTotal: total, oldTotal: base.total };
}

export function applyBudgetPlan(scene, plan) {
  const sw = Object.fromEntries(plan.swaps.map((s) => [s.objId, s])), fc = Object.fromEntries(plan.floorChanges.map((s) => [s.roomId, s]));
  return {
    ...scene, ...(plan.grade ? { grade: plan.grade.to } : {}),
    floors: scene.floors.map((f) => ({ ...f, rooms: f.rooms.map((r) => ({
      ...r, ...(fc[r.id] ? { floorMat: fc[r.id].to, floorColor: FLOOR_BY_ID[fc[r.id].to].base, tileSize: FLOOR_BY_ID[fc[r.id].to].size } : {}),
      objects: r.objects.map((o) => { const s = sw[o.id]; if (!s) return o; const b = ITEM_BY_KEY[s.to]; return { ...o, key: b.key, name: b.name, dims: [...b.dims], color: b.p.c || o.color }; }),
    })) })),
  };
}
