import Phaser from 'phaser';

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { initStyle, borderText } from '../utils/draw';

export default class Map extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {

    // const {
    //   textStyle,
    //   cellW,
    //   cellH,
    // } = initStyle.bind(this)();
    const style = initStyle.bind(this)();
    borderText(style.cellW, style.cellH);

    this.add.text(100, 100, 'MAP', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: COLORS.TEXT,
    });

    // this.input.keyboard.once('keydown-SPACE', () => {
    //   this.scene.start('SceneB')
    // });
  }
};