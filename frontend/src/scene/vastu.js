// Optional Vastu Shastra guidance. These are traditional rules of thumb, NOT scientific or structural advice.
const ZONES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const RULES = {
  kitchen: { best: ["SE"], ok: ["NW", "E"], avoid: ["NE", "SW", "N"] }, bedroom: { best: ["SW", "S", "W"], ok: ["NW", "SE"], avoid: ["NE"] },
  master: { best: ["SW"], ok: ["S", "W"], avoid: ["NE", "SE"] }, kids: { best: ["W", "NW"], ok: ["N", "E"], avoid: ["SW"] },
  living: { best: ["N", "NE", "E"], ok: ["NW", "W"], avoid: ["SW"] }, dining: { best: ["W", "E"], ok: ["N", "SE"], avoid: ["SW"] },
  bathroom: { best: ["NW", "W"], ok: ["S", "SE"], avoid: ["NE", "SW"] }, study: { best: ["W", "N", "NE"], ok: ["E", "NW"], avoid: ["SW", "S"] },
  hall: { best: ["N", "NE", "E"], ok: ["W"], avoid: [] }, balcony: { best: ["N", "E", "NE"], ok: ["NW", "W"], avoid: ["SW"] },
};
const SUGGEST = { kitchen: "south-east (fire corner)", bedroom: "south-west", master: "south-west", kids: "west or north-west", living: "north, north-east or east", dining: "west or east", bathroom: "north-west or west", study: "west, north or north-east", hall: "north or east", balcony: "north or east" };

export function zoneOf(dx, dz, north = 0) {
  if (Math.hypot(dx, dz) < 0.4) return "C";
  const compass = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360 + north) % 360; // 0 = plan north
  return ZONES[Math.round(compass / 45) % 8];
}

export function analyzeVastu(scene, north = 0) {
  const all = scene.floors.flatMap((f) => f.rooms.map((r) => ({ ...r, floor: f.name })));
  const habit = all.filter((r) => !["garden", "terrace"].includes(r.type));
  if (!habit.length) return { score: 100, rooms: [] };
  const cx = habit.reduce((s, r) => s + r.x, 0) / habit.length, cz = habit.reduce((s, r) => s + r.z, 0) / habit.length;
  const rooms = [];
  for (const r of habit) {
    const kind = r.type === "bedroom" && /master/i.test(r.name) ? "master" : r.type;
    const rule = RULES[kind];
    if (!rule) continue;
    const zone = zoneOf(r.x - cx, r.z - cz, north);
    const lvl = rule.best.includes(zone) ? "best" : rule.ok.includes(zone) ? "ok" : rule.avoid.includes(zone) ? "avoid" : zone === "C" && ["kitchen", "bathroom"].includes(kind) ? "avoid" : "neutral";
    rooms.push({ roomId: r.id, name: r.name, floor: r.floor, zone, level: lvl, score: { best: 100, ok: 75, neutral: 50, avoid: 10 }[lvl], advice: lvl === "best" || lvl === "ok" ? "Well placed" : `Traditionally preferred in the ${SUGGEST[kind]}.` });
  }
  return { score: rooms.length ? Math.round(rooms.reduce((s, r) => s + r.score, 0) / rooms.length) : 100, rooms, centre: { x: cx, z: cz } };
}
