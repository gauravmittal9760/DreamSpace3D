// DreamSpace catalogue. All prices are INR (default values - the admin can override any price from the panel).
// Item key format:  "<type>.<variantId>"  e.g. "wardrobe.w07"

export const CATEGORIES = [
  { id: "bedroom", label: "Bedroom", icon: "🛏️" },
  { id: "living", label: "Living", icon: "🛋️" },
  { id: "dining", label: "Dining & Work", icon: "🍽️" },
  { id: "storage", label: "Storage", icon: "🗄️" },
  { id: "electric", label: "Electronics & Lights", icon: "💡" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bath", label: "Bathroom", icon: "🛁" },
  { id: "decor", label: "Decor", icon: "🪴" },
  { id: "arch", label: "Doors & Windows", icon: "🚪" },
  { id: "outdoor", label: "Garden & Outdoor", icon: "🌳" },
  { id: "basic", label: "Basic Shapes", icon: "🧊" },
];

// type -> label, category, default dims [w,h,d] (metres), default elevation y, flags
//  floor:   stands on the floor (takes part in AI arrangement)      wall: door/window (cut into a wall)
//  hang:    hangs from ceiling (y is measured from the ceiling down)
export const TYPES = {
  bed: { label: "Bed", cat: "bedroom", dims: [1.6, 0.6, 2.05], floor: true },
  bedside: { label: "Bedside Table", cat: "bedroom", dims: [0.5, 0.5, 0.42], floor: true },
  wardrobe: { label: "Wardrobe", cat: "bedroom", dims: [1.6, 2.2, 0.6], floor: true },
  dresser: { label: "Dresser", cat: "bedroom", dims: [1.2, 0.85, 0.48], floor: true },
  sofa: { label: "Sofa", cat: "living", dims: [2.1, 0.85, 0.9], floor: true },
  coffee_table: { label: "Coffee Table", cat: "living", dims: [1.1, 0.42, 0.65], floor: true },
  tv_unit: { label: "TV Unit", cat: "living", dims: [1.8, 0.5, 0.4], floor: true },
  tv: { label: "Television", cat: "electric", dims: [1.23, 0.72, 0.08], y: 1.0 },
  chair: { label: "Chair", cat: "dining", dims: [0.5, 0.9, 0.52], floor: true },
  table: { label: "Dining Table", cat: "dining", dims: [1.5, 0.76, 0.9], floor: true },
  desk: { label: "Study Desk", cat: "dining", dims: [1.3, 0.76, 0.65], floor: true },
  bookshelf: { label: "Bookshelf", cat: "storage", dims: [1.0, 1.9, 0.32], floor: true },
  cabinet: { label: "Cabinet", cat: "storage", dims: [1.2, 0.9, 0.45], floor: true },
  shoe_rack: { label: "Shoe Rack", cat: "storage", dims: [0.8, 1.0, 0.32], floor: true },
  fan: { label: "Ceiling Fan", cat: "electric", dims: [1.3, 0.35, 1.3], hang: true, y: 0 },
  light: { label: "Ceiling Light", cat: "electric", dims: [0.5, 0.12, 0.5], hang: true, y: 0 },
  chandelier: { label: "Chandelier", cat: "electric", dims: [0.8, 0.7, 0.8], hang: true, y: 0 },
  lamp: { label: "Lamp", cat: "electric", dims: [0.35, 1.5, 0.35], floor: true },
  ac: { label: "Air Conditioner", cat: "electric", dims: [1.0, 0.3, 0.22], y: 2.15 },
  fridge: { label: "Refrigerator", cat: "kitchen", dims: [0.7, 1.7, 0.7], floor: true },
  washing_machine: { label: "Washing Machine", cat: "kitchen", dims: [0.6, 0.85, 0.6], floor: true },
  microwave: { label: "Microwave", cat: "kitchen", dims: [0.5, 0.3, 0.38], y: 0.9 },
  geyser: { label: "Water Heater", cat: "bath", dims: [0.4, 0.55, 0.4], y: 1.8 },
  kitchen_counter: { label: "Kitchen Counter", cat: "kitchen", dims: [2.4, 0.9, 0.62], floor: true },
  kitchen_island: { label: "Kitchen Island", cat: "kitchen", dims: [1.8, 0.92, 0.9], floor: true },
  kitchen_sink: { label: "Kitchen Sink", cat: "kitchen", dims: [1.1, 0.9, 0.6], floor: true },
  hob: { label: "Hob / Stove", cat: "kitchen", dims: [0.6, 0.08, 0.5], y: 0.9 },
  chimney: { label: "Chimney", cat: "kitchen", dims: [0.9, 0.9, 0.5], y: 1.6 },
  wall_cabinet: { label: "Wall Cabinet", cat: "kitchen", dims: [1.2, 0.7, 0.33], y: 1.5 },
  bathtub: { label: "Bathtub", cat: "bath", dims: [1.7, 0.6, 0.78], floor: true },
  toilet: { label: "Toilet", cat: "bath", dims: [0.4, 0.75, 0.7], floor: true },
  washbasin: { label: "Wash Basin", cat: "bath", dims: [0.6, 0.85, 0.45], floor: true },
  shower: { label: "Shower", cat: "bath", dims: [0.9, 2.1, 0.9], floor: true },
  mirror: { label: "Mirror", cat: "bath", dims: [0.7, 0.9, 0.04], y: 1.2 },
  vanity: { label: "Vanity Unit", cat: "bath", dims: [1.0, 0.85, 0.5], floor: true },
  plant: { label: "Plant", cat: "decor", dims: [0.5, 1.1, 0.5], floor: true },
  rug: { label: "Rug", cat: "decor", dims: [2.0, 0.02, 1.4], floor: true },
  curtain: { label: "Curtain", cat: "decor", dims: [1.6, 2.4, 0.12], y: 0.05 },
  painting: { label: "Wall Art", cat: "decor", dims: [0.9, 0.65, 0.04], y: 1.5 },
  clock: { label: "Wall Clock", cat: "decor", dims: [0.4, 0.4, 0.05], y: 2.0 },
  vase: { label: "Vase", cat: "decor", dims: [0.25, 0.45, 0.25], y: 0 },
  door: { label: "Door", cat: "arch", dims: [0.95, 2.1, 0.14], wall: true },
  window: { label: "Window", cat: "arch", dims: [1.4, 1.2, 0.14], y: 0.9, wall: true },
  stairs: { label: "Staircase", cat: "arch", dims: [1.1, 3.0, 3.6], floor: true },
  railing: { label: "Railing", cat: "arch", dims: [2.0, 1.0, 0.08], floor: true },
  pillar: { label: "Pillar", cat: "arch", dims: [0.3, 3.0, 0.3], floor: true },
  tree: { label: "Tree", cat: "outdoor", dims: [2.4, 4.0, 2.4], floor: true },
  bush: { label: "Bush / Hedge", cat: "outdoor", dims: [1.0, 0.8, 1.0], floor: true },
  bench: { label: "Garden Bench", cat: "outdoor", dims: [1.5, 0.85, 0.55], floor: true },
  swing: { label: "Swing", cat: "outdoor", dims: [1.6, 2.1, 1.1], floor: true },
  fountain: { label: "Fountain", cat: "outdoor", dims: [1.4, 1.3, 1.4], floor: true },
  pool: { label: "Swimming Pool", cat: "outdoor", dims: [5, 0.12, 2.8], floor: true },
  fence: { label: "Fence", cat: "outdoor", dims: [2.0, 1.0, 0.08], floor: true },
  gate: { label: "Gate", cat: "outdoor", dims: [3.0, 1.5, 0.12], floor: true },
  pergola: { label: "Pergola", cat: "outdoor", dims: [3.0, 2.6, 3.0], floor: true },
  lamp_post: { label: "Garden Light", cat: "outdoor", dims: [0.3, 2.6, 0.3], floor: true },
  sunbed: { label: "Sun Lounger", cat: "outdoor", dims: [0.7, 0.4, 1.9], floor: true },
  cube: { label: "Cube", cat: "basic", dims: [1, 1, 1], floor: true },
  sphere: { label: "Sphere", cat: "basic", dims: [1, 1, 1], floor: true },
  cylinder: { label: "Cylinder", cat: "basic", dims: [0.8, 1, 0.8], floor: true },
  cone: { label: "Cone", cat: "basic", dims: [0.8, 1, 0.8], floor: true },
};

// Variant row: [id, name, priceINR, params, dims?]   (params are read by the 3D model of that type)
const rows = {
  wardrobe: [
    ["w01", "Classic 2-Door Hinged", 14500, { kind: "hinged", doors: 2, c: "#a47a52" }, [1.0, 2.1, 0.58]],
    ["w02", "3-Door Hinged", 21000, { kind: "hinged", doors: 3, c: "#8b5e3c" }, [1.5, 2.2, 0.6]],
    ["w03", "4-Door Hinged + Loft", 29500, { kind: "hinged", doors: 4, loft: true, c: "#b08968" }, [2.0, 2.6, 0.6]],
    ["w04", "2-Door Sliding", 19500, { kind: "sliding", doors: 2, c: "#d9d2c5" }, [1.5, 2.2, 0.62]],
    ["w05", "3-Door Sliding Mirror", 28000, { kind: "mirror", doors: 3, c: "#e8e3da" }, [2.1, 2.3, 0.62]],
    ["w06", "Full Mirror 2-Door", 22500, { kind: "mirror", doors: 2, hinged: true, c: "#cfc6b8" }, [1.2, 2.2, 0.58]],
    ["w07", "Glass-Front Display", 24000, { kind: "glass", doors: 2, c: "#2f2a28" }, [1.3, 2.1, 0.5]],
    ["w08", "Louvre Shutter 3-Door", 23500, { kind: "louvre", doors: 3, c: "#c8a77c" }, [1.6, 2.2, 0.58]],
    ["w09", "Open Shelf Unit", 9500, { kind: "open", doors: 0, c: "#c9a27a" }, [1.2, 2.0, 0.45]],
    ["w10", "Corner L-Wardrobe", 38000, { kind: "corner", doors: 2, c: "#7a5a43" }, [1.8, 2.3, 1.8]],
    ["w11", "Walk-in Frame", 45000, { kind: "walkin", doors: 0, c: "#3b3b3f" }, [2.4, 2.4, 0.6]],
    ["w12", "Handleless Matte 3-Door", 31000, { kind: "flat", doors: 3, c: "#4a4f57", handle: "none" }, [1.6, 2.4, 0.6]],
    ["w13", "Kids Wardrobe", 11500, { kind: "kids", doors: 2, c: "#8fd3f4" }, [0.95, 1.6, 0.5]],
    ["w14", "Single-Door Compact", 8500, { kind: "hinged", doors: 1, c: "#b99872" }, [0.6, 1.9, 0.55]],
    ["w15", "Two-Tone Sliding 4-Door", 36000, { kind: "sliding", doors: 4, two: true, c: "#f2efe9" }, [2.4, 2.4, 0.62]],
    ["w16", "Wardrobe + Dresser Combo", 34000, { kind: "combo", doors: 2, c: "#6e4b36" }, [1.9, 2.2, 0.6]],
    ["w17", "Fluted Panel 3-Door", 33500, { kind: "fluted", doors: 3, c: "#9a7b5b" }, [1.6, 2.4, 0.6]],
    ["w18", "Metal Open Rail", 7500, { kind: "rail", doors: 0, c: "#2b2b2e" }, [1.4, 1.9, 0.5]],
  ],
  bed: [
    ["b01", "Single Bed", 9500, { size: "single", head: "panel", c: "#a47a52" }, [1.0, 0.8, 2.0]],
    ["b02", "Double Bed", 16500, { size: "double", head: "panel", c: "#8b5e3c" }, [1.5, 0.9, 2.05]],
    ["b03", "Queen Bed", 22000, { size: "queen", head: "tall", c: "#7a5a43" }, [1.65, 1.1, 2.1]],
    ["b04", "King Bed Tufted", 34000, { size: "king", head: "tufted", c: "#5b6c8f" }, [1.9, 1.25, 2.15]],
    ["b05", "Storage Bed", 26500, { size: "queen", head: "slat", storage: true, c: "#b08968" }, [1.65, 1.0, 2.1]],
    ["b06", "Bunk Bed", 24500, { size: "single", bunk: true, c: "#6b4f3a" }, [1.05, 1.8, 2.05]],
    ["b07", "Four-Poster Bed", 42000, { size: "king", head: "tall", posts: true, c: "#3d2f2a" }, [1.95, 2.0, 2.15]],
    ["b08", "Platform Low Bed", 19500, { size: "queen", head: "none", low: true, c: "#cfc6b8" }, [1.7, 0.65, 2.1]],
    ["b09", "Day Bed", 15500, { size: "single", head: "slat", day: true, c: "#e0d7c8" }, [1.0, 0.8, 2.0]],
    ["b10", "Kids Bed", 12500, { size: "single", head: "panel", kids: true, c: "#ff8fab" }, [0.9, 0.85, 1.8]],
    ["b11", "Baby Cot", 8500, { size: "cot", c: "#f4eee2" }, [0.7, 0.95, 1.25]],
    ["b12", "Round Designer Bed", 58000, { size: "round", c: "#8b5cf6" }, [2.2, 0.9, 2.2]],
  ],
  bedside: [
    ["n01", "Wood 1-Drawer", 3200, { drawers: 1, c: "#a47a52" }],
    ["n02", "Wood 2-Drawer", 4500, { drawers: 2, c: "#8b5e3c" }],
    ["n03", "Floating Shelf", 2800, { drawers: 1, float: true, c: "#cfc6b8" }],
    ["n04", "Round Table", 3000, { round: true, c: "#2f2a28" }],
    ["n05", "Open Cube", 2400, { open: true, c: "#e0d7c8" }],
  ],
  dresser: [
    ["d01", "Dresser with Mirror", 14500, { drawers: 4, mirror: true, c: "#8b5e3c" }, [1.1, 1.6, 0.45]],
    ["d02", "6-Drawer Chest", 16800, { drawers: 6, c: "#a47a52" }, [1.3, 0.9, 0.48]],
    ["d03", "Tall Chest", 12500, { drawers: 5, tall: true, c: "#d9d2c5" }, [0.7, 1.3, 0.45]],
    ["d04", "Vanity Table", 11800, { drawers: 2, mirror: true, c: "#f2efe9" }, [1.0, 1.5, 0.42]],
  ],
  sofa: [
    ["s01", "2-Seater Sofa", 17500, { seats: 2, c: "#5b7083" }, [1.6, 0.85, 0.88]],
    ["s02", "3-Seater Sofa", 24500, { seats: 3, c: "#6d6a65" }, [2.1, 0.85, 0.9]],
    ["s03", "L-Shape Sofa", 42000, { kind: "L", c: "#364152" }, [2.8, 0.85, 1.9]],
    ["s04", "Chesterfield", 48000, { seats: 3, tufted: true, c: "#7a3b2e" }, [2.2, 0.8, 0.95]],
    ["s05", "Recliner", 21500, { seats: 1, recline: true, c: "#4f3b30" }, [0.95, 1.05, 0.95]],
    ["s06", "Love Seat", 14500, { seats: 2, arms: "round", c: "#c97b84" }, [1.4, 0.8, 0.8]],
    ["s07", "U-Shape Sectional", 68000, { kind: "U", c: "#8a8f98" }, [3.0, 0.85, 2.3]],
    ["s08", "Corner Sofa", 36000, { kind: "L", small: true, c: "#a68a64" }, [2.3, 0.85, 1.6]],
    ["s09", "Bean Bag", 3800, { kind: "bean", c: "#ff7b54" }, [0.9, 0.7, 0.9]],
    ["s10", "Diwan (Floor Seating)", 12500, { kind: "diwan", c: "#a05a2c" }, [2.0, 0.55, 0.9]],
  ],
  coffee_table: [
    ["c01", "Rectangular Wood", 6500, { shape: "rect", c: "#8b5e3c" }],
    ["c02", "Round Marble", 9800, { shape: "round", top: "marble", c: "#2b2b2e" }, [0.9, 0.42, 0.9]],
    ["c03", "Glass Top", 7600, { shape: "rect", top: "glass", c: "#1f2937" }],
    ["c04", "Nesting Set", 8200, { shape: "nest", c: "#c9a27a" }, [0.8, 0.45, 0.6]],
    ["c05", "Low Japanese", 5200, { shape: "rect", low: true, c: "#a47a52" }, [1.0, 0.3, 0.6]],
    ["c06", "Live-edge Slab", 15500, { shape: "slab", c: "#6b4f3a" }, [1.2, 0.4, 0.6]],
  ],
  tv_unit: [
    ["t01", "Modern Floating Unit", 11500, { kind: "float", c: "#6e4b36" }, [1.8, 0.4, 0.38]],
    ["t02", "Low Console", 13200, { kind: "low", c: "#d9d2c5" }, [1.6, 0.5, 0.4]],
    ["t03", "Wall Panel Unit", 28500, { kind: "wall", c: "#4a4f57" }, [2.6, 2.3, 0.4]],
    ["t04", "Corner TV Stand", 8800, { kind: "low", c: "#3b3b3f" }, [1.1, 0.6, 0.5]],
    ["t05", "Entertainment Wall", 42000, { kind: "wall", shelves: true, c: "#7a5a43" }, [3.0, 2.4, 0.42]],
    ["t06", "Open Rack", 7900, { kind: "open", c: "#c9a27a" }, [1.4, 0.55, 0.38]],
  ],
  tv: [
    ["v32", '32" LED', 14000, { inch: 32 }, [0.72, 0.43, 0.06]],
    ["v43", '43" Smart', 26000, { inch: 43 }, [0.96, 0.56, 0.07]],
    ["v55", '55" 4K', 42000, { inch: 55 }, [1.23, 0.72, 0.07]],
    ["v65", '65" OLED', 95000, { inch: 65 }, [1.45, 0.84, 0.06]],
    ["v75", '75" QLED', 140000, { inch: 75 }, [1.67, 0.96, 0.06]],
    ["vcv", '55" Curved', 52000, { inch: 55, curved: true }, [1.23, 0.72, 0.1]],
    ["vpr", "Projector Screen", 18000, { screen: true }, [2.4, 1.4, 0.06]],
  ],
  chair: [
    ["h01", "Dining Chair", 3200, { kind: "dining", c: "#8b5e3c" }],
    ["h02", "Office Chair", 7800, { kind: "office", c: "#2f3640" }, [0.62, 1.1, 0.62]],
    ["h03", "Armchair", 11500, { kind: "arm", c: "#4a6fa5" }, [0.8, 0.85, 0.82]],
    ["h04", "Accent Chair", 9200, { kind: "accent", c: "#e0a458" }, [0.7, 0.85, 0.7]],
    ["h05", "Bar Stool", 3800, { kind: "bar", c: "#2f2a28" }, [0.4, 1.0, 0.4]],
    ["h06", "Rocking Chair", 12800, { kind: "rock", c: "#8b5e3c" }, [0.65, 1.0, 0.95]],
    ["h07", "Stool", 1500, { kind: "stool", c: "#c9a27a" }, [0.38, 0.45, 0.38]],
    ["h08", "Gaming Chair", 14500, { kind: "gaming", c: "#c1121f" }, [0.7, 1.3, 0.7]],
    ["h09", "Cushioned Dining", 4600, { kind: "dining", cushion: true, c: "#cfc6b8" }],
    ["h10", "Wooden Lounge", 13500, { kind: "lounge", c: "#a47a52" }, [0.7, 0.8, 0.9]],
  ],
  table: [
    ["t41", "4-Seater Rectangle", 14500, { shape: "rect", c: "#8b5e3c" }, [1.2, 0.76, 0.8]],
    ["t42", "6-Seater Rectangle", 21500, { shape: "rect", c: "#7a5a43" }, [1.6, 0.76, 0.9]],
    ["t43", "8-Seater Rectangle", 29500, { shape: "rect", c: "#6b4f3a" }, [2.2, 0.76, 1.0]],
    ["t44", "Round 4-Seater", 13500, { shape: "round", c: "#a47a52" }, [1.0, 0.76, 1.0]],
    ["t45", "Round 6-Seater", 19800, { shape: "round", c: "#8b5e3c" }, [1.4, 0.76, 1.4]],
    ["t46", "Glass-Top Dining", 24500, { shape: "rect", top: "glass", c: "#1f2937" }, [1.6, 0.76, 0.9]],
    ["t47", "Marble-Top Dining", 38000, { shape: "rect", top: "marble", c: "#2b2b2e" }, [1.8, 0.76, 0.95]],
    ["t48", "Bar Counter Table", 16500, { shape: "rect", bar: true, c: "#3b3b3f" }, [1.4, 1.05, 0.6]],
  ],
  desk: [
    ["k01", "Study Desk", 8900, { kind: "plain", c: "#a47a52" }],
    ["k02", "L-Shaped Desk", 17500, { kind: "L", c: "#6e4b36" }, [1.7, 0.76, 1.5]],
    ["k03", "Standing Desk", 21500, { kind: "stand", c: "#d9d2c5" }, [1.4, 1.05, 0.7]],
    ["k04", "Writing Table + Drawers", 12500, { kind: "drawers", c: "#8b5e3c" }, [1.2, 0.76, 0.6]],
    ["k05", "Computer Desk", 9800, { kind: "shelf", c: "#3b3b3f" }, [1.2, 1.3, 0.6]],
    ["k06", "Floating Wall Desk", 6500, { kind: "float", c: "#cfc6b8" }, [1.0, 0.76, 0.45]],
  ],
  bookshelf: [
    ["l01", "5-Tier Open", 7500, { tiers: 5, c: "#8b5e3c" }],
    ["l02", "Ladder Shelf", 6200, { tiers: 5, ladder: true, c: "#c9a27a" }, [0.7, 1.8, 0.4]],
    ["l03", "Wide Library Wall", 21500, { tiers: 6, c: "#6e4b36" }, [2.0, 2.3, 0.35]],
    ["l04", "Cube Organiser", 5400, { tiers: 3, cubes: true, c: "#e0d7c8" }, [0.9, 1.1, 0.33]],
    ["l05", "Glass-Door Bookcase", 17500, { tiers: 4, glass: true, c: "#3d2f2a" }, [1.0, 1.9, 0.38]],
    ["l06", "Industrial Metal", 8600, { tiers: 5, metal: true, c: "#2b2b2e" }, [1.0, 1.8, 0.35]],
  ],
  cabinet: [
    ["g01", "Sideboard 3-Door", 15800, { doors: 3, c: "#8b5e3c" }, [1.6, 0.85, 0.42]],
    ["g02", "Crockery Unit", 24500, { doors: 2, glass: true, tall: true, c: "#6e4b36" }, [1.0, 1.9, 0.42]],
    ["g03", "Storage Cabinet", 11800, { doors: 2, c: "#d9d2c5" }, [0.9, 1.2, 0.4]],
    ["g04", "Pooja Unit", 19500, { doors: 2, pooja: true, c: "#b08968" }, [0.9, 1.6, 0.4]],
    ["g05", "Bar Cabinet", 22800, { doors: 2, glass: true, c: "#2f2a28" }, [0.9, 1.5, 0.45]],
    ["g06", "Low Drawer Chest", 13800, { drawers: 4, c: "#a47a52" }, [1.2, 0.8, 0.45]],
  ],
  shoe_rack: [
    ["r01", "Open Shoe Rack", 3200, { open: true, c: "#a47a52" }],
    ["r02", "Closed Shoe Cabinet", 6800, { doors: 2, c: "#d9d2c5" }],
    ["r03", "Bench with Shoe Storage", 7500, { bench: true, c: "#8b5e3c" }, [1.0, 0.5, 0.35]],
  ],
  fan: [
    ["f01", "3-Blade Standard", 2800, { blades: 3, c: "#f2f2f2" }],
    ["f02", "4-Blade Premium", 4200, { blades: 4, c: "#c9a27a" }],
    ["f03", "5-Blade Decorative", 6500, { blades: 5, c: "#3b3b3f" }, [1.4, 0.35, 1.4]],
    ["f04", "Bladeless", 12500, { blades: 0, c: "#d9d9de" }, [0.6, 0.25, 0.6]],
    ["f05", "Fan with Light", 7200, { blades: 4, light: true, c: "#e8e3da" }],
    ["f06", "Rustic Wooden", 8400, { blades: 4, wood: true, c: "#8b5e3c" }, [1.4, 0.35, 1.4]],
  ],
  light: [
    ["i01", "Round LED Panel", 1200, { kind: "panel", c: "#fffdf2" }],
    ["i02", "Square Panel", 1400, { kind: "square", c: "#fffdf2" }, [0.6, 0.06, 0.6]],
    ["i03", "Pendant Dome", 3600, { kind: "dome", c: "#2f2a28" }, [0.5, 0.45, 0.5]],
    ["i04", "Pendant Cluster", 7800, { kind: "cluster", c: "#e0a458" }, [0.7, 0.8, 0.7]],
    ["i05", "Track Spot Light", 3200, { kind: "track", c: "#2b2b2e" }, [1.2, 0.2, 0.1]],
    ["i06", "Cove Strip Light", 1800, { kind: "strip", c: "#7df9ff" }, [2.0, 0.05, 0.05]],
    ["i07", "Spot Downlight", 600, { kind: "spot", c: "#fffdf2" }, [0.12, 0.08, 0.12]],
    ["i08", "Drum Shade", 4200, { kind: "drum", c: "#e8e3da" }, [0.6, 0.35, 0.6]],
  ],
  chandelier: [
    ["a01", "Crystal Classic", 18500, { arms: 6, tiers: 2, c: "#ffd27d" }],
    ["a02", "Modern Ring", 14500, { ring: true, c: "#f6f1e7" }, [1.0, 0.5, 1.0]],
    ["a03", "Sputnik", 12800, { arms: 10, spiky: true, c: "#c9a27a" }],
    ["a04", "Mini 3-Light", 6500, { arms: 3, tiers: 1, c: "#e0d7c8" }, [0.5, 0.5, 0.5]],
    ["a05", "Grand Cascade", 52000, { arms: 12, tiers: 3, c: "#fff1c9" }, [1.2, 1.4, 1.2]],
    ["a06", "Globe Cluster", 9800, { globes: true, c: "#fffdf2" }, [0.8, 0.9, 0.8]],
  ],
  lamp: [
    ["m01", "Arc Floor Lamp", 6800, { kind: "arc", c: "#2b2b2e" }, [0.7, 1.9, 0.5]],
    ["m02", "Tripod Floor Lamp", 5400, { kind: "tripod", c: "#c9a27a" }],
    ["m03", "Table Lamp", 1800, { kind: "table", c: "#e8e3da" }, [0.28, 0.5, 0.28]],
    ["m04", "Torchiere", 4200, { kind: "torch", c: "#2f2a28" }, [0.3, 1.7, 0.3]],
    ["m05", "Study Desk Lamp", 1500, { kind: "desk", c: "#3b3b3f" }, [0.25, 0.45, 0.3]],
    ["m06", "Paper Lantern", 2400, { kind: "lantern", c: "#fff7e0" }, [0.4, 0.4, 0.4]],
  ],
  ac: [
    ["x01", "1.0 Ton Split", 32000, { kind: "split", c: "#f4f6f8" }, [0.8, 0.28, 0.2]],
    ["x02", "1.5 Ton Split", 42000, { kind: "split", c: "#f4f6f8" }, [1.0, 0.3, 0.22]],
    ["x03", "2.0 Ton Split", 56000, { kind: "split", c: "#f4f6f8" }, [1.1, 0.32, 0.25]],
    ["x04", "Window AC", 29000, { kind: "window", c: "#d9d9de" }, [0.65, 0.4, 0.5]],
    ["x05", "Ceiling Cassette", 78000, { kind: "cassette", c: "#f4f6f8" }, [0.8, 0.2, 0.8]],
  ],
  fridge: [
    ["y01", "Single Door 190L", 16500, { kind: "single", c: "#cfd4da" }, [0.55, 1.2, 0.6]],
    ["y02", "Double Door 300L", 29500, { kind: "double", c: "#b8bec6" }, [0.65, 1.7, 0.68]],
    ["y03", "Side-by-Side 600L", 78000, { kind: "side", c: "#2f3640" }, [0.92, 1.8, 0.75]],
    ["y04", "French Door", 112000, { kind: "french", c: "#c7ccd1" }, [0.95, 1.85, 0.78]],
  ],
  washing_machine: [
    ["z01", "Top Load 7 kg", 17500, { kind: "top", c: "#f4f6f8" }],
    ["z02", "Front Load 8 kg", 33500, { kind: "front", c: "#e1e4e8" }],
    ["z03", "Washer-Dryer", 58000, { kind: "front", dryer: true, c: "#2f3640" }, [0.62, 0.9, 0.65]],
  ],
  microwave: [
    ["q01", "Solo 20L", 6500, { c: "#2f3640" }, [0.45, 0.27, 0.34]],
    ["q02", "Convection 28L", 12500, { c: "#c7ccd1" }, [0.52, 0.31, 0.4]],
  ],
  geyser: [
    ["e01", "15L Storage", 6800, { c: "#f4f6f8" }],
    ["e02", "25L Storage", 9800, { c: "#f4f6f8" }, [0.42, 0.62, 0.42]],
  ],
  kitchen_counter: [
    ["u01", "Straight 2.4 m", 36000, { kind: "straight", c: "#e8e3da" }],
    ["u02", "Straight 3.0 m", 45000, { kind: "straight", c: "#4a4f57" }, [3.0, 0.9, 0.62]],
    ["u03", "L-Shaped", 68000, { kind: "L", c: "#d9d2c5" }, [2.6, 0.9, 1.9]],
    ["u04", "Parallel 1.8 m", 28000, { kind: "straight", c: "#8b5e3c" }, [1.8, 0.9, 0.62]],
    ["u05", "Modular Wood Finish", 52000, { kind: "straight", wood: true, c: "#a47a52" }, [2.8, 0.9, 0.62]],
    ["u06", "Handleless Glossy", 62000, { kind: "straight", c: "#1f2937" }, [2.8, 0.9, 0.62]],
  ],
  kitchen_island: [
    ["j01", "Island with Stools Edge", 38000, { c: "#e8e3da" }],
    ["j02", "Butcher Block Island", 32000, { wood: true, c: "#a47a52" }, [1.5, 0.92, 0.8]],
    ["j03", "Large Waterfall Island", 78000, { c: "#2b2b2e" }, [2.4, 0.92, 1.1]],
  ],
  kitchen_sink: [
    ["p01", "Single Bowl Sink Unit", 14500, { bowls: 1, c: "#c7ccd1" }, [0.9, 0.9, 0.55]],
    ["p02", "Double Bowl + Drainer", 22500, { bowls: 2, c: "#c7ccd1" }, [1.4, 0.9, 0.6]],
    ["p03", "Under-counter Sink Unit", 18800, { bowls: 1, under: true, c: "#e8e3da" }, [1.0, 0.9, 0.6]],
  ],
  hob: [
    ["o01", "2-Burner Gas Hob", 6500, { burners: 2, c: "#2b2b2e" }, [0.6, 0.08, 0.34]],
    ["o02", "4-Burner Gas Hob", 12500, { burners: 4, c: "#2b2b2e" }, [0.75, 0.08, 0.5]],
    ["o03", "Induction Cooktop", 9800, { burners: 2, induction: true, c: "#111827" }, [0.6, 0.05, 0.5]],
  ],
  chimney: [
    ["ch1", "Wall-Mount Chimney", 14500, { kind: "wall", c: "#2b2b2e" }],
    ["ch2", "Island Chimney", 32000, { kind: "island", c: "#c7ccd1" }, [0.9, 1.1, 0.6]],
    ["ch3", "Slim Auto-Clean", 22000, { kind: "slim", c: "#d9d9de" }, [0.9, 0.5, 0.5]],
  ],
  wall_cabinet: [
    ["wc1", "Upper Cabinet 1.2 m", 8500, { c: "#e8e3da" }],
    ["wc2", "Upper Cabinet 2.0 m", 13500, { c: "#4a4f57" }, [2.0, 0.7, 0.33]],
    ["wc3", "Open Shelf", 3200, { open: true, c: "#a47a52" }, [1.2, 0.3, 0.25]],
  ],
  bathtub: [
    ["bt1", "Built-in Tub", 18500, { kind: "built", c: "#f4f6f8" }],
    ["bt2", "Freestanding Oval", 46000, { kind: "free", c: "#f9fafb" }, [1.7, 0.62, 0.8]],
    ["bt3", "Jacuzzi Corner", 85000, { kind: "corner", c: "#e8f1f8" }, [1.5, 0.65, 1.5]],
    ["bt4", "Compact Tub", 12500, { kind: "built", c: "#f4f6f8" }, [1.2, 0.55, 0.7]],
  ],
  toilet: [
    ["wc4", "Floor-Mount EWC", 7800, { kind: "ewc", c: "#fbfbfb" }],
    ["wc5", "Wall-Hung Toilet", 16500, { kind: "wall", c: "#fbfbfb" }, [0.38, 0.4, 0.55]],
    ["wc6", "One-Piece Smart Toilet", 38000, { kind: "smart", c: "#f4f6f8" }],
    ["wc7", "Indian Style Pan", 3200, { kind: "indian", c: "#f2f2f2" }, [0.45, 0.1, 0.65]],
  ],
  washbasin: [
    ["ws1", "Pedestal Basin", 5200, { kind: "pedestal", c: "#fbfbfb" }],
    ["ws2", "Counter-top Bowl", 9800, { kind: "bowl", c: "#e8f1f8" }, [0.6, 0.9, 0.45]],
    ["ws3", "Wall-Hung Basin", 6500, { kind: "wall", c: "#fbfbfb" }, [0.55, 0.2, 0.42]],
    ["ws4", "Double Vanity Basin", 24500, { kind: "double", c: "#cfd4da" }, [1.5, 0.88, 0.5]],
    ["ws5", "Round Designer Basin", 8800, { kind: "bowl", round: true, c: "#2b2b2e" }, [0.45, 0.9, 0.45]],
  ],
  shower: [
    ["sh1", "Shower Cabin", 28500, { kind: "cabin", c: "#bfe3f2" }],
    ["sh2", "Corner Quadrant", 34500, { kind: "corner", c: "#bfe3f2" }, [0.9, 2.1, 0.9]],
    ["sh3", "Open Rain Shower", 14500, { kind: "rain", c: "#c7ccd1" }, [0.9, 2.2, 0.9]],
    ["sh4", "Walk-in Glass Panel", 19500, { kind: "walkin", c: "#d4ecf7" }, [1.2, 2.0, 0.9]],
  ],
  mirror: [
    ["mi1", "Rectangle Mirror", 3200, { kind: "rect", c: "#8b5e3c" }],
    ["mi2", "Round Mirror", 3800, { kind: "round", c: "#c9a27a" }, [0.7, 0.7, 0.04]],
    ["mi3", "LED Vanity Mirror", 7800, { kind: "led", c: "#7df9ff" }, [0.8, 1.0, 0.05]],
    ["mi4", "Full-Length Mirror", 6500, { kind: "rect", c: "#2b2b2e" }, [0.55, 1.7, 0.05]],
    ["mi5", "Arch Mirror", 5900, { kind: "arch", c: "#d4af37" }, [0.7, 1.2, 0.04]],
  ],
  vanity: [
    ["va1", "Single Vanity Unit", 14800, { doors: 2, c: "#8b5e3c" }],
    ["va2", "Floating Vanity", 17800, { float: true, doors: 2, c: "#d9d2c5" }, [1.1, 0.5, 0.48]],
    ["va3", "Double Vanity", 32500, { doors: 4, c: "#2f3640" }, [1.6, 0.85, 0.5]],
  ],
  plant: [
    ["pl1", "Snake Plant", 900, { kind: "snake", c: "#2f7d4f" }, [0.4, 0.9, 0.4]],
    ["pl2", "Fiddle Leaf Fig", 2800, { kind: "fig", c: "#3a8d55" }, [0.6, 1.5, 0.6]],
    ["pl3", "Palm", 3500, { kind: "palm", c: "#2e8b57" }, [0.9, 1.8, 0.9]],
    ["pl4", "Bonsai", 4200, { kind: "bonsai", c: "#3f9d5c" }, [0.35, 0.4, 0.35]],
    ["pl5", "Hanging Planter", 1200, { kind: "hang", c: "#4caf50" }, [0.35, 0.7, 0.35]],
    ["pl6", "Succulent Pot", 450, { kind: "succ", c: "#6bbf8a" }, [0.2, 0.2, 0.2]],
    ["pl7", "Money Plant Stand", 1100, { kind: "vine", c: "#43a047" }, [0.35, 1.0, 0.35]],
    ["pl8", "Tulsi Planter", 800, { kind: "tulsi", c: "#4d9d49" }, [0.5, 0.9, 0.5]],
  ],
  rug: [
    ["rg1", "Rectangle Wool Rug", 7800, { shape: "rect", c: "#b0a090" }],
    ["rg2", "Round Rug", 6200, { shape: "round", c: "#8aa1b1" }, [1.6, 0.02, 1.6]],
    ["rg3", "Persian Style", 24500, { shape: "rect", pattern: true, c: "#8b2e2e" }, [2.4, 0.02, 1.7]],
    ["rg4", "Runner", 3600, { shape: "rect", c: "#3d405b" }, [0.8, 0.02, 2.4]],
    ["rg5", "Shaggy Large", 12800, { shape: "rect", c: "#f2efe9" }, [2.4, 0.04, 1.8]],
    ["rg6", "Geometric Kilim", 9200, { shape: "rect", pattern: true, c: "#e07a5f" }, [2.0, 0.02, 1.4]],
  ],
  curtain: [
    ["cu1", "Floor-Length Pair", 4800, { kind: "pair", c: "#7d8fb3" }],
    ["cu2", "Sheer Voile", 3200, { kind: "sheer", c: "#f4efe6" }],
    ["cu3", "Blackout Heavy", 7500, { kind: "pair", c: "#2f2a38" }, [2.0, 2.4, 0.14]],
    ["cu4", "Roman Blind", 3800, { kind: "roman", c: "#d9c9a8" }, [1.4, 1.4, 0.06]],
  ],
  painting: [
    ["pa1", "Landscape Canvas", 3500, { kind: "land", c: "#2a6f97" }],
    ["pa2", "Abstract Triptych", 7200, { kind: "tri", c: "#e07a5f" }, [1.8, 0.7, 0.04]],
    ["pa3", "Portrait Frame", 2800, { kind: "port", c: "#7a5a43" }, [0.5, 0.7, 0.04]],
    ["pa4", "Gallery Set of 3", 6800, { kind: "set", c: "#3d405b" }, [1.4, 0.8, 0.04]],
    ["pa5", "Neon Sign", 8800, { kind: "neon", c: "#ff4ecd" }, [0.9, 0.35, 0.05]],
    ["pa6", "Large Statement Art", 14500, { kind: "land", c: "#81b29a" }, [1.6, 1.0, 0.05]],
  ],
  clock: [
    ["ck1", "Round Wall Clock", 1500, { c: "#2f2a28" }],
    ["ck2", "Pendulum Clock", 5600, { pendulum: true, c: "#8b5e3c" }, [0.35, 0.95, 0.12]],
    ["ck3", "Giant Minimal", 3800, { c: "#e8e3da" }, [0.8, 0.8, 0.04]],
  ],
  vase: [
    ["vs1", "Ceramic Vase", 900, { c: "#e8e3da" }],
    ["vs2", "Tall Floor Vase", 3200, { tall: true, c: "#3d405b" }, [0.3, 0.9, 0.3]],
    ["vs3", "Flower Bowl", 1500, { bowl: true, c: "#e07a5f" }, [0.35, 0.2, 0.35]],
  ],
  door: [
    ["dr1", "Flush Wooden Door", 9500, { kind: "flush", c: "#a47a52" }],
    ["dr2", "Panel Teak Door", 18500, { kind: "panel", c: "#7a5a43" }],
    ["dr3", "Main Double Door", 42000, { kind: "double", c: "#6e4b36" }, [1.6, 2.2, 0.14]],
    ["dr4", "Glass Sliding Door", 38500, { kind: "glass", c: "#bfe3f2" }, [1.8, 2.2, 0.1]],
    ["dr5", "French Door", 46500, { kind: "french", c: "#f2efe9" }, [1.5, 2.2, 0.12]],
    ["dr6", "Bathroom PVC Door", 3800, { kind: "flush", c: "#e8e3da" }, [0.8, 2.0, 0.1]],
    ["dr7", "Modern Black Steel Door", 32500, { kind: "steel", c: "#1f2937" }, [1.0, 2.2, 0.14]],
    ["dr8", "Arched Entrance", 52000, { kind: "arch", c: "#5b3a29" }, [1.2, 2.4, 0.16]],
    ["dr9", "Barn Sliding Door", 24500, { kind: "barn", c: "#8b5e3c" }, [1.0, 2.1, 0.1]],
    ["dr10", "Security Grill Door", 15500, { kind: "grill", c: "#2b2b2e" }, [1.0, 2.1, 0.1]],
  ],
  window: [
    ["wn1", "Standard Casement", 7800, { kind: "case", c: "#f2efe9" }],
    ["wn2", "Large Picture Window", 17500, { kind: "pic", c: "#2b2b2e" }, [2.2, 1.5, 0.14]],
    ["wn3", "Sliding 2-Track", 9800, { kind: "slide", c: "#d9d9de" }, [1.8, 1.2, 0.12]],
    ["wn4", "French Window Full-Height", 24500, { kind: "french", c: "#f2efe9" }, [1.4, 2.1, 0.14], 0],
    ["wn5", "Bay Style Wide", 26500, { kind: "pic", c: "#f2efe9" }, [2.8, 1.4, 0.14]],
    ["wn6", "Small Ventilator", 3200, { kind: "vent", c: "#d9d9de" }, [0.6, 0.45, 0.1], 1.8],
    ["wn7", "Arched Window", 14500, { kind: "arch", c: "#f2efe9" }, [1.0, 1.6, 0.14]],
    ["wn8", "Round Window", 11500, { kind: "round", c: "#2b2b2e" }, [0.9, 0.9, 0.12], 1.2],
    ["wn9", "Louvered Window", 6800, { kind: "louver", c: "#c8a77c" }, [1.0, 1.2, 0.12]],
    ["wn10", "Floor Glass Wall", 36000, { kind: "wall", c: "#2b2b2e" }, [3.0, 2.4, 0.12], 0],
  ],
  stairs: [
    ["st1", "Straight Staircase", 58000, { kind: "straight", c: "#a47a52" }, [1.1, 3.0, 3.6]],
    ["st2", "L-Shaped Staircase", 74000, { kind: "L", c: "#8b5e3c" }, [2.2, 3.0, 2.6]],
    ["st3", "Spiral Staircase", 92000, { kind: "spiral", c: "#2b2b2e" }, [1.5, 3.0, 1.5]],
    ["st4", "U-Shaped Staircase", 86000, { kind: "U", c: "#7a5a43" }, [2.4, 3.0, 2.8]],
    ["st5", "Floating Steps", 98000, { kind: "float", c: "#d9d2c5" }, [1.0, 3.0, 3.2]],
  ],
  railing: [
    ["rl1", "Glass Railing", 8500, { kind: "glass", c: "#bfe3f2" }],
    ["rl2", "Steel Railing", 5200, { kind: "steel", c: "#c7ccd1" }],
    ["rl3", "Wooden Baluster", 6800, { kind: "wood", c: "#8b5e3c" }],
    ["rl4", "Wrought Iron", 7400, { kind: "iron", c: "#1f2937" }],
  ],
  pillar: [
    ["pi1", "Round Column", 14500, { kind: "round", c: "#e8e3da" }],
    ["pi2", "Square Pillar", 9800, { kind: "square", c: "#d9d2c5" }, [0.35, 3.0, 0.35]],
    ["pi3", "Roman Column", 28500, { kind: "roman", c: "#f2efe9" }, [0.45, 3.0, 0.45]],
  ],
  tree: [
    ["tr1", "Neem Tree", 4500, { kind: "round", c: "#2f7d4f" }],
    ["tr2", "Palm Tree", 6500, { kind: "palm", c: "#3a8d55" }, [2.0, 4.5, 2.0]],
    ["tr3", "Pine Tree", 5200, { kind: "pine", c: "#1f6f46" }, [1.8, 4.5, 1.8]],
    ["tr4", "Mango Tree", 7800, { kind: "round", c: "#3c8a3f" }, [3.2, 4.8, 3.2]],
    ["tr5", "Ornamental Cherry", 8800, { kind: "round", c: "#f4a6c0" }, [2.2, 3.2, 2.2]],
    ["tr6", "Coconut Palm", 9500, { kind: "palm", c: "#2e8b57" }, [2.4, 6.0, 2.4]],
  ],
  bush: [
    ["bu1", "Round Shrub", 600, { kind: "round", c: "#3a8d55" }],
    ["bu2", "Hedge Row", 1400, { kind: "hedge", c: "#2f7d4f" }, [2.0, 0.9, 0.6]],
    ["bu3", "Flower Bed", 1800, { kind: "flower", c: "#e84a8a" }, [1.6, 0.4, 0.8]],
  ],
  bench: [
    ["be1", "Wooden Garden Bench", 6500, { kind: "wood", c: "#8b5e3c" }],
    ["be2", "Wrought-Iron Bench", 8200, { kind: "iron", c: "#2b2b2e" }],
    ["be3", "Stone Bench", 9500, { kind: "stone", c: "#a9a9a9" }, [1.6, 0.5, 0.5]],
    ["be4", "Picnic Table Set", 14500, { kind: "picnic", c: "#a47a52" }, [1.8, 0.8, 1.6]],
  ],
  swing: [
    ["sw1", "Wooden Garden Swing", 18500, { kind: "frame", c: "#8b5e3c" }],
    ["sw2", "Hanging Egg Chair", 12500, { kind: "egg", c: "#d9c9a8" }, [1.0, 2.0, 1.0]],
  ],
  fountain: [
    ["fo1", "Tiered Stone Fountain", 38500, { kind: "tier", c: "#b8b8b8" }],
    ["fo2", "Modern Wall Fountain", 26500, { kind: "wall", c: "#2b2b2e" }, [1.2, 1.8, 0.4]],
    ["fo3", "Lotus Pond", 22500, { kind: "pond", c: "#38bdf8" }, [1.8, 0.5, 1.8]],
  ],
  pool: [
    ["po1", "Rectangle Pool 5 x 2.8", 580000, { kind: "rect", c: "#38bdf8" }],
    ["po2", "Kidney Pool", 720000, { kind: "kidney", c: "#22d3ee" }, [6, 0.12, 3.4]],
    ["po3", "Plunge Pool", 280000, { kind: "rect", c: "#38bdf8" }, [3, 0.12, 2]],
  ],
  fence: [
    ["fe1", "Wooden Picket", 2400, { kind: "picket", c: "#f2efe9" }],
    ["fe2", "Iron Fence", 3600, { kind: "iron", c: "#1f2937" }],
    ["fe3", "Brick Boundary Wall", 5200, { kind: "wall", c: "#b5651d" }, [2.0, 1.4, 0.23]],
  ],
  gate: [
    ["ga1", "Sliding Steel Gate", 42000, { kind: "slide", c: "#2b2b2e" }],
    ["ga2", "Swing Double Gate", 38000, { kind: "swing", c: "#3d2f2a" }, [3.4, 1.6, 0.14]],
    ["ga3", "Pedestrian Gate", 12500, { kind: "swing", c: "#1f2937" }, [1.0, 1.4, 0.08]],
  ],
  pergola: [
    ["pg1", "Wooden Pergola", 68000, { c: "#a47a52" }],
    ["pg2", "Steel Gazebo", 92000, { gazebo: true, c: "#2b2b2e" }, [3.2, 2.8, 3.2]],
  ],
  lamp_post: [
    ["lp1", "Classic Lamp Post", 6800, { kind: "classic", c: "#2b2b2e" }],
    ["lp2", "Bollard Light", 2800, { kind: "bollard", c: "#c7ccd1" }, [0.2, 0.7, 0.2]],
    ["lp3", "Solar Garden Light", 1900, { kind: "solar", c: "#fde68a" }, [0.15, 0.9, 0.15]],
  ],
  sunbed: [
    ["sb1", "Poolside Lounger", 9800, { c: "#f2efe9" }],
    ["sb2", "Hammock", 6800, { hammock: true, c: "#e07a5f" }, [1.0, 1.1, 2.2]],
  ],
  cube: [["cb1", "Cube", 0, { c: "#9ca3af" }]],
  sphere: [["sp1", "Sphere", 0, { c: "#9ca3af" }]],
  cylinder: [["cy1", "Cylinder", 0, { c: "#9ca3af" }]],
  cone: [["co1", "Cone", 0, { c: "#9ca3af" }]],
};

export const ITEMS = [];
export const ITEM_BY_KEY = {};
for (const [type, list] of Object.entries(rows)) {
  for (const [id, name, price, p, dims, y] of list) {
    const def = TYPES[type];
    const item = { key: `${type}.${id}`, type, cat: def.cat, name, price, p: p || {}, dims: dims || def.dims, y: y ?? def.y ?? 0 };
    ITEMS.push(item);
    ITEM_BY_KEY[item.key] = item;
  }
}

export function itemsOfType(type) {
  return ITEMS.filter((i) => i.type === type);
}
export function typeLabel(type) {
  return TYPES[type]?.label || type;
}
export function itemName(key) {
  return ITEM_BY_KEY[key]?.name || key;
}

// ----------------------------------------------------------------------- paints
const FAMILIES = [
  ["red", "Red", 0, 0.72], ["coral", "Coral", 10, 0.78], ["orange", "Orange", 28, 0.85], ["amber", "Amber", 40, 0.85],
  ["yellow", "Yellow", 52, 0.8], ["lime", "Lime", 78, 0.6], ["green", "Green", 125, 0.45], ["mint", "Mint", 155, 0.5],
  ["teal", "Teal", 176, 0.6], ["cyan", "Cyan", 190, 0.7], ["sky", "Sky", 205, 0.7], ["blue", "Blue", 222, 0.65],
  ["indigo", "Indigo", 245, 0.5], ["violet", "Violet", 270, 0.5], ["magenta", "Magenta", 300, 0.5], ["pink", "Pink", 335, 0.65],
  ["brown", "Brown", 25, 0.38],
];
const SHADES = [["Whisper", 0.93, 0.5], ["Pastel", 0.86, 0.7], ["Soft", 0.78, 0.8], ["Light", 0.68, 0.9], ["Classic", 0.58, 1], ["Rich", 0.48, 1], ["Bold", 0.38, 0.95], ["Deep", 0.26, 0.85]];

function hslHex(h, s, l) {
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const PAINT_FAMILIES = [
  ...FAMILIES.map(([id, label, hue, sat]) => ({
    id, label, shades: SHADES.map(([sn, l, sm]) => ({ hex: hslHex(hue, sat * sm, l), name: `${label} ${sn}` })),
  })),
  { id: "neutral", label: "Whites & Greys", shades: ["#ffffff", "#faf7f2", "#f1ece3", "#e5e5e5", "#cfd2d6", "#a3a8b0", "#6b7280", "#374151", "#1f2430", "#0f1218"].map((hex, i) => ({ hex, name: ["Pure White", "Ivory", "Cream", "Light Grey", "Dove Grey", "Ash", "Slate", "Charcoal", "Midnight", "Onyx"][i] })) },
  { id: "earth", label: "Earth & Sand", shades: ["#f5e6d3", "#ead7bd", "#d9bf9b", "#c8a27a", "#b08968", "#9c6f4b", "#7f5539", "#5e3d2a", "#e9d8a6", "#bb9457"].map((hex, i) => ({ hex, name: ["Linen", "Sand", "Camel", "Caramel", "Clay", "Terracotta", "Cocoa", "Espresso", "Wheat", "Bronze"][i] })) },
];
export const ALL_PAINTS = PAINT_FAMILIES.flatMap((f) => f.shades.map((s) => ({ ...s, family: f.id })));

export const FINISHES = [
  { id: "matt", label: "Emulsion Matt", price: 260, rough: 0.95 },
  { id: "silk", label: "Premium Silk", price: 380, rough: 0.55 },
  { id: "texture", label: "Texture Coat", price: 520, rough: 1 },
  { id: "metallic", label: "Metallic Sheen", price: 640, rough: 0.28 },
];

// ----------------------------------------------------------------------- floors  (price per m2)
export const FLOORS = [
  { id: "ceramic", label: "Ceramic Tile", price: 450, pattern: "grid", base: "#e9e5dc", size: 0.6 },
  { id: "vitrified", label: "Glossy Vitrified", price: 720, pattern: "grid", base: "#f4f1ea", size: 0.8, gloss: true },
  { id: "porcelain", label: "Matte Porcelain", price: 880, pattern: "grid", base: "#c9c6c0", size: 0.6 },
  { id: "checker", label: "Black & White Checker", price: 950, pattern: "checker", base: "#f2f2f2", alt: "#1f2430", size: 0.4, gloss: true },
  { id: "hex", label: "Hexagon Mosaic", price: 1250, pattern: "hex", base: "#dcd8cf", size: 0.2 },
  { id: "marble_w", label: "Carrara White Marble", price: 2400, pattern: "veins", base: "#f1f1f0", size: 1.0, gloss: true },
  { id: "marble_b", label: "Nero Black Marble", price: 3200, pattern: "veins", base: "#1b1b1f", vein: "#d8c27a", size: 1.0, gloss: true },
  { id: "marble_g", label: "Emperador Brown Marble", price: 2800, pattern: "veins", base: "#6b4a37", vein: "#d9c3a5", size: 1.0, gloss: true },
  { id: "granite_k", label: "Black Granite", price: 1700, pattern: "speckle", base: "#26262b", size: 0.8, gloss: true },
  { id: "granite_g", label: "Grey Granite", price: 1500, pattern: "speckle", base: "#8d9096", size: 0.8 },
  { id: "oak", label: "Oak Wood Planks", price: 1900, pattern: "planks", base: "#c8a272", size: 0.18 },
  { id: "walnut", label: "Walnut Wood Planks", price: 2300, pattern: "planks", base: "#6b4a34", size: 0.18 },
  { id: "teak", label: "Teak Wood Planks", price: 2800, pattern: "planks", base: "#a6713d", size: 0.2 },
  { id: "herring", label: "Herringbone Parquet", price: 3100, pattern: "herring", base: "#b98d5e", size: 0.12 },
  { id: "laminate", label: "Grey Laminate", price: 950, pattern: "planks", base: "#9a9690", size: 0.19 },
  { id: "terrazzo", label: "Terrazzo", price: 1650, pattern: "speckle", base: "#ece7de", flecks: ["#c9a27a", "#8aa1b1", "#e07a5f"], size: 1.0 },
  { id: "cement", label: "Polished Cement", price: 650, pattern: "plain", base: "#a8a8a8", size: 1.2 },
  { id: "slate", label: "Natural Slate", price: 1350, pattern: "grid", base: "#4b525c", size: 0.4 },
  { id: "carpet", label: "Soft Carpet", price: 700, pattern: "plain", base: "#8c7f8f", size: 1.2, rough: 1 },
  { id: "antiskid", label: "Anti-Skid Bathroom Tile", price: 520, pattern: "grid", base: "#b9c4c9", size: 0.3 },
  { id: "paver", label: "Outdoor Paver", price: 420, pattern: "brick", base: "#b36a4a", size: 0.25 },
  { id: "deck", label: "Wooden Deck", price: 1600, pattern: "planks", base: "#9c7a54", size: 0.14 },
  { id: "gravel", label: "Gravel", price: 150, pattern: "speckle", base: "#a89f91", size: 1.0 },
  { id: "grass", label: "Lawn Grass", price: 120, pattern: "grass", base: "#3f8f4f", size: 1.0 },
];
export const FLOOR_BY_ID = Object.fromEntries(FLOORS.map((f) => [f.id, f]));
export const TILE_SIZES = [
  { id: 0.3, label: "300 mm" }, { id: 0.45, label: "450 mm" }, { id: 0.6, label: "600 mm" },
  { id: 0.8, label: "800 mm" }, { id: 1.2, label: "1200 mm" },
];

// ----------------------------------------------------------------------- room types
export const ROOM_TYPES = {
  living: { label: "Living Room", icon: "🛋️", size: [5, 4.5], floorMat: "vitrified", wall: "#f1ece3" },
  bedroom: { label: "Bedroom", icon: "🛏️", size: [4, 3.6], floorMat: "oak", wall: "#d9e4f1" },
  kids: { label: "Kids Room", icon: "🧸", size: [3.5, 3.2], floorMat: "laminate", wall: "#fde2e4" },
  kitchen: { label: "Kitchen", icon: "🍳", size: [3.6, 3], floorMat: "porcelain", wall: "#faf7f2" },
  dining: { label: "Dining Room", icon: "🍽️", size: [4, 3.5], floorMat: "ceramic", wall: "#f5e6d3" },
  bathroom: { label: "Bathroom", icon: "🛁", size: [2.4, 2.2], floorMat: "antiskid", wall: "#d4ecf7" },
  study: { label: "Study / Office", icon: "📚", size: [3.2, 3], floorMat: "walnut", wall: "#e5e5e5" },
  hall: { label: "Hall / Lobby", icon: "🏛️", size: [4, 3], floorMat: "marble_w", wall: "#faf7f2" },
  balcony: { label: "Balcony", icon: "🌇", size: [3.2, 1.5], floorMat: "antiskid", wall: "#f1ece3", open: "railing" },
  terrace: { label: "Terrace", icon: "🏙️", size: [6, 5], floorMat: "paver", wall: "#e5e5e5", open: "parapet" },
  garden: { label: "Garden", icon: "🌳", size: [8, 6], floorMat: "grass", wall: "#e5e5e5", open: "none", ground: true },
  room: { label: "Custom Room", icon: "⬜", size: [4, 4], floorMat: "ceramic", wall: "#f1ece3" },
};

export const FLOOR_PRESETS = [2.7, 3.0, 3.3, 3.6, 4.0, 4.5];

export const CONSTRUCTION_GRADES = [
  { id: "basic", label: "Basic", perM2: 17000 },
  { id: "standard", label: "Standard", perM2: 22500 },
  { id: "premium", label: "Premium", perM2: 31000 },
  { id: "luxury", label: "Luxury", perM2: 45000 },
];
