import Phaser from "phaser";

import {
  MAP_STATE_1,
  MAP_STATE_2,
  MAP_STATE_3,
} from "../data/static-map";
import { makeTextStyle } from "../config/constants";
import { draw, drawBorderBox } from "../utils/draw";
import { drawLayoutDebug } from "../utils/debug";
import { updateRegistryFromScale } from "../utils/registry";

const MAP_STATES = [
  MAP_STATE_1,
  MAP_STATE_2,
  MAP_STATE_3,
];

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
  batteryBodyWidthPx: 28,
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
  utilityCellGapPx: 1,
  utilityCellCornerRadiusPx: 3,
  utilityLabelOffsetXPx: 26,
  utilityLabelOffsetYPx: 2,
  utilityFillAlpha: 0.5,
  utilityFallbackTopPaddingRatio: 0.16,
  utilityLineWidthPx: 1,
  utilityLineActiveAlpha: 1,
  utilityLineInactiveAlpha: 0.25,
  transferDotCount: 4,
  transferDotRadiusPx: 2,
  transferDotAlpha: 1,
  transferDotDurationMs: 180,
  transferDotStaggerMs: 35,
  cursorHighlightWidthPx: 1,
  cursorHighlightAlpha: 1,
  cursorHighlightInsetPx: 3,
  validTargetHighlightWidthPx: 1,
  validTargetHighlightAlpha: 1,
  validTargetHighlightInsetPx: 4,
  lockedHighlightWidthPx: 1,
  lockedHighlightAlpha: 1,
  lockedHighlightInsetPx: 5,
  statusMessageOffsetRatio: 0.55,
  statusInfoOffsetXPx: 120,
  statusInfoOffsetYPx: 10,
  statusTypeCharIntervalMs: 18,
};

const UI_COLORS = {
  header: "#0FAE5A",
  body: "#6BFF9C",
  accent: "#00FFFF",
  subtle: "#4A8F68",
  cursor: "#FFFFFF",
  locked: "#CDEB78",
  validTarget: "#6EE08C",
  goalLocked: "#FF9F1C",
};

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeMapData(baseMap, stageMap) {
  const base = isPlainObject(baseMap) ? baseMap : {};
  const stage = isPlainObject(stageMap) ? stageMap : {};
  const merged = { ...base };

  for (const key of Object.keys(stage)) {
    const baseValue = base[key];
    const stageValue = stage[key];

    if (Array.isArray(stageValue)) {
      merged[key] = [...stageValue];
    } else if (isPlainObject(stageValue)) {
      merged[key] = mergeMapData(isPlainObject(baseValue) ? baseValue : {}, stageValue);
    } else {
      merged[key] = stageValue;
    }
  }

  return merged;
}

function makeEntityKey(side, id) {
  return `${side}:${id}`;
}

function isEntityLocked(state, side, id) {
  if (!id) {
    return false;
  }
  return Boolean(state.lockedEntities?.[makeEntityKey(side, id)]);
}

function lockCurrentGoalEntities(state) {
  const goal = state.currentMap?.goal || {};
  const goalEntries = Object.entries(goal);
  if (goalEntries.length === 0) {
    return state;
  }

  const nextLocked = { ...(state.lockedEntities || {}) };
  for (const [entityId] of goalEntries) {
    if (state.utilities?.[entityId]) {
      nextLocked[makeEntityKey("right", entityId)] = true;
    } else if (state.batteries?.[entityId]) {
      nextLocked[makeEntityKey("left", entityId)] = true;
    }
  }

  return {
    ...state,
    lockedEntities: nextLocked,
  };
}

function buildLiveMapSnapshot(state) {
  return {
    ...(state.currentMap || {}),
    batteries: state.batteries || {},
    utilities: state.utilities || {},
  };
}

function evaluateStageGoal(state) {
  const goal = state.currentMap?.goal || {};
  const goalEntries = Object.entries(goal);
  if (goalEntries.length === 0) {
    return { met: false, pending: [] };
  }

  const pending = [];
  for (const [entityId, targetLevelRaw] of goalEntries) {
    const targetLevel = Number(targetLevelRaw);
    const utility = state.utilities?.[entityId];
    const battery = state.batteries?.[entityId];

    if (utility) {
      if (Number(utility.level) !== targetLevel) {
        pending.push(`${getEntityDisplayName("right", entityId)}: ${utility.level}/${targetLevel}`);
      }
      continue;
    }

    if (battery) {
      if (Number(battery.level) !== targetLevel) {
        pending.push(`${getEntityDisplayName("left", entityId)}: ${battery.level}/${targetLevel}`);
      }
      continue;
    }

    pending.push(`${entityId}: missing/${targetLevel}`);
  }

  return {
    met: pending.length === 0,
    pending,
  };
}

function buildGoalStatusText(state) {
  const goal = state.currentMap?.goal || {};
  const entries = Object.entries(goal);
  if (entries.length === 0) {
    return "No goal";
  }

  if (entries.length === 1) {
    const [entityId, targetLevel] = entries[0];
    const side = state.utilities?.[entityId] ? "right" : "left";
    const name = getEntityDisplayName(side, entityId);
    return `Set power level of ${name} to ${targetLevel}`;
  }

  const parts = entries.map(([entityId, targetLevel]) => {
    const side = state.utilities?.[entityId] ? "right" : "left";
    const name = getEntityDisplayName(side, entityId);
    return `${name}=${targetLevel}`;
  });
  return `Set power levels: ${parts.join(", ")}`;
}

function buildStateFromMapData(state, currentMap, mapStage) {
  const connections = currentMap?.connections || {};
  const nextJunctionDirection = connections[state.junctionDirection]
    ? state.junctionDirection
    : "up";

  return {
    ...state,
    mapStage,
    stage: mapStage + 1,
    currentMap,
    mode: "pick_source",
    cursor: { side: "left", index: 0 },
    sourceSelection: null,
    targetSelection: null,
    lockedEntities: state.lockedEntities || {},
    junctionDirection: nextJunctionDirection,
    batteries: currentMap?.batteries || {},
    utilities: currentMap?.utilities || {},
    connections: {
      up: connections.up || {},
      down: connections.down || {},
    },
  };
}

function nextStage(state) {
  const nextMapStage = (state.mapStage ?? -1) + 1;
  if (nextMapStage < 0 || nextMapStage >= MAP_STATES.length) {
    return {
      ...state,
      transferStatus: {
        message: "No more stages available",
        type: "error",
      },
    };
  }

  const stageMap = MAP_STATES[nextMapStage] || {};
  const mergedMap = mergeMapData(buildLiveMapSnapshot(state), stageMap);
  mergedMap.goal = isPlainObject(stageMap.goal) ? { ...stageMap.goal } : {};
  return {
    ...buildStateFromMapData(state, mergedMap, nextMapStage),
    transferStatus: {
      message: `Stage ${nextMapStage + 1} loaded`,
      type: "ok",
    },
  };
}

function createInitialGameState() {
  const baseState = {
    stage: 0,
    mapStage: -1,
    currentMap: {},
    mode: "pick_source",
    cursor: { side: "left", index: 0 },
    sourceSelection: null,
    targetSelection: null,
    lockedEntities: {},
    pendingTransfer: null,
    transferStatus: { message: "Initializing stage map", type: "ok" },
    junctionDirection: "up",
    batteries: {},
    utilities: {},
    connections: { up: {}, down: {} },
    debugLayout: false,
  };

  return nextStage(baseState);
}

function getVisibleEntityIds(state, side) {
  if (side === "left") {
    return Object.keys(state.batteries || {}).sort((a, b) => Number(a) - Number(b));
  }
  return Object.keys(state.utilities || {}).sort((a, b) => a.localeCompare(b));
}

function normalizeCursorIndex(index, count) {
  if (count <= 0) {
    return 0;
  }
  return ((index % count) + count) % count;
}

function findFirstConnectedUtility(state, batteryId) {
  const byDirection = state.connections?.[state.junctionDirection] || {};
  const connected = byDirection[batteryId] || [];
  return connected.length > 0 ? connected[0] : null;
}

function findFirstConnectedBattery(state, utilityId) {
  const byDirection = state.connections?.[state.junctionDirection] || {};
  const batteryIds = Object.keys(byDirection).sort((a, b) => Number(a) - Number(b));
  for (const batteryId of batteryIds) {
    if ((byDirection[batteryId] || []).includes(utilityId)) {
      return batteryId;
    }
  }
  return null;
}

function getConnectedTargetsForSource(state, sourceSide, sourceId) {
  const byDirection = state.connections?.[state.junctionDirection] || {};
  if (!sourceId) {
    return { targetSide: sourceSide === "left" ? "right" : "left", targetIds: [] };
  }

  if (sourceSide === "left") {
    const targetIds = (byDirection[sourceId] || []).filter((id) => Boolean(state.utilities?.[id]));
    return { targetSide: "right", targetIds };
  }

  const targetIds = Object.keys(byDirection)
    .filter((batteryId) => (byDirection[batteryId] || []).includes(sourceId))
    .sort((a, b) => Number(a) - Number(b));
  return { targetSide: "left", targetIds };
}

function getSelectableIdsForSide(state, side) {
  const lockedSource = state.sourceSelection;
  if (!lockedSource) {
    return getVisibleEntityIds(state, side);
  }

  const { targetSide, targetIds } = getConnectedTargetsForSource(state, lockedSource.side, lockedSource.id);
  if (side === targetSide) {
    return targetIds;
  }
  if (side === lockedSource.side) {
    return [lockedSource.id];
  }
  return [];
}

function getCursorEntityId(state) {
  const side = state.cursor?.side || "left";
  const ids = getSelectableIdsForSide(state, side);
  const index = normalizeCursorIndex(state.cursor?.index || 0, ids.length);
  return ids[index] || null;
}

function getEntityDisplayName(side, id) {
  if (!id) {
    return "Unknown";
  }
  if (side === "left") {
    return `B${id}`;
  }
  return UTILITY_LABELS[id] || `Label ${id}`;
}

function reduceGameState(state, intent) {
  if (!intent || !intent.type) {
    return state;
  }

  const payload = intent.payload || {};

  switch (intent.type) {
    case "APPLY_PENDING_TRANSFER": {
      const transfer = intent.payload?.transfer || state.pendingTransfer;
      if (!transfer) {
        return state;
      }

      const { sourceSide, sourceId, targetSide, targetId, moved } = transfer;
      const nextBatteries = { ...state.batteries };
      const nextUtilities = { ...state.utilities };

      if (sourceSide === "left") {
        nextBatteries[sourceId] = { ...nextBatteries[sourceId], level: nextBatteries[sourceId].level - moved };
        nextUtilities[targetId] = { ...nextUtilities[targetId], level: nextUtilities[targetId].level + moved };
      } else {
        nextUtilities[sourceId] = { ...nextUtilities[sourceId], level: nextUtilities[sourceId].level - moved };
        nextBatteries[targetId] = { ...nextBatteries[targetId], level: nextBatteries[targetId].level + moved };
      }

      const destinationIds = getVisibleEntityIds(state, targetSide);
      const destinationIndex = Math.max(0, destinationIds.indexOf(targetId));
      const sourceName = getEntityDisplayName(sourceSide, sourceId);
      const destinationName = getEntityDisplayName(targetSide, targetId);

      const updatedMap = mergeMapData(state.currentMap || {}, {
        batteries: nextBatteries,
        utilities: nextUtilities,
      });

      const stateAfterTransfer = {
        ...state,
        mode: "pick_source",
        cursor: {
          side: targetSide,
          index: destinationIndex,
        },
        sourceSelection: null,
        targetSelection: null,
        batteries: nextBatteries,
        utilities: nextUtilities,
        currentMap: updatedMap,
        pendingTransfer: null,
        transferStatus: {
          message: `Transferred ${moved} unit${moved === 1 ? "" : "s"} from ${sourceName} to ${destinationName}`,
          type: "ok",
        },
      };

      const goalCheck = evaluateStageGoal(stateAfterTransfer);
      if (goalCheck.met) {
        const withLockedGoals = lockCurrentGoalEntities(stateAfterTransfer);
        // if ((withLockedGoals.mapStage ?? -1) >= MAP_STATES.length - 1) {
        //   return {
        //     ...withLockedGoals,
        //     transferStatus: {
        //       message: "Goal met. Final stage complete!",
        //       type: "ok",
        //     },
        //   };
        // }
        // const advanced = nextStage(withLockedGoals);
        // return {
        //   ...advanced,
        //   transferStatus: {
        //     message: `Goal met. Stage ${advanced.stage} loaded`,
        //     type: "ok",
        //   },
        // };
        return {
          ...withLockedGoals,
          transferStatus: {
            message: "Goal met.",
            type: "ok",
          },
        };
      }

      return stateAfterTransfer;
    }

    case "NEXT_STAGE": {
      const currentGoal = evaluateStageGoal(state);
      const withLockedGoals = currentGoal.met ? lockCurrentGoalEntities(state) : state;
      return nextStage(withLockedGoals);
    }

    case "TOGGLE_JUNCTION": {
      const nextDirection = state.junctionDirection === "up" ? "down" : "up";
      const side = state.sourceSelection
        ? (state.sourceSelection.side === "left" ? "right" : "left")
        : (state.cursor?.side || "left");
      const nextState = {
        ...state,
        junctionDirection: nextDirection,
      };
      const ids = getSelectableIdsForSide(nextState, side);
      const nextIndex = normalizeCursorIndex(state.cursor?.index || 0, ids.length);

      return {
        ...nextState,
        cursor: {
          side,
          index: nextIndex,
        },
        transferStatus: {
          message: `Junction set to ${nextDirection}`,
          type: "ok",
        },
      };
    }

    case "TOGGLE_DEBUG_LAYOUT": {
      return {
        ...state,
        debugLayout: !state.debugLayout,
      };
    }

    case "MOVE_CURSOR": {
      const direction = payload.direction;
      const lockedSource = state.sourceSelection;
      const side = lockedSource
        ? (lockedSource.side === "left" ? "right" : "left")
        : (state.cursor?.side || "left");
      const ids = getSelectableIdsForSide(state, side);
      const index = normalizeCursorIndex(state.cursor?.index || 0, ids.length);

      if (direction === "up" || direction === "down") {
        const delta = direction === "up" ? -1 : 1;
        const nextIndex = normalizeCursorIndex(index + delta, ids.length);
        return {
          ...state,
          cursor: {
            side,
            index: nextIndex,
          },
        };
      }

      if (lockedSource) {
        return state;
      }

      if (direction === "right") {
        if (side === "right") {
          return state;
        }
        const batteryId = ids[index] || null;
        const utilityIds = getVisibleEntityIds(state, "right");
        const preferredUtility = batteryId ? findFirstConnectedUtility(state, batteryId) : null;
        const nextIndex = preferredUtility
          ? Math.max(0, utilityIds.indexOf(preferredUtility))
          : normalizeCursorIndex(index, utilityIds.length);
        return {
          ...state,
          cursor: {
            side: "right",
            index: nextIndex,
          },
        };
      }

      if (direction === "left") {
        if (side === "left") {
          return state;
        }
        const utilityId = ids[index] || null;
        const batteryIds = getVisibleEntityIds(state, "left");
        const preferredBattery = utilityId ? findFirstConnectedBattery(state, utilityId) : null;
        const nextIndex = preferredBattery
          ? Math.max(0, batteryIds.indexOf(preferredBattery))
          : normalizeCursorIndex(index, batteryIds.length);
        return {
          ...state,
          cursor: {
            side: "left",
            index: nextIndex,
          },
        };
      }

      return state;
    }

    case "CONFIRM_SELECTION": {
      if (state.sourceSelection) {
        const sourceSide = state.sourceSelection.side;
        const sourceId = state.sourceSelection.id;
        const targetSide = sourceSide === "left" ? "right" : "left";
        const targetId = getCursorEntityId(state);

        if (!targetId) {
          return {
            ...state,
            transferStatus: {
              message: "No target selected",
              type: "error",
            },
          };
        }

        const sourcePool = sourceSide === "left" ? state.batteries : state.utilities;
        const targetPool = targetSide === "left" ? state.batteries : state.utilities;
        const source = sourcePool?.[sourceId];
        const target = targetPool?.[targetId];

        if (!source || !target) {
          return {
            ...state,
            transferStatus: {
              message: "Transfer failed: invalid source/target",
              type: "error",
            },
          };
        }

        if (isEntityLocked(state, sourceSide, sourceId) || isEntityLocked(state, targetSide, targetId)) {
          const lockedName = isEntityLocked(state, sourceSide, sourceId)
            ? getEntityDisplayName(sourceSide, sourceId)
            : getEntityDisplayName(targetSide, targetId);
          return {
            ...state,
            mode: "pick_source",
            sourceSelection: null,
            targetSelection: null,
            transferStatus: {
              message: `${lockedName} is locked`,
              type: "error",
            },
          };
        }

        const available = Math.max(0, source.level || 0);
        const remaining = Math.max(0, (target.capacity || 0) - (target.level || 0));
        const moved = Math.min(available, remaining);

        const sourceIds = getVisibleEntityIds(state, sourceSide);
        const sourceIndex = Math.max(0, sourceIds.indexOf(sourceId));

        if (moved <= 0) {
          const sourceName = getEntityDisplayName(sourceSide, sourceId);
          const destinationName = getEntityDisplayName(targetSide, targetId);
          const errorMsg = available <= 0
            ? `${sourceName} has no charge`
            : remaining <= 0
              ? `${destinationName} is full`
              : "No transferable energy";
          return {
            ...state,
            mode: "pick_source",
            cursor: {
              side: sourceSide,
              index: sourceIndex,
            },
            sourceSelection: null,
            targetSelection: null,
            transferStatus: {
              message: errorMsg,
              type: "error",
            },
          };
        }
        const sourceName = getEntityDisplayName(sourceSide, sourceId);
        const destinationName = getEntityDisplayName(targetSide, targetId);

        return {
          ...state,
          pendingTransfer: {
            sourceSide,
            sourceId,
            targetSide,
            targetId,
            moved,
          },
          transferStatus: {
            message: `Transferring ${moved} unit${moved === 1 ? "" : "s"} from ${sourceName} to ${destinationName}...`,
            type: "ok",
          },
        };
      }

      const sourceSide = state.cursor?.side || "left";
      const sourceId = getCursorEntityId(state);
      if (!sourceId) {
        return state;
      }

      const sourcePool = sourceSide === "left" ? state.batteries : state.utilities;
      const source = sourcePool?.[sourceId];
      const sourceLevel = Math.max(0, source?.level || 0);
      if (isEntityLocked(state, sourceSide, sourceId)) {
        const sourceName = getEntityDisplayName(sourceSide, sourceId);
        return {
          ...state,
          transferStatus: {
            message: `${sourceName} is locked`,
            type: "error",
          },
        };
      }
      if (sourceLevel <= 0) {
        const sourceName = getEntityDisplayName(sourceSide, sourceId);
        return {
          ...state,
          transferStatus: {
            message: `${sourceName} is empty`,
            type: "error",
          },
        };
      }

      const { targetSide, targetIds } = getConnectedTargetsForSource(state, sourceSide, sourceId);
      if (targetIds.length === 0) {
        return {
          ...state,
          transferStatus: {
            message: "No connected targets",
            type: "error",
          },
        };
      }

      return {
        ...state,
        mode: "pick_target",
        sourceSelection: { side: sourceSide, id: sourceId },
        targetSelection: null,
        pendingTransfer: null,
        cursor: {
          side: targetSide,
          index: 0,
        },
        transferStatus: {
          message: "Source locked: choose connected target",
          type: "ok",
        },
      };
    }

    case "CANCEL_SELECTION": {
      if (!state.sourceSelection) {
        return state;
      }

      const sourceSide = state.sourceSelection.side;
      const sourceId = state.sourceSelection.id;
      const ids = getVisibleEntityIds(state, sourceSide);
      const sourceIndex = Math.max(0, ids.indexOf(sourceId));

      return {
        ...state,
        mode: "pick_source",
        sourceSelection: null,
        targetSelection: null,
        cursor: {
          side: sourceSide,
          index: sourceIndex,
        },
        transferStatus: {
          message: "Selection canceled",
          type: "ok",
        },
      };
    }

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

function buildUtilityBatteryIndex(state) {
  const utilityToBatteries = {};
  for (const direction of ["up", "down"]) {
    const byDirection = state.connections?.[direction] || {};
    for (const batteryId of Object.keys(byDirection)) {
      for (const utilityId of byDirection[batteryId] || []) {
        if (!utilityToBatteries[utilityId]) {
          utilityToBatteries[utilityId] = new Set();
        }
        utilityToBatteries[utilityId].add(batteryId);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(utilityToBatteries).map(([utilityId, batteryIds]) => [
      utilityId,
      Array.from(batteryIds).sort((a, b) => Number(a) - Number(b)),
    ])
  );
}

function buildSlotAssignments(state, batteryShapes) {
  const batteryById = Object.fromEntries(batteryShapes.map((battery) => [battery.id, battery]));
  const utilityBatteryIndex = buildUtilityBatteryIndex(state);
  const utilityAnchors = {};
  const utilityLineAnchors = {};
  const batterySlots = {};
  const usedSlots = {};

  for (const battery of batteryShapes) {
    batterySlots[battery.id] = Array(UI_NUMBERS.batterySlotCount).fill(null);
    usedSlots[battery.id] = new Set();
  }

  // Utilities connected to two adjacent batteries get fixed ports:
  // bottom of the upper battery and top of the lower battery.
  for (const utilityId of Object.keys(utilityBatteryIndex).sort((a, b) => a.localeCompare(b))) {
    const batteryIds = utilityBatteryIndex[utilityId] || [];
    if (batteryIds.length !== 2) {
      continue;
    }

    const upperId = batteryIds[0];
    const lowerId = batteryIds[1];
    if (Number(lowerId) - Number(upperId) !== 1) {
      continue;
    }

    const upperBattery = batteryById[upperId];
    const lowerBattery = batteryById[lowerId];
    if (!upperBattery || !lowerBattery) {
      continue;
    }

    const upperSlotIndex = UI_NUMBERS.batterySlotCount - 1;
    const lowerSlotIndex = 0;
    usedSlots[upperId].add(upperSlotIndex);
    usedSlots[lowerId].add(lowerSlotIndex);
    batterySlots[upperId][upperSlotIndex] = utilityId;
    batterySlots[lowerId][lowerSlotIndex] = utilityId;

    const anchors = [
      {
        batteryId: upperId,
        slotIndex: upperSlotIndex,
        centerY: upperBattery.slotYs[upperSlotIndex],
        lineStartX: upperBattery.x + upperBattery.w,
      },
      {
        batteryId: lowerId,
        slotIndex: lowerSlotIndex,
        centerY: lowerBattery.slotYs[lowerSlotIndex],
        lineStartX: lowerBattery.x + lowerBattery.w,
      },
    ];

    utilityLineAnchors[utilityId] = anchors;
    utilityAnchors[utilityId] = {
      centerY: Math.round((anchors[0].centerY + anchors[1].centerY) / 2),
    };
  }

  for (const utilityId of Object.keys(utilityBatteryIndex).sort((a, b) => a.localeCompare(b))) {
    if (utilityAnchors[utilityId]) {
      continue;
    }

    const batteryIds = utilityBatteryIndex[utilityId] || [];
    const batteryId = batteryIds.find((id) => Boolean(batteryById[id]));
    if (!batteryId) {
      continue;
    }

    const battery = batteryById[batteryId];
    let slotIndex = 0;
    while (slotIndex < UI_NUMBERS.batterySlotCount && usedSlots[batteryId].has(slotIndex)) {
      slotIndex += 1;
    }
    if (slotIndex >= UI_NUMBERS.batterySlotCount) {
      slotIndex = 0;
    }

    usedSlots[batteryId].add(slotIndex);
    batterySlots[batteryId][slotIndex] = utilityId;
    const anchor = {
      batteryId,
      slotIndex,
      centerY: battery.slotYs[slotIndex],
      lineStartX: battery.x + battery.w,
    };
    utilityLineAnchors[utilityId] = [anchor];
    utilityAnchors[utilityId] = { centerY: anchor.centerY };
  }

  return { batterySlots, utilityAnchors, utilityLineAnchors };
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

function buildUtilityLines(state, utilityShapes, slotAssignments) {
  const utilityLineAnchors = slotAssignments?.utilityLineAnchors || {};
  const byDirection = state.connections?.[state.junctionDirection] || {};
  const lines = [];

  for (const utility of utilityShapes) {
    const anchors = utilityLineAnchors[utility.id] || [];
    if (anchors.length === 0 || utility.cells.length === 0) {
      continue;
    }

    for (const anchor of anchors) {
      const activeTargets = byDirection[anchor.batteryId] || [];
      lines.push({
        utilityId: utility.id,
        batteryId: anchor.batteryId,
        x1: anchor.lineStartX,
        y1: anchor.centerY,
        x2: utility.cells[0].x - UI_NUMBERS.utilityLineGapBeforeCellsPx,
        y2: utility.lineY,
        isActive: activeTargets.includes(utility.id),
      });
    }
  }

  return lines;
}

function buildViewModel(state, innerRectPx) {
  const mapRect = rectPctToPx(MAP_RECT_PCT, innerRectPx);
  const statusRect = rectPctToPx(STATUS_RECT_PCT, innerRectPx);
  const batteries = buildBatteryShapes(state, mapRect);
  const slotAssignments = buildSlotAssignments(state, batteries);
  const utilities = buildUtilityShapes(state, mapRect, slotAssignments);
  const batteryIds = getSelectableIdsForSide(state, "left");
  const utilityIds = getSelectableIdsForSide(state, "right");
  const cursorSide = state.cursor?.side || "left";
  const cursorIndex = state.cursor?.index || 0;
  const selectedBatteryId = cursorSide === "left"
    ? batteryIds[normalizeCursorIndex(cursorIndex, batteryIds.length)]
    : null;
  const selectedUtilityId = cursorSide === "right"
    ? utilityIds[normalizeCursorIndex(cursorIndex, utilityIds.length)]
    : null;
  const lockedBatteryId = state.sourceSelection?.side === "left" ? state.sourceSelection.id : null;
  const lockedUtilityId = state.sourceSelection?.side === "right" ? state.sourceSelection.id : null;
  const validTargets = state.sourceSelection
    ? getConnectedTargetsForSource(state, state.sourceSelection.side, state.sourceSelection.id)
    : { targetSide: null, targetIds: [] };
  const validTargetBatteryIds = validTargets.targetSide === "left" ? validTargets.targetIds : [];
  const validTargetUtilityIds = validTargets.targetSide === "right" ? validTargets.targetIds : [];
  const goalLockedBatteryIds = batteries
    .map((battery) => battery.id)
    .filter((id) => isEntityLocked(state, "left", id));
  const goalLockedUtilityIds = utilities
    .map((utility) => utility.id)
    .filter((id) => isEntityLocked(state, "right", id));
  const goalText = buildGoalStatusText(state);

  return {
    mapPanel: {
      title: "Shape Map",
      rect: mapRect,
      batteries,
      utilities,
      utilityLines: buildUtilityLines(state, utilities, slotAssignments),
      selectedBatteryId,
      selectedUtilityId,
      lockedBatteryId,
      lockedUtilityId,
      validTargetBatteryIds,
      validTargetUtilityIds,
      goalLockedBatteryIds,
      goalLockedUtilityIds,
    },
    statusPanel: {
      title: "Status",
      rect: statusRect,
      statusLine: `Stage ${state.stage} | Mode ${state.mode} | Junction ${state.junctionDirection} | Goal: ${goalText}`,
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

function drawBatteryGlyph(scene, battery, isSelected = false, isLocked = false, isValidTarget = false, isGoalLocked = false) {
  const stroke = parseInt((isGoalLocked ? UI_COLORS.goalLocked : UI_COLORS.body).replace("#", ""), 16);
  const filled = parseInt((isGoalLocked ? UI_COLORS.goalLocked : UI_COLORS.header).replace("#", ""), 16);
  const cursor = parseInt(UI_COLORS.cursor.replace("#", ""), 16);
  const locked = parseInt(UI_COLORS.locked.replace("#", ""), 16);
  const validTarget = parseInt(UI_COLORS.validTarget.replace("#", ""), 16);
  const goalLocked = parseInt(UI_COLORS.goalLocked.replace("#", ""), 16);

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

  if (isSelected) {
    g.lineStyle(UI_NUMBERS.cursorHighlightWidthPx, cursor, UI_NUMBERS.cursorHighlightAlpha);
    g.strokeRoundedRect(
      battery.x - UI_NUMBERS.cursorHighlightInsetPx,
      battery.y - UI_NUMBERS.cursorHighlightInsetPx,
      battery.w + UI_NUMBERS.cursorHighlightInsetPx * 2,
      battery.h + UI_NUMBERS.cursorHighlightInsetPx * 2,
      UI_NUMBERS.batteryBodyCornerRadiusPx
    );
  }

  if (isValidTarget) {
    g.lineStyle(UI_NUMBERS.validTargetHighlightWidthPx, validTarget, UI_NUMBERS.validTargetHighlightAlpha);
    g.strokeRoundedRect(
      battery.x - UI_NUMBERS.validTargetHighlightInsetPx,
      battery.y - UI_NUMBERS.validTargetHighlightInsetPx,
      battery.w + UI_NUMBERS.validTargetHighlightInsetPx * 2,
      battery.h + UI_NUMBERS.validTargetHighlightInsetPx * 2,
      UI_NUMBERS.batteryBodyCornerRadiusPx
    );
  }

  if (isLocked) {
    g.lineStyle(UI_NUMBERS.lockedHighlightWidthPx, locked, UI_NUMBERS.lockedHighlightAlpha);
    g.strokeRoundedRect(
      battery.x - UI_NUMBERS.lockedHighlightInsetPx,
      battery.y - UI_NUMBERS.lockedHighlightInsetPx,
      battery.w + UI_NUMBERS.lockedHighlightInsetPx * 2,
      battery.h + UI_NUMBERS.lockedHighlightInsetPx * 2,
      UI_NUMBERS.batteryBodyCornerRadiusPx
    );
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

function drawUtilityGlyph(scene, utility, isSelected = false, isLocked = false, isValidTarget = false, isGoalLocked = false) {
  const stroke = parseInt((isGoalLocked ? UI_COLORS.goalLocked : UI_COLORS.body).replace("#", ""), 16);
  const filled = parseInt((isGoalLocked ? UI_COLORS.goalLocked : UI_COLORS.header).replace("#", ""), 16);
  const cursor = parseInt(UI_COLORS.cursor.replace("#", ""), 16);
  const locked = parseInt(UI_COLORS.locked.replace("#", ""), 16);
  const validTarget = parseInt(UI_COLORS.validTarget.replace("#", ""), 16);
  const goalLocked = parseInt(UI_COLORS.goalLocked.replace("#", ""), 16);

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

  if (isSelected && utility.cells.length > 0) {
    const firstCell = utility.cells[0];
    const lastCell = utility.cells[utility.cells.length - 1];
    const blockX = firstCell.x;
    const blockY = firstCell.y;
    const blockW = (lastCell.x - firstCell.x) + UI_NUMBERS.utilityCellSizePx;
    const blockH = UI_NUMBERS.utilityCellSizePx;
    g.lineStyle(UI_NUMBERS.cursorHighlightWidthPx, cursor, UI_NUMBERS.cursorHighlightAlpha);
    g.strokeRoundedRect(
      blockX - UI_NUMBERS.cursorHighlightInsetPx,
      blockY - UI_NUMBERS.cursorHighlightInsetPx,
      blockW + UI_NUMBERS.cursorHighlightInsetPx * 2,
      blockH + UI_NUMBERS.cursorHighlightInsetPx * 2,
      UI_NUMBERS.utilityCellCornerRadiusPx
    );
  }

  if (isValidTarget && utility.cells.length > 0) {
    const firstCell = utility.cells[0];
    const lastCell = utility.cells[utility.cells.length - 1];
    const blockX = firstCell.x;
    const blockY = firstCell.y;
    const blockW = (lastCell.x - firstCell.x) + UI_NUMBERS.utilityCellSizePx;
    const blockH = UI_NUMBERS.utilityCellSizePx;
    g.lineStyle(UI_NUMBERS.validTargetHighlightWidthPx, validTarget, UI_NUMBERS.validTargetHighlightAlpha);
    g.strokeRoundedRect(
      blockX - UI_NUMBERS.validTargetHighlightInsetPx,
      blockY - UI_NUMBERS.validTargetHighlightInsetPx,
      blockW + UI_NUMBERS.validTargetHighlightInsetPx * 2,
      blockH + UI_NUMBERS.validTargetHighlightInsetPx * 2,
      UI_NUMBERS.utilityCellCornerRadiusPx
    );
  }

  if (isLocked && utility.cells.length > 0) {
    const firstCell = utility.cells[0];
    const lastCell = utility.cells[utility.cells.length - 1];
    const blockX = firstCell.x;
    const blockY = firstCell.y;
    const blockW = (lastCell.x - firstCell.x) + UI_NUMBERS.utilityCellSizePx;
    const blockH = UI_NUMBERS.utilityCellSizePx;
    g.lineStyle(UI_NUMBERS.lockedHighlightWidthPx, locked, UI_NUMBERS.lockedHighlightAlpha);
    g.strokeRoundedRect(
      blockX - UI_NUMBERS.lockedHighlightInsetPx,
      blockY - UI_NUMBERS.lockedHighlightInsetPx,
      blockW + UI_NUMBERS.lockedHighlightInsetPx * 2,
      blockH + UI_NUMBERS.lockedHighlightInsetPx * 2,
      UI_NUMBERS.utilityCellCornerRadiusPx
    );
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
  for (const line of lines) {
    const alpha = line.isActive ? UI_NUMBERS.utilityLineActiveAlpha : UI_NUMBERS.utilityLineInactiveAlpha;
    g.lineStyle(UI_NUMBERS.utilityLineWidthPx, stroke, alpha);
    g.lineBetween(line.x1, line.y1, line.x2, line.y2);
  }
  scene.ui.add(g);
}

function renderFromViewModel(scene, viewModel) {
  drawPanelFrame(scene, viewModel.mapPanel.rect, viewModel.mapPanel.title);
  drawPanelFrame(scene, viewModel.statusPanel.rect, viewModel.statusPanel.title);

  for (const battery of viewModel.mapPanel.batteries) {
    drawBatteryGlyph(
      scene,
      battery,
      battery.id === viewModel.mapPanel.selectedBatteryId,
      battery.id === viewModel.mapPanel.lockedBatteryId,
      viewModel.mapPanel.validTargetBatteryIds.includes(battery.id),
      viewModel.mapPanel.goalLockedBatteryIds.includes(battery.id)
    );
  }
  drawUtilityLines(scene, viewModel.mapPanel.utilityLines);
  for (const utility of viewModel.mapPanel.utilities) {
    drawUtilityGlyph(
      scene,
      utility,
      utility.id === viewModel.mapPanel.selectedUtilityId,
      utility.id === viewModel.mapPanel.lockedUtilityId,
      viewModel.mapPanel.validTargetUtilityIds.includes(utility.id),
      viewModel.mapPanel.goalLockedUtilityIds.includes(utility.id)
    );
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
  const displayedStatusMessage = scene.getDisplayedStatusMessage(viewModel.statusPanel.status.message || "");
  const statusText = draw.bind(scene)(`Status: ${displayedStatusMessage}`, {
    offsetXPx: viewModel.statusPanel.rect.x + UI_NUMBERS.panelTextOffsetXPx,
    offsetYPx: viewModel.statusPanel.rect.y + Math.max(UI_NUMBERS.strokeWidth, Math.round(viewModel.statusPanel.rect.height * UI_NUMBERS.statusMessageOffsetRatio)),
    textStyle: statusStyle,
  });
  scene.statusMessageText = statusText;

  // DEBUG
  if (viewModel.debugLayout) {
    drawLayoutDebug(this, innerRectPx, MAP_RECT_PCT, STATUS_RECT_PCT);
  }
}

export default class RefactoredMap extends Phaser.Scene {
  constructor() {
    super("RefactoredMap");
    this.gameState = createInitialGameState();
    this.ui = null;
    this.fx = null;
    this.lastViewModel = null;
    this.transferAnimationActive = false;
    this.statusMessageText = null;
    this.statusTypingEvent = null;
    this.statusTargetMessage = "";
    this.statusTypedMessage = "";
    this.statusTypedLength = 0;
  }

  create() {
    updateRegistryFromScale(this);
    this.fx = this.add.container(0, 0);
    this.bindInput();
    this.render();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearStatusTypingEvent();
    });

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.clearStatusTypingEvent();
    });

    this.scale.on("resize", () => {
      updateRegistryFromScale(this);
      this.render();
    });
  }

  clearTransferFx() {
    this.fx?.removeAll(true);
  }

  getTransferPath(transfer) {
    const viewModel = this.lastViewModel;
    if (!viewModel) {
      return null;
    }

    const activeLine = (viewModel.mapPanel.utilityLines || []).find((line) => {
      if (!line.isActive) {
        return false;
      }

      if (transfer.sourceSide === "left" && transfer.targetSide === "right") {
        return line.batteryId === transfer.sourceId && line.utilityId === transfer.targetId;
      }

      if (transfer.sourceSide === "right" && transfer.targetSide === "left") {
        return line.batteryId === transfer.targetId && line.utilityId === transfer.sourceId;
      }

      return false;
    });

    if (!activeLine) {
      return null;
    }

    if (transfer.sourceSide === "left") {
      return {
        start: { x: activeLine.x1, y: activeLine.y1 },
        end: { x: activeLine.x2, y: activeLine.y2 },
      };
    }

    return {
      start: { x: activeLine.x2, y: activeLine.y2 },
      end: { x: activeLine.x1, y: activeLine.y1 },
    };
  }

  playPendingTransferAnimation(transfer) {
    const path = this.getTransferPath(transfer);
    if (!path) {
      this.transferAnimationActive = false;
      this.dispatch({ type: "APPLY_PENDING_TRANSFER", payload: { transfer } });
      return;
    }

    this.transferAnimationActive = true;
    this.clearTransferFx();

    const dotColor = parseInt(UI_COLORS.accent.replace("#", ""), 16);
    const dotCount = UI_NUMBERS.transferDotCount;
    let completed = 0;

    const finishOne = () => {
      completed += 1;
      if (completed < dotCount) {
        return;
      }
      this.clearTransferFx();
      this.transferAnimationActive = false;
      this.dispatch({ type: "APPLY_PENDING_TRANSFER", payload: { transfer } });
    };

    for (let i = 0; i < dotCount; i += 1) {
      const dot = this.add.circle(path.start.x, path.start.y, UI_NUMBERS.transferDotRadiusPx, dotColor, UI_NUMBERS.transferDotAlpha);
      this.fx.add(dot);

      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: UI_NUMBERS.transferDotDurationMs,
        delay: i * UI_NUMBERS.transferDotStaggerMs,
        onUpdate: (tween) => {
          const t = tween.getValue();
          dot.x = Phaser.Math.Linear(path.start.x, path.end.x, t);
          dot.y = Phaser.Math.Linear(path.start.y, path.end.y, t);
        },
        onComplete: () => {
          dot.destroy();
          finishOne();
        },
      });
    }
  }

  clearStatusTypingEvent() {
    if (this.statusTypingEvent) {
      this.statusTypingEvent.remove(false);
      this.statusTypingEvent = null;
    }
  }

  applyTypedStatusToText() {
    if (!this.statusMessageText || !this.statusMessageText.active) {
      return;
    }
    this.statusMessageText.setText(`Status: ${this.statusTypedMessage}`);
  }

  syncStatusTypingTarget(message) {
    const nextMessage = String(message || "");
    if (nextMessage === this.statusTargetMessage) {
      return;
    }

    this.clearStatusTypingEvent();
    this.statusTargetMessage = nextMessage;
    this.statusTypedMessage = "";
    this.statusTypedLength = 0;

    if (nextMessage.length === 0) {
      return;
    }

    // Show first character immediately, then type the rest quickly.
    this.statusTypedLength = 1;
    this.statusTypedMessage = nextMessage.slice(0, this.statusTypedLength);
    if (this.statusTypedLength >= nextMessage.length) {
      return;
    }

    this.statusTypingEvent = this.time.addEvent({
      delay: UI_NUMBERS.statusTypeCharIntervalMs,
      loop: true,
      callback: () => {
        if (this.statusTargetMessage !== nextMessage) {
          return;
        }

        this.statusTypedLength = Math.min(nextMessage.length, this.statusTypedLength + 1);
        this.statusTypedMessage = nextMessage.slice(0, this.statusTypedLength);

        if (this.statusTypedLength >= nextMessage.length) {
          this.clearStatusTypingEvent();
        }

        this.applyTypedStatusToText();
      },
    });
  }

  getDisplayedStatusMessage(rawMessage) {
    this.syncStatusTypingTarget(rawMessage);
    return this.statusTypedMessage;
  }

  bindInput() {
    this.input.keyboard.on("keydown-UP", () => {
      this.dispatch({ type: "MOVE_CURSOR", payload: { direction: "up" } });
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      this.dispatch({ type: "MOVE_CURSOR", payload: { direction: "down" } });
    });

    this.input.keyboard.on("keydown-LEFT", () => {
      this.dispatch({ type: "MOVE_CURSOR", payload: { direction: "left" } });
    });

    this.input.keyboard.on("keydown-RIGHT", () => {
      this.dispatch({ type: "MOVE_CURSOR", payload: { direction: "right" } });
    });

    this.input.keyboard.on("keydown-ENTER", () => {
      this.dispatch({ type: "CONFIRM_SELECTION" });
    });

    this.input.keyboard.on("keydown-ESC", () => {
      this.dispatch({ type: "CANCEL_SELECTION" });
    });

    this.input.keyboard.on("keydown-Q", () => {
      this.dispatch({ type: "TOGGLE_DEBUG_LAYOUT" });
    });

    this.input.keyboard.on("keydown-J", () => {
      this.dispatch({ type: "TOGGLE_JUNCTION" });
    });

    this.input.keyboard.on("keydown-N", () => {
      this.dispatch({ type: "NEXT_STAGE" });
    });
  }

  dispatch(intent) {
    if (this.transferAnimationActive && intent?.type !== "APPLY_PENDING_TRANSFER") {
      return;
    }

    const pendingBefore = this.gameState?.pendingTransfer;
    this.gameState = reduceGameState(this.gameState, intent);
    this.registry.set("debugLayout", this.gameState.debugLayout);
    this.render();

    const pendingAfter = this.gameState?.pendingTransfer;
    if (!pendingBefore && pendingAfter) {
      this.playPendingTransferAnimation(pendingAfter);
    }
  }

  render() {
    this.statusMessageText = null;
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    const gridOriginPx = this.registry.get("gridOriginPx") || { x: 0, y: 0 };
    this.ui.setPosition(gridOriginPx.x, gridOriginPx.y);
    this.fx?.setPosition(gridOriginPx.x, gridOriginPx.y);

    const { innerRectPx } = drawBorderBox.bind(this)("Power Puzzle");

    const viewModel = buildViewModel(this.gameState, innerRectPx);
    this.lastViewModel = viewModel;
    renderFromViewModel(this, viewModel);
    // if (viewModel.debugLayout) {
    //   drawLayoutDebug(this, innerRectPx, MAP_RECT_PCT, STATUS_RECT_PCT);
    // }
  }
}
