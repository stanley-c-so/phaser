import Phaser from "phaser";

import { makeTextStyle } from "../config/constants";
import { updateRegistryFromScale } from "../utils/registry";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
const LAYERS = [
  { color: "#00ff66", density: 0.7, speedMul: 1.0 },
  { color: "#00a84a", density: 0.5, speedMul: 0.75 },
  { color: "#005a28", density: 0.35, speedMul: 0.55 },
];

function pickChar() {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

function makeBuffer(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(" "));
}

export default class MatrixRain extends Phaser.Scene {
  constructor() {
    super("MatrixRain");
  }

  create() {
    updateRegistryFromScale(this);
    this.initScene();

    this.input.on("pointermove", (pointer) => {
      this.updatePointerCell(pointer);
    });

    this.scale.on("resize", () => {
      updateRegistryFromScale(this);
      this.initScene();
    });
  }

  initScene() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    const marginsPx = this.registry.get("marginsPx") || { left: 0, top: 0 };
    const cellWidthPx = this.registry.get("cellWidthPx") || 1;
    const cellHeightPx = this.registry.get("cellHeightPx") || 1;
    const fontSizePx = this.registry.get("fontSizePx") || 1;

    this.drawWidth = this.registry.get("drawInnerAreaWidthInCells");
    this.drawHeight = this.registry.get("drawInnerAreaHeightInCells");

    this.layers = LAYERS.map((layer) => {
      const textStyle = {
        ...makeTextStyle(fontSizePx),
        color: layer.color,
      };
      const text = this.add.text(
        marginsPx.left + cellWidthPx,
        marginsPx.top + cellHeightPx,
        "",
        textStyle
      );
      this.ui.add(text);

      return {
        ...layer,
        buffer: makeBuffer(this.drawWidth, this.drawHeight),
        text,
        streams: [],
      };
    });

    const redStyle = {
      ...makeTextStyle(fontSizePx),
      color: "#ff3333",
    };
    this.redBuffer = makeBuffer(this.drawWidth, this.drawHeight);
    this.redText = this.add.text(
      marginsPx.left + cellWidthPx,
      marginsPx.top + cellHeightPx,
      "",
      redStyle
    );
    this.ui.add(this.redText);

    this.initStreams();
  }

  initStreams() {
    for (const layer of this.layers) {
      layer.streams = [];
      for (let x = 0; x < this.drawWidth; ++x) {
        const active = Math.random() < layer.density;
        layer.streams.push({
          x,
          active,
          corrupted: false,
          y: active ? -Math.random() * this.drawHeight : 0,
          speed: (6 + Math.random() * 18) * layer.speedMul,
          length: 6 + Math.floor(Math.random() * 18),
          cooldown: active ? 0 : Math.random() * 1.5,
        });
      }
    }
  }

  spawnStream(stream) {
    stream.active = true;
    stream.y = -Math.random() * this.drawHeight;
    stream.speed = 6 + Math.random() * 18;
    stream.length = 6 + Math.floor(Math.random() * 18);
    stream.cooldown = 0;
  }

  updatePointerCell(pointer) {
    const marginsPx = this.registry.get("marginsPx") || { left: 0, top: 0 };
    const cellWidthPx = this.registry.get("cellWidthPx") || 1;
    const cellHeightPx = this.registry.get("cellHeightPx") || 1;
    const originX = marginsPx.left + cellWidthPx;
    const originY = marginsPx.top + cellHeightPx;
    const localX = pointer.x - originX;
    const localY = pointer.y - originY;

    if (localX < 0 || localY < 0) {
      this.pointerCell = null;
      return;
    }

    const cellX = Math.floor(localX / cellWidthPx);
    const cellY = Math.floor(localY / cellHeightPx);

    if (
      cellX < 0
      || cellY < 0
      || cellX >= this.drawWidth
      || cellY >= this.drawHeight
    ) {
      this.pointerCell = null;
      return;
    }

    this.pointerCell = { x: cellX, y: cellY };
  }

  update(_, delta) {
    if (!this.layers) return;

    const dt = delta / 1000;
    const height = this.drawHeight;

    for (const row of this.redBuffer) {
      row.fill(" ");
    }

    for (const layer of this.layers) {
      for (const row of layer.buffer) {
        row.fill(" ");
      }

      for (const stream of layer.streams) {
        if (stream.active) {
          stream.y += stream.speed * dt;
          if (stream.y - stream.length > height + 2) {
            stream.active = false;
            stream.cooldown = 0.2 + Math.random() * 1.6;
            continue;
          }

          for (let i = 0; i < stream.length; ++i) {
            const y = Math.floor(stream.y - i);
            if (y < 0 || y >= height) continue;
            if (this.pointerCell && this.pointerCell.x === stream.x && this.pointerCell.y === y) {
              stream.corrupted = true;
            }

            if (stream.corrupted) {
              this.redBuffer[y][stream.x] = pickChar();
            } else {
              layer.buffer[y][stream.x] = pickChar();
            }
          }
        } else {
          stream.cooldown -= dt;
          if (stream.cooldown <= 0 && Math.random() < 0.5) {
            this.spawnStream(stream);
          }
        }
      }

      layer.text.setText(layer.buffer.map((row) => row.join("")).join("\n"));
    }

    this.redText.setText(this.redBuffer.map((row) => row.join("")).join("\n"));
  }
}
