import {
  EXTRA_MARGINS_IN_PX,
  TARGET_ASPECT,
  DIAGRAM_MIN_GRID,
  makeTextStyle,
} from "../config/constants";

function measureCellSizePx(probeText, fontSizePx) {
  const samples = 200;
  const probeChar = "M";
  probeText.setStyle(makeTextStyle(fontSizePx));
  probeText.setText(probeChar.repeat(samples));
  const cellW = probeText.width / samples;
  probeText.setText(probeChar + "\n" + probeChar);
  const cellH = probeText.height / 2;
  return { cellW, cellH };
}

/**
 * Compute layout dimensions for a responsive grid-based UI.
 * 
 * Strategy:
 * 1. Fit a target aspect ratio inside the viewport (FIT, not FILL)
 * 2. Apply extra margins in px around the fitted area
 * 3. Compute cell size from a minimum diagram grid
 * 4. Derive actual grid cell counts that fit within the fitted area
 * 5. Center the grid inside the fitted area
 */
export function computeLayout(scene, config = {}) {
  const {
    minGridCols = DIAGRAM_MIN_GRID.cols,
    minGridRows = DIAGRAM_MIN_GRID.rows,
    targetAspect = TARGET_ASPECT,
    maxCellSizePx = null,
  } = config;

  const { scale, registry } = scene;
  const viewportW = scale.width;
  const viewportH = scale.height;
  const aspect = targetAspect.width / targetAspect.height;
  let fitW = viewportW;
  let fitH = Math.floor(fitW / aspect);
  if (fitH > viewportH) {
    fitH = viewportH;
    fitW = Math.floor(fitH * aspect);
  }

  const rawFitRect = {
    x: Math.floor((viewportW - fitW) / 2),
    y: Math.floor((viewportH - fitH) / 2),
    width: Math.max(0, fitW),
    height: Math.max(0, fitH),
  };

  const marginsH = EXTRA_MARGINS_IN_PX.left + EXTRA_MARGINS_IN_PX.right;
  const marginsV = EXTRA_MARGINS_IN_PX.top + EXTRA_MARGINS_IN_PX.bottom;
  const drawAreaRect = {
    x: rawFitRect.x + EXTRA_MARGINS_IN_PX.left,
    y: rawFitRect.y + EXTRA_MARGINS_IN_PX.top,
    width: Math.max(0, rawFitRect.width - marginsH),
    height: Math.max(0, rawFitRect.height - marginsV),
  };

  if (!scene._layoutProbeText) {
    scene._layoutProbeText = scene.add.text(0, 0, "", makeTextStyle(1)).setVisible(false);
    scene._layoutProbeText.setResolution(1);
  }
  const probeText = scene._layoutProbeText;

  // Step 1: Find optimal cell size for the minimum diagram grid
  const baseFontSizePx = 100;
  const baseMetrics = measureCellSizePx(probeText, baseFontSizePx);
  const cellWPerPx = baseMetrics.cellW / baseFontSizePx;
  const cellHPerPx = baseMetrics.cellH / baseFontSizePx;

  const targetCellWPx = Math.max(1, Math.floor(drawAreaRect.width / minGridCols));
  const targetCellHPx = Math.max(1, Math.floor(drawAreaRect.height / minGridRows));

  let fontSizePx = Math.max(1, Math.floor(
    Math.min(
      targetCellWPx / cellWPerPx,
      targetCellHPx / cellHPerPx,
    )
  ));

  if (maxCellSizePx) {
    fontSizePx = Math.min(fontSizePx, maxCellSizePx);
  }

  // Binary search refinement: find the largest fontSizePx that fits
  let metrics = measureCellSizePx(probeText, fontSizePx);
  while (fontSizePx > 1 && (metrics.cellW > targetCellWPx || metrics.cellH > targetCellHPx)) {
    fontSizePx -= 1;
    metrics = measureCellSizePx(probeText, fontSizePx);
  }
  while (true) {
    const nextFontSize = fontSizePx + 1;
    const nextMetrics = measureCellSizePx(probeText, nextFontSize);
    if (nextMetrics.cellW > targetCellWPx || nextMetrics.cellH > targetCellHPx) {
      break;
    }
    fontSizePx = nextFontSize;
    metrics = nextMetrics;
  }

  // Step 2: Calculate actual diagram pixel dimensions
  const measuredCellWidthPx = Math.max(1, metrics.cellW);
  const measuredCellHeightPx = Math.max(1, metrics.cellH);
  const cellWidthPx = Math.max(1, Math.round(measuredCellWidthPx));
  const cellHeightPx = Math.max(1, Math.round(measuredCellHeightPx));

  const drawAreaWidthInCells = Math.max(1, Math.floor(drawAreaRect.width / measuredCellWidthPx));
  const drawAreaHeightInCells = Math.max(1, Math.floor(drawAreaRect.height / measuredCellHeightPx));
  const gridWidthPx = Math.round(drawAreaWidthInCells * measuredCellWidthPx);
  const gridHeightPx = Math.round(drawAreaHeightInCells * measuredCellHeightPx);
  const gridOriginPx = {
    x: drawAreaRect.x + Math.round((drawAreaRect.width - gridWidthPx) / 2),
    y: drawAreaRect.y + Math.round((drawAreaRect.height - gridHeightPx) / 2),
  };

  const marginsPx = {
    left: gridOriginPx.x,
    top: gridOriginPx.y,
    right: Math.max(0, viewportW - gridOriginPx.x - gridWidthPx),
    bottom: Math.max(0, viewportH - gridOriginPx.y - gridHeightPx),
  };

  // Return comprehensive layout info
  return {
    minGridCols,
    minGridRows,

    cellWidthPx,
    cellHeightPx,
    fontSizePx,
    drawAreaRect,
    drawAreaWidthInCells,
    drawAreaHeightInCells,
    gridOriginPx,
    gridWidthPx,
    gridHeightPx,
    marginsPx,
    canvasW: drawAreaRect.width,
    canvasH: drawAreaRect.height,
  };
}

export function updateRegistryFromLayout(scene, layoutInfo) {
  const { registry } = scene;
  if (registry.get("debugLayout") == null) {
    registry.set("debugLayout", false);
  }
  registry.set("cellWidthPx", layoutInfo.cellWidthPx);
  registry.set("cellHeightPx", layoutInfo.cellHeightPx);
  registry.set("fontSizePx", layoutInfo.fontSizePx);
  registry.set("textStyle", makeTextStyle(layoutInfo.fontSizePx));
  registry.set("marginsPx", layoutInfo.marginsPx);
  registry.set("drawAreaRect", layoutInfo.drawAreaRect);
  registry.set("gridOriginPx", layoutInfo.gridOriginPx);
  registry.set("gridWidthPx", layoutInfo.gridWidthPx);
  registry.set("gridHeightPx", layoutInfo.gridHeightPx);
  registry.set("drawAreaWidthInCells", layoutInfo.drawAreaWidthInCells);
  registry.set("drawAreaHeightInCells", layoutInfo.drawAreaHeightInCells);
  registry.set("drawInnerAreaWidthInCells", Math.max(0, layoutInfo.drawAreaWidthInCells - 2));
  registry.set("drawInnerAreaHeightInCells", Math.max(0, layoutInfo.drawAreaHeightInCells - 2));
}
