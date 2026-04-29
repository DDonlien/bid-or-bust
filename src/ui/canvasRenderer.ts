import { CATALOG_ITEMS, getItem } from "../core/catalog";
import { shapeCells, shapeSize } from "../core/containerGenerator";
import { itemIsKnownToPlayer } from "../core/gameEngine";
import type { GameState, PlayerId } from "../core/types";

interface Layout {
  x: number;
  y: number;
  cell: number;
}

const FG = "#e2e8c0";
const BG = "#141613";
const MUTED = "#848c65";

function createDitherPattern(
  context: CanvasRenderingContext2D,
  color1: string,
  color2: string,
): CanvasPattern | null {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 4, 4);
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, 2, 2);
  ctx.fillRect(2, 2, 2, 2);
  return context.createPattern(canvas, "repeat");
}

export function drawAuctionCanvas(
  canvas: HTMLCanvasElement,
  state: GameState,
  perspectivePlayerId: PlayerId,
  selectedItemId?: string,
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  canvas.width = 900;
  canvas.height = 560;
  context.imageSmoothingEnabled = false;
  drawBackdrop(context, canvas.width, canvas.height, state);

  const auction = state.auction;
  if (!auction) {
    drawCentered(context, "NO LOT ON THE FLOOR", canvas.width / 2, canvas.height / 2);
    return;
  }

  const layout = getLayout(canvas, state);
  drawGrid(context, auction.lot.grid.cols, auction.lot.grid.rows, layout);

  const ditherPattern = createDitherPattern(context, BG, MUTED) || BG;

  auction.lot.items.forEach((item) => {
    const catalog = getItem(item.catalogId);
    const known = itemIsKnownToPlayer(state, perspectivePlayerId, item.instanceId);
    const selected = item.instanceId === selectedItemId;
    const cells = shapeCells(catalog.shapeId);

    cells.forEach((cell) => {
      const x = layout.x + (item.x + cell.dx) * layout.cell;
      const y = layout.y + (item.y + cell.dy) * layout.cell;
      
      if (known) {
        context.fillStyle = FG;
        context.fillRect(x + 1, y + 1, layout.cell - 2, layout.cell - 2);
      } else {
        context.fillStyle = BG;
        context.fillRect(x + 1, y + 1, layout.cell - 2, layout.cell - 2);
        
        context.fillStyle = ditherPattern;
        context.fillRect(x + 1, y + 1, layout.cell - 2, layout.cell - 2);
      }
    });

    const size = shapeSize(catalog.shapeId);
    const labelX = layout.x + item.x * layout.cell + 5;
    const labelY = layout.y + item.y * layout.cell + Math.floor(layout.cell / 2) + 4;
    
    // Bounds stroke
    context.strokeStyle = selected ? FG : (known ? BG : FG);
    context.lineWidth = selected ? 4 : 2;
    if (selected && !known) {
        context.setLineDash([6, 6]);
    } else {
        context.setLineDash([]);
    }
    
    context.strokeRect(
      layout.x + item.x * layout.cell + 1,
      layout.y + item.y * layout.cell + 1,
      size.w * layout.cell - 2,
      size.h * layout.cell - 2,
    );
    context.setLineDash([]);

    context.fillStyle = known ? BG : FG;
    context.font = "bold 16px Courier New, monospace";
    context.fillText(known ? catalog.name.slice(0, 3).toUpperCase() : "?", labelX, labelY);
  });

  drawCanvasHud(context, canvas.width, auction.round, perspectivePlayerId);
}

export function findItemAtCanvasPoint(
  canvas: HTMLCanvasElement,
  state: GameState,
  clientX: number,
  clientY: number,
): string | undefined {
  const auction = state.auction;
  if (!auction) {
    return undefined;
  }
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const layout = getLayout(canvas, state);

  for (const item of [...auction.lot.items].reverse()) {
    const catalog = getItem(item.catalogId);
    const cells = shapeCells(catalog.shapeId);
    const hit = cells.some((cell) => {
      const cellX = layout.x + (item.x + cell.dx) * layout.cell;
      const cellY = layout.y + (item.y + cell.dy) * layout.cell;
      return (
        x >= cellX &&
        x <= cellX + layout.cell &&
        y >= cellY &&
        y <= cellY + layout.cell
      );
    });
    if (hit) {
      return item.instanceId;
    }
  }
  return undefined;
}

export function candidateNamesForItem(state: GameState, itemInstanceId?: string): string[] {
  const item = state.auction?.lot.items.find((entry) => entry.instanceId === itemInstanceId);
  if (!item) {
    return [];
  }
  const catalog = getItem(item.catalogId);
  return CATALOG_ITEMS.filter(
    (candidate) => candidate.silhouetteFamily === catalog.silhouetteFamily,
  )
    .map((candidate) => candidate.name)
    .slice(0, 5);
}

function getLayout(canvas: HTMLCanvasElement, state: GameState): Layout {
  const grid = state.auction?.lot.grid ?? { cols: 12, rows: 8 };
  const cell = Math.floor(Math.min((canvas.width - 100) / grid.cols, 390 / grid.rows));
  return {
    x: Math.floor((canvas.width - grid.cols * cell) / 2),
    y: 105,
    cell,
  };
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GameState,
): void {
  context.fillStyle = BG;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = FG;
  context.lineWidth = 2;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.strokeRect(14, 14, width - 28, height - 28);

  context.fillStyle = FG;
  context.font = "bold 32px Georgia, serif";
  context.fillText("BID OR BUST", 30, 60);

  context.beginPath();
  context.moveTo(30, 70);
  context.lineTo(width - 30, 70);
  context.stroke();

  context.font = "14px Courier New, monospace";
  context.fillText(
    `REFERENCE POOL: $${state.referenceLotValueRange[0]}-$${state.referenceLotValueRange[1]} | REALIZED: $${state.realizedValue}`,
    30,
    90,
  );
}

function drawGrid(
  context: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  layout: Layout,
): void {
  context.strokeStyle = FG;
  context.lineWidth = 1;
  
  context.strokeRect(
    layout.x - 4,
    layout.y - 4,
    cols * layout.cell + 8,
    rows * layout.cell + 8,
  );

  context.beginPath();
  for (let y = 0; y <= rows; y++) {
    context.moveTo(layout.x, layout.y + y * layout.cell);
    context.lineTo(layout.x + cols * layout.cell, layout.y + y * layout.cell);
  }
  for (let x = 0; x <= cols; x++) {
    context.moveTo(layout.x + x * layout.cell, layout.y);
    context.lineTo(layout.x + x * layout.cell, layout.y + rows * layout.cell);
  }
  
  context.setLineDash([2, 4]);
  context.stroke();
  context.setLineDash([]);
}

function drawCanvasHud(
  context: CanvasRenderingContext2D,
  width: number,
  round: number,
  perspectivePlayerId: PlayerId,
): void {
  context.fillStyle = BG;
  context.fillRect(width - 220, 24, 190, 65);
  context.strokeStyle = FG;
  context.lineWidth = 2;
  context.strokeRect(width - 220, 24, 190, 65);
  
  context.fillStyle = FG;
  context.font = "bold 18px Georgia, serif";
  context.fillText(`ROUND ${round} / 5`, width - 200, 50);
  context.font = "14px Courier New, monospace";
  context.fillText(`VIEW: ${perspectivePlayerId.toUpperCase()}`, width - 200, 72);
}

function drawCentered(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): void {
  context.fillStyle = FG;
  context.font = "bold 26px Georgia, serif";
  context.textAlign = "center";
  context.fillText(text, x, y);
  context.textAlign = "start";
}
