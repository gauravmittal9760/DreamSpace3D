"""Server-side knowledge of the item catalogue types (mirrors frontend/src/scene/catalog.js)."""
FLOOR = {"bed", "bedside", "wardrobe", "dresser", "sofa", "coffee_table", "tv_unit", "chair", "table", "desk", "bookshelf", "cabinet", "shoe_rack",
         "lamp", "fridge", "washing_machine", "kitchen_counter", "kitchen_island", "kitchen_sink", "bathtub", "toilet", "washbasin", "shower",
         "vanity", "plant", "rug", "stairs", "railing", "pillar", "tree", "bush", "bench", "swing", "fountain", "pool", "fence", "gate", "pergola",
         "lamp_post", "sunbed", "cube", "sphere", "cylinder", "cone"}
WALL_MOUNTED = {"tv", "ac", "microwave", "geyser", "hob", "chimney", "wall_cabinet", "mirror", "curtain", "painting", "clock"}
CEILING = {"fan", "light", "chandelier"}
STRUCTURAL = {"door", "window"}
SURFACE = {"vase"}
ALL_TYPES = FLOOR | WALL_MOUNTED | CEILING | STRUCTURAL | SURFACE
# never moved by auto-arrange even though they stand on the floor
FIXED_FLOOR = {"stairs", "pillar", "rug", "pool", "gate", "fence", "tree", "fountain", "pergola", "lamp_post", "railing"}
