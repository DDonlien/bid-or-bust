import type {
  CatalogItem,
  CharacterDefinition,
  GridShape,
  SkillDefinition,
} from "./types";

export const GRID_SHAPES: GridShape[] = [
  { id: "bar-2", name: "2-cell bar", mask: ["11"] },
  { id: "bar-3", name: "3-cell bar", mask: ["111"] },
  { id: "bar-4", name: "4-cell bar", mask: ["1111"] },
  { id: "square-2", name: "2x2 block", mask: ["11", "11"] },
  { id: "tall-2", name: "Tall block", mask: ["1", "1"] },
  { id: "l-3", name: "L bend", mask: ["10", "10", "11"] },
  { id: "z-4", name: "Offset bend", mask: ["110", "011"] },
  { id: "t-5", name: "T plate", mask: ["111", "010", "010"] },
  { id: "big-9", name: "Heavy square", mask: ["111", "111", "111"] },
  { id: "hook-5", name: "Hook", mask: ["111", "100", "100"] },
];

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "rusted-pipe",
    name: "Rusted Pressure Pipe",
    category: "industrial",
    material: "metal",
    baseValue: 65,
    shapeId: "bar-3",
    silhouetteFamily: "long-tool",
    flavor: "Still smells like harbor rain and bad invoices.",
  },
  {
    id: "diving-knife",
    name: "Old Diving Knife",
    category: "collectible",
    material: "metal",
    baseValue: 720,
    shapeId: "bar-3",
    silhouetteFamily: "long-tool",
    flavor: "The blade is dull. The buyer stories will not be.",
  },
  {
    id: "toastmaker",
    name: "Temperamental Toaster",
    category: "household",
    material: "metal",
    baseValue: 110,
    shapeId: "square-2",
    silhouetteFamily: "small-appliance",
    flavor: "Trips breakers. Makes excellent toast once per week.",
  },
  {
    id: "sealed-battery",
    name: "Sealed Anomaly Battery",
    category: "oddity",
    material: "unknown",
    baseValue: 1650,
    shapeId: "square-2",
    silhouetteFamily: "small-appliance",
    flavor: "No terminals, no brand, no reason to be humming.",
  },
  {
    id: "wet-vhs",
    name: "Waterlogged VHS Box",
    category: "collectible",
    material: "paper",
    baseValue: 240,
    shapeId: "bar-4",
    silhouetteFamily: "media-stack",
    flavor: "Mostly mildew. One tape keeps recording tomorrow.",
  },
  {
    id: "cheap-lamp",
    name: "Bent Desk Lamp",
    category: "household",
    material: "metal",
    baseValue: 45,
    shapeId: "l-3",
    silhouetteFamily: "crooked-stand",
    flavor: "Has seen every bad deal in the room.",
  },
  {
    id: "yesterday-compass",
    name: "Compass Pointing to Yesterday",
    category: "oddity",
    material: "glass",
    baseValue: 1320,
    shapeId: "tall-2",
    silhouetteFamily: "instrument",
    flavor: "Great for nostalgia, terrible for navigation.",
  },
  {
    id: "porcelain-hand",
    name: "Porcelain Mannequin Hand",
    category: "oddity",
    material: "ceramic",
    baseValue: 880,
    shapeId: "hook-5",
    silhouetteFamily: "odd-appendage",
    flavor: "The fingerprints are not painted on.",
  },
  {
    id: "moldy-rug",
    name: "Moldy Dockside Rug",
    category: "household",
    material: "cloth",
    baseValue: 35,
    shapeId: "big-9",
    silhouetteFamily: "large-flat",
    flavor: "A bold statement piece for rooms you dislike.",
  },
  {
    id: "arcade-panel",
    name: "Limited Arcade Control Panel",
    category: "collectible",
    material: "wood",
    baseValue: 2100,
    shapeId: "l-3",
    silhouetteFamily: "crooked-stand",
    flavor: "Every button still remembers a crowd.",
  },
  {
    id: "foghorn-radio",
    name: "Self-Announcing Radio",
    category: "oddity",
    material: "metal",
    baseValue: 1460,
    shapeId: "z-4",
    silhouetteFamily: "radio",
    flavor: "Broadcasts ads before storms. No batteries included.",
  },
  {
    id: "cracked-aquarium",
    name: "Cracked Aquarium",
    category: "household",
    material: "glass",
    baseValue: 90,
    shapeId: "t-5",
    silhouetteFamily: "glass-case",
    flavor: "Technically an aquarium. Practically a puddle plan.",
  },
  {
    id: "brass-astrolabe",
    name: "Brass Astrolabe Replica",
    category: "collectible",
    material: "metal",
    baseValue: 980,
    shapeId: "t-5",
    silhouetteFamily: "instrument",
    flavor: "Fake history, real brass, decent margin.",
  },
  {
    id: "illegal-pearl",
    name: "Unregistered Whisper Pearl",
    category: "contraband",
    material: "unknown",
    baseValue: 2600,
    shapeId: "square-2",
    silhouetteFamily: "small-appliance",
    flavor: "The paperwork is somehow louder than the pearl.",
  },
  {
    id: "office-chair",
    name: "Salt-Stuck Office Chair",
    category: "household",
    material: "metal",
    baseValue: 55,
    shapeId: "z-4",
    silhouetteFamily: "crooked-stand",
    flavor: "Still spins if you threaten it.",
  },
  {
    id: "ship-bell",
    name: "Retired Ship Bell",
    category: "collectible",
    material: "metal",
    baseValue: 680,
    shapeId: "square-2",
    silhouetteFamily: "instrument",
    flavor: "Loud enough to settle an argument.",
  },
  {
    id: "paper-ledger",
    name: "Soggy Auction Ledger",
    category: "household",
    material: "paper",
    baseValue: 25,
    shapeId: "bar-2",
    silhouetteFamily: "media-stack",
    flavor: "All the losses are still legible.",
  },
  {
    id: "glass-eel-jar",
    name: "Jar of Glass Eels",
    category: "oddity",
    material: "glass",
    baseValue: 1180,
    shapeId: "tall-2",
    silhouetteFamily: "glass-case",
    flavor: "They are not alive. They do keep appointments.",
  },
];

export const SKILLS: SkillDefinition[] = [
  {
    id: "pinpoint-score",
    name: "Pinpoint Score",
    kind: "spot-high-value",
    description: "Reveal one of the most valuable items in this lot.",
  },
  {
    id: "market-whisper",
    name: "Market Whisper",
    kind: "read-value-band",
    description: "Reveal a tighter total value band for this lot.",
  },
  {
    id: "oddity-sniff",
    name: "Oddity Sniff",
    kind: "count-oddities",
    description: "Reveal how many oddity or contraband pieces are inside.",
  },
  {
    id: "trash-call",
    name: "Trash Call",
    kind: "find-dud",
    description: "Reveal one of the least valuable items in this lot.",
  },
  {
    id: "material-sweep",
    name: "Material Sweep",
    kind: "material-sweep",
    description: "Reveal the most common material tag in this lot.",
  },
];

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: "dock-appraiser",
    name: "Dock Appraiser",
    passive: "Starts with steadier estimates on industrial lots.",
    skillIds: ["pinpoint-score", "market-whisper", "trash-call", "material-sweep"],
  },
  {
    id: "showboat-bidder",
    name: "Showboat Bidder",
    passive: "Public raises hit harder in the room log.",
    skillIds: ["market-whisper", "oddity-sniff", "pinpoint-score", "trash-call"],
  },
  {
    id: "salvage-insurer",
    name: "Salvage Insurer",
    passive: "Better at noticing dangerous non-standard assets.",
    skillIds: ["oddity-sniff", "material-sweep", "market-whisper", "trash-call"],
  },
  {
    id: "broke-diver",
    name: "Broke Diver",
    passive: "Keeps a calm face when the cash drawer gets thin.",
    skillIds: ["pinpoint-score", "trash-call", "oddity-sniff", "material-sweep"],
  },
];

export function getShape(shapeId: string): GridShape {
  const shape = GRID_SHAPES.find((entry) => entry.id === shapeId);
  if (!shape) {
    throw new Error(`Unknown shape: ${shapeId}`);
  }
  return shape;
}

export function getItem(itemId: string): CatalogItem {
  const item = CATALOG_ITEMS.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  return item;
}

export function getSkill(skillId: string): SkillDefinition {
  const skill = SKILLS.find((entry) => entry.id === skillId);
  if (!skill) {
    throw new Error(`Unknown skill: ${skillId}`);
  }
  return skill;
}

export function getCharacter(characterId: string): CharacterDefinition {
  const character = CHARACTERS.find((entry) => entry.id === characterId);
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }
  return character;
}
