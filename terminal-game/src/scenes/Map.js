import Phaser from 'phaser';

import { MARGINS, COLORS, FONT_SIZE, } from '../config/constants';
import { initStyle, borderText } from '../utils/draw';

export default class Map extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {

    // // Phaser fullscreen (wraps the browser Fullscreen API)
    // this.input.keyboard.on('keydown-F', () => {
    //   if (!this.scale.isFullscreen) this.scale.startFullscreen();
    // });
    // this.input.on('pointerdown', () => {
    //   if (!this.scale.isFullscreen) this.scale.startFullscreen();
    // });
    // this.scale.on('leavefullscreen', () => {
    //   // Show a big overlay: "CLICK TO RESUME FULLSCREEN"
    //   // Then on click: this.scale.startFullscreen()
    //   this.scale.startFullscreen();
    // });

    // const {
    //   textStyle,
    //   cellW,
    //   cellH,
    // } = initStyle.bind(this)();
    const style = initStyle.bind(this)();
    // borderText(style.cellW, style.cellH, "PUMP ROOM");

    this.add.text(MARGINS.left, MARGINS.top, borderText.bind(this)(style.cellW, style.cellH, "PUMP ROOM"), {
      fontFamily: 'monospace',
      fontSize: FONT_SIZE,
      color: COLORS.TEXT,
    });

    // this.input.keyboard.once('keydown-SPACE', () => {
    //   this.scene.start('SceneB')
    // });
  }
};