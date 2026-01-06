import Phaser from 'phaser';

export default class SceneA extends Phaser.Scene {
  constructor() {
    super('SceneA');
  }

  create() {
    this.add.text(100, 100, 'SCENE A\n(press SPACE)', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#00ff00'
    });

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('SceneB')
    });
  }
};