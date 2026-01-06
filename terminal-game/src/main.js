import Phaser from 'phaser'

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
    super('SceneA')
  }

  create() {
    this.add.text(100, 100, 'SCENE A\n(press SPACE)', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#00ff00'
    })

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('SceneB')
    })
  }
}

// class SceneB extends Phaser.Scene {
//   constructor() {
//     super('SceneB')
//   }

//   create() {
//     this.add.text(100, 100, 'SCENE B\n(press SPACE)', {
//       fontFamily: 'monospace',
//       fontSize: '20px',
//       color: '#00ffff'
//     })

//     this.input.keyboard.once('keydown-SPACE', () => {
//       this.scene.start('SceneA')
//     })
//   }
// }

class SceneB extends Phaser.Scene {
  constructor() {
    super('SceneB')
  }

  create() {
    // --- "terminal" config ---
    this.originX = 100
    this.originY = 100
    this.cols = 60
    this.rows = 20

    
    // this.cellW = 12
    // this.cellH = 24

    async function measureMonospace(scene, {
      fontFamily = 'monospace',
      fontSizePx = 20,
      testChar = 'M',     // good wide glyph
      samples = 100,      // use many chars to average out weirdness
      lineHeightMultiplierFallback = 1.2,
    } = {}) {
      // Ensure web fonts are loaded if you use a custom one
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }

      const ctx = scene.sys.game.canvas.getContext('2d')
      ctx.save()
      ctx.font = `${fontSizePx}px ${fontFamily}`

      // Width: measure a long run and divide (reduces rounding noise)
      const s = testChar.repeat(samples)
      const m = ctx.measureText(s)
      const cellW = m.width / samples

      // Height: prefer actual bounding boxes when available
      let cellH
      const ascent = m.actualBoundingBoxAscent
      const descent = m.actualBoundingBoxDescent
      if (Number.isFinite(ascent) && Number.isFinite(descent) && (ascent + descent) > 0) {
        cellH = ascent + descent
      } else {
        cellH = fontSizePx * lineHeightMultiplierFallback
      }

      ctx.restore()
      return { cellW, cellH, fontSizePx, fontFamily }
    }

    (async () => {
      
      const { cellW, cellH } = await measureMonospace(this, {
        fontFamily: 'monospace',
        fontSizePx: 20,
      })
      this.cellW = cellW
      this.cellH = cellH

      this.cursorCol = 0
      this.cursorRow = 0

      // Backing buffer: array of strings (lines)
      this.lines = Array.from({ length: this.rows }, () => '')

      this.add.text(100, 50, 'SCENE B / TERMINAL (type; ENTER=nl, BACKSPACE=del)', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#00ff00',
      })

      // The text display
      this.terminalText = this.add.text(this.originX, this.originY, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#00ff00',
      })

      // Cursor square (drawn with Graphics)
      this.cursorGfx = this.add.graphics()
      this.drawCursor()

      // Key handling
      this.input.keyboard.on('keydown', (ev) => {
        // Ignore modifier-only keys
        if (ev.key === 'Shift' || ev.key === 'Control' || ev.key === 'Alt' || ev.key === 'Meta') return

        if (ev.key === 'Backspace') {
          this.backspace()
          this.render()
          return
        }

        if (ev.key === 'Enter') {
          this.newline()
          this.render()
          return
        }

        // Printable single-character keys (includes space)
        if (ev.key.length === 1) {
          this.typeChar(ev.key)
          this.render()
        }
      })

      this.render()
    })()
  }

  typeChar(ch) {
    if (this.cursorRow >= this.rows) return

    // If line is full, wrap
    if (this.cursorCol >= this.cols) this.newline()
    if (this.cursorRow >= this.rows) return

    const line = this.lines[this.cursorRow]
    this.lines[this.cursorRow] = line + ch
    this.cursorCol += 1
  }

  backspace() {
    if (this.cursorRow < 0) return

    if (this.cursorCol > 0) {
      // Remove last char from current line
      const line = this.lines[this.cursorRow]
      this.lines[this.cursorRow] = line.slice(0, -1)
      this.cursorCol -= 1
      return
    }

    // If at start of line, go up a line (simple behavior)
    if (this.cursorRow > 0) {
      this.cursorRow -= 1
      this.cursorCol = this.lines[this.cursorRow].length
      // Remove last char on that previous line
      if (this.cursorCol > 0) {
        this.lines[this.cursorRow] = this.lines[this.cursorRow].slice(0, -1)
        this.cursorCol -= 1
      }
    }
  }

  newline() {
    this.cursorRow += 1
    this.cursorCol = 0
  }

  render() {
    // Render all lines as one block
    this.terminalText.setText(this.lines.join('\n'))
    this.drawCursor()
  }

  drawCursor() {
    this.cursorGfx.clear()
    this.cursorGfx.lineStyle(2, 0x00ff00, 1)

    const x = this.originX + this.cursorCol * this.cellW
    const y = this.originY + this.cursorRow * this.cellH

    // Square cursor at "next character" position
    this.cursorGfx.strokeRect(x, y, this.cellW, this.cellH)
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  // width: 1024,
  // height: 768,
  backgroundColor: '#000000',
  // scene: [TerminalScene],
  scene: [SceneA, SceneB],
}

// window.addEventListener('keydown', function(e) {
//   // Use 'e.key' for modern browsers, 'e.keyCode' for older support
//   if (e.key === ' ' || e.keyCode === 32) {
//     // Check if the event target is NOT an input, textarea, or select element
//     var targetTagName = e.target.tagName;
//     if (targetTagName !== 'INPUT' && targetTagName !== 'TEXTAREA' && targetTagName !== 'SELECT') {
//       e.preventDefault(); // Stop the default scrolling behavior
//     }
//   }
// })

new Phaser.Game(config)