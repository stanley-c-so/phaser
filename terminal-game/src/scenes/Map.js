import Phaser from "phaser";

import { MAP_DATA } from "../data/map";

import {
  roundUpToOdd,
  clamp,
} from "../utils/pure";

import {
  drawBorderBox,
  remakeBuffer,
  drawBuffer,
  putStr,
} from "../utils/draw";

function bufferColumnHeaders(headers) {
  const columnWidth = Math.floor(this.registry.get("drawInnerAreaWidthInCells") / headers.length);

  // No-draw if any header exceeds columnWidth
  for (let i = 0; i < headers.length; ++i) {
    if (headers[i].length > columnWidth) {
      this.buffer = [];
      return;
    }
  }

  // Draw the headers
  for (let i = 0; i < headers.length; ++i) {
    const offset = Math.floor((columnWidth - headers[i].length) / 2);
    putStr(
      this.buffer,
      i * columnWidth + offset,
      1,
      headers[i].toUpperCase(),
    );
  }
}

function drawAtScale(canvas, x_at_scale_1, y_at_scale_1, c, SCALE) {
  const anchorX = x_at_scale_1 * SCALE;
  const anchorY = y_at_scale_1 * SCALE;
  for (let dy = 0; dy < SCALE; ++dy) {
    for (let dx = 0; dx < SCALE; ++dx) {
      canvas[anchorY + dy][anchorX + dx] = c;
    }
  }
}

function drawMap(x_start_pct = 0, x_end_pct = 100, y_start_pct = 0, y_end_pct = 100) {
  const drawInnerAreaWidthInCells = this.registry.get("drawInnerAreaWidthInCells");
  const drawInnerAreaHeightInCells = this.registry.get("drawInnerAreaHeightInCells");
  
  const maxCanvasWidthInCells = Math.floor(drawInnerAreaWidthInCells * (x_end_pct - x_start_pct) / 100);
  const maxCanvasHeightInCells = Math.floor(drawInnerAreaHeightInCells * (y_end_pct - y_start_pct) / 100);
  
  const pumpLabels = Object.keys(MAP_DATA.pumps);
  const numPumps = pumpLabels.length;
  const heightOfPumps = numPumps * 2 - 1;

  const MIN_TANK_WIDTH = 7;     // arbitrary
  const MIN_TANK_HEIGHT = 6;    // tank top and bottom, plus 4 layers of liquid
  const MIN_WIDTH_PIPES = 16;   // staggered pipe connections
  
  const minWidthOfImage = MIN_WIDTH_PIPES + MIN_TANK_WIDTH;
  const minHeightOfImage = roundUpToOdd(                       // this must be odd
                            Math.max(MIN_TANK_HEIGHT * 2 + 1,  // if the tanks take up more vertical space
                                    heightOfPumps)             // if the pumps take up more vertical space
                            );
  
  if (
    maxCanvasWidthInCells < minWidthOfImage
    || maxCanvasHeightInCells < minHeightOfImage
  ) return;

  // console.log("minWidthOfImage", minWidthOfImage)
  // console.log("minHeightOfImage", minHeightOfImage)
  const SCALE = Math.min(
    Math.floor(maxCanvasWidthInCells / minWidthOfImage),
    Math.floor(maxCanvasHeightInCells / minHeightOfImage),
  );
  console.log(`SCALE: ${SCALE}`);

  const canvasWidthInCells = SCALE * minWidthOfImage;
  const canvasHeightInCells = SCALE * minHeightOfImage;

  const templateBuffer = Array.from({length: canvasHeightInCells}, () => Array(canvasWidthInCells).fill(" "));

  // // draw corner markers
  // templateBuffer[0][0] = SCALE;
  // templateBuffer[0][canvasWidthInCells - 1] = SCALE;
  // templateBuffer[canvasHeightInCells - 1][0] = SCALE;
  // templateBuffer[canvasHeightInCells - 1][canvasWidthInCells - 1] = SCALE;

  const middleRow = Math.floor(minHeightOfImage / 2);

  // draw pumps
  for (let i = 0; i < numPumps; ++i) {
    const pumpLabel = pumpLabels[i];
    drawAtScale(templateBuffer, minWidthOfImage - 1, middleRow - Math.floor(heightOfPumps / 2) + i * 2, pumpLabel, SCALE);
  }
  
  // draw top tank
  drawAtScale(templateBuffer, 0, middleRow - MIN_TANK_HEIGHT, "┌", SCALE);
  drawAtScale(templateBuffer, MIN_TANK_WIDTH - 1, middleRow - MIN_TANK_HEIGHT, "┐", SCALE);
  drawAtScale(templateBuffer, 0, middleRow - 1, "└", SCALE);
  drawAtScale(templateBuffer, MIN_TANK_WIDTH - 1, middleRow - 1, "┘", SCALE);
  for (let i = 0; i < MIN_TANK_HEIGHT - 2; ++i) {
    drawAtScale(templateBuffer, 0, middleRow - MIN_TANK_HEIGHT + 1 + i, "│", SCALE);
  }
  for (let i = 0; i < MIN_TANK_HEIGHT - 2; ++i) {
    drawAtScale(templateBuffer, MIN_TANK_WIDTH - 1, middleRow - MIN_TANK_HEIGHT + 1 + i, "│", SCALE);
  }
  for (let i = 0; i < MIN_TANK_WIDTH - 2; ++i) {
    drawAtScale(templateBuffer, 1 + i, middleRow - MIN_TANK_HEIGHT, "─", SCALE);
  }
  for (let i = 0; i < MIN_TANK_WIDTH - 2; ++i) {
    drawAtScale(templateBuffer, 1 + i, middleRow - 1, "─", SCALE);
  }
  drawAtScale(templateBuffer, Math.floor((MIN_TANK_WIDTH - 2) / 2) + 1, middleRow - MIN_TANK_HEIGHT, MAP_DATA.tanks[0], SCALE);

  // draw bottom tank
  drawAtScale(templateBuffer, 0, middleRow + 1, "┌", SCALE);
  drawAtScale(templateBuffer, MIN_TANK_WIDTH - 1, middleRow + 1, "┐", SCALE);
  drawAtScale(templateBuffer, 0, middleRow + MIN_TANK_HEIGHT, "└", SCALE);
  drawAtScale(templateBuffer, MIN_TANK_WIDTH - 1, middleRow + MIN_TANK_HEIGHT, "┘", SCALE);
  for (let i = 0; i < MIN_TANK_HEIGHT - 2; ++i) {
    drawAtScale(templateBuffer, 0, middleRow + 2 + i, "│", SCALE);
  }
  for (let i = 0; i < MIN_TANK_HEIGHT - 2; ++i) {
    drawAtScale(templateBuffer, MIN_TANK_WIDTH - 1, middleRow + 2 + i, "│", SCALE);
  }
  for (let i = 0; i < MIN_TANK_WIDTH - 2; ++i) {
    drawAtScale(templateBuffer, 1 + i, middleRow + 1, "─", SCALE);
  }
  for (let i = 0; i < MIN_TANK_WIDTH - 2; ++i) {
    drawAtScale(templateBuffer, 1 + i, middleRow + MIN_TANK_HEIGHT, "─", SCALE);
  }
  drawAtScale(templateBuffer, Math.floor((MIN_TANK_WIDTH - 2) / 2) + 1, middleRow + 1, MAP_DATA.tanks[1], SCALE);
  

  // draw critical pipe bend points
  const tank1OnlyPumps = [];
  const tank2OnlyPumps = [];
  const manifoldPumps = [];
  const pipeBendCoordsByPump = {};
  for (const label of pumpLabels) {
    if (MAP_DATA.pumps[label].length > 1) {
      // ++manifold;
      manifoldPumps.push(label);
    } else {
      if (MAP_DATA.pumps[label][0] === 0) {
        // ++numTank1Only;
        tank1OnlyPumps.push(label);
      } else {
        // ++numTank2Only;
        tank2OnlyPumps.push(label);
      }
    }
    pipeBendCoordsByPump[label] = {
      tankToPump: null,
      pump: null,
    };
  }
  console.log("tank1OnlyPumps", tank1OnlyPumps)
  console.log("tank2OnlyPumps", tank2OnlyPumps)
  console.log("manifoldPumps", manifoldPumps)
  for (let i = 0; i < tank1OnlyPumps.length; ++i) {

    // instead,
    // build a data structure before this loop for pump label --> tank pipe bend and pump pipe bend coords
    // iterate through tank1OnlyPumps to get the pump labels
    // figure out the tank pipe bend coords with math
    // ... see below 

    drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1 + 6 - 2*i, middleRow - MIN_TANK_HEIGHT + 1 + i, ">", SCALE);
  }
  for (let i = 0; i < tank2OnlyPumps.length; ++i) {
    drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1 + 6 - 2*i, middleRow + MIN_TANK_HEIGHT - 1 - i, ">", SCALE);
  }

  for (let i = 0; i < Math.ceil(numPumps / 2); ++i) {
    // ... cont'd from above
    // then, iterate through the pumps to get the pump label
    // figure out the pump pipe bend coords with math

    drawAtScale(templateBuffer, minWidthOfImage - 1 - 2 - 2*(Math.ceil(numPumps / 2) - 1 - i), middleRow - Math.floor(heightOfPumps / 2) + i * 2, "<", SCALE);
  }
  for (let i = Math.ceil(numPumps / 2); i < numPumps; ++i) {
    drawAtScale(templateBuffer, minWidthOfImage - 1 - 2 - 2*(i - Math.floor(numPumps / 2)), middleRow - Math.floor(heightOfPumps / 2) + i * 2, "<", SCALE);
  }
  if (manifoldPumps.length) {
    drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, middleRow - 2, "M", SCALE);
    drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, middleRow + 2, "M", SCALE);
  }

  // ... then, iterate through the pump data structure, and actually draw the stuff out

  // HEURISTIC:
  // if the pump's bend is closer to the middle than the tank's bend, the pipe should bend closer to the tank
  // if on the other hand the pump's bend is farther from the middle than the tank's bend, the pipe should bend closer to the pump
  // --> i think this is equivalent to saying, of the two corner choices where you could ultimately bend, always pick the one vertically closer to the middle

  // // draw maxCanvas corner markers
  // const maxCanvasL = clamp(Math.floor(drawInnerAreaWidthInCells * x_start_pct / 100), 0, drawInnerAreaWidthInCells - 1);
  // const maxCanvasR = clamp(Math.floor(drawInnerAreaWidthInCells * x_end_pct / 100), 0, drawInnerAreaWidthInCells - 1);
  // const maxCanvasU = clamp(Math.floor(drawInnerAreaHeightInCells * y_start_pct / 100), 0, drawInnerAreaHeightInCells - 1);
  // const maxCanvasD = clamp(Math.floor(drawInnerAreaHeightInCells * y_end_pct / 100), 0, drawInnerAreaHeightInCells - 1);
  // this.buffer[maxCanvasU][maxCanvasL] = "X";
  // this.buffer[maxCanvasU][maxCanvasR] = "X";
  // this.buffer[maxCanvasD][maxCanvasL] = "X";
  // this.buffer[maxCanvasD][maxCanvasR] = "X";

  const bufferTranslationOffsetX = Math.floor(drawInnerAreaWidthInCells * x_start_pct / 100 + (maxCanvasWidthInCells - canvasWidthInCells) / 2);
  const bufferTranslationOffsetY = Math.floor(drawInnerAreaHeightInCells * y_start_pct / 100 + (maxCanvasHeightInCells - canvasHeightInCells) / 2);
  for (let row = 0; row < canvasHeightInCells; ++row) {
    for (let col = 0; col < canvasWidthInCells; ++col) {
      this.buffer[clamp(row + bufferTranslationOffsetY, 0, drawInnerAreaHeightInCells - 1)][clamp(col + bufferTranslationOffsetX, 0, drawInnerAreaWidthInCells - 1)] = templateBuffer[row][col];
    }
  }

  // diagnostic
  console.log(templateBuffer.map(line => line.join("")).join("\n"))
}

export default class Map extends Phaser.Scene {
  constructor() {
    super("Map");
  }

  create() {

    this.scale.on("resize", () => {
      // console.log("RESIZE");
      this.registry.get("resize").bind(this)();

      // recalculate buffer state
      if (remakeBuffer.bind(this)()) {
        drawMap.bind(this)();
        // drawMap.bind(this)(5, 75, 5, 100);
      }

      this.render();
    });
  }

  render() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    drawBorderBox.bind(this)("pump room");
    drawBuffer.bind(this)();
  }
  
};