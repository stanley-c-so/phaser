import Phaser from "phaser";

import {
  MARGINS_IN_PX,
  FONT_SIZE,
  COLORS,
} from "../config/constants";

export default class InitRegistry extends Phaser.Scene {
  constructor() {
    super("InitRegistry");
  }

  init() {

    // cellW
    // cellH
    const textStyle = {
      fontFamily: "monospace",
      fontSize: FONT_SIZE,
      color: COLORS.TEXT,
    };
    const probeText = this.add.text(0, 0, "", textStyle).setVisible(false);
    const samples = 200;
    const probeChar = "M";
    probeText.setText(probeChar.repeat(samples));
    const cellW = probeText.width / samples;
    probeText.setText(probeChar + "\n" + probeChar);
    const cellH = probeText.height / 2;

    // ===== SET REGISTRY VALUES =====
    this.registry.set("cellW", cellW);
    this.registry.set("cellH", cellH);

    this.resize();
  }

  resize() {
    // drawAreaWidthInCells
    // drawAreaHeightInCells
    // drawInnerAreaWidthInCells
    // drawInnerAreaHeightInCells
    const drawAreaWidthInCells = Math.floor((this.scale.width - MARGINS_IN_PX.left - MARGINS_IN_PX.right) / this.registry.get("cellW"));
    const drawAreaHeightInCells = Math.floor((this.scale.height - MARGINS_IN_PX.top - MARGINS_IN_PX.bottom) / this.registry.get("cellH"));
    const drawInnerAreaWidthInCells = drawAreaWidthInCells - 2;
    const drawInnerAreaHeightInCells = drawAreaHeightInCells - 2;

    // ===== SET REGISTRY VALUES =====
    this.registry.set("drawAreaWidthInCells", drawAreaWidthInCells);
    this.registry.set("drawAreaHeightInCells", drawAreaHeightInCells);
    this.registry.set("drawInnerAreaWidthInCells", drawInnerAreaWidthInCells);
    this.registry.set("drawInnerAreaHeightInCells", drawInnerAreaHeightInCells);
  }
  
  create() {
    this.registry.set("resize", this.resize);
    this.init();
  }
};