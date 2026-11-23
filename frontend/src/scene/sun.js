// Solar geometry + simple direct-sunlight analysis. Compass azimuth: 0 = North, 90 = East. Plan axes: -Z = plan north, +X = plan east.
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;

export function dayOfYear(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); }

/** hour = local SOLAR time (12 = sun due south/north). Returns { altitude, azimuth } in degrees. */
export function sunAt(doy, hour, lat) {
  const decl = rad(23.45) * Math.sin(rad((360 / 365) * (284 + doy)));
  const H = rad(15 * (hour - 12)), phi = rad(lat);
  const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const azS = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)); // from south, west positive
  return { altitude: deg(alt), azimuth: (deg(azS) + 180 + 360) % 360 };
}

/** unit vector pointing TOWARDS the sun in scene axes, given the plan's north offset (deg, clockwise). */
export function sunVector(sun, north = 0) {
  const a = rad(sun.azimuth - north), h = rad(Math.max(0, sun.altitude));
  return [Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h)];
}

export const WALL_NORMAL = { N: 0, E: 90, S: 180, W: 270 };
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/** Direct sun hours for each window of every room between 06:00 and 18:00 solar time. */
export function analyzeSun(scene, { lat = 28.6, doy = 172, north = 0 } = {}) {
  const out = [], step = 0.25, samples = [];
  for (let h = 6; h <= 18; h += step) { const s = sunAt(doy, h, lat); if (s.altitude > 5) samples.push({ h, ...s }); }
  for (const f of scene.floors) for (const r of f.rooms) {
    const wins = r.objects.filter((o) => (o.type === "window" || (o.type === "door" && /glass|french/.test(o.key || ""))) && !o.hidden);
    const area = wins.reduce((s, w) => s + w.dims[0] * w.dims[1], 0);
    const perWall = {}, lit = new Set();
    for (const w of wins) {
      const normal = (WALL_NORMAL[w.wall || "S"] + north) % 360;
      let hrs = 0;
      for (const s of samples) if (angDiff(s.azimuth, normal) < 82) { hrs += step; lit.add(s.h); }
      perWall[w.wall || "S"] = Math.max(perWall[w.wall || "S"] || 0, hrs);
    }
    const hours = lit.size * step, ratio = (r.w * r.l) > 0 ? area / (r.w * r.l) : 0, outdoor = ["garden", "terrace", "balcony"].includes(r.type);
    out.push({ roomId: r.id, name: r.name, floor: f.name, hours, windows: wins.length, windowArea: area, ratio, perWall, outdoor,
      verdict: outdoor ? "open" : !wins.length ? "dark" : hours >= 4 && ratio >= 0.1 ? "bright" : hours >= 2 ? "ok" : "dim" });
  }
  return { rooms: out, samples: samples.length, firstLight: samples[0]?.h, lastLight: samples[samples.length - 1]?.h, noon: sunAt(doy, 12, lat) };
}

export const SEASONS = [{ id: "summer", label: "Summer solstice", doy: 172 }, { id: "equinox", label: "Equinox", doy: 80 }, { id: "winter", label: "Winter solstice", doy: 355 }];
export const fmtHour = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`; };
