import {
  MARGINS,
  FONT_SIZE,
  COLORS,
} from '../config/constants';

const DASH = "─";
const TOP_LEFT = "┌";
const TOP_RIGHT = "┐";
const BOTTOM_LEFT = "└";
const BOTTOM_RIGHT = "┘";

export function initStyle() {
  const textStyle = {
    fontFamily: 'monospace',
    fontSize: FONT_SIZE,
    color: COLORS.TEXT,
  };

  const probeText = this.add.text(0, 0, "", textStyle).setVisible(false);
  const samples = 200;
  const probeChar = "M";
  probeText.setText(probeChar.repeat(samples));
  const cellW = probeText.width / samples;
  probeText.setText(probeChar + "\n" + probeChar);
  const cellH = probeText.height / 2;

  return {
    textStyle,
    cellW,
    cellH,
  };
};

export function borderText(cellW, cellH, borderTitle) {

  const drawAreaWidthInCells = Math.floor((this.scale.width - MARGINS.left - MARGINS.right) / cellW);
  const drawAreaHeightInCells = Math.floor((this.scale.height - MARGINS.top - MARGINS.bottom) / cellH);

  // console.log(`cellW ${cellW}`)
  // console.log(`cellH ${cellH}`)
  
  // console.log(`drawAreaWidthInCells ${drawAreaWidthInCells}`)
  // console.log(`drawAreaHeightInCells ${drawAreaHeightInCells}`)

  const topLine = TOP_LEFT
    + DASH.repeat(Math.floor((drawAreaWidthInCells - borderTitle.length) / 2) - 1)
    + borderTitle
    + DASH.repeat(Math.ceil((drawAreaWidthInCells - borderTitle.length) / 2) - 1)
    + TOP_RIGHT;
  
  const bottomLine = BOTTOM_LEFT
    + DASH.repeat(drawAreaWidthInCells - 2)
    + BOTTOM_RIGHT;

  const lines = [];
  lines.push(topLine);
  for (let i = 0; i < drawAreaHeightInCells - 2; ++i) {
    lines.push("|" + " ".repeat(drawAreaWidthInCells - 2) + "|");
  }
  lines.push(bottomLine);

  return lines.join("\n");
};