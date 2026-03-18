import Phaser from "phaser";

import {
  MAP_STATE_1,
} from "../data/static-map";
import { makeTextStyle } from "../config/constants";
import { draw, drawBorderBox } from "../utils/draw";
import { drawLayoutDebug } from "../utils/debug";
import { updateRegistryFromScale } from "../utils/registry";

const MAP_RECT_PCT = { x0: 0, y0: 0, x1: 100, y1: 90 };
const STATUS_RECT_PCT = { x0: 0, y0: 90, x1: 100, y1: 100 };

const UTILITY_LABELS = {
  A: "Label A",
  B: "Label B",
  C: "Label C",
  D: "Label D",
  E: "Label E",
  F: "Label F",
  G: "Label G",
  H: "Label H",
  I: "Label I",
};

const UI_NUMBERS = {
  strokeWidth: 1,
  strokeAlpha: 1,
  strokeInsetPx: 0.5,
  strokeReductionPx: 1,
  baseFontPxFallback: 12,
  minBodyFontPx: 10,
  minTitleFontPx: 10,
  titleFontScale: 0.95,
  bodyFontScale: 0.9,
  lineStepScale: 1.2,
  minLineStepPx: 14,
  panelTextOffsetXPx: 10,
  panelTitleOffsetYPx: 8,
  panelBodyStartYPx: 34,
  controlsBlockOffsetYPx: 16,
  controlsItemStepPx: 18,
  statusBottomOffsetPx: 24,
  batteryColumnRatio: 0.28,
  batteryBodyWidthPx: 34,
  batteryTopPaddingRatio: 0.12,
  batteryGapRatio: 0.2,
  batteryMinGapPx: 24,
  batterySegmentGapPx: 3,
  batteryBodyCornerRadiusPx: 8,
  batterySegmentCornerRadiusPx: 4,
  batteryFillAlpha: 0.5,
  batteryFillInsetPx: 1,
  batteryFillReductionPx: 2,
  utilityLineGapBeforeCellsPx: 14,
  batterySlotCount: 4,
  batterySlotInsetPx: 12,
  batteryLabelOffsetPx: 14,
  batteryLabelOffsetYPx: 18,
  utilityColumnRatio: 0.58,
  utilityTopPaddingRatio: 0.16,
  utilityBottomPaddingRatio: 0.12,
  utilityMinRowGapPx: 28,
  utilityCellSizePx: 22,
  utilityCellGapPx: 10,
  utilityCellCornerRadiusPx: 3,
  utilityLabelOffsetXPx: 26,
  utilityLabelOffsetYPx: 2,
  utilityFillAlpha: 0.5,
  utilityFallbackTopPaddingRatio: 0.16,
  utilityLineWidthPx: 1,
  statusMessageOffsetRatio: 0.55,
  statusInfoOffsetXPx: 120,
  statusInfoOffsetYPx: 10,
};

const UI_COLORS = {
  header: "#0FAE5A",
  body: "#6BFF9C",
  accent: "#00FFFF",
  subtle: "#4A8F68",
};

const CONTROL_ITEMS = [
  { id: "select_source", label: "Select source" },
  { id: "select_target", label: "Select target" },
  { id: "transfer", label: "Initiate transfer" },
];

function rectPctToPx(rectPct, parentRectPx) {
  const x0 = Math.round(parentRectPx.x + (parentRectPx.width * rectPct.x0) / 100);
  const x1 = Math.round(parentRectPx.x + (parentRectPx.width * rectPct.x1) / 100);
  const y0 = Math.round(parentRectPx.y + (parentRectPx.height * rectPct.y0) / 100);
  const y1 = Math.round(parentRectPx.y + (parentRectPx.height * rectPct.y1) / 100);
  return {
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  };
}

function createInitialGameState() {
  const batteryState = Object.fromEntries(
    Object.entries(MAP_STATE_1.batteries || {}).map(([id, spec]) => [
      id,
      { level: spec.level, capacity: spec.capacity },
    ])
  );
  const utilityState = Object.fromEntries(
    Object.entries(MAP_STATE_1.utilities || {}).map(([id, spec]) => [
      id,
      { level: spec.level, capacity: spec.capacity },
    ])
  );

  return {
    stage: 1,
    mode: "pick_source",
    selectedControlIndex: 0,
    cursor: { side: "left", index: 0 },
    sourceSelection: null,
    targetSelection: null,
    transferStatus: { message: "Slice 1 scaffold ready", type: "ok" },
    junctionDirection: "up",
    batteries: batteryState,
    utilities: utilityState,
    connections: {
      up: MAP_STATE_1.connections?.up || {},
      down: MAP_STATE_1.connections?.down || {},
    },
    debugLayout: false,
  };
}

function reduceGameState(state, intent) {
  if (!intent || !intent.type) {
    return state;
  }

  const payload = intent.payload || {};

  switch (intent.type) {
    case "TOGGLE_DEBUG_LAYOUT": {
      return {
        ...state,
        debugLayout: !state.debugLayout,
      };
    }

    // case "MOVE_CONTROL_SELECTION": {
    //   const direction = payload.direction === "up" ? -1 : 1;
    //   const N = CONTROL_ITEMS.length;
    //   const next = (state.selectedControlIndex + direction + N) % N;
    //   return {
    //     ...state,
    //     selectedControlIndex: next,
    //   };
    // }

    // case "ACTIVATE_CONTROL": {
    //   const active = CONTROL_ITEMS[state.selectedControlIndex];
    //   if (!active) {
    //     return state;
    //   }
    //   if (active.id === "transfer") {
    //     return {
    //       ...state,
    //       transferStatus: {
    //         message: "Transfer flow is coming in Slice 4",
    //         type: "ok",
    //       },
    //     };
    //   }
    //   if (active.id === "select_source") {
    //     return {
    //       ...state,
    //       mode: "pick_source",
    //       transferStatus: {
    //         message: "Source selection mode",
    //         type: "ok",
    //       },
    //     };
    //   }
    //   if (active.id === "select_target") {
    //     return {
    //       ...state,
    //       mode: "pick_target",
    //       transferStatus: {
    //         message: "Target selection mode",
    //         type: "ok",
    //       },
    //     };
    //   }
    //   return state;
    // }

    default:
      return state;
  }
}

function buildBatteryShapes(state, mapRect) {
  const batteryEntries = Object.entries(state.batteries || {}).sort(
    ([a], [b]) => Number(a) - Number(b)
  );
  if (batteryEntries.length === 0) {
    return [];
  }

  const segCount = UI_NUMBERS.batterySlotCount;
  const segGap = UI_NUMBERS.batterySegmentGapPx;
  const segH = UI_NUMBERS.utilityCellSizePx;
  const bodyW = UI_NUMBERS.batteryBodyWidthPx;
  const bodyH = (segCount * segH) + ((segCount + 1) * segGap);
  const x = mapRect.x + Math.round(mapRect.width * UI_NUMBERS.batteryColumnRatio);
  const startY = mapRect.y + Math.round(mapRect.height * UI_NUMBERS.batteryTopPaddingRatio);

  const availableH = mapRect.height - (startY - mapRect.y);
  const gap = Math.max(UI_NUMBERS.batteryMinGapPx, Math.round(bodyH * UI_NUMBERS.batteryGapRatio));
  const totalH = batteryEntries.length * bodyH + (batteryEntries.length - 1) * gap;
  const yOffset = Math.max(0, Math.round((availableH - totalH) / 2));

  return batteryEntries.map(([id, battery], index) => {
    const y = startY + yOffset + index * (bodyH + gap);

    const segments = Array.from({ length: segCount }, (_, segIdx) => {
      const segY = y + segGap + segIdx * (segH + segGap);
      const fillThreshold = segCount - Math.max(0, Math.min(segCount, battery.level));
      return {
        x: x + segGap,
        y: segY,
        w: bodyW - segGap * 2,
        h: segH,
        filled: segIdx >= fillThreshold,
      };
    });

    const slotYs = segments.map((seg) => Math.round(seg.y + seg.h / 2));

    return {
      id,
      level: battery.level,
      capacity: battery.capacity,
      x,
      y,
      w: bodyW,
      h: bodyH,
      segments,
      slotYs,
      labelX: x + bodyW + UI_NUMBERS.batteryLabelOffsetPx,
    };
  });
}

function buildSlotAssignments(state, batteryShapes) {
  const byDirection = state.connections?.[state.junctionDirection] || {};
  const utilityAnchors = {};
  const batterySlots = {};

  for (const battery of batteryShapes) {
    const requestedUtilities = byDirection[battery.id] || [];
    const slots = Array(UI_NUMBERS.batterySlotCount).fill(null);
    let slotIndex = 0;

    for (const utilityId of requestedUtilities) {
      while (slotIndex < UI_NUMBERS.batterySlotCount && slots[slotIndex] !== null) {
        slotIndex += 1;
      }
      if (slotIndex >= UI_NUMBERS.batterySlotCount) {
        break;
      }

      slots[slotIndex] = utilityId;
      if (!utilityAnchors[utilityId]) {
        utilityAnchors[utilityId] = {
          batteryId: battery.id,
          slotIndex,
          centerY: battery.slotYs[slotIndex],
          lineStartX: battery.x + battery.w,
        };
      }
      slotIndex += 1;
    }

    batterySlots[battery.id] = slots;
  }

  return { batterySlots, utilityAnchors };
}

function buildUtilityShapes(state, mapRect, slotAssignments) {
  const utilityEntries = Object.entries(state.utilities || {}).sort(([a], [b]) => a.localeCompare(b));
  if (utilityEntries.length === 0) {
    return [];
  }

  const x = mapRect.x + Math.round(mapRect.width * UI_NUMBERS.utilityColumnRatio);
  const top = mapRect.y + Math.round(mapRect.height * UI_NUMBERS.utilityFallbackTopPaddingRatio);
  const utilityAnchors = slotAssignments?.utilityAnchors || {};

  const utilityShapes = utilityEntries.map(([id, utility], index) => {
    const anchor = utilityAnchors[id];
    const y = anchor
      ? Math.round(anchor.centerY - UI_NUMBERS.utilityCellSizePx / 2)
      : top + index * UI_NUMBERS.utilityMinRowGapPx;
    const cells = Array.from({ length: Math.max(0, utility.capacity) }, (_, cellIdx) => ({
      x: x + cellIdx * (UI_NUMBERS.utilityCellSizePx + UI_NUMBERS.utilityCellGapPx),
      y,
      size: UI_NUMBERS.utilityCellSizePx,
      filled: cellIdx < utility.level,
    }));

    const label = UTILITY_LABELS[id] || `Label ${id}`;
    const width = cells.length > 0
      ? ((cells.length - 1) * (UI_NUMBERS.utilityCellSizePx + UI_NUMBERS.utilityCellGapPx) + UI_NUMBERS.utilityCellSizePx)
      : 0;

    return {
      id,
      level: utility.level,
      capacity: utility.capacity,
      cells,
      label,
      labelX: x + width + UI_NUMBERS.utilityLabelOffsetXPx,
      labelY: y + UI_NUMBERS.utilityLabelOffsetYPx,
      lineY: Math.round(y + UI_NUMBERS.utilityCellSizePx / 2),
    };
  });

  const maxCellsRightX = utilityShapes.reduce((maxX, utility) => {
    if (utility.cells.length === 0) {
      return maxX;
    }
    const rightX = utility.cells[utility.cells.length - 1].x + UI_NUMBERS.utilityCellSizePx;
    return Math.max(maxX, rightX);
  }, x);
  const alignedLabelX = maxCellsRightX + UI_NUMBERS.utilityLabelOffsetXPx;

  return utilityShapes.map((utility) => ({
    ...utility,
    labelX: alignedLabelX,
  }));
}

function buildUtilityLines(utilityShapes, slotAssignments) {
  const utilityAnchors = slotAssignments?.utilityAnchors || {};
  const lines = [];

  for (const utility of utilityShapes) {
    const anchor = utilityAnchors[utility.id];
    if (!anchor || utility.cells.length === 0) {
      continue;
    }
    lines.push({
      x1: anchor.lineStartX,
      y1: anchor.centerY,
      x2: utility.cells[0].x - UI_NUMBERS.utilityLineGapBeforeCellsPx,
      y2: utility.lineY,
    });
  }

  return lines;
}

function buildViewModel(state, innerRectPx) {
  const mapRect = rectPctToPx(MAP_RECT_PCT, innerRectPx);
  const statusRect = rectPctToPx(STATUS_RECT_PCT, innerRectPx);
  const batteries = buildBatteryShapes(state, mapRect);
  const slotAssignments = buildSlotAssignments(state, batteries);
  const utilities = buildUtilityShapes(state, mapRect, slotAssignments);

  return {
    mapPanel: {
      title: "Shape Map",
      rect: mapRect,
      batteries,
      utilities,
      utilityLines: buildUtilityLines(utilities, slotAssignments),
    },
    statusPanel: {
      title: "Status",
      rect: statusRect,
      statusLine: `Stage ${state.stage} | Mode ${state.mode} | Junction ${state.junctionDirection}`,
      status: state.transferStatus,
    },
    debugLayout: state.debugLayout,
  };
}

function drawPanelFrame(scene, rect, title) {
  const graphics = scene.add.graphics();
  const borderColor = parseInt(UI_COLORS.subtle.replace("#", ""), 16);
  graphics.lineStyle(UI_NUMBERS.strokeWidth, borderColor, UI_NUMBERS.strokeAlpha);
  graphics.strokeRect(
    rect.x + UI_NUMBERS.strokeInsetPx,
    rect.y + UI_NUMBERS.strokeInsetPx,
    Math.max(0, rect.width - UI_NUMBERS.strokeReductionPx),
    Math.max(0, rect.height - UI_NUMBERS.strokeReductionPx)
  );
  scene.ui.add(graphics);

  const baseFontPx = scene.registry.get("fontSizePx") || UI_NUMBERS.baseFontPxFallback;
  const titleStyle = {
    ...makeTextStyle(Math.max(UI_NUMBERS.minTitleFontPx, Math.round(baseFontPx * UI_NUMBERS.titleFontScale))),
    color: UI_COLORS.header,
  };
  draw.bind(scene)(`[ ${title} ]`, {
    offsetXPx: rect.x + UI_NUMBERS.panelTextOffsetXPx,
    offsetYPx: rect.y + UI_NUMBERS.panelTitleOffsetYPx,
    textStyle: titleStyle,
  });
}

function drawBatteryGlyph(scene, battery) {
  const stroke = parseInt(UI_COLORS.body.replace("#", ""), 16);
  const filled = parseInt(UI_COLORS.header.replace("#", ""), 16);

  const g = scene.add.graphics();
  g.lineStyle(UI_NUMBERS.strokeWidth, stroke, UI_NUMBERS.strokeAlpha);
  g.strokeRoundedRect(
    battery.x + UI_NUMBERS.strokeInsetPx,
    battery.y + UI_NUMBERS.strokeInsetPx,
    battery.w - UI_NUMBERS.strokeReductionPx,
    battery.h - UI_NUMBERS.strokeReductionPx,
    UI_NUMBERS.batteryBodyCornerRadiusPx
  );

  for (const seg of battery.segments) {
    g.lineStyle(UI_NUMBERS.strokeWidth, stroke, UI_NUMBERS.strokeAlpha);
    g.strokeRoundedRect(
      seg.x + UI_NUMBERS.strokeInsetPx,
      seg.y + UI_NUMBERS.strokeInsetPx,
      seg.w - UI_NUMBERS.strokeReductionPx,
      seg.h - UI_NUMBERS.strokeReductionPx,
      UI_NUMBERS.batterySegmentCornerRadiusPx
    );
    if (seg.filled) {
      g.fillStyle(filled, UI_NUMBERS.batteryFillAlpha);
      g.fillRoundedRect(
        seg.x + UI_NUMBERS.batteryFillInsetPx,
        seg.y + UI_NUMBERS.batteryFillInsetPx,
        Math.max(0, seg.w - UI_NUMBERS.batteryFillReductionPx),
        Math.max(0, seg.h - UI_NUMBERS.batteryFillReductionPx),
        UI_NUMBERS.batterySegmentCornerRadiusPx
      );
    }
  }

  scene.ui.add(g);

  const labelStyle = {
    ...makeTextStyle(Math.max(UI_NUMBERS.minBodyFontPx, Math.round((scene.registry.get("fontSizePx") || UI_NUMBERS.baseFontPxFallback) * UI_NUMBERS.bodyFontScale))),
    color: UI_COLORS.body,
  };
  draw.bind(scene)(`B${battery.id} ${battery.level}/${battery.capacity}`, {
    offsetXPx: battery.x,
    offsetYPx: battery.y - UI_NUMBERS.batteryLabelOffsetYPx,
    textStyle: labelStyle,
  });
}

function drawUtilityGlyph(scene, utility) {
  const stroke = parseInt(UI_COLORS.body.replace("#", ""), 16);
  const filled = parseInt(UI_COLORS.header.replace("#", ""), 16);

  const g = scene.add.graphics();
  g.lineStyle(UI_NUMBERS.strokeWidth, stroke, UI_NUMBERS.strokeAlpha);
  for (const cell of utility.cells) {
    g.strokeRoundedRect(
      cell.x + UI_NUMBERS.strokeInsetPx,
      cell.y + UI_NUMBERS.strokeInsetPx,
      cell.size - UI_NUMBERS.strokeReductionPx,
      cell.size - UI_NUMBERS.strokeReductionPx,
      UI_NUMBERS.utilityCellCornerRadiusPx
    );
    if (cell.filled) {
      g.fillStyle(filled, UI_NUMBERS.utilityFillAlpha);
      g.fillRoundedRect(
        cell.x + UI_NUMBERS.batteryFillInsetPx,
        cell.y + UI_NUMBERS.batteryFillInsetPx,
        cell.size - UI_NUMBERS.batteryFillReductionPx,
        cell.size - UI_NUMBERS.batteryFillReductionPx,
        UI_NUMBERS.utilityCellCornerRadiusPx
      );
    }
  }
  scene.ui.add(g);

  const labelStyle = {
    ...makeTextStyle(Math.max(UI_NUMBERS.minBodyFontPx, Math.round((scene.registry.get("fontSizePx") || UI_NUMBERS.baseFontPxFallback) * UI_NUMBERS.bodyFontScale))),
    color: UI_COLORS.body,
  };
  draw.bind(scene)(utility.label, {
    offsetXPx: utility.labelX,
    offsetYPx: utility.labelY,
    textStyle: labelStyle,
  });
}

function drawUtilityLines(scene, lines) {
  if (!lines || lines.length === 0) {
    return;
  }
  const stroke = parseInt(UI_COLORS.body.replace("#", ""), 16);
  const g = scene.add.graphics();
  g.lineStyle(UI_NUMBERS.utilityLineWidthPx, stroke, UI_NUMBERS.strokeAlpha);
  for (const line of lines) {
    g.lineBetween(line.x1, line.y1, line.x2, line.y2);
  }
  scene.ui.add(g);
}

function renderFromViewModel(scene, viewModel) {
  drawPanelFrame(scene, viewModel.mapPanel.rect, viewModel.mapPanel.title);
  drawPanelFrame(scene, viewModel.statusPanel.rect, viewModel.statusPanel.title);

  for (const battery of viewModel.mapPanel.batteries) {
    drawBatteryGlyph(scene, battery);
  }
  drawUtilityLines(scene, viewModel.mapPanel.utilityLines);
  for (const utility of viewModel.mapPanel.utilities) {
    drawUtilityGlyph(scene, utility);
  }

  const baseFontPx = scene.registry.get("fontSizePx") || UI_NUMBERS.baseFontPxFallback;
  const infoStyle = {
    ...makeTextStyle(Math.max(UI_NUMBERS.minBodyFontPx, Math.round(baseFontPx * UI_NUMBERS.bodyFontScale))),
    color: UI_COLORS.subtle,
  };
  draw.bind(scene)(viewModel.statusPanel.statusLine, {
    offsetXPx: viewModel.statusPanel.rect.x + UI_NUMBERS.statusInfoOffsetXPx,
    offsetYPx: viewModel.statusPanel.rect.y + UI_NUMBERS.statusInfoOffsetYPx,
    textStyle: infoStyle,
  });

  const statusColor = viewModel.statusPanel.status.type === "error" ? "#FF5555" : UI_COLORS.header;
  const statusStyle = {
    ...makeTextStyle(Math.max(UI_NUMBERS.minBodyFontPx, Math.round(baseFontPx * UI_NUMBERS.bodyFontScale))),
    color: statusColor,
  };
  draw.bind(scene)(`Status: ${viewModel.statusPanel.status.message || ""}`, {
    offsetXPx: viewModel.statusPanel.rect.x + UI_NUMBERS.panelTextOffsetXPx,
    offsetYPx: viewModel.statusPanel.rect.y + Math.max(UI_NUMBERS.strokeWidth, Math.round(viewModel.statusPanel.rect.height * UI_NUMBERS.statusMessageOffsetRatio)),
    textStyle: statusStyle,
  });
}

export default class RefactoredMap extends Phaser.Scene {
  constructor() {
    super("RefactoredMap");
    this.gameState = createInitialGameState();
    this.ui = null;
  }

  create() {
    updateRegistryFromScale(this);
    this.bindInput();
    this.render();

    this.scale.on("resize", () => {
      updateRegistryFromScale(this);
      this.render();
    });
  }

  bindInput() {
    // this.input.keyboard.on("keydown-UP", () => {
    //   this.dispatch({ type: "MOVE_CONTROL_SELECTION", payload: { direction: "up" } });
    // });

    // this.input.keyboard.on("keydown-DOWN", () => {
    //   this.dispatch({ type: "MOVE_CONTROL_SELECTION", payload: { direction: "down" } });
    // });

    // this.input.keyboard.on("keydown-ENTER", () => {
    //   this.dispatch({ type: "ACTIVATE_CONTROL" });
    // });

    this.input.keyboard.on("keydown-Q", () => {
      this.dispatch({ type: "TOGGLE_DEBUG_LAYOUT" });
    });
  }

  dispatch(intent) {
    this.gameState = reduceGameState(this.gameState, intent);
    this.registry.set("debugLayout", this.gameState.debugLayout);
    this.render();
  }

  render() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    const gridOriginPx = this.registry.get("gridOriginPx") || { x: 0, y: 0 };
    this.ui.setPosition(gridOriginPx.x, gridOriginPx.y);

    const { innerRectPx } = drawBorderBox.bind(this)("Power Puzzle");

    const viewModel = buildViewModel(this.gameState, innerRectPx);
    renderFromViewModel(this, viewModel);
    if (viewModel.debugLayout) {
      drawLayoutDebug(this, innerRectPx, MAP_RECT_PCT, STATUS_RECT_PCT);
    }
  }
}
