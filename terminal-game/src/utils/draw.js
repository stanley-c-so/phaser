import {
  MARGINS,
  TEXT_STYLE,
} from "../config/constants";

const DASH = "─";
const TOP_LEFT = "┌";
const TOP_RIGHT = "┐";
const BOTTOM_LEFT = "└";
const BOTTOM_RIGHT = "┘";
const BRACKET_LEFT = "[";
const BRACKET_RIGHT = "]";

export function drawBorderBox(borderTitle) {

  const topLeftDashCount = Math.floor((this.registry.get("drawAreaWidthInCells") - borderTitle.length) / 2) - 3;
  const topRightDashCount = Math.ceil((this.registry.get("drawAreaWidthInCells") - borderTitle.length) / 2) - 3;
  if (topLeftDashCount <= 0) return;
  const verticalLineCount = this.registry.get("drawAreaWidthInCells") - 2;
  if (verticalLineCount < 0) return;

  const topLine = TOP_LEFT
    + DASH.repeat(topLeftDashCount)
    + BRACKET_LEFT + " "
    + borderTitle
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
      return "|" + " ".repeat(verticalLineCount) + "|";
    } else {
      return bottomLine;
    }
  });

  this.ui.add(this.add.text(MARGINS.left, MARGINS.top, lines.join("\n"), TEXT_STYLE));
};

export function drawBuffer() {
  this.ui.add(
    this.add.text(
      MARGINS.left + this.registry.get("cellW"),
      MARGINS.top + this.registry.get("cellH"),
      this.buffer.map(line => line.join("")).join("\n"),
      TEXT_STYLE
    )
  );
}