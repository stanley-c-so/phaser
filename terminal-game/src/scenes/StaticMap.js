import Phaser from "phaser";

import {
  STATIC_MAP_ASCII_1,
  MAP_CONNECTIONS_1,
  STATIC_MAP_ASCII_2,
  MAP_CONNECTIONS_2,
  STATIC_MAP_ASCII_3,
  MAP_CONNECTIONS_3,
} from "../data/static-map";

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
  action_primary: "#00FFFF",
  action_secondary: "#FFFF00",
  active_utility: "#6BFF9C",
  debug: "#999999",
  status_ok: "#6BFF9C",
  status_error: "#FF5555",
};

const MAP_COLORS = {
  default: "#559900",
  label: "#6BFF9C",
  arrow: "#FFFF00",
  junction: "#FFFF00",
  battery: "#CCCC00",
  utility_locked: "#FFAA33",
};

const FILLED_CHAR = "▓";
const EMPTY_CHAR = "░";

const STAGE_GOALS = {
  1: { utilityId: "A", targetLevel: 5, targetCapacity: 5, autoAdvance: true },
  2: { utilityId: "E", targetLevel: 4, targetCapacity: 4, autoAdvance: true },
  3: { utilityId: "I", targetLevel: 2, targetCapacity: 3, autoAdvance: false },
};

function getStageHeaderLine(stage) {
  switch (stage) {
    case 1:
      return [
        { text: "Set ", color: CONTROLS_COLORS.header },
        { text: "Primary Containment Seal ", color: CONTROLS_COLORS.entity },
        { text: "power to ", color: CONTROLS_COLORS.header },
        { text: `${STAGE_GOALS[1].targetLevel}`, color: CONTROLS_COLORS.entity },
        { text: `/${STAGE_GOALS[1].targetCapacity}`, color: CONTROLS_COLORS.header },
      ];
    case 2:
      return [
        { text: "Set ", color: CONTROLS_COLORS.header },
        { text: "Genomic Analysis Array ", color: CONTROLS_COLORS.entity },
        { text: "power to ", color: CONTROLS_COLORS.header },
        { text: `${STAGE_GOALS[2].targetLevel}`, color: CONTROLS_COLORS.entity },
        { text: `/${STAGE_GOALS[2].targetCapacity}`, color: CONTROLS_COLORS.header },
      ];
    case 3:
      return [
        { text: "Set ", color: CONTROLS_COLORS.header },
        { text: "Antiviral Synthesis Reactor ", color: CONTROLS_COLORS.entity },
        { text: "power to ", color: CONTROLS_COLORS.header },
        { text: `${STAGE_GOALS[3].targetLevel}`, color: CONTROLS_COLORS.entity },
        { text: `/${STAGE_GOALS[3].targetCapacity}`, color: CONTROLS_COLORS.header },
      ];
    default:
      return [
        { text: "", color: CONTROLS_COLORS.header }
      ];
  }
}

function getInitiateTransferTokens(transferContext) {
  const {
    activeUtilityId,
    switchDirection,
    junctionDirection,
    mapConnections,
  } = transferContext || {};

  if (!activeUtilityId || !mapConnections) {
    return [{ text: "[ INITIATE TRANSFER ]", color: CONTROLS_COLORS.action_primary }];
  }

  const switchId = getSwitchForUtility(activeUtilityId, mapConnections);
  const batteryId = getBatteryForSwitch(switchId, junctionDirection, mapConnections);
  if (!switchId || !batteryId) {
    return [{ text: "[ INITIATE TRANSFER ]", color: CONTROLS_COLORS.action_primary }];
  }

  const flowFromUtility = switchDirection === "left";
  const fromLabel = flowFromUtility ? activeUtilityId : `BATTERY ${batteryId}`;
  const toLabel = flowFromUtility ? `BATTERY ${batteryId}` : activeUtilityId;
  const fromColor = flowFromUtility ? CONTROLS_COLORS.entity : MAP_COLORS.battery;
  const toColor = flowFromUtility ? MAP_COLORS.battery : CONTROLS_COLORS.entity;

  return [
    { text: "[ INITIATE TRANSFER FROM ", color: CONTROLS_COLORS.action_primary },
    { text: fromLabel, color: fromColor },
    { text: " TO ", color: CONTROLS_COLORS.action_primary },
    { text: toLabel, color: toColor },
    { text: " ]", color: CONTROLS_COLORS.action_primary },
  ];
}

function getAvailableUtilities(mapConnections) {
  const utilities = new Set();
  const entries = Object.values(mapConnections?.switchToUtility || {});
  for (const list of entries) {
    for (const utilityId of list) {
      utilities.add(utilityId);
    }
  }
  return utilities;
}

function getTransferStatusTokens(transferStatus) {
  if (!transferStatus?.message) {
    return [];
  }
  const color = transferStatus.type === "error"
    ? CONTROLS_COLORS.status_error
    : CONTROLS_COLORS.status_ok;
  return [{ text: transferStatus.message, color }];
}

function clearTransferStatusTimer(scene) {
  if (scene.transferStatusTimer) {
    scene.transferStatusTimer.remove(false);
    scene.transferStatusTimer = null;
  }
}

function clearTransferStatusTypingTimer(scene) {
  if (scene.transferStatusTypingTimer) {
    scene.transferStatusTypingTimer.remove(false);
    scene.transferStatusTypingTimer = null;
  }
}

function scheduleTransferStatusClear(scene) {
  clearTransferStatusTimer(scene);
  scene.transferStatusTimer = scene.time.delayedCall(5000, () => {
    scene.transferStatus = { message: "", type: "ok" };
    scene.transferStatusTimer = null;
    scene.render();
  });
}

function setTransferStatus(scene, status) {
  clearTransferStatusTimer(scene);
  clearTransferStatusTypingTimer(scene);
  const fullMessage = status?.message || "";
  scene.transferStatus = {
    message: "",
    fullMessage,
    type: status?.type || "ok",
  };
  if (!fullMessage) {
    scene.render();
    return;
  }

  let index = 0;
  const typeIntervalMs = 25;
  scene.transferStatusTypingTimer = scene.time.addEvent({
    delay: typeIntervalMs,
    loop: true,
    callback: () => {
      index += 1;
      scene.transferStatus.message = fullMessage.slice(0, index);
      scene.render();
      if (index >= fullMessage.length) {
        clearTransferStatusTypingTimer(scene);
        if (scene.transferStatus.type === "error") {
          scheduleTransferStatusClear(scene);
        }
      }
    },
  });
}

function buildControlsLines(stage, hasJunctions, lockedUtilities, transferContext) {
  const isLocked = (id) => lockedUtilities?.has?.(id);
  const availableUtilities = getAvailableUtilities(transferContext?.mapConnections);
  const lines = [
    {
      tokens: [{ text: "GOAL:", color: CONTROLS_COLORS.header }],
      selectable: false,
    },
    {
      tokens: getStageHeaderLine(stage),
      selectable: false,
    },
    { tokens: [], selectable: false },
    {
      tokens: [{ text: "Select active utility:", color: CONTROLS_COLORS.header }],
      selectable: false,
    },
  ];

  lines.push(
    {
      tokens: availableUtilities.has("A") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "A  ", color: CONTROLS_COLORS.entity },
        { text: "Primary Containment Seal", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("A") && !isLocked("A"),
      utilityId: "A",
    },
    {
      tokens: availableUtilities.has("B") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "B  ", color: CONTROLS_COLORS.entity },
        { text: "Environmental Comfort Controls", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("B") && !isLocked("B"),
      utilityId: "B",
    },
    {
      tokens: availableUtilities.has("C") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "C  ", color: CONTROLS_COLORS.entity },
        { text: "Administrative Data Archive", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("C") && !isLocked("C"),
      utilityId: "C",
    },
    // {
    //   tokens: availableUtilities.has("D") ? [
    //     { text: "( ) ", color: CONTROLS_COLORS.bracket },
    //     { text: "D  ", color: CONTROLS_COLORS.entity },
    //     { text: "Staff Decontamination Shower", color: CONTROLS_COLORS.label },
    //   ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
    //   selectable: availableUtilities.has("D") && !isLocked("D"),
    //   utilityId: "D",
    // },
    {
      tokens: availableUtilities.has("E") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "E  ", color: CONTROLS_COLORS.entity },
        { text: "Genomic Analysis Array", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("E") && !isLocked("E"),
      utilityId: "E",
    },
    {
      tokens: availableUtilities.has("F") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "F  ", color: CONTROLS_COLORS.entity },
        { text: "Inter-wing Power Relay", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("F") && !isLocked("F"),
      utilityId: "F",
    },
    {
      tokens: availableUtilities.has("G") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "G  ", color: CONTROLS_COLORS.entity },
        { text: "Cryogenic Thermal Mass Stabilizer", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("G") && !isLocked("G"),
      utilityId: "G",
    },
    {
      tokens: availableUtilities.has("H") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "H  ", color: CONTROLS_COLORS.entity },
        { text: "blah", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("H") && !isLocked("H"),
      utilityId: "H",
    },
    {
      tokens: availableUtilities.has("I") ? [
        { text: "( ) ", color: CONTROLS_COLORS.bracket },
        { text: "I  ", color: CONTROLS_COLORS.entity },
        { text: "Antiviral Synthesis Reactor", color: CONTROLS_COLORS.label },
      ] : [{ text: "", color: CONTROLS_COLORS.bracket }],
      selectable: availableUtilities.has("I") && !isLocked("I"),
      utilityId: "I",
    },
  );

  // Toggle all switches
  lines.push(
    { tokens: [], selectable: false },
    {
      tokens: [
        { text: "[ Change transfer switch directions ]", color: CONTROLS_COLORS.action_secondary },
      ],
      selectable: true,
      action: "toggle_switches",
    },
  );

  // Toggle junctions
  lines.push(
    { tokens: [], selectable: false },
    {
      tokens: hasJunctions ? [
        { text: "[ Change all junctions ]", color: CONTROLS_COLORS.action_secondary },
      ] : [{ text: "", color: CONTROLS_COLORS.action_secondary }],
      selectable: hasJunctions,
      action: "toggle_junctions",
    }
  );

  // Transfer action and status
  lines.push(
    { tokens: [], selectable: false },
    {
      tokens: getInitiateTransferTokens(transferContext),
      selectable: true,
      action: "initiate_transfer",
    },
    { tokens: [], selectable: false },
    {
      tokens: getTransferStatusTokens(transferContext?.transferStatus),
      selectable: false,
    },
  );

  // Debug action
  // lines.push(
  //   { tokens: [], selectable: false },
  //   {
  //     tokens: [{ text: "[ DEBUG: NEXT STAGE ]", color: CONTROLS_COLORS.debug }],
  //     selectable: true,
  //     action: "next_stage",
  //   }
  // );

  return lines;
}

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

function getCanvasFontFromStyle(textStyle = {}) {
  const fontSizeRaw = textStyle.fontSize ?? 1;
  const fontSize = typeof fontSizeRaw === "number"
    ? fontSizeRaw
    : parseFloat(String(fontSizeRaw).replace("px", "")) || 1;
  const fontWeight = textStyle.fontWeight || "normal";
  const fontFamily = textStyle.fontFamily || "monospace";
  return `${fontWeight} ${fontSize}px ${fontFamily}`;
}

function measureMapMaxLineWidthPx(scene, textStyle, lines) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Math.ceil((lines?.reduce((max, line) => Math.max(max, (line || "").length), 0) || 0) * 8);
  }
  ctx.font = getCanvasFontFromStyle(textStyle);
  let maxWidth = 0;
  for (const line of (lines || [])) {
    maxWidth = Math.max(maxWidth, ctx.measureText(line || "").width);
  }
  return Math.ceil(maxWidth);
}

function measureMapBlockHeightPx(scene, textStyle, lines) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fontSizeRaw = textStyle?.fontSize ?? 1;
    const fontSize = typeof fontSizeRaw === "number"
      ? fontSizeRaw
      : parseFloat(String(fontSizeRaw).replace("px", "")) || 1;
    return Math.ceil((lines?.length || 0) * fontSize);
  }

  ctx.font = getCanvasFontFromStyle(textStyle);
  const metrics = ctx.measureText("M");
  const fontSizeRaw = textStyle?.fontSize ?? 1;
  const fontSize = typeof fontSizeRaw === "number"
    ? fontSizeRaw
    : parseFloat(String(fontSizeRaw).replace("px", "")) || 1;
  const lineHeight = textStyle?.lineHeight || (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) || fontSize;
  return Math.ceil((lines?.length || 0) * lineHeight);
}

function measureRenderedBlockPx(scene, textStyle, lines) {
  const content = (lines || []).join("\n");
  if (!content) {
    return { width: 0, height: 0 };
  }

  const probe = scene.add.text(-100000, -100000, content, textStyle);
  probe.setOrigin(0, 0);
  probe.setResolution(scene.game?.renderer?.resolution || 1);
  const bounds = probe.getBounds();
  probe.destroy();

  return {
    width: Math.ceil(Math.max(0, bounds.width)),
    height: Math.ceil(Math.max(0, bounds.height)),
  };
}

function measureTokenLineWidth(scene, controlsStyle, tokens) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallbackChars = (tokens || []).reduce((count, token) => count + ((token?.text || "").length), 0);
    return Math.ceil(fallbackChars * 8);
  }
  ctx.font = getCanvasFontFromStyle(controlsStyle);
  let width = 0;
  for (const token of (tokens || [])) {
    width += Math.ceil(ctx.measureText(token?.text || "").width);
  }
  return width;
}

function measureLineStepPx(scene, controlsStyle, lineSpacingPx) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSizeRaw = controlsStyle?.fontSize ?? 1;
  const fontSize = typeof fontSizeRaw === "number"
    ? fontSizeRaw
    : parseFloat(String(fontSizeRaw).replace("px", "")) || 1;
  if (!ctx) {
    return Math.max(1, fontSize + (lineSpacingPx || 0));
  }
  ctx.font = getCanvasFontFromStyle(controlsStyle);
  const metrics = ctx.measureText("M");
  const glyphHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
    || controlsStyle?.lineHeight
    || fontSize;
  return Math.max(1, glyphHeight + (lineSpacingPx || 0));
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

function getMapDimensions(mapAscii) {
  const lines = mapAscii.split("\n").slice(1, -1);
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    width: maxLineLength,
    height: lines.length,
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

function ensurePowerState(scene, parsedStaticMap) {
  if (!scene.powerState) {
    scene.powerState = { batteries: {}, utilities: {} };
  }
  if (!scene.seenEntities) {
    scene.seenEntities = {
      batteries: new Set(),
      utilities: new Set(),
    };
  }
  for (const [id, battery] of Object.entries(parsedStaticMap.batteries || {})) {
    if (!scene.seenEntities.batteries.has(id)) {
      scene.powerState.batteries[id] = {
        level: battery.level,
        capacity: battery.capacity,
      };
      scene.seenEntities.batteries.add(id);
    }
  }
  for (const [id, utility] of Object.entries(parsedStaticMap.utilities || {})) {
    if (!scene.seenEntities.utilities.has(id)) {
      scene.powerState.utilities[id] = {
        level: utility.level,
        capacity: utility.capacity,
      };
      scene.seenEntities.utilities.add(id);
    }
  }
}

function getUtilityUnitPositions(mapArr, anchor) {
  const row = anchor.row;
  const startCol = anchor.col + 1;
  const width = mapArr[row]?.length || 0;
  let idx = startCol;
  while (idx < width && mapArr[row][idx] === " ") idx += 1;
  const positions = [];
  while (idx + 2 < width) {
    const cell = mapArr[row][idx];
    if (cell !== FILLED_CHAR && cell !== EMPTY_CHAR) break;
    positions.push(idx);
    idx += 3;
    if (mapArr[row][idx] === " ") idx += 1;
  }
  return positions;
}

function applyPowerStateToMap(mapArr, parsedStaticMap, powerState) {
  for (const [id, battery] of Object.entries(parsedStaticMap.batteries || {})) {
    const state = powerState.batteries?.[id];
    if (!state) continue;
    const capacity = Math.max(0, state.capacity ?? battery.capacity ?? 0);
    const level = Math.max(0, Math.min(state.level ?? 0, capacity));
    for (let r = 0; r < capacity; r += 1) {
      const row = battery.anchor.row + r;
      const isFilledRow = r >= capacity - level;
      for (let c = 0; c < 3; c += 1) {
        const col = battery.anchor.col + c;
        if (!mapArr[row] || mapArr[row][col] === undefined) continue;
        mapArr[row][col] = isFilledRow ? FILLED_CHAR : EMPTY_CHAR;
      }
    }
  }

  for (const [id, utility] of Object.entries(parsedStaticMap.utilities || {})) {
    const state = powerState.utilities?.[id];
    if (!state) continue;
    const positions = getUtilityUnitPositions(mapArr, utility.anchor);
    const capacity = Math.max(0, Math.min(state.capacity ?? positions.length, positions.length));
    const level = Math.max(0, Math.min(state.level ?? 0, capacity));
    for (let i = 0; i < capacity; i += 1) {
      const colStart = positions[i];
      if (colStart === undefined) continue;
      const isFilled = i < level;
      for (let c = 0; c < 3; c += 1) {
        const col = colStart + c;
        if (mapArr[utility.anchor.row][col] === undefined) continue;
        mapArr[utility.anchor.row][col] = isFilled ? FILLED_CHAR : EMPTY_CHAR;
      }
    }
  }
}

function buildLockedUtilityMask(mapArr, parsedStaticMap, lockedUtilities, offsetX, offsetY) {
  if (!lockedUtilities || lockedUtilities.size === 0) {
    return null;
  }
  const mask = new Set();
  for (const [id, utility] of Object.entries(parsedStaticMap.utilities || {})) {
    if (!lockedUtilities.has(id)) continue;
    const positions = getUtilityUnitPositions(mapArr, utility.anchor);
    for (const colStart of positions) {
      for (let c = 0; c < 3; c += 1) {
        const row = utility.anchor.row + offsetY;
        const col = colStart + c + offsetX;
        mask.add(`${row},${col}`);
      }
    }
  }
  return mask;
}

function buildLockedUtilityLayer(buffer, lockedUtilityMask) {
  if (!lockedUtilityMask || lockedUtilityMask.size === 0) {
    return "";
  }
  return buffer.map((row, rowIndex) => row.map((ch, colIndex) => (
    lockedUtilityMask.has(`${rowIndex},${colIndex}`) ? ch : " "
  )).join("")).join("\n");
}

function getSwitchForUtility(utilityId, mapConnections) {
  const connections = mapConnections || MAP_CONNECTIONS_3;
  for (const [switchId, utilities] of Object.entries(connections.switchToUtility || {})) {
    if (utilities.includes(utilityId)) {
      return switchId;
    }
  }
  return null;
}

function getBatteryForSwitch(switchId, junctionDirection, mapConnections) {
  const junctionState = junctionDirection === "down" ? "down" : "up";
  const connections = mapConnections || MAP_CONNECTIONS_3;
  const batteryMap = connections.batteryToSwitch?.[junctionState] || {};
  for (const [batteryId, switches] of Object.entries(batteryMap)) {
    if (switches.includes(switchId)) {
      return batteryId;
    }
  }
  return null;
}

function handleEngageTransfer() {
  const activeUtilityId = this.activeUtilityId;
  if (!activeUtilityId) return;
  if (!this.parsedStaticMap) return;

  ensurePowerState(this, this.parsedStaticMap);

  const switchId = getSwitchForUtility(activeUtilityId, this.currentMapConnections);
  if (!switchId) return;

  const batteryId = getBatteryForSwitch(switchId, this.junctionDirection, this.currentMapConnections);
  if (!batteryId) return;

  const utilityState = this.powerState.utilities?.[activeUtilityId];
  const batteryState = this.powerState.batteries?.[batteryId];
  if (!utilityState || !batteryState) return;

  const flowFromUtility = this.switchDirection === "left";
  const fromState = flowFromUtility ? utilityState : batteryState;
  const toState = flowFromUtility ? batteryState : utilityState;
  const fromLabel = flowFromUtility ? activeUtilityId : `battery ${batteryId}`;
  const toLabel = flowFromUtility ? `battery ${batteryId}` : activeUtilityId;
  const available = Math.max(0, fromState.level ?? 0);
  const remaining = Math.max(0, (toState.capacity ?? 0) - (toState.level ?? 0));
  const transferAmount = Math.min(available, remaining);
  if (transferAmount <= 0) {
    if (available <= 0) {
      setTransferStatus(this, { message: `ERROR: no power in ${fromLabel}`, type: "error" });
    } else if (remaining <= 0) {
      setTransferStatus(this, { message: `ERROR: ${toLabel} is full`, type: "error" });
    } else {
      setTransferStatus(this, { message: "ERROR: transfer blocked", type: "error" });
    }
    this.render();
    return;
  }

  fromState.level -= transferAmount;
  toState.level += transferAmount;
  setTransferStatus(this, {
    message: `Transferred ${transferAmount} unit${transferAmount === 1 ? "" : "s"} from ${fromLabel} to ${toLabel}`,
    type: "ok",
  });
  const didAdvance = checkStageGoals.bind(this)();
  if (!didAdvance) {
    this.render();
  }
}

function isGoalMet(goal, utilityState) {
  if (!goal || !utilityState) return false;
  if (goal.targetCapacity !== undefined && utilityState.capacity !== goal.targetCapacity) return false;
  return utilityState.level === goal.targetLevel;
}

function checkStageGoals() {
  const goal = STAGE_GOALS[this.stage];
  if (!goal) return false;
  if (!this.powerState?.utilities) return false;
  if (!this.lockedUtilities) {
    this.lockedUtilities = new Set();
  }
  if (!this.completedStages) {
    this.completedStages = new Set();
  }
  if (this.completedStages.has(this.stage)) return false;
  const utilityState = this.powerState.utilities[goal.utilityId];
  if (!isGoalMet(goal, utilityState)) return false;

  this.lockedUtilities.add(goal.utilityId);
  this.completedStages.add(this.stage);

  if (this.activeUtilityId === goal.utilityId) {
    const controlsLines = buildControlsLines(this.stage, this.hasJunctions, this.lockedUtilities, {
      activeUtilityId: this.activeUtilityId,
      switchDirection: this.switchDirection,
      junctionDirection: this.junctionDirection,
      mapConnections: this.currentMapConnections,
      transferStatus: this.transferStatus,
    });
    const nextUtilityLine = controlsLines.find((line) => line?.utilityId && line.selectable);
    this.activeUtilityId = nextUtilityLine?.utilityId || null;
  }

  if (goal.autoAdvance) {
    handleNextStage.bind(this)();
    return true;
  }

  this.render();
  return false;
}

function handleNextStage() {
  this.stage += 1;
  if (this.stage === 2) {
    this.currentMap = STATIC_MAP_ASCII_2;
    this.currentMapConnections = MAP_CONNECTIONS_2;
    this.activeUtilityId = "E";
  }
  if (this.stage === 3) {
    this.currentMap = STATIC_MAP_ASCII_3;
    this.currentMapConnections = MAP_CONNECTIONS_3;
    this.activeUtilityId = "G";
  }
  clearTransferStatusTimer(this);
  clearTransferStatusTypingTimer(this);
  this.transferStatus = { message: "", type: "ok" };
  this.render();
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
  const rectPx = rectPctToPx(rectPct, resolvedParentRectPx);

  // Calculate minimum dimensions of image
  const STATIC_MAP_STR = this.currentMap.split("\n").slice(1, -1);
  const STAGE3_STR = STATIC_MAP_ASCII_3.split("\n").slice(1, -1);
  const maxLineLength = STATIC_MAP_STR.reduce((max, line) => Math.max(max, line.length), 0);
  const STATIC_MAP_ARR = STATIC_MAP_STR.map(line => line.padEnd(maxLineLength, " ").split(""));
  const mapWidthInCells = STATIC_MAP_ARR[0].length;
  const mapHeightInCells = STATIC_MAP_ARR.length;
  const baseFontSizePx = this.registry.get("fontSizePx") || parseInt((this.registry.get("textStyle") || {}).fontSize, 10) || 1;

  const fitMapFontSize = (startPx) => {
    let sizePx = Math.max(1, Math.floor(startPx));
    while (sizePx > 1) {
      const style = makeTextStyle(sizePx);
      const measured = measureRenderedBlockPx(this, style, STAGE3_STR);
      const widthPx = measured.width;
      const heightPx = measured.height;
      if (widthPx <= rectPx.width && heightPx <= rectPx.height) {
        break;
      }
      sizePx -= 1;
    }
    return sizePx;
  };

  const mapFontSizePx = fitMapFontSize(baseFontSizePx);
  const mapTextStyle = makeTextStyle(mapFontSizePx);
  const mapWidthPx = measureMapMaxLineWidthPx(this, mapTextStyle, STATIC_MAP_STR);
  const mapHeightPx = measureMapBlockHeightPx(this, mapTextStyle, STATIC_MAP_STR);

  const stage3Measured = measureRenderedBlockPx(this, mapTextStyle, STAGE3_STR);
  const targetWidthPx = stage3Measured.width;
  const targetHeightPx = stage3Measured.height;
  const anchorXPx = rectPx.x + Math.max(0, Math.floor((rectPx.width - targetWidthPx) / 2));
  const anchorYPx = rectPx.y + Math.max(0, Math.floor((rectPx.height - targetHeightPx) / 2));
  const mapOriginXPx = Math.round(anchorXPx);
  const mapOriginYPx = Math.round(anchorYPx);

  const rootUi = this.ui;
  const mapContainer = this.add.container(mapOriginXPx, mapOriginYPx);
  rootUi.add(mapContainer);
  this.ui = mapContainer;

  this.buffer = Array.from({ length: mapHeightInCells }, () => Array(mapWidthInCells).fill(" "));

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
  this.hasJunctions = junctions.length > 0;
  ensurePowerState(this, this.parsedStaticMap);
  applyPowerStateToMap(STATIC_MAP_ARR, this.parsedStaticMap, this.powerState);
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
    x: 0,
    y: 0,
    width: mapWidthInCells,
    height: mapHeightInCells,
  };

  for (let row = 0; row < mapHeightInCells; ++row) {
    for (let col = 0; col < mapWidthInCells; ++col) {
      const c = STATIC_MAP_ARR[row][col];
      this.buffer[row][col] = c;
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

  const baseX = 0;
  const baseY = 0;
  const junctionChar = this.junctionDirection === "down" ? "┌" : "└";
  const arrowChar = this.switchDirection === "left" ? "<" : ">";

  const toLayer = (predicate) => (
    this.buffer.map((row) => row.map(
      (ch) => (predicate(ch) ? ch : " ")
    ).join("")).join("\n")
  );

  const toLayerRows = (predicate) => (
    this.buffer.map((row) => row.map(
      (ch) => (predicate(ch) ? ch : " ")
    ).join(""))
  );

  const lockedUtilityMask = buildLockedUtilityMask(
    STATIC_MAP_ARR,
    this.parsedStaticMap,
    this.lockedUtilities,
    0,
    0
  );
  const baseLayer = this.buffer.map((row) => row.map((ch) => {
    if (isArrowChar(ch)) return " ";
    if (isJunctionChar(ch)) return " ";
    if (isBatteryChar(ch)) return " ";
    if (isLabelChar(ch)) return " ";
    return ch;
  }).join("")).join("\n");

  const batteryLayer = this.buffer.map((row, rowIndex) => row.map((ch, colIndex) => {
    if (!isBatteryChar(ch)) return " ";
    if (lockedUtilityMask?.has(`${rowIndex},${colIndex}`)) return " ";
    return ch;
  }).join("")).join("\n");

  const drawLayer = (content, style) => {
    if (!content || !content.trim()) return;
    const { lineSpacing, ...textStyle } = style || {};
    draw.bind(this)(content, {
      offsetXPx: baseX,
      offsetYPx: baseY,
      textStyle: { ...mapTextStyle, ...textStyle },
      lineSpacing,
    });
  };

  drawLayer(baseLayer, { color: MAP_COLORS.default });
  // Avoid per-line height drift: strokeThickness changes Text metrics for multiline text.
  // Use bold weight instead so layered passes share identical line metrics.
  drawLayer(
    toLayerRows(isJunctionChar).map((row) => row.replace(/[\\/]/g, junctionChar)).join("\n"),
    { color: MAP_COLORS.junction, fontStyle: "bold" }
  );
  drawLayer(
    toLayerRows(isArrowChar).map((row) => row.replace(/[<>]/g, arrowChar)).join("\n"),
    { color: MAP_COLORS.arrow, fontStyle: "bold" }
  );
  const lockedUtilityLayer = buildLockedUtilityLayer(this.buffer, lockedUtilityMask);
  drawLayer(batteryLayer, { color: MAP_COLORS.battery });
  drawLayer(lockedUtilityLayer, { color: MAP_COLORS.utility_locked });
  drawLayer(toLayer(isLabelChar), { color: MAP_COLORS.label });

  // Safety: ensure the rendered map fits in the allocated rect (accounts for stroke/metrics drift)
  const bounds = mapContainer.getBounds();
  if (bounds.width > 0 && bounds.height > 0) {
    const scaleToFit = Math.min(
      rectPx.width / bounds.width,
      rectPx.height / bounds.height,
      1
    );
    if (scaleToFit < 1) {
      mapContainer.setScale(scaleToFit);
      mapContainer.setPosition(
        Math.round(rectPx.x + (rectPx.width - bounds.width * scaleToFit) / 2),
        Math.round(rectPx.y + (rectPx.height - bounds.height * scaleToFit) / 2)
      );
    }
  }

  this.ui = rootUi;
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
  const controlsLines = this.controlsLines || buildControlsLines(this.stage, this.hasJunctions, this.lockedUtilities, {
    activeUtilityId: this.activeUtilityId,
    switchDirection: this.switchDirection,
    junctionDirection: this.junctionDirection,
    mapConnections: this.currentMapConnections,
    transferStatus: this.transferStatus,
  });
  const normalizedActiveIndex = normalizeSelectableIndex(controlsLines, this.controlsActiveIndex ?? 0);
  const activeUtilityId = this.activeUtilityId;
  const lockedUtilities = this.lockedUtilities || new Set();

  const rectPx = rectPctToPx(rectPct, resolvedParentRectPx);

  const fitControlsFontSize = (startPx) => {
    let sizePx = Math.max(1, Math.floor(startPx));
    while (sizePx > 1) {
      const lineSpacingPx = Math.max(0, Math.floor(sizePx * 0.2));
      const { lineStepPx, maxLineWidth } = measureControlsLayout(this, makeTextStyle(sizePx), controlsLines, lineSpacingPx);
      const totalHeightPx = Math.round(lineStepPx * controlsLines.length);
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
  const { maxLineWidth, lineStepPx, highlightHeight } = measureControlsLayout(this, controlsStyle, controlsLines, lineSpacingPx);
  const totalHeightPx = Math.round(lineStepPx * controlsLines.length);
  const baseX = Math.round(rectPx.x);
  const centeredY = rectPx.y + Math.max(0, Math.floor((rectPx.height - totalHeightPx) / 2));
  const baseY = Math.round(centeredY);
  const highlightY = Math.round(baseY + normalizedActiveIndex * lineStepPx);
  const activeLineWidth = measureTokenLineWidth(this, controlsStyle, controlsLines[normalizedActiveIndex]?.tokens || []);
  const clampedHighlightWidth = Math.min(activeLineWidth || maxLineWidth, Math.max(0, rectPx.width));

  const highlight = this.add.rectangle(baseX, highlightY, clampedHighlightWidth, highlightHeight, 0x003300).setOrigin(0, 0);
  this.ui.add(highlight);

  const availableUtilities = getAvailableUtilities(this.currentMapConnections);
  for (let i = 0; i < controlsLines.length; i += 1) {
    const line = controlsLines[i];
    const lineY = Math.round(baseY + i * lineStepPx);
    let cursorX = baseX;
    const isActiveUtility = line.utilityId && line.utilityId === activeUtilityId;
    const isLockedUtility = line.utilityId && lockedUtilities.has(line.utilityId);
    for (let tokenIndex = 0; tokenIndex < (line.tokens || []).length; tokenIndex += 1) {
      const token = line.tokens[tokenIndex];
      let tokenColor = token.color || controlsStyle.color;
      let tokenTextValue = token.text;
      if (line.utilityId && tokenIndex === 0) {
        tokenTextValue = line.utilityId === activeUtilityId ? "(x) " : availableUtilities.has(line.utilityId) ? "( ) " : "";
      }
      if (isLockedUtility) {
        tokenColor = MAP_COLORS.utility_locked;
      } else if (isActiveUtility) {
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

    updateRegistryFromScale(this);

    // Initialize state
    this.stage = 1;
    this.currentMap = STATIC_MAP_ASCII_1;
    this.currentMapConnections = MAP_CONNECTIONS_1;
    // this.stage = 3;
    // this.currentMap = STATIC_MAP_ASCII_3;
    // this.currentMapConnections = MAP_CONNECTIONS_3;
    this.switchDirection = "right";
    this.junctionDirection = "up";
    this.activeUtilityId = "A";
    this.transferStatus = { message: "", type: "ok" };
    this.lockedUtilities = new Set();
    this.completedStages = new Set();
    this.controlsLines = buildControlsLines(this.stage, false, this.lockedUtilities, {
      activeUtilityId: this.activeUtilityId,
      switchDirection: this.switchDirection,
      junctionDirection: this.junctionDirection,
      mapConnections: this.currentMapConnections,
      transferStatus: this.transferStatus,
    });
    this.controlsActiveIndex = normalizeSelectableIndex(this.controlsLines, 0);

    // Set up input handlers
    this.input.keyboard.on("keydown-UP", () => {
      const controlsLines = this.controlsLines || buildControlsLines(this.stage, this.hasJunctions, this.lockedUtilities, {
        activeUtilityId: this.activeUtilityId,
        switchDirection: this.switchDirection,
        junctionDirection: this.junctionDirection,
        mapConnections: this.currentMapConnections,
        transferStatus: this.transferStatus,
      });
      this.controlsActiveIndex = getNextSelectableIndex(controlsLines, this.controlsActiveIndex, -1);
      this.render();
    });
    this.input.keyboard.on("keydown-DOWN", () => {
      const controlsLines = this.controlsLines || buildControlsLines(this.stage, this.hasJunctions, this.lockedUtilities, {
        activeUtilityId: this.activeUtilityId,
        switchDirection: this.switchDirection,
        junctionDirection: this.junctionDirection,
        mapConnections: this.currentMapConnections,
        transferStatus: this.transferStatus,
      });
      this.controlsActiveIndex = getNextSelectableIndex(controlsLines, this.controlsActiveIndex, 1);
      this.render();
    });
    this.input.keyboard.on("keydown-ENTER", () => {
      const controlsLines = this.controlsLines || buildControlsLines(this.stage, this.hasJunctions, this.lockedUtilities, {
        activeUtilityId: this.activeUtilityId,
        switchDirection: this.switchDirection,
        junctionDirection: this.junctionDirection,
        mapConnections: this.currentMapConnections,
        transferStatus: this.transferStatus,
      });
      const normalizedIndex = normalizeSelectableIndex(controlsLines, this.controlsActiveIndex ?? 0);
      this.controlsActiveIndex = normalizedIndex;
      const activeLine = controlsLines[normalizedIndex];
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
        return;
      }
      if (activeLine?.action === "initiate_transfer") {
        handleEngageTransfer.bind(this)();
        return;
      }
      if (activeLine?.action === "next_stage") {
        handleNextStage.bind(this)();
        return;
      }
    });
    this.input.keyboard.on("keydown-Q", () => {
      const current = this.registry.get("debugLayout") ?? false;
      this.registry.set("debugLayout", !current);
      this.render();
    });
    this.render();

    // Re-render on resize
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
    this.controlsLines = buildControlsLines(this.stage, this.hasJunctions, this.lockedUtilities, {
      activeUtilityId: this.activeUtilityId,
      switchDirection: this.switchDirection,
      junctionDirection: this.junctionDirection,
      mapConnections: this.currentMapConnections,
      transferStatus: this.transferStatus,
    });
    this.controlsActiveIndex = normalizeSelectableIndex(this.controlsLines, this.controlsActiveIndex ?? 0);
    drawControlsUI.bind(this)({ parentRectPx: innerRectPx, rectPct: CONTROLS_RECT_PCT });
  }
  
};
