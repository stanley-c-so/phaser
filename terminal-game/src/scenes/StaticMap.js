import Phaser from "phaser";

import { STATIC_MAP_ASCII } from "../data/static-map";

import { makeTextStyle } from "../config/constants";

import {
  draw,
  drawBorderBox,
} from "../utils/draw";

import { drawLayoutDebug } from "../utils/debug";

import { updateRegistryFromScale } from "../utils/registry";

const MAP_RECT_PCT = { x0: 0, y0: 0, x1: 55, y1: 100 };
const CONTROLS_RECT_PCT = { x0: 55, y0: 0, x1: 98, y1: 100 };
const CONTROLS_COLORS = {
  header: "#0FAE5A",
  bracket: "#0B7A3A",
  entity: "#6BFF9C",
  label: "#0FAE5A",
  action_primary: "#00FF88",
  action_secondary: "#FFFF00",
  active_utility: "#6BFF9C",
};

const MAP_COLORS = {
  default: "#559900",
  label: "#6BFF9C",
  arrow: "#FFFF00",
  junction: "#FFFF00",
  battery: "#CCCC00",
};

const CONTROLS_LINES = [
  {
    tokens: [{ text: "Select active utility and transfer direction:", color: CONTROLS_COLORS.header }],
    selectable: false,
  },
  { tokens: [], selectable: false },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "A  ", color: CONTROLS_COLORS.entity },
      { text: "Primary Containment Seal", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "A",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "B  ", color: CONTROLS_COLORS.entity },
      { text: "Environmental Comfort Controls", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "B",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "C  ", color: CONTROLS_COLORS.entity },
      { text: "Administrative Data Archive", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "C",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "D  ", color: CONTROLS_COLORS.entity },
      { text: "Staff Decontamination Shower", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "D",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "E  ", color: CONTROLS_COLORS.entity },
      { text: "Inter-wing Power Relay", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "E",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "F  ", color: CONTROLS_COLORS.entity },
      { text: "Genomic Analysis Array", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "F",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "G  ", color: CONTROLS_COLORS.entity },
      { text: "Cryogenic Thermal Mass Stabilizer", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "G",
  },
  {
    tokens: [
      { text: "( ) ", color: CONTROLS_COLORS.bracket },
      { text: "H  ", color: CONTROLS_COLORS.entity },
      { text: "Antiviral Synthesis Reactor", color: CONTROLS_COLORS.label },
    ],
    selectable: true,
    utilityId: "H",
  },
  { tokens: [], selectable: false },
  {
    tokens: [
      { text: "[ Toggle all junctions ]", color: CONTROLS_COLORS.action_secondary },
    ],
    selectable: true,
    action: "toggle_junctions",
  },
  { tokens: [], selectable: false },
  {
    tokens: [
      { text: "[ Toggle all switches ]", color: CONTROLS_COLORS.action_secondary },
    ],
    selectable: true,
    action: "toggle_switches",
  },
  { tokens: [], selectable: false },
  {
    tokens: [{ text: "[ ENGAGE TRANSFER ]", color: CONTROLS_COLORS.action_primary }],
    selectable: true,
  },
];

function isSelectableControlLine(line) {
  return Boolean(line?.selectable);
}

function getNextSelectableIndex(lines, startIndex, direction) {
  const count = lines.length;
  let index = startIndex;
  for (let i = 0; i < count; i += 1) {
    index = (index + direction + count) % count;
    if (isSelectableControlLine(lines[index])) {
      return index;
    }
  }
  return startIndex;
}

function normalizeSelectableIndex(lines, index) {
  if (isSelectableControlLine(lines[index])) {
    return index;
  }
  return getNextSelectableIndex(lines, index, 1);
}

function getMeasureText(scene, controlsStyle) {
  if (!scene._controlsMeasureText) {
    scene._controlsMeasureText = scene.add.text(0, 0, "", controlsStyle).setVisible(false);
    scene._controlsMeasureText.setResolution(1);
  }
  return scene._controlsMeasureText;
}

function getMapMeasureText(scene, textStyle) {
  if (!scene._mapMeasureText) {
    scene._mapMeasureText = scene.add.text(0, 0, "", textStyle).setVisible(false);
    scene._mapMeasureText.setResolution(1);
  }
  return scene._mapMeasureText;
}

function measureTokenLineWidth(scene, controlsStyle, tokens) {
  const measureText = getMeasureText(scene, controlsStyle);
  measureText.setStyle(controlsStyle);
  measureText.setLineSpacing(0);
  let width = 0;
  for (const token of tokens) {
    measureText.setText(token.text);
    width += Math.ceil(measureText.width);
  }
  return width;
}

function measureLineStepPx(scene, controlsStyle, lineSpacingPx) {
  const measureText = getMeasureText(scene, controlsStyle);
  measureText.setStyle(controlsStyle);
  measureText.setLineSpacing(lineSpacingPx);
  measureText.setText("M\nM");
  return measureText.height / 2;
}

function measureControlsLayout(scene, controlsStyle, lines, lineSpacingPx) {
  const fontSize = controlsStyle.fontSize || "";
  const cacheKey = `${fontSize}|${lineSpacingPx}|${lines.length}`;
  if (scene._controlsMeasureCache?.key === cacheKey) {
    return scene._controlsMeasureCache.value;
  }

  const lineStepPx = measureLineStepPx(scene, controlsStyle, lineSpacingPx);
  let maxLineWidth = 0;
  for (const line of lines) {
    const width = measureTokenLineWidth(scene, controlsStyle, line.tokens || []);
    maxLineWidth = Math.max(maxLineWidth, width);
  }
  const highlightHeight = Math.max(1, Math.round(lineStepPx));

  const value = { maxLineWidth, lineStepPx, highlightHeight };
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

function isArrowChar(ch) {
  return ch === ">" || ch === "<";
}

function isJunctionChar(ch) {
  return ch === "/" || ch === "\\";
}

function isBatteryChar(ch) {
  return ch === "▓" || ch === "░";
}

function isLabelChar(ch) {
  return (ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
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

  const baseX = Math.round(resolvedParentRectPx.x);
  const baseY = Math.round(resolvedParentRectPx.y);
  const mapTextStyle = this.registry.get("textStyle") || makeTextStyle(1);

  const junctionChar = this.junctionDirection === "down" ? "┌" : "└";
  const arrowChar = this.switchDirection === "left" ? "<" : ">";

  const toLayer = (predicate) => (
    this.buffer.map((row) => row.map(
      (ch) => (predicate(ch) ? ch : " ")
    ).join("")).join("\n")
  );

  const baseLayer = this.buffer.map((row) => row.map((ch) => {
    if (isArrowChar(ch)) return " ";
    if (isJunctionChar(ch)) return " ";
    if (isBatteryChar(ch)) return " ";
    if (isLabelChar(ch)) return " ";
    return ch;
  }).join("")).join("\n");

  const drawLayer = (content, style) => {
    if (!content || !content.trim()) return;
    draw.bind(this)(content, {
      offsetXPx: baseX,
      offsetYPx: baseY,
      textStyle: { ...mapTextStyle, ...style },
    });
  };

  drawLayer(baseLayer, { color: MAP_COLORS.default });
  drawLayer(
    toLayer(isJunctionChar).replace(/[\\/]/g, junctionChar),
    { color: MAP_COLORS.junction, fontStyle: "bold" }
  );
  drawLayer(
    toLayer(isArrowChar).replace(/[<>]/g, arrowChar),
    { color: MAP_COLORS.arrow, fontStyle: "bold" }
  );
  drawLayer(toLayer(isBatteryChar), { color: MAP_COLORS.battery });
  drawLayer(toLayer(isLabelChar), { color: MAP_COLORS.label });
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
  const normalizedActiveIndex = normalizeSelectableIndex(CONTROLS_LINES, this.controlsActiveIndex ?? 0);
  const activeUtilityId = this.activeUtilityId || "A";

  const rectPx = rectPctToPx(rectPct, resolvedParentRectPx);

  const fitControlsFontSize = (startPx) => {
    let sizePx = Math.max(1, Math.floor(startPx));
    while (sizePx > 1) {
      const lineSpacingPx = Math.max(0, Math.floor(sizePx * 0.2));
      const { lineStepPx, maxLineWidth } = measureControlsLayout(this, makeTextStyle(sizePx), CONTROLS_LINES, lineSpacingPx);
      const totalHeightPx = Math.round(lineStepPx * CONTROLS_LINES.length);
      if (maxLineWidth <= rectPx.width && totalHeightPx <= rectPx.height) {
        break;
      }
      sizePx -= 1;
    }
    return sizePx;
  };

  const controlsFontSizePx = fitControlsFontSize(baseFontSizePx * 1.5);
  const controlsStyle = makeTextStyle(controlsFontSizePx);
  const lineSpacingPx = Math.max(0, Math.floor(controlsFontSizePx * 0.2));
  const { maxLineWidth, lineStepPx, highlightHeight } = measureControlsLayout(this, controlsStyle, CONTROLS_LINES, lineSpacingPx);
  const totalHeightPx = Math.round(lineStepPx * CONTROLS_LINES.length);
  const baseX = Math.round(rectPx.x);
  const centeredY = rectPx.y + Math.max(0, Math.floor((rectPx.height - totalHeightPx) / 2));
  const baseY = Math.round(centeredY);
  const highlightY = Math.round(baseY + normalizedActiveIndex * lineStepPx);
  const activeLineWidth = measureTokenLineWidth(this, controlsStyle, CONTROLS_LINES[normalizedActiveIndex]?.tokens || []);
  const clampedHighlightWidth = Math.min(activeLineWidth || maxLineWidth, Math.max(0, rectPx.width));

  const highlight = this.add.rectangle(baseX, highlightY, clampedHighlightWidth, highlightHeight, 0x003300).setOrigin(0, 0);
  this.ui.add(highlight);

  for (let i = 0; i < CONTROLS_LINES.length; i += 1) {
    const line = CONTROLS_LINES[i];
    const lineY = Math.round(baseY + i * lineStepPx);
    let cursorX = baseX;
    const isActiveUtility = line.utilityId && line.utilityId === activeUtilityId;
    for (let tokenIndex = 0; tokenIndex < (line.tokens || []).length; tokenIndex += 1) {
      const token = line.tokens[tokenIndex];
      let tokenColor = token.color || controlsStyle.color;
      let tokenTextValue = token.text;
      if (line.utilityId && tokenIndex === 0) {
        tokenTextValue = line.utilityId === activeUtilityId ? "(x) " : "( ) ";
      }
      if (isActiveUtility) {
        tokenColor = CONTROLS_COLORS.active_utility;
      }
      const tokenStyle = { ...controlsStyle, color: tokenColor };
      const tokenText = draw.bind(this)(tokenTextValue, {
        offsetXPx: cursorX,
        offsetYPx: lineY,
        textStyle: tokenStyle,
      });
      if (tokenText) {
        cursorX += Math.ceil(tokenText.width);
      }
    }
  }
}

export default class StaticMap extends Phaser.Scene {
  constructor() {
    super("StaticMap");
  }

  create() {

    // console.log("SCALE", this.scale)

    updateRegistryFromScale(this);
    this.switchDirection = "right";
    this.junctionDirection = "up";
    this.activeUtilityId = "A";
    this.controlsActiveIndex = normalizeSelectableIndex(CONTROLS_LINES, 0);
    this.input.keyboard.on("keydown-UP", () => {
      this.controlsActiveIndex = getNextSelectableIndex(CONTROLS_LINES, this.controlsActiveIndex, -1);
      this.render();
      // console.log("this.controlsActiveIndex", this.controlsActiveIndex);
    });
    this.input.keyboard.on("keydown-DOWN", () => {
      this.controlsActiveIndex = getNextSelectableIndex(CONTROLS_LINES, this.controlsActiveIndex, 1);
      this.render();
      // console.log("this.controlsActiveIndex", this.controlsActiveIndex);
    });
    this.input.keyboard.on("keydown-ENTER", () => {
      const activeLine = CONTROLS_LINES[this.controlsActiveIndex];
      if (activeLine?.utilityId) {
        this.activeUtilityId = activeLine.utilityId;
        this.render();
        return;
      }
      if (activeLine?.action === "toggle_junctions") {
        this.junctionDirection = this.junctionDirection === "up" ? "down" : "up";
        this.render();
        return;
      }
      if (activeLine?.action === "toggle_switches") {
        this.switchDirection = this.switchDirection === "right" ? "left" : "right";
        this.render();
      }
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

    const { innerRectPx } = drawBorderBox.bind(this)("Power Puzzle");
    if (this.registry.get("debugLayout")) {
      drawLayoutDebug(this, innerRectPx, MAP_RECT_PCT, CONTROLS_RECT_PCT);
    }
    drawMap.bind(this)({ parentRectPx: innerRectPx, rectPct: MAP_RECT_PCT });
    drawControlsUI.bind(this)({ parentRectPx: innerRectPx, rectPct: CONTROLS_RECT_PCT });
  }
  
};