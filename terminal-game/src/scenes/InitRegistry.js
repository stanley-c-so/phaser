import Phaser from "phaser";

import {
  MARGINS,
  FONT_SIZE,
  COLORS,
} from "../config/constants";

export default class InitRegistry extends Phaser.Scene {
  constructor() {
    super("InitRegistry");
  }

  create() {

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

    // drawAreaWidthInCells
    // drawAreaHeightInCells
    // drawInnerAreaWidthInCells
    // drawInnerAreaHeightInCells
    const drawAreaWidthInCells = Math.floor((this.scale.width - MARGINS.left - MARGINS.right) / cellW);
    const drawAreaHeightInCells = Math.floor((this.scale.height - MARGINS.top - MARGINS.bottom) / cellH);
    const drawInnerAreaWidthInCells = drawAreaWidthInCells - 2;
    const drawInnerAreaHeightInCells = drawAreaHeightInCells - 2;

    // ===== SET REGISTRY VALUES =====
    this.registry.set("cellW", cellW);
    this.registry.set("cellH", cellH);
    this.registry.set("drawAreaWidthInCells", drawAreaWidthInCells);
    this.registry.set("drawAreaHeightInCells", drawAreaHeightInCells);
    this.registry.set("drawInnerAreaWidthInCells", drawInnerAreaWidthInCells);
    this.registry.set("drawInnerAreaHeightInCells", drawInnerAreaHeightInCells);
  }
};