import Phaser from "phaser";

import { COLORS } from "./config/constants";
import InitRegistry from "./scenes/InitRegistry";
import SceneA from "./scenes/SceneA";
import SceneB from "./scenes/SceneB";
import Map from "./scenes/Map";

const config = {
  type: Phaser.AUTO,
  backgroundColor: COLORS.BG,
  scene: [
    InitRegistry,
    Map,
    SceneA,
    SceneB,
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

// game.scene.start("Map");
game.scene.start("SceneB");