import Phaser from 'phaser';

// class TerminalScene extends Phaser.Scene {
//   constructor() {
//     super('TerminalScene')
//   }

//   create() {
//     this.add.text(40, 40, 'SYSTEM ONLINE\n\n> MAIN MENU', {
//       fontFamily: 'monospace',
//       fontSize: '20px',
//       color: '#00ff00'
//     })
//   }
// }

class SceneA extends Phaser.Scene {
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
}

// class SceneB extends Phaser.Scene {
//   constructor() {
//     super('SceneB');
//   }

//   create() {
//     this.add.text(100, 100, 'SCENE B\n(press SPACE)', {
//       fontFamily: 'monospace',
//       fontSize: '20px',
//       color: '#00ffff'
//     });

//     this.input.keyboard.once('keydown-SPACE', () => {
//       this.scene.start('SceneA');
//     });
//   }
// }

class SceneB extends Phaser.Scene {
  constructor() {
    super('SceneB');
  }

  initStyle() {
    // Create a hidden probe text with the exact same style as your terminal text
    this.probeStyle = {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#00ff00',
    };
    this.probeText = this.add.text(0, 0, '', this.probeStyle).setVisible(false);
    // Measure monospace char width using Phaser's own renderer
    const samples = 200;
    const TEST_CHAR = 'M';
    this.probeText.setText(TEST_CHAR.repeat(samples));
    const w = this.probeText.width;
    this.cellW = w / samples;
    // Measure line height using Phaser's own renderer
    this.probeText.setText(`${TEST_CHAR}\n${TEST_CHAR}`);
    this.cellH = this.probeText.height / 2;
  }

  create() {

    this.input.keyboard.on('keydown', (e) => {
      // Stop the browser from scrolling/doing shortcuts
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
    })

    // --- "terminal" config ---
    this.originX = 100;
    this.originY = 100;
    this.cols = 60;
    this.rows = 20;

    this.initStyle();

    this.cursorCol = 0;
    this.cursorRow = 0;

    // Backing buffer: array of strings (lines)
    this.lines = Array.from({ length: this.rows }, () => '');

    this.add.text(100, 50, 'SCENE B / TERMINAL (type; ENTER=nl, BACKSPACE=del)', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00ff00',
    });

    // The text display
    this.terminalText = this.add.text(this.originX, this.originY, '', this.probeStyle);

    // Cursor square (drawn with Graphics)
    this.cursorGfx = this.add.graphics();
    this.drawCursor();

    // Key handling
    this.input.keyboard.on('keydown', (ev) => {
      // Ignore modifier-only keys
      if (ev.key === 'Shift' || ev.key === 'Control' || ev.key === 'Alt' || ev.key === 'Meta') return;

      if (ev.key === 'Backspace') {
        this.backspace();
        this.render();
        return;
      }

      if (ev.key === 'Enter') {
        this.newline();
        this.render();
        return;
      }

      // Printable single-character keys (includes space)
      if (ev.key.length === 1) {
        this.typeChar(ev.key);
        this.render();
      }
    })

    this.render();
  }

  typeChar(ch) {
    if (this.cursorRow >= this.rows) return;

    // If line is full, wrap
    if (this.cursorCol >= this.cols) this.newline();
    if (this.cursorRow >= this.rows) return;

    const line = this.lines[this.cursorRow];
    this.lines[this.cursorRow] = line + ch;
    this.cursorCol += 1;
  }

  backspace() {
    if (this.cursorRow < 0) return;

    if (this.cursorCol > 0) {
      // Remove last char from current line
      const line = this.lines[this.cursorRow];
      this.lines[this.cursorRow] = line.slice(0, -1);
      this.cursorCol -= 1;
      return;
    }

    // If at start of line, go up a line (simple behavior)
    if (this.cursorRow > 0) {
      this.cursorRow -= 1;
      this.cursorCol = this.lines[this.cursorRow].length;
      // Remove last char on that previous line
      if (this.cursorCol > 0) {
        this.lines[this.cursorRow] = this.lines[this.cursorRow].slice(0, -1);
        this.cursorCol -= 1;
      }
    }
  }

  newline() {
    this.cursorRow += 1;
    this.cursorCol = 0;
  }

  render() {
    // Render all lines as one block
    this.terminalText.setText(this.lines.join('\n'));
    this.drawCursor();
  }

  drawCursor() {
    this.cursorGfx.clear();
    this.cursorGfx.lineStyle(2, 0x00ff00, 1);

    const x = this.originX + this.cursorCol * this.cellW;
    const y = this.originY + this.cursorRow * this.cellH;

    // Square cursor at "next character" position
    this.cursorGfx.strokeRect(x, y, this.cellW, this.cellH);
  }
}

const config = {
  type: Phaser.AUTO,
  // width: 800,
  // height: 600,
  width: 1024,
  height: 768,
  backgroundColor: '#000000',
  // scene: [TerminalScene],
  scene: [SceneA, SceneB],
  scale: {
    // mode: Phaser.Scale.FIT,
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};


const game = new Phaser.Game(config)

// 1) Kill page scrolling caused by an oversized canvas
document.documentElement.style.overflow = 'hidden'
document.body.style.overflow = 'hidden'
document.body.style.margin = '0'

// Also make the canvas not affect document flow
game.canvas.style.position = 'fixed'
game.canvas.style.left = '0'
game.canvas.style.top = '0'
game.canvas.style.display = 'block'