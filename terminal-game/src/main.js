import Phaser from "phaser";

import { COLORS } from "./config/constants";
import StaticMap from "./scenes/StaticMap";

const config = {
  type: Phaser.AUTO,
  backgroundColor: COLORS.BG,
  scene: [
    StaticMap,
  ],
  scale: {
    // mode: Phaser.Scale.FIT,
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

// Kill page scrolling caused by an oversized canvas
document.documentElement.style.overflow = "hidden";
document.body.style.overflow = "hidden";
document.body.style.margin = "0";
// document.body.style.backgroundColor = "#FFFFFF";
document.body.style.backgroundColor = COLORS.BG;

// Also make the canvas not affect document flow
game.canvas.style.position = "fixed";
game.canvas.style.left = "0";
game.canvas.style.top = "0";
game.canvas.style.display = "block";

window.addEventListener("keydown", (e) => {
  const quitCombo = e.ctrlKey && e.shiftKey && e.code === "KeyQ"
  if (!quitCombo) return;

  e.preventDefault();

  // Exit fullscreen if active
  if (game.scale.isFullscreen) game.scale.stopFullscreen();

  // Destroy Phaser instance (removes canvas, listeners, etc.)
  // game.destroy(true);

  // Optional: navigate away to a safe page
  // window.location.href = "about:blank"
}, { capture: true });

try {
  game.scene.start("StaticMap");
} catch(e) {
  console.error(e);
}