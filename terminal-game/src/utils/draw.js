import { makeTextStyle } from "../config/constants";

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
  if (lineSpacing !== undefined) text.setLineSpacing(Math.max(0, Math.round(lineSpacing)));
  this.ui.add(text);
  return text;
}

export function drawBorderBox(borderTitle) {
  const widthInCells = this.registry.get("layoutWidthInCells") || this.registry.get("drawAreaWidthInCells");
  const heightInCells = this.registry.get("drawAreaHeightInCells");

  const titleBlock = BRACKET_LEFT + " " + borderTitle.toUpperCase() + " " + BRACKET_RIGHT;
  const totalDashCount = widthInCells - 2 - titleBlock.length;
  const topLeftDashCount = Math.floor(totalDashCount / 2);
  const topRightDashCount = totalDashCount - topLeftDashCount;
  if (topLeftDashCount <= 0 || topRightDashCount <= 0) return;
  const verticalLineCount = widthInCells - 2;
  if (verticalLineCount < 0) return;

  const topLine = TOP_LEFT
    + DASH.repeat(topLeftDashCount)
    + titleBlock
    + DASH.repeat(topRightDashCount)
    + TOP_RIGHT;

  const bottomLine = BOTTOM_LEFT
    + DASH.repeat(widthInCells - 2)
    + BOTTOM_RIGHT;

  const lines = Array.from({length: heightInCells}, (_, i) => {
    if (i === 0) {
      return topLine;
    } else if (i < heightInCells - 1) {
      return PIPE + " ".repeat(verticalLineCount) + PIPE;
    } else {
      return bottomLine;
    }
  });

  const text = draw.bind(this)(lines.join("\n"));
  const textWidth = Math.max(0, Math.round(text?.width || 0));
  const textHeight = Math.max(0, Math.round(text?.height || 0));
  const glyphWidth = widthInCells > 0 ? textWidth / widthInCells : 0;
  const glyphHeight = heightInCells > 0 ? textHeight / heightInCells : 0;

  const outerRectPx = {
    x: 0,
    y: 0,
    width: textWidth,
    height: textHeight,
  };
  const innerRectPx = {
    x: Math.round(glyphWidth),
    y: Math.round(glyphHeight),
    width: Math.max(0, Math.round(textWidth - 2 * glyphWidth)),
    height: Math.max(0, Math.round(textHeight - 2 * glyphHeight)),
  };

  return { outerRectPx, innerRectPx };
}