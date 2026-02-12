import Phaser from "phaser";

import { STATIC_MAP_ASCII } from "../data/static-map";

import { makeTextStyle } from "../config/constants";

import {
  draw,
  drawBorderBox,
} from "../utils/draw";

import { updateRegistryFromScale } from "../utils/registry";

const MAP_START_PCT = { x: 10, y: 12 };
const CONTROLS_START_PCT = { x: 65, y: 30 };

function drawMap(x_start_pct = 0, y_start_pct = 0) {
  
  // Determine drawable area
  const drawInnerAreaWidthInCells = this.registry.get("drawInnerAreaWidthInCells");
  const drawInnerAreaHeightInCells = this.registry.get("drawInnerAreaHeightInCells");
  
  // Calculate minimum dimensions of image
  const STATIC_MAP_STR = STATIC_MAP_ASCII.split("\n").slice(1, -1);
  const maxLineLength = STATIC_MAP_STR.reduce((max, line) => Math.max(max, line.length), 0);
  const STATIC_MAP_ARR = STATIC_MAP_STR.map(line => line.padEnd(maxLineLength, " ").split(""));
  const mapWidthInCells = STATIC_MAP_ARR[0].length;
  const mapHeightInCells = STATIC_MAP_ARR.length;
  
  const offsetX = Math.floor(drawInnerAreaWidthInCells * x_start_pct / 100);
  const offsetY = Math.floor(drawInnerAreaHeightInCells * y_start_pct / 100);

  // Canvas too small to draw image
  if (
    offsetX + mapWidthInCells > drawInnerAreaWidthInCells
    || offsetY + mapHeightInCells > drawInnerAreaHeightInCells
  ) return;

  this.buffer = Array.from({ length: drawInnerAreaHeightInCells }, () => Array(drawInnerAreaWidthInCells).fill(" "));

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

  const cellWidthPx = this.registry.get("cellWidthPx") || 1;
  const cellHeightPx = this.registry.get("cellHeightPx") || 1;
  draw.bind(this)(this.buffer.map(line => line.join("")).join("\n"), cellWidthPx, cellHeightPx);
}

function drawControlsUI(x_start_pct = 0, y_start_pct = 0) {
  const cellWidthPx = this.registry.get("cellWidthPx") || 1;
  const cellHeightPx = this.registry.get("cellHeightPx") || 1;
  const drawInnerAreaWidthInCells = this.registry.get("drawInnerAreaWidthInCells") || 0;
  const drawInnerAreaHeightInCells = this.registry.get("drawInnerAreaHeightInCells") || 0;

  const lines = [
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

  const offsetX = Math.floor(drawInnerAreaWidthInCells * x_start_pct / 100) * cellWidthPx;
  const offsetY = Math.floor(drawInnerAreaHeightInCells * y_start_pct / 100) * cellHeightPx;
  const content = lines.join("\n");
  draw.bind(this)(content, offsetX, offsetY, cellHeightPx * 0.2, makeTextStyle(this.registry.get("fontSizePx") * 1.5));
}

export default class StaticMap extends Phaser.Scene {
  constructor() {
    super("StaticMap");
  }

  create() {

    console.log("SCALE", this.scale)

    updateRegistryFromScale(this);
    this.render();

    this.scale.on("resize", () => {
      updateRegistryFromScale(this);
      this.render();
    });
  }

  render() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    drawBorderBox.bind(this)("Puzzle");
    drawMap.bind(this)(MAP_START_PCT.x, MAP_START_PCT.y);
    drawControlsUI.bind(this)(CONTROLS_START_PCT.x, CONTROLS_START_PCT.y);
  }
  
};