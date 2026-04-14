import Phaser from "phaser";

import { COLORS, MQTT } from "./config/constants";
import RefactoredMap from "./scenes/RefactoredMap";
import { initMqtt } from "./utils/mqtt";

const MAP = {
  scene: RefactoredMap,
  label: "RefactoredMap",
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: COLORS.BG,
  // Use devicePixelRatio to avoid fractional CSS scaling causing text metric drift on Windows DPI settings.
  resolution: window.devicePixelRatio || 1,
  render: {
    roundPixels: true,
  },
  scene: [
    MAP.scene,
  ],
  scale: {
    // mode: Phaser.Scale.FIT,
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

const mqttRuntime = initMqtt({
  url: MQTT.URL,
  topic: MQTT.TOPIC,
  onConnect: () => {
    console.log(`MQTT connected: ${MQTT.URL}`);
  },
  onMessage: ({ topic, payload }) => {
    console.log(`[MQTT] ${topic}: ${payload}`);
  },
});

// Convenience hooks for quick testing in the browser console.
window.mqttPublish = (payload, topic = MQTT.TOPIC) => {
  mqttRuntime.publish(topic, payload);
};
window.mqttSubscribe = (topic) => {
  mqttRuntime.subscribe(topic, (subscribedTopic) => {
    console.log(`MQTT subscribed: ${subscribedTopic}`);
  });
};

// Kill page scrolling caused by an oversized canvas
document.documentElement.style.overflow = "hidden";
document.body.style.overflow = "hidden";
document.body.style.margin = "0";
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

async function startStaticMapWhenFontsReady() {
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    console.error(e);
  }

  try {
    game.scene.start(MAP.label);
  } catch (e) {
    console.error(e);
  }
}

startStaticMapWhenFontsReady();
