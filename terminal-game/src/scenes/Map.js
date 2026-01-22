import Phaser from "phaser";

import { MAP_DATA } from "../data/map";

import {
  roundUpToOdd,
  clamp,
} from "../utils/pure";

import {
  DASH,
  PIPE,
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  T_DOWN,
  T_UP,
  T_RIGHT,
  T_LEFT,
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

function drawLine(canvas, x1_at_scale_1, y1_at_scale_1, x2_at_scale_1, y2_at_scale_1, SCALE) {
  if (x1_at_scale_1 === x2_at_scale_1) {
    const a = Math.min(y1_at_scale_1, y2_at_scale_1);
    const b = Math.max(y1_at_scale_1, y2_at_scale_1);
    for (let y = a + 1; y < b; ++y) {
      drawAtScale(canvas, x1_at_scale_1, y, PIPE, SCALE);
    }
  } else if (y1_at_scale_1 === y2_at_scale_1) {
    const a = Math.min(x1_at_scale_1, x2_at_scale_1);
    const b = Math.max(x1_at_scale_1, x2_at_scale_1);
    for (let x = a + 1; x < b; ++x) {
      drawAtScale(canvas, x, y1_at_scale_1, DASH, SCALE);
    }
  }
}

function drawMap(x_start_pct = 0, x_end_pct = 100, y_start_pct = 0, y_end_pct = 100) {
  const drawInnerAreaWidthInCells = this.registry.get("drawInnerAreaWidthInCells");
  const drawInnerAreaHeightInCells = this.registry.get("drawInnerAreaHeightInCells");
  
  const maxCanvasWidthInCells = Math.floor(drawInnerAreaWidthInCells * (x_end_pct - x_start_pct) / 100);
  const maxCanvasHeightInCells = Math.floor(drawInnerAreaHeightInCells * (y_end_pct - y_start_pct) / 100);
  
  const pumpLabels = MAP_DATA.pumps.map(p => p.label);
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
  for (const pump of MAP_DATA.pumps) {
    const label = pump.label;
    if (pump.tanks.length > 1) {
      manifoldPumps.push(label);
    } else {
      if (pump.tanks[0] === 0) {
        tank1OnlyPumps.push(label);
      } else {
        tank2OnlyPumps.push(label);
      }
    }
    pipeBendCoordsByPump[label] = {
      tankToPump: null,
      pumpToTank: null,
    };
  }
  console.log("tank1OnlyPumps", tank1OnlyPumps)
  console.log("tank2OnlyPumps", tank2OnlyPumps)
  console.log("manifoldPumps", manifoldPumps)
  // console.log("pipeBendCoordsByPump", pipeBendCoordsByPump)
  for (let i = 0; i < tank1OnlyPumps.length; ++i) {
    const pumpLabel = pumpLabels[i];
    pipeBendCoordsByPump[pumpLabel].tankToPump = [MIN_TANK_WIDTH + 1 + 6 - 2*i, middleRow - MIN_TANK_HEIGHT + 1 + i];
    // drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1 + 6 - 2*i, middleRow - MIN_TANK_HEIGHT + 1 + i, ">", SCALE);
  }
  for (let i = 0; i < tank2OnlyPumps.length; ++i) {
    const pumpLabel = pumpLabels[numPumps - 1 - i];
    pipeBendCoordsByPump[pumpLabel].tankToPump = [MIN_TANK_WIDTH + 1 + 6 - 2*i, middleRow + MIN_TANK_HEIGHT - 1 - i];
    // drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1 + 6 - 2*i, middleRow + MIN_TANK_HEIGHT - 1 - i, ">", SCALE);
  }

  for (let i = 0; i < numPumps; ++i) {
    const pumpLabel = pumpLabels[i];
    if (i < Math.ceil(numPumps / 2)) {
      pipeBendCoordsByPump[pumpLabel].pumpToTank = [minWidthOfImage - 1 - 2 - 2*(Math.ceil(numPumps / 2) - 1 - i), middleRow - Math.floor(heightOfPumps / 2) + i * 2];
      // drawAtScale(templateBuffer, minWidthOfImage - 1 - 2 - 2*(Math.ceil(numPumps / 2) - 1 - i), middleRow - Math.floor(heightOfPumps / 2) + i * 2, "<", SCALE);
    } else {
      pipeBendCoordsByPump[pumpLabel].pumpToTank = [minWidthOfImage - 1 - 2 - 2*(i - Math.floor(numPumps / 2)), middleRow - Math.floor(heightOfPumps / 2) + i * 2];
      // drawAtScale(templateBuffer, minWidthOfImage - 1 - 2 - 2*(i - Math.floor(numPumps / 2)), middleRow - Math.floor(heightOfPumps / 2) + i * 2, "<", SCALE);
    }
  }

  console.log("pipeBendCoordsByPump", pipeBendCoordsByPump)

  // ... then, iterate through the pump data structure, and actually draw the stuff out

  // HEURISTIC:
  // if the pump's bend is closer to the middle than the tank's bend, the pipe should bend closer to the tank
  // if on the other hand the pump's bend is farther from the middle than the tank's bend, the pipe should bend closer to the pump
  // --> i think this is equivalent to saying, of the two corner choices where you could ultimately bend, always pick the one vertically closer to the middle

  for (const pumpLabel in pipeBendCoordsByPump) {
    if (pipeBendCoordsByPump[pumpLabel].pumpToTank === null
      || pipeBendCoordsByPump[pumpLabel].tankToPump === null
    ) {
      continue;
    }
    const [x1, y1] = pipeBendCoordsByPump[pumpLabel].tankToPump;
    const [x2, y2] = pipeBendCoordsByPump[pumpLabel].pumpToTank;
    if (Math.abs(y1 - middleRow) < Math.abs(y2 - middleRow)) {
      // console.log("CASE 1")
      drawLine(templateBuffer, MIN_TANK_WIDTH - 1, y1, x2, y1, SCALE);
      drawAtScale(templateBuffer, x2, y1, y1 === y2 ? DASH : y1 < middleRow ? BOTTOM_RIGHT : TOP_RIGHT, SCALE);
      drawLine(templateBuffer, x2, y1, x2, y2, SCALE);
      drawAtScale(templateBuffer, x2, y2, y1 === y2 ? DASH : y1 < middleRow ? TOP_LEFT : BOTTOM_LEFT, SCALE);
      drawLine(templateBuffer, x2, y2, minWidthOfImage - 1, y2, SCALE);
    } else {
      // console.log("CASE 2")
      drawLine(templateBuffer, MIN_TANK_WIDTH - 1, y1, x1, y1, SCALE);
      drawAtScale(templateBuffer, x1, y1, y1 === y2 ? DASH : y1 < middleRow ? TOP_RIGHT : BOTTOM_RIGHT, SCALE);
      drawLine(templateBuffer, x1, y1, x1, y2, SCALE);
      drawAtScale(templateBuffer, x1, y2, y1 === y2 ? DASH : y1 < middleRow ? BOTTOM_LEFT : TOP_LEFT, SCALE);
      drawLine(templateBuffer, x1, y2, minWidthOfImage - 1, y2, SCALE);
    }
  }

  // TODO: manifold pumps
  if (manifoldPumps.length) {
    const manifoldTop = middleRow - 2;
    const manifoldBottom = middleRow + 2;
    drawAtScale(templateBuffer, MIN_TANK_WIDTH, manifoldTop, DASH, SCALE);
    drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, manifoldTop, TOP_RIGHT, SCALE);
    drawAtScale(templateBuffer, MIN_TANK_WIDTH, manifoldBottom, DASH, SCALE);
    drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, manifoldBottom, BOTTOM_RIGHT, SCALE);
    drawLine(templateBuffer, MIN_TANK_WIDTH + 1, manifoldTop, MIN_TANK_WIDTH + 1, manifoldBottom, SCALE);

    // join up all the manifold pumps
    for (let i = 0; i < manifoldPumps.length; ++i) {
      const pumpLabel = manifoldPumps[i];
      const [x, y] = pipeBendCoordsByPump[pumpLabel].pumpToTank;
      drawAtScale(templateBuffer, minWidthOfImage - 2, y, DASH, SCALE);
      if (manifoldPumps.length === 1) {
        drawAtScale(templateBuffer, minWidthOfImage - 3, y, DASH, SCALE);
      } else if (i === 0) {
        drawAtScale(templateBuffer, minWidthOfImage - 3, y, TOP_LEFT, SCALE);
      } else if (i === manifoldPumps.length - 1) {
        drawAtScale(templateBuffer, minWidthOfImage - 3, y, BOTTOM_LEFT, SCALE);
      } else {
        drawAtScale(templateBuffer, minWidthOfImage - 3, y, T_RIGHT, SCALE);
      }
    }

    const yOfFirstManifoldPump = pipeBendCoordsByPump[manifoldPumps[0]].pumpToTank[1];
    const yOfLastManifoldPump = pipeBendCoordsByPump[manifoldPumps[manifoldPumps.length - 1]].pumpToTank[1];
    drawLine(templateBuffer, minWidthOfImage - 3, yOfFirstManifoldPump, minWidthOfImage - 3, yOfLastManifoldPump, SCALE);

    // EDGE CASE: LAST MANIFOLD PUMP IS ABOVE MANIFOLD TOP
    if (yOfLastManifoldPump < manifoldTop) {
      drawAtScale(templateBuffer, minWidthOfImage - 3, manifoldTop, BOTTOM_RIGHT, SCALE);
      drawAtScale(templateBuffer, minWidthOfImage - 3, yOfLastManifoldPump, TOP_LEFT, SCALE);
      drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, manifoldTop, T_DOWN, SCALE);
      drawLine(templateBuffer, minWidthOfImage - 3, manifoldTop, minWidthOfImage - 3, yOfLastManifoldPump, SCALE);
      drawLine(templateBuffer, MIN_TANK_WIDTH + 1, manifoldTop, minWidthOfImage - 3, manifoldTop, SCALE);
    }

    // EDGE CASE: FIRST MANIFOLD PUMP IS BELOW MANIFOLD BOTTOM
    else if (yOfFirstManifoldPump > manifoldBottom) {
      drawAtScale(templateBuffer, minWidthOfImage - 3, manifoldBottom, TOP_RIGHT, SCALE);
      drawAtScale(templateBuffer, minWidthOfImage - 3, yOfFirstManifoldPump, BOTTOM_LEFT, SCALE);
      drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, manifoldBottom, T_UP, SCALE);
      drawLine(templateBuffer, minWidthOfImage - 3, manifoldBottom, minWidthOfImage - 3, yOfFirstManifoldPump, SCALE);
      drawLine(templateBuffer, MIN_TANK_WIDTH + 1, manifoldBottom, minWidthOfImage - 3, manifoldBottom, SCALE);
    }

    else {
      let firstYValueInRangeOfManifold = null;
      let lastYValueInRangeOfManifold = null;
      for (let y = yOfFirstManifoldPump; y <= yOfLastManifoldPump; ++y) {
        const yInRangeOfManifold = manifoldTop <= y && y <= manifoldBottom;
        if (yInRangeOfManifold) {
          if (firstYValueInRangeOfManifold === null) {
            firstYValueInRangeOfManifold = y;
          }
          lastYValueInRangeOfManifold = y;
        }
      }
      if ([firstYValueInRangeOfManifold, lastYValueInRangeOfManifold].includes(null)) {
        throw new Error(`Somehow did not find y value in range of manifold.`);
      }
      const yOfManifoldToPumpLine = Math.floor((firstYValueInRangeOfManifold + lastYValueInRangeOfManifold) / 2);
      drawLine(templateBuffer, minWidthOfImage - 3, yOfFirstManifoldPump, minWidthOfImage - 3, yOfLastManifoldPump, SCALE);
      drawAtScale(templateBuffer, MIN_TANK_WIDTH + 1, yOfManifoldToPumpLine, yOfManifoldToPumpLine === manifoldTop ? T_DOWN : yOfManifoldToPumpLine === manifoldBottom ? T_UP : T_RIGHT, SCALE);
      drawAtScale(templateBuffer, minWidthOfImage - 3, yOfManifoldToPumpLine, manifoldPumps.length === 1 ? DASH : yOfManifoldToPumpLine === yOfFirstManifoldPump ? T_DOWN : yOfManifoldToPumpLine === yOfLastManifoldPump ? T_UP : T_LEFT, SCALE);
      drawLine(templateBuffer, MIN_TANK_WIDTH + 1, yOfManifoldToPumpLine, minWidthOfImage - 3, yOfManifoldToPumpLine, SCALE);
    }

  }


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