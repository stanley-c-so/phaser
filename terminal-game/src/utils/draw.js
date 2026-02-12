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

export function draw(content, offsetXPx = 0, offsetYPx = 0, lineSpacing = 0, textStyle = this.registry.get("textStyle") || makeTextStyle(1)) {
  const marginsPx = this.registry.get("marginsPx") || { left: 0, top: 0 };
  const text = this.add.text(marginsPx.left + offsetXPx, marginsPx.top + offsetYPx, content, textStyle);
  if (lineSpacing !== undefined) text.setLineSpacing(Math.max(0, lineSpacing));
  this.ui.add(text);
}

export function drawBorderBox(borderTitle) {
  // const textStyle = this.registry.get("textStyle") || makeTextStyle(1);
  // const marginsPx = this.registry.get("marginsPx") || { left: 0, top: 0 };

  const topLeftDashCount = Math.floor((this.registry.get("drawAreaWidthInCells") - borderTitle.length) / 2) - 3;
  const topRightDashCount = Math.ceil((this.registry.get("drawAreaWidthInCells") - borderTitle.length) / 2) - 3;
  if (topLeftDashCount <= 0) return;
  const verticalLineCount = this.registry.get("drawAreaWidthInCells") - 2;
  if (verticalLineCount < 0) return;

  const topLine = TOP_LEFT
    + DASH.repeat(topLeftDashCount)
    + BRACKET_LEFT + " "
    + borderTitle.toUpperCase()
    + " " + BRACKET_RIGHT
    + DASH.repeat(topRightDashCount)
    + TOP_RIGHT;
  
  const bottomLine = BOTTOM_LEFT
    + DASH.repeat(this.registry.get("drawAreaWidthInCells") - 2)
    + BOTTOM_RIGHT;

  const lines = Array.from({length: this.registry.get("drawAreaHeightInCells")}, (_, i) => {
    if (i === 0) {
      return topLine;
    } else if (i < this.registry.get("drawAreaHeightInCells") - 1) {
      return PIPE + " ".repeat(verticalLineCount) + PIPE;
    } else {
      return bottomLine;
    }
  });

  draw.bind(this)(lines.join("\n"));
};

export function remakeBuffer() {
  const bufferHeightInCells = this.registry.get("drawInnerAreaHeightInCells");
  const bufferWidthInCells = this.registry.get("drawInnerAreaWidthInCells");
  if (bufferHeightInCells <= 0 || bufferWidthInCells <= 0) {
    return false;
  }
  this.buffer = Array.from(
    {length: bufferHeightInCells},
    () => Array(bufferWidthInCells).fill(" ")
  );
  return true;
}

export function drawBuffer() {
  const cellWidthPx = this.registry.get("cellWidthPx") || 1;
  const cellHeightPx = this.registry.get("cellHeightPx") || 1;
  draw.bind(this)(this.buffer.map(line => line.join("")).join("\n"), cellWidthPx, cellHeightPx);
}

export function putStr(buffer, x, y, str) {
  const ROW_LIMIT = buffer.length;
  const COL_LIMIT = buffer[0].length;
  if (y < 0 || y >= ROW_LIMIT) return;
  if (x + str.length - 1 >= COL_LIMIT) return;
  for (let i = 0; i < str.length; ++i) {
    const xx = x + i;
    buffer[y][xx] = str[i];
  }
}