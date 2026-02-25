export const TARGET_ASPECT = { width: 4, height: 3 };
export const DIAGRAM_MIN_GRID = { cols: 70, rows: 40 };

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
  fontFamily: "Cascadia Mono, Cascadia Code, Consolas, 'DejaVu Sans Mono', monospace",
  color: COLORS.TEXT,
};

export function makeTextStyle(cellSizePx) {
  return {
    ...TEXT_STYLE_BASE,
    fontSize: `${cellSizePx}px`,
    lineHeight: cellSizePx,
  };
}