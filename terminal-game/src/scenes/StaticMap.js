import Phaser from "phaser";

import { STATIC_MAP_ASCII } from "../data/static-map";

import { EXTRA_MARGINS_IN_PX, TARGET_ASPECT, makeTextStyle } from "../config/constants";

import {
  draw,
  drawBorderBox,
} from "../utils/draw";

import { updateRegistryFromScale } from "../utils/registry";

const MAP_RECT_PCT = { x0: 0, y0: 0, x1: 55, y1: 100 };
const CONTROLS_RECT_PCT = { x0: 55, y0: 0, x1: 100, y1: 100 };
const CONTROLS_LINES = [
  "TOGGLE POWER ROUTER",
  "",
  "[ ] A  Primary Containment Seal",
  "[ ] B  Environmental Comfort Controls",
  "[ ] C  Administrative Data Archive",
  "[ ] D  Staff Decontamination Shower",
  "[ ] E  Inter-wing Power Relay",
  "[ ] F  Genomic Analysis Array",
  "[ ] G  Cryogenic Thermal Mass Stabilizer",
  "[ ] H  Antiviral Synthesis Reactor",
  "",
  "[ ] Toggle all junctions",
  "",
  "ENGAGE TRANSFER",
];

function measureControlsLayout(scene, controlsStyle, lines, lineSpacingPx) {
  if (!scene._controlsMeasureText) {
    scene._controlsMeasureText = scene.add.text(0, 0, "", controlsStyle).setVisible(false);
    scene._controlsMeasureText.setResolution(1);
  }

  const fontSize = controlsStyle.fontSize || "";
  const cacheKey = `${fontSize}|${lineSpacingPx}|${lines.join("\n")}`;
  if (scene._controlsMeasureCache?.key === cacheKey) {
    return scene._controlsMeasureCache.value;
  }

  const measureText = scene._controlsMeasureText;
  measureText.setStyle(controlsStyle);
  measureText.setLineSpacing(lineSpacingPx);

  const longestLine = lines.reduce((longest, line) => (line.length > longest.length ? line : longest), "");
  measureText.setText(longestLine);
  const highlightWidth = Math.ceil(measureText.width);

  measureText.setText(lines.join("\n"));
  const totalLines = Math.max(1, lines.length);
  const lineStepPx = measureText.height / totalLines;
  const highlightHeight = Math.max(1, Math.round(lineStepPx));

  const value = { highlightWidth, lineStepPx, highlightHeight };
  scene._controlsMeasureCache = { key: cacheKey, value };
  return value;
}

function rectPctToPx(rectPct, parentRectPx) {
  const x0 = Math.round(parentRectPx.x + parentRectPx.width * rectPct.x0 / 100);
  const x1 = Math.round(parentRectPx.x + parentRectPx.width * rectPct.x1 / 100);
  const y0 = Math.round(parentRectPx.y + parentRectPx.height * rectPct.y0 / 100);
  const y1 = Math.round(parentRectPx.y + parentRectPx.height * rectPct.y1 / 100);
  return {
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  };
}

function drawLayoutDebug(parentRectPx, mapRectPct, controlsRectPct) {
  const mapRectPx = rectPctToPx(mapRectPct, parentRectPx);
  const controlsRectPx = rectPctToPx(controlsRectPct, parentRectPx);
  const drawAreaRect = this.registry.get("drawAreaRect");
  const gridOriginPx = this.registry.get("gridOriginPx") || { x: 0, y: 0 };
  const toUiRect = (rect) => ({
    x: Math.round(rect.x - gridOriginPx.x),
    y: Math.round(rect.y - gridOriginPx.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
  const fitRectWithMarginsPx = drawAreaRect ? { ...drawAreaRect } : null;
  const viewportW = this.scale.width;
  const viewportH = this.scale.height;
  const aspect = TARGET_ASPECT.width / TARGET_ASPECT.height;
  let rawFitW = viewportW;
  let rawFitH = Math.floor(rawFitW / aspect);
  if (rawFitH > viewportH) {
    rawFitH = viewportH;
    rawFitW = Math.floor(rawFitH * aspect);
  }
  const rawFitRectPx = {
    x: Math.floor((viewportW - rawFitW) / 2),
    y: Math.floor((viewportH - rawFitH) / 2),
    width: Math.max(0, rawFitW),
    height: Math.max(0, rawFitH),
  };
  const graphics = this.add.graphics();
  if (fitRectWithMarginsPx) {
    graphics.lineStyle(1, 0xff0000, 0.5);
    const uiRect = toUiRect(fitRectWithMarginsPx);
    graphics.strokeRect(uiRect.x, uiRect.y, uiRect.width, uiRect.height);
  }
  graphics.lineStyle(1, 0xffffff, 0.4);
  const rawUiRect = toUiRect(rawFitRectPx);
  graphics.strokeRect(rawUiRect.x, rawUiRect.y, rawUiRect.width, rawUiRect.height);
  graphics.lineStyle(1, 0xff00ff, 0.6);
  graphics.strokeRect(parentRectPx.x, parentRectPx.y, parentRectPx.width, parentRectPx.height);
  graphics.lineStyle(1, 0x00ffff, 0.6);
  graphics.strokeRect(mapRectPx.x, mapRectPx.y, mapRectPx.width, mapRectPx.height);
  graphics.lineStyle(1, 0xffff00, 0.6);
  graphics.strokeRect(controlsRectPx.x, controlsRectPx.y, controlsRectPx.width, controlsRectPx.height);
  this.ui.add(graphics);
}

function drawMap({ parentRectPx, rectPct = MAP_RECT_PCT } = {}) {
  const cellWidthPx = this.registry.get("cellWidthPx") || 1;
  const cellHeightPx = this.registry.get("cellHeightPx") || 1;
  const fallbackWidth = this.registry.get("drawAreaWidthInCells") || 1;
  const fallbackHeight = this.registry.get("drawAreaHeightInCells") || 1;
  const resolvedParentRectPx = parentRectPx || {
    x: 0,
    y: 0,
    width: Math.round(fallbackWidth * cellWidthPx),
    height: Math.round(fallbackHeight * cellHeightPx),
  };

  const parentWidthInCells = Math.max(1, Math.floor(resolvedParentRectPx.width / cellWidthPx));
  const parentHeightInCells = Math.max(1, Math.floor(resolvedParentRectPx.height / cellHeightPx));
  
  // Calculate minimum dimensions of image
  const STATIC_MAP_STR = STATIC_MAP_ASCII.split("\n").slice(1, -1);
  const maxLineLength = STATIC_MAP_STR.reduce((max, line) => Math.max(max, line.length), 0);
  const STATIC_MAP_ARR = STATIC_MAP_STR.map(line => line.padEnd(maxLineLength, " ").split(""));
  const mapWidthInCells = STATIC_MAP_ARR[0].length;
  const mapHeightInCells = STATIC_MAP_ARR.length;
  
  const rectPx = rectPctToPx(rectPct, resolvedParentRectPx);
  const rect = {
    x: Math.floor((rectPx.x - resolvedParentRectPx.x) / cellWidthPx),
    y: Math.floor((rectPx.y - resolvedParentRectPx.y) / cellHeightPx),
    width: Math.floor(rectPx.width / cellWidthPx),
    height: Math.floor(rectPx.height / cellHeightPx),
  };
  const offsetX = rect.x + Math.max(0, Math.floor((rect.width - mapWidthInCells) / 2));
  const offsetY = rect.y + Math.max(0, Math.floor((rect.height - mapHeightInCells) / 2));

  // Canvas too small to draw image
  if (
    offsetX + mapWidthInCells > rect.x + rect.width
    || offsetY + mapHeightInCells > rect.y + rect.height
  ) return;

  this.buffer = Array.from({ length: parentHeightInCells }, () => Array(parentWidthInCells).fill(" "));

  const FILLED_CHAR = "▓";
  const EMPTY_CHAR = "░";
  const batteries = {};
  const switches = {};
  const utilities = {};
  const junctions = [];

  for (let row = 0; row < mapHeightInCells; ++row) {
    for (let col = 0; col < mapWidthInCells; ++col) {
      const ch = STATIC_MAP_ARR[row][col];

      // Junctions are represented by "/" and "\" characters, and indicate where electricity can flow between adjacent cells.
      if (ch === "/" || ch === "\\") {
        junctions.push({ row, col, char: ch });
      }
      
      // Batteries are represented by digits, with a 3x4 block of cells below them representing their charge level.
      else if (ch >= "0" && ch <= "9") {
        const startRow = row + 1;
        const startCol = col - 1;
        let level = 0;
        let capacity = 0;
        for (let r = 0; r < 4; ++r) {
          const cell = STATIC_MAP_ARR[startRow + r][startCol];
          if (cell === FILLED_CHAR) level += 1;
          capacity += 1;
        }
        batteries[ch] = {
          anchor: { row: startRow, col: startCol },
          level,
          capacity,
        };
      }
      
      // Switches are represented by lowercase letters, with an arrow adjacent to them representing their direction.
      else if (ch >= "a" && ch <= "z") {
        const arrowRow = row + 2;
        const arrowCol = col;
        const arrow = STATIC_MAP_ARR[arrowRow][arrowCol] || " ";
        switches[ch] = {
          anchor: { row: arrowRow, col: arrowCol },
          direction: arrow,
        };
      }
      
      // Utilities are represented by uppercase letters, with a horizontal sequence of blocks to the right of them representing their capacity and current level.
      else if (ch >= "A" && ch <= "Z") {
        let idx = col + 1;
        while (idx < mapWidthInCells && STATIC_MAP_ARR[row][idx] === " ") idx += 1;
        // let units = 0;
        let level = 0;
        let capacity = 0;
        while (idx + 2 < mapWidthInCells) {
          // let unitFilled = 0;
          // for (let i = 0; i < 3; ++i) {
          //   const cell = STATIC_MAP_ARR[row][idx + i];
          //   if (cell === FILLED_CHAR) unitFilled += 1;
          //   if (cell === FILLED_CHAR || cell === EMPTY_CHAR) capacity += 1;
          // }
          const cell = STATIC_MAP_ARR[row][idx];
          if (cell === FILLED_CHAR) level += 1;
          if (cell === FILLED_CHAR || cell === EMPTY_CHAR) capacity += 1;
          if (level === 0 && STATIC_MAP_ARR[row][idx] !== EMPTY_CHAR) break;
          idx += 3;
          if (STATIC_MAP_ARR[row][idx] === " ") idx += 1;
        }
        utilities[ch] = {
          anchor: { row, col },
          level,
          capacity,
        };
      }
    }
  }

  this.parsedStaticMap = { batteries, switches, utilities, junctions };
  // console.log("YOOOO", this.parsedStaticMap)

  // // ANCHORS DIAGNOSTIC
  // const markAnchor = (anchor) => {
  //   if (!anchor) return;
  //   if (anchor.row < 0 || anchor.row >= mapHeightInCells) return;
  //   if (anchor.col < 0 || anchor.col >= mapWidthInCells) return;
  //   STATIC_MAP_ARR[anchor.row][anchor.col] = "X";
  // };
  // Object.values(this.parsedStaticMap.batteries).forEach((entry) => markAnchor(entry.anchor));
  // Object.values(this.parsedStaticMap.switches).forEach((entry) => markAnchor(entry.anchor));
  // Object.values(this.parsedStaticMap.utilities).forEach((entry) => markAnchor(entry.anchor));
  // this.parsedStaticMap.junctions.forEach((entry) => markAnchor(entry));

  this.mapBounds = {
    x: offsetX,
    y: offsetY,
    width: mapWidthInCells,
    height: mapHeightInCells,
  };

  for (let row = 0; row < mapHeightInCells; ++row) {
    for (let col = 0; col < mapWidthInCells; ++col) {
      const c = STATIC_MAP_ARR[row][col];
      this.buffer[row + offsetY][col + offsetX] = c;
    }
  }

  // // DIMENSIONS DIAGNOSTIC
  // const height = this.buffer.length;
  // const width = this.buffer[0]?.length || 0;
  // for (let row = 0; row < height; ++row) {
  //   for (let col = 0; col < width; ++col) {
  //     this.buffer[row][col] = ".";
  //   }
  // }
  // for (let col = 0; col < width; ++col) {
  //   this.buffer[0][col] = String(col % 10);
  // }
  // for (let row = 0; row < height; ++row) {
  //   this.buffer[row][0] = String(row % 10);
  // }

  draw.bind(this)(this.buffer.map(line => line.join("")).join("\n"), {
    offsetXPx: resolvedParentRectPx.x,
    offsetYPx: resolvedParentRectPx.y,
  });
}

function drawControlsUI({ parentRectPx, rectPct = CONTROLS_RECT_PCT } = {}) {
  const cellWidthPx = this.registry.get("cellWidthPx") || 1;
  const cellHeightPx = this.registry.get("cellHeightPx") || 1;
  const fallbackWidth = this.registry.get("drawAreaWidthInCells") || 1;
  const fallbackHeight = this.registry.get("drawAreaHeightInCells") || 1;
  const resolvedParentRectPx = parentRectPx || {
    x: 0,
    y: 0,
    width: Math.round(fallbackWidth * cellWidthPx),
    height: Math.round(fallbackHeight * cellHeightPx),
  };
  const baseFontSizePx = this.registry.get("fontSizePx") || 1;
  const activeIndex = this.controlsActiveIndex ?? 0;

  const rectPx = rectPctToPx(rectPct, resolvedParentRectPx);

  const getMaxLineWidthPx = (sizePx, lineSpacingPx) => {
    if (!this._controlsMeasureText) {
      this._controlsMeasureText = this.add.text(0, 0, "", makeTextStyle(1)).setVisible(false);
      this._controlsMeasureText.setResolution(1);
    }
    const measureText = this._controlsMeasureText;
    measureText.setStyle(makeTextStyle(sizePx));
    measureText.setLineSpacing(lineSpacingPx);
    let maxWidth = 0;
    for (const line of CONTROLS_LINES) {
      measureText.setText(line);
      maxWidth = Math.max(maxWidth, Math.ceil(measureText.width));
    }
    return maxWidth;
  };

  const fitControlsFontSize = (startPx) => {
    let sizePx = Math.max(1, Math.floor(startPx));
    while (sizePx > 1) {
      const lineSpacingPx = Math.max(0, Math.floor(sizePx * 0.2));
      const { lineStepPx } = measureControlsLayout(this, makeTextStyle(sizePx), CONTROLS_LINES, lineSpacingPx);
      const totalHeightPx = Math.round(lineStepPx * CONTROLS_LINES.length);
      const maxLineWidthPx = getMaxLineWidthPx(sizePx, lineSpacingPx);
      if (maxLineWidthPx <= rectPx.width && totalHeightPx <= rectPx.height) {
        break;
      }
      sizePx -= 1;
    }
    return sizePx;
  };

  const controlsFontSizePx = fitControlsFontSize(baseFontSizePx * 1.5);
  const controlsStyle = makeTextStyle(controlsFontSizePx);
  const lineSpacingPx = Math.max(0, Math.floor(controlsFontSizePx * 0.2));
  const { highlightWidth, lineStepPx, highlightHeight } = measureControlsLayout(this, controlsStyle, CONTROLS_LINES, lineSpacingPx);
  const totalHeightPx = Math.round(lineStepPx * CONTROLS_LINES.length);
  const baseX = Math.round(rectPx.x);
  const centeredY = rectPx.y + Math.max(0, Math.floor((rectPx.height - totalHeightPx) / 2));
  const baseY = Math.round(centeredY);
  const highlightY = Math.round(baseY + activeIndex * lineStepPx);
  const clampedHighlightWidth = Math.min(highlightWidth, Math.max(0, rectPx.width));

  const highlight = this.add.rectangle(baseX, highlightY, clampedHighlightWidth, highlightHeight, 0x003300).setOrigin(0, 0);
  this.ui.add(highlight);

  const content = CONTROLS_LINES.join("\n");
  draw.bind(this)(content, {
    offsetXPx: baseX,
    offsetYPx: baseY,
    lineSpacing: lineSpacingPx,
    textStyle: controlsStyle,
  });
}

export default class StaticMap extends Phaser.Scene {
  constructor() {
    super("StaticMap");
  }

  create() {

    console.log("SCALE", this.scale)

    updateRegistryFromScale(this);
    this.controlsActiveIndex = 0;
    this.input.keyboard.on("keydown-UP", () => {
      const count = CONTROLS_LINES.length;
      this.controlsActiveIndex = (this.controlsActiveIndex - 1 + count) % count;
      this.render();
    });
    this.input.keyboard.on("keydown-DOWN", () => {
      const count = CONTROLS_LINES.length;
      this.controlsActiveIndex = (this.controlsActiveIndex + 1) % count;
      this.render();
    });
    this.input.keyboard.on("keydown-Q", () => {
      const current = this.registry.get("debugLayout") ?? false;
      this.registry.set("debugLayout", !current);
      this.render();
    });
    this.render();

    this.scale.on("resize", () => {
      updateRegistryFromScale(this);
      this.render();
    });
  }

  render() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);
    const gridOriginPx = this.registry.get("gridOriginPx") || { x: 0, y: 0 };
    this.ui.setPosition(gridOriginPx.x, gridOriginPx.y);

    const { innerRectPx } = drawBorderBox.bind(this)("Puzzle");
    if (this.registry.get("debugLayout")) {
      drawLayoutDebug.bind(this)(innerRectPx, MAP_RECT_PCT, CONTROLS_RECT_PCT);
    }
    drawMap.bind(this)({ parentRectPx: innerRectPx, rectPct: MAP_RECT_PCT });
    drawControlsUI.bind(this)({ parentRectPx: innerRectPx, rectPct: CONTROLS_RECT_PCT });
  }
  
};