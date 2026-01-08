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

  const topLine = TOP_LEFT
    + DASH.repeat(Math.floor((this.registry.get("drawAreaWidthInCells") - borderTitle.length) / 2) - 3)
    + BRACKET_LEFT + " "
    + borderTitle
    + " " + BRACKET_RIGHT
    + DASH.repeat(Math.ceil((this.registry.get("drawAreaWidthInCells") - borderTitle.length) / 2) - 3)
    + TOP_RIGHT;
  
  const bottomLine = BOTTOM_LEFT
    + DASH.repeat(this.registry.get("drawAreaWidthInCells") - 2)
    + BOTTOM_RIGHT;

  const lines = Array.from({length: this.registry.get("drawAreaHeightInCells")}, (_, i) => {
    if (i === 0) {
      return topLine;
    } else if (i < this.registry.get("drawAreaHeightInCells") - 1) {
      return "|" + " ".repeat(this.registry.get("drawAreaWidthInCells") - 2) + "|";
    } else {
      return bottomLine;
    }
  });

  this.add.text(MARGINS.left, MARGINS.top, lines.join("\n"), TEXT_STYLE);
};