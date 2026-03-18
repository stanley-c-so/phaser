import Phaser from "phaser";

import { STATIC_MAP_ASCII_1, MAP_CONNECTIONS_1 } from "../data/static-map";
import { makeTextStyle } from "../config/constants";
import { draw, drawBorderBox } from "../utils/draw";
import { drawLayoutDebug } from "../utils/debug";
import { updateRegistryFromScale } from "../utils/registry";

const MAP_RECT_PCT = { x0: 0, y0: 0, x1: 55, y1: 100 };
const CONTROLS_RECT_PCT = { x0: 55, y0: 0, x1: 98, y1: 100 };

const UI_NUMBERS = {
  strokeWidth: 1,
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
  return {
    stage: 1,
    mode: "pick_source",
    selectedControlIndex: 0,
    cursor: { side: "left", index: 0 },
    sourceSelection: null,
    targetSelection: null,
    transferStatus: { message: "Slice 1 scaffold ready", type: "ok" },
    toggles: {
      switchDirection: "right",
      junctionDirection: "up",
    },
    map: {
      ascii: STATIC_MAP_ASCII_1,
      connections: MAP_CONNECTIONS_1,
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

    case "MOVE_CONTROL_SELECTION": {
      const direction = payload.direction === "up" ? -1 : 1;
      const N = CONTROL_ITEMS.length;
      const next = (state.selectedControlIndex + direction + N) % N;
      return {
        ...state,
        selectedControlIndex: next,
      };
    }

    case "ACTIVATE_CONTROL": {
      const active = CONTROL_ITEMS[state.selectedControlIndex];
      if (!active) {
        return state;
      }
      if (active.id === "transfer") {
        return {
          ...state,
          transferStatus: {
            message: "Transfer flow is coming in Slice 4",
            type: "ok",
          },
        };
      }
      if (active.id === "select_source") {
        return {
          ...state,
          mode: "pick_source",
          transferStatus: {
            message: "Source selection mode",
            type: "ok",
          },
        };
      }
      if (active.id === "select_target") {
        return {
          ...state,
          mode: "pick_target",
          transferStatus: {
            message: "Target selection mode",
            type: "ok",
          },
        };
      }
      return state;
    }

    default:
      return state;
  }
}

function buildViewModel(state) {
  const mapLines = state.map.ascii
    .split("\n")
    .filter((line) => line.trim().length > 0);

//   const mapPreview = mapLines.slice(0, 10);
  const mapPreview = mapLines.slice();
  const controls = CONTROL_ITEMS.map((item, index) => {
    const selected = index === state.selectedControlIndex;
    return {
      id: item.id,
      text: `${selected ? ">" : " "} ${item.label}`,
      selected,
    };
  });

  return {
    title: "Power Puzzle",
    mapPanel: {
      title: "Map (Slice 1)",
      lines: [
        `Stage: ${state.stage}`,
        `Mode: ${state.mode}`,
        "",
        "ASCII preview:",
        ...mapPreview,
      ],
    },
    controlsPanel: {
      title: "Controls",
      lines: [
        "UP/DOWN: choose row",
        "ENTER: activate row",
        "Q: toggle layout debug",
        "",
      ],
      controls,
      status: state.transferStatus,
    },
    debugLayout: state.debugLayout,
  };
}

function drawPanelFrame(scene, rect, title) {
  const graphics = scene.add.graphics();
  const borderColor = parseInt(UI_COLORS.subtle.replace("#", ""), 16);
  graphics.lineStyle(UI_NUMBERS.strokeWidth, borderColor, 1);
  graphics.strokeRect(rect.x + 0.5, rect.y + 0.5, Math.max(0, rect.width - 1), Math.max(0, rect.height - 1));
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

function drawLineBlock(scene, lines, rect, startY, color) {
  const baseFontPx = scene.registry.get("fontSizePx") || UI_NUMBERS.baseFontPxFallback;
  const bodyStyle = {
    ...makeTextStyle(Math.max(UI_NUMBERS.minBodyFontPx, Math.round(baseFontPx * UI_NUMBERS.bodyFontScale))),
    color,
  };
  const step = Math.max(UI_NUMBERS.minLineStepPx, Math.round(baseFontPx * UI_NUMBERS.lineStepScale));
  let y = startY;
  for (const line of lines) {
    draw.bind(scene)(line, {
      offsetXPx: rect.x + UI_NUMBERS.panelTextOffsetXPx,
      offsetYPx: y,
      textStyle: bodyStyle,
    });
    y += step;
    if (y > rect.y + rect.height - step) {
      break;
    }
  }
  return y;
}

function renderFromViewModel(scene, viewModel, innerRectPx) {
  const mapRect = rectPctToPx(MAP_RECT_PCT, innerRectPx);
  const controlsRect = rectPctToPx(CONTROLS_RECT_PCT, innerRectPx);

  drawPanelFrame(scene, mapRect, viewModel.mapPanel.title);
  drawPanelFrame(scene, controlsRect, viewModel.controlsPanel.title);

  const mapEndY = drawLineBlock(
    scene,
    viewModel.mapPanel.lines,
    mapRect,
    mapRect.y + UI_NUMBERS.panelBodyStartYPx,
    UI_COLORS.body
  );

  drawLineBlock(
    scene,
    viewModel.controlsPanel.lines,
    controlsRect,
    controlsRect.y + UI_NUMBERS.panelBodyStartYPx,
    UI_COLORS.body
  );

  const controlStartY = controlsRect.y
    + UI_NUMBERS.panelBodyStartYPx
    + (viewModel.controlsPanel.lines.length * UI_NUMBERS.controlsBlockOffsetYPx);
  const controlBaseStyle = {
    ...makeTextStyle(
      Math.max(
        UI_NUMBERS.minBodyFontPx,
        Math.round((scene.registry.get("fontSizePx") || UI_NUMBERS.baseFontPxFallback) * UI_NUMBERS.titleFontScale)
      )
    ),
    color: UI_COLORS.body,
  };
  const controlSelectedStyle = { ...controlBaseStyle, color: UI_COLORS.accent };

  let y = controlStartY;
  for (const item of viewModel.controlsPanel.controls) {
    draw.bind(scene)(item.text, {
      offsetXPx: controlsRect.x + UI_NUMBERS.panelTextOffsetXPx,
      offsetYPx: y,
      textStyle: item.selected ? controlSelectedStyle : controlBaseStyle,
    });
    y += UI_NUMBERS.controlsItemStepPx;
  }

  const statusColor = viewModel.controlsPanel.status.type === "error" ? "#FF5555" : UI_COLORS.header;
  draw.bind(scene)(`Status: ${viewModel.controlsPanel.status.message || ""}`, {
    offsetXPx: controlsRect.x + UI_NUMBERS.panelTextOffsetXPx,
    offsetYPx: controlsRect.y + controlsRect.height - UI_NUMBERS.statusBottomOffsetPx,
    textStyle: { ...controlBaseStyle, color: statusColor },
  });

  if (mapEndY < mapRect.y + mapRect.height - UI_NUMBERS.statusBottomOffsetPx) {
    draw.bind(scene)("Slice 2 next: parse entities + draw batteries/utilities", {
      offsetXPx: mapRect.x + UI_NUMBERS.panelTextOffsetXPx,
      offsetYPx: mapRect.y + mapRect.height - UI_NUMBERS.statusBottomOffsetPx,
      textStyle: { ...controlBaseStyle, color: UI_COLORS.subtle },
    });
  }
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
    this.input.keyboard.on("keydown-UP", () => {
      this.dispatch({ type: "MOVE_CONTROL_SELECTION", payload: { direction: "up" } });
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      this.dispatch({ type: "MOVE_CONTROL_SELECTION", payload: { direction: "down" } });
    });

    this.input.keyboard.on("keydown-ENTER", () => {
      this.dispatch({ type: "ACTIVATE_CONTROL" });
    });

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

    const viewModel = buildViewModel(this.gameState);
    renderFromViewModel(this, viewModel, innerRectPx);
    if (viewModel.debugLayout) {
      drawLayoutDebug(this, innerRectPx, MAP_RECT_PCT, CONTROLS_RECT_PCT);
    }
  }
}
