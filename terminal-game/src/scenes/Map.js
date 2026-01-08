import Phaser from 'phaser';

import { drawBorderBox } from '../utils/draw';

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

    drawBorderBox.bind(this)("PUMP ROOM");

  }
};