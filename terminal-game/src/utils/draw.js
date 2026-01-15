import {
  MARGINS_IN_PX,
  TEXT_STYLE,
} from "../config/constants";

const DASH = "─";
const PIPE = "│";
const TOP_LEFT = "┌";
const TOP_RIGHT = "┐";
const BOTTOM_LEFT = "└";
const BOTTOM_RIGHT = "┘";
const BRACKET_LEFT = "[";
const BRACKET_RIGHT = "]";

// T junctions
const T_DOWN = "┬";        // ┬  (like an upside-down T)
const T_UP = "┴";          // ┴  (like a T)
const T_RIGHT = "├";       // ├  (T pointing right)
const T_LEFT = "┤";        // ┤  (T pointing left)

// Optional: full intersection
const CROSS = "┼";         // ┼

/*

15 rows, (16 + w) cols where w is width of tank

              x───────A
┌─────┐
│█████│───────x x─────B
│█████│─────x
│█████│───x       x───C
│█████│─x
└─────┘             x─D
        x─────x
┌─────┐             x─E
│█████│─x
│█████│───x       x───F
│█████│─────x
│█████│───────x x─────G
└─────┘
              x───────H

*/

export function drawBorderBox(borderTitle) {

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

  this.ui.add(this.add.text(MARGINS_IN_PX.left, MARGINS_IN_PX.top, lines.join("\n"), TEXT_STYLE));
};

export function drawBuffer() {
  this.ui.add(
    this.add.text(
      MARGINS_IN_PX.left + this.registry.get("cellW"),
      MARGINS_IN_PX.top + this.registry.get("cellH"),
      this.buffer.map(line => line.join("")).join("\n"),
      TEXT_STYLE
    )
  );
}