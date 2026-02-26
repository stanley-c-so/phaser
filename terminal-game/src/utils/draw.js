import { COLORS, TITLE_FONT_SCALE, makeTextStyle } from "../config/constants";

export const DASH = "─";
export const PIPE = "│";
export const TOP_LEFT = "┌";
export const TOP_RIGHT = "┐";
export const BOTTOM_LEFT = "└";
export const BOTTOM_RIGHT = "┘";
export const BRACKET_LEFT = "[";
export const BRACKET_RIGHT = "]";

// T junctions
export const T_DOWN = "┬";        // ┬  (like an upside-down T)
export const T_UP = "┴";          // ┴  (like a T)
export const T_RIGHT = "├";       // ├  (T pointing right)
export const T_LEFT = "┤";        // ┤  (T pointing left)

// // Optional: full intersection
// export const CROSS = "┼";         // ┼

/*

TANKS TO PUMPS

15 rows, (16 + w) cols where w is width of tank

              x───────A
┌──1──┐
│█████│───────x x─────B          1 (computer)
│█████│─────x
│█████│───x       x───C          2 (phone)
│█████│─x
└─────┘             x─D          3 (display)
        x─────x                 
┌──2──┐             x─E          4 (the thing that connects to both)
│█████│─x
│█████│───x       x───F          5 (power bank)
│█████│─────x
│█████│───────x x─────G          6 (virus analyzer)
└─────┘
              x───────H

PUMPS TO UTILITIES

stage 1: ezpz: 1 tank only, just move everything from all devices to one device. have an excess remain just to demonstrate how it works
stage 2: i need to move shit from device to tank 2 to device that connects to both to tank 1 to the final thing
stage 3: add a new tank, and now the numbers matter


*/

export function draw(
  content,
  {
    offsetXPx = 0,
    offsetYPx = 0,
    lineSpacing = 0,
    textStyle = this.registry.get("textStyle") || makeTextStyle(1),
  } = {}
) {
  // When drawing inside a scaled container, positions are already relative to the container origin.
  // The container handles margin positioning, so we don't apply marginsPx here.
  const x = Math.round(offsetXPx);
  const y = Math.round(offsetYPx);
  const text = this.add.text(x, y, content, textStyle);
  text.setResolution(1);
  if (lineSpacing !== undefined) text.setLineSpacing(Math.round(lineSpacing));
  this.ui.add(text);
  return text;
}

export function drawBorderBox(borderTitle) {
  const widthInCells = this.registry.get("layoutWidthInCells") || this.registry.get("drawAreaWidthInCells");
  const heightInCells = this.registry.get("drawAreaHeightInCells");
  const cellWidthPx = this.registry.get("cellWidthPx") || 1;
  const cellHeightPx = this.registry.get("cellHeightPx") || 1;
  const outerWidthPx = Math.max(0, Math.round(this.registry.get("gridWidthPx") || (widthInCells * cellWidthPx)));
  const outerHeightPx = Math.max(0, Math.round(this.registry.get("gridHeightPx") || (heightInCells * cellHeightPx)));
  const textStyle = this.registry.get("textStyle") || makeTextStyle(1);
  const baseFontSize = parseInt(textStyle.fontSize, 10) || 1;
  const titleFontSize = Math.max(1, Math.round(baseFontSize * TITLE_FONT_SCALE));
  const titleTextStyle = makeTextStyle(titleFontSize);
  titleTextStyle.color = textStyle.color;
  const strokeColor = typeof textStyle.color === "string"
    ? parseInt(textStyle.color.replace("#", ""), 16)
    : 0x00ff00;

  const graphics = this.add.graphics();
  graphics.lineStyle(1, strokeColor, 1);
  graphics.strokeRect(0.5, 0.5, Math.max(0, outerWidthPx - 1), Math.max(0, outerHeightPx - 1));
  this.ui.add(graphics);

  const titleBlock = BRACKET_LEFT + " " + borderTitle.toUpperCase() + " " + BRACKET_RIGHT;
  const titleText = draw.bind(this)(titleBlock, { textStyle: titleTextStyle });
  if (titleText) {
    const titleX = Math.round((outerWidthPx - titleText.width) / 2);
    const titleY = Math.round(-titleText.height / 2);
    const paddingX = 4;
    const paddingY = 2;
    const bg = this.add.graphics();
    bg.fillStyle(parseInt(COLORS.BG.replace("#", ""), 16), 1);
    bg.fillRect(
      Math.round(titleX - paddingX),
      Math.round(titleY + paddingY),
      Math.round(titleText.width + paddingX * 2),
      Math.round(titleText.height - paddingY * 2)
    );
    this.ui.add(bg);
    titleText.setPosition(titleX, titleY);
    this.ui.bringToTop(titleText);
  }

  const outerRectPx = {
    x: 0,
    y: 0,
    width: outerWidthPx,
    height: outerHeightPx,
  };
  const innerRectPx = {
    x: Math.round(cellWidthPx),
    y: Math.round(cellHeightPx),
    width: Math.max(0, Math.round(outerWidthPx - 2 * cellWidthPx)),
    height: Math.max(0, Math.round(outerHeightPx - 2 * cellHeightPx)),
  };

  return { outerRectPx, innerRectPx };
}