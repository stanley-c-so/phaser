import Phaser from 'phaser';

import {
  FONT_SIZE,
  COLORS,
} from '../config/constants';

export default class InitRegistry extends Phaser.Scene {
  constructor() {
    super('InitRegistry');
  }

  create() {

    // ===== cellW, cellH =====
    const textStyle = {
      fontFamily: 'monospace',
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

    this.registry.set("cellW", cellW);
    this.registry.set("cellH", cellH);
  }
};