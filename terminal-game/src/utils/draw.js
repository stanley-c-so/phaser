import {
  MARGINS,
  FONT_SIZE,
  COLORS,
  TEXT_STYLE,
} from '../config/constants';

const DASH = "─";
const TOP_LEFT = "┌";
const TOP_RIGHT = "┐";
const BOTTOM_LEFT = "└";
const BOTTOM_RIGHT = "┘";
const BRACKET_LEFT = "[";
const BRACKET_RIGHT = "]";

export function drawBorderBox(borderTitle) {

  const drawAreaWidthInCells = Math.floor((this.scale.width - MARGINS.left - MARGINS.right) / this.registry.get("cellW"));
  const drawAreaHeightInCells = Math.floor((this.scale.height - MARGINS.top - MARGINS.bottom) / this.registry.get("cellH"));

  const topLine = TOP_LEFT
    + DASH.repeat(Math.floor((drawAreaWidthInCells - borderTitle.length) / 2) - 3)
    + BRACKET_LEFT + " "
    + borderTitle
    + " " + BRACKET_RIGHT
    + DASH.repeat(Math.ceil((drawAreaWidthInCells - borderTitle.length) / 2) - 3)
    + TOP_RIGHT;
  
  const bottomLine = BOTTOM_LEFT
    + DASH.repeat(drawAreaWidthInCells - 2)
    + BOTTOM_RIGHT;

  const lines = Array.from({length: drawAreaHeightInCells}, (_, i) => {
    if (i === 0) {
      return topLine;
    } else if (i < drawAreaHeightInCells - 1) {
      return "|" + " ".repeat(drawAreaWidthInCells - 2) + "|";
    } else {
      return bottomLine;
    }
  });

  this.add.text(
    MARGINS.left,
    MARGINS.top,
    lines.join("\n"),
    TEXT_STYLE,
  );
};