export const DRAW_AREA_WIDTH_IN_CELLS = 160;
export const DRAW_AREA_HEIGHT_IN_CELLS = 50;

export const EXTRA_MARGINS_IN_PX = {
  top: 50,
  bottom: 50,
  left: 50,
  right: 50,
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