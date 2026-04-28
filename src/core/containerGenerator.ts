import { CATALOG_ITEMS, getItem, getShape } from "./catalog";
import { Random, roundTo } from "./rng";
import type { ContainerLot, PlacedItem, VenueConfig } from "./types";

interface Cell {
  dx: number;
  dy: number;
}

interface LotGenerationOptions {
  index: number;
  targetValue: number;
  riskTier: 1 | 2 | 3;
  minItems?: number;
}

export interface GeneratedMatchLots {
  lots: ContainerLot[];
  referenceLotValueRange: [number, number];
}

const LOT_SOURCES = [
  "Bluewater Liquidation Yard",
  "Saint Mackerel Customs Hold",
  "Rainy Mall Basement Sale",
  "Old Ferry Claim Office",
  "Coral Street Estate Pickup",
  "Municipal Oddities Overflow",
  "Low Tide Salvage Board",
];

const LOT_NAMES = [
  "Lot of Damp Practicalities",
  "Container with an Unhelpful Smell",
  "Estate Goods, Salt Exposure Unknown",
  "Mixed Salvage, No Refunds",
  "After-Hours Recovery Pallet",
  "Non-Standard Asset Bundle",
  "Dockside Mystery Crate",
];

export function shapeCells(shapeId: string): Cell[] {
  const shape = getShape(shapeId);
  const cells: Cell[] = [];
  shape.mask.forEach((row, y) => {
    row.split("").forEach((cell, x) => {
      if (cell === "1") {
        cells.push({ dx: x, dy: y });
      }
    });
  });
  return cells;
}

export function shapeSize(shapeId: string): { w: number; h: number; area: number } {
  const shape = getShape(shapeId);
  const w = Math.max(...shape.mask.map((row) => row.length));
  const h = shape.mask.length;
  return { w, h, area: shapeCells(shapeId).length };
}

export function generateMatchLots(seed: string, venue: VenueConfig): GeneratedMatchLots {
  const rng = new Random(`${seed}:lots`);
  const lots: ContainerLot[] = [];

  for (let index = 0; index < venue.lotCount; index += 1) {
    const targetValue = roundTo(
      rng.float(venue.lotValueRange[0], venue.lotValueRange[1]),
      venue.bidStep / 2,
    );
    const riskTier = pickRiskTier(rng, index, venue.lotCount);
    const lot = generateContainerLot(rng, {
      index,
      targetValue,
      riskTier,
      minItems: 10,
    });
    lots.push(lot);
  }

  return {
    lots,
    referenceLotValueRange: venue.lotValueRange,
  };
}

export function generateContainerLot(
  rng: Random,
  options: LotGenerationOptions,
): ContainerLot {
  const cols = 12;
  const rows = 8;
  const minItems = options.minItems ?? 10;
  const desiredItems = rng.int(minItems, minItems + 5);
  const occupied = new Set<string>();
  const pickedCatalogIds: string[] = [];
  let attempts = 0;

  while (pickedCatalogIds.length < desiredItems && attempts < 600) {
    attempts += 1;
    const candidate = pickCatalogItem(rng, options.riskTier, pickedCatalogIds.length);
    const size = shapeSize(candidate.shapeId);
    const x = rng.int(0, Math.max(0, cols - size.w));
    const y = rng.int(0, Math.max(0, rows - size.h));
    const cells = shapeCells(candidate.shapeId).map((cell) => ({
      x: x + cell.dx,
      y: y + cell.dy,
    }));
    const fits = cells.every(
      (cell) =>
        cell.x >= 0 &&
        cell.x < cols &&
        cell.y >= 0 &&
        cell.y < rows &&
        !occupied.has(`${cell.x},${cell.y}`),
    );
    if (!fits) {
      continue;
    }
    cells.forEach((cell) => occupied.add(`${cell.x},${cell.y}`));
    pickedCatalogIds.push(`${candidate.id}@${x},${y}`);
  }

  while (pickedCatalogIds.length < minItems) {
    const fallback = CATALOG_ITEMS.find((item) => shapeSize(item.shapeId).area <= 2);
    if (!fallback) {
      break;
    }
    pickedCatalogIds.push(`${fallback.id}@0,0`);
  }

  const baseTotal = pickedCatalogIds.reduce((sum, encoded) => {
    const [itemId] = encoded.split("@");
    return sum + getItem(itemId).baseValue;
  }, 0);
  const multiplier = clamp(options.targetValue / Math.max(1, baseTotal), 0.58, 2.4);

  const items: PlacedItem[] = pickedCatalogIds.map((encoded, itemIndex) => {
    const [itemId, coord] = encoded.split("@");
    const [rawX, rawY] = coord.split(",").map(Number);
    const catalog = getItem(itemId);
    const value = roundTo(catalog.baseValue * multiplier * rng.float(0.86, 1.14), 5);
    return {
      instanceId: `lot-${options.index + 1}-item-${itemIndex + 1}`,
      catalogId: itemId,
      x: rawX,
      y: rawY,
      value: Math.max(5, value),
    };
  });

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const openingBid = Math.max(100, roundTo(totalValue * rng.float(0.14, 0.25), 25));
  const bandSpread = options.riskTier === 3 ? 0.42 : options.riskTier === 2 ? 0.32 : 0.24;
  const expectedLow = Math.max(100, roundTo(totalValue * (1 - bandSpread), 50));
  const expectedHigh = roundTo(totalValue * (1 + bandSpread), 50);

  return {
    id: `lot-${options.index + 1}`,
    name: rng.pick(LOT_NAMES),
    source: rng.pick(LOT_SOURCES),
    riskTier: options.riskTier,
    grid: { cols, rows },
    openingBid,
    expectedValueRange: [expectedLow, expectedHigh],
    totalValue,
    items,
  };
}

function pickCatalogItem(rng: Random, riskTier: 1 | 2 | 3, count: number) {
  const oddityBoost = riskTier === 3 ? 0.28 : riskTier === 2 ? 0.16 : 0.08;
  const collectibleBoost = riskTier === 1 ? 0.16 : 0.22;

  const pool = CATALOG_ITEMS.flatMap((item) => {
    let weight = 3;
    if (item.category === "oddity" || item.category === "contraband") {
      weight += Math.round(oddityBoost * 20);
    }
    if (item.category === "collectible") {
      weight += Math.round(collectibleBoost * 10);
    }
    if (item.category === "household" && count < 5) {
      weight += 2;
    }
    return Array.from({ length: weight }, () => item);
  });

  return rng.pick(pool);
}

function pickRiskTier(rng: Random, index: number, lotCount: number): 1 | 2 | 3 {
  if (index === lotCount - 1 && rng.chance(0.65)) {
    return 3;
  }
  const roll = rng.next();
  if (roll > 0.82) {
    return 3;
  }
  if (roll > 0.42) {
    return 2;
  }
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
