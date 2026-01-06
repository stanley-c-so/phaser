import Phaser from 'phaser';

import SceneA from './scenes/SceneA';
import SceneB from './scenes/SceneB';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#000000',
  scene: [SceneA, SceneB],
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