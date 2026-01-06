import Phaser from 'phaser';

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/constants';
import SceneA from './scenes/SceneA';
import SceneB from './scenes/SceneB';
import Map from './scenes/Map';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.BG,
  scene: [
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

const game = new Phaser.Game(config)

// Kill page scrolling caused by an oversized canvas
document.documentElement.style.overflow = 'hidden'
document.body.style.overflow = 'hidden'
document.body.style.margin = '0'

// Also make the canvas not affect document flow
game.canvas.style.position = 'fixed'
game.canvas.style.left = '0'
game.canvas.style.top = '0'
game.canvas.style.display = 'block'