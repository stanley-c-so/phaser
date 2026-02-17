import {
  EXTRA_MARGINS_IN_PX,
  DRAW_AREA_WIDTH_IN_CELLS,
  DRAW_AREA_HEIGHT_IN_CELLS,
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
 * 1. Compute cellSizePx based on the DIAGRAM grid (DRAW_AREA_WIDTH_IN_CELLS, DRAW_AREA_HEIGHT_IN_CELLS)
 * 2. Diagram renders at that integer cell size
 * 3. Control panel is flexible (can have variable font sizes)
 * 4. Global scale applies to the entire layout container for responsive scaling
 * 5. Letterboxing (centered, black bars) if viewport aspect ratio doesn't match
 */
export function computeLayout(scene, config = {}) {
  const {
    diagramGridWidth = DRAW_AREA_WIDTH_IN_CELLS,
    diagramGridHeight = DRAW_AREA_HEIGHT_IN_CELLS,
    controlPanelWidthRatio = 0.5, // Default: control panel takes ~50% of layout width
    maxCellSizePx = null, // Optional: cap the cell size
  } = config;

  const { scale, registry } = scene;
  const viewportW = scale.width;
  const viewportH = scale.height;
  const marginsH = EXTRA_MARGINS_IN_PX.left + EXTRA_MARGINS_IN_PX.right;
  const marginsV = EXTRA_MARGINS_IN_PX.top + EXTRA_MARGINS_IN_PX.bottom;
  const canvasW = Math.max(0, viewportW - marginsH);
  const canvasH = Math.max(0, viewportH - marginsV);

  if (!scene._layoutProbeText) {
    scene._layoutProbeText = scene.add.text(0, 0, "", makeTextStyle(1)).setVisible(false);
    scene._layoutProbeText.setResolution(1);
  }
  const probeText = scene._layoutProbeText;

  // Step 1: Find optimal cell size for the diagram grid
  const baseFontSizePx = 100;
  const baseMetrics = measureCellSizePx(probeText, baseFontSizePx);
  const cellWPerPx = baseMetrics.cellW / baseFontSizePx;
  const cellHPerPx = baseMetrics.cellH / baseFontSizePx;

  // Calculate target cell size based on available width and height
  // We split the canvas: diagram takes (1 - controlPanelWidthRatio), control panel takes controlPanelWidthRatio
  const diagramMaxWidth = canvasW * (1 - controlPanelWidthRatio);
  const diagramMaxHeight = canvasH;

  const targetCellWPx = Math.max(1, Math.floor(diagramMaxWidth / diagramGridWidth));
  const targetCellHPx = Math.max(1, Math.floor(diagramMaxHeight / diagramGridHeight));

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
  const measuredCellWidthPx = Math.max(1, Math.floor(metrics.cellW));
  const measuredCellHeightPx = Math.max(1, Math.floor(metrics.cellH));

  probeText.setStyle(makeTextStyle(fontSizePx));
  probeText.setText("M".repeat(diagramGridWidth));
  const diagramWidthPx = Math.max(1, Math.floor(probeText.width));
  probeText.setText(Array.from({ length: diagramGridHeight }, () => "M").join("\n"));
  const diagramHeightPx = Math.max(1, Math.floor(probeText.height));

  // Step 3: Calculate layout container size and global scale
  // The layout container includes both diagram and control panel
  const layoutWidthPx = diagramWidthPx / (1 - controlPanelWidthRatio);
  const layoutHeightPx = diagramHeightPx;

  // Compute scale to fit layout into available canvas
  const scaleX = canvasW / layoutWidthPx;
  const scaleY = canvasH / layoutHeightPx;
  const globalScale = Math.min(scaleX, scaleY, 1.0); // Don't upscale

  // Step 4: Calculate centering/letterbox margins
  const scaledLayoutWidthPx = layoutWidthPx * globalScale;
  const scaledLayoutHeightPx = layoutHeightPx * globalScale;
  const extraSpaceX = canvasW - scaledLayoutWidthPx;
  const extraSpaceY = canvasH - scaledLayoutHeightPx;
  const derivedMarginLeft = Math.floor(extraSpaceX / 2);
  const derivedMarginTop = Math.floor(extraSpaceY / 2);

  const marginsPx = {
    left: EXTRA_MARGINS_IN_PX.left + derivedMarginLeft,
    top: EXTRA_MARGINS_IN_PX.top + derivedMarginTop,
    right: EXTRA_MARGINS_IN_PX.right + Math.ceil(extraSpaceX / 2),
    bottom: EXTRA_MARGINS_IN_PX.bottom + Math.ceil(extraSpaceY / 2),
  };

  // Return comprehensive layout info
  return {
    // Diagram grid
    diagramGridWidth,
    diagramGridHeight,
    
    // Derived diagram sizes
    cellWidthPx: measuredCellWidthPx,
    cellHeightPx: measuredCellHeightPx,
    fontSizePx,
    diagramWidthPx,
    diagramHeightPx,
    
    // Layout container
    layoutWidthPx,
    layoutHeightPx,
    globalScale,
    
    // Control panel info
    controlPanelWidthRatio,
    controlPanelWidthPx: layoutWidthPx * controlPanelWidthRatio,
    controlPanelHeightPx: layoutHeightPx,
    
    // Margins and positioning
    marginsPx,
    canvasW,
    canvasH,
  };
}

export function updateRegistryFromLayout(scene, layoutInfo) {
  const { registry } = scene;
  registry.set("cellWidthPx", layoutInfo.cellWidthPx);
  registry.set("cellHeightPx", layoutInfo.cellHeightPx);
  registry.set("fontSizePx", layoutInfo.fontSizePx);
  registry.set("textStyle", makeTextStyle(layoutInfo.fontSizePx));
  registry.set("marginsPx", layoutInfo.marginsPx);
  registry.set("globalScale", layoutInfo.globalScale);
  
  // Diagram-specific
  registry.set("drawAreaWidthInCells", layoutInfo.diagramGridWidth);
  registry.set("drawAreaHeightInCells", layoutInfo.diagramGridHeight);
  registry.set("drawInnerAreaWidthInCells", Math.max(0, layoutInfo.diagramGridWidth - 2));
  registry.set("drawInnerAreaHeightInCells", Math.max(0, layoutInfo.diagramGridHeight - 2));
  
  // Layout container info
  registry.set("layoutWidthPx", layoutInfo.layoutWidthPx);
  registry.set("layoutHeightPx", layoutInfo.layoutHeightPx);
  registry.set("controlPanelWidthPx", layoutInfo.controlPanelWidthPx);
  registry.set("controlPanelHeightPx", layoutInfo.controlPanelHeightPx);
}
