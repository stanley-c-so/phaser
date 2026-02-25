import { TARGET_ASPECT } from "../config/constants";

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

export function drawLayoutDebug(scene, parentRectPx, mapRectPct, controlsRectPct) {
  const mapRectPx = rectPctToPx(mapRectPct, parentRectPx);
  const controlsRectPx = rectPctToPx(controlsRectPct, parentRectPx);
  const drawAreaRect = scene.registry.get("drawAreaRect");
  const gridOriginPx = scene.registry.get("gridOriginPx") || { x: 0, y: 0 };
  const toUiRect = (rect) => ({
    x: Math.round(rect.x - gridOriginPx.x),
    y: Math.round(rect.y - gridOriginPx.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
  const fitRectWithMarginsPx = drawAreaRect ? { ...drawAreaRect } : null;
  const viewportW = scene.scale.width;
  const viewportH = scene.scale.height;
  const aspect = TARGET_ASPECT.width / TARGET_ASPECT.height;
  let rawFitW = viewportW;
  let rawFitH = Math.floor(rawFitW / aspect);
  if (rawFitH > viewportH) {
    rawFitH = viewportH;
    rawFitW = Math.floor(rawFitH * aspect);
  }
  const rawFitRectPx = {
    x: Math.floor((viewportW - rawFitW) / 2),
    y: Math.floor((viewportH - rawFitH) / 2),
    width: Math.max(0, rawFitW),
    height: Math.max(0, rawFitH),
  };
  const graphics = scene.add.graphics();
  if (fitRectWithMarginsPx) {
    graphics.lineStyle(1, 0xff0000, 0.5);
    const uiRect = toUiRect(fitRectWithMarginsPx);
    graphics.strokeRect(uiRect.x, uiRect.y, uiRect.width, uiRect.height);
  }
  graphics.lineStyle(1, 0xffffff, 0.4);
  const rawUiRect = toUiRect(rawFitRectPx);
  graphics.strokeRect(rawUiRect.x, rawUiRect.y, rawUiRect.width, rawUiRect.height);
  graphics.lineStyle(1, 0xff00ff, 0.6);
  graphics.strokeRect(parentRectPx.x, parentRectPx.y, parentRectPx.width, parentRectPx.height);
  graphics.lineStyle(1, 0x00ffff, 0.6);
  graphics.strokeRect(mapRectPx.x, mapRectPx.y, mapRectPx.width, mapRectPx.height);
  graphics.lineStyle(1, 0xffff00, 0.6);
  graphics.strokeRect(controlsRectPx.x, controlsRectPx.y, controlsRectPx.width, controlsRectPx.height);
  scene.ui.add(graphics);
}
