import { CONSTRUCTION_GRADES, FINISHES, FLOOR_BY_ID, TYPES } from "./catalog.js";
import { isOpening, priceOf } from "./sceneUtils.js";

// Editable rates (INR). The admin can override any of them in Prices (key = "boq.<id>").
export const BOQ_RATES = [
  { id: "struct_material", label: "Structure - material share", value: 0.62, unit: "ratio" },
  { id: "tile_wastage", label: "Tile / flooring wastage", value: 0.10, unit: "ratio" },
  { id: "tile_labour", label: "Flooring laying labour", value: 120, unit: "₹/m²" },
  { id: "primer", label: "Wall primer", value: 40, unit: "₹/m²" },
  { id: "putty", label: "Wall putty (2 coats)", value: 55, unit: "₹/m²" },
  { id: "ceiling_paint", label: "Ceiling paint", value: 180, unit: "₹/m²" },
  { id: "door_fit", label: "Door fixing & hardware", value: 1500, unit: "₹/door" },
  { id: "window_fit", label: "Window fixing & glazing labour", value: 1200, unit: "₹/window" },
  { id: "wire_point", label: "Wiring per electrical point", value: 650, unit: "₹/point" },
  { id: "switch", label: "Switch (modular)", value: 180, unit: "₹/pc" },
  { id: "socket", label: "Socket (modular)", value: 220, unit: "₹/pc" },
  { id: "db", label: "Distribution board + MCBs per floor", value: 8500, unit: "₹/floor" },
  { id: "plumb_point", label: "Plumbing pipes & fitting per fixture", value: 4500, unit: "₹/fixture" },
  { id: "install_pct", label: "Furniture installation", value: 0.04, unit: "ratio" },
  { id: "contingency", label: "Contingency", value: 0.05, unit: "ratio" },
  { id: "gst", label: "GST", value: 0.18, unit: "ratio" },
];
const SOCKETS = { bedroom: 5, kids: 5, living: 7, kitchen: 8, dining: 3, study: 5, bathroom: 2, hall: 2, balcony: 1 };
const FIXTURES = new Set(["toilet", "washbasin", "shower", "bathtub", "kitchen_sink", "washing_machine", "geyser"]);
const OUTDOOR = new Set(["garden", "terrace"]);

export function boq(scene, prices = {}) {
  const R = Object.fromEntries(BOQ_RATES.map((r) => [r.id, prices[`boq.${r.id}`] ?? r.value]));
  const sections = [];
  const add = (name, lines) => { const l = lines.filter((x) => x.amount > 0); if (l.length) sections.push({ name, lines: l, total: l.reduce((s, x) => s + x.amount, 0) }); };
  const line = (desc, qty, unit, rate) => ({ desc, qty: Math.round(qty * 100) / 100, unit, rate, amount: Math.round(qty * rate) });
  const rooms = scene.floors.flatMap((f) => f.rooms.map((r) => ({ ...r, height: f.height, floor: f.name })));
  const built = rooms.filter((r) => !OUTDOOR.has(r.type) && r.type !== "balcony");
  const area = built.reduce((s, r) => s + r.w * r.l, 0);
  const grade = CONSTRUCTION_GRADES.find((g) => g.id === scene.grade) || CONSTRUCTION_GRADES[1];
  const rate = prices[`grade.${grade.id}`] ?? grade.perM2;
  add("1. Civil & structure", [line(`Structure - material (${grade.label})`, area, "m²", rate * R.struct_material), line("Structure - labour & supervision", area, "m²", rate * (1 - R.struct_material))]);
  const fl = [];
  for (const r of rooms) {
    const m = FLOOR_BY_ID[r.floorMat]; if (!m) continue;
    const withWaste = r.w * r.l * (1 + R.tile_wastage), price = prices[`floor.${m.id}`] ?? m.price;
    const tiles = ["grid", "checker", "hex", "brick"].includes(m.pattern) ? ` · ≈${Math.ceil(withWaste / ((r.tileSize || m.size) ** 2))} tiles` : "";
    fl.push(line(`${r.name} - ${m.label}${tiles}`, withWaste, "m²", price + (m.id === "grass" || m.id === "gravel" ? 0 : R.tile_labour)));
  }
  add("2. Flooring (incl. wastage)", fl);
  const pt = [];
  for (const r of built) {
    if (r.open) continue;
    let wall = 2 * (r.w + r.l) * r.height;
    for (const o of r.objects) if (isOpening(o)) wall -= o.dims[0] * o.dims[1];
    wall = Math.max(0, wall);
    const fin = FINISHES.find((x) => x.id === r.finish) || FINISHES[0];
    pt.push(line(`${r.name} - primer`, wall, "m²", R.primer), line(`${r.name} - putty`, wall, "m²", R.putty), line(`${r.name} - ${fin.label}`, wall, "m²", prices[`finish.${fin.id}`] ?? fin.price), line(`${r.name} - ceiling paint`, r.w * r.l, "m²", R.ceiling_paint));
  }
  add("3. Painting", pt);
  const dw = [];
  for (const r of rooms) for (const o of r.objects) if (isOpening(o)) dw.push(line(`${r.name} - ${o.name}`, 1, "nos", priceOf(o.key, prices) + (o.type === "door" ? R.door_fit : R.window_fit)));
  add("4. Doors & windows (supply + fitting)", dw);
  let sw = 0, so = 0, lp = 0;
  for (const r of built) { lp += r.objects.filter((o) => ["light", "fan", "chandelier"].includes(o.type)).length + Math.ceil((r.w * r.l) / 8); sw += 2 + Math.ceil((r.w * r.l) / 10); so += SOCKETS[r.type] ?? 3; }
  add("5. Electrical (estimated points)", [line("Light & fan points", lp, "pts", R.wire_point), line("Switch points", sw, "pts", R.wire_point + R.switch), line("Socket points", so, "pts", R.wire_point + R.socket), line("Distribution board & MCBs", scene.floors.length, "floors", R.db)]);
  let fx = 0; const names = {};
  for (const r of rooms) for (const o of r.objects) if (FIXTURES.has(o.type)) { fx++; names[o.type] = (names[o.type] || 0) + 1; }
  add("6. Plumbing (pipes & fittings per fixture)", Object.entries(names).map(([t, c]) => line(`${TYPES[t].label} - water/drain connection`, c, "nos", R.plumb_point)));
  const byItem = {};
  for (const r of rooms) for (const o of r.objects) {
    if (isOpening(o)) continue;
    const p = priceOf(o.key, prices); if (p <= 0) continue;
    byItem[o.key] = byItem[o.key] || { name: o.name, label: TYPES[o.type]?.label || o.type, n: 0, p };
    byItem[o.key].n++;
  }
  const furn = Object.values(byItem).sort((a, b) => b.p * b.n - a.p * a.n).map((x) => line(`${x.name} (${x.label})`, x.n, "nos", x.p));
  furn.push(line("Furniture installation & delivery", 1, "lot", furn.reduce((s, l) => s + l.amount, 0) * R.install_pct));
  add("7. Furniture, fixtures & appliances", furn);
  const subtotal = sections.reduce((s, x) => s + x.total, 0), contingency = subtotal * R.contingency, gst = (subtotal + contingency) * R.gst;
  return { sections, subtotal, contingency, gst, grand: subtotal + contingency + gst, area, rates: R, points: lp + sw + so, fixtures: fx, grade };
}

export function boqToCsv(b) {
  const rows = [["Section", "Description", "Qty", "Unit", "Rate (INR)", "Amount (INR)"]];
  for (const s of b.sections) { for (const l of s.lines) rows.push([s.name, l.desc, l.qty, l.unit, Math.round(l.rate), l.amount]); rows.push([s.name, "Section total", "", "", "", Math.round(s.total)]); }
  rows.push([], ["", "Subtotal", "", "", "", Math.round(b.subtotal)], ["", `Contingency (${Math.round(b.rates.contingency * 100)}%)`, "", "", "", Math.round(b.contingency)], ["", `GST (${Math.round(b.rates.gst * 100)}%)`, "", "", "", Math.round(b.gst)], ["", "GRAND TOTAL", "", "", "", Math.round(b.grand)]);
  return rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
}
