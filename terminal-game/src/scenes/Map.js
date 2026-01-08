import Phaser from 'phaser';

import { drawBorderBox } from '../utils/draw';

export default class Map extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {

    drawBorderBox.bind(this)("PUMP ROOM");

  }
};