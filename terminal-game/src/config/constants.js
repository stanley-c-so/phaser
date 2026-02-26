import { STATIC_MAP_ASCII_3 } from "../data/static-map";
import { roundUpToMultiple } from "../utils/pure";

export const TARGET_ASPECT = { width: 4, height: 3 };

function deriveDiagramMinGrid() {
  const lines = STATIC_MAP_ASCII_3.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { cols: 0, rows: 0 };
  }
  const maxCols = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const rows = lines.length;
  return {
    cols: roundUpToMultiple(maxCols, 10),
    rows: roundUpToMultiple(rows, 10),
  };
}

export const DIAGRAM_MIN_GRID = deriveDiagramMinGrid();

export const EXTRA_MARGINS_IN_PX = {
  top: 50,
  bottom: 50,
  left: 0,
  right: 0,
};


export const COLORS = {
  BG: "#000000",
  TEXT: "#00ff00",
};

export const TEXT_STYLE_BASE = {
  fontFamily: "Consolas, 'Lucida Console', 'Courier New', 'Cascadia Mono', 'Cascadia Code', 'DejaVu Sans Mono', monospace",
  color: COLORS.TEXT,
};

export const TITLE_FONT_SCALE = 1.5;

export function makeTextStyle(cellSizePx) {
  return {
    ...TEXT_STYLE_BASE,
    fontSize: `${cellSizePx}px`,
    lineHeight: cellSizePx,
  };
}