import type {
  CatalogItem,
  CharacterDefinition,
  GridShape,
  SkillDefinition,
  VenueConfig,
} from "./types";

export const VENUES: VenueConfig[] = [
  {
    id: "rusty-harbor",
    name: "Rusty Harbor Clearance",
    entryFee: 1000,
    escrowFunds: 20000,
    lotCount: 3,
    lotValueRange: [8000, 18000],
    bidStep: 500,
    qualificationRequirements: "None",
    riskLevel: "low",
    oddityRate: 0.08,
    contrabandRate: 0.02,
  },
  {
    id: "oddity-overflow",
    name: "Municipal Oddities Overflow",
    entryFee: 10000,
    escrowFunds: 100000,
    lotCount: 3,
    lotValueRange: [60000, 160000],
    bidStep: 5000,
    qualificationRequirements: "1 Oddity or 2 non-standard assets",
    riskLevel: "high",
    oddityRate: 0.28,
    contrabandRate: 0.12,
  },
];

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
  { id: "dot-1", name: "Single cell", mask: ["1"] },
];

export const CATALOG_ITEMS: CatalogItem[] = [
  item("rusted-pipe", "Rusted Pressure Pipe", "Pipe", "industrial", "metal", "scrap", 65, "bar-3", "long-tool", false, false, "Still smells like harbor rain and bad invoices."),
  item("diving-knife", "Old Diving Knife", "Knife", "collectible", "metal", "rare", 720, "bar-3", "long-tool", true, false, "The blade is dull. The buyer stories will not be."),
  item("yardstick", "Warped Yardstick", "Stick", "household", "wood", "scrap", 35, "bar-3", "long-tool", false, false, "Measures everything except why anyone kept it."),
  item("toastmaker", "Temperamental Toaster", "Toaster", "household", "metal", "scrap", 110, "square-2", "small-appliance", false, false, "Trips breakers. Makes excellent toast once per week."),
  item("sealed-battery", "Sealed Anomaly Battery", "Battery", "oddity", "unknown", "unregistered", 1650, "square-2", "small-appliance", true, true, "No terminals, no brand, no reason to be humming."),
  item("ship-bell", "Retired Ship Bell", "Bell", "collectible", "metal", "curious", 680, "square-2", "instrument", true, false, "Loud enough to settle an argument."),
  item("brass-valve", "Brass Valve Assembly", "Valve", "industrial", "metal", "useful", 460, "square-2", "small-appliance", false, false, "Heavy, honest brass. Easy to overestimate when nervous."),
  item("wet-vhs", "Waterlogged VHS Box", "VHS", "collectible", "paper", "curious", 240, "bar-4", "media-stack", true, false, "Mostly mildew. One tape keeps recording tomorrow."),
  item("ledger", "Soggy Auction Ledger", "Ledger", "household", "paper", "scrap", 25, "bar-2", "media-stack", false, false, "All the losses are still legible."),
  item("first-map", "First Print Harbor Map", "Map", "collectible", "paper", "rare", 1260, "square-2", "media-stack", true, true, "Shows two docks that closed and one that still sends bills."),
  item("cheap-lamp", "Bent Desk Lamp", "Lamp", "household", "metal", "scrap", 45, "l-3", "crooked-stand", false, false, "Has seen every bad deal in the room."),
  item("arcade-panel", "Limited Arcade Control Panel", "Panel", "collectible", "wood", "rare", 2100, "l-3", "crooked-stand", true, false, "Every button still remembers a crowd."),
  item("office-chair", "Salt-Stuck Office Chair", "Chair", "household", "metal", "scrap", 55, "z-4", "crooked-stand", false, false, "Still spins if you threaten it."),
  item("foghorn-radio", "Self-Reporting Radio", "Radio", "oddity", "metal", "curious", 1460, "z-4", "radio", true, false, "Broadcasts ads before storms. No batteries included."),
  item("storm-radio", "Cracked Storm Radio", "Radio", "household", "metal", "useful", 360, "z-4", "radio", false, false, "Only works when nobody needs a forecast."),
  item("yesterday-compass", "Compass Pointing to Yesterday", "Compass", "oddity", "glass", "curious", 1320, "tall-2", "instrument", true, true, "Great for nostalgia, terrible for navigation."),
  item("glass-eel-jar", "Jar of Glass Eels", "Eel Jar", "oddity", "glass", "curious", 1180, "tall-2", "glass-case", true, false, "They are not alive. They do keep appointments."),
  item("pocket-watch", "Waterproof Pocket Watch", "Watch", "collectible", "metal", "rare", 970, "tall-2", "instrument", true, false, "Ticks louder near unpaid debts."),
  item("porcelain-hand", "Porcelain Mannequin Hand", "Hand", "oddity", "ceramic", "curious", 880, "hook-5", "odd-appendage", true, false, "The fingerprints are not painted on."),
  item("bent-anchor", "Bent Desk Anchor", "Anchor", "household", "metal", "useful", 120, "hook-5", "odd-appendage", false, false, "Too small for a boat, too smug for a paperweight."),
  item("moldy-rug", "Moldy Dockside Rug", "Rug", "household", "cloth", "scrap", 35, "big-9", "large-flat", false, false, "A bold statement piece for rooms you dislike."),
  item("sealed-carpet", "Sealed Registry Carpet", "Carpet", "oddity", "cloth", "unregistered", 2350, "big-9", "large-flat", true, true, "The registry stamp is woven through, not printed on."),
  item("cracked-aquarium", "Cracked Aquarium", "Aquarium", "household", "glass", "scrap", 90, "t-5", "glass-case", false, false, "Technically an aquarium. Practically a puddle plan."),
  item("brass-astrolabe", "Brass Astrolabe Replica", "Astrolabe", "collectible", "metal", "rare", 980, "t-5", "instrument", true, false, "Fake history, real brass, decent margin."),
  item("pump-motor", "Salted Pump Motor", "Pump", "industrial", "metal", "useful", 520, "t-5", "industrial-core", false, false, "Turns like a cough, but the dock crew says it turns."),
  item("illegal-pearl", "Unregistered Whisper Pearl", "Pearl", "contraband", "unknown", "unregistered", 2600, "dot-1", "tiny-valuable", true, true, "The paperwork is somehow louder than the pearl."),
  item("blue-seal", "Unlabeled Blue Seal", "Seal", "contraband", "paper", "curious", 430, "dot-1", "tiny-valuable", true, false, "Looks like evidence. Best not to ask from where."),
  item("lucky-token", "Harbor Luck Token", "Token", "collectible", "metal", "curious", 310, "dot-1", "tiny-valuable", true, false, "Worth more when the seller insists it is not lucky."),
  item("fire-extinguisher", "Expired Fire Extinguisher", "Ext.", "industrial", "metal", "scrap", 85, "bar-2", "cylinder", false, false, "Expired, dented, still judging everyone."),
  item("green-bottle", "Green Glass Bottle", "Bottle", "household", "glass", "scrap", 40, "bar-2", "cylinder", false, false, "Ordinary glass. The label gave up first."),
  item("sealed-thermos", "Sealed Thermos of Warm Rain", "Thermos", "oddity", "metal", "curious", 760, "bar-2", "cylinder", true, false, "Always warm. Always rain. Never coffee."),
  item("oak-crate", "Small Oak Crate", "Crate", "household", "wood", "useful", 190, "square-2", "crate", false, false, "The crate may be worth more than what was in it."),
  item("auction-gavel", "Retired Auction Gavel", "Gavel", "collectible", "wood", "rare", 820, "bar-2", "long-tool", true, true, "The handle names three auction houses that no longer answer calls."),
  item("gear-cluster", "Box of Brass Gears", "Gears", "industrial", "metal", "useful", 340, "square-2", "industrial-core", false, false, "A mechanic will claim they have a buyer. They often do."),
];

export const SKILLS: SkillDefinition[] = [
  {
    id: "pinpoint-quality",
    name: "Pinpoint Quality",
    kind: "spot-high-value",
    description: "Reveal the quality and identity of one high-value item.",
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
    passive: "Collectible reads feel less slippery.",
    skillIds: ["pinpoint-quality", "market-whisper", "trash-call", "material-sweep"],
  },
  {
    id: "showboat-bidder",
    name: "Showboat Bidder",
    passive: "Every raise sounds intentional, even when it is not.",
    skillIds: ["market-whisper", "oddity-sniff", "pinpoint-quality", "trash-call"],
  },
  {
    id: "registry-clerk",
    name: "Registry Clerk",
    passive: "Non-standard assets leave paperwork trails.",
    skillIds: ["oddity-sniff", "material-sweep", "market-whisper", "trash-call"],
  },
  {
    id: "broke-diver",
    name: "Broke Diver",
    passive: "Keeps a calm face when the cash drawer gets thin.",
    skillIds: ["pinpoint-quality", "trash-call", "oddity-sniff", "material-sweep"],
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

export function getVenue(venueId = "rusty-harbor"): VenueConfig {
  const venue = VENUES.find((entry) => entry.id === venueId);
  if (!venue) {
    throw new Error(`Unknown venue: ${venueId}`);
  }
  return venue;
}

function item(
  id: string,
  name: string,
  shortName: string,
  category: CatalogItem["category"],
  material: CatalogItem["material"],
  quality: CatalogItem["quality"],
  baseValue: number,
  shapeId: string,
  silhouetteFamily: string,
  isKeepable: boolean,
  isCredential: boolean,
  flavor: string,
): CatalogItem {
  return {
    id,
    name,
    shortName,
    category,
    material,
    quality,
    baseValue,
    shapeId,
    silhouetteFamily,
    isKeepable,
    isCredential,
    flavor,
  };
}
