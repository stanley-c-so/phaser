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

export function updateRegistryFromScale(scene) {
  const { scale, registry } = scene;
  const baseAvailableWidth = Math.max(0, scale.width - EXTRA_MARGINS_IN_PX.left - EXTRA_MARGINS_IN_PX.right);
  const baseAvailableHeight = Math.max(0, scale.height - EXTRA_MARGINS_IN_PX.top - EXTRA_MARGINS_IN_PX.bottom);
  const drawAreaWidthInCells = DRAW_AREA_WIDTH_IN_CELLS;
  const drawAreaHeightInCells = DRAW_AREA_HEIGHT_IN_CELLS;
  const targetCellWPx = Math.max(1, Math.floor(baseAvailableWidth / drawAreaWidthInCells));
  const targetCellHPx = Math.max(1, Math.floor(baseAvailableHeight / drawAreaHeightInCells));
  
  if (!scene._registryProbeText) {
    scene._registryProbeText = scene.add.text(0, 0, "", makeTextStyle(1)).setVisible(false);
    scene._registryProbeText.setResolution(1);
    scene._registryProbeText.setPosition(0, 0);
  }
  const probeText = scene._registryProbeText;

  const baseFontSizePx = 100;
  const baseMetrics = measureCellSizePx(probeText, baseFontSizePx);
  const cellWPerPx = baseMetrics.cellW / baseFontSizePx;
  const cellHPerPx = baseMetrics.cellH / baseFontSizePx;
  let fontSizePx = Math.max(1, Math.floor(
    Math.min(
      targetCellWPx / cellWPerPx,
      targetCellHPx / cellHPerPx,
    )
  ));

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

  // // //
  // console.log("baseAvailableHeight", baseAvailableHeight)
  // console.log("drawAreaHeightInCells", drawAreaHeightInCells)
  // console.log("baseAvailableWidth", baseAvailableWidth)
  // console.log("drawAreaWidthInCells", drawAreaWidthInCells)
  // console.log("scale.width", scale.width)
  // console.log("scale.height", scale.height)
  // console.log("fontSizePx", fontSizePx)
  // console.log("targetCellWPx", targetCellWPx)
  // console.log("targetCellHPx", targetCellHPx)

  const measuredCellWidthPx = Math.max(1, Math.floor(metrics.cellW));
  const measuredCellHeightPx = Math.max(1, Math.floor(metrics.cellH));

  probeText.setStyle(makeTextStyle(fontSizePx));
  probeText.setText("M".repeat(drawAreaWidthInCells));
  const drawAreaWidthPx = Math.max(1, Math.floor(probeText.width));
  probeText.setText(Array.from({ length: drawAreaHeightInCells }, () => "M").join("\n"));
  const drawAreaHeightPx = Math.max(1, Math.floor(probeText.height));
  const extraSpaceX = Math.max(0, baseAvailableWidth - drawAreaWidthPx);
  const extraSpaceY = Math.max(0, baseAvailableHeight - drawAreaHeightPx);
  const derivedMarginLeft = Math.floor(extraSpaceX / 2);
  const derivedMarginRight = Math.ceil(extraSpaceX / 2);
  const derivedMarginTop = Math.floor(extraSpaceY / 2);
  const derivedMarginBottom = Math.ceil(extraSpaceY / 2);
  const marginsPx = {
    left: EXTRA_MARGINS_IN_PX.left + derivedMarginLeft,
    right: EXTRA_MARGINS_IN_PX.right + derivedMarginRight,
    top: EXTRA_MARGINS_IN_PX.top + derivedMarginTop,
    bottom: EXTRA_MARGINS_IN_PX.bottom + derivedMarginBottom,
  };

  const drawInnerAreaWidthInCells = drawAreaWidthInCells - 2;
  const drawInnerAreaHeightInCells = drawAreaHeightInCells - 2;

  registry.set("cellWidthPx", measuredCellWidthPx);
  registry.set("cellHeightPx", measuredCellHeightPx);
  registry.set("fontSizePx", fontSizePx);
  registry.set("textStyle", makeTextStyle(fontSizePx));
  registry.set("marginsPx", marginsPx);
  registry.set("drawAreaWidthInCells", drawAreaWidthInCells);
  registry.set("drawAreaHeightInCells", drawAreaHeightInCells);
  registry.set("drawInnerAreaWidthInCells", drawInnerAreaWidthInCells);
  registry.set("drawInnerAreaHeightInCells", drawInnerAreaHeightInCells);
}
