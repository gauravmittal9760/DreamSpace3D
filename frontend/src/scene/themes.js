import { FLOOR_BY_ID } from "./catalog.js";

// Interior theme generator: restyles walls, floors, accent walls and furniture colours for the whole project.
export const THEMES = [
  { id: "modern", label: "Modern", icon: "🏙️", exterior: "#d9dde3", walls: { living: "#e5e7eb", bedroom: "#cfd4da", kitchen: "#f3f4f6", dining: "#e5e7eb", bathroom: "#dbe4ea", study: "#d1d5db", kids: "#dbeafe", hall: "#f3f4f6", balcony: "#e5e7eb" }, accent: "#374151", floors: { living: "vitrified", bedroom: "laminate", kitchen: "porcelain", dining: "vitrified", bathroom: "antiskid", study: "laminate", hall: "porcelain" }, wood: ["#4b5563", "#6b7280", "#1f2937"], fabric: ["#374151", "#9ca3af", "#e5e7eb"], metal: "#9ca3af" },
  { id: "minimal", label: "Minimalist", icon: "🤍", exterior: "#f3f0ea", walls: { living: "#faf7f2", bedroom: "#f5f1ea", kitchen: "#ffffff", dining: "#faf7f2", bathroom: "#f1f5f9", study: "#f5f5f4", kids: "#fef9ef", hall: "#ffffff", balcony: "#faf7f2" }, accent: "#d6cfc2", floors: { living: "oak", bedroom: "oak", kitchen: "ceramic", dining: "oak", bathroom: "antiskid", study: "oak", hall: "ceramic" }, wood: ["#d8c3a5", "#e7d8c0", "#cdb68f"], fabric: ["#f5f5f4", "#e7e5e4", "#d6d3d1"], metal: "#d6d3d1" },
  { id: "industrial", label: "Industrial", icon: "🏭", exterior: "#8b7e74", walls: { living: "#9ca3af", bedroom: "#6b7280", kitchen: "#d1d5db", dining: "#9ca3af", bathroom: "#cfd4da", study: "#4b5563", kids: "#9ca3af", hall: "#cfd4da", balcony: "#9ca3af" }, accent: "#b45f3c", floors: { living: "cement", bedroom: "cement", kitchen: "slate", dining: "cement", bathroom: "slate", study: "cement", hall: "cement" }, wood: ["#3f3f46", "#52525b", "#27272a"], fabric: ["#3f3f46", "#78716c", "#a8a29e"], metal: "#27272a" },
  { id: "traditional", label: "Traditional", icon: "🏛️", exterior: "#e9d8b8", walls: { living: "#f1e2c6", bedroom: "#ecd9b5", kitchen: "#f7ecd3", dining: "#ead7ae", bathroom: "#f2e8d5", study: "#e7d3a8", kids: "#f6e3c3", hall: "#f1e2c6", balcony: "#f1e2c6" }, accent: "#8b2e2e", floors: { living: "marble_g", bedroom: "teak", kitchen: "ceramic", dining: "marble_g", bathroom: "antiskid", study: "teak", hall: "marble_w" }, wood: ["#6b3f22", "#7a4a2b", "#4e2e1a"], fabric: ["#8b2e2e", "#b08968", "#d4af37"], metal: "#b8860b" },
  { id: "boho", label: "Boho", icon: "🌿", exterior: "#e9d3b9", walls: { living: "#f2dcc2", bedroom: "#e8c9a5", kitchen: "#f8ecda", dining: "#efd6b3", bathroom: "#f3e6d3", study: "#dcc3a1", kids: "#f9e2c3", hall: "#f2dcc2", balcony: "#efd6b3" }, accent: "#c1623a", floors: { living: "terrazzo", bedroom: "oak", kitchen: "hex", dining: "terrazzo", bathroom: "antiskid", study: "oak", hall: "terrazzo" }, wood: ["#a47a52", "#b88a5e", "#8b6b44"], fabric: ["#c1623a", "#d9a441", "#6b8f71"], metal: "#b8860b" },
  { id: "luxury", label: "Luxury", icon: "👑", exterior: "#e8e4dc", walls: { living: "#1f2a44", bedroom: "#2b2f4a", kitchen: "#f1f1f0", dining: "#1f2a44", bathroom: "#e5e7eb", study: "#2a2f45", kids: "#dbeafe", hall: "#f1efe8", balcony: "#e8e4dc" }, accent: "#d4af37", floors: { living: "marble_w", bedroom: "walnut", kitchen: "marble_b", dining: "marble_w", bathroom: "marble_g", study: "walnut", hall: "marble_w" }, wood: ["#3d2b1f", "#2a1d14", "#5a3d2b"], fabric: ["#1f2a44", "#d4af37", "#e5e7eb"], metal: "#d4af37" },
];
const WOOD = new Set(["bed", "wardrobe", "bedside", "dresser", "table", "desk", "bookshelf", "cabinet", "tv_unit", "coffee_table", "shoe_rack", "kitchen_counter", "kitchen_island", "vanity", "chair", "bench", "wall_cabinet", "door"]);
const FABRIC = new Set(["sofa", "rug", "curtain"]);
const METAL = new Set(["lamp", "railing", "gate", "lamp_post"]);
const KEEP = new Set(["plant", "tree", "bush", "pool", "fountain", "window", "tv", "fridge", "ac", "toilet", "washbasin", "bathtub", "shower", "mirror", "stairs", "painting", "clock", "vase"]);
const OUT = ["garden", "terrace"];

export function applyTheme(scene, theme) {
  let n = 0;
  const pick = (arr) => arr[n++ % arr.length];
  return {
    ...scene, exteriorColor: theme.exterior,
    floors: scene.floors.map((f) => ({ ...f, rooms: f.rooms.map((r) => {
      const outdoor = OUT.includes(r.type);
      const matId = theme.floors[r.type], fm = FLOOR_BY_ID[matId];
      return {
        ...r, ...(outdoor ? {} : { wallColor: theme.walls[r.type] || theme.walls.living, walls: ["living", "bedroom", "dining"].includes(r.type) ? { N: { color: theme.accent } } : {} }),
        ...(fm ? { floorMat: matId, floorColor: fm.base, tileSize: fm.size } : {}),
        objects: r.objects.map((o) => {
          if (KEEP.has(o.type)) return o;
          if (WOOD.has(o.type)) return { ...o, color: pick(theme.wood) };
          if (FABRIC.has(o.type)) return { ...o, color: pick(theme.fabric) };
          if (METAL.has(o.type)) return { ...o, color: theme.metal };
          return o;
        }),
      };
    }) })),
  };
}
